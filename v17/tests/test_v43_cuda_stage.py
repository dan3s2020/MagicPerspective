"""V43 GPU-resident text staging parity against unchanged TextCard baseline.

CPU/NumPy CI validates exact result and transactional stage ownership. CUDA
is separately benchmarked on the user's actual RTX; never invent utilization.
"""
import pathlib
import sys
import unittest
import numpy as np

GPU = pathlib.Path(__file__).resolve().parents[1] / "transcend/torus-aether/gpu"
sys.path.insert(0, str(GPU))
from text_gpu import TextCard

class V43StageTests(unittest.TestCase):
    def rows(self):
        return [
            np.asarray([81,58,32,65,10,65,58,32,66,10,10], dtype=np.int64),
            np.asarray([81,58,32,66,10,65,58,32,65,10,10], dtype=np.int64)
        ]
    def test_staged_equals_original_exact(self):
        original=TextCard("numpy",max_memory=256)
        resident=TextCard("numpy",max_memory=256)
        rows=self.rows()
        prepared=resident.stage_v43("original-dataset-row-1",rows)
        self.assertEqual(prepared["stagedRows"],2)
        self.assertEqual(prepared["residentBatches"],1)
        a=original.live(rows,[],chunk=32)
        b=resident.live(rows,[],chunk=32,stage_id="original-dataset-row-1")
        self.assertEqual(a,b,"GPU placement may not change the native learning algorithm")
        self.assertEqual(len(resident._v43_staged),0)
        self.assertTrue(np.array_equal(original.mem,resident.mem))
    def test_hard_cap_no_wrong_text(self):
        card=TextCard("numpy",max_memory=256)
        rows=self.rows()
        for i in range(3):
            card.stage_v43("row-"+str(i),rows)
        with self.assertRaises(RuntimeError):
            card.stage_v43("row-4",rows)
        with self.assertRaises(RuntimeError):
            card.live([np.asarray([1,2,3],dtype=np.int64)],[],stage_id="row-0")
        self.assertNotIn("row-0",card._v43_staged)
        self.assertEqual(card.unstage_v43("row-1")["removed"],True)
        self.assertEqual(card.unstage_v43("row-1")["removed"],False)

if __name__=="__main__":
    unittest.main()
