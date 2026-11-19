-- Tình huống do AI soạn trước đây ghi mức lựa chọn là "ok"; trình soạn và trình học dùng "neutral"
UPDATE "artifacts" SET "content" = replace("content"::text, '"ok": "ok"', '"ok": "neutral"')::jsonb WHERE "type" = 'scenario' AND "content"::text LIKE '%"ok": "ok"%';--> statement-breakpoint
UPDATE "artifact_versions" SET "content" = replace("content"::text, '"ok": "ok"', '"ok": "neutral"')::jsonb WHERE "content"::text LIKE '%"ok": "ok"%';
