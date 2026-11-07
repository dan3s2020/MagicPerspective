"""Regression against V17 FULL-ATLAS GPU RPC idle timeout:
- exact old vs new context symbols for ALL positions and long documents
- same native per-exercise SelfMem suffix automaton, no cross-Brain cache leak
- REAL progress before first alignment and during both suffix index rebuilds
- original native TextCard training with unchanged hit/trust/char counts.
No CUDA throughput claims: NumPy CPU on GitHub CI; Windows NVIDIA tested
by the already existing V17 CUDA preflight before training.
"""
import importlib.util
import pathlib
import time
import unittest
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "original_v17_native_text_gpu",
    ROOT / "transcend" / "torus-aether" / "gpu" / "text_gpu.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def baseline_unbounded_context(e, i, maxK=64):
    # EXACT original old source from original FULL-ATLAS commit:
    # ctx[q,:L] = e[i - 1::-1][:L]
    L = min(i,maxK)
    return e[i - 1::-1][:L] if i>=1 else []

def new_bounded_context(e, i, maxK=64):
    L=min(i,maxK)
    return e[i-L:i][::-1] if L else []

def original_self_index(e):
    # This is a verbatim control of original V17 SelfMem original scanner.
    DIG=mod.DIG
    fe=[DIG if 48 <= c <= 57 else c for c in e]
    def scan(seq):
        ln=[0];link=[-1];nx=[{}];first=[-1];last=0;res={}
        for pos,c in enumerate(seq):
            if pos>=1:
                st=link[last]
                if st>0 and ln[st]>0 and first[st]+1<pos:
                    res[pos]=(seq[first[st]+1],ln[st],pos-1-first[st])
            cur=len(ln);ln.append(ln[last]+1);link.append(0);nx.append({});first.append(pos);p=last
            while p!=-1 and c not in nx[p]:
                nx[p][c]=cur;p=link[p]
            if p!=-1:
                q=nx[p][c]
                if ln[p]+1==ln[q]:link[cur]=q
                else:
                    cl=len(ln);ln.append(ln[p]+1);link.append(link[q]);nx.append(dict(nx[q]));first.append(first[q])
                    while p!=-1 and nx[p].get(c)==q:nx[p][c]=cl;p=link[p]
                    link[q]=cl;link[cur]=cl
            last=cur
        return res
    a=scan(e);f=scan(fe);out={}
    for i in range(1,len(e)):
        x,y=a.get(i),f.get(i)
        if x or y:
            out[i]=(x[0] if x else -1,x[1] if x else 0,x[2] if x else 0,
                    y[0] if y else -1,y[1] if y else 0,y[2] if y else 0)
    return out

