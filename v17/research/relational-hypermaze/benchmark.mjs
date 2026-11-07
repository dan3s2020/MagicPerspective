#!/usr/bin/env node
// Fully repeatable structured-text research benchmark, never open-domain QA.
// Run from repository root with Node.js 22+:
//   node v17/research/relational-hypermaze/benchmark.mjs
import assert from "node:assert/strict";
import {ObservedGrammar,words,makeGrammar,makeHeldout,preactionShape,verifyPhysics}
 from "./engine.mjs";

const grammar=makeGrammar(),frozen=JSON.stringify(grammar.snapshot());
const stats={protocol:"V23_REPRODUCIBLE_EXPERIMENT_NOT_NATURAL_LANGUAGE_QA",
 method:"original Discoverer.shape direct call",baseBranch:"experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107",
 seedStart:120000,seedEndExclusive:120300,trainingWorldTransitionObservations:15,
 tasks:300,fullRouteCorrectBeforeAction:0,physicallyValid:0,shortestRoute:0,
 untrainedGrammarAbstains:0,unknownSurfaceGrammarAbstains:0,
 totalDocumentBytes:0,totalDocumentWords:0,generatedWorldEdges:0,parsedEdges:0,
 targetsKnown:true,solverSawOracleRoute:false,openDomainQA:false};
const untrained=new ObservedGrammar();
for(let seed=stats.seedStart;seed<stats.seedEndExclusive;seed++){
 const params={routeLength:3+seed%8,distractors:70+seed%40};
 const world=makeHeldout(seed,params);
 const plan=preactionShape(grammar,world.document,world.initial,world.goal,{seed});
 const result=verifyPhysics(plan,world);
 stats.fullRouteCorrectBeforeAction+=Number(result.solved);
 stats.physicallyValid+=Number(result.valid);
 stats.shortestRoute+=Number(result.solved&&result.steps===world.routeLength);
 stats.totalDocumentBytes+=world.document.length;
 stats.totalDocumentWords+=words(world.document).length;
 stats.generatedWorldEdges+=world.hiddenEdges.length;
 stats.parsedEdges+=plan.world.observed;
 stats.untrainedGrammarAbstains+=Number(!preactionShape(
   untrained,world.document,world.initial,world.goal,{seed}).found);
 const unknown=makeHeldout(seed,{...params,unseenSurface:true});
 stats.unknownSurfaceGrammarAbstains+=Number(!preactionShape(
   grammar,unknown.document,unknown.initial,unknown.goal,{seed}).found);
}
assert.equal(JSON.stringify(grammar.snapshot()),frozen,"test data must never mutate the training memory");
stats.accuracyPercent=100*stats.fullRouteCorrectBeforeAction/stats.tasks;
stats.meanTextBytes=stats.totalDocumentBytes/stats.tasks;
stats.meanWords=stats.totalDocumentWords/stats.tasks;
stats.negativeControlsPassed=stats.untrainedGrammarAbstains===300&&
 stats.unknownSurfaceGrammarAbstains===300;
stats.passedSpecifiedConstrainedWorldThreshold=stats.accuracyPercent>=70&&stats.negativeControlsPassed;
stats.unsolvedRequirements=[
 "open-domain semantic natural language QA not evaluated",
 "no OpenThoughts3 unseen question->unknown answer exact-match proof",
 "the goal state is explicitly supplied, like a maze exit",
 "sentence grammar template examples use witnessed state/action labels",
 "the graph is four explicit observable axes, not autonomously discovered noise geometry",
 "no V17 native UI / CUDA integration or end-to-end Windows runtime proof"
];
console.log(JSON.stringify(stats,null,2));
assert.ok(stats.passedSpecifiedConstrainedWorldThreshold);
