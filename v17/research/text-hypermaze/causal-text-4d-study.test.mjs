import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from './causal-text-4d-study.mjs';

const seeds=[17,29,47];
const evaluated=seeds.map(seed=>evaluate({seed,count:64}));

test('a complete long-text 4D path is planned BEFORE the first step using only prior learned transitions',()=>{
 for(const r of evaluated){
  assert.equal(r.trainingTransitions,480);
  assert.equal(r.trainingReliabilityObservations,15000);
  assert.equal(r.learnedDirectionsCorrect,8);
  assert.equal(r.full.correct,r.count);
  assert.equal(r.full.firstRouteOptimal,r.count);
  assert.equal(r.frozenTestNeverTrains,true);
  assert.ok(r.firstExample.documentChars>100_000);
  assert.equal(r.firstExample.pathBeforeAction.length,r.firstExample.pathLength);
  assert.ok(r.firstExample.pathLength>=5);
  assert.equal(r.firstExample.executedCorrect,true);
  assert.equal(r.full.parsedFacts,64*256*3);
 }
});
test('the real 4D coordinates and learned action mappings are necessary, not decorative labels',()=>{
 const totals=evaluated.reduce((a,r)=>({
  good:a.good+r.full.correct,
  twoDimensional:a.twoDimensional+r.ablate2D.correct,
  shuffledActions:a.shuffledActions+r.shuffledActions.correct,
  noTrust:a.noTrust+r.withoutLearnedTrust.correct
 }),{good:0,twoDimensional:0,shuffledActions:0,noTrust:0});
 assert.equal(totals.good,192);
 assert.ok(totals.twoDimensional<totals.good*0.5);
 assert.ok(totals.shuffledActions<totals.good*0.5);
 assert.ok(totals.noTrust<totals.good*0.5);
 console.log('HYPERTEXT_4D_ABLATIONS',JSON.stringify(totals));
});
test('environmental noise destroys guaranteed first-path execution; closed-loop replan repairs after observing outcomes',()=>{
 const fixed=evaluated.reduce((n,r)=>n+r.stochasticFixedPlan.correct,0);
 const repair=evaluated.reduce((n,r)=>n+r.stochasticFeedbackRepair.correct,0);
 assert.equal(repair,192);
 assert.ok(fixed<192*0.6);
 console.log('HYPERTEXT_4D_STOCHASTIC_CONTINGENCY',JSON.stringify({fixed,repair,worlds:192}));
});
test('out-of-distribution unreliable source breaks the 100 percent claim',()=>{
 const shifted=evaluated.reduce((n,r)=>n+r.adversarialReliabilityShift.correct,0);
 assert.ok(shifted<192*0.7);
 assert.ok(shifted>0);
 console.log('HYPERTEXT_4D_GENERALITY_FALSIFIED',JSON.stringify({sourceShiftSuccess:shifted,total:192}));
});
test('runs are deterministic, test answers never affect training state, and corpus exceeds 20 million characters',()=>{
 const rerun=evaluate({seed:17,count:64});
 assert.equal(rerun.frozenTestNeverTrains,true);
 const fingerprint=r=>[r.full.correct,r.full.firstRouteOptimal,r.ablate2D.correct,
  r.shuffledActions.correct,r.stochasticFixedPlan.correct,r.stochasticFeedbackRepair.correct,
  r.adversarialReliabilityShift.correct,r.full.longDocumentCharacters,r.firstExample.pathBeforeAction];
 assert.deepEqual(fingerprint(rerun),fingerprint(evaluated[0]));
 assert.ok(evaluated.reduce((n,r)=>n+r.full.longDocumentCharacters,0)>20_000_000);
});
