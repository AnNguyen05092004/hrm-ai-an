import io
import zipfile

COMPRESS_LEVEL = 6


def zip_files(files: dict[str, str | bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=COMPRESS_LEVEL) as z:
        for name, data in files.items():
            z.writestr(name, data.encode() if isinstance(data, str) else data)
    return buf.getvalue()
