"""Exact GPU-path suffix-interval regression with a strict NumPy tensor emulator.

Compares original NumPy two independent lower/upper searches with V21's
fused GPU two-lane search and periodic early exit. No actual CUDA hardware
is available in GitHub Linux CI, so real CUDA speed is NOT certified here.
"""
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
import numpy as np

HERE = Path(__file__).resolve().parents[1] / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0,str(HERE))
import text_gpu as tg

class T:
    def __init__(self,v):
        self.v=np.asarray(v)
    @property
    def shape(self): return self.v.shape
    def __len__(self): return len(self.v)
    def __getitem__(self,key):
        def unwrap(x):
            if isinstance(x,T): return x.v
            if isinstance(x,tuple): return tuple(unwrap(y) for y in x)
            return x
        return T(self.v[unwrap(key)])
    def __setitem__(self,k,value):
        def unwrap(x):
            if isinstance(x,T): return x.v
            if isinstance(x,tuple): return tuple(unwrap(y) for y in x)
            return x
        self.v[unwrap(k)]=unwrap(value)
    def clone(self):return T(self.v.copy())
    def clamp(self,lo,hi):return T(np.clip(self.v,lo,hi))
    def any(self):return bool(np.any(self.v))
    def __bool__(self):return bool(self.v)
    def op(self,other,fn):return T(fn(self.v,other.v if isinstance(other,T) else other))
    def __add__(self,b):return self.op(b,np.add)
    def __radd__(self,b):return self.op(b,np.add)
    def __sub__(self,b):return self.op(b,np.subtract)
    def __mul__(self,b):return self.op(b,np.multiply)
    def __floordiv__(self,b):return self.op(b,np.floor_divide)
    def __lt__(self,b):return self.op(b,np.less)
    def __le__(self,b):return self.op(b,np.less_equal)
    def __gt__(self,b):return self.op(b,np.greater)
    def __ge__(self,b):return self.op(b,np.greater_equal)
    def __eq__(self,b):return self.op(b,np.equal)
    def __ne__(self,b):return self.op(b,np.not_equal)
    def __and__(self,b):return self.op(b,np.bitwise_and)
    def __or__(self,b):return self.op(b,np.bitwise_or)
    def __invert__(self):return T(np.bitwise_not(self.v))

class FakeTorch:
    int64=np.int64
    int32=np.int32
    float32=np.float32
    uint8=np.uint8
    bool=np.bool_
    @staticmethod
    def zeros(shape,dtype,device=None):
        return T(np.zeros(shape,dtype=dtype))
    @staticmethod
    def zeros_like(t):
        return T(np.zeros_like(t.v))
    @staticmethod
    def stack(items,dim=0):
        return T(np.stack([v.v if isinstance(v,T) else v for v in items],axis=dim))
    @staticmethod
    def where(c,a,b):
        return T(np.where(c.v if isinstance(c,T) else c,
                          a.v if isinstance(a,T) else a,
                          b.v if isinstance(b,T) else b))

class TestCudaSuffixIntervals(unittest.TestCase):
    def compare(self, memory, contexts):
        x=tg.X("numpy")
        original=tg.Index(x,np.asarray(memory,dtype=np.int64))
        cx=np.asarray(contexts,dtype=np.int64)
        expected=original.align(x,cx,cx.shape[1])
        fast=object.__new__(tg.Index)
        fast.n=original.n
        fast.sa=T(original.sa)
        fast.R=T(original.R)
        simulated=tg.X("numpy")
        simulated.t=True
        simulated.dev="cuda:0"
        with patch.object(tg,"torch",FakeTorch,create=True):
            actual=fast.align(simulated,T(cx),cx.shape[1])
        np.testing.assert_array_equal(actual[0].v,expected[0],
            err_msg="Wrong exact lower interval for fused CUDA binary search")
        np.testing.assert_array_equal(actual[1].v,expected[1],
            err_msg="Wrong exact upper interval for fused CUDA binary search")

    def test_memory_with_unique_and_repeating_prefixes(self):
        for corpus in ["banana bandana banana bandana", "aaaaaaaaaaaaaaaa", "ababababacacababa", "Q: How?\nA: True\n\n"]:
            memory=[ord(ch) for ch in corpus]
            contexts=[]
            for length in range(1,17):
                start=length%len(memory)
                prefix=[memory[(start+j)%len(memory)] for j in range(length)]
                contexts.append((prefix+[-2]*16)[:16])
            self.compare(memory,contexts)

    def test_random_contexts_and_no_further_matches(self):
        rng=np.random.default_rng(20261107)
        for n in [8,30,129,256]:
            mem=rng.integers(33,49,size=n,dtype=np.int64)
            contexts=np.full((32,64),-2,dtype=np.int64)
            for j in range(32):
                length=int(rng.integers(1,65))
                if j%4==0:
                    contexts[j,:length]=ord("z")  # no observed match => short circuit
                else:
                    start=int(rng.integers(0,n))
                    contexts[j,:length]=[int(mem[(start+i)%n]) for i in range(length)]
            self.compare(mem,contexts)

    def test_empty_context_and_first_depth_dead(self):
        self.compare([65,66,67,65,66,68], np.full((6,64),-2,dtype=np.int64))

if __name__=="__main__":
    unittest.main(verbosity=2)
