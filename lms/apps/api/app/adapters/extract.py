"""Trích chữ từ tài liệu nguồn và chia thành đoạn theo mục để AI trích dẫn."""
import io
import re
from dataclasses import dataclass

from app.shared.errors import bad_request

ACCEPTED = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}
KINDS = ("pdf", "docx", "txt", "md")
MAX_CHUNK = 1400
HEADING = re.compile(r"^(#{1,4}\s+.+|(\d+(\.\d+)*)[.)]?\s+[A-ZÀ-Ỹ].{2,80}|[A-ZÀ-Ỹ][A-ZÀ-Ỹ0-9\s,:-]{4,60})$")
PAGE = re.compile(r"^\[\[trang (\d+)\]\]$")


def kind_of(filename: str, mime: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in KINDS:
        return ext
    k = ACCEPTED.get(mime)
    if not k:
        raise bad_request("Chỉ nhận tệp PDF, DOCX, TXT hoặc MD", "unsupported_file")
    return k


def extract_text(buf: bytes, kind: str) -> str:
    if kind == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(buf))
        return "\n".join(f"\n[[trang {i + 1}]]\n{p.extract_text() or ''}" for i, p in enumerate(reader.pages))
    if kind == "docx":
        import mammoth
        md = mammoth.convert_to_markdown(io.BytesIO(buf)).value
        return re.sub(r"\\([.\-()#*_])", r"\1", re.sub(r"__(.+?)__", r"\1", md))
    return buf.decode("utf-8", errors="replace")


@dataclass(frozen=True)
class Chunk:
    section: str
    text: str


def chunk_text(text: str) -> list[Chunk]:
    """Chia theo tiêu đề; đoạn dài thì cắt theo đoạn văn. Nhãn mục dạng "mục 2.1 Tên" hoặc "trang 3"."""
    out: list[Chunk] = []
    section, page, buf = "Phần mở đầu", "", []

    def flush() -> None:
        body = "\n".join(buf).strip()
        buf.clear()
        if not body:
            return
        label = f"{section} · {page}" if page and not section.startswith("mục") else section
        i = 0
        while i < len(body):
            piece = body[i:i + MAX_CHUNK]
            step = MAX_CHUNK
            if i + MAX_CHUNK < len(body):
                cut = piece.rfind("\n")
                if cut > MAX_CHUNK / 2:
                    piece, step = piece[:cut], cut
            out.append(Chunk(label, piece.strip()))
            i += step

    for raw in text.split("\n"):
        line = raw.strip()
        pg = PAGE.match(line)
        if pg:
            flush()
            page = f"trang {pg.group(1)}"
            continue
        if line and len(line) < 90 and HEADING.match(line):
            flush()
            clean = re.sub(r"^#+\s*", "", line)
            num = re.match(r"^(\d+(\.\d+)*)[.)]?\s+(.*)$", clean)
            section = f"mục {num.group(1)} {num.group(3)}" if num else clean
            buf.append(clean)
            continue
        buf.append(raw)
    flush()
    return [c for c in out if len(c.text) > 20]
