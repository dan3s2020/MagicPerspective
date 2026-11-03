"""V12 regression: actual four-spatial-D toroidal slices, live traces, full reset."""
import json
import math
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from engine import Graph, PortalEngine
from corpus import Corpus
from server import Control, Handler, ThreadingHTTPServer
from toroid import MINOR_RADIUS, MAJOR_RADIUS, inside_solid_torus4, section_intersection


class PortalV12Tests(unittest.TestCase):
    def test_four_spatial_dimensional_nodes_are_inside_solid_torus(self):
        graph=Graph(2000)
        for i in range(100):
            graph.ensure('OBS/example'+str(i),'sensor','maze3d')
            graph.ensure('REL/example'+str(i),'relation','network')
            graph.ensure('TEMP/example'+str(i),'temporal','text')
        self.assertEqual(len(graph.nodes),301)
        self.assertTrue(all(len(n['p4'])==4 and inside_solid_torus4(n['p4']) for n in graph.nodes))
        self.assertTrue(any(abs(n['p4'][3])>.1 for n in graph.nodes))
        self.assertTrue(any(n['dimension']==4 for n in graph.nodes))
        restored=Graph.restore(graph.state())
        self.assertEqual([x['p4'] for x in restored.nodes],[x['p4'] for x in graph.nodes])
        self.assertEqual(restored.view(limit=350)['nodes'][0]['p4'], graph.nodes[0]['p4'])
        self.assertLess(MINOR_RADIUS,MAJOR_RADIUS)

    def test_section_intersections_come_only_from_real_4d_edges(self):
        a=[MAJOR_RADIUS,0,0,-.4]
        b=[MAJOR_RADIUS,0,.4,.4]
        r=section_intersection(a,b,0)
        self.assertIsNotNone(r)
        self.assertAlmostEqual(r[2],.2)
        self.assertEqual(r[3],0)
        self.assertIsNone(section_intersection(a,b,.5))
        self.assertIsNone(section_intersection(a,a,0))

    def test_live_trace_available_before_long_episode_batch_finishes(self):
        with tempfile.TemporaryDirectory() as d:
            p=PortalEngine(d,'cpu',capacity=2048)
            session=p.begin_episode_many(['maze3d','car'],2)
            first=p.advance_episode_many(session,capture=True)
            self.assertEqual(p.episodes,0)
            self.assertGreater(p.steps,0)
            events=p.traces_since(0,limit=8)
            self.assertGreater(len(events['frames']),0)
            self.assertTrue(all('trace_id' in x and 'messages' in x for x in events['frames']))
            self.assertTrue(all('growth' in x and 'actual' in x for x in events['frames']))
            self.assertEqual(events['next_cursor'],events['frames'][-1]['trace_id'])
            while not session['complete']:
                p.advance_episode_many(session,capture=True)
            self.assertEqual(p.episodes,2)
            self.assertEqual(p.status()['unique_worlds_verified_sqlite'],2)
            p.close()

    def test_reset_clears_training_checkpoints_replay_and_cached_corpus_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            source=root/'original_text.txt'
            source.write_text('This is the ORIGINAL corpus outside the project. '*10,encoding='utf-8')
            folder=root/'v12-data'
            p=PortalEngine(folder,'cpu',capacity=2048)
            control=Control(p)
            control.set_corpus(str(source))
            p.episode_many(['maze3d','symbols'],2,capture=True)
            p.save()
            self.assertTrue((folder/'brain.pt').exists())
            self.assertTrue((folder/'corpora').exists())
            self.assertGreater(p.status()['episodes'],0)
            self.assertTrue(p.recent(5))
            old_graph=p.graph.nodes
            result=control.reset_all()
            self.assertGreater(result['old']['episodes'],0)
            self.assertEqual(p.episodes,0)
            self.assertEqual(p.steps,0)
            self.assertEqual(len(p.graph.nodes),1)
            self.assertEqual(len(p.graph.edges),0)
            self.assertEqual(p.recent(5),[])
            self.assertEqual(p.traces_since(0)['frames'],[])
            self.assertFalse((folder/'brain.pt').exists())
            self.assertFalse((folder/'corpus.json').exists())
            self.assertFalse((folder/'corpora').exists())
            self.assertIsNone(control.corpus_meta)
            self.assertIsNone(p.corpus)
            self.assertTrue(source.is_file())
            self.assertIn('ORIGINAL',source.read_text())
            self.assertEqual(control.state,'idle')
            p.close()
            reopened=PortalEngine(folder,'cpu',capacity=2048)
            self.assertEqual(reopened.episodes,0)
            self.assertEqual(reopened.status()['unique_worlds_verified_sqlite'],0)
            self.assertEqual(len(reopened.graph.nodes),1)
            reopened.close()

    def test_reset_http_requires_explicit_confirm_and_rejects_live_training(self):
        with tempfile.TemporaryDirectory() as d:
            engine=PortalEngine(d,'cpu',capacity=2048)
            control=Control(engine)
            Handler.control=control
            srv=ThreadingHTTPServer(('127.0.0.1',0),Handler)
            t=threading.Thread(target=srv.serve_forever,daemon=True);t.start()
            base='http://127.0.0.1:'+str(srv.server_port)
            def post(data):
                q=urllib.request.Request(base+'/api/reset',data=json.dumps(data).encode('utf8'),
                                         method='POST',headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(q,timeout=10) as out:return json.load(out)
            try:
                with self.assertRaises(urllib.error.HTTPError) as x:post({'confirm':'RESET'})
                self.assertEqual(x.exception.code,400)
                self.assertEqual(engine.episodes,0)
                control.state='running'
                with self.assertRaises(urllib.error.HTTPError) as x:post({'confirm':'RESET TOT'})
                self.assertEqual(x.exception.code,400)
                control.state='idle'
                result=post({'confirm':'RESET TOT'})
                self.assertTrue(result['project_data_cleared'])
            finally:
                srv.shutdown();srv.server_close();t.join(timeout=3);engine.close()

    def test_web_contains_interior_slice_animation_and_reset_controls(self):
        base=Path(__file__).resolve().parents[1]
        html=(base/'web/index.html').read_text(encoding='utf8')
        js=(base/'web/app.js').read_text(encoding='utf8')
        for text in ['id="sliceW"','id="sliceThickness"','id="torusTheta"',
                     'id="resetDialog"','id="confirmReset"','id="eventPhase"']:
            self.assertIn(text,html)
        for text in ['sectionIntersects','/api/traces?after=','/api/reset',
                     'idx===3','idx===4','f.messages','4D']:
            self.assertIn(text,js)


if __name__=='__main__':unittest.main()
