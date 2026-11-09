"""Preflight real already-selected Qwen GGUF atlas on CUDA: visible-goal reachability.

Uses actual frozen donor vectors, NOT model inference. Never updates weights.
Checks the complete 256x256 source/target transition table in bounded GPU
batches. On failure, the launcher must NOT claim 100% nor start training.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import torch
import torch.nn.functional as F


def verify(atlas_path, *, device="cuda:0", batch_size=4096):
    if not device.startswith("cuda") or not torch.cuda.is_available():
        raise RuntimeError("Real CUDA is required; no silent CPU fallback")
    started = time.perf_counter()
    with Path(atlas_path).open("r", encoding="utf8") as fh:
        obj = json.load(fh)
    if obj.get("format") != "braivour/v42-brain-character/v1" or not obj.get("source_genuine_gguf"):
        raise ValueError("Expected existing genuine sampled Qwen GGUF atlas, not synthetic data")
    rows = torch.tensor(obj["output_rows"], dtype=torch.float32, device=device)
    axes = torch.tensor(obj["movement_axes"], dtype=torch.float32, device=device)
    if rows.ndim != 2 or rows.shape[0] != 256:
        raise ValueError("Exactly 256 original donor byte output positions are required")
    if axes.ndim != 2 or axes.shape[1] != rows.shape[1]:
        raise ValueError("Frozen donor movement dimensions mismatch")
    rows = F.normalize(rows, dim=1)
    axes = F.normalize(axes, dim=1)
    dim = rows.shape[1]
    rank = int(torch.linalg.matrix_rank(axes.T, tol=1e-5).item())
    report = {
        "method": "all byte-to-byte visible-target reachability through frozen GGUF-derived axes",
        "donor_weight_source": obj["provenance"].get("donor_path", ""),
        "original_model_forward_executed": False,
        "target_visible": True,
        "cuda": torch.cuda.get_device_name(0),
        "dimensions": int(dim),
        "axes": int(axes.shape[0]),
        "frozen_axis_rank": rank,
        "total_goal_pairs": 65536,
        "checked_goal_pairs": 0,
        "reachable": 0,
        "unreachable": 0,
        "not_independent_qwen_text_generation": True,
    }
    if rank < dim:
        report["error"] = "Frozen donor sampled axes do not span all coordinate dimensions"
        report["seconds"] = round(time.perf_counter() - started, 4)
        return report
    # Numerical median-length inverse solves on CUDA. Model weights NEVER change.
    inverse = torch.linalg.pinv(axes.T)  # (N_axes x dim).
    for offset in range(0, 65536, batch_size):
        ids = torch.arange(offset, min(65536, offset + batch_size), device=device)
        src = torch.div(ids, 256, rounding_mode="floor")
        goal = ids % 256
        delta = rows[goal] - rows[src]
        coeffs = delta @ inverse.T
        moved = F.normalize(rows[src] + coeffs @ axes, dim=1)
        actual = torch.argmax(moved @ rows.T, dim=1)
        exact = int((actual == goal).sum().item())
        report["checked_goal_pairs"] += ids.numel()
        report["reachable"] += exact
        report["unreachable"] += ids.numel() - exact
    torch.cuda.synchronize()
    # Report EXACT failed target classes, not just the aggregate. A multiple of
    # 256 failures often means some output rows are zero or tied for every source.
    failures = []
    row_norm = torch.linalg.vector_norm(torch.tensor(obj["output_rows"], dtype=torch.float64, device=device),dim=1)
    report["zero_or_near_zero_output_rows"] = [int(i) for i in torch.where(row_norm < 1e-12)[0].tolist()]
    best = rows @ rows.T
    exact_ties = []
    for i in range(256):
        if row_norm[i] < 1e-12:
            continue
        identical = torch.where(torch.linalg.vector_norm(rows - rows[i], dim=1) < 1e-7)[0].tolist()
        if len(identical) > 1 and identical[0] == i:
            exact_ties.append([int(j) for j in identical])
    report["identical_or_nearly_identical_output_clusters"] = exact_ties
    report["unreachable_targets"] = []
    # Repeat only failed classes for precise errors and numerical diagnosis.
    for goal in range(256):
        src = torch.arange(256, device=device)
        dst = torch.full_like(src, goal)
        delta = rows[dst] - rows[src]
        coeffs = delta @ inverse.T
        moved = F.normalize(rows[src] + coeffs @ axes, dim=1)
        actual = torch.argmax(moved @ rows.T,dim=1)
        misses = int((actual != goal).sum().item())
        if misses:
            report["unreachable_targets"].append({
                "byte": goal, "unreachable_sources": misses,
                "zero_row": bool(row_norm[goal]<1e-12),
                "decoder_at_target": int(torch.argmax(best[goal]).item())
            })
    report["exact_reachability"] = (report["unreachable"] == 0)
    report["seconds"] = round(time.perf_counter() - started, 4)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--batch", type=int, default=4096)
    args = parser.parse_args()
    result = verify(args.atlas, batch_size=max(256, min(args.batch, 8192)))
    target = Path(args.report)
    target.parent.mkdir(parents=True, exist_ok=True)
    stage = target.with_suffix(target.suffix + ".tmp")
    stage.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf8")
    stage.replace(target)
    print("V43_REAL_QWEN_COORDINATE_REACHABILITY=" + json.dumps(result), flush=True)
    if result.get("reachable") != 65536:
        sys.exit("REAL QWEN DONOR FULL-REACHABILITY GATE FAILED; no training will start")


if __name__ == "__main__":
    main()
