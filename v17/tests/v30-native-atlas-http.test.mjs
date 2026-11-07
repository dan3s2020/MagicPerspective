import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {Script} from "node:vm";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeAtlasRuntime,createAtlasServer}
 from "../research/text-hypermaze/native-atlas-server.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function native(){
 const b=new Brain({rules,seed:11});
 for(let i=0;i<240;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
function witnessEvents(){
 return [
  {episodeId:"fruit-world",action:"add-two",
   before:"Nina has 3 apples.",after:"Nina has 5 apples.",accepted:true},
  {episodeId:"books-world",action:"add-two",
   before:"Paul has 8 books.",after:"Paul has 10 books.",accepted:true},
  {episodeId:"coins-world",action:"subtract-one",
   before:"Zara has 6 coins.",after:"Zara has 5 coins.",accepted:true},
  {episodeId:"shells-world",action:"subtract-one",
   before:"Leo has 15 shells.",after:"Leo has 14 shells.",accepted:true}
 ];
}
async function setup(t,{maxStates=256,maxDepth=8}={}){
 const root=await fsp.mkdtemp(path.join(os.tmpdir(),"magic-v30-native-http-"));
 t.after(()=>fsp.rm(root,{recursive:true,force:true}));
 const brain=native();
 const source=path.join(root,"original-v17-saved.v8");
 brain.save(source);
 const sourceSnapshot=await fsp.readFile(source);
 const runtime=new NativeAtlasRuntime(Brain.load(source),{
  out:path.join(root,"separate-v30-atlas"),maxStates,maxDepth,saveEvery:2});
 const input=path.join(root,"actual-world-witnesses.jsonl");
 await fsp.writeFile(input,witnessEvents().map(x=>JSON.stringify(x)).join("\n")+"\n");
 const imported=await runtime.ingest(input);
 assert.equal(imported.accepted,4);
 assert.equal(runtime.status().atlas.witnessedEvents,4);
 assert.deepEqual(await fsp.readFile(source),sourceSnapshot,"Original V17 checkpoint must stay untouched");
 assert.ok(fs.existsSync(runtime.checkpoint));
 return {root,source,input,runtime,originalBytes:sourceSnapshot};
}
test("V30 native HTTP: persisted original Brain, real witness ingestion, global graph and all inspection endpoints",async t=>{
 const {runtime,input}=await setup(t);
 const server=await createAtlasServer(runtime,{port:0});
 t.after(()=>new Promise(ok=>server.close(ok)));
 const base="http://127.0.0.1:"+server.address().port;
 const status=await (await fetch(base+"/api/status")).json();
 assert.equal(status.originalBrain,true);
 assert.equal(status.training.witnessedTransformations,4);
 assert.equal(status.training.transferableRules,2);
 assert.equal(status.noise.duringCrossWorldShape,"none");
 assert.equal(status.geometry.generatedGeometry,false);
 const page=await (await fetch(base+"/api/atlas?section=witnesses&offset=2&limit=2")).json();
 assert.equal(page.total,4);assert.equal(page.items.length,2);assert.equal(page.more,false);
 const rulesResult=await (await fetch(base+"/api/atlas?section=rules")).json();
 assert.equal(rulesResult.total,2);
 const form=await (await fetch(base+"/")).text();
 assert.match(form,/atlasul labirintului între lumi/);
 assert.match(form,/id="graph"/);
 assert.match(form,/id="diagnostic"/);
 assert.match(form,/id="showGlobal"/);
 const script=form.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Script(script[1]));
 const post=async(uri,data)=>fetch(base+uri,{method:"POST",
  headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 const planResponse=await post("/api/plan",{
  episodeId:"heldout-unknown-world",startText:"Ada has 17 marbles.",
  goal:{numericEquals:21}
 });
 assert.equal(planResponse.status,200);
 const plan=await planResponse.json();
 assert.equal(plan.found,true);
 assert.equal(plan.predicted,"Ada has 21 marbles.");
 assert.equal(plan.noOracleAnswerProvided,true);
 assert.equal(plan.actionSequence.length,2);
 assert.ok(Array.isArray(plan.graph.originalV17AttractionField));
 const detail=await (await fetch(base+"/api/attempt?id="+plan.id)).json();
 assert.equal(detail.attempt.episodeId,"heldout-unknown-world");
 assert.equal(detail.attempt.path.length,3);
 assert.equal(detail.graphSemantics.knownClosure,plan.frontier.closureOfAllCurrentlyAdmittedTransfers);
 const full=await (await fetch(base+"/api/global-topology?nodeOffset=0&nodeLimit=1000&edgeLimit=2000")).json();
 assert.ok(full.totalNodes>=8);
 assert.ok(full.totalEdges>=5);
 assert.equal(full.witnessedWorlds,4);
 assert.equal(full.unknownLanguageSpaceNotEnumerated,true);
 assert.ok(full.edges.some(x=>x.status==="WITNESSED_IN_SOURCE_WORLD"));
 assert.ok(full.edges.some(x=>x.status==="PREDICTED_FROM_RULES_NOT_YET_VERIFIED_HERE"));
 assert.ok(full.nodes.some(x=>x.text==="Ada has 21 marbles."));
 const compare=await (await fetch(base+"/api/compare?id="+plan.id)).json();
 assert.equal(compare.planned,true);
 assert.ok(Array.isArray(compare.missingObservedRules));
 const saved=await (await post("/api/save",{})).json();
 assert.equal(saved.saved,true);
 const denial=await (await fetch(base+"/api/attempt?id=999999999")).json();
 assert.match(denial.error,/No recorded original plan/);
 const cors=await fetch(base+"/api/plan",{method:"POST",
  headers:{origin:"http://malicious.invalid","content-type":"application/json"},
  body:"{}"});
 assert.equal(cors.status,403);
 const restored=new NativeAtlasRuntime(Brain.load(runtime.checkpoint),{
  out:runtime.out});
 assert.equal(restored.status().atlas.recordedFrozenPlans,1);
 assert.equal(restored.status().atlas.witnessedEvents,4);
 assert.equal(restored.engine.summary().reusableActions,2);
 await assert.rejects(runtime.ingest(input+"-changed"),/ENOENT/);
 console.log("V30_NATIVE_ATLAS_HTTP_PASS",JSON.stringify({
  witnessedWorlds:full.witnessedWorlds,observedEdges:full.edges.filter(x=>
   x.status==="WITNESSED_IN_SOURCE_WORLD").length,
  transferredEdges:full.edges.filter(x=>
   x.status==="PREDICTED_FROM_RULES_NOT_YET_VERIFIED_HERE").length,
  predictedFrozenBeforeAction:plan.predicted,
  originalBrainCheckpointPreserved:true,
  wholeGlobalGraphPagination:true,
  noMadeUp5DCoords:true}));
});
test("V30 native HTTP failure atlas exposes depth-budget blockage and missing rule without asserting imaginary world edges",async t=>{
 const {runtime}=await setup(t,{maxStates:6,maxDepth:1});
 const server=await createAtlasServer(runtime,{port:0});
 t.after(()=>new Promise(ok=>server.close(ok)));
 const base="http://127.0.0.1:"+server.address().port;
 const post=async(body)=>{const r=await fetch(base+"/api/plan",{
  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  assert.equal(r.status,200);return r.json();};
 const p=await post({episodeId:"missing-full-maze",
  startText:"Lara has 11 shells.",goal:{numericEquals:55}});
 assert.equal(p.found,false);
 assert.ok(p.frontier.counts.depthCutoff>0||p.frontier.counts.stateCutoff>0);
 assert.equal(p.frontier.closureOfAllCurrentlyAdmittedTransfers,false);
 assert.equal(p.reason,"SEARCH_CUTOFF_BEFORE_CLOSURE");
 const diagnostic=await (await fetch(base+"/api/compare?id="+p.id)).json();
 assert.ok(diagnostic.explicitDesignRestrictions.some(x=>
  x.type==="DEPTH_DESIGN_CUTOFF"||x.type==="STATE_DESIGN_CUTOFF"));
 const full=await (await fetch(base+"/api/global-topology?nodeLimit=1000&edgeLimit=2000")).json();
 assert.ok(full.edges.some(x=>x.status==="BLOCKED_BY_EXPLICIT_SEARCH_BUDGET"));
 assert.ok(full.blockedKnownDesignEdges>0);
 const impossible=await post({episodeId:"missing-action-label",
  startText:"Ada has 17 marbles.",goal:{numericEquals:21},
  allowedActions:["not-ever-observed"]});
 assert.equal(impossible.found,false);
 assert.deepEqual(impossible.frontier.missingLabels,["not-ever-observed"]);
 const failures=await (await fetch(base+"/api/atlas?section=failures")).json();
 assert.equal(failures.total,2);
 console.log("V30_DESIGN_LIMITS_VISIBLE",JSON.stringify({
  failedPlans:failures.total,blockedEdges:full.blockedKnownDesignEdges,
  shapeStillOriginal:true,imaginaryNaturalLanguageClosure:false}));
});
test("V30 native source fingerprint keeps actual world-witness file immutable across resume",async t=>{
 const {runtime,input}=await setup(t);
 const again=await runtime.ingest(input);
 assert.equal(again.accepted,4);
 assert.equal(runtime.status().atlas.witnessedEvents,4,
  "Same evidence MUST NOT be read twice");
 await fsp.appendFile(input,JSON.stringify({
  episodeId:"tampered",action:"unsupported",before:"A",after:"B",accepted:true})+"\n");
 await assert.rejects(runtime.ingest(input),/altered file/);
 assert.equal(runtime.status().atlas.witnessedEvents,4);
});
