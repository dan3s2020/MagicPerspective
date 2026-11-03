"""python -m unittest discover -s tests -v   (from v11/)"""
import json, os, sys, tempfile, threading, time, unittest, urllib.request
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, ROOT)
from engine.backend import NumpyBackend
from engine.portal import Brain, batch_graphs
from engine.life import Episode, run_episodes, live_step, predict, seed_of, summarize
from worlds import FAMILIES


class T(unittest.TestCase):
    def test_gradients(self):
        import subprocess
        out = subprocess.run([sys.executable, os.path.join(ROOT, 'tests', 'gradcheck.py')], capture_output=True, text=True, cwd=ROOT).stdout
        self.assertIn('worst relative error', out); self.assertLess(float(out.strip().split()[-1]), 0.02, out)

    def test_every_world_lives_through_the_same_network(self):
        b = Brain(seed=1)
        for fam, F in FAMILIES.items():
            e = run_episodes(b, [(fam, seed_of(5, 0), F['sizes'][0])], 'organ', learn=True, parallel=1, rng=np.random.default_rng(0), explore=.1)[0]
            self.assertIsNotNone(e.first, fam); self.assertGreater(e.t, 0, fam)
        fams = {m['family'] for m in b.label_meta}
        self.assertEqual(fams, set(FAMILIES))                       # one persistent graph holds the labels of every world

    def test_shape_before_first_action(self):
        b = Brain(seed=2); e = run_episodes(b, [('maze2d', 9, 7)], 'organ', record=True, parallel=1)[0]
        self.assertEqual(e.frames[0]['step'], 0); self.assertEqual(len(e.frames[0]['p']), 49)

    def test_no_hidden_map_in_the_input(self):
        """A2: what enters the network is the organism's perspective: never-seen cells are 'unknown', whatever is there."""
        e = Episode('maze2d', 123, 9); g = e.mind.graph()
        unseen = [i for i in range(81) if e.mind.cells[i] == -1]
        self.assertTrue(unseen)
        for i in unseen:
            self.assertIn('maze2d/unknown', g['labels'][i]); self.assertNotIn('maze2d/wall', g['labels'][i])

    def test_parallel_equals_single(self):
        """Many worlds in one pass give exactly what each world gives alone (messages never cross between worlds)."""
        b = Brain(seed=3); eps = [Episode(f, seed_of(9, i), FAMILIES[f]['sizes'][0]) for i, f in enumerate(['maze2d', 'sat', 'voter'])]
        together, _, _ = predict(b, eps, 'organ')
        for k, e in enumerate(eps):
            alone, _, _ = predict(b, [e], 'organ')
            self.assertLess(float(np.abs(alone[0]['p'] - together[k]['p']).max()), 1e-5)

    def test_unique_worlds_by_content(self):
        a, b, c = Episode('maze2d', 1, 7), Episode('maze2d', 1, 7), Episode('maze2d', 2, 7)
        self.assertEqual(a.world.content_hash(), b.world.content_hash()); self.assertNotEqual(a.world.content_hash(), c.world.content_hash())

    def test_brain_persists_with_its_graph(self):
        b = Brain(seed=4); run_episodes(b, [('sat', 3, 0), ('text', 4, 0)], 'organ', learn=True, parallel=2, rng=np.random.default_rng(1))
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'b.npz'); b.save(p); c = Brain.load(p)
        self.assertEqual(c.labels, b.labels); self.assertTrue(np.allclose(c.P['W'], b.P['W'])); self.assertEqual(c.updates, b.updates)

    def test_teacher_accepts_every_optimal_route(self):
        e = Episode('maze2d', 77, 9); y, yn, D = e.mind.target(); w = e.world
        a = w.bfs(e.mind.pos); g = w.bfs(w.goal)
        self.assertTrue(all((a[i] + g[i] == D) == bool(y[i]) for i in range(w.N) if not w.wall[i]))

    def test_server_http(self):
        import server
        with tempfile.TemporaryDirectory() as d:
            P = server.Portal(d, 'cpu'); srv = server.ThreadingHTTPServer(('127.0.0.1', 0), server.make_handler(P)); port = srv.server_address[1]
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            get = lambda p: json.loads(urllib.request.urlopen(f'http://127.0.0.1:{port}{p}').read())
            post = lambda p, b: json.loads(urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{port}{p}', json.dumps(b).encode(), {'Content-Type': 'application/json'})).read())
            self.assertEqual(get('/api/state')['version'], server.VERSION)
            ep = post('/api/show', {'family': 'voter', 'seed': 5}); self.assertTrue(ep['frames'])
            post('/api/train', {'families': ['maze2d', 'voter'], 'parallel': 3, 'control': True})
            t = time.time()
            while time.time() - t < 60 and P.train['done'] < 4: time.sleep(.5)
            post('/api/stop', {}); time.sleep(1.5)
            self.assertGreaterEqual(sum(v['unique'] for v in get('/api/state')['ledger'].values()), 4)
            self.assertTrue(get('/api/labels')['nodes']); srv.shutdown()


if __name__ == '__main__':
    unittest.main()
