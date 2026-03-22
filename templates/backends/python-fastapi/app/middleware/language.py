from __future__ import annotations

from fastapi import Request

SUPPORTED_LANGUAGES = {"en", "tr", "de", "fr", "es", "it", "ru"}


def get_language(request: Request) -> str:
    lang = request.query_params.get("lang", "")
    if not lang:
        lang = request.headers.get("Accept-Language", "")

    lang = lang.lower().strip()
    if len(lang) > 2:
        lang = lang[:2]

    if not lang or lang not in SUPPORTED_LANGUAGES:
        lang = "en"

    return lang
