"""Giọng đọc (giọng, phong cách, cách đọc từng slide) và người dẫn 3D ở góc video."""
import json
import subprocess
from pathlib import Path

from helpers import drain_jobs

from app.adapters import presenter
from app.modules.courses.narration import LEGACY, narration_of
from app.modules.media import video

state: dict = {}


def _tone(path: Path, seconds: float = 2.0) -> Path:
    """Âm thanh giả lời nói: nửa đầu im lặng, nửa sau tiếng bíp to nhỏ theo nhịp"""
    half = seconds / 2
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r=24000:cl=mono:d={half}", "-f", "lavfi",
                    "-i", f"sine=f=220:r=24000:d={half}", "-filter_complex", "[1]volume='0.6+0.4*sin(2*PI*4*t)':eval=frame[s];[0][s]concat=n=2:v=0:a=1",
                    "-c:a", "libmp3lame", str(path)], check=True)
    return path


def _probe(file: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate,width,height", "-of", "json", str(file)],
                         check=True, capture_output=True, text=True).stdout
    return json.loads(out)["streams"][0]


def _alpha_at(png: Path, x: int, y: int) -> int:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(png), "-f", "rawvideo", "-pix_fmt", "rgba", "-"], check=True, capture_output=True).stdout
    return raw[(y * presenter.SIZE + x) * 4 + 3]


def test_legacy_video_keeps_old_voice_and_cache_key():
    old = narration_of({"voice": "Giọng đọc AI có sẵn (alloy)"})
    assert (old.voice, old.style, old.presenter) == (LEGACY["voice"], LEGACY["style"], LEGACY["presenter"])
    assert old.key() is None and old.instructions() is None  # đoạn đã dựng của video cũ vẫn dùng lại được
    new = narration_of({"narration": {}})
    assert (new.voice, new.style, new.presenter, new.look) == ("marin", "friendly", True, "f")
    # giá trị lạ không lọt vào lệnh gọi TTS
    odd = narration_of({"narration": {"voice": "x", "style": 1, "presenter": "yes", "pos": "top"}})
    assert (odd.voice, odd.style, odd.presenter, odd.pos) == ("marin", "friendly", True, "right")


def test_instructions_combine_style_and_slide_delivery():
    n = narration_of({"narration": {"voice": "cedar", "style": "formal"}})
    text = n.instructions('nhấn "phải dừng container trước"')
    assert "professional presenter" in text and 'For this part: nhấn "phải dừng container trước"' in text and "Vietnamese" in text
    assert n.look == "m" and "nam" in n.label.lower()


def test_speaking_ring_follows_audio(tmp_path):
    levels = presenter.audio_levels(_tone(tmp_path / "a.mp3"), 2 * presenter.FPS)
    quiet, loud = levels[: presenter.FPS - 2], levels[presenter.FPS + 4:]
    assert max(quiet) < 0.05 and max(loud) > 0.6


