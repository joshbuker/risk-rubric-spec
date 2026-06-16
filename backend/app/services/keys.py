import secrets
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def generate_api_key(org_slug: str) -> str:
    """Generate a new plaintext API key. org_slug is a short identifier, e.g. 'ptg'."""
    random_part = secrets.token_urlsafe(32)
    return f"sk_{org_slug}_{random_part}"


def hash_key(plaintext_key: str) -> str:
    """Argon2-hash a plaintext API key for storage."""
    return _pwd_context.hash(plaintext_key)


def verify_key(plaintext_key: str, hashed_key: str) -> bool:
    """Verify a plaintext key against its stored argon2 hash."""
    return _pwd_context.verify(plaintext_key, hashed_key)
