import secrets


def uid(prefix: str = "id") -> str:
    """id ngắn cho phần tử trong nội dung (bài, khối, câu hỏi)"""
    return f"{prefix}-{secrets.token_hex(4)}"
