"""The torch vectorized search must retain the original NumPy alignment intervals."""
import unittest
import numpy as np
try:
    import torch
except ImportError:
    torch = None
from text_gpu import X, Index

@unittest.skipIf(torch is None, "PyTorch unavailable")
class TextIndexSearchTests(unittest.TestCase):
    def test_torch_search_matches_numpy_without_host_sync_in_inner_loop(self):
        memory=np.asarray([4,7,3,4,7,2,4,7,3,9,4,7,2,4,7,3,4,2,1,3,4,7,3,8],dtype=np.int64)
        contexts=np.asarray([[4,7,3,4,7,-2,-2,-2],
                             [7,4,7,3,-2,-2,-2,-2],
                             [4,2,1,3,4,7,3,8],
                             [9,9,9,9,9,9,9,9],
                             [-2,-2,-2,-2,-2,-2,-2,-2]],dtype=np.int64)
        np_x=X("numpy")
        torch_x=X("cpu")
        self.assertTrue(torch_x.t, "test must exercise the PyTorch branch")
        a=Index(np_x, np_x.arr(memory))
        b=Index(torch_x, torch_x.arr(memory))
        alo,ahi=a.align(np_x,np_x.arr(contexts),8)
        blo,bhi=b.align(torch_x,torch_x.arr(contexts),8)
        np.testing.assert_array_equal(np_x.tonp(alo),torch_x.tonp(blo))
        np.testing.assert_array_equal(np_x.tonp(ahi),torch_x.tonp(bhi))

if __name__ == "__main__":
    unittest.main()
