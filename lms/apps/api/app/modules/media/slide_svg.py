"""Vẽ một slide thành SVG 1280×720 để dựng video. Định dạng người soạn đặt trên slide (xem đầu SlideKit.jsx):
st[phần] = { x, y (% khung), size (hệ số), color, b, i, u, font }, bg, bgImg + bgTone, boxes[] gồm hộp chữ, ảnh (kind: 'img') và hình khối (kind: 'shape')."""
import math
import re

W, H = 1280, 720
PRESENTER_SPACE = 170  # chừa cho khung người dẫn (≈ đường kính + lề − khoảng sẵn có của chân slide)
PX = W / 960  # slide trên web thiết kế theo bề ngang 960
ACCENT = "#ff6119"
# font chọn trên slide (cùng khóa với slideModel.js); máy chủ chưa cài font Google thì resvg dùng font dự phòng kế tiếp
FONT_STACK = {
    "be": "'Be Vietnam Pro', Arial, sans-serif", "inter": "Inter, Arial, sans-serif", "roboto": "Roboto, Arial, sans-serif",
    "montserrat": "Montserrat, Arial, sans-serif", "nunito": "Nunito, 'Arial Rounded MT Bold', Arial, sans-serif", "oswald": "Oswald, 'Arial Narrow', Arial, sans-serif",
    "merri": "Merriweather, Georgia, serif", "lora": "Lora, Georgia, serif", "playfair": "'Playfair Display', Georgia, serif",
    "mono": "'Roboto Mono', 'Courier New', monospace", "script": "'Dancing Script', 'Snell Roundhand', 'Brush Script MT', Georgia, cursive",
}
HEX = re.compile(r"^#[0-9a-f]{3,8}$", re.I)
TONE_FILL = {"light": '<rect width="1280" height="720" fill="#ffffff" fill-opacity="0.78"/>', "dark": '<rect width="1280" height="720" fill="#0f172a" fill-opacity="0.6"/>', "none": ""}
MAX_ROTATION = 360


def esc(s: object) -> str:
    return str(s if s is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def js_num(v: float) -> str:
    """In số như JS: 1.5, 3, 0.1 (không có .0 thừa)"""
    if isinstance(v, bool):
        return str(int(v))
    f = float(v)
    if f.is_integer():
        return str(int(f))
    return repr(f)


def fixed1(v: float) -> str:
    return f"{v:.1f}"


def num(v: object) -> float:
    """Number(x) của JS: không đổi được thì NaN"""
    if isinstance(v, bool):
        return float(v)
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).strip()) if str(v).strip() else 0.0
    except ValueError:
        return math.nan


def num0(v: object) -> float:
    """Number(x) || 0"""
    n = num(v) if v is not None else 0.0
    return 0.0 if math.isnan(n) else n


def color(c: object) -> str | None:
    return c if isinstance(c, str) and HEX.match(c) else None


def font_of(key: object) -> str | None:
    return FONT_STACK.get(key) if isinstance(key, str) else None


def with_font(f: str, key: object) -> str:
    ff = font_of(key)
    return f.replace("<text", f'<text font-family="{ff}"') if ff else f


def wrap(text: object, max_chars: int, lines: int = 3) -> list[str]:
    """Ngắt dòng theo số ký tự gần đúng (font Arial)"""
    text = str(text if text is not None else "")
    out: list[str] = []
    cur = ""
    for w in re.split(r"\s+", text):
        if len(f"{cur} {w}".strip()) > max_chars:
            if cur:
                out.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
        if len(out) == lines:
            break
    if cur and len(out) < lines:
        out.append(cur)
    if len(out) == lines and len(text) > len(" ".join(out)):
        out[lines - 1] = re.sub(r"\s+\S*$", "", out[lines - 1]) + "…"
    return out


def tspans(lines: list[str], x: float, y: float, lh: float, size: float, weight: int = 400, fill: str = "#111") -> str:
    return "".join(f'<text x="{js_num(x)}" y="{js_num(y + i * lh)}" font-size="{js_num(size)}" font-weight="{weight}" fill="{fill}">{esc(ln)}</text>' for i, ln in enumerate(lines))


