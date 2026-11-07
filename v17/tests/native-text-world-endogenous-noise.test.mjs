import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {train,world,perform} from "../research/text-hypermaze/grounded-4d-benchmark.mjs";

test("ORIGINAL NoiseAgency perturbs actual 4D TEXT solution route before action, learns from observed outcomes and resumes",{
 timeout:90000},()=>{
 const brain=new Brain({rules:"winner",seed:43});
 const policy=brain.enableEndogenousNoise();
 train(17,{agent:brain.textGoal});
 const beforeModel=brain.textGoal.frozenFingerprint();
 let interventions=0,perceptionSteps=0,imaginationSteps=0;
 const trainCount=40;
 for(let i=0;i<trainCount;i++){
  const w=world(7000+i*37);
  const baseline=brain.predictTextWorldShape(w.document,w.start,w.goal);
  const planned=brain.planTextWorldWithNoise(w.document,w.start,w.goal);
  assert.equal(planned.preAction,true);
  assert.equal(planned.noiseDecision.domain,"text");
  assert.equal(planned.noisePolicyOwnedByOriginalBrain,true);
  assert.equal(planned.actionsLearned,brain.textGoal.transitions);
  if(planned.noiseDecision.site==="perception"){
   assert.ok(planned.noisePerturbedCells>0);
   assert.notDeepEqual([...planned.map], [...baseline.map],
    "Perception noise must change INTERNAL belief, not act as a UI decoration");
   perceptionSteps++;
  }
  if(planned.noiseDecision.site==="imagination"){
   assert.ok(planned.noiseImaginationSeed>0);
   imaginationSteps++;
  }
  interventions+=+planned.noiseApplied;
  // Execute the action route in the REAL 4D world. No oracle enters plan().
  const outcome=brain.textGoal.execute(w,planned,{physics:perform});
  const feedback=brain.observeTextWorldOutcome(planned.noiseDecision,w.start,outcome.at,
   outcome.solved,{train:true});
  assert.equal(typeof feedback.reward,"number");
 }
 assert.equal(brain.noiseAgent.total,trainCount);
 assert.ok(interventions>0);
 assert.ok(perceptionSteps>0,"Noisy internal perceptions must actually occur");
 // A learned contextual bandit is free to reject imagination noise after
 // experiencing poor rewards; its preference is data, not a missing feature.
 // Verify that the imagination OPERATOR works under an explicit unit-test
 // branch without falsifying the measured native policy choices.
 const realDecision=policy.decide;
 try {
  policy.decide=()=>({domain:"text",key:"text:known:plan",arm:3,
    site:"imagination",strength:.35});
  const unitWorld=world(7771);
  const unit=brain.planTextWorldWithNoise(unitWorld.document,unitWorld.start,
    unitWorld.goal);
  assert.equal(unit.noiseDecision.site,"imagination");
  assert.ok(unit.noiseImaginationSeed>0);
  assert.equal(unit.noiseApplied,true);
 }finally{policy.decide=realDecision;}

 assert.equal(brain.textGoal.frozenFingerprint(),beforeModel,
  "Noise-world feedback must update the original NoiseAgency, not leak heldout into text model");
 const beforeTest=brain.noiseAgent.total;
 const unseen=world(990123),candidate=brain.planTextWorldWithNoise(
  unseen.document,unseen.start,unseen.goal);
 const actual=brain.textGoal.execute(unseen,candidate,{physics:perform});
 assert.ok(typeof actual.solved==="boolean");
 // Frozen unseen evaluation is NOT fed back as training evidence.
 assert.equal(brain.noiseAgent.total,beforeTest);
 assert.deepEqual(brain.observeTextWorldOutcome(candidate.noiseDecision,unseen.start,
  actual.at,actual.solved,{train:false}),{trained:false});
 assert.equal(brain.noiseAgent.total,beforeTest);
 // Paired FROZEN heldout worlds, same goals/maps/physics and different
 // organism-selected noise decisions. Compare real task success; do NOT
 // claim endogenous noise is beneficial merely because it runs.
 let noNoiseSuccess=0,agencyNoiseSuccess=0;
 const frozenPolicyTotal=brain.noiseAgent.total;
 for(let i=0;i<64;i++){
  const w=world(510001+i*53);
  const control=brain.predictTextWorldShape(w.document,w.start,w.goal);
  const viaAgency=brain.planTextWorldWithNoise(w.document,w.start,w.goal);
  noNoiseSuccess+=+brain.textGoal.execute(w,control,{physics:perform}).solved;
  agencyNoiseSuccess+=+brain.textGoal.execute(w,viaAgency,{physics:perform}).solved;
 }
 assert.equal(noNoiseSuccess,64);
 assert.equal(brain.noiseAgent.total,frozenPolicyTotal,
  "Frozen outcomes must never train policy or see the reference path");
 console.log("V17_ENDOGENOUS_TEXT_NOISE_PAIRED_FROZEN",JSON.stringify({
  worlds:64,noNoiseSuccess,agencyNoiseSuccess,
  noiseChosenDuringTraining:brain.noiseAgent.bySite,
  policyRewardsFromFrozenTests:0
 }));
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"mp-real-noise-text4d-"));
 try{
  const file=path.join(directory,"native.v8");
  brain.save(file);
  const restored=Brain.load(file);
  assert.equal(restored.noiseAgent.total,trainCount);
  assert.deepEqual(restored.noiseAgent.bySite,brain.noiseAgent.bySite);
  assert.equal(restored.textGoal.frozenFingerprint(),brain.textGoal.frozenFingerprint());
  assert.equal(typeof restored.planTextWorldWithNoise,"function");
  assert.equal(typeof restored.noiseAgent.decide,"function");
  console.log("ORIGINAL_V17_NOISEAGENCY_4D_ACTIONS",JSON.stringify({
   actualTrainingEvents:trainCount,nonzeroInterventions:interventions,
   perceptionChanges:perceptionSteps,imaginationChoices:imaginationSteps,
   heldoutAgentRewards:0,checkpointRestored:true,
   policy:restored.noiseAgent.bySite,
   predictiveRouteBeforeAction:candidate.initialActions}));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
