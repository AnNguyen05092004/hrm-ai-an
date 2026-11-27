-- Đổi tên hiển thị "Nội dung gốc" thành "Nội dung" (chỉ đổi tên, không đổi nội dung)
UPDATE "artifacts" SET "title" = 'Nội dung' WHERE "type" = 'master' AND "title" = 'Nội dung gốc';--> statement-breakpoint
UPDATE "artifact_versions" SET "title" = 'Nội dung' WHERE "title" = 'Nội dung gốc' AND "artifact_id" IN (SELECT "id" FROM "artifacts" WHERE "type" = 'master');
