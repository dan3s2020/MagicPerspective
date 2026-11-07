"""Exact regression and time instrumentation for the CUDA prefix search.
Reference = the unchanged old Index.align implementation (including empty
range semantics, c==-2 sentinel, full 64-symbol suffix search).
No synthetic model outcomes, no guessed performance.
"""
import importlib.util
import pathlib
import time
import unittest
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
GPU=ROOT/"transcend"/"torus-aether"/"gpu"/"text_gpu.py"
spec=importlib.util.spec_from_file_location("v17_text_gpu",GPU)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
X=mod.X
Index=mod.Index

def old_align(idx, X_,ctx,maxK):
    Q=ctx.shape[0];n=idx.n
    lo=X_.zeros(Q,np.int64);hi=X_.zeros(Q,np.int64)+n
    LO=X_.zeros((Q,maxK),np.int64)
    HI=X_.zeros((Q,maxK),np.int64)
    R=idx.R;sa=idx.sa
    steps=max(1,int(np.ceil(np.log2(n+1)))+1)
    for k in range(maxK):
        c=ctx[:,k];alive=(hi>lo)&(c>=0)
        if not bool(alive.any()):break
        def bound(strict):
            a=lo.clone() if X_.t else lo.copy()
            b=hi.clone() if X_.t else hi.copy()
            for _ in range(steps):
                go=a<b
                if not bool(go.any()):break
                m=(a+b)//2;p=sa[X_.clip(m,0,n-1)]+k
                v=X_.where(p<n,R[X_.clip(p,0,n-1)],
                           X_.zeros(Q,np.int64)-1)
                less=(v<=c) if strict else (v<c)
                a=X_.where(go&less,m+1,a)
                b=X_.where(go&~less,m,b)
            return a
        nlo=bound(False);nhi=bound(True)
        ok=alive&(nhi>nlo)
        lo=X_.where(ok,nlo,lo)
        hi=X_.where(ok,nhi,lo)
        LO[:,k]=lo;HI[:,k]=X_.where(ok,hi,lo)
    return LO,HI

def actual_corpus(length=24000):
    p=ROOT/"docs"/"TORUS_AETHER_ABC_20261104.md"
    data=p.read_bytes()
    return np.asarray([int(b) if b<128 else 63
                       for b in (data*(length//max(len(data),1)+1))[:length]],
                      dtype=np.int64)

def scenarios(mem,seed=17,Q=192,K=64):
    rng=np.random.default_rng(seed)
    queries=np.full((Q,K),-2,dtype=np.int64)
    # Reuse genuine seen contexts, including long 8+ and 32+ matches.
    for i in range(Q):
        if i%8==0:
            r=rng.integers(0,len(mem)-K-1)
            queries[i,:K]=mem[r:r+K]
        elif i%8==1:
            r=rng.integers(0,len(mem)-K-1)
            queries[i,:12]=mem[r:r+12]
        elif i%8==2:
            queries[i,:K]=rng.integers(30,126,size=K)
        else:
            r=rng.integers(0,len(mem)-K-1)
            length=int(rng.integers(1,K+1))
            queries[i,:length]=mem[r:r+length]
    return queries

class TestExactFastPrefix(unittest.TestCase):
    def test_base129_key_never_overflows_signed64(self):
        self.assertLess(129**8,2**63)
        self.assertGreater(129**9,2**63)

    def test_key_arrays_remain_sorted_in_native_suffix_order(self):
        X_=X("numpy")
        for n in [2,9,128,4096]:
            seq=actual_corpus(n)
            idx=Index(X_,X_.arr(seq))
            self.assertEqual(len(idx.fast_prefix),min(8,n))
            for k,keys in enumerate(idx.fast_prefix):
                self.assertTrue(np.all(keys[1:]>=keys[:-1]),
                    f"depth {k+1} not lexicographically sorted")

    def test_exact_all_prefix_intervals_on_real_text_including_large_repeat_and_padded(self):
        X_=X("numpy")
        for n in [80,1000,5000]:
            seq=actual_corpus(n)
            idx=Index(X_,X_.arr(seq))
            for seed in [17,23]:
                ctx=scenarios(seq,seed=seed,Q=96,K=64)
                actual=idx.align(X_,X_.arr(ctx),64)
                original=old_align(idx,X_,X_.arr(ctx),64)
                for i in range(2):
                    np.testing.assert_array_equal(actual[i],original[i],err_msg=
                      f"n {n}, seed {seed}, interval {i}")

    def test_next_symbol_samples_and_proposals_are_unchanged(self):
        X_=X("numpy");seq=actual_corpus(2000)
        idx=Index(X_,X_.arr(seq))
        ctx=scenarios(seq,seed=42,Q=64,K=64)
        lo,hi=idx.align(X_,X_.arr(ctx),64)
        lo0,hi0=old_align(idx,X_,X_.arr(ctx),64)
        K1=(hi>lo).sum(1);K0=(hi0>lo0).sum(1)
        np.testing.assert_array_equal(K1,K0)
        for d in range(6):
            pos=np.arange(len(ctx));depth=np.maximum(K1-1-d,0)
            nexts=idx.sample_next(X_,lo[pos,depth],hi[pos,depth],32)
            reference=idx.sample_next(X_,lo0[pos,depth],hi0[pos,depth],32)
            np.testing.assert_array_equal(nexts,reference)

    def test_real_corpus_backend_seconds_per_mb_measured_no_claimed_cuda(self):
        X_=X("numpy");seq=actual_corpus(8000)
        idx=Index(X_,X_.arr(seq));ctx=scenarios(seq,seed=11,Q=256,K=64)
        start=time.perf_counter()
        old=old_align(idx,X_,ctx,64)
        old_secs=time.perf_counter()-start
        start=time.perf_counter()
        new=idx.align(X_,ctx,64)
        fast_secs=time.perf_counter()-start
        for a,b in zip(old,new):np.testing.assert_array_equal(a,b)
        print("MEASURED_EXACT_PREFIX_ALIGNMENT",{
          "backend":"numpy CPU, NOT user GPU",
          "corpusSource":"real V17 docs text",
          "suffixMemoryBytes":len(seq),
          "queries":len(ctx),"maxK":64,
          "oldSeconds":round(old_secs,4),
          "fastSeconds":round(fast_secs,4),
          "speedupFactor":round(old_secs/max(fast_secs,1e-9),3),
          "semanticsIdentical":True},flush=True)

if __name__=="__main__":unittest.main()
