from helpers import drain_jobs, kit_by

V3 = """## mục 1
Volume lưu bền nhưng vẫn có thể mất khi máy chủ hỏng hoặc chạy nhầm lệnh xóa. Sao lưu định kỳ giúp khôi phục nhanh.

## mục 2
Không cần dừng ghi nếu dùng snapshot của ổ đĩa. Chạy container tạm gắn volume, nén bằng tar, kiểm tra file sao lưu.

## mục 2.3
docker run --rm -v pgdata:/data -v $(pwd):/backup busybox tar czf /backup/pgdata.tar.gz /data
"""


def test_lists_parts_citing_changed_sections(ctx):
    docker = kit_by(ctx.author, "Docker")
    assert ctx.author("GET", f"/api/kits/{docker['id']}/source-changes").body == []
    src = next(s for s in ctx.author("GET", "/api/sources").body if s["name"].startswith("Runbook"))
    r = ctx.author.upload(f"/api/sources?replace={src['id']}", "Runbook-Backup-v3.md", V3, "text/markdown")
    assert r.body["source"]["version"] == 2
    drain_jobs()
    ch = ctx.author("GET", f"/api/kits/{docker['id']}/source-changes").body
    assert len(ch) == 1 and ch[0]["from"] == 1 and ch[0]["to"] == 2
    where = " | ".join(p["where"] for p in ch[0]["parts"])
    assert "Bài 3" in where and "mục 2.3" not in where
