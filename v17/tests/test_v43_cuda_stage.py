"""V43 GPU-resident text staging parity against unchanged TextCard baseline.

CPU/NumPy CI validates exact result and transactional stage ownership. CUDA
is separately benchmarked on the user's actual RTX; never invent utilization.
"""
import pathlib
import sys
import unittest
import numpy as np

GPU = pathlib.Path(__file__).resolve().parents[1] / "transcend/torus-aether/gpu"
sys.path.insert(0, str(GPU))
from text_gpu import TextCard

class V43StageTests(unittest.TestCase):
    def rows(self):
        return [
            np.asarray([81,58,32,65,10,65,58,32,66,10,10], dtype=np.int64),
            np.asarray([81,58,32,66,10,65,58,32,65,10,10], dtype=np.int64)
        ]
    def test_staged_equals_original_exact(self):
        original=TextCard("numpy",max_memory=256)
        resident=TextCard("numpy",max_memory=256)
        rows=self.rows()
        prepared=resident.stage_v43("original-dataset-row-1",rows)
        self.assertEqual(prepared["stagedRows"],2)
        self.assertEqual(prepared["residentBatches"],1)
        a=original.live(rows,[],chunk=32)
        b=resident.live(rows,[],chunk=32,stage_id="original-dataset-row-1")
        self.assertEqual(a,b,"GPU placement may not change the native learning algorithm")
        self.assertEqual(len(resident._v43_staged),0)
        self.assertTrue(np.array_equal(original.mem,resident.mem))
    def test_hard_cap_no_wrong_text(self):
        card=TextCard("numpy",max_memory=256)
        rows=self.rows()
        for i in range(3):
            card.stage_v43("row-"+str(i),rows)
        with self.assertRaises(RuntimeError):
            card.stage_v43("row-4",rows)
        with self.assertRaises(RuntimeError):
            card.live([np.asarray([1,2,3],dtype=np.int64)],[],stage_id="row-0")
        self.assertNotIn("row-0",card._v43_staged)
        self.assertEqual(card.unstage_v43("row-1")["removed"],True)
        self.assertEqual(card.unstage_v43("row-1")["removed"],False)

    def test_python_reader_stages_next_text_while_prior_training_command_is_running(self):
        # Real asynchronous control-flow test, using NumPy as a deterministic
        # placement backend. The previous training handler intentionally waits
        # for the future batch to be staged; a serial reader would deadlock.
        import io
        import json
        import threading
        import time
        import worlds_gpu
        ready=threading.Event()
        card=TextCard("numpy",max_memory=256)
        original_stage=card.stage_v43
        def stage_and_signal(token,exs):
            out=original_stage(token,exs)
            ready.set()
            return out
        card.stage_v43=stage_and_signal
        class FakeServer:
            text=card
            B=type("Backend",(),{"torch":False,"device":"numpy"})()
            def handle(self,request):
                if request["cmd"]!="text_learn":raise AssertionError("unexpected command")
                if not ready.wait(3):
                    raise AssertionError("No concurrent V43 producer: CUDA starved")
                return {"priorBatchCompleted":True}
        protocol=[
            {"id":1,"cmd":"text_learn","exercises":[[65,66,67]]},
            {"id":2,"cmd":"text_stage","token":"future-original-row",
             "exercises":[[81,58,32,66,10],[81,58,32,67,10]]}
        ]
        previous_in,previous_out=sys.stdin,sys.stdout
        try:
            sys.stdin=io.StringIO("".join(json.dumps(x)+"\n" for x in protocol))
            output=io.StringIO();sys.stdout=output
            worlds_gpu.serve_v43_concurrent_prefetch(FakeServer())
            responses=[json.loads(line) for line in output.getvalue().splitlines()]
        finally:
            sys.stdin=previous_in;sys.stdout=previous_out
        self.assertEqual(len(responses),2)
        self.assertEqual({r["id"] for r in responses},{1,2})
        self.assertTrue(any(r.get("concurrentPlacement") for r in responses))
        self.assertTrue(ready.is_set())
        self.assertIn("future-original-row",card._v43_staged)

if __name__=="__main__":
    unittest.main()
