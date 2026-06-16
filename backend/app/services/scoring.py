PILLAR_WEIGHTS: dict[str, float] = {
    "transparency": 0.16,
    "reliability": 0.16,
    "security": 0.20,
    "privacy": 0.16,
    "safety_societal": 0.16,
    "excessive_agency": 0.16,
}

PILLAR_KEYS = list(PILLAR_WEIGHTS.keys())


def compute_composite(pillar_scores: dict[str, float]) -> float:
    return sum(pillar_scores[p] * w for p, w in PILLAR_WEIGHTS.items())


def validate_composite_tolerance(pillar_scores: dict[str, float], submitted: float) -> bool:
    computed = compute_composite(pillar_scores)
    if computed == 0:
        return submitted == 0
    return abs(computed - submitted) / computed <= 0.05


def get_grade(score: float) -> str:
    if score >= 900:
        return "A"
    if score >= 800:
        return "B"
    if score >= 700:
        return "C"
    if score >= 600:
        return "D"
    return "F"


def aggregate_pillar_scores(scores: list[dict[str, float]]) -> dict[str, float]:
    """Arithmetic mean per pillar across a list of scanner score dicts."""
    if not scores:
        return {}
    return {p: sum(s[p] for s in scores) / len(scores) for p in PILLAR_KEYS}
