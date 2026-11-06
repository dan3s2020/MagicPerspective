#!/usr/bin/env python3
"""Verify a working *local* PyTorch CUDA install using actual GPU computation.

Exit 0 only after torch (including torch.torch_version) imports from this
virtualenv, CUDA is available and a matrix multiply ran on cuda:0.
This script does not install packages, allocate persistent files or modify V17.
"""
import json
import pathlib
import sys
import traceback

def main():
    try:
        import torch
        import torch.torch_version  # Must exist in a complete PyTorch wheel.
        import numpy as np

        env = pathlib.Path(sys.prefix).resolve()
        installed = pathlib.Path(torch.__file__).resolve()
        if not installed.is_relative_to(env):
            raise RuntimeError("torch was imported outside the selected virtualenv: " + str(installed))
        if "--wheel-only" in sys.argv:
            if torch.version.cuda is None:
                raise RuntimeError("This torch wheel has no CUDA support (CPU-only wheel)")
            print("CUDA_WHEEL_OK " + json.dumps({
                "torch": torch.__version__,
                "torch_cuda": torch.version.cuda,
                "torch_file": str(installed),
                "virtualenv": str(env)
            }))
            return 0

        if not torch.cuda.is_available():
            raise RuntimeError("torch imported, but CUDA is not available to this Python interpreter")
        if torch.cuda.device_count() < 1:
            raise RuntimeError("PyTorch reports no CUDA devices")

        a = torch.arange(64, dtype=torch.float32, device="cuda:0").reshape(8, 8)
        b = torch.eye(8, dtype=torch.float32, device="cuda:0")
        product = a @ b
        torch.cuda.synchronize(device=0)
        if product.device.type != "cuda" or not torch.allclose(product, a):
            raise RuntimeError("CUDA tensor computation did not produce the expected result")

        print("CUDA_PROBE_OK " + json.dumps({
            "torch": torch.__version__,
            "numpy": np.__version__,
            "torch_cuda": torch.version.cuda,
            "device": torch.cuda.get_device_name(0),
            "device_count": torch.cuda.device_count(),
            "torch_file": str(installed),
            "virtualenv": str(env),
            "allocated_bytes": torch.cuda.memory_allocated(0),
            "compute": "torch matrix multiplication on cuda:0"
        }))
        return 0
    except Exception as exc:
        print("CUDA_PROBE_FAILED: " + str(exc), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
