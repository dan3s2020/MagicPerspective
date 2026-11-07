import test from "node:test";
import assert from "node:assert/strict";
import {CrossWorldAtlas,tuple} from "./atlas-engine.mjs";
import {ACTIONS,actualStep,trainWorlds,holdoutWorld,parseTerrain,evaluate,firstDifferentChar} from "./atlas-benchmark.mjs";

const seeds=[1181,3837,7731],runs=seeds.map(seed=>evaluate({seed,worlds:96}).result);
const sum=(f)=>runs.reduce((n,x)=>n+f(x),0);
test("model preserves evidence across 32 independently segmented worlds",()=>{
 for(const r of runs){
  assert.equal(r.trainingWorlds,32);assert.equal(r.trainingEvents,2432);
  assert.equal(r.atlas.models.length,8);
  assert.equal(r.atlas.discoveredConditionalRules,6);
  assert.equal(new Set(r.sourceWorldFragments.map(x=>x.world)).size,32);
  assert.equal(new Set(r.sourceWorldFragments.map(x=>x.action)).size,8);
  assert.ok(r.atlas.models.filter(x=>x.condition?.includes("parity")).length===6);
 }
});
test("complete 4D solution shape is predicted before ANY heldout action and is optimal",()=>{
 assert.equal(sum(x=>x.transfer.correct),288);
 assert.equal(sum(x=>x.transfer.optimal),288);
 assert.equal(sum(x=>x.transfer.noPath),0);
 assert.equal(sum(x=>x.transfer.mismatches),0);
 assert.equal(sum(x=>x.textCharacters),8188362);
 for(const r of runs)for(const example of r.transfer.successful){
  assert.equal(example.initialShape.length,example.oracleLength);
  assert.ok(example.allLearnedPaths.every(x=>x.evidenceWorlds?.length&&x.evidenceIds?.length));
  assert.ok(example.executedTrace.every(x=>x.matched&&!x.blocked));
 }
 console.log("VERIFIED_FULL_4D_CROSS_WORLD_ATLAS",JSON.stringify({
  worlds:288,correct:288,optimal:288,chars:8188362}));
});
test("flat transformation restriction actually breaks the hidden transition graph",()=>{
 assert.equal(sum(x=>x.baseline.correct),1);
 assert.equal(sum(x=>x.baseline.noPath),82);
 assert.equal(sum(x=>x.baseline.mismatches),205);
 for(const r of runs)for(const f of r.baseline.firstFailures){
  if(f.pathExists){assert.ok(f.firstMismatch?.action);
   assert.ok(f.firstMismatch?.sourceWorlds.length);
   assert.ok(f.firstWrongCharacter?.index>=0);
  }else assert.ok(f.reason&&f.explored>0);
 }
});
test("using ONLY one segmented world does not hallucinate the seven missing operators",()=>{
 assert.equal(sum(x=>x.oneWorld.correct),0);
 assert.equal(sum(x=>x.oneWorld.noPath),288);
});
test("ALL 2048 edges and 256 nodes, provenance, inferred edges and physical walls are enumerable",()=>{
 const {atlas,fragments}=trainWorlds({seed:1181});atlas.fit();const w=holdoutWorld(17);
 const g=atlas.completeAtlas(parseTerrain(w.document));
 assert.equal(g.nodes.length,256);assert.equal(g.edges.length,2048);assert.equal(g.gaps.length,0);
 assert.equal(g.edges.length+g.gaps.length,256*8);
 assert.equal(g.edges.filter(x=>x.observedDirectly).length,1402);
 assert.equal(g.edges.filter(x=>!x.observedDirectly).length,646);
 assert.ok(g.walls.length>0);
 assert.ok(g.edges.every(e=>e.evidenceIds.length&&e.sourceWorlds.length));
 const one=new CrossWorldAtlas({dims:4,side:4,actions:ACTIONS});
 for(const v of fragments[0].samples)one.observe({world:"first",from:v.from,action:v.action,to:v.to});
 one.fit();const other=one.completeAtlas(w.cells);
 assert.equal(other.gaps.length,1792);
 assert.ok(other.gaps.every(x=>x.reason==="NO_OBSERVED_TRANSITION"));
});
test("unseen physics changes cause errors — no universal 100 percent claim",()=>{
 const {atlas}=trainWorlds({seed:1181});atlas.fit();
 let errors=0;
 for(let n=0;n<256;n++)for(const a of ACTIONS){
  const next=actualStep(n,a==="lift"?"phase":a);
  errors+=+(atlas.predict(n,a).to!==next);
 }
 assert.equal(errors,256);
});
test("original finite atlas checkpoint preserves model/world provenance and paths",()=>{
 const {atlas}=trainWorlds({seed:3837});atlas.fit();
 const second=CrossWorldAtlas.restore(atlas.saveJSON()),w=holdoutWorld(911);
 assert.deepEqual(second.summary(),atlas.summary());
 assert.deepEqual(second.plan(w.start,w.goal,w.cells).solutionShape,
   atlas.plan(w.start,w.goal,w.cells).solutionShape);
 assert.deepEqual(second.predict(w.start,"phase"),atlas.predict(w.start,"phase"));
});
test("incomplete current-world map must fail rather than invent unknown walls",()=>{
 const w=holdoutWorld(997),text=w.document.split("\n").filter(s=>!s.includes("(0,0,0,0)")).join("\n");
 assert.throws(()=>parseTerrain(text),/Maze incomplete/);
});
test("first wrong action-string character and physical first mismatch are distinct diagnostics",()=>{
 assert.deepEqual(firstDifferentChar("fold phase","fold drift"),
  {index:5,predicted:"p",expected:"d",prefix:"fold "});
 assert.equal(firstDifferentChar("same","same"),null);
});
test("learning curve: repeat experiences from other worlds until conditional edges become identifiable",()=>{
 const small=[1,4,6].map(examples=>seeds.map(seed=>evaluate({seed,worlds:96,examples}).result));
 assert.equal(small[0].reduce((n,x)=>n+x.transfer.correct,0),4);
 assert.equal(small[1].reduce((n,x)=>n+x.transfer.correct,0),202);
 assert.equal(small[2].reduce((n,x)=>n+x.transfer.correct,0),288);
});
test("observational corruption is tolerated, but noise is not credited with discovery",()=>{
 for(const noise of [0,.055,.15,.30,.50]){
  const count=seeds.reduce((n,seed)=>n+evaluate({seed,worlds:96,noise}).result.transfer.correct,0);
  assert.equal(count,288);
 }
});

