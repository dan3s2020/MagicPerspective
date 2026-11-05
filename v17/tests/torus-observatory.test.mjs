import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {circularMean,snapshot,measuredDelta} from "../transcend/torus-aether/devour/observatory-core.mjs";
import {rotation,prepare,images} from "../transcend/torus-aether/ui/view5.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const file=p=>readFileSync(resolve(root,p),"utf8");

test("periodic geometry averages across 0/1 boundary, not through the middle",()=>{
  const a=circularMean([[.98,.5,.5,.5,.5],[.02,.5,.5,.5,.5]],[1,1]);
  assert.ok(a[0]<.05||a[0]>.95);
  assert.equal(a.length,5);
});

test("learned symbol coordinates are never replaced by invented positions",()=>{
  const s=snapshot({nodes:[["s:65","sym","A",.8,1],["a:1","A","A·1",1,2],["c:3","C","C·3",.1,3]],
    U:[[65,[.2,.3,.4,.5,.6]]],edges:[["a:1","s:65","feel",2]],flow:[[65,65]]});
  assert.equal(s.counts.nodes,3);assert.equal(s.items.length,2);
  assert.equal(s.direct,1);assert.equal(s.estimated,1);assert.equal(s.unplaced,1);
  assert.deepEqual(s.allNodes.get("s:65").p,[.2,.3,.4,.5,.6]);
  assert.equal(s.allNodes.get("a:1").origin,"estimated-from-edges");
  assert.equal(s.allNodes.get("c:3").p,null);
  assert.deepEqual(s.flow,[{a:"s:65",b:"s:65"}]);
});

test("invalid coordinates and false edges cannot manufacture learnable geometry",()=>{
  const s=snapshot({nodes:[["s:1","sym","x",1],["a:1","A","y",.5]],U:[[1,[NaN,0,0,0,0]]],
    edges:[["a:1","s:1","feel",2],["a:1","phantom","feel",90]]});
  assert.equal(s.items.length,0);assert.equal(s.unplaced,2);
  assert.equal(s.links.length,1);
});

test("graph growth is counted from actual new IDs and connections",()=>{
  const old=snapshot({nodes:[["s:1","sym","1",1]],U:[[1,[0,0,0,0,0]]],edges:[]});
  const now=snapshot({nodes:[["s:1","sym","1",1],["s:2","sym","2",1]],U:[[1,[0,0,0,0,0]],[2,[.1,.2,.3,.4,.5]]],edges:[["s:1","s:2","world",.2]]});
  assert.deepEqual(measuredDelta(old,now),{newNodes:1,newEdges:1,first:false});
  assert.deepEqual(measuredDelta(null,now),{newNodes:0,newEdges:0,first:true});
});

test("real 5D projection remains usable with measured positions",()=>{
  const M=rotation(new Array(10).fill(0));const P=prepare(M);
  assert.ok(P.detQ>0);
  const ims=images([{p:[.2,.3,.4,.5,.6]}],[.5,.5,.5,.5,.5],P,.9,.9,.4,1,300);
  assert.ok(ims.length>0);assert.ok(ims.length<=300);
  assert.ok(ims.every(x=>x.q.every(Number.isFinite)));
});

test("original UI includes its existing global and per-graph controls",()=>{
  const html=file("transcend/torus-aether/ui/index.html");
  const app=file("transcend/torus-aether/ui/app.js");
  const ids=["liveList","allStart","allPause","allSave","liveReset","addGraph","addArm","addText","addMaze",
    "run","reset","eval","speed","focusLive","torusView","zout","zin","still","home","fly",
    "tx","ty","tz","tw","tv","spin","resetRot","spinSpeed","planes","persp","cam","density",
    "thickMul","wtemp","write","gnoise","glr","repel","cthr","ltemp","pnoise","dims","bud","wires","ttemp"];
  for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'),"missing native control "+id);
  for(const action of ["start","pause","save","reset","remove"])assert.ok(app.includes('data-do="'+action+'"'),"missing per-graph action "+action);
});

test("Observatory includes native UI without rewriting training endpoints",()=>{
  const html=file("transcend/torus-aether/devour/observatory.html");
  const app=file("transcend/torus-aether/devour/observatory.mjs");
  assert.ok(html.includes('src="/transcend/torus-aether/ui/index.html?live=1"'));
  assert.ok(app.includes('response("/graphs")'));
  assert.ok(app.includes('response("/graph?w="+chosen)'));
  assert.ok(app.includes('response("/state")'));
  assert.ok(!app.includes('method:"POST"')&&!app.includes("method:'POST'"));
  assert.ok(!app.includes("/control?")&&!app.includes("/reset?"));
});
