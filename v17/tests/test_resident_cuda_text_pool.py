"""Tests ACTUAL original V17 native GPU server API in CPU NumPy backend
(CI has no NVIDIA), with no substitute learner, fake results, or held-out
data leakage. Running on user's CUDA device is a separate release gate.
"""
import base64
import importlib.util
import pathlib
import unittest
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
GPU = ROOT / "transcend" / "torus-aether" / "gpu"
spec = importlib.util.spec_from_file_location("original_v17_worlds_gpu", GPU / "worlds_gpu.py")
import sys
sys.path.insert(0, str(GPU))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
from resident_text_pool import ResidentTextPool
from text_gpu import TextCard


def original_row(prompt, answer):
    return ("Q: "+prompt+"\nA: "+answer+"\n\n").encode("ascii")


def encoded(rows):
    return [{"id": key, "b64": base64.b64encode(value).decode("ascii")}
            for key, value in rows]


class RealResidentCudaPoolTests(unittest.TestCase):
    def test_byte_identical_fifo_holds_future_text_and_removes_only_committed(self):
        p = ResidentTextPool("numpy", max_bytes=1024, max_exercises=8)
        future = original_row("future", "transform pearl into diamond")
        past = original_row("now", "transform stone into stone")
        r = p.add([{"id": "row:1", "raw": past},
                   {"id": "row:2", "raw": future}])
        self.assertEqual(r["residentBytes"], len(past)+len(future))
        self.assertEqual(r["residentExercises"], 2)
        self.assertEqual(r["committedExercises"], 0)
        self.assertTrue(r["futureBytesAreNotTrained"])
        self.assertTrue(r["futureTextIsNotBlindUnseen"])
        self.assertEqual(p.get(["row:1","row:2"]), [list(past), list(future)])
        self.assertRaises(ValueError, p.commit, ["row:2"])
        self.assertEqual(p.status()["residentExercises"], 2)
        result = p.commit(["row:1"])
        self.assertEqual(result["residentBytes"], len(future))
        self.assertEqual(result["committedExercises"], 1)
        self.assertEqual(p.get(["row:2"]), [list(future)])
        result = p.commit(["row:2"])
        self.assertEqual(result["residentBytes"], 0)
        self.assertEqual(result["committedExercises"], 2)

    def test_future_transformations_can_be_observed_but_never_train_original_trust(self):
        future = original_row("convert", "abacus becomes glass")
        pool = ResidentTextPool("numpy", max_bytes=4096)
        card = TextCard("numpy", max_memory=512)
        card.append([np.array(list(original_row("past", "abacus is wood")))])
        before_seen = card.total_seen
        before_memory = card.indexed
        r = pool.add([{"id":"future","raw":future}])
        original = pool.probe_raw_future(b"abacus", max_hits=8)
        self.assertTrue(original["transductive"])
        self.assertTrue(original["futureAnswersVisible"])
        self.assertFalse(original["nativeTrustUpdated"])
        self.assertGreater(original["hits"],0)
        self.assertEqual(original["counts"][32],1)
        self.assertEqual(original["provenance"][0]["id"],"future")
        self.assertEqual(card.total_seen,before_seen)
        self.assertEqual(card.indexed,before_memory)
        self.assertEqual(pool.status()["committedExercises"],0)

    def test_capacity_and_duplicate_rejection_are_atomic(self):
        pool = ResidentTextPool("numpy", max_bytes=500, max_exercises=4)
        future = b"x"*230
        pool.add([{"id":"x","raw":future}])
        previous = pool.status()
        with self.assertRaises(MemoryError):
            pool.add([{"id":"y","raw":b"y"*200},
                      {"id":"z","raw":b"z"*200}])
        self.assertEqual(pool.status(),previous)
        with self.assertRaises(ValueError):
            pool.add([{"id":"x","raw":b"a"}])
        self.assertEqual(pool.status(),previous)
        with self.assertRaises(KeyError):
            pool.get(["fake"])
        self.assertEqual(pool.status(),previous)

    def test_actual_original_gpu_server_textcard_learns_same_exercise_from_resident_ids_as_legacy_bytes(self):
        # This is the actual worlds_gpu.Server.handle route and original
        # TextCard.live(), not a fake learning success response.
        history = original_row("known", "hope transforms into shape")
        train1 = original_row("one", "hope becomes light")
        train2 = original_row("two", "hope becomes form")
        future = original_row("untrained three", "hope becomes crystal")
        server = mod.Server()
        server.handle({"cmd":"init","device":"cpu","textPoolMB":1})
        staged = server.handle({"cmd":"text_pool_add",
            "entries":encoded([("row:1",train1),("row:2",train2),("row:3",future)])})
        self.assertEqual(staged["textPool"]["residentExercises"],3)
        self.assertEqual(staged["textPool"]["bytesEverCommitted"],0)
        self.assertFalse(staged["textPool"]["physicallyCudaResident"])
        self.assertIsNone(server.text)
        loaded = server.handle({"cmd":"text_load","b64":base64.b64encode(history).decode("ascii")})
        self.assertEqual(loaded["memory"],len(history))
        control = TextCard("numpy", max_memory=server.text_limit)
        control.append([np.frombuffer(history,dtype=np.uint8)])
        same = server.handle({"cmd":"text_learn","ids":["row:1","row:2"],
                              "trust":[],"g":8.0,"formW":1.0,"chunk":64})
        original = control.live([list(train1),list(train2)],trust=[],g=8.,
                                formW=1.0,chunk=64)
        for field in ("seen","hits","trust","memory","totalCardChars","variants"):
            self.assertEqual(same[field],original[field],field)
        self.assertEqual(server.text.total_seen,control.total_seen)
        np.testing.assert_array_equal(server.text.big.sa,control.big.sa)
        np.testing.assert_array_equal(server.text.fbig.sa,control.fbig.sa)
        self.assertEqual(server.text_pool.status()["residentExercises"],3,
                         "V17 must not evict before Brain acknowledgement")
        server.handle({"cmd":"text_pool_commit","ids":["row:1","row:2"]})
        self.assertEqual(server.text_pool.status()["residentExercises"],1)
        self.assertEqual(server.text_pool.status()["committedExercises"],2)
        self.assertEqual(server.text_pool.get(["row:3"]),[list(future)])
        self.assertEqual(server.text.total_seen,len(history)+len(train1)+len(train2),
                         "future answer never trained into native trust")

    def test_empty_pool_probes_report_no_future_evidence_not_hallucinations(self):
        p = ResidentTextPool("numpy", max_bytes=1024)
        r = p.probe_raw_future(b"future")
        self.assertEqual(r["hits"],0)
        self.assertEqual(r["counts"],{})
        self.assertEqual(r["provenance"],[])
        self.assertRaises(ValueError,p.probe_raw_future,b"")
        self.assertRaises(ValueError,p.probe_raw_future,b"A"*65)


if __name__=="__main__":
    unittest.main()
