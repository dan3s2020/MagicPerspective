"""Scientific regression: six-variant GPU scoring versus exact preoptimization.
Tests actual text-index propositions (not canned percentages). CPU NumPy
required, optionally torch CUDA when present on user's workstation.
"""
import importlib.util
import pathlib
import time
import unittest
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("text_gpu",ROOT/"transcend"/"torus-aether"/"gpu"/"text_gpu.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

def old_blend(X,props,LUT,gv,fw,Q):
    S=X.zeros((Q,129),np.float32)
    dmass=X.zeros(Q,np.float32)
    tc=mod.TextCard("numpy")
    for p in props:
        src,d,ok,sup,ys=p[:5];farb=p[5] if len(p)>5 else None
        kid=tc._kid(src,d,sup,farb,Q)
        w=LUT[kid]**gv*(fw if src>=2 else 1.0)
        w=X.where(ok,w,X.zeros(Q,np.float32))
        valid=ys>=0
        cnt=X.f32(valid).sum(1)
        cnt=X.where(cnt>0,cnt,cnt+1)
        for j in range(ys.shape[1]):
            yj=X.clip(ys[:,j],0,128)
            m=valid[:,j]
            q=X.where(m,w/cnt,X.zeros(Q,np.float32))
            if src>=2:
                isd=yj==mod.DIG
                dmass=dmass+X.where(isd,q,X.zeros(Q,np.float32))
                q=X.where(isd,X.zeros(Q,np.float32),q)
            S[X.arange(Q),yj]+=q
    dig=S[:,48:58];dz=dig.sum(1);has=dz>0
    share=X.where(has[:,None],
       dig/X.where(has,dz,dz+1)[:,None],
       X.zeros(dig.shape,np.float32))
    S[:,48:58]=dig+dmass[:,None]*share
    S[:,mod.DIG]=S[:,mod.DIG]+X.where(has,X.zeros(Q,np.float32),dmass)
    return X.argmax1(S[:,:128]),S

def new_prepare(X,props,Q):
    tc=mod.TextCard("numpy")
    prepared=[];rows=X.arange(Q)
    for p in props:
        src,d,ok,sup,ys=p[:5]
        farb=p[5] if len(p)>5 else None
        kid=tc._kid(src,d,sup,farb,Q)
        valid=ys>=0
        cnt=X.f32(valid).sum(1)
        cnt=X.where(cnt>0,cnt,cnt+1)
        base=X.zeros((Q,129),np.float32)
        digit_mass=X.zeros(Q,np.float32)
        for j in range(ys.shape[1]):
            yj=X.clip(ys[:,j],0,128)
            q=X.where(valid[:,j],1.0/cnt,X.zeros(Q,np.float32))
            if src>=2:
                isd=yj==mod.DIG
                digit_mass+=X.where(isd,q,X.zeros(Q,np.float32))
                q=X.where(isd,X.zeros(Q,np.float32),q)
            base[rows,yj]+=q
        prepared.append((src,ok,kid,base,digit_mass))
    return prepared

def new_blend(X,prepared,LUT,gv,fw,Q):
    S=X.zeros((Q,129),np.float32);dmass=X.zeros(Q,np.float32)
    for src,ok,kid,base,one_digit_mass in prepared:
        w=LUT[kid]**gv*(fw if src>=2 else 1.0)
        w=X.where(ok,w,X.zeros(Q,np.float32))
        S+=base*w[:,None]
        dmass+=one_digit_mass*w
    dig=S[:,48:58];dz=dig.sum(1);has=dz>0
    share=X.where(has[:,None],dig/X.where(has,dz,dz+1)[:,None],X.zeros(dig.shape,np.float32))
    S[:,48:58]=dig+dmass[:,None]*share
    S[:,mod.DIG]=S[:,mod.DIG]+X.where(has,X.zeros(Q,np.float32),dmass)
    return X.argmax1(S[:,:128]),S

def actual_inputs(Q=64):
    X=mod.X("numpy")
    corpus=(ROOT/"docs"/"TORUS_AETHER_ABC_20261104.md").read_text(encoding="utf8",errors="replace")
    raw=[ord(c) if ord(c)<128 else 63 for c in corpus[:7500]]
    card=mod.TextCard("numpy",max_memory=8192)
    card.append([np.array(raw[:5000],dtype=np.int64)])
    ctx=np.full((Q,64),-2,dtype=np.int64)
    targets=np.zeros(Q,dtype=np.int64)
    for i in range(Q):
        pos=300+(i*57)%(len(raw)-400)
        length=min(64,pos)
        ctx[i,:length]=raw[pos-1::-1][:length]
        targets[i]=raw[pos]
    C=X.arr(ctx);props=card._proposals(C,mod.form_of(X,C))
    rng=np.random.default_rng(17)
    for src in [1,3]:
        vals=np.asarray(rng.integers(-1,128,size=(Q,1)),dtype=np.int64)
        ok=X.arr(vals[:,0]>=0,bool)
        props.append((src,X.arr(rng.integers(0,13,size=Q)),ok,
                      X.zeros(Q,np.int64)+1,X.arr(vals),
                      X.arr(rng.integers(0,10,size=Q))))
    trust=X.arr(rng.uniform(.12,.95,size=4*13*4*11+1).astype(np.float32),np.float32)
    return X,props,trust,Q,targets

class TextVariantsEquivalent(unittest.TestCase):
    def test_all_original_six_trust_variants_predict_same_actual_next_symbols(self):
        X,props,LUT,Q,real=actual_inputs(32)
        prepared=new_prepare(X,props,Q)
        outputs=[]
        for gv,fw in [(8,1),(4,1),(16,1),(8,.5),(8,2),(6,.75)]:
            p,sp=old_blend(X,props,LUT,gv,fw,Q)
            q,sq=new_blend(X,prepared,LUT,gv,fw,Q)
            np.testing.assert_array_equal(q,p,err_msg=f"trust variant g={gv}, form={fw}")
            np.testing.assert_allclose(sq,sp,rtol=2e-5,atol=1e-6)
            self.assertEqual(int((p==real).sum()),int((q==real).sum()))
            outputs.append((gv,fw,int((q==real).sum())))
        print("EXACT_TRUST_VARIANT_PREDICTIONS",{
          "realTextContexts":Q,"allSixIdentical":True,
          "variantHits":outputs},flush=True)

    def test_complete_original_textcard_learns_real_corpus_bytes_and_reports_true_prediction_stats(self):
        sample=(ROOT/"docs"/"TORUS_AETHER_ABC_20261104.md").read_text(
          encoding="utf8",errors="replace")
        raw=[ord(c) if ord(c)<128 else 63 for c in sample[:720]]
        X=mod.X("numpy")
        card=mod.TextCard("numpy",max_memory=1024)
        card.append([X.arr(raw[:256])])
        train=raw[256:480]
        before=card.total_seen
        start=time.perf_counter()
        result=card.live([train],trust=[],chunk=64)
        elapsed=time.perf_counter()-start
        self.assertEqual(result["seen"],len(train)-1)
        self.assertEqual(result["totalCardChars"],before+len(train))
        self.assertTrue(result["memory"]>0)
        self.assertGreaterEqual(result["hits"],0)
        self.assertLessEqual(result["hits"],result["seen"])
        self.assertEqual(len(result["variants"]),0)
        print("MEASURED_COMPLETE_NATIVE_TEXTCARD_CPU",{
          "backend":"NumPy CPU, no CUDA claim",
          "actualCorpus":"V17 docs real text",
          "tokensGenuinelyTrained":len(train),
          "seconds":round(elapsed,4),
          "committedTextMBps":round(len(train)/1e6/max(elapsed,1e-9),5),
          "preUpdateCorrect":result["hits"],
          "preUpdateTotal":result["seen"],
          "nativeModelUpdated":result["totalCardChars"]>before},flush=True)

    def test_reuse_measured_without_claiming_full_gpu_training_rate(self):
        X,props,LUT,Q,_=actual_inputs(64)
        variants=[(8,1),(4,1),(16,1),(8,.5),(8,2),(6,.75)]
        t=time.perf_counter()
        old=[old_blend(X,props,LUT,g,f,Q)[0] for g,f in variants]
        oldT=time.perf_counter()-t
        t=time.perf_counter()
        prepared=new_prepare(X,props,Q)
        new=[new_blend(X,prepared,LUT,g,f,Q)[0] for g,f in variants]
        fastT=time.perf_counter()-t
        for a,b in zip(old,new):np.testing.assert_array_equal(a,b)
        print("MEASURED_TRUST_WEIGHT_REUSE",{
          "backend":"NumPy CPU exact reference, NOT CUDA benchmark",
          "variants":6,"contexts":Q,
          "referenceSeconds":round(oldT,5),
          "cachedSeconds":round(fastT,5),
          "speedup":round(oldT/max(fastT,1e-8),3)},flush=True)

if __name__=="__main__":unittest.main()
