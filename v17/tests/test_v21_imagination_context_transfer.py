"""Regression: eliminate redundant CUDA->CPU->CUDA rolling-context copy
in the original V17 imagination branch without changing state or predictions.
"""
import inspect
import unittest
import numpy as np
from pathlib import Path
import sys
P=Path(__file__).resolve().parents[1]/"transcend"/"torus-aether"/"gpu"
sys.path.insert(0,str(P))
import text_gpu as tg

class TestImaginationTransfer(unittest.TestCase):
    def test_numpy_original_rolling_context_and_tensor_equivalent_for_48_steps(self):
        random=np.random.default_rng(20261107)
        q=128
        ctx=random.integers(0,128,size=(q,64),dtype=np.int64)
        old=ctx.copy();new=ctx.copy()
        for _ in range(48):
            guesses=random.integers(0,128,size=q,dtype=np.int64)
            old=np.concatenate([guesses[:,None],old[:,:-1]],axis=1)
            new=np.concatenate((guesses[:,None],new[:,:-1]),axis=1)
            np.testing.assert_array_equal(old,new)
        self.assertEqual(old.dtype,np.int64)

    def test_torch_cpu_and_numpy_equivalent_when_torch_installed(self):
        if not tg.HAVE_TORCH:
            self.skipTest("Torch unavailable on this runner (no CUDA speed claim)")
        import torch
        random=np.random.default_rng(74129)
        context=random.integers(0,128,size=(34,64),dtype=np.int64)
        oracle=context.copy()
        on_device=torch.as_tensor(context.copy())
        for step in range(48):
            predictions=random.integers(0,128,size=34,dtype=np.int64)
            oracle=np.concatenate([predictions[:,None],oracle[:,:-1]],axis=1)
            tensor=torch.as_tensor(predictions.copy())
            on_device=torch.cat((tensor[:,None],on_device[:,:-1]),dim=1)
            np.testing.assert_array_equal(on_device.cpu().numpy(),oracle)

    def test_real_imagination_branch_keeps_context_on_gpu(self):
        source=inspect.getsource(tg.TextCard._imagine)
        self.assertIn("torch.cat((guess_on_device[:, None], CX[:, :-1]), dim=1)",source)
        self.assertNotIn("X.tonp(CX)",source)
        self.assertIn("guess = X.tonp(guess_on_device)",source)
        self.assertIn("ok = ok & ~((guess != real) & (step >= 2))",source)
        self.assertIn("np.concatenate([guess[:, None], CX[:, :-1]], axis=1)",source)

if __name__=="__main__":unittest.main(verbosity=2)
