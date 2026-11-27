"""Dựng video từ slide + giọng đọc AI (giọng có sẵn), chép lời và chia chương theo thời lượng thật.
Mỗi slide là một đoạn lưu theo hash nội dung: sửa slide hay lời đọc nào thì chỉ dựng lại đoạn đó."""
import base64
import hashlib
import json
import re
import shutil
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select

from app.adapters import presenter
from app.adapters.ai import is_mock, tts
from app.adapters.preset_images import preset_jpeg
from app.adapters.render import svg_to_png
from app.modules.courses.content import js_round, split_sentences
from app.modules.courses.narration import DEFAULT, SAMPLE_TEXT, STYLES, VOICES, Narration, narration_of, options
from app.modules.courses.service import get_artifact, set_artifact
from app.modules.courses.view import viewable
from app.modules.media.images import load_image
from app.modules.media.slide_svg import ACCENT, H, W, slide_svg
from app.shared import tables as t
from app.shared.auth import AuthUser, current_user, require_editor
from app.shared.db import independent, one
from app.shared.errors import bad_request, conflict, not_found
from app.shared.http import TxRouter, js_time
from app.shared.ids import uid
from app.shared.jobs import MAX_ATTEMPTS, JobCtx, define_job, enqueue
from app.shared.storage import file_path

router = TxRouter()
Editor = Annotated[AuthUser, Depends(require_editor)]
# tăng khi đổi cách vẽ slide để các đoạn đã lưu được dựng lại
RENDER_VERSION = 3
KEEP_RENDERS = 3
CHARS_PER_SEC = 14
MIN_SILENT_SECONDS = 4
SECONDS_PER_SLIDE = 30
FILE = re.compile(r"^video-\d+\.(mp4|vtt)$")
STILL = ["-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "10"]
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _run(*args: str) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def _duration(file: Path) -> float:
    out = _run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(file))
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def _picture(org_id: str, img: object) -> str | None:
    """Ảnh của slide dạng data URI: ảnh tải lên/AI tạo đọc từ kho, ảnh có sẵn tải một lần rồi lưu đệm"""
    if not isinstance(img, str) or not img:
        return None
    own = re.match(r"^/api/images/([\w-]+)$", img)
    if own:
        f = load_image(org_id, own.group(1))
        return f"data:{f[0]};base64,{base64.b64encode(f[1]).decode()}" if f else None
    jpg = preset_jpeg(img)
    return f"data:image/jpeg;base64,{base64.b64encode(jpg).decode()}" if jpg else None  # không tải được ảnh thì slide vẫn dựng, chỉ thiếu ảnh


def _slide_pictures(org_id: str, s: dict) -> dict[str, str]:
    """Ảnh nền và ảnh chèn của slide, tải trước khi dựng"""
    out: dict[str, str] = {}
    if s.get("layout") != "cover" and s.get("bgImg"):
        p = _picture(org_id, s["bgImg"])
        if p:
            out["bg"] = p
    for b in s.get("boxes") or []:
        if isinstance(b, dict) and b.get("kind") == "img":
            p = _picture(org_id, b.get("img") or "desk")
            if p:
                out[f"el:{b.get('id')}"] = p
    return out


