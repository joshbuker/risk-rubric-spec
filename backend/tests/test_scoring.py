import pytest
from app.services.scoring import (
    compute_composite,
    validate_composite_tolerance,
    get_grade,
    PILLAR_WEIGHTS,
)


def test_pillar_weights_sum_to_one():
    assert abs(sum(PILLAR_WEIGHTS.values()) - 1.0) < 1e-9


def test_compute_composite_all_same():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    assert abs(compute_composite(scores) - 800.0) < 0.01


def test_compute_composite_security_weighted_higher():
    scores = {p: 0.0 for p in PILLAR_WEIGHTS}
    scores["security"] = 1000.0
    result = compute_composite(scores)
    assert abs(result - 200.0) < 0.01  # 1000 * 0.20


def test_validate_composite_within_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    submitted = compute_composite(scores)
    assert validate_composite_tolerance(scores, submitted) is True


def test_validate_composite_just_within_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    computed = compute_composite(scores)
    just_within = computed * 1.049
    assert validate_composite_tolerance(scores, just_within) is True


def test_validate_composite_over_tolerance():
    scores = {p: 800.0 for p in PILLAR_WEIGHTS}
    computed = compute_composite(scores)
    over = computed * 1.06  # 6% over
    assert validate_composite_tolerance(scores, over) is False


def test_get_grade_boundaries():
    assert get_grade(1000) == "A"
    assert get_grade(900) == "A"
    assert get_grade(899) == "B"
    assert get_grade(800) == "B"
    assert get_grade(799) == "C"
    assert get_grade(700) == "C"
    assert get_grade(699) == "D"
    assert get_grade(600) == "D"
    assert get_grade(599) == "F"
    assert get_grade(0) == "F"
