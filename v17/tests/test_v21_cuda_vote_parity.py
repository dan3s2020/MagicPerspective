"""Test V21 CUDA scatter voting on simulated Torch semantics and exact
original CPU/NumPy vote equations. GPU hardware is not available in CI;
actual NVidia parity and speed must still be verified by the user."""
from pathlib import Path
from unittest.mock import patch
import unittest
import numpy as np
import sys

GPU_DIR = Path(__file__).resolve().parents[1] / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0,str(GPU_DIR))
import text_gpu as tg

class T:
    def __init__(self, values): self.v=np.asarray(values)
    @property
    def shape(self): return self.v.shape
    def clamp(self,lo,hi): return T(np.clip(self.v,lo,hi))
    def clamp_min(self,lo): return T(np.maximum(self.v,lo))
    def to(self,dtype): return T(self.v.astype(dtype))
    def sum(self,dim): return T(self.v.sum(axis=dim))
    def unsqueeze(self,dim): return T(np.expand_dims(self.v,axis=dim))
    def scatter_add_(self,dim,index,amounts):
        assert dim==1
        for i in range(self.v.shape[0]):
            for j in range(index.v.shape[1]):
                self.v[i,int(index.v[i,j])] += amounts.v[i,j]
        return self
    def __eq__(self, other): return T(self.v==(other.v if isinstance(other,T) else other))
    def __ge__(self, other): return T(self.v>=(other.v if isinstance(other,T) else other))
    def __truediv__(self,other):return T(self.v/(other.v if isinstance(other,T) else other))
    def __mul__(self,other):return T(self.v*(other.v if isinstance(other,T) else other))
    def argmax(self,dim): return T(self.v.argmax(axis=dim))

class FakeTorch:
    float32=np.float32
    @staticmethod
    def zeros_like(tensor,dtype=None):return T(np.zeros(tensor.shape,dtype=dtype if dtype is not None else tensor.v.dtype))
    @staticmethod
    def where(cond,a,b):return T(np.where(cond.v,a.v if isinstance(a,T) else a,b.v if isinstance(b,T) else b))

def legacy_vote(ys,weights,form_source):
    q,s=ys.shape
    hist=np.zeros((q,129),dtype=np.float32)
    dmass=np.zeros(q,dtype=np.float32)
    valid=ys>=0
    cnt=valid.astype(np.float32).sum(axis=1)
    cnt=np.where(cnt>0,cnt,cnt+1)
    for j in range(s):
        yj=np.clip(ys[:,j],0,128)
        amt=np.where(valid[:,j],weights/cnt,0).astype(np.float32)
        if form_source:
            digit=yj==48
            dmass += np.where(digit,amt,0).astype(np.float32)
            amt=np.where(digit,0,amt)
        hist[np.arange(q),yj] += amt
    return hist,dmass

class VoteParity(unittest.TestCase):
    def test_cuda_scatter_matches_per_symbol_exact_cpu_reference(self):
        rng=np.random.default_rng(74129)
        for rows,cols in [(1,1),(2,64),(14,64),(5,17)]:
            ys=rng.integers(-1,128,size=(rows,cols),dtype=np.int64)
            ys[0,0]=48
            weights=rng.random(rows).astype(np.float32)
            for form in (False,True):
                expected,mass=legacy_vote(ys,weights,form)
                X=tg.X("numpy");X.t=True
                acc=T(np.zeros((rows,129),dtype=np.float32))
                with patch.object(tg,"torch",FakeTorch,create=True):
                    got=X.cuda_add_votes(acc,T(ys),T(ys>=0),T(weights),form)
                np.testing.assert_allclose(acc.v,expected,atol=3e-6,rtol=3e-6)
                np.testing.assert_allclose(got.v,mass,atol=3e-6,rtol=3e-6)

    def test_live_alignment_reports_each_real_completed_chunk(self):
        card=tg.TextCard("numpy")
        # The expensive exact index/imagining are independently covered by
        # native training tests. Isolate the LIVE progress boundary here.
        card._proposals=lambda *args: []
        card._selfidx=lambda *args: {}
        card._imagine=lambda *args,**kwargs: ({},{})
        card.append=lambda *args: None
        records=[]
        samples=[list((b"Q: step?\\nA: answer to step. ")*6)]
        result=card.live(samples,trust=[],chunk=32,progress=lambda d,t,p:records.append((p,d,t)))
        real=[x for x in records if x[0]=="alignment"]
        self.assertGreater(len(real),3)
        self.assertEqual(real[0][1],32)
        self.assertLess(real[0][1],real[0][2])
        self.assertEqual(real[-1][1],result["seen"])
        self.assertTrue(all(a[1]<b[1] for a,b in zip(real,real[1:])))
        self.assertIn(("completed",1,1),records)

if __name__=="__main__":unittest.main(verbosity=2)
