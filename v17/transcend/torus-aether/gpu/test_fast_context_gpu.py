"""Prove the optional fast head genuinely learns ALL characters, has no
heldout leakage and atomically survives a restart. CPU reference in CI;
actual RTX3050 CUDA hardware must be measured on the user's laptop."""
import os
import pathlib
import tempfile
import unittest

from fast_context_gpu import FastContextHead, torch, BUCKETS, SYMBOLS


def encode(s):
    return list(s.encode("ascii"))


class FastTextTest(unittest.TestCase):
    def test_exactly_all_training_chars_update_real_device_counters(self):
        h = FastContextHead("cpu")
        rows = [encode("abracadabra " * 19), encode("abcde " * 31), encode("hello world " * 7)]
        r = h.train(rows, sample_stride=1)
        count = sum(map(len, rows))
        self.assertEqual(r["device"], "cpu")
        self.assertEqual(r["trainedChars"], count)
        self.assertEqual(r["trainedTargets"], count - len(rows))
        self.assertEqual(int(h.unigram.sum().item()), count)
        self.assertEqual(int(h.tables[1].sum().item()), count - len(rows))
        self.assertEqual(int(h.tables[2].sum().item()), count - len(rows) * 2)
        self.assertEqual(int(h.tables[3].sum().item()), count - len(rows) * 3)
        self.assertEqual(r["cumulativeExercises"], len(rows))
        print("FAST_TEXT_ALL_REAL_CHARS_TRAINED", r)

    def test_preupdate_accuracy_improves_and_heldout_is_not_trained(self):
        h = FastContextHead("cpu")
        held = [encode("the quick brown fox jumps over the lazy dog. " * 8)]
        before = h.evaluate(held)
        memory = (h.chars, h.exercises, h.trained_targets)
        for i in range(6):
            r = h.train([encode("the quick brown fox jumps over the lazy dog. " * 12)])
            self.assertEqual(r["cumulativeExercises"], i + 1)
        after = h.evaluate(held)
        self.assertEqual(before["tested"], after["tested"])
        self.assertGreater(after["accuracy"], before["accuracy"] + 0.2)
        # The heldout example never updates weights or progress metadata.
        self.assertEqual(h.exercises, 6)
        self.assertEqual(h.chars, sum([len(encode("the quick brown fox jumps over the lazy dog. " * 12)) for _ in range(6)]))
        self.assertNotEqual(h.chars, memory[0])
        print("FAST_TEXT_FROZEN_HELDOUT_GAIN", {"before": before, "after": after})

    def test_resume_reuses_real_weights_without_retraining_from_zero(self):
        h = FastContextHead("cpu")
        h.train([encode("ab cd " * 120)])
        with tempfile.TemporaryDirectory() as directory:
            save = pathlib.Path(directory) / "fast-context.pt"
            info = h.save(save)
            self.assertTrue(save.is_file())
            self.assertGreater(info["bytes"], 1024)
            restored = FastContextHead("cpu")
            state = restored.load(save)
            self.assertTrue(state["loaded"])
            self.assertEqual(restored.chars, h.chars)
            self.assertEqual(restored.exercises, h.exercises)
            for order in (1, 2, 3):
                self.assertTrue(torch.equal(restored.tables[order], h.tables[order]))
            self.assertTrue(torch.equal(restored.unigram, h.unigram))
            e = [encode("ab cd " * 17)]
            self.assertEqual(restored.evaluate(e), h.evaluate(e))
            restored.train(e)
            self.assertEqual(restored.exercises, 2)

    def test_no_silent_fake_cuda_when_unavailable(self):
        if not torch.cuda.is_available():
            with self.assertRaisesRegex(RuntimeError, "CUDA not available"):
                FastContextHead("cuda:0")

    def test_non_ascii_input_is_rejected_instead_of_leaking_heldout_unicode(self):
        h = FastContextHead("cpu")
        with self.assertRaisesRegex(ValueError, "7-bit sanitized"):
            h.train([[ord("A"), 130, ord("B")]])

    def test_batched_data_does_not_mix_contexts_across_independent_exercises(self):
        h = FastContextHead("cpu")
        a = [encode("a" * 50), encode("b" * 50)]
        h.train(a)
        self.assertEqual(int(h.tables[1][ord("a"), ord("b")].item()), 0)
        self.assertEqual(int(h.tables[1][ord("a"), ord("a")].item()), 49)
        self.assertEqual(int(h.tables[1][ord("b"), ord("b")].item()), 49)


if __name__ == "__main__":
    unittest.main()
