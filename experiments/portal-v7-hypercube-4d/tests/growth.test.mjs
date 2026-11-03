import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EvidenceGraph,GROWTH_SCHEMA} from '../growth.mjs';
import {ExperienceJournal} from '../journal.mjs';

const node=(id,x,y,z,w)=>({id,position:[x,y,z,w],role:'learned-state'});
const measured=(id,domain,problem_id,nodes,edges=[],extra={})=>({
 event_id:id,source:'original-v7-action-telemetry',domain,problem_id,
 step:0,nodes,edges,...extra
});
test('Verified memory starts EMPTY; 16/32 fixed cage never becomes a synthetic learned graph',()=>{
 const g=new EvidenceGraph();
 assert.equal(g.stats().total_nodes,0);
 assert.equal(g.stats().total_edges,0);
 assert.equal(g.stats().unique_problems,0);
 assert.deepEqual(g.view().nodes,[]);
 assert.deepEqual(g.view().edges,[]);
});
test('Actual unique observed exercises grow permanent graph topology and reinforce old connections',()=>{
 const g=new EvidenceGraph();
 const first=measured('e1','maze3d','maze:unique-1',
  [node('state:0',0,0,0,.1),node('action:forward',.1,.1,.2,.15),
   node('effect:goal',.2,.3,.5,.2)],
  [{from:'state:0',to:'action:forward',kind:'caused',strength:.7},
   {from:'action:forward',to:'effect:goal',kind:'observed',strength:1}],
  {messages:[{from:'state:0',to:'action:forward',strength:.63,round:2}],
   executed:{from:'action:forward',to:'effect:goal',kind:'executed',action:'forward'},
   predictedEdges:[{from:'state:0',to:'effect:goal'}],
   model_update:{gradient_norm:.52,weight_delta:.005}});
 const a=g.ingest(first);
 assert.equal(a.accepted,true);
 assert.equal(a.growth.nodes.length,3);
 assert.equal(a.growth.edges.length,4,'Only confirmed plus actual message and executed links');
 assert.equal(g.stats().total_nodes,3);
 assert.equal(g.stats().total_edges,4);
 assert.equal(g.stats().learned_steps,1);
 assert.equal(g.stats().unique_problems,1);
 assert.equal(g.stats().directed_density,4/6);
 assert.equal(g.view().edges.some(e=>e.kind==='prediction'),false,
  'A predicted solution is not a confirmed learned connection');
 const duplicate=g.ingest(first);
 assert.equal(duplicate.accepted,false);
 assert.equal(g.stats().total_edges,4);
 const repeat=g.ingest(measured('e2','maze3d','maze:unique-1',
  [{id:'state:0'},{id:'action:forward'}],
  [{from:'state:0',to:'action:forward',kind:'caused',strength:.75}],
  {model_update:{gradient_norm:.1,weight_delta:0}}));
 assert.equal(repeat.growth.nodes.length,0);
 assert.equal(repeat.growth.edges.length,0);
 assert.equal(g.stats().learned_steps,1);
 assert.equal(g.stats().unique_problems,1);
 assert.equal(g.view().edges.find(e=>e.kind==='caused').count,2);
 const third=g.ingest(measured('e3','network','network:new-1',
  [{id:'action:forward'},node('net:vertex',.8,-.2,.4,-.3)],
  [{from:'action:forward',to:'net:vertex',kind:'confirmed',strength:.54}],
  {model_update:{gradient_norm:.9,weight_delta:.012}}));
 assert.equal(third.growth.nodes.length,1);
 assert.equal(third.growth.edges.length,1);
 assert.equal(g.stats().unique_problems,2);
 assert.equal(g.stats().total_nodes,4);
 assert.equal(g.stats().total_edges,5);
 assert.equal(g.stats().cross_domain_nodes,1,
  'A shared node is genuinely reused across distinct observed worlds');
 assert.equal(g.stats().learned_steps,2);
 assert.equal(g.stats().observed_actions,3);
});
test('No topology from unexecuted predictions, never fabricate W or a training event',()=>{
 const g=new EvidenceGraph();
 assert.throws(()=>g.ingest(measured('e1','maze','m1',[{id:'n',position:[0,0,0]}])),
  /missing|requires 4/);
 assert.throws(()=>g.ingest(measured('e2','maze','m1',[],
  [{from:'unknown',to:'other',kind:'observed'}])),/unknown node/);
 assert.throws(()=>g.ingest(measured('e3','maze','m1',
  [node('a',0,0,0,.1),node('b',0,1,0,.2)],
  [],{messages:[{from:'a',to:'b'}]})),/strength/);
 assert.throws(()=>g.ingest(measured('e4','maze','m1',
  [node('a',0,0,0,.1),node('b',0,1,0,.2)],
  [],{model_update:{gradient_norm:0,weight_delta:NaN}})),/measured/);
 const valid=measured('e5','maze','m1',
  [node('a',0,0,0,.1),node('b',0,1,0,.2)],[],
  {predictedEdges:[{from:'a',to:'b'}]});
 g.ingest(valid);
 assert.equal(g.stats().total_nodes,2);
 assert.equal(g.stats().total_edges,0,'Unverified model predictions cannot create topology');
 assert.equal(g.stats().learned_steps,0,'No measured gradient means no claimed learning');
 assert.throws(()=>g.ingest({...valid,problem_id:'tampered'}),/Conflicting payload/);
});
test('Visible density and true totals are separate; new nodes stay visible under LOD',()=>{
 const g=new EvidenceGraph();
 for(let i=0;i<55;i++){
  g.ingest(measured('step:'+i,'symbols','different:'+i,
   [node('n:'+i,i/80,0,i/170,i/250)],i?
   [{from:'n:'+(i-1),to:'n:'+i,kind:'observed'}]:[]));
 }
 const view=g.view({maxNodes:10,maxEdges:30});
 assert.equal(view.meta.total_nodes,55);
 assert.equal(view.meta.total_edges,54);
 assert.equal(view.nodes.length,10);
 assert.equal(view.meta.visible_nodes,10);
 assert.equal(view.meta.sampled,true);
 assert.ok(view.nodes.some(n=>n.id==='n:54'),'Newest real growth must be visible');
 assert.ok(g.stats().edges_per_node>.9);
});
test('Checkpoint and replay preserve all original evidence, no reset, idempotent across restarts',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'portal-real-growth-'));
 try{
  const g=new ExperienceJournal(folder,{checkpointEvery:2});
  await g.open();
  let r=await g.ingest(measured('s1','maze3d','m#1',[node('a',0,0,0,0),node('b',.2,.2,.1,.2)],
   [{from:'a',to:'b',kind:'observed'}]));
  assert.equal(r.accepted,true);
  r=await g.ingest(measured('s2','network','n#2',[{id:'b'},node('c',.3,.2,.4,.3)],
   [{from:'b',to:'c',kind:'observed'}],
   {model_update:{gradient_norm:.4,weight_delta:.003}}));
  assert.equal(r.accepted,true);
  const original=g.graph.serialize();
  const reopened=new ExperienceJournal(folder,{checkpointEvery:3});
  await reopened.open();
  assert.deepEqual(reopened.graph.serialize(),original);
  r=await reopened.ingest(measured('s3','symbols','sym#3',[{id:'c'},node('d',.6,.1,.6,.2)],
   [{from:'c',to:'d',kind:'observed'}]));
  assert.equal(r.sequence,3);
  const reopen2=new ExperienceJournal(folder,{checkpointEvery:100});
  await reopen2.open();
  assert.equal(reopen2.stats().total_nodes,4);
  assert.equal(reopen2.stats().total_edges,3);
  assert.equal(reopen2.stats().unique_problems,3);
  assert.equal(reopen2.stats().cross_domain_nodes,2);
  assert.equal(reopen2.stats().learned_steps,1);
  assert.equal((await reopen2.ingest(measured('s3','symbols','sym#3',
   [{id:'c'},node('d',.6,.1,.6,.2)],
   [{from:'c',to:'d',kind:'observed'}]))).accepted,false);
  await reopen2.checkpoint();
  assert.equal(JSON.parse(await readFile(join(folder,'graph-snapshot.json'),'utf8')).schema,GROWTH_SCHEMA);
  const last=new ExperienceJournal(folder);await last.open();
  assert.deepEqual(last.graph.serialize(),reopen2.graph.serialize());
 }finally{await rm(folder,{recursive:true,force:true})}
});
