"""No PyTorch needed: tests are read-only against the real trace schema."""
import json
import sqlite3
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from spacetime_api import metadata, window


class SpacetimeReadTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('CREATE TABLE trace (id INTEGER PRIMARY KEY AUTOINCREMENT, episode INTEGER, frame TEXT)')
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def add(self, index):
        evidence={'domain':'network', 'world_hash':'observed', 'event_seq':index,
                  'step':index, 'action':'walk', 'active':[1,index],
                  'messages':[{'from':1,'to':index,'strength':0.5}],
                  'actual':{'effect':'moved'},'update_norm':.12,
                  'growth':{'born':[index]}}
        self.db.execute('INSERT INTO trace(episode,frame) VALUES(?,?)',
                        (1,json.dumps(evidence)))

    def test_empty_history_returns_no_fabricated_points(self):
        self.assertEqual(metadata(self.db)['total'],0)
        result=window(self.db,1,100)
        self.assertEqual(result['events'],[])
        self.assertEqual(result['visible_total'],0)
        self.assertTrue(result['complete'])

    def test_all_real_events_at_fine_zoom(self):
        for i in range(11):self.add(i)
        self.db.commit()
        r=window(self.db,3,7,bins=16,max_events=8)
        self.assertTrue(r['complete'])
        self.assertEqual(r['visible_total'],5)
        self.assertEqual([x['trace_id'] for x in r['events']],[3,4,5,6,7])
        self.assertEqual(r['events'][0]['messages'][0]['from'],1)
        self.assertFalse(metadata(self.db)['has_wall_clock_time'])

    def test_wide_view_samples_only_existing_indices_with_exact_counts(self):
        for i in range(350):self.add(i)
        self.db.commit()
        # Intentionally delete a range; never invent them.
        self.db.execute('DELETE FROM trace WHERE id BETWEEN 115 AND 200')
        self.db.commit()
        meta=metadata(self.db)
        self.assertTrue(meta['has_gaps'])
        result=window(self.db,1,350,bins=40,max_events=20)
        self.assertTrue(result['sampled'])
        self.assertFalse(result['complete'])
        self.assertEqual(result['visible_total'],264)
        self.assertEqual(sum(b['count'] for b in result['bins']),264)
        ids=[f['trace_id'] for f in result['events']]
        self.assertEqual(ids,sorted(set(ids)))
        self.assertTrue(all(not 115<=i<=200 for i in ids))
        self.assertLessEqual(len(ids),20)

    def test_queries_do_not_write_to_trace_or_checkpoint(self):
        for i in range(13):self.add(i)
        self.db.commit()
        before=list(self.db.execute('SELECT id,episode,frame FROM trace'))
        metadata(self.db)
        window(self.db,-500,99999,bins=150,max_events=9999)
        after=list(self.db.execute('SELECT id,episode,frame FROM trace'))
        self.assertEqual(before,after)


if __name__=='__main__':unittest.main()
