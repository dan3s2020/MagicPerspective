import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGrowthServer} from '../growth-server.mjs';

const event=(id,domain,problem,nodes,edges)=>({
 event_id:id,source:'original-v7-training',domain,problem_id:problem,step:0,
 nodes,edges,reward:.25,model_update:{gradient_norm:.6,weight_delta:.002}
});
const n=(id,w)=>({id,position:[.1,.4,-.1,w]});
async function read(url,opts={}){
 const response=await fetch(url,opts);
 const body=response.headers.get('content-type')?.includes('application/json')?
  await response.json():await response.text();
 return {status:response.status,body};
}
test('Original-source 4D growth API persists real exercised topology; no hardcoded graph or invented training',{timeout:25000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'portal-growth-http-'));
 let instance=null;
 try{
  instance=await createGrowthServer({port:0,folder:dir,checkpointEvery:2});
  const base=instance.url;
  const first=await read(base+'/api/health');
  assert.equal(first.status,200);
  assert.equal(first.body.source_connected,false);
  assert.equal(first.body.stats.total_nodes,0);
  assert.equal((await read(base+'/api/graph')).body.nodes.length,0);
  const html=await read(base+'/');
  assert.equal(html.status,200);
  assert.ok(html.body.includes('Graful în creștere'));
  assert.ok(html.body.includes('Nu există puncte inventate'));
  assert.ok(html.body.includes('START 1'));
  assert.ok(html.body.includes('START 2'));
  assert.ok(html.body.includes('v7-frame'));
  assert.ok(html.body.includes('http://127.0.0.1:8788/'));
  assert.ok(html.body.includes('exercise-data'));
  const original=await read(base+'/api/v7/status');
  assert.equal(original.status,200);
  assert.equal(original.body.originalBackendIntegrated,false);
  assert.equal(original.body.trainingState,'UNKNOWN');
  const emptyExercises=(await read(base+'/api/exercises')).body;
  assert.equal(emptyExercises.total_records,0);
  assert.equal(emptyExercises.records.length,0);
  for(const path of ['/geometry.mjs','/viewer.mjs','/growth-view.mjs',
    '/growth.mjs','/growth-app.mjs','/viewer.css']){
   assert.equal((await read(base+path)).status,200,'Missing real viewer '+path);
  }
  const payload=event('e1','maze3d','maze-original-unique',
   [n('observed:a',.1),n('observed:b',.2)],
   [{from:'observed:a',to:'observed:b',kind:'observed',strength:.7}]);
  const accepted=await read(base+'/api/experience',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(accepted.status,200);
  assert.equal(accepted.body.accepted,true);
  assert.equal(accepted.body.stats.total_nodes,2);
  assert.equal(accepted.body.stats.total_edges,1);
  assert.equal(accepted.body.stats.unique_problems,1);
  assert.equal(accepted.body.stats.learned_steps,1);
  const repeat=await read(base+'/api/experience',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(repeat.body.duplicate,true);
  assert.equal(repeat.body.stats.observed_actions,1);
  const other=event('e2','network','network-different-exercise',
   [{id:'observed:b'},n('observed:c',.3)],
   [{from:'observed:b',to:'observed:c',kind:'confirmed',strength:.6}]);
  const second=await read(base+'/api/experience',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(other)});
  assert.equal(second.body.stats.total_nodes,3);
  assert.equal(second.body.stats.total_edges,2);
  assert.equal(second.body.stats.unique_problems,2);
  assert.equal(second.body.stats.cross_domain_nodes,1);
  const exerciseFeed=(await read(base+'/api/exercises?after=0&limit=1')).body;
  assert.equal(exerciseFeed.total_records,2);
  assert.equal(exerciseFeed.unique_problems,2);
  assert.equal(exerciseFeed.records.length,1);
  assert.equal(exerciseFeed.records[0].event_id,'e1');
  assert.equal(exerciseFeed.records[0].unique_problem_first_seen,true);
  assert.equal(exerciseFeed.has_more,true);
  const secondPage=(await read(base+'/api/exercises?after=1&limit=1')).body;
  assert.equal(secondPage.records[0].event_id,'e2');
  assert.equal(secondPage.records[0].domain,'network');
  assert.equal(secondPage.records[0].problem_id,'network-different-exercise');
  assert.equal(secondPage.has_more,false);
  const g=(await read(base+'/api/graph')).body;
  assert.equal(g.nodes.length,3);
  assert.equal(g.edges.length,2);
  assert.equal(g.meta.sequence,2);
  assert.equal(g.meta.schema,'portal4d.verified-experience-graph.v1');
  assert.ok(g.edges.every(x=>x.kind!=='prediction'));
  const feed=(await read(base+'/api/events?after=0')).body;
  assert.equal(feed.events.length,2);
  assert.equal(feed.events[0].growth.nodes.length,2);
  assert.equal(feed.events[1].growth.nodes.length,1);
  assert.equal((await read(base+'/api/events?after=2')).body.events.length,0);
  const hist=(await read(base+'/api/history')).body;
  assert.equal(hist.history.length,2);
  assert.deepEqual(hist.history.map(x=>x.stats.total_nodes),[2,3]);
  const invalid=await read(base+'/api/experience',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(
    event('e3','text','third',[{id:'bad',position:[1,2,3]}],[]))});
  assert.equal(invalid.status,400);
  assert.equal((await read(base+'/api/health')).body.stats.sequence,2);
  const evil=await read(base+'/api/health',{headers:{Origin:'https://evil.example'}});
  assert.equal(evil.status,403);
  const snap=await read(base+'/api/checkpoint',{method:'POST'});
  assert.equal(snap.body.saved,true);
  await instance.close();instance=null;
  const restarted=await createGrowthServer({port:0,folder:dir});
  instance=restarted;
  const restored=(await read(instance.url+'/api/health')).body;
  assert.equal(restored.stats.total_nodes,3);
  assert.equal(restored.stats.total_edges,2);
  assert.equal(restored.stats.unique_problems,2);
  assert.equal((await read(instance.url+'/api/history')).body.history.length,2);
  assert.deepEqual((await read(instance.url+'/api/exercises?after=0&limit=30')).body.records.map(x=>x.event_id),
   ['e1','e2'],'All genuinely received exercise records survive the checkpoint restart');
 }finally{
  if(instance)await instance.close();
  await rm(dir,{recursive:true,force:true});
 }
});
