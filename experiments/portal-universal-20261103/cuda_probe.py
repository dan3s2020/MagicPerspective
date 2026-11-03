"""No inline -c quoting; explicit real NVIDIA CUDA tensor + gradient test."""
import sys
try:
    import torch
    if not torch.cuda.is_available():raise RuntimeError('torch.cuda.is_available() is false')
    x=torch.randn(256,256,device='cuda',requires_grad=True)
    z=(x @ x).square().mean()
    z.backward()
    torch.cuda.synchronize()
    if x.grad is None or not torch.isfinite(x.grad).all():raise RuntimeError('No finite GPU gradients')
    print('CUDA GPU:',torch.cuda.get_device_name(0))
    print('CUDA torch:',torch.__version__)
    print('GPU COMPUTE + AUTOGRAD: PASS')
except Exception as exc:
    print('CUDA PROBE FAILED:',type(exc).__name__,str(exc),file=sys.stderr)
    sys.exit(1)