def _segment(org_id: str, folder: Path, s: dict, n: int, total: int, accent: str, nar: Narration) -> tuple[Path, float, bool]:
    """Dựng một đoạn: ảnh slide + lời đọc (không có TTS thì im lặng theo độ dài lời) + người dẫn ở góc nếu bật"""
    keyed = {k: v for k, v in s.items() if k not in ("id", "t")} | {"n": n, "total": total, "accent": accent, "v": RENDER_VERSION}
    if nar.key():
        keyed["narration"] = nar.key() | ({"presenterStyle": presenter.STYLE} if nar.presenter else {})
    key = hashlib.sha1(json.dumps(keyed, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
    file = folder / f"seg-{key}.mp4"
    if file.exists():
        return file, _duration(file), True
    png, mp3 = folder / f"seg-{key}.png", folder / f"seg-{key}.mp3"
    pic = _picture(org_id, s.get("img")) if s.get("layout") in ("cover", "image") else None
    png.write_bytes(svg_to_png(slide_svg(s, n, total, accent, pic, _slide_pictures(org_id, s), nar.pos if nar.presenter else None)))
    notes = str(s.get("notes") or "").strip()
    voice = tts(org_id, notes, nar.voice, nar.instructions(s.get("delivery"))) if notes else None
    if voice:
        mp3.write_bytes(voice)
        secs = _duration(mp3)
        audio = ["-i", str(mp3)]
    else:
        secs = max(MIN_SILENT_SECONDS, js_round(len(notes) / CHARS_PER_SEC))
        audio = ["-f", "lavfi", "-t", str(secs), "-i", "anullsrc=r=24000:cl=mono"]
    if nar.presenter:
        _with_presenter(png, audio, file, nar, accent, secs, mp3 if voice else None)
    elif voice:
        _run("ffmpeg", "-y", "-loop", "1", "-i", str(png), *audio, *STILL, "-c:a", "aac", "-b:a", "128k", "-shortest", str(file))
    else:
        _run("ffmpeg", "-y", "-loop", "1", "-i", str(png), *audio, "-t", str(secs), *STILL, "-c:a", "aac", "-shortest", str(file))
    return file, _duration(file), False


def _with_presenter(png: Path, audio: list[str], out: Path, nar: Narration, accent: str, secs: float, mp3: Path | None) -> None:
    """Ghép người dẫn (chuỗi PNG có nền trong suốt) vào góc dưới slide, vòng sáng theo lời đọc của đoạn"""
    frames = out.parent / f"{out.stem}-presenter"
    try:
        presenter.render_frames(frames, look=nar.look, accent=accent, seconds=secs, audio=mp3)
        x, y = presenter.overlay_xy(nar.pos, W, H)
        fps = str(presenter.FPS)
        _run("ffmpeg", "-y", "-loop", "1", "-framerate", fps, "-i", str(png), "-framerate", fps, "-i", str(frames / "f%05d.png"), *audio,
             "-filter_complex", f"[0:v][1:v]overlay={x}:{y}:shortest=1,format=yuv420p[v]", "-map", "[v]", "-map", "2:a",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-r", fps, "-c:a", "aac", "-b:a", "128k", "-shortest", str(out))
    finally:
        shutil.rmtree(frames, ignore_errors=True)


def _vtt_time(x: float) -> str:
    h, m, s = int(x // 3600), int((x % 3600) // 60), x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def _timeline(slides: list[dict], seconds: list[float]) -> tuple[list[dict], list[dict], list[dict], float]:
    """Mốc thời gian thật: chương theo slide, lời thoại chia theo độ dài câu trong từng đoạn"""
    t_ = 0.0
    chapters, transcript, timed = [], [], []
    for s, secs in zip(slides, seconds, strict=True):
        at = js_round(t_)
        chapters.append({"t": at, "title": s.get("title")})
        sentences = split_sentences(str(s.get("notes") or ""))
        total = sum(len(x) for x in sentences) or 1
        off = 0.0
        for x in sentences:
            transcript.append({"t": js_round(t_ + off), "x": x})
            off += secs * len(x) / total
        t_ += secs
        timed.append({**s, "t": at})
    return chapters, transcript, timed, t_


def _kit_accent(kit_id: str) -> str:
    """Màu nhấn của khóa (giao diện khóa), không hợp lệ thì dùng màu mặc định"""
    k = one(select(t.kits.c.details).where(t.kits.c.id == kit_id))
    accent = str((((k or {}).get("details") or {}).get("theme") or {}).get("accent") or "")
    return accent if HEX.match(accent) else ACCENT


def render_video(artifact_id: str, ctx: JobCtx) -> dict:
    a = one(select(t.artifacts).where(t.artifacts.c.id == artifact_id))
    c = a["content"] or {}
    slides = c.get("slides") or []
    accent = _kit_accent(a["kitId"])
    nar = narration_of(c)
    if not slides:
        raise RuntimeError("Video chưa có slide để dựng")
    folder = file_path(f"videos/{a['id']}")
    folder.mkdir(parents=True, exist_ok=True)
    segs = []
    for i, s in enumerate(slides):
        extra = ", người dẫn" if nar.presenter else ""
        ctx.report(5 + js_round(80 * i / len(slides)), f"Đang dựng đoạn {i + 1}/{len(slides)}{'' if is_mock() else ' (giọng đọc AI' + extra + ')'}")
        segs.append(_segment(a["orgId"], folder, s, i + 1, len(slides), accent, nar))
    ctx.report(90, "Đang ghép video và chép lời")
    (folder / "list.txt").write_text("\n".join(f"file '{f.name}'" for f, _, _ in segs))
    name = f"video-{int(time.time() * 1000)}.mp4"
    _run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(folder / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(folder / name))
    chapters, transcript, timed, total_t = _timeline(slides, [secs for _, secs, _ in segs])
    vtt_name = name.replace(".mp4", ".vtt")
    cues = "\n\n".join(f"{_vtt_time(x['t'])} --> {_vtt_time(transcript[i + 1]['t'] if i + 1 < len(transcript) else total_t)}\n{x['x']}" for i, x in enumerate(transcript))
    (folder / vtt_name).write_text(f"WEBVTT\n\n{cues}\n")
    # giữ 3 bản dựng gần nhất (bản đã xuất bản có thể đang trỏ tới bản cũ), giữ các đoạn để dùng lại
    for old in sorted((f.name for f in folder.iterdir() if re.match(r"^video-\d+\.mp4$", f.name)), reverse=True)[KEEP_RENDERS:]:
        for f in (old, old.replace(".mp4", ".vtt")):
            (folder / f).unlink(missing_ok=True)
    reused = sum(1 for _, _, r in segs if r)
    render = {"status": "done", "url": f"/api/media/{a['id']}/{name}", "vtt": f"/api/media/{a['id']}/{vtt_name}", "at": js_time(datetime.now(UTC)), "reused": reused, "total": len(segs),
              "narration": {"voice": nar.voice, "style": nar.style, "presenter": nar.presenter, "pos": nar.pos}}
    fresh = one(select(t.artifacts.c.content).where(t.artifacts.c.id == a["id"]))
    set_artifact(a["id"], content={**fresh["content"], "slides": timed, "chapters": chapters, "transcript": transcript, "duration": js_round(total_t), "render": render, "voice": nar.label})
    return {"reused": reused, "total": len(segs), "duration": js_round(total_t)}


@define_job("video.render")
def _render_job(ctx: JobCtx) -> dict:
    aid = str(ctx.payload["artifactId"])
    try:
        return render_video(aid, ctx)
    except Exception as e:
        if ctx.job["attempts"] < MAX_ATTEMPTS:
            raise  # còn lượt thử lại: giữ trạng thái "đang dựng", không báo lỗi sớm
        msg = (e.stderr[-300:] if isinstance(e, subprocess.CalledProcessError) and e.stderr else str(e)[:300]) or "Lỗi dựng video"
        with independent():
            a = one(select(t.artifacts.c.content).where(t.artifacts.c.id == aid))
            if a:
                set_artifact(aid, content={**a["content"], "render": {"status": "failed", "error": msg}})
        raise


class Speech(BaseModel):
    text: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    voice: Literal[tuple(VOICES)] = "marin"  # type: ignore[valid-type]
    style: Literal[tuple(STYLES)] = "friendly"  # type: ignore[valid-type]
    delivery: Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)] = ""
    # nghe thử giọng bằng câu mẫu: lưu đệm theo giọng + phong cách để không tốn AI mỗi lần bấm
    sample: bool = False


@router.post("/artifacts/{artifact_id}/render")
def render(artifact_id: str, u: Editor) -> dict:
    """Dựng (hoặc dựng lại) video từ slide và lời đọc"""
    a = get_artifact(u.org_id, artifact_id)
    c = a["content"] or {}
    if a["type"] != "video" or not c.get("slides"):
        raise bad_request("Chỉ dựng được video tạo từ slide")
    if (c.get("render") or {}).get("status") == "rendering":
        raise conflict("Video đang được dựng")
    job = enqueue(u.org_id, "video.render", {"artifactId": a["id"]}, u.id)
    # jobId để trình soạn theo dõi tiến độ, kể cả khi mở lại trang giữa chừng
    set_artifact(a["id"], content={**c, "render": {**(c.get("render") or {}), "status": "rendering", "jobId": job["id"], "error": None}})
    return {"jobId": job["id"]}


@router.post("/artifacts/{artifact_id}/to-video")
def to_video(artifact_id: str, u: Editor) -> dict:
    """Tạo video từ bộ slide: lời đọc lấy từ ghi chú người trình bày"""
    deck = get_artifact(u.org_id, artifact_id)
    slides = (deck["content"] or {}).get("slides") or []
    if deck["type"] != "deck" or not slides:
        raise bad_request("Cần một bộ slide có nội dung")
    if not any(str(s.get("notes") or "").strip() for s in slides):
        raise bad_request("Thêm ghi chú người trình bày cho slide: đó là lời đọc của video")
    title = f"Video: {deck['title']}"
    content = {"ai": True, "voice": narration_of({"narration": DEFAULT}).label, "narration": dict(DEFAULT), "slides": [{**s, "id": uid("s")} for s in slides], "chapters": [{"t": i * SECONDS_PER_SLIDE, "title": s.get("title")} for i, s in enumerate(slides)],
               "transcript": [], "checkpoints": [], "duration": len(slides) * SECONDS_PER_SLIDE, "render": {"status": "rendering"},
               "plan": {"type": "video", "title": title, "summary": deck["summary"]}}
    v = one(t.artifacts.insert().values(orgId=u.org_id, kitId=deck["kitId"], type="video", title=title, img="video", content=content,
                                        summary="Video do AI tạo từ bộ slide và giọng đọc AI, đã chép lời và chia chương.").returning(t.artifacts))
    job = enqueue(u.org_id, "video.render", {"artifactId": v["id"]}, u.id)
    set_artifact(v["id"], content={**content, "render": {"status": "rendering", "jobId": job["id"]}})
    return {"id": v["id"], "jobId": job["id"]}


@router.post("/tts")
def speech(body: Speech, u: Editor) -> Response:
    """Nghe thử lời đọc của một slide (hoặc câu mẫu) với giọng, phong cách và cách đọc đã chọn"""
    if not body.sample and not body.text:
        raise bad_request("Slide này chưa có lời đọc")
    nar = Narration(body.voice, body.style, False, "right")
    cached = file_path(f"tts-samples/{body.voice}-{body.style}.mp3") if body.sample else None
    if cached and cached.exists():
        return Response(cached.read_bytes(), media_type="audio/mpeg")
    audio = tts(u.org_id, SAMPLE_TEXT if body.sample else body.text, nar.voice, nar.instructions(body.delivery))
    if not audio:
        raise bad_request("Đang chạy AI giả lập nên chưa có giọng đọc. Đặt AI_PROVIDER=openai để nghe thử")
    if cached:
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(audio)
    return Response(audio, media_type="audio/mpeg")


@router.get("/media/narration-options")
def narration_options(_: Editor) -> dict:
    """Giọng, phong cách đọc cho trình soạn video"""
    return options()


@router.get("/artifacts/{artifact_id}/presenter.png")
def presenter_still(artifact_id: str, u: Editor, look: Literal["f", "m"] = "f") -> Response:
    """Ảnh xem trước người dẫn theo màu nhấn của khóa"""
    png = presenter.still_png(look, _kit_accent(get_artifact(u.org_id, artifact_id)["kitId"]))
    return Response(png, media_type="image/png", headers={"Cache-Control": "private, max-age=300"})


@router.get("/media/{artifact_id}/{file}")
def media(artifact_id: str, file: str, u: AuthUser = Depends(current_user)) -> FileResponse:
    """Phát video/phụ đề: chỉ người được xem tài liệu mới tải được"""
    if not FILE.match(file):
        raise not_found("Tệp")
    a = viewable(u, artifact_id)
    p = file_path(f"videos/{a['id']}/{file}")
    if not p.exists():
        raise not_found("Tệp")
    return FileResponse(p, media_type="video/mp4" if file.endswith(".mp4") else "text/vtt")
