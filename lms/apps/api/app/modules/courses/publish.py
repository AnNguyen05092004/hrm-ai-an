"""Xuất bản một tài liệu: chụp bản hiện tại thành phiên bản mới. Gói xuất (SCORM, đề QTI) chỉ dùng bản đã xuất bản."""
from sqlalchemy import select

from app.modules.courses.service import set_artifact
from app.modules.courses.validate import publish_issues
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser
from app.shared.db import db, many, one
from app.shared.errors import bad_request

_v = t.artifact_versions.c


def publish_artifact(u: AuthUser, a: dict, note: str = "") -> dict:
    issues = publish_issues(a)
    if issues["blocking"]:
        raise bad_request(" ".join(issues["blocking"]), "not_ready")
    k = one(select(t.kits.c.sourceIds).where(t.kits.c.id == a["kitId"]))
    ids = (k or {}).get("sourceIds") or []
    srcs = many(select(t.sources.c.id, t.sources.c.version).where(t.sources.c.id.in_(ids))) if ids else []
    version = (a["publishedVersion"] or 0) + 1
    db().execute(t.artifact_versions.insert().values(artifactId=a["id"], version=version, title=a["title"], summary=a["summary"], content=a["content"],
                                                     publishedBy=u.id, note=note, sourceVersions={s["id"]: s["version"] for s in srcs}))
    r = set_artifact(a["id"], status="published", publishedVersion=version)
    audit(u, "artifact.publish", a["id"], {"version": version})
    return r


def version_of(artifact_id: str, version: int | None) -> dict | None:
    if version is None:
        return None
    return one(select(t.artifact_versions).where(_v.artifactId == artifact_id, _v.version == version))


def has_unpublished_changes(a: dict) -> bool:
    """Bản nháp có khác bản đã xuất bản gần nhất không (để "xuất bản cả khóa" bỏ qua tài liệu không đổi)"""
    if not a["publishedVersion"]:
        return True
    v = version_of(a["id"], a["publishedVersion"])
    return not v or v["title"] != a["title"] or v["summary"] != a["summary"] or v["content"] != a["content"]
