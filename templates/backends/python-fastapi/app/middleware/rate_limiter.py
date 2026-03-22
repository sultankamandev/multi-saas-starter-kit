from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field

from fastapi import HTTPException, Request


@dataclass
class Visitor:
    first_seen: float
    count: int = 1
    blocked: bool = False
    blocked_at: float = 0.0


@dataclass
class BlockedIP:
    ip: str
    blocked_at: float


class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: float = 60, block_seconds: float = 300):
        self._max_requests = max_requests
        self._window = window_seconds
        self._block_duration = block_seconds
        self._visitors: dict[str, Visitor] = {}
        self._cleanup_task: asyncio.Task[None] | None = None

    def start_cleanup(self) -> None:
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def _cleanup_loop(self) -> None:
        while True:
            await asyncio.sleep(300)
            now = time.monotonic()
            expired = [
                ip
                for ip, v in self._visitors.items()
                if not v.blocked and (now - v.first_seen) > self._window
            ]
            for ip in expired:
                del self._visitors[ip]

    async def __call__(self, request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        if ip.startswith("::") or ip == "127.0.0.1":
            return

        now = time.monotonic()
        v = self._visitors.get(ip)

        if v is None:
            self._visitors[ip] = Visitor(first_seen=now)
            return

        if v.blocked:
            if (now - v.blocked_at) > self._block_duration:
                v.blocked = False
                v.count = 1
                v.first_seen = now
                return
            raise HTTPException(
                status_code=429,
                detail={"error": "Too many requests. You are temporarily blocked.", "error_code": "BLOCKED"},
            )

        if (now - v.first_seen) > self._window:
            v.count = 1
            v.first_seen = now
            return

        v.count += 1
        if v.count > self._max_requests:
            v.blocked = True
            v.blocked_at = now
            raise HTTPException(
                status_code=429,
                detail={"error": "Too many requests. You are temporarily blocked.", "error_code": "BLOCKED"},
            )

    def get_blocked_ips(self) -> list[BlockedIP]:
        return [
            BlockedIP(ip=ip, blocked_at=v.blocked_at)
            for ip, v in self._visitors.items()
            if v.blocked
        ]

    def unblock_ip(self, ip: str) -> bool:
        v = self._visitors.get(ip)
        if v is None or not v.blocked:
            return False
        v.blocked = False
        v.count = 0
        v.first_seen = time.monotonic()
        return True
