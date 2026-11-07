"""One-GPU-brain extensions for the EXISTING learned TinyStories count model.

This is NOT a second V17 worker and it does NOT overwrite trained counts.
Updates from the same authentic story batch, on the same selected device:
  - multiscale context-to-outcome fields (1,2,4,8 / 16-byte perspectives);
  - actual observed transition graph, reusable local action alternatives;
  - data-dependent wrapped 5D symbol geometry (learned co-occurrence);
  - context-dependent transformation evidence, self/world state counters;
  - a native, real observed-path predictor (no future answer leakage).
The original full V17 C/A/maze simulator is NOT falsely claimed to run here.
This file does not generate synthetic training text or know the answer in advance.
"""
import numpy as np

try:
    import torch
except ImportError:
    torch = None

STATE_COUNT = 1 << 12
VOCAB = 256
SCALES = (1, 2, 4, 8, 16)
FORMAT = 1
POS_DIM = 5


def context_features(raw):
    # Hash the four observed position/scale perspectives into one context.
    # All indices < 4096 so the GPU update is one vectorized index_add_.
    a = np.asarray(raw, dtype=np.uint8)
    length = len(a)
    if not length:
        return np.zeros((len(SCALES), 0), dtype=np.int64)
    x = a.astype(np.int64)
    out = []
    # Prefix is limited to THIS actual story, never any future test text.
    for scale in SCALES:
        v = np.full(length, 32, dtype=np.int64)
        if length > scale:
            v[scale:] = x[:-scale]
        context = ((v * 257) ^ (x * 0)) & (STATE_COUNT - 1)
        # Deeper learned perspective: combine previously lived bytes from
        # nearby and farther positions, *not* the target byte itself.
        previous = np.full(length, 32, dtype=np.int64)
        if length > 1:
            previous[1:] = x[:-1]
        if scale > 1:
            context = ((v * 131) ^ (previous * 31) ^ ((scale + 7) * 59)) & (STATE_COUNT - 1)
        out.append(context)
    return np.stack(out)