def restyle(frag: str, st: dict | None, ax: float, ay: float) -> str:
    """Áp định dạng lên một nhóm chữ: màu, đậm/nghiêng, phóng to quanh góc trên trái (ax, ay), dời vị trí"""
    if not st or not frag:
        return frag
    f = frag
    c = color(st.get("color"))
    if c:
        f = re.sub(r'(<text\b[^>]*?) fill="[^"]*"', rf'\1 fill="{c}"', f)
    if isinstance(st.get("b"), bool):
        f = re.sub(r'(<text\b[^>]*?) font-weight="[^"]*"', rf'\1 font-weight="{700 if st["b"] else 400}"', f)
    if st.get("i"):
        f = f.replace("<text", '<text font-style="italic"')
    if st.get("u"):
        f = f.replace("<text", '<text text-decoration="underline"')
    f = with_font(f, st.get("font"))
    size = num0(st.get("size"))
    k = size if size > 0 else 1
    dx, dy = num0(st.get("x")) / 100 * W, num0(st.get("y")) / 100 * H
    if k == 1 and not dx and not dy:
        return f
    return f'<g transform="translate({fixed1(ax + dx)} {fixed1(ay + dy)}) scale({js_num(k)}) translate({js_num(-ax)} {js_num(-ay)})">{f}</g>'


def text_box_svg(b: dict) -> tuple[str, float]:
    """Hộp chữ; trả cả chiều cao để xoay quanh tâm"""
    size = num0(b.get("size"))
    k = size if size > 0 else 1
    fs = 22 * k * PX
    lh = fs * 1.3
    x, y, w = num0(b.get("x")) / 100 * W, num0(b.get("y")) / 100 * H, num0(b.get("w")) / 100 * W
    per = max(4, math.floor(w / (fs * 0.5)))
    lines = [ln for raw in str(b.get("text") or "").split("\n") for ln in (wrap(raw, per, 30) if raw.strip() else [""])]
    fill = color(b.get("fill"))
    pad = 10 * PX if fill else 0
    h = len(lines) * lh + pad * 2
    rect = f'<rect x="{js_num(x)}" y="{js_num(y)}" width="{js_num(w)}" height="{js_num(h)}" rx="{js_num(6 * PX)}" fill="{fill}"/>' if fill else ""
    text = tspans(lines, x + pad, y + pad + fs, lh, fs, 700 if b.get("b") else 400, color(b.get("color")) or "#262626")
    if b.get("i"):
        text = text.replace("<text", '<text font-style="italic"')
    if b.get("u"):
        text = text.replace("<text", '<text text-decoration="underline"')
    return rect + with_font(text, b.get("font")), h


def shape_svg(b: dict, x: float, y: float, w: float, h: float) -> str:
    """Chữ nhật, bo góc, tròn (nét vẽ nằm trong khung như trên web); đường thẳng, mũi tên nằm giữa khung cao 28"""
    base_sw = num0(b.get("sw")) or 3
    sw = max(1, base_sw) * PX
    if b.get("shape") in ("line", "arrow"):
        c = color(b.get("stroke")) or color(b.get("fill")) or "#111827"
        cy = y + 14 * PX
        hw = (base_sw * 2.6 + 9) * PX if b.get("shape") == "arrow" else 0
        hh = (base_sw * 1.6 + 5) * PX
        head = f'<polygon points="{js_num(x + w - hw)},{js_num(cy - hh)} {js_num(x + w)},{js_num(cy)} {js_num(x + w - hw)},{js_num(cy + hh)}" fill="{c}"/>' if hw else ""
        return f'<line x1="{js_num(x)}" y1="{js_num(cy)}" x2="{js_num(x + w - hw * 0.9)}" y2="{js_num(cy)}" stroke="{c}" stroke-width="{js_num(sw)}" stroke-linecap="round"/>{head}'
    fill = color(b.get("fill")) or "none"
    stroke = color(b.get("stroke"))
    st = f' stroke="{stroke}" stroke-width="{js_num(sw)}"' if stroke else ""
    i = sw / 2 if stroke else 0
    if b.get("shape") == "circle":
        return f'<ellipse cx="{js_num(x + w / 2)}" cy="{js_num(y + h / 2)}" rx="{js_num(max(0, w / 2 - i))}" ry="{js_num(max(0, h / 2 - i))}" fill="{fill}"{st}/>'
    return f'<rect x="{js_num(x + i)}" y="{js_num(y + i)}" width="{js_num(max(0, w - 2 * i))}" height="{js_num(max(0, h - 2 * i))}" rx="{js_num(18 * PX if b.get("shape") == "round" else 0)}" fill="{fill}"{st}/>'


