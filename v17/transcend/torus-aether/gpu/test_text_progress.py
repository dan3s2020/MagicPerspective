"""Regression: genuine GPU text alignment emits progress after EVERY chunk.

Runs on CPU/NumPy with the exact TextCard implementation. CUDA uses the same
progress callback, but this is not a device-level throughput benchmark.
"""
import math
import unittest
from text_gpu import TextCard


class TextProgressTests(unittest.TestCase):
    def test_alignment_progress_is_per_chunk_and_monotonic(self):
        tc = TextCard("numpy", depth=1, form_depth=1, maxK=8, S=4)
        exercise = [ord(ch) for ch in ("the graph learns. " * 14)]
        chunk = 31
        events = []
        result = tc.live(
            [exercise], trust=[], variants=(), chunk=chunk,
            progress=lambda done, total, phase: events.append((done, total, phase))
        )
        done = [(d, t) for d, t, phase in events if phase == "alignment"]
        total = len(exercise) - 1
        self.assertEqual(len(done), math.ceil(total / chunk))
        self.assertEqual(done[-1], (total, total))
        self.assertTrue(all(done[i][0] < done[i + 1][0] for i in range(len(done) - 1)))
        self.assertTrue(all(t == total for _, t in done))
        self.assertEqual(result["seen"], total)
        self.assertIn((1, 1, "completed"), events)


if __name__ == "__main__":
    unittest.main()
