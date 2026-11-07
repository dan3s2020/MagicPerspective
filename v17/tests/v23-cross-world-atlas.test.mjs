import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {portableTransformations,portableId,parsePortableId} from "../transcend/torus-aether/worlds/cross-world-transforms.mjs";
import {AtlasJournal,readAtlasPage,appendAtlasEvent} from "../transcend/torus-aether/devour/atlas-journal.mjs";
function observed(){
 const m=new LearnedCognitiveMap();
 // World 1 and 2 teach BLUE -> RED with different local contexts.
 // World 3 and 4 independently teach RED -> GREEN. No training
 // example contains both blue and green, and the target form is heldout.
 for(const [i,s] of [
  "blue is happy.","red is happy.","blue was tired.","red was tired.",
  "red feels calm.","green feels calm.","red looks rested.","green looks rested."
 ].entries())m.observeWorld(s,{id:i+1});
 return m;
}
const goal={slots:{0:"green"}};
test("multiple previously segmented observed worlds produce original V17 2-hop pre-action shape on a NEW long world",()=>{
 const model=observed();
 const portable=portableTransformations(model.rules);
 assert.ok(portable.some(x=>x.from==="blue"&&x.to==="red"&&x.support>=2));
 assert.ok(portable.some(x=>x.from==="red"&&x.to==="green"&&x.support>=2));
 assert.ok(!portable.some(x=>x.from==="blue"&&x.to==="green"&&x.support>=2),
   "No direct blue->green transform may be invented");
 const untouched=Array.from({length:75},(_,i)=>"unseen"+i);
 const starting=["blue",...untouched];
 const expected=["green",...untouched];
 const frozen=JSON.stringify(model.export());
 const without=model.formSolution(starting,goal,{transfer:false,maxNodes:256,maxDepth:6});
 assert.equal(without.found,false,"Original context-gated maze must be segmented on this unseen context");
 const plan=model.formSolution(starting,goal,{transfer:true,maxNodes:256,maxDepth:6});
 assert.equal(plan.found,true,"The organism must COMPOSE rules learned in different worlds");
 assert.equal(plan.directOriginalMethod,"Discoverer.shape");
 assert.equal(plan.plannedBeforeAction,true);
 assert.equal(plan.path.length,2,"Cannot fabricate a direct path when only 2-hop evidence exists");
 assert.equal(plan.usedCrossWorld,true);
 assert.ok(plan.path.every(x=>x.action.startsWith("__XWORLD__:")));
 assert.deepEqual(plan.world.states[plan.path.at(-1).to],expected);
 assert.ok(plan.world.portableProjectedEdges>=2);
 assert.equal(JSON.stringify(model.export()),frozen,"Heldout text and answer must not enter training during planning");
 const actual=model.execute(plan,{observe:false,step:(before,action)=>{
   const op=parsePortableId(action);
   assert.ok(op);assert.equal(before[op.at],op.from);
   const after=before.slice();after[op.at]=op.to;
   return {after,accepted:true};
 }});
 assert.equal(actual.solved,true);
 assert.deepEqual(actual.final,expected);
 console.log("V23_SPLIT_WORLD_RECOMPOSITION",JSON.stringify({
  independentTrainingWorlds:8,unseenTokens:76,
  originalDiscoverer:true,preActionHops:plan.path.length,
  route:plan.path.map(x=>parsePortableId(x.action)),
  entireStructuredOutputExact:true,
  naturalLanguageUnseenQAAccuracyNotProven:true
 }));
});
test("independent evidence gate rejects a single remembered example from becoming a universal transform",()=>{
 const m=new LearnedCognitiveMap();
 m.observeWorld("blue is happy.",{id:1});
 m.observeWorld("red is happy.",{id:2});
 assert.equal(portableTransformations(m.rules).length,0);
 const r=m.formSolution("blue never seen.",{slots:{0:"red"}});
 assert.equal(r.found,false);
 assert.ok(r.world.diagnostics.excludedByDesign.includes("INSUFFICIENT_INDEPENDENT_CONTEXT_EVIDENCE_FOR_TRANSFER"));
 assert.equal(r.reason,"NO_REACHABLE_GOAL_IN_CURRENT_EVIDENCE_NOT_PROOF_OF_IMPOSSIBILITY");
});
test("new goal without supporting transformation is a diagnostic missing edge, never false proof that no path exists",()=>{
 const m=observed();
 const r=m.formSolution("blue never seen.",{slots:{0:"violet"}},{maxNodes:64,maxDepth:4});
 assert.equal(r.found,false);
 assert.ok(r.world.diagnostics.goalTokensNeverGenerated.includes("violet"));
 assert.ok(r.world.diagnostics.excludedByDesign.includes("MISSING_GOAL_TRANSFORMATION_OR_CONTEXT"));
 assert.ok(r.world.diagnostics.excludedByDesign.includes("MAX_DEPTH_EXCEEDED")||r.world.diagnostics.excludedByDesign.includes("MAX_NODES_EXCEEDED")||
   r.reason==="NO_REACHABLE_GOAL_IN_CURRENT_EVIDENCE_NOT_PROOF_OF_IMPOSSIBILITY");
});
test("a real failed wall blocks only the attempted portable edge in that exact world state",()=>{
 const m=observed(),initial=["blue","new","unknown"],action=portableId(0,"blue","red");
 const p=m.formSolution(initial,goal,{maxNodes:64,maxDepth:4});
 assert.ok(p.path.length>=1);
 assert.equal(m.predict(initial,action)[0],"red");
 const rejected=m.observeIntervention({before:initial,action,after:initial,accepted:false});
 assert.equal(rejected.blocked,true);
 assert.equal(m.predict(initial,action),null);
 assert.notEqual(m.predict(["blue","elsewhere","unknown"],action),null,
   "An observed wall in one state cannot block valid other worlds");
 const after=m.formSolution(initial,goal,{maxNodes:64,maxDepth:4});
 assert.equal(after.found,false,"The shortest two-hop path is now actually blocked");
});
test("all 100 unique heldout 76-token context worlds are solved by a multi-hop ORIGINAL Discoverer path, not trained on answers",()=>{
 const m=observed();const before=JSON.stringify(m.export());
 let successes=0;
 for(let i=0;i<100;i++){
   const world=["blue",...Array.from({length:75},(_,j)=>"token_"+i+"_"+j)];
   const plan=m.formSolution(world,goal,{maxNodes:64,maxDepth:4});
   if(plan.found&&plan.path.length===2&&
      plan.world.states[plan.path.at(-1).to].join("\u001f")===
      ["green",...world.slice(1)].join("\u001f"))successes++;
 }
 assert.equal(successes,100);
 assert.equal(JSON.stringify(m.export()),before);
 console.log("V23_CROSS_WORLD_HOLDOUT_STRUCTURED",JSON.stringify({
  100:successes,wholeStructuredAnswerExact:successes,
  goalSlotsProvided:true,untouchedTokenContexts:75,
  semanticNaturalQuestionAccuracy:"NOT MEASURED"
 }));
});
test("atlas is append-only, reads entire >64KB events without truncation and paginates past 250 with zero skipped bytes",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v23-atlas-"));
 const file=path.join(root,"brain-0-stable.v8.atlas.jsonl");
 try{
  const j=new AtlasJournal(file);
  for(let i=0;i<525;i++){
   j.record({type:i%3?"rule-evidence":"planning-attempt",id:i,
     payload:i===410?"complete-one-big-graph-".repeat(4000):"actual-rule-"+i,
     reason:i%3?"observed":"missing"});
  }
  j.sync();j.close();
  const all=[];let cursor=0,loops=0;
  for(;;){
   const p=readAtlasPage(file,{cursor,limit:17});
   all.push(...p.rows);
   assert.equal(p.omittedRecords,0);
   assert.ok(p.nextCursor>cursor||p.end);
   cursor=p.nextCursor;loops++;
   if(p.end)break;
   assert.ok(loops<80,"Never hang on large split record");
  }
  assert.equal(all.length,525);
  assert.deepEqual(all.map(x=>x.id),Array.from({length:525},(_,i)=>i));
  assert.ok(all[410].payload.length>64000);
  assert.equal(cursor,fs.statSync(file).size);
  let k=0,c=0;
  do{const page=readAtlasPage(file,{cursor:c,limit:23,kind:"planning-attempt"});
   k+=page.rows.length;c=page.nextCursor;if(page.end)break;
  }while(true);
  assert.equal(k,175);
  appendAtlasEvent(file,{type:"failed-route",reason:"NO_GOAL_TRANSFORM",id:525});
  const tail=readAtlasPage(file,{cursor,limit:1});
  assert.equal(tail.rows.length,1);assert.equal(tail.rows[0].id,525);
  console.log("V23_FULL_APPEND_ONLY_ATLAS",JSON.stringify({
    firstEvents:525,paginatedEvents:all.length,
    largeRecordBytes:all[410].payload.length,
    newlyAppended:true,omitted:0
  }));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("long 500-token sentence is NEVER silently discarded: overlapping real pages and every source position recorded",()=>{
 const model=new LearnedCognitiveMap(),events=[];
 model.onAtlasEvidence=e=>{if(e.type==="segment-bridge")events.push(e);};
 const tokens=Array.from({length:500},(_,i)=>"word_"+i);
 assert.equal(model.observeSentence(tokens,{source:"document-500"}),true);
 assert.equal(model.segmentedLongSentences,1);
 assert.ok(model.observedSegmentBridges>=5);
 assert.ok(model.examples.size>=5);
 const pages=[...model.examples.values()].map(x=>x.tokens);
 assert.ok(pages.every(p=>p.length===96),"No short artificial suffix windows");
 const seen=new Set(pages.flat()),source=new Set(tokens);
 assert.equal(seen.size,500);
 assert.deepEqual([...seen].sort(),[...source].sort());
 for(let i=0;i<events.length;i++){
   const e=events[i];
   assert.equal(e.evidenceLevel,"OBSERVED_CONTIGUOUS_TOKENS_NOT_INFERRED_TRANSFORM");
   assert.deepEqual(e.fromWindowTokens.slice(-e.overlapTokens.length),e.overlapTokens);
   assert.deepEqual(e.toWindowTokens.slice(0,e.overlapTokens.length),e.overlapTokens);
   assert.ok(e.toOffset>e.fromOffset);
 }
 const restored=LearnedCognitiveMap.restore(model.export());
 assert.equal(restored.observedSegmentBridges,model.observedSegmentBridges);
 assert.equal(restored.segmentedLongSentences,1);
});
test("an unseen 4,000-token input can navigate two cross-world transformations with complete unchanged tail",()=>{
 const model=observed();
 const tail=Array.from({length:3999},(_,i)=>"extremely_long_segment_"+i);
 const plan=model.formSolution(["blue",...tail],goal,{maxNodes:24,maxDepth:5,transfer:true});
 assert.equal(plan.found,true);
 assert.equal(plan.path.length,2);
 assert.equal(plan.world.states[plan.path.at(-1).to].length,4000);
 assert.deepEqual(plan.world.states[plan.path.at(-1).to].slice(1),tail);
 assert.ok(plan.world.diagnostics);
 console.log("V23_LONG_HYPERMAZE",JSON.stringify({
  tokens:4000,unseenSource:true,fullTailUnmodified:true,
  originalMethod:plan.directOriginalMethod,steps:plan.path.length,
  answerGoalExplicit:true
 }));
});
test("all learned contrast and live intervention/external-domain actions are emitted to exact audit journal",()=>{
 const m=observed(),events=[];
 m.onAtlasEvidence=e=>events.push(e);
 m.observeWorld("blue is quiet.",{id:771});
 m.observeWorld("red is quiet.",{id:772});
 m.observeExternalTransition({domain:"maze",before:[0,0],after:[1,0],action:"east",context:"actually observed"});
 m.observeActionResult({before:["blue"],after:["blue"],action:"blocked:portal",accepted:false});
 assert.ok(events.some(x=>x.type==="rule-evidence"&&x.documentId===772));
 assert.ok(events.some(x=>x.type==="observed-external-transition"&&x.world==="maze"));
 assert.ok(events.some(x=>x.type==="observed-action"&&x.reason==="WALL_ACTION_REJECTED"));
});
