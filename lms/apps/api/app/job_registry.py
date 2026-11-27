"""Đăng ký mọi loại job (import để chạy decorator define_job). Worker và test dùng."""
from app.modules.courses import jobs as course_jobs  # noqa: F401
from app.modules.exams import spec as exam_jobs  # noqa: F401
from app.modules.lms_export import routes as lms_jobs  # noqa: F401
from app.modules.media import video as video_jobs  # noqa: F401
from app.modules.notifications import service as notification_jobs  # noqa: F401
from app.modules.sources import service as source_jobs  # noqa: F401
