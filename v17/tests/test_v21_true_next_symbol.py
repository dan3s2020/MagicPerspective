"""Stop a critical CUDA target regression: future characters must be the real
world's next character, never zero-filled NumPy scratch storage. This test
executes the original TextCard live path, not a regex-only source check.
"""
from pathlib import Path
import sys
import unittest
import numpy as np

HERE=Path(__file__).resolve().parents[1]/"transcend"/"torus-aether"/"gpu"
sys.path.insert(0,str(HERE))
from text_gpu import TextCard

class NextTokenNotZero(unittest.TestCase):
    def card(self):
        card=TextCard("numpy")
        card._selfidx=lambda exs,o,progress=None: {}
        card._imagine=lambda *args,**kwargs: ({},{})
        card.append=lambda exs: None
        return card

    def test_real_target_y_not_zero_even_though_scratch_buffer_initialized_zero(self):
        card=self.card()
        # With no proposals, the argmax of all zero scores is token 0.
        # Any correct dataset symbol here is != 0, so hits MUST equal 0.
        card._proposals=lambda ctx,form: []
        exs=[[65]+[66]*72,[81,58,32,66,66,66,10,65,58,32,66,10]]
        result=card.live(exs,trust=[],chunk=17,variants=[])
        expected=sum(len(x)-1 for x in exs)
        self.assertEqual(result["seen"],expected)
        self.assertEqual(result["hits"],0,
            "Critical regression: CUDA-target scratch zeros incorrectly scored as true next characters")

    def test_actual_correct_symbol_produces_hits_and_original_trust_observations(self):
        card=self.card()
        observed=[]
        def proposals(ctx,form):
            observed.extend(int(row[0]) for row in ctx)
            count=len(ctx)
            return [(0,0,np.ones(count,dtype=bool),
                     np.ones(count,dtype=np.int64),
                     np.full((count,1),66,dtype=np.int64))]
        card._proposals=proposals
        exs=[[65]+[66]*33]
        result=card.live(exs,trust=[],chunk=7,variants=[])
        self.assertEqual(result["seen"],33)
        self.assertEqual(result["hits"],33,
            "Original observed next-symbol learning must predict actual ASCII 'B', not zero")
        self.assertEqual(len(observed),33)
        self.assertEqual(observed[0],65)
        self.assertEqual(observed[1],66)
        self.assertTrue(result["trust"])
        self.assertEqual(sum(rec[1] for rec in result["trust"]),33)
        self.assertEqual(sum(rec[2] for rec in result["trust"]),33)

if __name__=="__main__": unittest.main(verbosity=2)
