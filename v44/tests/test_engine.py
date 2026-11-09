"""V44 isolated unit tests. Synthetic donor is used ONLY in CPU CI, never product."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import FrozenGeometry, StreamLearner


class V44EngineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name)
        rng = np.random.default_rng(44)
        rows = rng.standard_normal((256, 8)).astype("float32")
        rows /= np.linalg.norm(rows, axis=1, keepdims=True)
        axes = np.eye(8, dtype="float32")
        self.atlas = self.folder / "synthetic-CI-NOT-QWEN.json"
        self.atlas.write_text(json.dumps({
            "format": "braivour/v42-brain-character/v1",
            "source_genuine_gguf": False,
            "provenance": {"donor_path": "SYNTHETIC UNIT TEST; NO REAL GGUF"},
            "output_rows": rows.tolist(),
            "movement_axes": axes.tolist(),
        }), encoding="utf8")
        self.device = torch.device("cpu")

    def tearDown(self):
        self.temp.cleanup()

    def make_geo(self):
        return FrozenGeometry(self.atlas, self.device, allow_synthetic_for_test=True)

    def test_production_rejects_synthetic(self):
        with self.assertRaisesRegex(ValueError, "Real Qwen"):
            FrozenGeometry(self.atlas, self.device)

    def test_geometry_all_targets(self):
        g = self.make_geo()
        self.assertEqual(g.rank, 8)
        self.assertEqual(g.reachable, 65536)
        self.assertTrue(torch.all(g.lookup).item())

    def test_real_model_update_and_preserved_resume(self):
        g = self.make_geo()
        path = self.folder / "checkpoint.pt"
        learner = StreamLearner(g, self.device, path)
        train = [
            {"id": 0, "prompt": "What is a reusable transformation?", "answer": ("abc abc abcd " * 1024)},
            {"id": 1, "prompt": "Tell me about different symbols.", "answer": ("The answer is a new learned combination. " * 900)},
            {"id": 2, "prompt": "Explain a code repair transformation.", "answer": ("fix(tree) -> verified tests pass\n" * 500)}
        ]
        rows, elapsed = learner.train_batch(train)
        self.assertEqual(len(rows), 3)
        self.assertEqual(learner.total_exercises, 3)
        self.assertEqual(learner.last_row_index, 2)
        self.assertGreater(elapsed, 0)
        for row in rows:
            self.assertEqual(row["shape_verified"], row["shape_total"])
            self.assertEqual(row["bytes"], len(row["before_bytes"]) * 0 + len(row["answer"].encode()))
            self.assertEqual(len(__import__("base64").b64decode(row["before_mask"])), row["bytes"])
            self.assertEqual(len(__import__("base64").b64decode(row["shape_mask"])), row["bytes"])
            self.assertEqual(len(__import__("base64").b64decode(row["after_mask"])), row["bytes"])
        self.assertGreater(int(learner.context_counts.sum().item()), 0)
        self.assertGreater(float(torch.linalg.vector_norm(learner.operator)), 0.0)
        heldout=[{"id": 22,"prompt":"Unseen new prompt","answer":"new new new answer"}]
        original_weight_sum=int(learner.context_counts.sum().item())
        score=learner.eval_holdout(heldout)
        self.assertEqual(score["bytes"],len(heldout[0]["answer"].encode()))
        self.assertEqual(original_weight_sum,int(learner.context_counts.sum().item()),
                         "Unseen data must never train the model")
        saved=learner.save()
        self.assertTrue(Path(saved["saved"]).is_file())
        restored=StreamLearner(g,self.device,path,resume=True)
        self.assertEqual(restored.total_exercises,3)
        self.assertEqual(restored.last_row_index,2)
        self.assertTrue(torch.equal(restored.context_counts,learner.context_counts))
        generated=restored.generate("Unseen text prompt",24)
        self.assertEqual(generated["bytes"],24)
        self.assertFalse(generated["reference_supplied"])

    def test_reset_archives_original_checkpoint(self):
        g=self.make_geo()
        model=StreamLearner(g,self.device,self.folder/"state.pt")
        model.train_batch([{"id":10,"prompt":"Hello","answer":"abcdef abcdef"}])
        model,archive=model.reset_with_archive()
        self.assertTrue(Path(archive).is_file())
        self.assertEqual(model.total_exercises,0)
        self.assertEqual(model.last_row_index,-1)
        self.assertEqual(StreamLearner(g,self.device,Path(archive)).total_exercises,1)


if __name__=="__main__":
    unittest.main(verbosity=2)
