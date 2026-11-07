"""Run once on the USER's real NVIDIA GPU BEFORE native V17 text training.
This uses the installed PyTorch CUDA, never substitutes NumPy silently.
"""
import importlib.util
import pathlib
import sys
import time
import numpy as np

def main():
    device=sys.argv[1] if len(sys.argv)>1 else "cuda:0"
    import torch
    if not str(device).startswith("cuda") or not torch.cuda.is_available():
        raise RuntimeError("Actual NVIDIA CUDA PyTorch required. No CPU fallback.")
    root=pathlib.Path(__file__).resolve().parents[1]
    spec=importlib.util.spec_from_file_location("textgpu",
       root/"transcend"/"torus-aether"/"gpu"/"text_gpu.py")
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    from text_index_fast_test import old_align
    X=mod.X(device)
    raw=(root/"docs"/"TORUS_AETHER_ABC_20261104.md").read_bytes()
    # Mirror native V17 worker ASCII sanitization; bytes >=128 become 63.
    corpus=np.asarray([int(x) if x<128 else 63 for x in raw[:3200]],dtype=np.int64)
    mem=X.arr(corpus[:2000])
    idx=mod.Index(X,mem)
    Q=48;K=20;query=np.full((Q,K),-2,dtype=np.int64)
    for i in range(Q):
       pos=300+i*17
       if pos+K>=len(corpus):pos=(i*11)%max(1,len(corpus)-K-1)
       l=K if i%3==0 else 10 if i%3==1 else 3
       query[i,:l]=corpus[pos:pos+l]
    q=X.arr(query)
    X.sync();t=time.perf_counter()
    old=old_align(idx,X,q,K)
    X.sync();oldMs=(time.perf_counter()-t)*1000
    t=time.perf_counter()
    fast=idx.align(X,q,K)
    X.sync();fastMs=(time.perf_counter()-t)*1000
    for a,b in zip(old,fast):
        np.testing.assert_array_equal(X.tonp(a),X.tonp(b))
    card=mod.TextCard(device,max_memory=2048)
    card.append([corpus[:180]])
    before=card.total_seen
    r=card.live([list(map(int,corpus[180:320]))],trust=[],chunk=64)
    assert r["seen"]==139, r
    assert r["totalCardChars"]==before+140, r
    assert len(r["variants"])==0,r
    print("REAL_NVIDIA_TEXTGPU_SELFTEST",{
      "device":device,
      "torch":str(torch.__version__),
      "gpu":torch.cuda.get_device_name(torch.device(device)),
      "exactAlignedIntervals":Q*K*2,
      "originalGpuIndexMilliseconds":round(oldMs,2),
      "fastGpuIndexMilliseconds":round(fastMs,2),
      "realTextTokensCommitted":140,
      "preUpdateCorrect":r["hits"],
      "preUpdateTotal":r["seen"],
      "modelMemory":r["memory"],
      "result":"PASS; no fake GPU or inference-only pass"},flush=True)

if __name__=="__main__":
    try: main()
    except Exception as e:
        print("REAL CUDA TEXT TRAINING CHECK FAILED: "+repr(e),file=sys.stderr)
        raise
