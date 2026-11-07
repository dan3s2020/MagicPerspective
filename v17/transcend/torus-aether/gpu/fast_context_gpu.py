"""Optional genuine tensor-trained fast character-context head for V17.

This is NOT a faster implementation of the original suffix-array + 48-step
imagination algorithm. It is a separate, bounded 0-3 previous-symbol model
which learns all real characters in each supplied training exercise on the
selected PyTorch device. Its predictive tests and throughput are reported
SEPARATELY. Existing native V17 text algorithm remains the default.

Order 0: unigram, order 1: exact previous char,
order 2: exact previous two chars, order 3: bounded hashed context.
Model weights are cumulative observed transition counts; GPU atomic index_add
genuinely updates these counts. No sample is counted as trained before update.
"""
import os
import pathlib
import time
import numpy as np

try:
    import torch
except ImportError as exc:
    raise RuntimeError("Fast V17 context head requires actual PyTorch") from exc

SYMBOLS = 128
BUCKETS = 16384
VERSION = 1


class FastContextHead:
    def __init__(self, device="cpu"):
        self.device = torch.device(device)
        if self.device.type == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("Fast text CUDA requested but CUDA not available")
        self.unigram = torch.zeros(SYMBOLS, dtype=torch.int64, device=self.device)
        self.tables = {
            1: torch.zeros((SYMBOLS, SYMBOLS), dtype=torch.int32, device=self.device),
            2: torch.zeros((BUCKETS, SYMBOLS), dtype=torch.int32, device=self.device),
            3: torch.zeros((BUCKETS, SYMBOLS), dtype=torch.int32, device=self.device)
        }
        self.chars = 0
        self.exercises = 0
        self.trained_targets = 0
        self.batches = 0

    def _packed(self, exercises):
        arrays = []
        for ex in exercises:
            arr = np.asarray(ex, dtype=np.int64).reshape(-1)
            if arr.size and (np.any(arr < 0) or np.any(arr >= SYMBOLS)):
                raise ValueError("FastContextHead accepts original V17 7-bit sanitized text only")
            arrays.append(arr.astype(np.uint8, copy=False))
        lengths = np.fromiter((len(a) for a in arrays), dtype=np.int64, count=len(arrays))
        if not len(arrays) or not int(lengths.sum()):
            return None
        raw = np.concatenate(arrays)
        starts = np.cumsum(lengths) - lengths
        local_positions = np.arange(len(raw), dtype=np.int64) - np.repeat(starts, lengths)
        values = torch.as_tensor(raw.astype(np.int64), device=self.device)
        local = torch.as_tensor(local_positions, device=self.device)
        return values, local, lengths

    @staticmethod
    def _features(chars, within, order):
        positions = torch.nonzero(within >= order, as_tuple=False).flatten()
        if order == 0:
            return positions, chars[positions]
        if order == 1:
            key = chars[positions - 1]
        elif order == 2:
            key = chars[positions - 2] * SYMBOLS + chars[positions - 1]
        elif order == 3:
            key = ((chars[positions - 3] * 131 + chars[positions - 2]) * 131 +
                   chars[positions - 1]) % BUCKETS
        else:
            raise ValueError("Only 0..3 preceding-symbol contexts are implemented")
        return positions, key

    def _predict(self, chars, within, sample_stride=16):
        """Read model state BEFORE modifying any weights of the current batch."""
        count = int(chars.numel())
        sample = torch.arange(1, count, max(1, int(sample_stride)), device=self.device)
        if not sample.numel():
            return {"tested": 0, "correct": 0, "accuracy": None}
        y = chars[sample]
        unigram_prediction = int(torch.argmax(self.unigram).item())
        predictions = torch.full_like(y, unigram_prediction)
        for order in (1, 2, 3):
            valid = within[sample] >= order
            sampled_positions = sample[valid]
            if not sampled_positions.numel():
                continue
            if order == 1:
                k = chars[sampled_positions - 1]
            elif order == 2:
                k = chars[sampled_positions - 2] * SYMBOLS + chars[sampled_positions - 1]
            else:
                k = ((chars[sampled_positions - 3] * 131 +
                      chars[sampled_positions - 2]) * 131 +
                     chars[sampled_positions - 1]) % BUCKETS
            row = self.tables[order].index_select(0, k)
            known = row.sum(1) > 0
            values = row.argmax(dim=1).to(predictions.dtype)
            idx = torch.nonzero(valid, as_tuple=False).flatten()
            predictions[idx] = torch.where(known, values, predictions[idx])
        correct = int((predictions == y).sum().item())
        return {"tested": int(sample.numel()), "correct": correct,
                "accuracy": correct / int(sample.numel())}

    def train(self, exercises, sample_stride=16):
        begin = time.perf_counter()
        packed = self._packed(exercises)
        if packed is None:
            return {"engine": "bounded-context-0to3", "trainedChars": 0,
                    "trainedTargets": 0, "exercises": 0, "preUpdateTested": 0,
                    "preUpdateAccuracy": None, "device": str(self.device)}
        values, within, lengths = packed
        old_chars = self.chars
        scores = self._predict(values, within, sample_stride)
        # Explicitly accumulate EVERY real training character on the
        # selected PyTorch device. No fake count or CPU-only training.
        unique, multiplicity = torch.unique(values, return_counts=True)
        self.unigram.index_add_(0, unique, multiplicity.to(torch.int64))
        updates = 0
        for order in (1, 2, 3):
            positions, keys = self._features(values, within, order)
            if not int(positions.numel()):
                continue
            targets = values[positions]
            flat = keys * SYMBOLS + targets
            adds = torch.ones(flat.shape, dtype=torch.int32, device=self.device)
            self.tables[order].view(-1).index_add_(0, flat, adds)
            if order == 1:
                updates = int(flat.numel())
        if self.device.type == "cuda":
            torch.cuda.synchronize(self.device)
        chars = int(values.numel())
        self.chars += chars
        self.exercises += len(exercises)
        self.trained_targets += updates
        self.batches += 1
        elapsed = max(1e-9, time.perf_counter() - begin)
        return {"engine": "bounded-context-0to3", "device": str(self.device),
                "trainedChars": chars, "trainedTargets": updates,
                "exercises": len(exercises),
                "preUpdateTested": scores["tested"],
                "preUpdateCorrect": scores["correct"],
                "preUpdateAccuracy": scores["accuracy"],
                "cumulativeChars": self.chars,
                "cumulativeExercises": self.exercises,
                "batches": self.batches,
                "seconds": round(elapsed, 6),
                "charsPerSecond": round(chars / elapsed, 2),
                "megabytesPerSecond": round(chars / elapsed / 1e6, 6),
                "contextOrders": [0, 1, 2, 3],
                "algorithm": "actual teacher-forced observed n-gram counts, not original V17 long-suffix imagination"}

    def evaluate(self, exercises, sample_stride=1):
        packed = self._packed(exercises)
        if packed is None:
            return {"tested": 0, "correct": 0, "accuracy": None}
        values, within, _ = packed
        old = (self.chars, self.exercises, self.trained_targets, self.batches)
        result = self._predict(values, within, sample_stride)
        assert (self.chars, self.exercises, self.trained_targets, self.batches) == old
        return result

    def save(self, checkpoint):
        """Atomic sidecar snapshot; version and exact progress are checked at load."""
        dest = pathlib.Path(checkpoint)
        dest.parent.mkdir(parents=True, exist_ok=True)
        temporary = dest.with_suffix(dest.suffix + ".writing")
        payload = {"version": VERSION, "chars": self.chars,
                   "exercises": self.exercises,
                   "trained_targets": self.trained_targets,
                   "batches": self.batches, "unigram": self.unigram.cpu(),
                   "tables": {k: tensor.cpu() for k, tensor in self.tables.items()}}
        torch.save(payload, temporary)
        os.replace(temporary, dest)
        return {"bytes": dest.stat().st_size,
                "chars": self.chars, "exercises": self.exercises}

    def load(self, checkpoint):
        file = pathlib.Path(checkpoint)
        if not file.is_file():
            return {"loaded": False, "chars": 0, "exercises": 0}
        obj = torch.load(file, map_location="cpu", weights_only=True)
        if obj.get("version") != VERSION or sorted(obj["tables"]) != [1, 2, 3]:
            raise RuntimeError("Fast V17 context checkpoint version/shape mismatch")
        for order, table in self.tables.items():
            if tuple(table.shape) != tuple(obj["tables"][order].shape):
                raise RuntimeError("Fast V17 context checkpoint tensor shape mismatch")
        self.unigram.copy_(obj["unigram"].to(self.device))
        for k in self.tables:
            self.tables[k].copy_(obj["tables"][k].to(self.device))
        self.chars = int(obj["chars"])
        self.exercises = int(obj["exercises"])
        self.trained_targets = int(obj["trained_targets"])
        self.batches = int(obj["batches"])
        return {"loaded": True, "chars": self.chars,
                "exercises": self.exercises,
                "batches": self.batches}
