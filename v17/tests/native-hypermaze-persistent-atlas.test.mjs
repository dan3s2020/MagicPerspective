// Strict original-brain/corpus atlas acceptance. No teacher answer leakage.
// The atlas MUST distinguish a missing edge from a cut-off maze search,
// preserve every recorded route (success AND failure) and survive restart.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND}
 from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {PersistentHypermazeAtlas}
 from "../research/text-hypermaze/persistent-atlas.mjs";

function trainedBrain(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
  empty:true,maxWires:32,fold:false},seed:11});
 b.enableEndogenousNoise();
 for(let i=0;i<80;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,340+i*31),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
    b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
test("all observed edits, full explored paths and genuinely missing routes survive a JSONL atlas restart with no silent eviction",{
 timeout:120000
},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-true-atlas-"));
 const file=path.join(tmp,"original-brain.v8.hypermaze-atlas.jsonl");
 try{
  const b=trainedBrain();
  const m=new NativeGoalTextMaze(b,{atlasFile:file,maxStates:250,maxDepth:5});
  const before=0;
  const realCorpus=["She is happy.","She is tired.",
   "He is tired.","He is calm.",
   "Știința este calmă.","Știința este rapidă.",
   "Experiența este rapidă.","Experiența este stabilă."].join("\n");
  const learned=m.observe(realCorpus);
  assert.equal(learned.learned,true);
  assert.equal(m.livedTexts,1);
  assert.ok(b.observedTransformations.operators.size>=6);
  const remembered=b.observedTransformations.seen;
  const correct=m.plan({start:"He is calm.",required:["She","calm"],
   recordAtlas:true,includeTopology:true});
  assert.equal(correct.found,true);
  assert.equal(correct.predicted,"She is calm.");
  assert.equal(correct.plannedBeforeFirstAction,true);
  assert.equal(correct.topology.complete,true,"If all reachable states are explored, report complete");
  assert.equal(correct.diagnostic.outcome,"path-found");
  assert.ok(correct.topology.nodes.some(n=>n.text==="She is calm."));
  const used=correct.actions.map(a=>a.key);
  assert.ok(used.every(Boolean),"Every action must cite an actually learned operator");
  const body=m.execute(correct,{enableNoise:false,trainNoise:false});
  assert.equal(body.solvedInternalGoal,true);
  assert.equal(body.executedFinal,correct.predicted);
  assert.ok(body.atlasExecutionSequence>correct.atlasSequence);
  const impossible=m.plan({start:"He is calm.",required:["unicorn"],
   recordAtlas:true,includeTopology:true});
  assert.equal(impossible.found,false);
  assert.equal(impossible.diagnostic.outcome,"no-path-in-finite-known-closure");
  assert.ok(impossible.diagnostic.missingTargetTokens.includes("unicorn"));
  assert.ok(impossible.diagnostic.causes.includes("missing-observed-goal-concepts"));
  assert.equal(impossible.topology.complete,true);
  const cut=m.plan({start:"He is calm.",required:["She","happy"],
   maxStates:4,maxDepth:1,recordAtlas:true,includeTopology:true});
  assert.equal(cut.topology.complete,false);
  assert.equal(cut.graph.completeKnownOperatorClosure,false);
  assert.ok(cut.graph.unexpandedFrontier>0);
  assert.equal(cut.diagnostic.outcome,"not-found-search-incomplete");
  assert.ok(cut.diagnostic.causes.some(x=>
    x==="state-budget-exhausted"||x==="depth-limit-reached"));
  assert.equal(b.observedTransformations.seen,remembered,
    "No frozen test may leak the wanted answer back into training");
  const orig=m.atlasSummary();
  assert.equal(orig.worldsByDomain.text,1);
  assert.equal(orig.searches,3);
  assert.equal(orig.searchesFound,1);
  assert.equal(orig.searchesFailed,2);
  assert.ok(orig.learnedOperatorEvents>=6);
  assert.ok(orig.journalEvents>12);
  assert.ok(fs.statSync(file).size>1000);
  const page=m.atlasPage({after:0,limit:5});
  assert.equal(page.events.length,5);
  assert.equal(page.nextCursor,5);
  assert.equal(page.hasMore,true);
  const paged=[];let after=0;
  while(true){
   const pg=m.atlasPage({after,limit:3});
   paged.push(...pg.events);
   if(!pg.hasMore)break;
   assert.ok(pg.nextCursor>after,"No endless cursor loop");
   after=pg.nextCursor;
  }
  assert.equal(paged.length,orig.journalEvents);
  assert.ok(paged.every((x,i)=>x.seq===i+1));
  const failures=m.atlasPage({after:0,limit:80,onlyFailed:true});
  assert.equal(failures.events.length,2);
  assert.ok(failures.events.every(x=>x.type==="search"&&!x.found));
  const known=m.atlasOperators({after:0,limit:250});
  assert.equal(known.totalOperators,b.observedTransformations.operators.size);
  assert.ok(known.operators.some(op=>used.includes(op.key)&&op.pathsUsedSuccessful>0));
  assert.ok(known.operators.some(op=>op.pathsUsedSuccessful===0));
  m.atlasFlush();
  const exactBytes=fs.readFileSync(file);
  const reloaded=new NativeGoalTextMaze(b,{atlasFile:file,
    maxStates:250,maxDepth:5});
  const restored=reloaded.atlasSummary();
  assert.equal(restored.journalEvents,orig.journalEvents);
  assert.equal(restored.searchesFound,1);
  assert.equal(restored.searchesFailed,2);
  assert.equal(reloaded.livedTexts,1);
  assert.deepEqual(reloaded.atlasPage({after:5,limit:2}).events,
   m.atlasPage({after:5,limit:2}).events);
  assert.ok(fs.readFileSync(file).equals(exactBytes),
   "Opening the atlas must never rewrite the original training evidence");
  console.log("NATIVE_FULL_ATLAS_RESTART_AND_MISSING_PATHS",JSON.stringify({
   observedTextBytes:Buffer.byteLength(realCorpus),
   learnedOperators:b.observedTransformations.operators.size,
   totalEvents:restored.journalEvents,success:restored.searchesFound,
   failure:restored.searchesFailed,
   missingWordReason:impossible.diagnostic.reason,
   finiteGraphCorrect:correct.topology.complete,
   boundedGraphIncomplete:!cut.topology.complete,
   preservedEveryJournalByte:true,originalBrainUnchanged:true,
   corpusEntireLanguageProved:false}));
  fs.appendFileSync(file,"{\"seq\":");
  assert.throws(()=>new PersistentHypermazeAtlas({file}),/Incomplete trailing atlas|Invalid atlas/,
   "A torn append must fail loudly, not silently lose a learned path");
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("atlas operator catalog includes every learned action and distinguishes used paths from unused edges",()=>{
 const b=trainedBrain(),m=new NativeGoalTextMaze(b);
 m.observe(["She is happy.","She is tired.","He is tired.","He is calm."].join("\n"));
 const opCount=b.observedTransformations.operators.size;
 const p=m.plan({start:"He is calm.",required:["She","calm"],recordAtlas:true});
 assert.equal(p.found,true);
 const c=m.atlasOperators({limit:250});
 assert.equal(c.totalOperators,opCount);
 assert.ok(c.operators.some(x=>x.pathsUsedSuccessful>0));
 const u=m.atlasOperators({limit:250,onlyUnused:true});
 assert.ok(u.totalOperators>=0&&u.totalOperators<opCount);
 assert.ok(u.operators.every(x=>x.pathsUsedSuccessful===0));
});