def el_svg(b: object, idx: int, pics: dict[str, str]) -> str:
    """Phần tử đặt tự do (hộp chữ, ảnh, hình) theo thứ tự lớp; pics: ảnh đã tải dạng data URI theo id phần tử"""
    if not isinstance(b, dict):
        return ""
    x, y, w = num0(b.get("x")) / 100 * W, num0(b.get("y")) / 100 * H, num0(b.get("w")) / 100 * W
    h = (num0(b.get("h")) or 20) / 100 * H
    cy = y + h / 2
    if b.get("kind") == "img":
        pic = pics.get(f"el:{b.get('id')}")
        if not pic:
            return ""
        r = js_num(14 * PX if b.get("r") else 0)
        out = (f'<defs><clipPath id="el{idx}"><rect x="{js_num(x)}" y="{js_num(y)}" width="{js_num(w)}" height="{js_num(h)}" rx="{r}"/></clipPath></defs>'
               f'<image href="{pic}" x="{js_num(x)}" y="{js_num(y)}" width="{js_num(w)}" height="{js_num(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#el{idx})"/>')
    elif b.get("kind") == "shape":
        out = shape_svg(b, x, y, w, h)
        if b.get("shape") in ("line", "arrow"):
            cy = y + 14 * PX
    else:
        out, th = text_box_svg(b)
        cy = y + th / 2
    rot = num(b.get("rot")) if b.get("rot") is not None else math.nan
    if math.isfinite(rot) and rot:
        out = f'<g transform="rotate({js_num(max(-MAX_ROTATION, min(MAX_ROTATION, rot)))} {fixed1(x + w / 2)} {fixed1(cy)})">{out}</g>'
    op = num(b.get("op")) if b.get("op") is not None else math.nan
    return f'<g opacity="{js_num(op)}">{out}</g>' if 0 < op < 1 else out


def _on_dark(f: str) -> str:
    """Phủ tối: chữ mặc định chuyển sang sáng (chữ người soạn đã chọn màu giữ nguyên vì restyle chạy sau)"""
    return f.replace('fill="#111"', 'fill="#f8fafc"').replace('fill="#555"', 'fill="#cbd5e1"')


def _bullet(x: str, i: int, steps: bool, width: int = 54) -> str:
    dot = (f'<circle cx="104" cy="{262 + i * 86}" r="22" fill="{ACCENT}"/><text x="104" y="{271 + i * 86}" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">{i + 1}</text>'
           if steps else f'<circle cx="100" cy="{258 + i * 86}" r="8" fill="{ACCENT}"/>')
    return dot + tspans(wrap(x, width, 2), 145, 268 + i * 86, 34, 30)


def _body(s: dict, items: list[str], pic: str | None) -> str:
    layout = s.get("layout")
    st = (s.get("st") or {})
    if layout == "cover":
        sub_y = 300 + len(wrap(s.get("title"), 30, 3)) * 76 + 20
        if pic and not color(s.get("bg")):
            back = (f'<image href="{pic}" x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">'
                    '<stop offset="0" stop-color="#020617" stop-opacity=".92"/><stop offset=".55" stop-color="#0f172a" stop-opacity=".6"/><stop offset="1" stop-color="#0f172a" stop-opacity=".1"/>'
                    f'</linearGradient></defs><rect width="{W}" height="{H}" fill="url(#shade)"/>')
        else:
            back = f'<rect width="{W}" height="{H}" fill="{color(s.get("bg")) or "#1e293b"}"/>'
        title = restyle(tspans(wrap(s.get("title"), 30, 3), 90, 300, 76, 64, 800, "#ffffff"), st.get("title"), 90, 250)
        sub = restyle(tspans(wrap(s["sub"], 60, 2), 90, sub_y, 40, 30, 400, "#e2e8f0"), st.get("sub"), 90, sub_y - 30) if s.get("sub") else ""
        return f'{back}{title}{sub}<rect x="90" y="{sub_y + (70 if s.get("sub") else 10)}" width="86" height="7" fill="{ACCENT}"/>'
    if layout == "two" and s.get("cols"):
        return "".join(f'<rect x="{80 + i * 570}" y="230" width="540" height="400" rx="20" fill="#f4f4f5"/>{tspans(wrap(c[0] if c else "", 26, 1), 110 + i * 570, 290, 0, 32, 700)}'
                       + "".join(tspans(wrap(v, 34, 2), 110 + i * 570, 350 + j * 70, 34, 26) for j, v in enumerate(c[1:5])) for i, c in enumerate(s["cols"][:2]))
    if layout == "table" and s.get("head"):
        cols = len(s["head"])
        cw = (W - 160) / cols
        head = "".join(tspans(wrap(h, 24, 1), 100 + i * cw, 268, 0, 24, 700, "#fff") for i, h in enumerate(s["head"]))
        rows = "".join(tspans(wrap(c, math.floor(cw / 13), 1), 100 + i * cw, 330 + j * 60, 0, 22) for j, r in enumerate((s.get("rows") or [])[:6]) for i, c in enumerate(r))
        return f'<rect x="80" y="230" width="{W - 160}" height="56" fill="{ACCENT}"/>{head}{rows}'
    if layout == "stat" and s.get("stats"):
        return "".join(f"{tspans([x[0]], 100 + i * 380, 400, 0, 80, 800, ACCENT)}{tspans(wrap(x[1] if len(x) > 1 else '', 24, 2), 100 + i * 380, 460, 32, 24)}" for i, x in enumerate(s["stats"][:3]))
    if layout == "quote":
        return f"{tspans(wrap('“' + str(s.get('quote') or '') + '”', 44, 4), 120, 300, 56, 40, 400)}{tspans(['— ' + str(s.get('by') or '')], 120, 560, 0, 26, 400, '#555')}"
    if layout == "image" and pic:
        bullets = "".join(f'<circle cx="100" cy="{258 + i * 86}" r="8" fill="{ACCENT}"/>{tspans(wrap(x, 30, 2), 125, 268 + i * 86, 34, 28)}' for i, x in enumerate(items[:5]))
        return ('<defs><clipPath id="pic"><rect x="700" y="220" width="500" height="340" rx="14"/></clipPath></defs>'
                f'<image href="{pic}" x="700" y="220" width="500" height="340" preserveAspectRatio="xMidYMid slice" clip-path="url(#pic)"/>{bullets}')
    return "".join(_bullet(x, i, layout == "steps") for i, x in enumerate(items[:5]))


