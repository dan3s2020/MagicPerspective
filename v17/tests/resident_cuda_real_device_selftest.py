"""Before first REAL Windows GPU training: verify the VRAM lookahead pool
actually resides on the selected NVIDIA device, the original TextCard updates
only the currently committed row, and a future raw evidence query cannot
update the model. No silent CPU fallback.
"""
import sys
import pathlib
import base64
import torch

root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/"transcend"/"torus-aether"/"gpu"))
from worlds_gpu import Server

def main():
    device=sys.argv[1] if len(sys.argv)>1 else "cuda:0"
    if not str(device).startswith("cuda") or not torch.cuda.is_available():
        raise RuntimeError("NVIDIA CUDA required for actual resident VRAM test; no CPU fallback")
    server=Server()
    meta=server.handle({"cmd":"init","device":device,"vram":1.8,
                        "textPoolMB":64,"util":100})
    if not server.text_pool.torch:
        raise AssertionError("Resident CUDA pool is secretly on CPU")
    future=b"Q: future matrix\nA: a pearl becomes a rainbow\n\n"
    current=b"Q: known matrix\nA: a pearl becomes a star\n\n"
    t0=torch.cuda.memory_allocated(torch.device(device))
    add=server.handle({"cmd":"text_pool_add","entries":[
        {"id":"row:0","b64":base64.b64encode(current).decode("ascii")},
        {"id":"row:1","b64":base64.b64encode(future).decode("ascii")}
    ]})
    resident=add["textPool"]
    t1=torch.cuda.memory_allocated(torch.device(device))
    assert resident["physicallyCudaResident"] is True
    assert resident["residentBytes"]==len(current)+len(future)
    assert t1>=t0+resident["residentBytes"],(t0,t1,resident)
    preview=server.handle({"cmd":"text_pool_probe",
        "b64":base64.b64encode(b"a pearl becomes a").decode("ascii")})
    assert preview["futureEvidence"]["hits"]>0
    assert preview["futureEvidence"]["transductive"] is True
    assert server.text is None,"future text must not be committed before learning"
    learned=server.handle({"cmd":"text_learn","ids":["row:0"],
        "trust":[],"variants":[],"chunk":64})
    assert learned["seen"]==len(current)-1
    assert server.text.total_seen==len(current)
    assert learned["textPool"]["residentExercises"]==2
    removed=server.handle({"cmd":"text_pool_commit","ids":["row:0"]})
    assert removed["textPool"]["residentExercises"]==1
    assert removed["textPool"]["residentBytes"]==len(future)
    assert server.text.total_seen==len(current)
    print("REAL_NVIDIA_PERSISTENT_VRAM_TEXT_POOL_PASS",{
        "device":device,"gpu":torch.cuda.get_device_name(torch.device(device)),
        "realCudaAllocatedBefore":t0,
        "realCudaAllocatedAfter":t1,
        "actualTextBytesStaged":len(current)+len(future),
        "nativeCommittedTextChars":server.text.total_seen,
        "heldFutureTextStillResident":removed["textPool"]["residentBytes"],
        "futureRetrievedOnlyAsTransductiveEvidence":True,
        "nativeOriginalTrustNotPretrainedOnFuture":True,
        "result":"PASS"},flush=True)

if __name__=="__main__":
    main()
