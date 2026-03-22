from __future__ import annotations

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

LOCALES_DIR = Path(__file__).resolve().parent.parent.parent / "locales"
SUPPORTED_LANGUAGES = {"en", "tr", "de", "fr", "es", "it", "ru"}

_messages: dict[str, dict[str, str]] = {}


def load_locales() -> None:
    for lang in SUPPORTED_LANGUAGES:
        path = LOCALES_DIR / f"{lang}.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                _messages[lang] = json.load(f)
            logger.info("Loaded locale: %s (%d keys)", lang, len(_messages[lang]))
        else:
            logger.warning("Locale file not found: %s", path)


def t(key: str, lang: str = "en") -> str:
    msgs = _messages.get(lang, _messages.get("en", {}))
    return msgs.get(key, key)


def is_language_supported(lang: str) -> bool:
    return lang in SUPPORTED_LANGUAGES
