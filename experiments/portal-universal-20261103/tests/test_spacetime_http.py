"""HTTP contract: real Portal graph + trace, original routes remain available."""
import json
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import PortalEngine
from server import Control, Handler, ThreadingHTTPServer


class SpacetimeHTTPTests(unittest.TestCase):
    def test_original_dashboard_and_read_only_history_routes(self):
        with tempfile.TemporaryDirectory() as folder:
            engine=PortalEngine(folder,'cpu',capacity=2048)
            try:
                # Valid captured event shaped like PortalEngine.step_many output.
                frame={'event_seq':1,'global_step':1,'step':1,'domain':'network',
                       'active':[0], 'messages':[], 'growth':{'born':[]},
                       'actual':{'effect':'ok'}, 'error':0.1,'update_norm':0.02}
                engine.db.execute('INSERT INTO trace(episode,frame) VALUES(?,?)',
                                  (1,json.dumps(frame)))
                engine.db.commit()
                Handler.control=Control(engine)
                server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
                thread=threading.Thread(target=server.serve_forever,daemon=True)
                thread.start()
                base='http://127.0.0.1:'+str(server.server_port)
                def get(path):
                    with urllib.request.urlopen(base+path,timeout=5) as response:
                        return response.read().decode('utf-8'),response.headers.get_content_type()
                try:
                    portal,_=get('/')
                    self.assertIn('id="start"',portal)
                    self.assertIn('EXPLORATOR 5D / TIMP',portal)
                    viewer,mime=get('/spacetime.html')
                    self.assertIn('SPAȚIU–TIMP',viewer)
                    self.assertEqual(mime,'text/html')
                    for route in ('/spacetime.js','/spacetime-core.mjs'):
                        js,mime=get(route)
                        self.assertIn('text/javascript',mime)
                        self.assertTrue(len(js)>100)
                    meta,_=get('/api/spacetime/meta')
                    self.assertEqual(json.loads(meta)['total'],1)
                    raw,_=get('/api/spacetime/window?start=1&end=1&bins=8')
                    win=json.loads(raw)
                    self.assertEqual(win['visible_total'],1)
                    self.assertEqual(win['events'][0]['trace_id'],1)
                    self.assertTrue(win['complete'])
                    old,_=get('/api/health')
                    self.assertTrue(json.loads(old)['ok'])
                    self.assertEqual(engine.db.execute('SELECT COUNT(*) FROM trace').fetchone()[0],1)
                finally:
                    server.shutdown();server.server_close();thread.join(timeout=3)
            finally:
                engine.close()


if __name__=='__main__':unittest.main()
