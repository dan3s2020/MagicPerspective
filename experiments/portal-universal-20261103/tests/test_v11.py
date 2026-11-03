"""Regression: real Parquet schemas, async ingestion, and evidence-based graph growth."""
import tempfile
import sys
import json
import time
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from corpus import _extract, ingest, Corpus
from engine import PortalEngine, build_world, MAX_OBS
from server import Control


class CorpusAndGraphTests(unittest.TestCase):
    def test_nested_conversations_are_the_actual_dataset_text(self):
        row={'difficulty':7,'domain':'code','source':'stackexchange_codegolf',
             'conversations':[
                 {'from':'human','value':'How can I solve this puzzle? ' * 3},
                 {'from':'gpt','value':'First reason about the constraints; then solve.' * 3}
             ]}
        chunks=_extract(row)
        self.assertEqual(len(chunks),2)
        self.assertTrue(chunks[0].startswith('human: How can I solve'))
        self.assertTrue(chunks[1].startswith('gpt: First reason'))
        self.assertFalse(any('stackexchange' in s or 'codegolf' in s for s in chunks))

    def test_parquet_schema_reader_discovers_conversations_not_a_fixed_allowlist(self):
        # This tests the exact OpenThoughts3 row shape through the real importer.
        # pyarrow itself is unavailable in this CPU CI: a simulated reader provides
        # top-level Arrow fields and batches. Actual decoding runs on Windows pyarrow.
        class Type:
            def __init__(self,kind,child=None,fields=None):
                self.kind=kind;self.value_type=child;self.fields=fields or []
            def __iter__(self):return iter(self.fields)
        class Field:
            def __init__(self,name,t):self.name=name;self.type=t
        text=Type('str')
        schema=[Field('difficulty',Type('int')),Field('source',text),
                Field('domain',text),Field('conversations',Type('list',Type('struct',fields=[Field('from',text),Field('value',text)])))]
        class Types:
            def __getattr__(self,name):
                return lambda t:name == {'str':'is_string','list':'is_list','struct':'is_struct','int':'no'}.get(t.kind)
        arrow=types.ModuleType('pyarrow');arrow.types=Types()
        parquet=types.ModuleType('pyarrow.parquet')
        class Reader:
            def __init__(self,filename):
                self.schema_arrow=types.SimpleNamespace(names=[f.name for f in schema],__iter__=lambda self:iter(schema))
                self.schema_arrow=type('Schema',(),{'names':[f.name for f in schema], '__iter__':lambda self:iter(schema)})()
                self.num_row_groups=1
            def iter_batches(self,*,batch_size,row_groups,columns):
                self.seen_columns=columns
                assert columns==['conversations'],columns
                yield type('Batch',(),{'to_pylist':lambda self:[{'conversations':[
                    {'from':'human','value':'What is the solution to this real question?'},
                    {'from':'gpt','value':'The answer follows from the stated conditions.'}]}]})()
        parquet.ParquetFile=Reader
        arrow.parquet=parquet
        with tempfile.TemporaryDirectory() as d,patch.dict(sys.modules,{'pyarrow':arrow,'pyarrow.parquet':parquet}):
            f=Path(d)/'train-00015-of-00120.parquet';f.write_bytes(b'FAKE-PARQUET-SCHEMA')
            meta=ingest(f,Path(d)/'cache')
            self.assertEqual(meta['columns_detected'],[f.name for f in schema])
            self.assertEqual(meta['columns_selected'],['conversations'])
            self.assertEqual(meta['rows_read'],1)
            self.assertEqual(meta['rows_with_text'],1)
            self.assertIn('human: What is the solution',Path(meta['path']).read_text())

    def test_actual_pyarrow_nested_parquet_when_library_available(self):
        try:
            import pyarrow as pa
            import pyarrow.parquet as pq
        except ImportError:
            self.skipTest('Local CPU diagnostic has no pyarrow; CI installs it')
        with tempfile.TemporaryDirectory() as d:
            schema=pa.schema([
                pa.field('difficulty',pa.int64()),
                pa.field('source',pa.string()),
                pa.field('domain',pa.string()),
                pa.field('conversations',pa.list_(pa.struct([
                    pa.field('from',pa.string()),pa.field('value',pa.string())]))),
            ])
            rows=[{'difficulty':7,'source':'stackexchange_codegolf','domain':'code',
                   'conversations':[{'from':'human','value':'What is the problem '+str(i)},
                                    {'from':'gpt','value':'The verified solution is '+str(i)}]}
                  for i in range(12)]
            source=Path(d)/'train-00015-of-00120.parquet'
            pq.write_table(pa.Table.from_pylist(rows,schema=schema),source,row_group_size=3)
            progress=[]
            result=ingest(source,Path(d)/'cache',on_progress=progress.append)
            self.assertEqual(result['rows_read'],12)
            self.assertEqual(result['rows_with_text'],12)
            self.assertEqual(result['columns_selected'],['conversations'])
            data=Path(result['path']).read_text(encoding='utf-8')
            self.assertIn('human: What is the problem 0',data)
            self.assertIn('gpt: The verified solution is 11',data)
            self.assertFalse('stackexchange_codegolf' in data)
            self.assertEqual(progress[-1]['progress'],1)

    def test_async_corpus_import_reports_progress_and_enables_real_text(self):
        with tempfile.TemporaryDirectory() as d:
            source=Path(d)/'training.jsonl'
            source.write_text('\n'.join(json.dumps({'conversation':[
                {'role':'user','content':'Solve a real problem '+str(i)},
                {'role':'assistant','content':'A real response '+str(i)}]}) for i in range(50)),encoding='utf-8')
            engine=PortalEngine(Path(d)/'state','cpu',capacity=2048)
            c=Control(engine)
            result=c.begin_corpus(str(source))
            self.assertEqual(result['state'],'queued')
            c.ingest_worker.join(timeout=15)
            info=c.status()['corpus_ingest']
            self.assertEqual(info['state'],'ready',info.get('error'))
            self.assertEqual(info['rows_read'],50)
            self.assertEqual(info['rows_with_text'],50)
            self.assertGreater(info['bytes'],100)
            self.assertEqual(c.engine.corpus.digest,info['sha256'])
            self.assertEqual(c.engine.episode_many(['text'],batch_size=2)['episodes'],2)
            self.assertEqual(c.engine.status()['domains']['text']['episodes'],2)
            c.engine.close();c.engine.corpus.close()

    def test_4d_nodes_are_born_after_temporal_experience_and_used_by_brain(self):
        with tempfile.TemporaryDirectory() as d:
            engine=PortalEngine(d,'cpu',capacity=4096)
            self.assertEqual(sum(n.get('dimension',1)==4 for n in engine.graph.nodes),0)
            # A single yes/no action has no temporal predecessor; no fake 4D nodes.
            w=build_world('yesno',101)
            engine.step_many([w],record=True)
            self.assertEqual(sum(n.get('dimension',1)==4 for n in engine.graph.nodes),0)
            # Every maze requires a multi-action event to form a temporal link.
            engine.episode_many(['maze3d','network','symbols'],batch_size=3,capture=True)
            temporal=[n for n in engine.graph.nodes if n.get('dimension')==4]
            self.assertGreater(len(temporal),0)
            for n in temporal:
                incoming=[key for key in engine.graph.edges if key[1]==n['id']]
                outgoing=[key for key in engine.graph.edges if key[0]==n['id']]
                self.assertTrue(incoming and outgoing)
                self.assertEqual(n['role'],'temporal')
                self.assertIn('world_hash',n['origin'])
            maze=build_world('maze3d',7021)
            obs,choices=maze.observation()
            *_,ctx=engine.graph.context('maze3d',obs,choices)
            # Exact model inputs are bounded; the *entire* graph is persistent.
            ids,_,_,n,_,_=engine.graph.context('maze3d',obs,choices)
            self.assertLessEqual(n,MAX_OBS)
            higher=[engine.graph.nodes[i] for i in ids[:n] if engine.graph.nodes[i].get('dimension',1)>1]
            self.assertTrue(higher,'learned graph memories must actually enter model input')
            shown=engine.graph.view(limit=350)
            self.assertTrue(any(v.get('dimension')==4 for v in shown['nodes']))
            self.assertGreater(shown['total_edges'],shown['total_nodes'])
            before=[(n['id'],n['origin']) for n in temporal]
            engine.save();engine.close()
            restored=PortalEngine(d,'cpu',capacity=4096)
            self.assertEqual(before,[(n['id'],n['origin']) for n in restored.graph.nodes if n.get('dimension')==4])
            restored.close()

    def test_restore_legacy_graph_without_dimension_fields(self):
        from engine import Graph
        original=Graph(512)
        original.ensure('OBS/existing','sensor','maze3d')
        d=original.state()
        for n in d['nodes']:
            for name in ('dimension','w','born_at','origin'):n.pop(name,None)
        for item in d['edges']:item[3].pop('born_at',None)
        d.pop('experience_step',None)
        g=Graph.restore(d)
        self.assertEqual(g.view()['total_nodes'],2)
        self.assertTrue(all(n['dimension']==1 for n in g.view()['nodes']))

if __name__=='__main__':unittest.main()
