import copy
import json
import math
import tempfile
import threading
import time
import unittest
import urllib.request
from pathlib import Path

import torch
from engine import (Graph, GraphController, PortalEngine, build_world, KINDS,
                    MAX_OBS, MAX_ACTIONS)
from corpus import Corpus,ingest
from server import Control,Handler,ThreadingHTTPServer

class PortalTests(unittest.TestCase):
    def test_real_different_worlds_and_hidden_truth_boundary(self):
        unique=set()
        for kind in KINDS[:-1]:
            for seed in (101,102,103):
                world=build_world(kind,seed)
                self.assertNotIn(world.fingerprint,unique)
                unique.add(world.fingerprint)
                obs,actions=world.observation()
                self.assertLessEqual(len(obs),MAX_OBS)
                self.assertLessEqual(len(actions),MAX_ACTIONS)
                self.assertTrue(actions)
                if kind=='maze3d':
                    self.assertNotIn('edges',obs)
                    self.assertFalse(any('hidden_path' in tag for tag in obs))
        self.assertEqual(len(unique),15)

    def test_single_graph_grows_across_worlds_and_learns_gradients(self):
        with tempfile.TemporaryDirectory() as d:
            p=PortalEngine(d,device='cpu',capacity=2048)
            initial=p.model.context.weight.detach().clone()
            r=p.episode_many(['maze3d','network','symbols','yesno','car'],batch_size=5)
            self.assertEqual(r['episodes'],5)
            self.assertEqual(p.status()['unique_worlds_verified_sqlite'],5)
            self.assertEqual(p.status()['unique_worlds_created'],5)
            self.assertGreater(p.graph.growth_events,10)
            self.assertGreater(len(p.graph.edges),10)
            self.assertGreater(p.model.context.weight.detach().sub(initial).abs().sum().item(),0)
            self.assertEqual(set(p.status()['domains']),{'maze3d','network','symbols','yesno','car'})
            f=p.last_trace
            for k in ['action','prediction','actual','error','gradient_norm','update_norm','activations','messages','growth']:
                self.assertIn(k,f)
            self.assertTrue(all('from' in m and 'to' in m and 'strength' in m for m in f['messages']))
            self.assertTrue(any(len(n['domains'])>1 for n in p.graph.nodes))
            p.close()

    def test_duplicates_not_counted_and_checkpoint_resume(self):
        with tempfile.TemporaryDirectory() as d:
            p=PortalEngine(d,'cpu',capacity=2048)
            p.episode_many(['yesno','maze3d'],batch_size=4)
            p.save();nodes=len(p.graph.nodes);episodes=p.episodes
            before=p.model.context.weight.detach().clone();p.close()
            q=PortalEngine(d,'cpu',capacity=2048)
            self.assertEqual(q.episodes,episodes)
            self.assertEqual(len(q.graph.nodes),nodes)
            self.assertTrue(torch.allclose(q.model.context.weight,before))
            self.assertEqual(q.status()['unique_worlds_verified_sqlite'],4)
            # Reinsert an already stored task: sqlite rejects duplicate identity.
            a=q.db.execute('SELECT hash,domain,seed FROM worlds LIMIT 1').fetchone()
            cur=q.db.execute('INSERT OR IGNORE INTO worlds(hash,domain,seed) VALUES(?,?,?)',a)
            self.assertEqual(cur.rowcount,0)
            q.close()

    def test_blind_evaluation_preserves_learner(self):
        with tempfile.TemporaryDirectory() as d:
            p=PortalEngine(d,'cpu',capacity=2048)
            p.episode_many(['yesno','symbols'],batch_size=2)
            before=p.model.context.weight.detach().clone()
            nodes=len(p.graph.nodes);episodes=p.episodes
            blind=p.evaluate(['yesno','symbols'],count=6)
            self.assertEqual(blind['trained']['worlds'],6)
            self.assertEqual(blind['untrained']['worlds'],6)
            self.assertEqual(p.episodes,episodes)
            self.assertEqual(len(p.graph.nodes),nodes)
            self.assertTrue(torch.equal(p.model.context.weight,before))
            p.close()

    def test_correspondence_and_real_prediction_mismatch(self):
        with tempfile.TemporaryDirectory() as d:
            p=PortalEngine(d,'cpu',capacity=2048)
            w=build_world('yesno',52)
            frames=p.step_many([w],record=True)
            f=frames[0]
            self.assertAlmostEqual(f['error'],abs(f['prediction']-f['target']),places=5)
            self.assertEqual(f['actual']['effect'] in ('correct','incorrect'),True)
            self.assertGreaterEqual(f['gradient_norm'],0)
            self.assertEqual(f['device'],'cpu')
            p.close()

    def test_real_text_from_local_files_and_content_hash(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'raw.jsonl'
            path.write_text(json.dumps({'text':'In the beginning all observations create a graph.'})+'\n',encoding='utf-8')
            converted=ingest(path,Path(d)/'cache');corpus=Corpus(converted['path'])
            p=PortalEngine(Path(d)/'state',device='cpu',capacity=2048,corpus=corpus)
            task=build_world('text',123,corpus)
            obs,opts=task.observation()
            self.assertEqual(len(opts),8)
            self.assertTrue(all(a.startswith('BYTE/') for a in opts))
            self.assertNotIn('target',obs)
            p.episode_many(['text'],batch_size=3)
            self.assertEqual(p.status()['unique_worlds_verified_sqlite'],3)
            p.close();corpus.close()

    def test_real_http_start_stop_trace_and_save(self):
        with tempfile.TemporaryDirectory() as d:
            e=PortalEngine(d,'cpu',capacity=2048)
            control=Control(e)
            Handler.control=control
            srv=ThreadingHTTPServer(('127.0.0.1',0),Handler)
            t=threading.Thread(target=srv.serve_forever,daemon=True);t.start()
            base=f'http://127.0.0.1:{srv.server_port}'
            def req(path,obj=None):
                if obj is None:
                    with urllib.request.urlopen(base+path,timeout=10) as x:return json.load(x)
                data=json.dumps(obj).encode()
                request=urllib.request.Request(base+path,data=data,method='POST',headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(request,timeout=10) as x:return json.load(x)
            self.assertTrue(req('/api/health')['ok'])
            req('/api/start',{'domains':['yesno','symbols'],'batch_size':2,'autosave_every':2})
            limit=time.time()+10
            while req('/api/status')['episodes']<2 and time.time()<limit:time.sleep(.05)
            req('/api/stop',{})
            if control.worker:control.worker.join(timeout=15)
            status=req('/api/status');self.assertGreaterEqual(status['episodes'],2)
            self.assertIn('nodes',req('/api/graph'))
            self.assertTrue(req('/api/traces?limit=2'))
            self.assertEqual(status['state'],'stopped')
            srv.shutdown();srv.server_close();e.close()

if __name__=='__main__': unittest.main()
