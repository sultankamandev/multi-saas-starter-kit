import re


def normalize_username(username: str) -> str:
    return username.strip().lower()


def validate_username(username: str) -> str | None:
    if len(username) < 3:
        return "Username must be at least 3 characters long"
    if len(username) > 30:
        return "Username must not exceed 30 characters"
    if not re.match(r"^[a-z0-9_]+$", username):
        return "Username can only contain lowercase letters, numbers, and underscores"
    return None
