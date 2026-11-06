import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {observedLayout,frozenTextLayout,project4D,routeDivergence} from "./hypermaze-geometry.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,"index.html"),"utf8");
const js=fs.readFileSync(path.join(here,"text-hypermaze.js"),"utf8");
const observed={
 nodes:[
  {id:0,kind:3,potential:.8,successorOccupancy:.6},
  {id:1,kind:0,potential:.9,successorOccupancy:.8},
  {id:2,kind:0,potential:.9,successorOccupancy:.3},
  {id:3,kind:2,potential:1,successorOccupancy:1},
  {id:4,kind:2,potential:1,successorOccupancy:1}
 ],
 edges:[{from:0,to:1,character:"a"},{from:0,to:2,character:"b"},
  {from:1,to:3,character:"x"},{from:2,to:4,character:"y"}],
 goals:[{node:3},{node:4}]
};
test("dedicated full-screen viewer exists without removing original V17/V18 UI or scripts",()=>{
 for(const id of [
 "tabHypermaze","hmOverlay","hmCanvas","hmMode","hmBrain","hmPrompt",
 "hmLoadObserved","hmLoadPrompt","hmUnseen","hmPlay","hmScrub",
 "hmPerspective","hmXW","hmYW","hmZW","hmSlice","hmSliceEnabled",
 "hmZoom","hmStepDetails","hmMeaning","hmInitial","hmExecuted",
 "hmAlternative","hmDeviation","hmRevisions","hmGoal","hmClose"
 ])assert.match(html,new RegExp('id="'+id+'"'),"Missing new real viewer control "+id);
 for(const id of ["tabTrain","tabEval","tabMetrics","tabLang","tabSuccessor",
  "langPane","successorPane","allSave","allStart","allPause","gpuDev"])
  assert.match(html,new RegExp('id="'+id+'"'),"Missing original working control "+id);
 for(const src of ["app.js","perspective-studio.js","language-maze-studio.js",
  "successor-observatory.js","text-hypermaze.js"])
  assert.ok(html.includes('src="'+src+'"'),"Original/native viewer changed: "+src);
 assert.match(js,/fetch|request/);
 assert.match(js,/\/language-maze\/analyze/);
 assert.match(js,/\/language-maze\/observatory/);
 assert.match(js,/\/eval/);
 assert.match(js,/preanswer/);
 assert.match(js,/teacherForced/);
 assert.match(js,/project4D/);
});
test("observed four-feature geometry uses only actual connected topology and learned values",()=>{
 const r=observedLayout(observed);
 assert.equal(r.coords.length,5);
 assert.deepEqual(r.depth,[0,1,1,2,2]);
 assert.deepEqual(r.outgoing[0],[1,2]);
 assert.equal(r.ends,2);
 assert.ok(r.coords.every(x=>x.length===4&&x.every(Number.isFinite)));
 assert.equal(r.coords[0][2],.6000000000000001);
 assert.equal(r.coords[0][3],.19999999999999996);
 assert.notEqual(r.coords[1][1],r.coords[2][1],
  "Actual alternatives must split into different observable lanes.");
 assert.deepEqual(r.outgoing[1],[3]);
});
test("frozen text test has THREE distinct honest tracks, not imaginary learned maze edges",()=>{
 const rows=[[65,66],[66,66],[67,65]];
 const ex={rows,a0:0,shape:"ABC",answer:1/3,shapeSame:1};
 const g=frozenTextLayout(ex);
 assert.equal(g.provenance,"FROZEN_V17_TEACHER_FORCED_TEXT_EVALUATION_NOT_A_NAVIGABLE_LEARNED_MAZE");
 assert.deepEqual(g.tracks.map(x=>x.key),["preanswer","teacherForced","reference"]);
 assert.deepEqual(g.tracks.map(t=>t.chars.length),[3,3,3]);
 assert.equal(g.tracks[1].chars[0],"B");
 assert.equal(g.tracks[2].chars[0],"A");
 assert.equal(g.tracks[0].coords[0][3],1);
 assert.equal(g.tracks[1].coords[0][3],-1);
});
test("4D rotation really depends on W and stays finite at camera extremes",()=>{
 const v=[-.25,.4,.7,.9],a=project4D(v,{xw:0,yw:0,zw:0},900,600);
 const b=project4D(v,{xw:1.5,yw:-.7,zw:.8,zoom:2},900,600);
 assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));
 assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));
 assert.notEqual(a.x,b.x);
 assert.notEqual(a.y,b.y);
});
test("global plan and executed local path are measured separately",()=>{
 assert.deepEqual(routeDivergence([0,1,3],[0,2,4]),
  {diverged:true,firstDifferentNodeIndex:1,predictedNodes:3,executedNodes:3});
 assert.equal(routeDivergence([0,1,3],[0,1,3]).diverged,false);
 assert.equal(routeDivergence([],[]).diverged,false);
});
test("very long real known-answer corridor cannot overflow projection call stack",()=>{
 const length=15000;
 const graph={nodes:Array.from({length},(_,i)=>({id:i,potential:i/length,
   successorOccupancy:i/length})),
   edges:Array.from({length:length-1},(_,i)=>({from:i,to:i+1,character:"x"}))};
 const r=observedLayout(graph);
 assert.equal(r.coords.length,length);
 assert.equal(r.depth.at(-1),length-1);
 assert.ok(r.coords.every(c=>c.every(Number.isFinite)));
});
test("corrupt actual topology is rejected rather than hidden as a fake visualization",()=>{
 assert.throws(()=>observedLayout({nodes:[{id:0}],edges:[{from:0,to:55}]}),/Corrupt observed topology/);
 assert.throws(()=>frozenTextLayout({rows:null}),/Frozen native text test rows required/);
 assert.throws(()=>project4D([1,2,3],{},900,600),/Invalid real four-feature vector/);
});
