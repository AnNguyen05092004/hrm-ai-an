"""Ảnh có sẵn (Unsplash) theo khóa, bản sao của IMG trong web/src/data.js (test kiểm tra hai bên khớp nhau).
Server cần để vẽ ảnh vào video dựng từ slide và đưa ảnh vào gói SCORM."""
import httpx

from app.config import settings
from app.shared.storage import file_path

PRESET_IMAGES: dict[str, str] = {
    "server": "1605745341112-85968b19335b",
    "rack": "1558494949-ef010cbdcc31",
    "desk": "1517694712202-14dd9538aa97",
    "person": "1573497019940-1c28c88b4f3e",
    "video": "1498050108023-c5249f4df085",
    "screen": "1454165804606-c3d57bc86b40",
    "office": "1521737604893-d14cc237f11d",
    "meeting": "1552664730-d307ca884978",
    "team": "1600880292203-757bb62b4baf",
    "cyber": "1550751827-4bd374c3f58b",
    "phish": "1563013544-824ae1b704d3",
    "lock": "1614064641938-3bbee52942c7",
    "mobile": "1586953208448-b95a79798f07",
    "dash": "1551288049-bebda4e38f71",
    "charts": "1460925895917-afdab827c52f",
    "code": "1555066931-4365d14bab8c",
    "plan": "1531403009284-440f080d1e12",
    "sketch": "1581291518857-4e27b48ff24e",
    "support": "1553775282-20af80779df7",
    "openoffice": "1556761175-b413da4baf72",
    "handshake": "1521791136064-7986c2920216",
    "teamwork": "1600880292089-90a7e086ee0c",
    "man": "1507003211169-0a1dd7228f2d",
    "man2": "1500648767791-00dcc994a43e",
    "terminal": "1518432031352-d6fc5c10da5a",
    "devscreen": "1504639725590-34d0984388bd",
    "earth": "1451187580459-43490279c0fa",
    "nodes": "1639322537228-f710d846310a",
    "ai": "1677442136019-21780ecad995",
    "ml": "1591453089816-0fbb971b454c",
    "servers": "1558494949-ef010cbdcc31",
    "laptopglow": "1531297484001-80022131f5a1",
    "setup": "1550439062-609e1531270e",
    "devs": "1522071820081-009f0129c71c",
    "man5": "1560250097-0b93528c311a",
    "woman5": "1580489944761-15a19d654956",
    "woman6": "1534528741775-53994a69daeb",
    "shop": "1556742049-0cfed4f6a45d",
    "store": "1556740738-b6a63e27c4df",
    "receipt": "1554224155-6726b3ff858f",
    "piggy": "1607863680198-23d4b2565df0",
    "notes": "1488190211105-8b0e65b80b4e",
    "sign": "1450101499163-c8848c66ca85",
    "writing": "1434030216411-0b793f4b4173",
    "welcome": "1529156069898-49953e39b3ac",
    "loft": "1559136555-9303baea8ebd",
    "workshop": "1557804506-669a67965ba0",
    "warehouse": "1586528116311-ad8dd3c8310d",
    "man3": "1472099645785-5658abf4ff4e",
    "man4": "1506794778202-cad84cf45f1d",
    "woman4": "1438761681033-6461ffad8d80",
    "woman3": "1573496359142-b8d87734a5a2",
}
FETCH_TIMEOUT = 15.0


def preset_url(key: str) -> str | None:
    pid = PRESET_IMAGES.get(key)
    return f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w=1280&q=70" if pid else None


def preset_jpeg(key: str) -> bytes | None:
    """Ảnh có sẵn dạng JPEG: tải một lần rồi lưu đệm trong kho; không tải được thì None"""
    url = preset_url(key)
    if not url or settings().NODE_ENV == "test":  # test không phụ thuộc mạng
        return None
    cache = file_path(f"cache/presets/{key}.jpg")
    if cache.exists():
        return cache.read_bytes()
    try:
        r = httpx.get(url, timeout=FETCH_TIMEOUT, follow_redirects=True)
    except httpx.HTTPError:
        return None
    if r.status_code != 200:
        return None
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(r.content)
    return r.content
