"""Exact CPU-oracle parity for CUDA-resident TextCard reductions.

This is deliberately not an ML-quality test.  It proves that moving the
existing integer trust reductions and imagination cursor to CUDA leaves the
original result, key order, counters, and persisted card memory unchanged.
"""
import importlib.util
import pathlib
import subprocess
import sys
import types
import unittest

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
GPU = ROOT / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0, str(GPU))
spec = importlib.util.spec_from_file_location("cuda_resident_text_gpu", GPU / "text_gpu.py")
current = importlib.util.module_from_spec(spec)
spec.loader.exec_module(current)


class ExactCudaResidency(unittest.TestCase):
    def test_numpy_oracle_equals_real_cuda_including_key_order(self):
        import torch
        if not torch.cuda.is_available():
            self.skipTest("real CUDA is required; no CPU substitute")
        rng = np.random.default_rng(20261107)
        history = rng.integers(32, 127, 700, dtype=np.int64)
        exercises = [rng.integers(32, 127, 513, dtype=np.int64),
                     rng.integers(32, 127, 377, dtype=np.int64)]
        trust = [["mem:0:0", 3, 7], ["form:1:2", 4, 11],
                 ["w|mem:0:0", 2, 6]]
        cards = [current.TextCard(d, max_memory=2048) for d in ("numpy", "cuda:0")]
        for card in cards:
            card.append([history])
        results = [card.live(exercises, trust, g=8., formW=1.,
                             variants=[(4., 1.), (8., .5)], chunk=128)
                   for card in cards]
        self.assertEqual(results[0], results[1])
        np.testing.assert_array_equal(cards[0].X.tonp(cards[0].mem),
                                      cards[1].X.tonp(cards[1].mem))

    def test_worktree_cuda_result_equals_prechange_git_oracle(self):
        import torch
        if not torch.cuda.is_available():
            self.skipTest("real CUDA is required; no CPU substitute")
        source = subprocess.run(
            ["git", "-C", str(ROOT.parent), "show",
             "HEAD:v17/transcend/torus-aether/gpu/text_gpu.py"],
            check=True, capture_output=True, text=True).stdout
        oracle = types.ModuleType("prechange_cuda_text_gpu")
        exec(compile(source, "PRECHANGE_TEXT_GPU.py", "exec"), oracle.__dict__)
        rng = np.random.default_rng(91)
        history = rng.integers(32, 127, 900, dtype=np.int64)
        exercise = rng.integers(32, 127, 1300, dtype=np.int64)
        trust = [["mem:0:0", 13, 31], ["form:0:1", 7, 22]]
        cards = [cls.TextCard("cuda:0", max_memory=4096)
                 for cls in (oracle, current)]
        results = []
        for card in cards:
            card.append([history])
            results.append(card.live([exercise], trust, g=8., formW=1.,
                                     variants=[(4., 1.), (8., .5)], chunk=128))
        self.assertEqual(results[0], results[1])


if __name__ == "__main__":
    unittest.main()
