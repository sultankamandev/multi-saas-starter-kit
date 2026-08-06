"""Password hashing.

Uses the `bcrypt` package directly rather than passlib. passlib 1.7.4 is
effectively unmaintained and its bcrypt backend probe raises against bcrypt
>= 4.1 ("password cannot be longer than 72 bytes"), which made every
registration return a 500.

Cost factor 12 matches the Go and Node templates, as TEMPLATE_SPEC requires.
"""

import bcrypt

DEFAULT_ROUNDS = 12


def hash_password(password: str, rounds: int = DEFAULT_ROUNDS) -> str:
    # bcrypt only ever considers the first 72 bytes. Truncate explicitly so a
    # long password hashes instead of raising, matching bcryptjs in the Node
    # template rather than erroring.
    raw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed or empty stored hash must fail closed, not explode.
        return False