def _slide_raw(s: dict, n: int, total: int, pic: str | None, pics: dict[str, str], reserve: str | None = None) -> str:
    st = s.get("st") or {}
    layout = s.get("layout")
    dark = layout != "cover" and bool(pics.get("bg")) and s.get("bgTone") == "dark"

    def tone(f: str, keep: bool = False) -> str:
        return _on_dark(f) if dark and not keep else f

    ky = 236 if layout == "cover" else 74
    kicker = (restyle(tone(tspans([str(s["kicker"]).upper()], 90 if layout == "cover" else 80, ky, 0, 18, 700, "#e2e8f0" if layout == "cover" else ACCENT)), st.get("kicker"), 80, ky - 18)
              if s.get("kicker") else "")
    head = "" if layout == "cover" else restyle(tone(tspans(wrap(s.get("title"), 40, 2), 80, 120, 58, 48, 700)), st.get("title"), 80, 80)
    items = [x for x in s.get("items") or [] if x]
    body = _body(s, items, pic)
    if layout != "cover":
        # nền ảnh của slide thường; cột và bảng có nền sáng riêng nên giữ chữ tối
        back = f'<image href="{pics["bg"]}" x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/>{TONE_FILL.get(s.get("bgTone") or "light", TONE_FILL["light"])}' if pics.get("bg") else ""
        body = f'{back}<rect width="11" height="{H}" fill="{ACCENT}"/>{restyle(tone(body, layout in ("two", "table")), st.get("body"), 80, 230)}'
    boxes = "".join(el_svg(b, i, pics) for i, b in enumerate(s.get("boxes") or []))
    # có người dẫn ở góc dưới: chân slide lùi khỏi khung tròn để không bị che
    left = 80 + (PRESENTER_SPACE if reserve == "left" else 0)
    right = W - 80 - (PRESENTER_SPACE if reserve == "right" else 0)
    foot = (f'<text x="{left}" y="{H - 34}" font-size="18" fill="#888">Nội dung do AI tạo, đã được chuyên gia duyệt</text>'
            f'<text x="{right}" y="{H - 34}" font-size="18" fill="#888" text-anchor="end">{n}/{total}</text>')
    family = font_of(s.get("font")) or "Arial, Helvetica, sans-serif"
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" font-family="{family}"><rect width="{W}" height="{H}" fill="{color(s.get("bg")) or "#fff"}"/>{body}{kicker}{head}{boxes}{foot}</svg>'


def slide_svg(s: dict, n: int, total: int, accent: str = ACCENT, pic: str | None = None, pics: dict[str, str] | None = None, reserve: str | None = None) -> str:
    """reserve: "left" | "right" khi video có người dẫn ở góc dưới bên đó"""
    return _slide_raw(s, n, total, pic, pics or {}, reserve).replace(ACCENT, color(accent) or ACCENT)
