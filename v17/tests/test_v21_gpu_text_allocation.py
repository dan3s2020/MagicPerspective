"""Regression proof for V21's CUDA scratch-allocation fast path.
Runs without a real NVIDIA card; fake torch records CUDA device placement.
A real device benchmark is required for speed claims."""
import inspect
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import numpy as np

GPU_DIR = Path(__file__).resolve().parents[1] / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0, str(GPU_DIR))
import text_gpu as tg


class TestNativeTextMemory(unittest.TestCase):
    def test_numpy_reference_unchanged(self):
        x = tg.X("numpy")
        self.assertFalse(x.t)
        for dtype in (np.int64, np.int32, np.float32, np.uint8, bool):
            self.assertEqual(x.zeros((3, 5), dtype).dtype, np.dtype(dtype))
            self.assertTrue(np.all(x.zeros((3, 5), dtype) == 0))
        self.assertEqual(x.zeros(0, np.int64).size, 0)

    def test_cuda_zero_allocations_go_direct_to_torch_not_numpy(self):
        calls = []
        type_names = {
            np.int64: "int64", np.int32: "int32", np.float32: "float32",
            np.uint8: "uint8", bool: "bool"
        }

        def fake_zeros(shape, dtype=None, device=None):
            calls.append((shape, dtype, device))
            return np.full(shape, 0, dtype={v: k for k, v in type_names.items()}[dtype])

        fake = SimpleNamespace(zeros=fake_zeros, **{name: name for name in type_names.values()})
        old_torch, old_flag = getattr(tg, "torch", None), tg.HAVE_TORCH
        try:
            tg.torch, tg.HAVE_TORCH = fake, True
            cuda = tg.X("cuda:0")
            # The old implementation of X.zeros would call np.zeros
            # and copy host -> device for EVERY scratch tensor.
            with patch.object(tg.np, "zeros", side_effect=AssertionError("No CPU staging for CUDA zeros")):
                for dtype in type_names:
                    result = cuda.zeros((2, 7), dtype)
                    self.assertEqual(result.shape, (2, 7))
                    self.assertTrue(np.all(result == 0))
                self.assertEqual(cuda.zeros(0).size, 0)
            self.assertEqual(len(calls), 6)
            self.assertTrue(all(device == "cuda:0" for _, _, device in calls))
            self.assertEqual([row[1] for row in calls[:5]], list(type_names.values()))
        finally:
            tg.HAVE_TORCH = old_flag
            if old_torch is not None:
                tg.torch = old_torch
            elif hasattr(tg, "torch"):
                delattr(tg, "torch")

    def test_suffix_index_reference_on_numpy_kept_identical(self):
        x = tg.X("numpy")
        history = np.array([ord(c) for c in "banana bandana banana"], dtype=np.int64)
        idx = tg.Index(x, history)
        self.assertEqual(idx.n, len(history))
        self.assertEqual(sorted(idx.sa.tolist()), list(range(len(history))))
        self.assertEqual(idx.nxt.shape, (len(history),))
        query = np.array([[ord("a"), ord("n"), -2, -2]], dtype=np.int64)
        lo, hi = idx.align(x, query, 4)
        self.assertEqual(lo.shape, (1, 4))
        self.assertEqual(hi.shape, (1, 4))
        self.assertTrue(np.all(hi >= lo))

    def test_gpu_context_scan_no_longer_forces_host_sync_per_depth(self):
        # Structural proof only: actual GPU speed must be measured on CUDA.
        source = inspect.getsource(tg.Index.align)
        self.assertIn("if not X.t and not bool(alive.any()): break", source)
        self.assertIn("if not X.t and not bool(go.any()): break", source)
        self.assertNotIn("if not bool(alive.any()): break", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
