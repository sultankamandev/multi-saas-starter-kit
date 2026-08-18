"""Administrative commands that run outside the HTTP server.

A fresh install has no admin: every registration gets role "user", so /admin
stays locked until an account is promoted by hand. Register through the app
first, then::

    python -m app.cli promote you@example.com
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import func, select

from app.database import async_session_factory, engine
from app.domain.user import User


async def _promote(email: str) -> int:
    async with async_session_factory() as session:
        # Login lookups are case-insensitive everywhere else
        # (idx_users_email_lower), so match that here instead of making the
        # operator guess the stored casing.
        result = await session.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )
        user = result.scalar_one_or_none()

        if user is None:
            print(
                f'no account found for "{email}" — register through the app first',
                file=sys.stderr,
            )
            return 1

        if user.role == "admin" and user.verified:
            print(f"{user.email} is already an admin.")
            return 0

        # Verified is forced alongside the role: while email verification is on,
        # an unverified admin cannot log in, which would leave the console
        # unreachable.
        user.role = "admin"
        user.verified = True
        await session.commit()

    print(f"Promoted {email} to admin.")
    print(
        'Log out and back in — the role is carried in the JWT, so an existing '
        'token still says "user".'
    )
    return 0


async def _main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] != "promote":
        print("usage: python -m app.cli promote <email>", file=sys.stderr)
        return 2

    try:
        return await _promote(argv[1].strip())
    finally:
        await engine.dispose()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main(sys.argv[1:])))
