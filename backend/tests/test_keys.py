from app.services.keys import generate_api_key, hash_key, verify_key


def test_generate_api_key_format():
    key = generate_api_key("ptg")
    assert key.startswith("sk_ptg_")
    assert len(key) > 20


def test_generate_api_key_unique():
    keys = {generate_api_key("ptg") for _ in range(100)}
    assert len(keys) == 100


def test_hash_key_is_not_plaintext():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert key not in hashed
    assert hashed.startswith("$argon2")


def test_verify_key_correct():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert verify_key(key, hashed) is True


def test_verify_key_wrong():
    key = generate_api_key("ptg")
    hashed = hash_key(key)
    assert verify_key("wrong_key", hashed) is False


def test_key_prefix():
    key = generate_api_key("ptg")
    assert key[:7] == "sk_ptg_"
