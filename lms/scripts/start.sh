#!/usr/bin/env bash
# Chạy LMS bằng một lệnh: npm start (hoặc npm start -- --reset để tạo lại dữ liệu mẫu)
# Gồm: Postgres + Mailpit (Docker), API FastAPI, Background Worker, web Studio, LMS công ty (demo nhận gói)
set -euo pipefail
cd "$(dirname "$0")/.."

for c in node uv docker ffmpeg; do
  if ! command -v "$c" >/dev/null; then
    case "$c" in
      ffmpeg) echo "⚠ Không có ffmpeg: các phần khác vẫn chạy, riêng dựng video AI sẽ lỗi" ;;
      uv) echo "✗ Thiếu uv (quản lý Python cho API). Cài: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1 ;;
      *) echo "✗ Thiếu $c"; exit 1 ;;
    esac
  fi
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

# khóa dùng chung giữa API và LMS công ty (demo) khi gửi gói qua API: sinh một lần, không in ra
if ! grep -qE '^LMS_API_TOKEN=.+' .env; then
  token=$(openssl rand -hex 24)
  if grep -q '^LMS_API_TOKEN=' .env; then sed -i '' "s|^LMS_API_TOKEN=.*|LMS_API_TOKEN=$token|" .env; else printf '\nLMS_API_TOKEN=%s\n' "$token" >> .env; fi
  echo "✓ Tạo LMS_API_TOKEN trong .env"
fi

[ -d node_modules ] || npm install
echo "→ Cài thư viện Python cho API (uv)"
(cd apps/api && uv sync --quiet)

# trình học cho gói SCORM (Xuất khóa học → Gói SCORM); build lại mỗi lần chạy để gói luôn theo giao diện mới nhất
echo "→ Build trình học cho gói SCORM"
npm run build:scorm -w apps/web --silent >/dev/null

echo "→ Bật Postgres và Mailpit (Docker)"
# Postgres đang chạy (có thể do bản LMS đầy đủ bật) thì dùng luôn, không tạo lại container
docker compose exec -T db pg_isready -U lms >/dev/null 2>&1 || docker compose up -d --wait db >/dev/null
docker compose up -d mailpit >/dev/null

# bản Studio dùng DB riêng, không đụng DB "lms" của bản đầy đủ
for d in lms_studio lms_studio_test; do
  docker compose exec -T db psql -U lms -d lms -tAc "select 1 from pg_database where datname='$d'" | grep -q 1 \
    || docker compose exec -T db psql -U lms -d lms -qc "create database $d" >/dev/null
done

echo "→ Cập nhật cấu trúc CSDL (Alembic)"
(cd apps/api && uv run python -m app.cli migrate >/dev/null)
if [ "${1:-}" = "--reset" ] || ! (cd apps/api && uv run python -m app.cli has-data); then
  echo "→ Tạo dữ liệu mẫu"
  (cd apps/api && uv run python -m app.cli seed)
fi

echo "→ API http://localhost:4100 (tài liệu API: /api/docs) · Web http://localhost:5194 · LMS công ty http://localhost:5196 · Hộp thư Mailpit http://localhost:8025 (Ctrl+C để dừng)"
trap 'kill 0' EXIT
npm run dev -w apps/api --silent &
npm run worker -w apps/api --silent &
npm run dev -w apps/web --silent &
npm run dev -w apps/company-lms --silent &
wait
