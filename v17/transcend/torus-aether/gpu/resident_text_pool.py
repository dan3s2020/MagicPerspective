"""Original V17 native TextCard: persistent prefetch pool of real future TRAIN
examples in GPU VRAM. Not a new token predictor, not a dummy VRAM filler.

Maintains a bounded FIFO of immutable source bytes on the selected device and
mirrored small CPU raw bytes for ORIGINAL TextCard.live().  Entries are removed
ONLY after the original Brain has acknowledged a successful commit.  A query
may inspect RAW future text with an explicit "transductive" provenance; it may
NOT silently count that evidence as an unseen prediction or train the native
trust prior to the original commit.

A long single example may exceed budget -> explicit exception (never drop it).
Torch page tensors stay resident across requests. No reallocation/reindex of
the entire pool when each next batch completes. This is not a replacement for
the original history suffix index in TextCard.
"""
from collections import OrderedDict
import numpy as np
try:
    import torch
except ImportError:
    torch = None


class ResidentTextPool:
    def __init__(self, device, max_bytes, max_exercises=512):
        self.device = device
        self.torch = bool(torch is not None and str(device).startswith("cuda"))
        self.max_bytes = max(256, int(max_bytes))
        self.max_exercises = max(1, min(8192, int(max_exercises)))
        self.entries = OrderedDict()
        self.bytes = 0
        self.peak_bytes = 0
        self.bytes_ever_pushed = 0
        self.bytes_ever_committed = 0
        self.exercises_committed = 0
        self._nonce = 1

    def _tensor(self, raw):
        a = np.frombuffer(raw, dtype=np.uint8).copy()
        if self.torch:
            # Actual CUDA-resident bytes, not a fake count or CPU tensor.
            return torch.as_tensor(a, dtype=torch.uint8, device=self.device)
        return a

    def add(self, entries):
        """One RPC batch. Entire addition is prevalidated before mutations."""
        pending = []
        seen = set()
        required = 0
        for e in entries:
            k = str(e["id"])
            raw = bytes(e["raw"])
            if not k or k in self.entries or k in seen:
                raise ValueError("duplicate or invalid resident text ID " + k)
            if len(raw) < 1:
                raise ValueError("resident text exercises must be nonempty")
            if len(raw) > self.max_bytes:
                raise MemoryError("one text exercise exceeds actual VRAM pool budget")
            seen.add(k)
            pending.append((k, raw))
            required += len(raw)
        if self.bytes + required > self.max_bytes:
            raise MemoryError("resident pool full: cannot evict uncommitted exercise")
        if len(self.entries) + len(pending) > self.max_exercises:
            raise MemoryError("resident exercise slots full: no unsafe eviction")
        # Build the device tensors first. Existing resident items stay unchanged
        # if CUDA OOM raises partway through the batch.
        prepared = [(k, raw, self._tensor(raw)) for k, raw in pending]
        for k, raw, device in prepared:
            self.entries[k] = (raw, device)
        self.bytes += required
        self.bytes_ever_pushed += required
        self.peak_bytes = max(self.peak_bytes, self.bytes)
        return self.status()

    def get(self, ids):
        keys = [str(x) for x in ids]
        if len(set(keys)) != len(keys):
            raise ValueError("same exercise requested twice before commit")
        if not keys or any(k not in self.entries for k in keys):
            raise KeyError("requested exercise not resident in CUDA lookahead pool")
        # Exact ORIGINAL ASCII byte values/shape expected by TextCard.live().
        # CPU mirror avoids copying the same symbols BACK from GPU on every
        # native Python self-index construction.
        return [list(self.entries[k][0]) for k in keys]

    def commit(self, ids):
        """Called only AFTER original native Brain acknowledges successful save.
        FIFO: never discard a still-future exercise to make room.
        """
        keys = [str(x) for x in ids]
        if not keys or list(self.entries.keys())[:len(keys)] != keys:
            raise ValueError("commit must match the oldest uncommitted exercises")
        released = 0
        for k in keys:
            raw, gpu = self.entries.pop(k)
            released += len(raw)
            del gpu
        self.bytes -= released
        self.bytes_ever_committed += released
        self.exercises_committed += len(keys)
        return self.status()

    def status(self):
        return {
            "residentBytes": self.bytes,
            "residentMB": round(self.bytes / 1e6, 5),
            "budgetMB": round(self.max_bytes / 1e6, 5),
            "residentExercises": len(self.entries),
            "maxResidentExercises": self.max_exercises,
            "peakResidentBytes": self.peak_bytes,
            "bytesEverPushed": self.bytes_ever_pushed,
            "bytesEverCommitted": self.bytes_ever_committed,
            "committedExercises": self.exercises_committed,
            "device": str(self.device),
            "physicallyCudaResident": self.torch,
            "futureBytesAreNotTrained": True,
            "futureTextIsNotBlindUnseen": True,
        }

    def probe_raw_future(self, context, max_hits=32):
        """Read-only real future substrings. Never used by native training/trust.
        Verified next-char evidence can be used for TRANSDUCTIVE studies only.
        Never crosses an exercise boundary. No target/truth is supplied.
        """
        q = bytes(context)
        if not q or len(q) > 64:
            raise ValueError("Future text probe requires 1..64 ASCII bytes")
        if len(self.entries) == 0:
            return {"counts": {}, "hits": 0, "provenance": [],
                    "transductive": True, "futureAnswersVisible": True}
        # GPU vectorized exact 1..8-byte substring test. Longer histories
        # are verified with CPU byte search over the small pending windows
        # (no fabricated GPU acceleration for that corner case).
        hist = {}
        origins = []
        hits = 0
        k = min(len(q), 8)
        needle = np.frombuffer(q[-k:], dtype=np.uint8)
        for id_, (raw, gpu) in self.entries.items():
            n = len(raw)
            if n <= len(q):
                continue
            if self.torch and k <= 8:
                # Small number of device kernels, not one per candidate byte.
                view = gpu.unfold(0, k + 1, 1)
                prefix = torch.as_tensor(needle, dtype=torch.uint8, device=self.device)
                matched = (view[:, :k] == prefix).all(dim=1)
                positions = torch.nonzero(matched, as_tuple=False).flatten()
                offsets = positions.detach().cpu().numpy()
            else:
                # On CPU, bytes.find is implemented in C and exact; all
                # comparisons are verified against full context below.
                offsets = []
                start = 0
                while True:
                    at = raw.find(q[-k:], start)
                    if at < 0 or at + k >= len(raw):
                        break
                    offsets.append(at)
                    start = at + 1
            for at in offsets:
                # When k<full context, exact full-context check avoids
                # hash collisions and fabricated longer-range matches.
                at = int(at)
                if at + k < len(q):
                    continue
                if raw[at + k - len(q):at + k] != q:
                    continue
                symbol = raw[at + k]
                hist[symbol] = hist.get(symbol, 0) + 1
                hits += 1
                if len(origins) < max_hits:
                    origins.append({"id": id_, "offset": at,
                                    "symbol": symbol, "contextLength": len(q)})
        return {
            "counts": hist, "hits": hits, "provenance": origins,
            "transductive": True,
            "source": "physically CUDA-resident FUTURE corpus exercises; not committed to native Brain",
            "futureAnswersVisible": True,
            "nativeTrustUpdated": False,
        }
