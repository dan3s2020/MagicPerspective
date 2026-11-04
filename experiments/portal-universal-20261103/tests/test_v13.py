"""V13 full 4D solid-torus viewer: no subset-as-whole misleading display."""
import json
import subprocess
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

from engine import Graph, PortalEngine
from server import Control, Handler, ThreadingHTTPServer
from toroid import inside_solid_torus4


class FullTorusTests(unittest.TestCase):
    def test_all_real_vertices_and_edges_paginate_beyond_previous_900_limit(self):
        graph=Graph(2500)
        for i in range(1400):
            id_,created=graph.ensure(f'OBS/measured-{i}', 'sensor','maze3d',
                                     evidence={'observation':'test-fixture','source_step':i})
            self.assertTrue(created)
            if id_>1:graph.link(id_-1,id_,'observed',domain='maze3d')
        self.assertEqual(len(graph.nodes),1401)
        all_ids=[]; all_edges=[]; nc=ec=0
        for _ in range(5):
            page=graph.view_page(node_offset=nc,node_limit=430,
                                 edge_offset=ec,edge_limit=470)
            all_ids.extend(n['id'] for n in page['nodes'])
            all_edges.extend((e['from'],e['to'],e['type']) for e in page['edges'])
            nc,ec=page['next_node_offset'],page['next_edge_offset']
            if page['complete']:break
        self.assertEqual(all_ids,list(range(len(graph.nodes))))
        self.assertEqual(len(all_edges),len(graph.edges))
        self.assertEqual(len(all_edges),len(set(all_edges)))
        self.assertTrue(all(inside_solid_torus4(n['p4']) for n in graph.nodes))
        self.assertLessEqual(len(graph.view(limit=900)['nodes']),900)
        self.assertGreater(len(all_ids),900)
        graph2=Graph.restore(graph.state())
        self.assertEqual(graph2.view_page(node_offset=880,node_limit=521,
                edge_offset=999,edge_limit=500)['nodes'][-1]['id'],1400)

    def test_full_graph_endpoint_only_returns_persistent_graph_facts(self):
        with tempfile.TemporaryDirectory() as d:
            engine=PortalEngine(d,'cpu',capacity=2048)
            for i in range(1050):
                a,_=engine.graph.ensure(f'OBS/real-entry-{i}','sensor','network',
                                        evidence={'source':'regression-event','ordinal':i})
                if i:engine.graph.link(a-1,a,'observed',domain='network')
            c=Control(engine)
            Handler.control=c
            srv=ThreadingHTTPServer(('127.0.0.1',0),Handler)
            thread=threading.Thread(target=srv.serve_forever,daemon=True)
            thread.start()
            base=f'http://127.0.0.1:{srv.server_port}'
            try:
                with urllib.request.urlopen(base+'/api/graph/all?node_offset=0&node_limit=800&edge_offset=0&edge_limit=800') as response:
                    one=json.load(response)
                with urllib.request.urlopen(base+f'/api/graph/all?node_offset={one["next_node_offset"]}&node_limit=800&edge_offset={one["next_edge_offset"]}&edge_limit=800') as response:
                    two=json.load(response)
                self.assertEqual(one['schema'],'portal.graph.all.v1')
                self.assertEqual(one['total_nodes'],1051)
                self.assertEqual(one['total_edges'],1049)
                self.assertEqual(len(one['nodes'])+len(two['nodes']),1051)
                self.assertEqual(len(one['edges'])+len(two['edges']),1049)
                self.assertEqual(one['nodes'][0]['id'],0)
                self.assertTrue(two['complete'])
            finally:
                srv.shutdown();srv.server_close();thread.join(timeout=3);engine.close()

    def test_curved_graph_edges_remain_inside_toroidal_interior(self):
        # The source HTML's 4D rotations are used for VIEW. An actual edge
        # must not be rendered as a straight chord through the torus hole.
        a=[2.40,0.0,0.20,-0.10]
        b=[-2.39,0.21,-0.20,0.10]
        js=Path(__file__).resolve().parents[1]/'web/torus-view.js'
        script=("const vm=require('node:vm'),fs=require('node:fs');"
                "const x={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),x);"
                "console.log(JSON.stringify(x.window.PortalTorusView.torusArc("
                +json.dumps(a)+","+json.dumps(b)+")));")
        out=subprocess.run(['node','-e',script,str(js)],capture_output=True,text=True)
        self.assertEqual(out.returncode,0,out.stderr)
        from toroid import inside_solid_torus4
        points=json.loads(out.stdout)
        self.assertGreater(len(points),2)
        self.assertTrue(all(inside_solid_torus4(p) for p in points),points)

    def test_browser_keeps_legacy_controls_and_adds_whole_torus_and_slice(self):
        base=Path(__file__).resolve().parents[1]
        html=(base/'web/index.html').read_text(encoding='utf8')
        app=(base/'web/app.js').read_text(encoding='utf8')
        render=(base/'web/torus-view.js').read_text(encoding='utf8')
        server=(base/'server.py').read_text(encoding='utf8')
        for text in ['data-mode="3d"','data-mode="torus"','data-mode="4d"',
                     'id="sliceW"','id="torusTheta"','id="resetDialog"',
                     'id="start"','id="timeline"','id="graph"']:
            self.assertIn(text,html)
        self.assertIn('<script src="torus-view.js"></script><script src="app.js"></script>',html)
        self.assertIn('mode=\'torus\'',app)
        self.assertIn('/api/graph/all',app)
        self.assertIn('max=\"2.7\"',html)
        self.assertIn("('/index.html','/style.css','/app.js','/torus-view.js')",server)
        self.assertIn('S¹ × B³',html)
        self.assertIn('clipSlab',render)
        self.assertIn('settings.nodes',render)
        self.assertIn('settings.edges',render)
        self.assertNotIn('Math.random(',render)
        for file in ['web/app.js','web/torus-view.js']:
            r=subprocess.run(['node','--check',str(base/file)],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stderr)


if __name__=='__main__':unittest.main()
