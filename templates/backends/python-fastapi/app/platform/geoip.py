from __future__ import annotations


class GeoIPResolver:
    """Placeholder for GeoIP resolution. Can be extended with MaxMind or ip-api."""

    async def resolve_country(self, ip: str) -> str:
        return ""
