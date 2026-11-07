"""GPU-owned, streaming learned text context counts (EXPERIMENTAL fast algorithm).

This is a genuine fitted 1-4-symbol conditional predictor with all evidence
counted on selected CUDA device in one vectorized pass, NOT the six-scale V17
suffix-index AligningGraph. The original learner stays available as default.

Four explicit perspective orders 1..4. Orders 3/4 are *hashed*; hash
collisions are disclosed. Frozen evaluation never trains. Atomic .npz
checkpoint + monotonically numbered corpus rows allow crash-safe replay of
uncommitted text, not unacknowledged duplicate training.
"""
import os
import time
import base64
import numpy as np

try:
    import torch
except ImportError:
    torch = None

STATE_BITS = 16
STATES = 1 << STATE_BITS
VOCAB = 256
ORDERS = 4
PAD = 32
FORMAT = 1


def text_features(raw):
    """Actual observed symbol context, per exercise, never reference answers."""
    x = np.asarray(raw, dtype=np.uint8)
    n = len(x)
    if not n:
        return np.zeros((ORDERS, 0), dtype=np.int64), x.astype(np.int64)
    a = []
    y = x.astype(np.int64)
    for distance in (1, 2, 3, 4):
        prev = np.full(n, PAD, dtype=np.int64)
        if n > distance:
            prev[distance:] = y[:-distance]
        a.append(prev)
    v1, v2, v3, v4 = a
    # Order 2 has no collisions: 256**2=65536, exactly the space size.
    return np.stack([v1,
                     (v2 * VOCAB + v1),
                     (v3 * 131 * 131 + v2 * 131 + v1) & (STATES - 1),
                     (v4 * 131 * 131 * 131 + v3 * 131 * 131 +
                      v2 * 131 + v1) & (STATES - 1)]), y


