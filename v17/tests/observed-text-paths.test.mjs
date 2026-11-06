import test from "node:test";
import assert from "node:assert/strict";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {TextPathObserver} from "../transcend/torus-aether/text-path-observer.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";

const material = [
  "Q: How do we reach the maze exit?\nA: Follow a valid passage to the goal. If a wall blocks the route, record the observation and test a different passage.\n\n",
  "Q: What happens during a transformation?\nA: A state changes into another state. Compare the initial form with the final form and inspect each intermediate change.\n\n",
  "Q: Explain a mathematical proof.\nA: We assume the initial conditions. We derive the next step and verify the consequence. Therefore the result follows.\n\n",
];
const text=Array.from({length:9},(_,i)=>material[i%material.length]).join("");
const bytes=s=>Array.from(s,c=>c.charCodeAt(0)), asText=x=>String.fromCharCode(...x);
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

function trainedAlign(){
  const g=new AligningGraph({g:8});g.imagineEvery=0;
  for(const c of text)g.live(c.charCodeAt(0));
  // Small test corpus is below the native 20k indexing threshold: build the actual indexes.
  g.mem.lazy = g.fmem.lazy = true; g.mem.ready(true); g.fmem.ready(true);
  return g;
}
test("observer follows the EXACT native choices with no resampling, penalty, additional candidate or training",()=>{
  const g=trainedAlign(), prompt=bytes("A: "), seed=19, T=.95, before=g.mem.n;
  const geo=new Geometry();for(let i=1;i<text.length;i++)geo.learn(text.charCodeAt(i-1),text.charCodeAt(i));
  const original=g.write(prompt,{max:260,T,rand:rng(seed)});
  const observer=new TextPathObserver(geo,{temperature:T,seed,lived:123,geoSteps:geo.n});
  const traced=g.write(prompt,{max:260,T,rand:rng(seed),
    onStep:s=>observer.capture({...s,trust:p=>g.tr(g.key(p))})});
  assert.deepEqual(traced,original);
  assert.equal(g.mem.n,before);
  assert.equal(observer.steps.length,260);
  const report=observer.result();
  assert.equal(report.generated,260);
  assert.equal(report.livedAtStart,123);
  assert.equal(report.geoStepsAtStart,geo.n);
  assert.equal(report.summary.branchingSteps>0,true);
  assert.ok(report.steps.some(s=>s.supportingPerspectives.length>0));
  assert.ok(report.steps.every(s=>s.byte>=0 && s.byte<=255));
  assert.ok(report.steps.every(s=>s.to5D===null || s.to5D.length===5));
});
test("geometry metrics are actual periodic 5D positions, with unknown positions always absent",()=>{
  const geo=new Geometry({D:5});
  geo.U.set(65,[.98,.1,.2,.3,.4]);geo.U.set(66,[.02,.2,.3,.4,.5]);
  const obs=new TextPathObserver(geo,{temperature:.6,seed:11});
  obs.capture({step:0,history:[65],formHistory:[65],selected:66,
    proposals:[{src:"mem",d:1,k:1,sup:3,dist:new Map([[66,3]]),tot:3}],
    distribution:new Map([[66,3],[67,1]]),trust:()=>.9});
  const first=obs.steps[0];
  assert.equal(first.delta5D[0],.04,"cross the periodic boundary by the short direction");
  assert.equal(first.to5D[0],.02);
  assert.equal(first.supportingPerspectives[0].perspective,"mem");
  assert.equal(first.alternatives,2);
  assert.ok(first.probability>0 && first.probability<1);
  obs.capture({step:1,history:[65,66],formHistory:[65,66],selected:67,
    proposals:[],distribution:new Map([[67,1]]),trust:()=>.5});
  assert.equal(obs.steps[1].to5D,null,"never make up a position for an untrained character");
  assert.equal(obs.steps[1].delta5D,null);
  assert.equal(obs.result().summary.missing5DTransitions,1);
});
test("single original Brain can compare five temperatures from the same weights and seed without any learning",()=>{
  const brain=new Brain({rules:"winner",seed:23});
  brain.align=trainedAlign();
  for(let i=1;i<text.length;i++)brain.trace.geo.learn(text.charCodeAt(i-1),text.charCodeAt(i));
  const beforeMem=brain.align.mem.n,beforeLived=brain.lived,beforeGeo=brain.trace.geo.n;
  const opts={T:.95,max:220,seed:777,stopBlank:false};
  const plain=brain.chat([],opts);
  const observed=brain.chat([],{...opts,observePath:true,scanTemperatures:[.1,.5,.95,1.3,1.8]});
  assert.equal(observed.text,plain.text);
  assert.equal(observed.pathTrace.generated,220);
  assert.equal(observed.scanPaths.length,5);
  const entry=observed.scanPaths.find(s=>s.T===opts.T);
  assert.equal(entry.text,plain.text.slice(0,220));
  assert.ok(observed.scanPaths.every(s=>s.trace.seed===777));
  assert.ok(observed.scanPaths.every(s=>s.trace.livedAtStart===beforeLived));
  assert.ok(observed.scanPaths.every(s=>s.trace.geoStepsAtStart===beforeGeo));
  assert.equal(brain.align.mem.n,beforeMem);
  assert.equal(brain.trace.geo.n,beforeGeo);
  assert.equal(brain.lived,beforeLived);
  assert.equal(plain.pathTrace,undefined);
});
