"""V32 strict behavioral parity vs ORIGINAL V29 text_gpu.py blob.

No synthetic model: feed real repository document characters through the
original alignment, suffix and imagination code. Only CUDA scheduling,
memory accounting and progress callbacks may change. The baseline original
Git blob is fetched from repository history, never edited or interpolated.
"""
import base64
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import types

ROOT = Path(__file__).resolve().parents[2]
GPU = ROOT / "v17" / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0, str(GPU))
import text_gpu
import worlds_gpu

BASE_BLOB = "129d19f9e7d7ce25d6ef397e35fd02f175c99f45"
f = subprocess.run(
    ["git", "cat-file", "blob", BASE_BLOB],
    cwd=ROOT, check=True, capture_output=True, text=True,
)
baseline = types.ModuleType("v29_text_gpu_reference")
exec(compile(f.stdout, "V29_ORIGINAL_text_gpu.py", "exec"), baseline.__dict__)
assert isinstance(f.stdout, str) and "class TextCard:" in f.stdout

raw = (ROOT / "v17" / "docs" / "TORUS_AETHER_ABC_20261104.md").read_text("utf8")
# The actual training uses the original ASCII normalizer for code points.
ascii_values = [
    c if c in (9, 10) or 32 <= c < 127 else 63
    for c in (ord(s) for s in raw)
]
assert len(ascii_values) > 1000
prior = ascii_values[80:420]
observations = [ascii_values[450:710], ascii_values[720:930]]
assert observations and len(prior) > 250

def text_run(card_class, chunk=4096):
    card = card_class("numpy")
    start_progress = []
    card.append([prior], progress=lambda a, b, p: start_progress.append((a, b, p)))
    assert card.indexed == len(prior)
    results = []
    for doc in observations:
        progress = []
        result = card.live(
            [doc], [], g=8., formW=1.,
            variants=[(6., 1.), (8., 1.), (8., 2.)],
            chunk=chunk, progress=lambda a, b, p: progress.append((a, b, p)),
        )
        assert card.indexed == len(card.mem)
        assert result["seen"] == len(doc) - 1
        assert progress
        results.append(result)
    return card, results, start_progress

old, o, _ = text_run(baseline.TextCard, 4096)
new, n, onload = text_run(text_gpu.TextCard, 8192)
micro, c, _ = text_run(text_gpu.TextCard, 128)
# Preserve exact fields that define the science; GPU-specific perf metadata
# must never be mistaken for prediction accuracy.
for i in range(len(o)):
    for result in (n[i], c[i]):
        for key in ("trust", "hits", "seen", "variants", "memory"):
            if key == "trust":
                assert sorted(result[key]) == sorted(o[i][key]), (i, key)
            else:
                assert result[key] == o[i][key], (i, key)
assert old.mem.tolist() == new.mem.tolist() == micro.mem.tolist()
assert len(old.mem) == len(prior) + sum(map(len, observations))
assert len(onload) >= 3
assert onload[0][2] == "indexing-memory"
assert onload[-1][2] == "indexing-complete"

# The real native command channel is also exercised without a CUDA
# environment: text_load follows the original full-memory syntax.
server = worlds_gpu.Server()
initialized = server.handle({"id": 1, "cmd": "init", "device": "numpy", "vram": 0})
assert initialized["device"] == "numpy"
memory = server.handle({
    "id": 2, "cmd": "text_load",
    "b64": base64.b64encode(bytes(prior)).decode("ascii"),
})
assert memory["memory"] == len(prior), memory
assert memory["source"] == "ORIGINAL_TRAINED_MEMORY"
r = server.handle({
    "id": 3, "cmd": "text_learn", "exercises": [observations[0]],
    "trust": [], "g": 8., "formW": 1., "variants": [[6., 1.]],
    "chunk": 2048, "autotune": True,
})
assert r["seen"] == len(observations[0]) - 1
assert r["chunkUsed"] == 2048
assert r["nextChunk"] == 2048, "Autotune must never pretend CUDA on NumPy"
print("V32_ORIGINAL_TEXT_ALGORITHM_PARITY", json.dumps({
    "trainedFromActualRepositoryDocument": True,
    "originalBlob": BASE_BLOB,
    "originalCharacters": len(old.mem),
    "originalTextResultsEqual": len(o),
    "nativeTransportTextLearn": True,
    "predictionsAndTrustExactAcrossChunks": True,
    "originalIndexProgress": onload[-1][2],
    "fakeCudaMemoryAllocation": False,
}))
