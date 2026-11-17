#!/bin/bash
# Xuất mọi sơ đồ trong images/src/*.html ra images/*.png (2x); mind map xuất thêm .svg.
#   bash images/src/render.sh            # tất cả
#   bash images/src/render.sh 02-luong   # chỉ file có tên chứa "02-luong"
set -e
# Dùng chrome-headless-shell (Playwright) vì Chrome headless=new giới hạn chiều cao khung nhìn ở 1080px.
CH="$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)"
D="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$D/.." && pwd)"
FLAGS=(--disable-gpu --no-sandbox --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=3000)

for SRC in "$D"/*${1}*.html; do
  NAME="$(basename "$SRC" .html)"
  DOM="$("$CH" "${FLAGS[@]}" --force-device-scale-factor=2 --window-size=2400,2000 --dump-dom "file://$SRC" 2>/dev/null)"
  SIZE="$(printf '%s' "$DOM" | sed -n 's:.*<title>\([0-9]*x[0-9]*\)</title>.*:\1:p')"
  [ -z "$SIZE" ] && { echo "Lỗi: $NAME không báo kích thước"; exit 1; }
  W="${SIZE%x*}"; H="${SIZE#*x}"
  if printf '%s' "$DOM" | grep -q '<svg id="m"'; then
    printf '%s' "$DOM" | python3 -c 'import sys,re; s=sys.stdin.read(); m=re.search(r"<svg id=\"m\".*?</svg>", s, re.S); print("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"+m.group(0))' > "$OUT/$NAME.svg"
  fi
  "$CH" "${FLAGS[@]}" --force-device-scale-factor=2 --window-size="$W,$H" \
    --screenshot="$OUT/$NAME.png" "file://$SRC" >/dev/null 2>&1
  echo "$NAME.png  ${W}x${H}"
done
