import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {DEFAULT_CONTROLS, CONTROL_KEYS, normalizeControls, controlsFromQuery, scoreSampling, writeSample}
  from "../transcend/torus-aether/devour/stochastic-controls.mjs";

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read=p=>fs.readFileSync(path.join(dir,p),"utf8");
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const ascii=s=>Array.from(s,c=>Math.min(127,c.charCodeAt(0)));
function trained(){
  const b=new Brain({rules, c:{margin:.05,window:400,many:12},seed:11});
  const corpus=ascii(("the organism learns from a real sequence, never from held-out answers. " +
    "geometry and perception can adapt to experience; all controls must affect real state.\n").repeat(4));
  for(const y of corpus)b.live(y);
  return b;
}
test("all eight original sliders exist with exact numeric ranges and safe defaults",()=>{
  assert.deepEqual(CONTROL_KEYS,["wtemp","ttemp","ltemp","pnoise","gnoise","glr","repel","cthr"]);
  assert.deepEqual(normalizeControls(DEFAULT_CONTROLS),DEFAULT_CONTROLS);
  for(const [k,v] of Object.entries(DEFAULT_CONTROLS))assert.equal(typeof v,"number",k);
  assert.deepEqual(controlsFromQuery(new URLSearchParams("ttemp=0&pnoise=0.3"),DEFAULT_CONTROLS),
    {...DEFAULT_CONTROLS,ttemp:0,pnoise:.3});
});
test("reject out-of-range, unknown, duplicate or badly stepped slider settings",()=>{
  for(const [key,value] of [["ttemp","-1"],["pnoise",".301"],["gnoise","0.5"],
    ["glr","0.031"],["ltemp","NaN"],["cthr","Infinity"],["wtemp",""]])
    assert.throws(()=>normalizeControls({[key]:value}),"accepted "+key+"="+value);
  assert.throws(()=>normalizeControls({invented:5}));
  assert.throws(()=>controlsFromQuery(new URLSearchParams("w=0&ttemp=.5&ttemp=.7")));
  assert.throws(()=>controlsFromQuery(new URLSearchParams("w=0")));
});
test("live slider changes target real training and graph geometry, without resetting the brain",()=>{
  const b=trained(),before=b.lived,baseline=b.trace.nodes.size;
  b.setControls({ltemp:1,pnoise:.3,gnoise:9,glr:.08,repel:.75,cthr:.65,wtemp:1.4,ttemp:1.1});
  assert.equal(b.controls.ltemp,1);assert.equal(b.controls.pnoise,.3);
  assert.equal(b.trace.geo.neg,9);assert.equal(b.trace.geo.lr,.08);
  assert.equal(b.trace.geo.repel,.75);assert.equal(b.trace.geo.thr,.65);
  assert.equal(b.lived,before);assert.equal(b.trace.nodes.size,baseline);
  b.live(65);assert.equal(b.lived,before+1);
});
test("held-out deterministic baseline remains stable; stochastic sampling does not train or alter RNG",()=>{
  const b=trained(), H=ascii("held-out question: what patterns can be predicted by an organism?"),baseline=b.test(H);
  const oldRng=b.chain.rand,oldSteps=b.lived,oldNodes=b.trace.nodes.size;
  const fixed=scoreSampling(b,H,0,3),sampled=scoreSampling(b,H,.85,4);
  assert.equal(fixed.sampled,baseline.live);
  assert.equal(fixed.sampledMasked,baseline.masked);
  assert.equal(fixed.n,H.length-4);assert.equal(sampled.temperature,.85);
  assert.ok(sampled.sampled>=0&&sampled.sampled<=1);
  assert.ok(sampled.disagreement>=0&&sampled.disagreement<=1);
  assert.equal(b.chain.rand,oldRng);assert.equal(b.lived,oldSteps);assert.equal(b.trace.nodes.size,oldNodes);
  assert.deepEqual(scoreSampling(b,H,.85,4),sampled,"same seed reproduces a stochastic draw");
});
test("live text writing samples model state only, without learning or peeking at held-out answers",()=>{
  const b=trained(),oldRng=b.chain.rand,oldLived=b.lived,oldPast=b.past.slice();
  const a=writeSample(b,{temperature:0,length:90,seed:123});
  const z=writeSample(b,{temperature:.9,length:90,seed:123});
  assert.equal(a.text.length,90);assert.equal(z.bytes.length,90);
  assert.deepEqual(a,writeSample(b,{temperature:0,length:90,seed:123}));
  assert.equal(b.chain.rand,oldRng);assert.equal(b.lived,oldLived);assert.deepEqual(b.past,oldPast);
});
test("stochastic settings survive a real Brain save and restore",()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v17-control-")),file=path.join(temp,"brain.v8");
  try{
    const b=trained();b.setControls({pnoise:.2,ltemp:.45,ttemp:1,wtemp:.4,gnoise:5,glr:.05,repel:.5,cthr:.7});
    b.save(file);const restored=Brain.load(file);
    assert.deepEqual(restored.controls,b.controls);
    assert.equal(restored.trace.geo.neg,5);assert.equal(restored.trace.geo.lr,.05);
    assert.equal(restored.trace.geo.repel,.5);assert.equal(restored.trace.geo.thr,.7);
    assert.equal(restored.lived,b.lived);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("no original UI controls or graph actions were dropped",()=>{
  const html=read("transcend/torus-aether/ui/index.html"),app=read("transcend/torus-aether/ui/app.js");
  for(const id of ["liveList","allStart","allPause","allSave","liveReset","gpuDev","gpuWorlds","gpuVram","gpuUtil","gpuApply",
    "addGraph","addArm","addText","addMaze","addTrans","run","reset","eval","speed","focusLive","torusView",
    "zout","zin","still","home","fly","tx","ty","tz","tw","tv","spin","resetRot","spinSpeed","planes",
    "persp","cam","density","thickMul","wtemp","write","gnoise","glr","repel","cthr","ltemp","pnoise",
    "dims","bud","wires","ttemp"])assert.ok(html.includes('id="'+id+'"'),"missing original control "+id);
  for(const action of ["start","pause","save","reset","remove"])assert.ok(app.includes('data-do="'+action+'"'),"missing action "+action);
  assert.ok(html.includes('id="liveControlsApply"'));
  assert.ok(html.includes('id="liveControlsAll"'));
  assert.ok(!html.includes("body.live .sl:has(#pnoise)"));
  assert.ok(!html.includes("body.live .sl:has(#ltemp)"));
});
test("server/worker API, GPU and old training routes are present",()=>{
  const server=read("transcend/torus-aether/devour/devour.mjs"),worker=read("transcend/torus-aether/devour/worker.mjs");
  for(const route of ["/controls","/evaluate","/write","/gpu","/graphs","/graph","/control","/add","/reset","/stop"])
    assert.ok(server.includes('"'+route+'"'),"route missing: "+route);
  for(const handler of ["controls-ack","controls-error","generated","gpu","pause","resume","save","stop"])
    assert.ok(worker.includes(handler),"worker route missing: "+handler);
  assert.ok(server.includes("live-controls.json"));
  assert.ok(read("START_V17_LIVE_CONTROLS_ISOLATED.ps1").includes("runtime-live-controls-isolated"));
  assert.ok(read("run-v17-live-controls-isolated.sh").includes("runtime-live-controls-isolated"));
});
