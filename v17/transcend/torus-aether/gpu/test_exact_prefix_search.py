"""PARITY GATE: original full-context V17 CUDA arithmetic, not a sidecar learner.

Runs the ORIGINAL TextCard and suffix Index with a PyTorch reference device,
then forces the exact fused algorithm in the same TextCard. No heuristics,
reduced context, altered trust weights, omitted imagination or synthetic UI.
"""
import unittest
from unittest.mock import patch
import numpy as np
import torch
from text_gpu import X, Index, TextCard
from exact_prefix_search import exact_prefix_ranges

def encoded(s):
    return np.frombuffer(s.encode("ascii"), dtype=np.uint8).astype(np.int64)

class ExactCUDAAlignmentParity(unittest.TestCase):
    def test_1000_seeded_suffix_searches_are_exact(self):
        X_ = X("cpu")
        for seed in range(1000):
            rng = np.random.default_rng(seed)
            n = int(rng.integers(2, 140))
            maxK = int(rng.integers(1, 14))
            Q = int(rng.integers(1, 8))
            memory = X_.arr(rng.integers(9, 15, size=n))
            index = Index(X_, memory)
            queries = np.full((Q, maxK), -2)
            for q in range(Q):
                if rng.random() < 0.6:
                    start = int(rng.integers(0, n))
                    length = min(maxK, n - start)
                    queries[q, :length] = index.R[start:start + length]
                else:
                    length = int(rng.integers(1, maxK + 1))
                    queries[q, :length] = rng.integers(9, 15, size=length)
            ctx = X_.arr(queries)
            original = index.align(X_, ctx, maxK)
            fused = exact_prefix_ranges(index, ctx, maxK)
            for a, b in zip(original, fused):
                self.assertTrue(torch.equal(a, b),
                                f"Exactness violated at seed {seed}, Q={Q}, depth={maxK}")
        print("V17_EXACT_FULL_CONTEXT_PARITY",{"seeds":1000,"result":"every LO and HI element identical"})

    def test_all_64_context_levels_with_overlapping_text(self):
        X_ = X("cpu")
        for s in ("abcde" * 22, "aaaaaaaaaab" * 9, "0123412ab" * 15):
            idx = Index(X_, X_.arr(encoded(s)))
            queries = np.full((8, 64), -2, dtype=np.int64)
            for q in range(8):
                prefix = encoded((s * 2)[q:q + 64])
                queries[q, :len(prefix)] = prefix
            ctx = X_.arr(queries)
            old = idx.align(X_, ctx, 64)
            new = exact_prefix_ranges(idx, ctx, 64)
            self.assertTrue(torch.equal(old[0], new[0]))
            self.assertTrue(torch.equal(old[1], new[1]))
        print("V17_ALL_64_CONTEXT_DEPTHS_EXACT",{"contexts":64, "samePredictions":True})

    def test_actual_original_text_card_full_algorithm_including_imagination_and_trust(self):
        # BOTH modes run the actual unchanged TextCard.live() that trains
        # suffix matching, forms, self-context, counterfactual variants,
        # imagination and trust. Only Index.align() dispatch differs.
        prefix = [encoded("state text from a world. " * 4)]
        exercises = [encoded("state changes direction while memory stays. " * 2),
                     encoded("direction changes when another state moves. " * 2)]
        cards = [TextCard("cpu", depth=3, form_depth=2, maxK=12,
                          S=8, max_memory=512) for _ in range(2)]
        for card in cards:
            card.append(prefix)
        trust = [["mem:0:0", 7, 10], ["form:0:0", 3, 10]]
        args = {"trust":trust,"g":5.0,"formW":1.1,"variants":[(4.0,0.8)],"chunk":32}
        original = cards[0].live(exercises, **args)
        old = Index.align
        def fused(self, X_, ctx, K):
            return exact_prefix_ranges(self, ctx, K)
        with patch.object(Index,"align",fused):
            updated = cards[1].live(exercises, **args)
        for field in ("trust","hits","seen","variants","memory","textWindowChars","totalCardChars"):
            self.assertEqual(updated[field], original[field],
                             "Original V17 prediction/trust/imagination changed: "+field)
        self.assertEqual(updated["fullOriginalMechanism"],True)
        self.assertEqual(original["fullOriginalMechanism"],True)
        self.assertTrue(torch.equal(cards[0].mem, cards[1].mem))
        self.assertTrue(torch.equal(cards[0].big.sa, cards[1].big.sa))
        self.assertGreater(original["seen"], 100)
        self.assertGreater(len(original["trust"]), 0)
        print("V17_FULL_ORIGINAL_TEXT_CARD_EXACT",
              {"trainedSymbols":original["seen"], "trustEntries":len(original["trust"]),
               "variantScoresEqual":updated["variants"]==original["variants"],
               "imaginationTrustEqual":True})

if __name__ == "__main__":
    unittest.main()
