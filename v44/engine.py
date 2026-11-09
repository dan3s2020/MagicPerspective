#!/usr/bin/env python3
"""V44 independent CUDA engine. Not V42/V43 Brain, not Qwen forward inference.

A complete exercise is committed only AFTER visible-target geometry, a
teacher-forced before score, a genuine GPU parameter update, and an after
score finish. The model learns n-gram state transitions plus a prompt/answer
operator matrix; it does NOT learn simply by replaying the visible target.
The target is available to the geometrical planning task ONLY. Autonomous
language generation and arbitrary software self-repair are NOT claimed.
"""
from __future__ import annotations

import argparse
import base64
import errno
import json
import os
from pathlib import Path
import sys
import time
import uuid

import numpy as np
import torch
import torch.nn.functional as F


ATLAS_FORMAT = "braivour/v42-brain-character/v1"
CONTEXT_BUCKETS = 8192
VOCAB = 256
CHECKPOINT_FORMAT = "magicperspective/v44/stream-learner/1"


def emit(kind: str, **data):
    sys.stdout.write(json.dumps({"kind": kind, **data}, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def tensor_bytes(data: bytes, device):
    return torch.from_numpy(np.frombuffer(data, dtype=np.uint8).astype(np.int64)).to(device)


def as_base64(mask: torch.Tensor):
    return base64.b64encode(mask.to(torch.uint8).cpu().numpy().tobytes()).decode("ascii")


def retry_replace(temp: Path, target: Path):
    last = None
    for attempt in range(6):
        try:
            os.replace(temp, target)
            return
        except OSError as exc:
            last = exc
            if exc.errno not in (errno.EACCES, errno.EPERM, errno.EBUSY):
                raise
            time.sleep(0.04 * (attempt + 1))
    raise RuntimeError("Checkpoint could not be committed; original remains intact") from last


def device_from_config(name: str):
    if name.startswith("cuda"):
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA requested but unavailable. No CPU training fallback.")
        return torch.device(name)
    if name != "cpu":
        raise ValueError("Only cuda:0 or explicit cpu-test accepted")
    return torch.device("cpu")


class FrozenGeometry:
    def __init__(self, atlas_path: Path, device):
        obj = json.loads(atlas_path.read_text(encoding="utf-8"))
        if obj.get("format") != ATLAS_FORMAT or not obj.get("source_genuine_gguf", False):
            raise ValueError("Real Qwen GGUF-derived coordinate atlas required")
        if not isinstance(obj.get("output_rows"), list) or not isinstance(obj.get("movement_axes"), list):
            raise ValueError("Malformed donor tensor arrays")
        self.rows = F.normalize(torch.tensor(obj["output_rows"], dtype=torch.float32, device=device), dim=1)
        self.axes = F.normalize(torch.tensor(obj["movement_axes"], dtype=torch.float32, device=device), dim=1)
        if self.rows.shape[0] != VOCAB or self.axes.shape[1] != self.rows.shape[1]:
            raise ValueError("256 UTF-8 byte tokens and matching frozen geometry dimensions required")
        self.dim = self.rows.shape[1]
        self.rank = int(torch.linalg.matrix_rank(self.axes.T, tol=1e-5).item())
        if self.rank < self.dim:
            raise ValueError(f"Frozen donor axes only span {self.rank}/{self.dim} dimensions")
        self.inverse = torch.linalg.pinv(self.axes.T)
        reachable = torch.zeros((VOCAB * VOCAB,), dtype=torch.bool, device=device)
        for first in range(0, VOCAB * VOCAB, 4096):
            pairs = torch.arange(first, min(first + 4096, VOCAB * VOCAB), device=device)
            src, dst = torch.div(pairs, VOCAB, rounding_mode="floor"), pairs % VOCAB
            change = self.rows[dst] - self.rows[src]
            weights = change @ self.inverse.T
            moved = F.normalize(self.rows[src] + weights @ self.axes, dim=1)
            decoded = (moved @ self.rows.T).argmax(dim=-1)
            reachable[first:first + pairs.numel()] = decoded == dst
        self.lookup = reachable.reshape(VOCAB, VOCAB)
        self.reachable = int(reachable.sum().item())
        self.source = str(obj.get("provenance", {}).get("donor_path", atlas_path))
        self.selection = str(obj.get("provenance", {}).get("coordinate_readout_used", "sampled GGUF coordinates"))
        if self.reachable != VOCAB * VOCAB:
            raise ValueError(f"Only {self.reachable}/65536 actual Qwen coordinate targets reachable; NOT starting training")

    def visible_shape(self, answers: list[bytes], prompts: list[bytes]):
        totals = []
        for prompt, answer in zip(prompts, answers):
            if not answer:
                totals.append((0, 0, b''))
                continue
            target = tensor_bytes(answer, self.rows.device)
            prev = torch.empty_like(target)
            prev[0] = prompt[-1] if prompt else 0
            prev[1:] = target[:-1]
            hits = self.lookup[prev, target]
            totals.append((int(hits.sum().item()), int(target.numel()), hits.to(torch.uint8).cpu().numpy().tobytes()))
        return totals


class StreamLearner:
    """Small real trainable byte-transition model; all updates are GPU vectorized."""
    def __init__(self, geometry: FrozenGeometry, device, checkpoint: Path, resume=True):
        self.geo, self.device, self.checkpoint = geometry, device, checkpoint
        self.context_counts = torch.zeros((CONTEXT_BUCKETS, VOCAB), device=device, dtype=torch.int32)
        self.pair_counts = torch.zeros((VOCAB, VOCAB), device=device, dtype=torch.int32)
        self.operator = torch.zeros((geometry.dim, geometry.dim), dtype=torch.float32, device=device)
        self.top_context = torch.zeros(CONTEXT_BUCKETS, dtype=torch.int64, device=device)
        self.top_pair = torch.zeros(VOCAB, dtype=torch.int64, device=device)
        self.context_support = torch.zeros(CONTEXT_BUCKETS, dtype=torch.bool, device=device)
        self.total_exercises = 0
        self.total_bytes = 0
        self.last_row_index = -1
        self.first_run = time.perf_counter()
        self.start_time = time.perf_counter()
        self.history = []
        if resume and checkpoint.is_file():
            self.restore()

    def _cache_top(self):
        self.top_context = self.context_counts.argmax(dim=1)
        self.top_pair = self.pair_counts.argmax(dim=1)
        self.context_support = self.context_counts.sum(dim=1) >= 3

    def restore(self):
        data = torch.load(self.checkpoint, map_location="cpu", weights_only=False)
        if data.get("format") != CHECKPOINT_FORMAT:
            raise ValueError("Refusing to load an incompatible V42/V43 or unknown checkpoint")
        if data.get("atlas_source") != self.geo.source:
            raise ValueError("Saved Brain uses a different donor source. No unsafe resume.")
        self.context_counts = data["context_counts"].to(self.device)
        self.pair_counts = data["pair_counts"].to(self.device)
        self.operator = data["operator"].to(self.device)
        self.total_exercises = int(data["total_exercises"])
        self.total_bytes = int(data["total_bytes"])
        self.last_row_index = int(data["last_row_index"])
        self._cache_top()

    def save(self):
        self.checkpoint.parent.mkdir(parents=True, exist_ok=True)
        stage = self.checkpoint.with_name(self.checkpoint.name + "." + uuid.uuid4().hex + ".tmp")
        checkpoint = {
            "format": CHECKPOINT_FORMAT,
            "atlas_source": self.geo.source,
            "context_counts": self.context_counts.cpu(),
            "pair_counts": self.pair_counts.cpu(),
            "operator": self.operator.cpu(),
            "total_exercises": self.total_exercises,
            "total_bytes": self.total_bytes,
            "last_row_index": self.last_row_index,
        }
        try:
            torch.save(checkpoint, stage)
            retry_replace(stage, self.checkpoint)
        finally:
            if stage.exists():
                stage.unlink()
        return {"saved": str(self.checkpoint), "bytes": self.checkpoint.stat().st_size,
                "exercises": self.total_exercises, "source_row": self.last_row_index}

    def _arrays(self, rows: list[dict]):
        # One Python iteration per complete exercise; NO 50k-iteration character replay.
        p2, p1, targets, segments = [], [], [], []
        prompts, answers = [], []
        offset = 0
        for row in rows:
            prompt = str(row["prompt"]).encode("utf-8", errors="replace")
            answer = str(row["answer"]).encode("utf-8", errors="replace")
            prompts.append(prompt)
            answers.append(answer)
            prefix = (b"\x00\x00" + prompt)[-2:]
            raw = np.frombuffer(prefix + answer, dtype=np.uint8)
            a, b, y = raw[:-2], raw[1:-1], raw[2:]
            p2.append(a.copy())
            p1.append(b.copy())
            targets.append(y.copy())
            segments.append((offset, offset + len(answer)))
            offset += len(answer)
        if not offset:
            return None
        arr2 = np.concatenate(p2)
        arr1 = np.concatenate(p1)
        y = np.concatenate(targets)
        return (torch.from_numpy(arr2.astype(np.int64)).to(self.device),
                torch.from_numpy(arr1.astype(np.int64)).to(self.device),
                torch.from_numpy(y.astype(np.int64)).to(self.device),
                segments, prompts, answers)

    def _predict(self, prior2, prior1):
        ctx = ((prior2 * 257 + prior1 * 131) ^ (prior2 << 3)) % CONTEXT_BUCKETS
        predicted = torch.where(self.context_support[ctx],
                                self.top_context[ctx], self.top_pair[prior1])
        return predicted, ctx

    @torch.no_grad()
    def train_batch(self, rows: list[dict]):
        start = time.perf_counter()
        arrays = self._arrays(rows)
        if arrays is None:
            return [], 0.0
        prior2, prior1, target, spans, prompts, answers = arrays
        pre, ctx = self._predict(prior2, prior1)
        pre_mask = pre == target
        visible = self.geo.visible_shape(answers, prompts)
        # All real exercise bytes contribute once and only once to the GPU model.
        bigram_keys = prior1 * VOCAB + target
        gram_keys = ctx * VOCAB + target
        bigram_counts = torch.bincount(bigram_keys, minlength=VOCAB * VOCAB)
        context_counts = torch.bincount(gram_keys, minlength=CONTEXT_BUCKETS * VOCAB)
        self.pair_counts.add_(bigram_counts.reshape(VOCAB, VOCAB).to(torch.int32))
        self.context_counts.add_(context_counts.reshape(CONTEXT_BUCKETS, VOCAB).to(torch.int32))
        # A separate low-rank prompt-to-answer transformation is updated, not
        # just copied from target text. It is testable on unseen prompt vectors.
        for question, answer in zip(prompts, answers):
            if question and answer:
                q = self.geo.rows[tensor_bytes(question, self.device)].mean(dim=0)
                a = self.geo.rows[tensor_bytes(answer, self.device)].mean(dim=0)
                self.operator.mul_(0.9995).add_(torch.outer(q, a), alpha=0.0005)
        self._cache_top()
        post, _ = self._predict(prior2, prior1)
        post_mask = post == target
        if self.device.type == "cuda":
            torch.cuda.synchronize()
        elapsed = max(1e-6, time.perf_counter() - start)
        pre_np, post_np = pre_mask.to(torch.uint8).cpu().numpy(), post_mask.to(torch.uint8).cpu().numpy()
        predicted_pre, predicted_post = pre.to(torch.uint8).cpu().numpy(), post.to(torch.uint8).cpu().numpy()
        result = []
        for n, (start_i, end_i) in enumerate(spans):
            full = end_i - start_i
            if not full:
                continue
            self.total_exercises += 1
            self.total_bytes += full
            self.last_row_index = int(rows[n]["id"])
            pre_correct = int(pre_np[start_i:end_i].sum())
            post_correct = int(post_np[start_i:end_i].sum())
            shape_correct, shape_total, shape_mask = visible[n]
            result.append({
                "id": self.last_row_index, "prompt": rows[n]["prompt"], "answer": rows[n]["answer"],
                "bytes": full, "before_correct": pre_correct, "after_correct": post_correct,
                "shape_verified": shape_correct, "shape_total": shape_total,
                "shape_mask": base64.b64encode(shape_mask).decode(),
                "before_mask": base64.b64encode(pre_np[start_i:end_i].tobytes()).decode(),
                "after_mask": base64.b64encode(post_np[start_i:end_i].tobytes()).decode(),
                "before_bytes": base64.b64encode(predicted_pre[start_i:end_i].tobytes()).decode(),
                "after_bytes": base64.b64encode(predicted_post[start_i:end_i].tobytes()).decode(),
                "comparison": "teacher-forced next-byte prediction (answer context visible); not free-running answer generation",
                "geometry": "verified frozen Qwen-weight coordinate path with FULL target visible",
            })
        return result, elapsed

    @torch.no_grad()
    def generate(self, prompt, max_output=96):
        """Independent prompt-only byte prediction; not Qwen inference."""
        raw = str(prompt).encode("utf-8", errors="replace")
        if not raw:
            return {"text": "", "bytes": 0}
        a = raw[-2] if len(raw) >= 2 else 0
        b = raw[-1]
        out = bytearray()
        for _ in range(min(256, max(1, int(max_output)))):
            p2 = torch.tensor([a], dtype=torch.int64, device=self.device)
            p1 = torch.tensor([b], dtype=torch.int64, device=self.device)
            next_byte = int(self._predict(p2, p1)[0][0].item())
            out.append(next_byte)
            a,b=b,next_byte
        return {"text": bytes(out).decode("utf-8", errors="replace"),
                "raw_bytes_base64": base64.b64encode(out).decode(),
                "bytes": len(out),
                "reference_supplied": False,
                "donor_model_forward": False}

    def reset_with_archive(self):
        import shutil
        self.save()
        archive = self.checkpoint.with_name(
            self.checkpoint.stem+".archived-"+time.strftime("%Y%m%d-%H%M%S")+self.checkpoint.suffix)
        shutil.copy2(self.checkpoint, archive)
        # Only V44 state is reset, previous file is safely archived.
        fresh = StreamLearner(self.geo, self.device, self.checkpoint, resume=False)
        return fresh, str(archive)

    @torch.no_grad()
    def eval_holdout(self, rows: list[dict]):
        tensors = self._arrays(rows)
        if tensors is None:
            return {"bytes": 0, "correct": 0}
        prior2, prior1, target, _, prompts, answers = tensors
        predicted, _ = self._predict(prior2, prior1)
        correct = int((predicted == target).sum().item())
        # Evaluate prompt-conditioned learned operator on a byte-level target:
        # never train on holdout; it is a limited transfer measure.
        good, count = 0, 0
        for prompt, answer in zip(prompts, answers):
            if prompt and answer:
                q = self.geo.rows[tensor_bytes(prompt, self.device)].mean(dim=0)
                projected = q @ self.operator
                suggestion = int((projected @ self.geo.rows.T).argmax().item())
                good += int(suggestion == answer[0])
                count += 1
        return {"bytes": int(target.numel()), "correct": correct,
                "accuracy": correct / max(1, target.numel()),
                "prompt_operator_first_byte_correct": good,
                "prompt_operator_first_byte_total": count,
                "description": "HELD OUT, not trained; teacher-forced bytes + first-byte prompt-only operator"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--device", default="cuda:0")
    parser.add_argument("--fresh", action="store_true")
    args = parser.parse_args()
    try:
        device = device_from_config(args.device)
        geometry = FrozenGeometry(Path(args.atlas), device)
        agent = StreamLearner(geometry, device, Path(args.checkpoint), resume=not args.fresh)
        emit("ready", device=str(device), donor=geometry.source, rank=geometry.rank,
             dimensions=geometry.dim, complete_visible_pairs=geometry.reachable,
             model="V44 independent vectorized n-gram + learned prompt operator",
             precision_claim="visible-target geometry only, not autonomous Qwen text",
             exercises=agent.total_exercises, bytes=agent.total_bytes,
             last_row_index=agent.last_row_index)
    except Exception as exc:
        emit("fatal", error=repr(exc))
        return 2

    for line in sys.stdin:
        try:
            job = json.loads(line)
            cmd = job["cmd"]
            if cmd == "batch":
                rows = job["rows"]
                emit("phase", step="CUDA batch: vectorized state update", rows=len(rows))
                outcomes, elapsed = agent.train_batch(rows)
                emit("batch", outcomes=outcomes, seconds=elapsed,
                     completed_exercises=agent.total_exercises,
                     completed_bytes=agent.total_bytes, last_row_index=agent.last_row_index,
                     exact_exercises_per_second=len(outcomes) / max(elapsed, 1e-6),
                     exact_characters_per_second=sum(x["bytes"] for x in outcomes) / max(elapsed, 1e-6),
                     vram_allocated_bytes=int(torch.cuda.memory_allocated() if device.type == "cuda" else 0),
                     vram_peak_bytes=int(torch.cuda.max_memory_allocated() if device.type == "cuda" else 0),
                     operator_l2=float(torch.linalg.vector_norm(agent.operator).item()),
                     graph_edges=[
                        {"from":int(i),"to":int(v),"count":int(c)}
                        for i,(v,c) in enumerate(zip(*[
                            x.cpu().tolist() for x in agent.pair_counts.max(dim=1)
                        ])) if c>0
                     ])
            elif cmd == "generate":
                emit("generation", **agent.generate(job.get("prompt",""),job.get("max_output",96)))
            elif cmd == "reset":
                agent, archived = agent.reset_with_archive()
                emit("reset", archived=archived)
            elif cmd == "eval":
                emit("holdout", result=agent.eval_holdout(job["rows"]))
            elif cmd == "save":
                emit("checkpoint", **agent.save())
            elif cmd == "quit":
                emit("checkpoint", **agent.save())
                emit("stopped", exercises=agent.total_exercises)
                return 0
            else:
                emit("warning", error="Unknown command: " + str(cmd))
        except Exception as exc:
            emit("error", command=job.get("cmd") if "job" in locals() else "unknown",
                 error=repr(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
