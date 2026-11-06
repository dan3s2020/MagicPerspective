"""Regression tests for V17's bounded CUDA text working set (NumPy parity path)."""
import base64
import unittest
import numpy as np
from text_gpu import TextCard
from worlds_gpu import Server

class TextWindowTests(unittest.TestCase):
    def test_append_retains_recent_symbols_and_rebuilds_at_fixed_length(self):
        card = TextCard("numpy", max_memory=256, maxK=8, S=4)
        card.append([np.arange(200, dtype=np.int64) % 126])
        self.assertEqual(card.total_seen, 200)
        card.append([np.arange(200, 350, dtype=np.int64) % 126])
        self.assertEqual(len(card.mem), 256)
        self.assertEqual(card.total_seen, 350)
        self.assertEqual(card.mem.tolist(), (np.arange(94, 350) % 126).tolist())
        self.assertEqual(card.indexed, 256)
        self.assertEqual(card.big.n, 256)
        old = card.mem.copy()
        card.append([np.arange(350, 360, dtype=np.int64) % 126])
        self.assertEqual(card.total_seen, 360)
        self.assertNotEqual(old.tolist(), card.mem.tolist())
        self.assertEqual(card.big.n, 256)

    def test_live_is_transactional_and_reports_window(self):
        card = TextCard("numpy", max_memory=256, maxK=8, S=4)
        card.append([[97, 98, 97, 98, 99, 10]])
        res = card.live([[97, 98, 97, 98]], [], chunk=32)
        self.assertEqual(res["seen"], 3)
        self.assertEqual(res["textWindowChars"], 256)
        self.assertEqual(res["totalCardChars"], 10)
        self.assertLessEqual(res["memory"], 256)

    def test_server_protocol_keeps_text_on_bounded_working_set(self):
        server = Server()
        info = server.handle({"cmd": "init", "device": "numpy", "util": 100})
        self.assertEqual(info["autoText"], 2)
        server.text_limit = 256
        data = bytes([65, 66, 67] * 100)
        loaded = server.handle({"cmd": "text_load", "b64": base64.b64encode(data).decode("ascii")})
        self.assertEqual(loaded["memory"], 256)
        result = server.handle({"cmd": "text_learn", "exercises": [[65, 66, 67, 65]],
                                "trust": [], "chunk": 32})
        self.assertEqual(result["textChunk"], 32)
        self.assertEqual(result["seen"], 3)
        self.assertLessEqual(result["memory"], 256)
        self.assertEqual(result["totalCardChars"], 304)

if __name__ == "__main__":
    unittest.main()