def test_frames_are_round_with_transparent_corners(tmp_path):
    n = presenter.render_frames(tmp_path / "f", look="m", accent="#2563eb", seconds=0.5, audio=None)
    files = sorted((tmp_path / "f").glob("f*.png"))
    assert n == len(files) == presenter.FPS // 2
    assert _alpha_at(files[0], 2, 2) == 0 and _alpha_at(files[0], presenter.SIZE // 2, presenter.SIZE // 2) == 255
    # ảnh người dẫn nữ / nam khác nhau, vòng sáng chỉ hiện khi đang nói
    assert presenter.frame_svg("f", "#2563eb", 0) != presenter.frame_svg("m", "#2563eb", 0)
    assert 'stroke="#2563eb"' not in presenter.frame_svg("f", "#2563eb", 0) and 'stroke="#2563eb"' in presenter.frame_svg("f", "#2563eb", 0.8)


def test_render_with_presenter_and_voice(ctx, monkeypatch, tmp_path):
    """Giọng thật được gọi đúng giọng + chỉ dẫn; video có người dẫn chạy 20 khung/giây và dài theo lời đọc"""
    calls = []
    tone = _tone(tmp_path / "voice.mp3")

    def fake_tts(org_id, text_, voice="alloy", instructions=None):
        calls.append((voice, instructions))
        return tone.read_bytes()

    monkeypatch.setattr(video, "tts", fake_tts)
    deck = next(a for a in ctx.author("GET", "/api/artifacts").body if a["type"] == "deck")
    vid = ctx.author("POST", f"/api/artifacts/{deck['id']}/to-video").body["id"]
    drain_jobs()  # tạo từ bộ slide là dựng ngay lần đầu
    v = ctx.author("GET", f"/api/artifacts/{vid}").body
    assert v["narration"] == {"voice": "marin", "style": "friendly", "presenter": True, "pos": "right"}
    v["slides"] = v["slides"][:2]
    v["slides"][1]["delivery"] = "nhấn vào con số"
    v["narration"] = {**v["narration"], "voice": "cedar", "pos": "left"}
    ctx.author("PATCH", f"/api/artifacts/{vid}", {"content": v})
    calls.clear()
    r = ctx.author("POST", f"/api/artifacts/{vid}/render")
    assert r.status == 200
    # trình soạn theo dõi tiến độ bằng jobId ghi trong trạng thái dựng
    rd = ctx.author("GET", f"/api/artifacts/{vid}").body["render"]
    assert rd["status"] == "rendering" and rd["jobId"] == r.body["jobId"]
    drain_jobs()
    done = ctx.author("GET", f"/api/artifacts/{vid}").body
    assert done["render"]["status"] == "done", done["render"]
    assert {c[0] for c in calls} == {"cedar"} and any("For this part: nhấn vào con số" in (c[1] or "") for c in calls)
    assert done["voice"].startswith("Giọng AI nam")
    mp4 = Path(video.file_path(f"videos/{vid}")) / done["render"]["url"].rsplit("/", 1)[1]
    info = _probe(mp4)
    assert info["r_frame_rate"] == f"{presenter.FPS}/1" and (info["width"], info["height"]) == (video.W, video.H)
    assert 3.5 < done["duration"] < 5.5  # 2 slide × 2 giây lời đọc
    state["vid"] = vid


def test_voice_preview_sample_is_cached(ctx, monkeypatch, tmp_path):
    tone = _tone(tmp_path / "s.mp3", 1.0)
    calls = []
    monkeypatch.setattr(video, "tts", lambda *a, **k: calls.append(a) or tone.read_bytes())
    for _ in range(2):
        r = ctx.author.http.post("/api/tts", json={"sample": True, "voice": "coral", "style": "calm"}, headers={"x-lms": "1"})
        assert r.status_code == 200 and r.headers["content-type"] == "audio/mpeg"
    assert len(calls) == 1
    assert ctx.author("POST", "/api/tts", {"voice": "not-a-voice", "text": "x"}).status == 400


def test_presenter_still_and_options(ctx):
    r = ctx.author.http.get(f"/api/artifacts/{state['vid']}/presenter.png?look=m")
    assert r.status_code == 200 and r.content[:4] == b"\x89PNG"
    assert ctx.reviewer("GET", f"/api/artifacts/{state['vid']}/presenter.png").status == 403
    opts = ctx.author("GET", "/api/media/narration-options").body
    assert {v["id"] for v in opts["voices"]} >= {"marin", "cedar"} and opts["default"]["presenter"] is True


def test_browser_save_cannot_overwrite_render_results(ctx):
    """Trang soạn lưu cả nội dung video: bản giữ trạng thái/lời thoại cũ không được ghi đè kết quả vừa dựng"""
    vid = state["vid"]
    done = ctx.author("GET", f"/api/artifacts/{vid}").body
    assert done["render"]["narration"] == {"voice": "cedar", "style": "friendly", "presenter": True, "pos": "left"}
    stale = {**done, "render": {"status": "rendering"}, "transcript": [], "chapters": [], "duration": 1, "voice": "cũ"}
    stale["narration"] = {**done["narration"], "presenter": False}
    assert ctx.author("PATCH", f"/api/artifacts/{vid}", {"content": stale}).status == 200
    after = ctx.author("GET", f"/api/artifacts/{vid}").body
    assert after["render"]["status"] == "done" and after["transcript"] == done["transcript"] and after["duration"] == done["duration"]
    assert after["narration"]["presenter"] is False  # cấu hình người soạn đổi thì vẫn lưu