test("ORGANISM REUSES TRANSFORMATIONS PARSED FROM 32 TEXT EXERCISES, NOT GIVEN AS READY STRUCTURED INPUT",()=>{
 const {atlas,fragments}=trainWorlds({seed:1181,examples:76});
 assert.equal(fragments.length,32);
 for(const f of fragments){
  assert.ok(f.text.length>2000);
  assert.equal(f.ignored,1);
  assert.equal(f.samples.length,76);
  assert.deepEqual([...new Set(f.samples.map(x=>x.action))],[f.action]);
  assert.ok(f.samples.every(x=>atlas.events[x.id].provenance.startsWith("document:"+f.world+"/line:")));
 }
 const learned=atlas.fit({allowContext:true});
 assert.equal(learned.discoveredConditionalRules,6);
 const testWorld=holdoutWorld(1309746),plan=atlas.plan(testWorld.start,testWorld.goal,parseTerrain(testWorld.document));
 assert.ok(plan.found);
 assert.equal(atlas.evaluate(plan,actualStep,testWorld.cells).success,true);
 console.log("SEGMENTED_TEXT_ATLAS_TRANSFER",JSON.stringify({trainDocuments:fragments.length,
  observedTextEvents:atlas.events.length,conditions:learned.discoveredConditionalRules,
  heldoutBeforeActionPath:plan.solutionShape}));
});

test("each action-string character maps to a real learned operator and its prior-world training evidence",()=>{
 const {result}=evaluate({seed:1181,worlds:20});
 for(const attempt of result.attempts){
  const output=attempt.conditional.characterAttribution;
  assert.equal(output.characters.length,output.predicted.length);
  assert.ok(output.characters.every(x=>x.actionIndex!==null));
  assert.ok(output.routeEvidence.every(x=>x.evidenceIds.length&&x.sourceWorlds.length));
  assert.ok(output.characters.every(x=>output.routeEvidence[x.actionIndex]));
  assert.equal(attempt.conditional.success,true);
  assert.equal(typeof output.exactString,"boolean");
 }
});
