// V31 INTEGRATION of PR #72 alternates with V30 original one-Brain
// cumulative memory; no separate planning algorithm or reference oracle.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {enumerateNativePaths} from "../research/text-hypermaze/native-path-atlas.mjs";
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
function oldBrain(){
 const b=new Brain({rules,seed:233});
 for(let i=0;i<140;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,200+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
function witness(n,episode,from,to,action){
 return n.observeVerifiedWorldTransition({episode,
  before:from,after:to,action,accepted:true,
  source:"independent-world-action"});
}
test("RED: original V17 cumulative graph stores TWO independent complete 3-step paths and exposes every alternative with source evidence",()=>{
 const b=oldBrain(),n=new NativeGoalTextMaze(b);
 const edges=[
  ["start here","north pass","north","episode-A"],
  ["start here","south pass","south","episode-B"],
  ["north pass","amber goal","step north","episode-C"],
  ["south pass","cobalt goal","step south","episode-D"],
  ["north pass","south pass","across","episode-E"],
  ["south pass","north pass","return","episode-F"],
  ["cobalt goal","start here","circuit","episode-G"]
 ];
 for(const [from,to,action,episode] of edges)
  witness(n,episode,from,to,action);
 const goalRequest={start:"start here",required:["goal"],includeTopology:true};
 const planned=n.planCumulativeWorld(goalRequest);
 assert.equal(planned.found,true);
 assert.equal(planned.originalPlanner,"Discoverer.shapeGraph");
 const atlas=enumerateNativePaths(planned,{maxPaths:30,maxSteps:12});
 assert.ok(atlas.paths.length>=2,"Multiple observed alternative routes must remain reachable");
 assert.equal(atlas.topology.goalStates,2);
 assert.ok(atlas.topology.nonUniqueTerminalGoal===true,
  "The goal word 'goal' alone cannot specify amber vs cobalt");
 assert.ok(atlas.paths.some(p=>p.states.at(-1)==="amber goal"));
 assert.ok(atlas.paths.some(p=>p.states.at(-1)==="cobalt goal"));
 assert.ok(atlas.paths.every(p=>p.actions.every(a=>
  a.edgeStatus==="physically-verified"&&a.evidenceEpisode)));
 assert.ok(atlas.topology.cyclesDetected>=1);
 assert.ok(atlas.initialShape.usedEdges.length>0);
 const originalTrace=planned.initialShape;
 assert.equal(originalTrace.at(-1),planned.predicted);
 assert.ok(atlas.paths.some(p=>p.isInitialShape));
 assert.equal(planned.referenceAnswerProvided,false);
 const historical=n.cumulativeAtlas({view:"attempts",attemptId:planned.atlasAttemptId});
 assert.equal(historical.selectedAttempt.alternatives.enumeratedPathCount,atlas.paths.length);
 assert.equal(historical.selectedAttempt.alternatives.distinctGoalTexts,2);
 assert.equal(historical.selectedAttempt.alternatives.goalUnderdetermined,true);
 assert.ok(historical.selectedAttempt.diagnostics.some(x=>
  x.code==="GOAL_CONSTRAINTS_ALLOW_MULTIPLE_VALID_OUTPUTS"));
 assert.equal(historical.selectedAttempt.alternatives.paths.length,atlas.paths.length);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v31-native-alternates-"));
 try{
  const checkpoint=path.join(dir,"brain.v8");
  b.save(checkpoint);
  const restored=new NativeGoalTextMaze(Brain.load(checkpoint));
  const copy=restored.cumulativeAtlas({view:"attempts",attemptId:planned.atlasAttemptId});
  assert.deepEqual(copy.selectedAttempt.alternatives,historical.selectedAttempt.alternatives);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log("V31_ORIGINAL_ALTERNATE_ATLAS",JSON.stringify({
  sourceEpisodes:edges.length,validTerminalStates:atlas.topology.goalStates,
  fullAlternatePaths:atlas.paths.length,
  hiddenAnswerUsed:false,
  questionGoalAmbiguous:true,
  originalDiscovererChosen:planned.predicted,
  checkpointOriginalBrain:true
 }));
});
test("All simple routes are FINITE-bounded: truncated search must NOT claim mathematical closure",()=>{
 const b=oldBrain(),n=new NativeGoalTextMaze(b);
 for(let j=0;j<15;j++){
  witness(n,"world-"+j,"start pass","node"+j+" pass","jump-"+j);
  witness(n,"terminal-"+j,"node"+j+" pass","goal exit","finish-"+j);
 }
 const p=n.planCumulativeWorld({start:"start pass",required:["goal"],includeTopology:true});
 assert.equal(p.found,true);
 const limited=enumerateNativePaths(p,{maxPaths:3,maxSteps:10,maxVisits:100});
 assert.equal(limited.enumeration.truncated,true);
 assert.equal(limited.enumeration.allFiniteSimplePathsProven,false);
 assert.ok(limited.paths.length<=3);
 assert.ok(limited.topology.goalStates>=1);
 const event=n.cumulativeAtlas({view:"attempts",attemptId:p.atlasAttemptId});
 assert.equal(event.selectedAttempt.alternatives.enumerationTruncated,true);
 assert.equal(event.selectedAttempt.alternatives.allNaturalLanguagePathsEnumerated,false);
});
test("A falsely accepted shortcut cannot be shown as still walkable after real rejection; whole state memory unchanged by route enumeration",()=>{
 const b=oldBrain(),n=new NativeGoalTextMaze(b);
 witness(n,"root","start room","goal room","shortcut");
 witness(n,"other","start room","middle room","walk");
 witness(n,"other2","middle room","goal room","climb");
 const prior=n.planCumulativeWorld({start:"start room",required:["goal"],includeTopology:true});
 assert.equal(prior.found,true);assert.equal(prior.steps,1);
 const before=JSON.stringify([...b.hypermazeCumulativeExperience.edges]);
 const audit=enumerateNativePaths(prior,{maxPaths:12});
 assert.equal(JSON.stringify([...b.hypermazeCumulativeExperience.edges]),before);
 assert.ok(audit.paths.some(p=>p.length===1));
 n.observeVerifiedWorldTransition({episode:"blocked",before:"start room",
  action:"shortcut",after:"start room",expectedAfter:"goal room",
  accepted:false,source:"independent-environment-rejection"});
 const after=n.planCumulativeWorld({start:"start room",required:["goal"],includeTopology:true});
 assert.equal(after.steps,2);
 assert.ok(after.topology.edges.every(e=>e.action!=="shortcut"));
 const physical=n.cumulativeAtlas({view:"edges",filter:"blocked"});
 assert.ok(physical.rows.some(x=>x.action==="shortcut"&&!x.traversableNow));
});
