"""Fail-closed proof for removing the quadratic full-prefix reversal in V21.

Both the original CUDA alignment and imagination must select precisely the
same past symbols in the same order for any input. Uses realistic 200k-symbol
exercises, but makes no claim about NVidia throughput.
"""
import random
import time
import inspect
import unittest
from pathlib import Path
import sys

PATH=Path(__file__).resolve().parents[1]/"transcend"/"torus-aether"/"gpu"
sys.path.insert(0,str(PATH))
import text_gpu as tg

def original_context(exercise, position, max_context):
    length=min(position,max_context)
    return exercise[position-1::-1][:length] if position>0 else []

def optimized_context(exercise,position,max_context):
    length=min(position,max_context)
    return exercise[position-length:position][::-1] if length else []

class TextCudaContextWindowTests(unittest.TestCase):
    def test_original_and_bounded_window_are_identical_for_every_position_in_small_text(self):
        rng=random.Random(20261107)
        for n in (0,1,2,3,5,63,64,65,127,4097):
            exercise=[rng.randrange(9,128) for _ in range(n)]
            for k in (1,4,6,16,48,64,128):
                for i in range(n+1):
                    self.assertEqual(optimized_context(exercise,i,k),
                                     original_context(exercise,i,k),
                                     (n,i,k))
    def test_long_realistic_exercises_exact_and_prior_data_unchanged(self):
        rng=random.Random(743)
        for n in (50000,120000,229187):
            exercise=[rng.randrange(32,127) for _ in range(n)]
            snapshot=(exercise[:16],exercise[-16:])
            sites=[0,1,2,63,64,65,4095,4096,20000,n//2,n-2,n-1,n]
            sites += [rng.randrange(n+1) for _ in range(300)]
            for i in sites:
                self.assertEqual(optimized_context(exercise,i,64),
                                 original_context(exercise,i,64))
            self.assertEqual(snapshot,(exercise[:16],exercise[-16:]))
    def test_both_real_cuda_code_paths_use_bounded_reversal(self):
        alignment=inspect.getsource(tg.TextCard.live)
        imagination=inspect.getsource(tg.TextCard._imagine)
        self.assertIn("ctx[q, :L] = e[i - L:i][::-1]",alignment)
        self.assertIn("ctx[r, :L] = e[i - L:i][::-1]",imagination)
        self.assertNotIn("e[i - 1::-1]",alignment)
        self.assertNotIn("e[i - 1::-1]",imagination)
    def test_full_exercise_self_index_reports_real_progress_before_first_cuda_chunk(self):
        # No change in suffix-automaton result, only honest observed
        # build progress for texts too long for the initial 4,096 chunk.
        data=[ord(c) for c in "ABCCABABABA Q: Why? A: Yes. " * 800]
        original=tg.TextCard("numpy")
        indexed=original._selfidx([data],0)
        observed=[]
        instrumented=tg.TextCard("numpy")
        got=instrumented._selfidx([data],0,progress=lambda done,total,phase:
                                   observed.append((phase,done,total)))
        self.assertEqual(got,indexed)
        self.assertGreaterEqual(len(observed),4)
        self.assertEqual(observed[-1],("self-index",2*len(data),2*len(data)))
        self.assertTrue(all(x[0]=="self-index" and 0<x[1]<=x[2]
                            for x in observed))
        self.assertTrue(all(a[1]<=b[1] for a,b in zip(observed,observed[1:])))
        self.assertEqual(instrumented._selfidx([data],0,progress=lambda *a:
                              self.fail("Already-indexed text should not rescan")),
                         indexed)

    def test_bounded_slice_benchmark_without_changing_math(self):
        # Old CPU O(prefix length) for every context; new O(maxK=64).
        # Do not compare CPU speed with GPU throughput; record this microbenchmark.
        rng=random.Random(61)
        exercise=[rng.randrange(32,127) for _ in range(170000)]
        positions=list(range(150000,170000,97))
        t0=time.perf_counter()
        old=[original_context(exercise,i,64) for i in positions]
        t1=time.perf_counter()
        new=[optimized_context(exercise,i,64) for i in positions]
        t2=time.perf_counter()
        self.assertEqual(old,new)
        old_ms=(t1-t0)*1000
        new_ms=(t2-t1)*1000
        print("V21_EXACT_CONTEXT_WINDOW_CPU_BENCHMARK",{
            "characters":len(exercise),"sampled_positions":len(positions),
            "old_full_prefix_copy_ms":round(old_ms,3),
            "new_bounded_64_copy_ms":round(new_ms,3),
            "observed_ratio":round(old_ms/max(new_ms,0.000001),2),
            "prediction_context_parity":True
        },flush=True)
        self.assertGreater(old_ms,new_ms,
                           "Bounded fixed-width reversal should avoid long copies")

if __name__=="__main__":
    unittest.main(verbosity=2)
