"""Xuất khóa học thành gói SCORM 1.2 để đưa lên LMS của công ty (Moodle, SAP SuccessFactors, Cornerstone…).
Gói gồm: trình học chạy độc lập (dựng từ giao diện học của web), dữ liệu bản đã xuất bản, ảnh, video.
Đề kiểm tra chính thức không vào gói: đáp án sẽ nằm phía trình duyệt, không giữ được tính bảo mật đề."""
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select

from app.adapters.preset_images import PRESET_IMAGES, preset_jpeg
from app.config import settings
from app.modules.courses.service import get_kit, theme_of
from app.modules.courses.view import learner_view, published_content
from app.modules.media.images import EXT, load_image
from app.shared import tables as t
from app.shared.db import many
from app.shared.errors import AppError, bad_request
from app.shared.http import js_time
from app.shared.storage import get_file
from app.shared.text import slugify
from app.shared.zipfiles import zip_files

ORDER = ["qr", "deck", "scenario", "video", "guide"]
AUTO = {"mc", "mr", "tf", "fill", "match", "order", "cat"}
EXAM_REASON = "Đề kiểm tra chính thức chỉ làm trên LMS này để giữ bảo mật đề và giám sát"
IMG_REF = re.compile(r"^/api/images/([\w-]+)$")
VIDEO_REF = re.compile(r"^/api/media/([\w-]+)/(video-\d+\.(?:mp4|vtt))$")


