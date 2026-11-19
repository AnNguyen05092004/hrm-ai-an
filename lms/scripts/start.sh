#!/usr/bin/env bash
# Chạy LMS bằng một lệnh: npm start (hoặc npm start -- --reset để tạo lại dữ liệu mẫu)
set -euo pipefail
cd "$(dirname "$0")/.."

for c in node docker ffmpeg; do
  command -v "$c" >/dev/null || { [ "$c" = ffmpeg ] && echo "⚠ Không có ffmpeg: các phần khác vẫn chạy, riêng dựng video AI sẽ lỗi" || { echo "✗ Thiếu $c"; exit 1; }; }
done

if [ ! -f .env ]; then
  cp .env.example .env
  key_file=../key.txt
  if [ -f "$key_file" ]; then
    sed -i '' "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$(tr -d '[:space:]' < "$key_file")|" .env
    echo "✓ Tạo .env, lấy key OpenAI từ key.txt"
  else
    sed -i '' 's|^AI_PROVIDER=.*|AI_PROVIDER=mock|' .env
    echo "⚠ Tạo .env với AI giả lập (không thấy key). Điền OPENAI_API_KEY và đặt AI_PROVIDER=openai để dùng AI thật"
  fi
fi

[ -d node_modules ] || npm install

echo "→ Bật Postgres (Docker)"
docker compose up -d --wait db >/dev/null

users=$(docker compose exec -T db psql -U lms -d lms -tAc "select count(*) from users" 2>/dev/null || echo 0)
if [ "${1:-}" = "--reset" ] || [ "${users// /}" = "0" ]; then
  echo "→ Tạo bảng và dữ liệu mẫu"
  npm run db:seed -w apps/api --silent
fi

echo "→ API http://localhost:4000 · Web http://localhost:5190 (Ctrl+C để dừng)"
trap 'kill 0' EXIT
npm run dev -w apps/api --silent &
npm run dev -w apps/web --silent &
wait