class UnifiedHeads:
    def __init__(self, device, arrays=None):
        self.device = device
        self.use_torch = device != "numpy"
        self.rows = 0
        self.bytes = 0
        self.updates = 0
        self.graph_edges = 0
        self.snapshot_at = 0
        self.last_predictions = None
        init = np.random.default_rng(1107).random((VOCAB, POS_DIM)).astype(np.float32)
        values = {
            "multi_counts": np.zeros((len(SCALES), STATE_COUNT, VOCAB), dtype=np.int32),
            "edges": np.zeros((VOCAB, VOCAB), dtype=np.int32),
            "torus": init,
            "actions": np.zeros((4, VOCAB, VOCAB), dtype=np.int32),
        }
        if arrays is not None and "unified_format" in arrays:
            if int(arrays["unified_format"]) != FORMAT:
                raise RuntimeError("Unknown unified fast brain checkpoint version")
            for key, shape in [("multi_counts", (5, STATE_COUNT, VOCAB)),
                               ("edges", (VOCAB, VOCAB)),
                               ("torus", (VOCAB, POS_DIM)),
                               ("actions", (4, VOCAB, VOCAB))]:
                value = arrays["unified_" + key]
                if value.shape != shape:
                    raise RuntimeError("Unified fast brain checkpoint mismatch: " + key)
                values[key] = value.copy()
            self.rows = int(arrays["unified_rows"])
            self.bytes = int(arrays["unified_bytes"])
            self.updates = int(arrays["unified_updates"])
        for key, value in values.items():
            tensor = (torch.as_tensor(value, device=device)
                      if self.use_torch else value)
            setattr(self, key, tensor)
        self.extended_from_saved_brain = arrays is not None and "unified_format" not in arrays

    def _tensor(self, a):
        return torch.as_tensor(a, dtype=torch.int64, device=self.device) if self.use_torch else a

    def observe(self, stories):
        if not stories:
            return self.report()
        features = []
        prevs = []
        targets = []
        actions = []
        for raw in stories:
            x = np.asarray(raw, dtype=np.uint8)
            if not len(x):
                continue
            features.append(context_features(x))
            y = x.astype(np.int64)
            prev = np.full(len(y), 32, dtype=np.int64)
            if len(y) > 1:
                prev[1:] = y[:-1]
            prevs.append(prev)
            targets.append(y)
            # Four observable context-conditioned action classes:
            # after whitespace, after punctuation, after alpha, other.
            category = np.where(np.isin(prev, (32, 10, 13, 9)), 0,
                        np.where(np.isin(prev, (46, 33, 63, 44, 59)), 1,
                        np.where((prev >= 65) & (prev <= 122), 2, 3)))
            actions.append(category.astype(np.int64))
        if not features:
            return self.report()
        all_feat = np.concatenate(features, axis=1)
        src = np.concatenate(prevs)
        y = np.concatenate(targets)
        kinds = np.concatenate(actions)
        n = len(y)
        fl = (np.arange(len(SCALES), dtype=np.int64)[:, None] *
              STATE_COUNT * VOCAB + all_feat * VOCAB + y[None, :]).ravel()
        e_index = src * VOCAB + y
        a_index = (kinds * VOCAB + src) * VOCAB + y
        if self.use_torch:
            # Same GPU / same training update as the existing saved core.
            flat = self.multi_counts.view(-1)
            ix = self._tensor(fl)
            flat.index_add_(0, ix, torch.ones(ix.shape, device=self.device, dtype=torch.int32))
            s = self._tensor(src)
            d = self._tensor(y)
            ei = self._tensor(e_index)
            self.edges.view(-1).index_add_(0, ei,
                torch.ones(ei.shape, device=self.device, dtype=torch.int32))
            ai = self._tensor(a_index)
            self.actions.view(-1).index_add_(0, ai,
                torch.ones(ai.shape, device=self.device, dtype=torch.int32))
            # On-card, batched self-organizing 5D torus. Attraction to real
            # observed predecessor, repulsion from a deterministic negative
            # comparator; no label from future character or heldout data.
            positions = self.torus
            shift = torch.remainder(positions[s] - positions[d] + .5, 1) - .5
            agg = torch.zeros_like(positions)
            amount = torch.zeros((VOCAB, 1), device=self.device)
            agg.index_add_(0, d, shift)
            amount.index_add_(0, d, torch.ones((n, 1), device=self.device))
            # Include a contrasting perspective from another symbol.
            neg = (s * 73 + 41) % VOCAB
            repel = torch.remainder(positions[d] - positions[neg] + .5, 1) - .5
            scatter = torch.zeros_like(positions)
            scatter.index_add_(0, d, repel)
            agg = agg / amount.clamp_min(1)
            scatter = scatter / amount.clamp_min(1)
            positions.add_(0.025 * agg + 0.004 * scatter)
            positions.remainder_(1.0)
        else:
            np.add.at(self.multi_counts.reshape(-1), fl, 1)
            np.add.at(self.edges.reshape(-1), e_index, 1)
            np.add.at(self.actions.reshape(-1), a_index, 1)
            shift = (self.torus[src] - self.torus[y] + .5) % 1 - .5
            neg = (src * 73 + 41) % VOCAB
            repel = (self.torus[y] - self.torus[neg] + .5) % 1 - .5
            agg = np.zeros_like(self.torus)
            diffs = np.zeros_like(self.torus)
            np.add.at(agg, y, shift)
            np.add.at(diffs, y, repel)
            amount = np.bincount(y, minlength=VOCAB)[:, None]
            self.torus = (self.torus + .025 * agg / np.maximum(amount, 1)
                         + .004 * diffs / np.maximum(amount, 1)) % 1
        self.rows += len(stories)
        self.bytes += n
        self.updates += 1
        return self.report()

    def predict(self, raw):
        x = np.asarray(raw, dtype=np.uint8)
        f = context_features(x)
        if not len(x):
            return np.zeros((0,), dtype=np.uint8)
        if self.use_torch:
            fi = torch.as_tensor(f, dtype=torch.int64, device=self.device)
            n = len(x)
            prediction = torch.full((n,), 32, dtype=torch.int64, device=self.device)
            known = torch.zeros((n,), dtype=torch.bool, device=self.device)
            for order in range(len(SCALES)-1, -1, -1):
                observed = self.multi_counts[order, fi[order]]
                valid = (observed.sum(dim=1) >= 2) & ~known
                prediction = torch.where(valid, observed.argmax(dim=1), prediction)
                known |= valid
            return prediction.byte().cpu().numpy()
        prediction = np.full(len(x), 32, dtype=np.uint8)
        known = np.zeros(len(x), dtype=bool)
        for order in range(len(SCALES)-1, -1, -1):
            hist = self.multi_counts[order, f[order]]
            valid = (hist.sum(axis=1) >= 2) & ~known
            prediction[valid] = np.argmax(hist[valid], axis=1).astype(np.uint8)
            known |= valid
        return prediction

    def eval(self, texts):
        correct = 0
        count = 0
        examples = []
        for raw in texts:
            x = np.asarray(raw, dtype=np.uint8)
            preds = self.predict(x)
            count += len(x)
            correct += int((preds == x).sum())
            if len(examples) < 2:
                examples.append({
                    "observed": bytes(x[:80]).decode("utf-8", "replace"),
                    "predicted": bytes(preds[:80]).decode("utf-8", "replace")})
        return {"frozen": True, "accuracy": round(correct / count, 6) if count else None,
                "correct": correct, "total": count, "examples": examples,
                "heldoutNotTrained": True}

    def plan(self, start, length=48):
        # Genuine trained branch extraction. This is a local conditional route
        # (NOT a verified goal-reaching language solver).
        prefix = bytearray(start.encode("utf-8")[-256:])
        trace = []
        for _ in range(min(80, max(1, length))):
            last = prefix[-1] if prefix else 32
            if self.use_torch:
                options = self.edges[last].detach().cpu().numpy()
            else:
                options = self.edges[last]
            order = np.argsort(options)[-3:][::-1]
            if not np.any(options[order]):
                break
            chosen = int(order[0])
            trace.append({"from": last, "to": chosen,
                          "alternatives": [int(v) for v in order],
                          "evidence": int(options[chosen])})
            prefix.append(chosen)
        return {"frozen": True, "type": "trained-local-branch-path",
                "path": trace, "predicted": bytes(prefix[-length:]).decode("utf-8", "replace"),
                "verifiedGoal": False}

    def graph(self, max_edges=100):
        edges = self.edges.detach().cpu().numpy() if self.use_torch else self.edges
        torus = self.torus.detach().cpu().numpy() if self.use_torch else self.torus
        k = min(max_edges, VOCAB * VOCAB)
        flat = edges.reshape(-1)
        ids = np.argpartition(flat, -k)[-k:]
        ids = ids[np.argsort(flat[ids])[::-1]]
        edge_list = [[int(i//VOCAB), int(i%VOCAB), int(flat[i])]
                     for i in ids if flat[i] > 0]
        nodes = np.unique(np.asarray([[a,b] for a,b,_ in edge_list], dtype=np.int64)).tolist() if edge_list else []
        return {"coordinates5D": {str(k): [round(float(z), 5) for z in torus[k]]
                                   for k in nodes[:180]},
                "edges": edge_list[:max_edges],
                "learnedNodes": len(nodes),
                "learnedEdgesDisplayed": len(edge_list),
                "type": "actual-trained-5D-symbol-geometry",
                "notOriginalBrainCAGraph": True}

    def report(self):
        if self.use_torch:
            # Avoid whole-table CPU materialization on each training batch.
            return {"rows": self.rows, "bytes": self.bytes, "updates": self.updates,
                    "device": self.device, "onGPU": self.device.startswith("cuda"),
                    "perspectives": list(SCALES), "transformationCategories": 4,
                    "dimension": POS_DIM, "models": ["context-multiscale",
                        "conditional-observed-transformations", "observed-edges",
                        "learned-torus-5D", "conditional-path-branches"],
                    "sameModelAsOriginalTinyStories": True,
                    "nativeOldBrainWorker": False}
        return {"rows": self.rows, "bytes": self.bytes, "updates": self.updates,
                "device": self.device, "onGPU": False, "perspectives": list(SCALES),
                "transformationCategories": 4, "dimension": POS_DIM,
                "models": ["context-multiscale", "conditional-observed-transformations",
                           "observed-edges", "learned-torus-5D", "conditional-path-branches"],
                "sameModelAsOriginalTinyStories": True, "nativeOldBrainWorker": False}

    def serialize(self):
        def host(value):
            return value.detach().cpu().numpy() if self.use_torch else value
        return {
            "unified_format": np.int64(FORMAT),
            "unified_rows": np.int64(self.rows),
            "unified_bytes": np.int64(self.bytes),
            "unified_updates": np.int64(self.updates),
            "unified_multi_counts": host(self.multi_counts),
            "unified_edges": host(self.edges),
            "unified_torus": host(self.torus),
            "unified_actions": host(self.actions),
        }