def _xml(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def offline_quiz(quiz: dict | None) -> dict | None:
    """Bài luyện tập trong Tài liệu nhanh: chỉ giữ câu chấm tự động được, không đưa đề thi chính thức vào gói"""
    if not quiz or quiz.get("mode") != "practice":
        return None
    keys = ("id", "type", "q", "choices", "answer", "pairs", "items", "groups")
    qs = [{k: q[k] for k in keys if q.get(k) is not None} for q in quiz.get("questions") or [] if q.get("approved") and q.get("type") in AUTO]
    return {"passScore": quiz.get("passScore") or 80, "questions": qs} if qs else None


def quiz_skip_reason(quiz: dict) -> str:
    """Vì sao bài kiểm tra trong Tài liệu nhanh không vào gói: nói đúng nguyên nhân để người soạn biết cần làm gì"""
    if quiz.get("mode") != "practice":
        return "Bài thi chính thức chỉ làm trên LMS này"
    if not any(q.get("approved") for q in quiz.get("questions") or []):
        return "Chưa duyệt câu hỏi nào. Duyệt câu trong trình soạn rồi xuất bản lại"
    return "Các câu đã duyệt đều là tự luận hoặc bài code, cần người hoặc máy chủ chấm"


def _rewrite(x: object, fn) -> object:  # noqa: ANN001 - duyệt cây nội dung, thay chuỗi
    if isinstance(x, str):
        return fn(x)
    if isinstance(x, list):
        return [_rewrite(v, fn) for v in x]
    if isinstance(x, dict):
        return {k: _rewrite(v, fn) for k, v in x.items()}
    return x


def _collect_presets(x: object, out: set[str]) -> None:
    if isinstance(x, dict):
        for k, v in x.items():
            if k in ("img", "bgImg") and isinstance(v, str) and v in PRESET_IMAGES:
                out.add(v)
            _collect_presets(v, out)
    elif isinstance(x, list):
        for v in x:
            _collect_presets(v, out)


def _player() -> dict[str, bytes]:
    d = settings().scorm_player_dir
    files = {("index.html" if p.relative_to(d).as_posix() == "scorm.html" else p.relative_to(d).as_posix()): p.read_bytes() for p in d.rglob("*") if p.is_file()} if d.is_dir() else {}
    if "index.html" not in files:
        raise AppError(503, "player_missing", "Chưa build trình học cho gói SCORM. Chạy: npm run build:scorm -w apps/web")
    return files


@dataclass(frozen=True)
class ScormPackage:
    name: str
    zip: bytes
    items: int
    skipped: list[dict]
    versions: dict[str, int]


def _published(kit_id: str, org_id: str, versions: dict[str, int] | None) -> list[dict]:
    # Nội dung (master) chỉ dùng nội bộ, không bao giờ vào gói cho người học
    arts = many(select(t.artifacts).where(t.artifacts.c.kitId == kit_id, t.artifacts.c.orgId == org_id, t.artifacts.c.type != "master"))
    if versions is not None:
        return [a for a in arts if a["id"] in versions]
    return [a for a in arts if a["publishedVersion"]]


def _manifest(k: dict, files: list[str], mastery: float) -> str:
    score = f"\n        <adlcp:masteryscore>{int(mastery) if float(mastery).is_integer() else mastery}</adlcp:masteryscore>" if mastery else ""
    refs = "\n".join(f'      <file href="{_xml(f)}"/>' for f in sorted(files))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="lms-{k['id']}" version="1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>{_xml(k['title'])}</title>
      <item identifier="item-1" identifierref="res-1" isvisible="true">
        <title>{_xml(k['title'])}</title>{score}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
{refs}
    </resource>
  </resources>
</manifest>
"""


def build_scorm(org_id: str, kit_id: str, versions: dict[str, int] | None = None) -> ScormPackage:
    """versions: {artifactId: version} người soạn đã xác nhận (gửi sang LMS); không có thì lấy bản xuất bản mới nhất"""
    k = get_kit(org_id, kit_id)
    player = _player()
    arts = _published(k["id"], org_id, versions)
    skipped = [{"title": a["title"], "reason": EXAM_REASON} for a in arts if a["type"] == "exam"]
    learn = sorted((a for a in arts if a["type"] != "exam"), key=lambda a: (ORDER.index(a["type"]) if a["type"] in ORDER else -1, a["createdAt"]))
    if not learn:
        raise bad_request("Khóa chưa có tài liệu học nào được xuất bản")
    media: dict[str, bytes] = {}
    presets: set[str] = set()
    own_images: set[str] = set()
    items: list[dict] = []
    used: dict[str, int] = {}
    for a in learn:
        pub = published_content(a, (versions or {}).get(a["id"]))
        used[a["id"]] = pub["version"]
        content = pub["content"]
        quiz = offline_quiz(content.get("quiz"))
        if a["type"] == "qr" and content.get("quiz") and not quiz:
            skipped.append({"title": f'Bài kiểm tra trong "{pub["title"]}"', "reason": quiz_skip_reason(content["quiz"])})
        view = learner_view(content)
        if a["type"] == "qr" and not quiz:
            view["lessons"] = [x for x in view.get("lessons") or [] if x.get("kind") != "quiz"]
        raw = {"id": a["id"], "type": a["type"], "img": a["img"], "kitId": k["id"], "kitTitle": k["title"], "title": pub["title"], "summary": pub["summary"], "version": pub["version"],
               "draft": False, "offline": True, **view, "offlineQuiz": quiz, "progress": {"done": [], "percent": 0}}
        vids: set[str] = set()

        def to_local(s: str, aid: str = a["id"], vids: set[str] = vids) -> str:
            img = IMG_REF.match(s)
            if img:
                own_images.add(img.group(1))
                return f"media/img-{img.group(1)}"
            vid = VIDEO_REF.match(s)
            if vid and vid.group(1) == aid:
                vids.add(vid.group(2))
                return f"media/{aid}-{vid.group(2)}"
            return s

        mapped = _rewrite(raw, to_local)
        for f in vids:
            media[f"media/{a['id']}-{f}"] = get_file(f"videos/{a['id']}/{f}")
        _collect_presets(mapped, presets)
        items.append(mapped)  # type: ignore[arg-type]
    if k["img"] in PRESET_IMAGES:
        presets.add(k["img"])
    # ảnh của công ty: giữ đuôi tệp theo định dạng thật
    own_ext: dict[str, str] = {}
    for iid in own_images:
        f = load_image(org_id, iid)
        if f:
            own_ext[iid] = EXT.get(f[0], "png")
            media[f"media/img-{iid}.{own_ext[iid]}"] = f[1]
    preset_files: dict[str, str] = {}
    for key in presets:
        jpg = preset_jpeg(key)
        if jpg:
            media[f"media/preset-{key}.jpg"] = jpg
            preset_files[key] = f"media/preset-{key}.jpg"

    def fix_own(s: str) -> str:
        m = re.match(r"^media/img-([\w-]+)$", s)
        return (f"media/img-{m.group(1)}.{own_ext[m.group(1)]}" if m.group(1) in own_ext else "") if m else s

    course = {"version": 1, "exportedAt": js_time(datetime.now(UTC)), "course": {"id": k["id"], "title": k["title"], "desc": k["goal"], "img": k["img"], "theme": theme_of(k)},
              "items": _rewrite(items, fix_own), "presets": preset_files, "skipped": skipped}
    files: dict[str, bytes | str] = {**player, **media, "course.js": f"window.COURSE = {json.dumps(course, ensure_ascii=False).replace('<', '\\u003c')};\n"}
    mastery = max([float((x.get("offlineQuiz") or {}).get("passScore") or 0) for x in items] + [0])
    files["imsmanifest.xml"] = _manifest(k, list(files), mastery)
    return ScormPackage(f"{slugify(k['title'], 'khoa-hoc')}-scorm12.zip", zip_files(files), len(items), skipped, used)
