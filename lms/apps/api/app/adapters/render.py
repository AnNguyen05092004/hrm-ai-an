"""SVG → PNG (resvg)."""
import resvg_py


def svg_to_png(svg: str) -> bytes:
    return bytes(resvg_py.svg_to_bytes(svg_string=svg, font_family="Arial"))
