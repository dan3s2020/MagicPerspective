"""Tests the ACTUAL TextCard prediction math, not a mocked UI animation.
    NumPy backend permits GitHub Actions to verify the same prediction routine
    that CUDA executes on user hardware; no GPU-availability claim is made here.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "transcend" / "torus-aether" / "gpu"))
from text_gpu import TextCard


def run(chunk):
    previous = list(b"Q: what is two plus two?\nA: four.\n\nQ: Is the sky blue?\nA: usually.\n\n")
    current = list(b"Q: What happens to light?\nA: Light travels in waves and particles.\n\n")
    card = TextCard("numpy", max_memory=1024)
    card.append([previous])
    updates = []

    def observe(done, total, phase, sample=None):
        if sample is not None:
            assert phase == "alignment"
            assert len(sample["actual"]) == len(sample["predicted"])
            assert sample["sampled"] == len(sample["actual"])
            assert 1 <= sample["sampled"] <= sample["computed"]
            updates.append((done, total, sample))

    result = card.live([current], [], chunk=chunk, progress=observe)
    assert updates, "No true training predictions were emitted"
    assert result["seen"] == len(current) - 1
    assert result["totalCardChars"] == len(previous) + len(current)
    observed = []
    for done, total, sample in updates:
        assert total == len(current) - 1
        assert done <= total
        for pos, actual, guessed in zip(sample["position"], sample["actual"], sample["predicted"]):
            assert actual == current[pos], "Predictions must match real training bytes"
            assert isinstance(guessed, int) and 0 <= guessed < 128
            observed.append((pos, actual, guessed))
    if chunk == 32:
        assert [p for p, _, _ in observed] == list(range(1, len(current)))
        assert sum(a == g for _, a, g in observed) == result["hits"], (result, observed)
        print("ACTUAL_TEXTCARD_PREDICTIONS_MATCH_TRAINING_HITS",
              {"computed": result["seen"], "observed": len(observed), "matches": result["hits"], "chunks": len(updates)})
    return result


if __name__ == "__main__":
    a, b = run(32), run(64)
    assert a["hits"] == b["hits"], "Larger chunks must not change actual guesses"
    assert a["trust"] == b["trust"], "Larger chunks must preserve every learned trust update"
    assert a["variants"] == b["variants"], "Meta-learning cannot change with chunk size"
    print("ACTUAL_TEXTCARD_CHUNK_EQUIVALENCE", {"32": a["hits"], "64": b["hits"], "correct": True})