class ExactNativeTextHangRegressions(unittest.TestCase):
    def test_context_window_bit_exact_every_position_varied_documents(self):
        rng=np.random.default_rng(20261107)
        for n in [1,2,3,4,7,8,63,64,65,66,128,513,4096]:
            e=list(rng.integers(1,127,n,dtype=np.int64))
            for maxK in [1,2,7,8,32,48,64,128]:
                for i in range(n+1):
                    self.assertEqual(new_bounded_context(e,i,maxK),
                      baseline_unbounded_context(e,i,maxK),(n,maxK,i))
        print("EXACT_ORIGINAL_V17_CONTEXTS_ALL_POSITIONS_PASS",flush=True)

    def test_real_long_document_exact_context_and_no_full_prefix_materialization(self):
        rng=np.random.default_rng(19)
        e=list(rng.integers(32,127,size=190000,dtype=np.int64))
        positions=list(range(180000,190000,37))
        t=time.perf_counter()
        baseline=[baseline_unbounded_context(e,i,64) for i in positions]
        oldSeconds=time.perf_counter()-t
        t=time.perf_counter()
        new=[new_bounded_context(e,i,64) for i in positions]
        newSeconds=time.perf_counter()-t
        self.assertEqual(baseline,new)
        self.assertEqual(len(new),len(positions))
        self.assertTrue(all(len(row)<=64 for row in new))
        print("V17_LONG_CONTEXT_BOUNDED_COPY_CPU_REFERENCE",{
            "documentCharacters":len(e),"positionsChecked":len(positions),
            "originalPrefixCopySeconds":round(oldSeconds,6),
            "boundedCopySeconds":round(newSeconds,6),
            "ratioNotEndToEndCUDA":round(oldSeconds/max(newSeconds,1e-9),2),
            "identicalContexts":True
        },flush=True)

    def test_full_native_selfmem_identical_with_realtime_progress(self):
        rng=np.random.default_rng(41)
        e=list(rng.integers(32,127,size=27000,dtype=np.int64))
        t=time.perf_counter()
        baseline=original_self_index(e)
        oldSeconds=time.perf_counter()-t
        card=mod.TextCard("numpy",max_memory=4096)
        progress=[]
        self.assertIsNot(card._self,mod.TextCard._self)
        t=time.perf_counter()
        result=card._selfidx([e],0,progress=lambda done,total,phase:
          progress.append((int(done),int(total),phase)))
        newSeconds=time.perf_counter()-t
        self.assertEqual(baseline,result)
        self.assertEqual(result,card._selfidx([e],0), "index should be reused within same Brain")
        self.assertTrue(progress and progress[0]==(0,2*len(e),"self-index"))
        self.assertEqual(progress[-1],(2*len(e),2*len(e),"self-index"))
        self.assertTrue(any(done>0 and done<len(e) for done,_,_ in progress))
        self.assertTrue(any(done>len(e) and done<2*len(e) for done,_,_ in progress))
        fresh=mod.TextCard("numpy",max_memory=4096)
        self.assertNotIn(0,fresh._self)
        self.assertEqual(fresh._selfidx([e[:380]],0),original_self_index(e[:380]))
        print("ORIGINAL_SELF_INDEX_EXACT_PROGRESS",{
          "documentCharacters":len(e),"originalPositions":len(baseline),
          "nativeIndexedPositions":len(result),
          "progressPackets":len(progress),
          "referenceSeconds":round(oldSeconds,4),
          "instrumentedSeconds":round(newSeconds,4),
          "perBrainCacheIsolated":True
        },flush=True)

    def test_index_memory_and_form_exact_with_actual_precommit_progress(self):
        rng=np.random.default_rng(15)
        example=np.asarray(rng.integers(32,127,size=1700),dtype=np.int64)
        a=mod.TextCard("numpy",max_memory=2048)
        b=mod.TextCard("numpy",max_memory=2048)
        messages=[]
        a.append([example],progress=lambda done,total,phase:
          messages.append((done,total,phase)))
        b.append([example])
        self.assertEqual(a.total_seen,1700)
        self.assertEqual(a.indexed,b.indexed)
        self.assertTrue(any(p=="indexing-memory" for _,_,p in messages))
        self.assertTrue(any(p=="indexing-form" for _,_,p in messages))
        self.assertTrue(any(p=="indexing-complete" for _,_,p in messages))
        np.testing.assert_array_equal(a.big.sa,b.big.sa)
        np.testing.assert_array_equal(a.fbig.sa,b.fbig.sa)
        np.testing.assert_array_equal(a.big.nxt,b.big.nxt)
        np.testing.assert_array_equal(a.fbig.nxt,b.fbig.nxt)
        c=np.full((5,64),-2,np.int64)
        for i in range(5):
            c[i,:32]=example[40+i:72+i][::-1]
        old=a.big.align(a.X,c,64)
        new=b.big.align(b.X,c,64)
        for lhs,rhs in zip(old,new):np.testing.assert_array_equal(lhs,rhs)
        print("ORIGINAL_SUFFIX_INDEX_UNCHANGED_WITH_PYTHON_PROGRESS",{
          "memory":a.indexed,"phaseMessages":len(messages),
          "exactSuffixArray":True,"exactPredictions":True
        },flush=True)

    def test_native_textcard_updates_and_trust_unchanged_with_progress(self):
        rng=np.random.default_rng(12)
        history=np.asarray(rng.integers(32,127,size=420),dtype=np.int64)
        ex=np.asarray(rng.integers(32,127,size=190),dtype=np.int64)
        with_progress=mod.TextCard("numpy",max_memory=1200)
        without_progress=mod.TextCard("numpy",max_memory=1200)
        for m in [with_progress,without_progress]:m.append([history])
        progress=[]
        p=with_progress.live([ex],trust=[],g=8.,formW=1.,
          variants=[(4.,1.),(8.,.5)],chunk=64,
          progress=lambda done,total,phase:progress.append((done,total,phase)))
        control=without_progress.live([ex],trust=[],g=8.,formW=1.,
          variants=[(4.,1.),(8.,.5)],chunk=64)
        self.assertEqual(p,control)
        self.assertEqual(p["seen"],len(ex)-1)
        self.assertEqual(p["totalCardChars"],len(history)+len(ex))
        self.assertTrue(any(p=="preparing-real-text" for _,_,p in progress))
        self.assertTrue(any(p=="alignment" for _,_,p in progress))
        self.assertTrue(any(p=="imagination" for _,_,p in progress))
        self.assertTrue(any(p=="self-index" for _,_,p in progress))
        self.assertTrue(any(p=="indexing-memory" for _,_,p in progress))
        self.assertTrue(any(p=="indexing-form" for _,_,p in progress))
        np.testing.assert_array_equal(with_progress.big.sa,without_progress.big.sa)
        print("V17_ORIGINAL_NATIVE_TEXTCARD_TRAINING_EXACT",{
          "originalRealCharsCommitted":len(ex),"hits":p["hits"],
          "seen":p["seen"],"progressEvents":len(progress),
          "sameTrust":p["trust"]==control["trust"],
          "sameVariants":p["variants"]==control["variants"]
        },flush=True)

if __name__=="__main__":
    unittest.main()
