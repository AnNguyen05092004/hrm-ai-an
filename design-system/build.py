"""Sinh lại các file dẫn xuất của design system. Chạy: python3 design-system/build.py

- tokens.css  : CSS variables và class chữ, từ tokens.json
- index.html  : trang xem toàn bộ thư viện, từ tokens.json và components/*/preview.html
- README.md   : phần "Danh sách component" (giữa hai dòng đánh dấu), từ components/*/README.md
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
GROUPS = ["Hành động", "Biểu mẫu", "Bố cục", "Điều hướng", "Hiển thị", "Trạng thái", "AI & quyết định",
          "Học tập & soạn nội dung", "Hồ sơ & quy trình", "Đánh giá", "Biểu đồ", "Gợi ý & trợ lý", "Phản hồi", "Mẫu màn"]
tokens = json.loads((HERE / "tokens.json").read_text(encoding="utf-8"))


def val(v):
    if isinstance(v, dict):
        v = v["light"]
    m = re.fullmatch(r"\{(.+)\}", v)
    return f"var(--{m.group(1)})" if m else v


# ---------- tokens.css ----------
css = ["/* Workforce AI: CSS variables sinh từ tokens.json. Đừng sửa tay: sửa tokens.json rồi chạy build.py */", ":root {", "  /* Màu */"]
css += [f"  --{x['name']}: {val(x['value'])};" for x in tokens["color"]["tokens"]]
for fam, title in [("spacing", "Khoảng cách"), ("radius", "Bo góc"), ("shadow", "Bóng"), ("size", "Kích thước"), ("motion", "Chuyển động"), ("layer", "Lớp xếp chồng")]:
    css.append(f"  /* {title} */")
    css += [f"  --{x['name']}: {x['value']};" for x in tokens[fam]["tokens"]]
css.append("  /* Font */")
css += [f"  --font-{k}: {v};" for k, v in tokens["type"]["families"].items()]
css.append("}\n\n/* Kiểu chữ: dùng class .text-<tên> */")
for g in tokens["type"]["groups"]:
    for s in g["styles"]:
        p = [f"font-family: var(--font-{s.get('family', g['family'])})", f"font-size: {s['fontSize']}",
             f"line-height: {s['lineHeight']}", f"font-weight: {s['fontWeight']}"]
        if "letterSpacing" in s:
            p.append(f"letter-spacing: {s['letterSpacing']}")
        if s["name"] == "overline":
            p.append("text-transform: uppercase")
        css.append(f".text-{s['name']} {{ {'; '.join(p)}; }}")
(HERE / "tokens.css").write_text("\n".join(css) + "\n", encoding="utf-8")

# ---------- đọc component ----------
comps = []
for d in sorted((HERE / "components").iterdir()):
    pv = d / "preview.html"
    if not pv.exists():
        continue
    head = pv.read_text(encoding="utf-8").splitlines()[0]
    group = re.search(r'group="([^"]+)"', head).group(1)
    height = int(re.search(r"height=(\d+)", head).group(1))
    if group not in GROUPS:
        raise SystemExit(f"{d.name}: nhóm '{group}' chưa có trong GROUPS")
    rd = (d / "README.md").read_text(encoding="utf-8")
    para = next(b for b in rd.split("\n\n") if b.strip() and not b.startswith("#")).strip()
    summary = re.split(r"(?<=\.)\s", para.replace("\n", " "), maxsplit=1)[0]
    comps.append({"name": d.name, "group": group, "height": height, "summary": summary})

# ---------- index.html ----------
sw = "".join(f'<div><i style="background:var(--{x["name"]})"></i><span><b>{x["name"]}</b><br>{val(x["value"])}</span></div>'
             for x in tokens["color"]["tokens"])
type_samples = "".join(
    f'<div class="type-sample"><span>{style["name"]} · {style["fontSize"]} / {style["lineHeight"]}</span>'
    f'<p class="text-{style["name"]}">{style["sample"]}</p></div>'
    for group in tokens["type"]["groups"] for style in group["styles"]
)
toc = " · ".join(f'<a href="#g{i}">{g}</a>' for i, g in enumerate(GROUPS))
body = []
for i, g in enumerate(GROUPS):
    items = [c for c in comps if c["group"] == g]
    if not items:
        continue
    body.append(f'<h2 id="g{i}">{g}</h2>')
    for c in items:
        body.append(f'<section><h3>{c["name"]} <a href="components/{c["name"]}/README.md">hướng dẫn</a></h3>'
                    f'<iframe src="components/{c["name"]}/preview.html" data-preview style="height:{c["height"] + 40}px" title="{c["name"]}" loading="lazy"></iframe></section>')
html = f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Workforce AI Design System</title>
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="components.css">
<style>
 body {{ max-width: 1360px; margin: 0 auto; padding: 32px max(16px, 3vw) 80px; }}
 h2 {{ margin: 40px 0 12px; font-size: 20px; }}
 h3 {{ margin: 0 0 8px; font-size: 14px; }} h3 a {{ font-weight: 400; color: var(--red-500); margin-left: 8px; }}
 nav.toc {{ display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 13px; }} nav.toc a {{ color: var(--red-500); }}
 section {{ margin-bottom: 20px; }}
 iframe {{ width: 100%; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--white); }}
 .sw {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }}
 .sw div {{ border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; font-size: 12px; }}
 .sw i {{ display: block; height: 48px; }} .sw span {{ display: block; padding: 6px 8px; overflow-wrap: anywhere; }}
 .pattern-links {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 16px; margin: 24px 0; }}
 .pattern-links a {{ padding: 24px; border: 1px solid var(--line); border-radius: var(--radius-lg); color: var(--ink); text-decoration: none; background: var(--white); box-shadow: var(--shadow-card); }}
 .pattern-links a:hover {{ border-color: var(--red-200); background: var(--primary-soft); }}
 .pattern-links strong {{ display: block; font: 500 20px/28px var(--font-display); }}
 .pattern-links span {{ display: block; color: var(--ink-muted); font-size: 13px; margin-top: 8px; }}
 .type-sample {{ padding: 16px 0; border-bottom: 1px solid var(--line); }}
 .type-sample > span {{ font-size: 12px; color: var(--ink-muted); }}
 .type-sample p {{ margin: 8px 0 0; overflow-wrap: anywhere; }}
</style></head><body>
<iframe src="cover/preview.html" style="height:300px;border:0" title="Bìa"></iframe>
<h1 class="text-h1">Design system · Workforce AI</h1>
<p>Phiên bản 2 · Phong cách NOVA, typography dễ đọc và component dùng chung.</p>
<nav class="pattern-links" aria-label="Ba mẫu màn v2">
<a href="patterns/workspace-overview.html"><strong>01 · Tổng quan →</strong><span>Sidebar, KPI, công việc và điểm tin AI</span></a>
<a href="patterns/request-list.html"><strong>02 · Danh sách →</strong><span>Bộ lọc, bảng dữ liệu và trạng thái</span></a>
<a href="patterns/approval-detail.html"><strong>03 · Phê duyệt →</strong><span>Bằng chứng AI và quyết định của con người</span></a>
</nav>
<p>{len(comps)} component. Quy tắc dùng: <a href="README.md">README.md</a>. File này sinh tự động bởi build.py.</p>
<nav class="toc">{toc}</nav>
<h2>Typography</h2>{type_samples}
<h2>Màu</h2><div class="sw">{sw}</div>
{''.join(body)}
<script>
// Các preview cùng origin: chờ font cục bộ rồi đo lại để không cắt nội dung.
document.querySelectorAll('iframe[data-preview]').forEach(frame => {{
  const minimum = parseInt(frame.style.height, 10);
  const fit = async () => {{
    const doc = frame.contentDocument;
    if (!doc || !doc.body) return;
    await doc.fonts.ready;
    frame.style.height = Math.max(minimum, doc.body.scrollHeight + 32) + 'px';
  }};
  frame.addEventListener('load', fit);
  if (frame.contentDocument?.readyState === 'complete') fit();
}});
</script>
</body></html>
"""
(HERE / "index.html").write_text(html, encoding="utf-8")

# ---------- README: danh sách component ----------
readme = (HERE / "README.md").read_text(encoding="utf-8")
start, end = "<!-- components:start -->", "<!-- components:end -->"
lines = [start]
for g in GROUPS:
    items = [c for c in comps if c["group"] == g]
    if items:
        lines.append(f"\n**{g}**\n")
        lines += [f"- [{c['name']}](components/{c['name']}/README.md): {c['summary']}" for c in items]
lines.append("\n" + end)
block = "\n".join(lines)
if start in readme:
    readme = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: block, readme, flags=re.S)
else:
    readme = readme.rstrip() + "\n\n" + block + "\n"
(HERE / "README.md").write_text(readme, encoding="utf-8")
print(f"Đã ghi tokens.css, index.html, README.md ({len(comps)} component)")
