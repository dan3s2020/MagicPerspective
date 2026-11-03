import test from 'node:test';
import assert from 'node:assert/strict';
import {AXES,CORNERS,HYPERCUBE_EDGES,point4,navigation,project4,
 parseGraph,graphBounds,normalizeNodes,onWSlice,crossingWSlice} from '../geometry.mjs';
test('Tesseract is exactly 16 vertices with 32 4-dimensional edges',()=>{
 assert.equal(CORNERS.length,16);
 assert.equal(HYPERCUBE_EDGES.length,32);
 assert.equal(new Set(CORNERS.map(p=>p.join(','))).size,16);
 for(const corner of CORNERS)assert.deepEqual(corner.map(x=>Math.abs(x)),[1,1,1,1]);
 for(const {from,to} of HYPERCUBE_EDGES){
  const a=CORNERS[from],b=CORNERS[to];
  assert.equal(a.filter((value,i)=>value!==b[i]).length,1);
  assert.equal(Math.hypot(...a.map((x,i)=>x-b[i])),2);
 }
 for(let i=0;i<16;i++)assert.equal(
  HYPERCUBE_EDGES.filter(e=>e.from===i||e.to===i).length,4);
});
test('4D camera moves on each independent dimension; tesseract screen frame stays fixed',()=>{
 for(const axis of AXES){
  const start=[0,0,0,0],moved=navigation(start,axis,+1,.2);
  const i=AXES.indexOf(axis);
  assert.ok(moved.every((x,j)=>x===(j===i?.2:0)));
  const p=[.3,.4,.1,.7];
  const frameBefore=project4(p,{camera:start,frame:true});
  const frameAfter=project4(p,{camera:moved,frame:true});
  assert.deepEqual(frameBefore,frameAfter,'Cage must never drift when navigating '+axis);
  const worldBefore=project4(p,{camera:start});
  const worldAfter=project4(p,{camera:moved});
  assert.notDeepEqual(worldBefore,worldAfter,'The observed 4D world must shift '+axis);
 }
});
test('W translation changes the projected graph and the 3D slice content',()=>{
 const p=[.2,-.1,.3,.75];
 assert.ok(onWSlice(p,.75,.05));
 assert.ok(!onWSlice(p,-.75,.05));
 assert.notDeepEqual(project4(p,{camera:[0,0,0,.5]}),
  project4(p,{camera:[0,0,0,-.5]}));
 const cross=crossingWSlice([0,0,0,-1],[2,4,6,1],0);
 assert.ok(cross);assert.equal(cross.t,.5);
 assert.deepEqual(cross.position,[1,2,3,0]);
 assert.equal(crossingWSlice([0,0,0,-1],[1,1,1,-.5],0),null);
});
test('Use only actual four-dimensional node positions; no synthetic W coordinate',()=>{
 assert.throws(()=>point4([0,1,2]),/requires 4 finite coordinates/);
 assert.throws(()=>point4([0,1,2,NaN]),/requires 4 finite coordinates/);
 assert.throws(()=>parseGraph({nodes:[{id:'a',position:[1,2,3]}],edges:[]}),/requires 4/);
 assert.throws(()=>parseGraph({nodes:[{id:'a',position:[1,2,3,4]},
  {id:'a',position:[0,0,0,0]}],edges:[]}),/unique/);
 assert.throws(()=>parseGraph({nodes:[{id:'a',position:[1,2,3,4]}],
  edges:[{from:'a',to:'missing'}]}),/absent node/);
 const graph=parseGraph({nodes:[{id:'a',position:[1,2,3,4]},
  {id:'b',position:[2,3,4,5]}],edges:[{from:'a',to:'b'}]});
 const bounds=graphBounds(graph.nodes),normalized=normalizeNodes(graph.nodes,bounds);
 assert.equal(normalized.length,2);
 assert.ok(normalized.every(n=>n.normalized.length===4&&n.normalized.every(Number.isFinite)));
 assert.deepEqual(graph.nodes[0].position,[1,2,3,4]);
});
test('Mathematical longest diagonal of unit 4-cube is 2',()=>{
 const zero=[0,0,0,0],one=[1,1,1,1];
 assert.equal(Math.hypot(...one.map((x,i)=>x-zero[i])),2);
});