class StreamingFastText:
    """One CUDA model per original V17 worker; count transitions, not fakes."""
    def __init__(self, device="numpy", checkpoint=None, resume=False):
        self.device = device
        self.use_torch = device != "numpy"
        if self.use_torch:
            if torch is None:
                raise RuntimeError("Requested PyTorch fast text without torch")
            if device.startswith("cuda") and not torch.cuda.is_available():
                raise RuntimeError("Fast text CUDA requested but unavailable; no fallback")
        self.checkpoint = checkpoint
        self.table = (torch.zeros((ORDERS, STATES, VOCAB),
                                  dtype=torch.int32, device=device)
                      if self.use_torch else
                      np.zeros((ORDERS, STATES, VOCAB), dtype=np.int32))
        self.last_index = -1
        self.chars = 0
        self.rows = 0
        self.saved_at_chars = 0
        self.loaded = False
        self.last_checkpoint_time = None
        if resume and checkpoint and os.path.exists(checkpoint):
            with np.load(checkpoint, allow_pickle=False) as data:
                if int(data["format"]) != FORMAT:
                    raise RuntimeError("Unknown fast text saved model version")
                counts = data["counts"]
                if counts.shape != (ORDERS, STATES, VOCAB):
                    raise RuntimeError("Fast text checkpoint shape mismatch")
                self.table = (torch.as_tensor(counts.copy(), dtype=torch.int32,
                                              device=device) if self.use_torch else
                              counts.copy())
                self.last_index = int(data["last_index"])
                self.chars = int(data["chars"])
                self.rows = int(data["rows"])
                self.saved_at_chars = self.chars
                self.loaded = True

    def _batch(self, values):
        if not values:
            return 0
        flat_indices = []
        for row in values:
            feats, y = text_features(row)
            if not len(y):
                continue
            for order in range(ORDERS):
                flat_indices.append(order * STATES * VOCAB + feats[order] * VOCAB + y)
        if not flat_indices:
            return 0
        ix = np.concatenate(flat_indices)
        if self.use_torch:
            index = torch.as_tensor(ix, dtype=torch.int64, device=self.device)
            # All four observed n-gram perspectives learn at once on the GPU.
            self.table.view(-1).index_add_(0, index,
                                           torch.ones(index.shape,
                                                      dtype=torch.int32,
                                                      device=self.device))
        else:
            np.add.at(self.table.reshape(-1), ix, 1)
        return len(ix) // ORDERS

    def train(self, observations):
        """Rows: [{'index':dataset row number,'bytes':real ASCII list}].
        Duplicate committed rows are skipped on resume. No fabricated text.
        """
        fresh = []
        latest = self.last_index
        for row in observations:
            index = int(row["index"])
            if index <= latest:
                continue
            raw = (np.frombuffer(base64.b64decode(row["b64"]), dtype=np.uint8)
                   if "b64" in row else np.asarray(row["bytes"], dtype=np.uint8))
            if index <= self.last_index:
                continue
            fresh.append(raw)
            latest = index
        t0 = time.perf_counter()
        n = self._batch(fresh)
        if fresh:
            self.rows += len(fresh)
            self.chars += n
            self.last_index = latest
        if self.use_torch and self.device.startswith("cuda"):
            torch.cuda.synchronize()
        busy = time.perf_counter() - t0
        return {"rows": len(fresh), "chars": n, "duplicates":
                len(observations) - len(fresh), "totalRows": self.rows,
                "totalChars": self.chars, "lastIndex": self.last_index,
                "busy": round(busy, 5), "algorithm":
                "observed-hashed-context-1to4", "device": self.device,
                "gpuWeightsUpdated": bool(fresh and self.use_torch and
                                          self.device.startswith("cuda")),
                "savedChars": self.saved_at_chars}

    def _selected_counts(self, features):
        n = features.shape[1]
        if not n:
            return np.zeros((0,), dtype=np.int64)
        # Score only on frozen model. Prefer deepest seen context with >=2
        # observations; otherwise use shorter learned contexts.
        if self.use_torch:
            index = torch.as_tensor(features, dtype=torch.int64,
                                    device=self.device)
            row = torch.arange(n, device=self.device)
            candidate = torch.full((n,), PAD, device=self.device,
                                   dtype=torch.int64)
            accepted = torch.zeros(n, device=self.device, dtype=torch.bool)
            for order in range(ORDERS - 1, -1, -1):
                hist = self.table[order, index[order]]
                sufficient = (hist.sum(dim=1) >= 2) & ~accepted
                selected = torch.argmax(hist, dim=1)
                candidate = torch.where(sufficient, selected, candidate)
                accepted |= sufficient
            return candidate.cpu().numpy()
        candidate = np.full(n, PAD, dtype=np.int64)
        accepted = np.zeros(n, dtype=bool)
        for order in range(ORDERS - 1, -1, -1):
            hist = self.table[order, features[order]]
            sufficient = (hist.sum(axis=1) >= 2) & ~accepted
            candidate[sufficient] = np.argmax(hist[sufficient], axis=1)
            accepted |= sufficient
        return candidate

    def evaluate(self, rows, preview=72):
        """No table writes. These rows MUST be held-out by the Node caller."""
        seen = 0
        hits = 0
        examples = []
        for raw in rows:
            features, y = text_features(raw)
            pred = self._selected_counts(features)
            seen += len(y)
            hits += int((pred == y).sum())
            if len(examples) < 3:
                take = min(int(preview), len(y))
                examples.append({
                    "actual": bytes(np.asarray(y[:take], dtype=np.uint8)).decode("utf-8", errors="replace"),
                    "predicted": bytes(np.asarray(pred[:take], dtype=np.uint8)).decode("utf-8", errors="replace")})
        return {"seen": seen, "hits": hits,
                "accuracy": round(hits / seen, 6) if seen else None,
                "frozen": True, "algorithm": "observed-hashed-context-1to4",
                "examples": examples}

    def save(self):
        if not self.checkpoint:
            return {"saved": False, "reason": "no checkpoint path"}
        target = os.path.abspath(self.checkpoint)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        temp = target + ".tmp"
        if self.use_torch:
            arr = self.table.detach().cpu().numpy()
        else:
            arr = self.table
        # Numpy save without compression: fast, lossless, portable across
        # CUDA/CPU, and no unsafe Python pickle is loaded.
        with open(temp, "wb") as f:
            np.savez(f, format=np.int64(FORMAT),
                     counts=arr, last_index=np.int64(self.last_index),
                     chars=np.int64(self.chars), rows=np.int64(self.rows))
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, target)
        self.saved_at_chars = self.chars
        self.last_checkpoint_time = time.time()
        return {"saved": True, "savedChars": self.saved_at_chars,
                "lastIndex": self.last_index,
                "bytes": os.path.getsize(target), "path": target}

    def status(self):
        return {"mode": "fast-conditional-context-1to4",
                "algorithm": "observed-hashed-context-1to4",
                "device": self.device, "gpu": self.device.startswith("cuda"),
                "rows": self.rows, "chars": self.chars,
                "savedChars": self.saved_at_chars,
                "lastIndex": self.last_index, "resumeLoaded": self.loaded,
                "perspectives": 4, "hashStatesPerOrder": STATES,
                "collisionsOrder3And4": True,
                "fullOriginalSixScaleAligner": False,
                "checkpoint": bool(self.checkpoint)}
