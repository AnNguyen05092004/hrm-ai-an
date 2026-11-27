"""Presenter Renderer: người dẫn ở góc video.

Bản hiện tại: ảnh chân dung người do AI tạo (người không có thật, `app/assets/presenters`) trong khung tròn,
vòng sáng màu nhấn sáng lên theo độ lớn giọng đọc từng khung (như viền người đang nói trong cuộc gọi video).
Chưa khớp môi: khi có dịch vụ avatar (HeyGen, D-ID, Synthesia…) hoặc mô hình tự chạy thì thay module này,
giữ nguyên render_frames / still_png / overlay_xy để luồng dựng video không đổi."""
import base64
import math
import subprocess
from array import array
from functools import lru_cache
from pathlib import Path

from app.adapters.render import svg_to_png

# đổi khi đổi cách vẽ người dẫn: các đoạn video đã dựng bằng cách cũ được dựng lại
STYLE = "photo-1"
FPS = 20
SIZE = 232  # khung PNG (px): khung tròn + chỗ cho vòng sáng và bóng đổ
BUBBLE = 200
MARGIN = 18  # cách mép video
RING_STEPS = 10  # mức sáng của vòng (làm tròn để dùng lại ảnh đã vẽ)
AUDIO_RATE = 8000
PORTRAITS = Path(__file__).resolve().parent.parent / "assets" / "presenters"
LOOKS = ("f", "m")


@lru_cache
def _portrait(look: str) -> str:
    return "data:image/jpeg;base64," + base64.b64encode((PORTRAITS / f"{look if look in LOOKS else 'f'}.jpg").read_bytes()).decode()


def frame_svg(look: str, accent: str, level: float) -> str:
    """Một khung: ảnh trong khung tròn viền trắng; level 0–1 là độ lớn giọng lúc đó"""
    c, r = SIZE / 2, BUBBLE / 2
    glow = (f'<circle cx="{c}" cy="{c}" r="{r + 3 + 4 * level:.1f}" fill="none" stroke="{accent}" stroke-width="{2 + 4 * level:.1f}" '
            f'opacity="{0.35 + 0.6 * level:.2f}" filter="url(#soft)"/>') if level > 0.05 else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">'
            f'<defs><clipPath id="bubble"><circle cx="{c}" cy="{c}" r="{r - 2}"/></clipPath>'
            '<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>'
            '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5"/></filter></defs>'
            f'<circle cx="{c}" cy="{c + 3}" r="{r}" fill="#0f172a" opacity="0.25" filter="url(#sh)"/>'
            f'{glow}<circle cx="{c}" cy="{c}" r="{r}" fill="#e2e8f0"/>'
            f'<image href="{_portrait(look)}" x="{c - r}" y="{c - r}" width="{BUBBLE}" height="{BUBBLE}" preserveAspectRatio="xMidYMid slice" clip-path="url(#bubble)"/>'
            f'<circle cx="{c}" cy="{c}" r="{r - 1.5}" fill="none" stroke="#ffffff" stroke-width="4"/></svg>')


def audio_levels(audio: Path | None, frames: int) -> list[float]:
    """Độ lớn giọng 0–1 cho từng khung (chuẩn hóa theo mức to của chính đoạn đó, lên nhanh, xuống chậm)"""
    if audio is None:
        return [0.0] * frames
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "s16le", "-ac", "1", "-ar", str(AUDIO_RATE), "-"], check=True, capture_output=True).stdout
    pcm = array("h")
    pcm.frombytes(raw[: len(raw) // 2 * 2])
    step = AUDIO_RATE // FPS
    rms = []
    for i in range(frames):
        w = pcm[i * step:(i + 1) * step]
        rms.append(math.sqrt(sum(s * s for s in w) / len(w)) if w else 0.0)
    loud = sorted(rms)[int(len(rms) * 0.95)] if rms else 0.0
    out, level = [], 0.0
    for r_ in rms:
        target = min(1.0, max(0.0, (r_ / loud) * 1.2 - 0.1)) if loud > 50 else 0.0
        level += (target - level) * (0.6 if target > level else 0.25)
        out.append(level)
    return out


def render_frames(out_dir: Path, *, look: str, accent: str, seconds: float, audio: Path | None) -> int:
    """Ghi f00001.png… cho cả đoạn; trả về số khung. Mỗi mức sáng chỉ vẽ một lần"""
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = max(1, math.ceil(seconds * FPS))
    cache: dict[int, bytes] = {}
    for i, level in enumerate(audio_levels(audio, frames)):
        step = round(level * RING_STEPS)
        if step not in cache:
            cache[step] = svg_to_png(frame_svg(look, accent, step / RING_STEPS))
        (out_dir / f"f{i + 1:05d}.png").write_bytes(cache[step])
    return frames


def still_png(look: str, accent: str) -> bytes:
    """Ảnh tĩnh để người soạn xem trước người dẫn"""
    return svg_to_png(frame_svg(look, accent, 0.0))


def overlay_xy(pos: str, width: int, height: int) -> tuple[int, int]:
    """Vị trí góc dưới (trái/phải) của khung người dẫn trên video"""
    pad = (SIZE - BUBBLE) // 2
    x = MARGIN - pad if pos == "left" else width - SIZE - MARGIN + pad
    return x, height - SIZE - MARGIN + pad
