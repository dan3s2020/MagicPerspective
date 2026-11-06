// User-requested V17 acceptance: GLOBAL GOLD initial line BEFORE movement,
// local player/organism body choosing learned actions, every real state change,
// branches of learned operators, alternative paths, corrections, and no oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ObservedTransformations}
 from '../transcend/torus-aether/worlds/observed-transformations.mjs';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';

const training=['She is happy.','She is tired.','He is tired.','He is calm.'];
function make() {
 const o=new ObservedTransformations();
 for(const s of training)o.observeSentence(s);
 return o;
}
test('one REAL global path is frozen before the first local action; BFS reveals real alternative edges; body uses learned model only',{timeout:45000},()=>{
 const o=make(),before=o.report();
 const global=o.plan({required:['She','calm'],start:'He is calm.',
   recordSearch:true,maxRecordedStates:160});
 assert.equal(global.found,true,JSON.stringify(global));
 assert.equal(global.predicted,'She is calm.');
 assert.equal(global.unseen,true);
 assert.deepEqual(global.initialShape,['He is calm.','She is calm.']);
 assert.ok(global.search.nodes.length>=2);
 assert.ok(global.search.edges.length>=1);
 assert.ok(global.search.nodes.every(n=>typeof n.label==='string'&&n.label.length>0));
 assert.ok(global.search.edges.some(x=>x.from==='He is calm.'&&x.to==='She is calm.'));
 assert.equal(global.plannedBeforeAnswer,true);
 assert.equal(global.referenceProvided,false);
 assert.deepEqual(before,o.report(),'Global overhead planner cannot mutate the original Brain');
 const local=o.embody(global,{maxSteps:25});
 assert.equal(local.attempted,true);
 assert.ok(local.frames.length>=2);
 assert.deepEqual(local.frames[0].globalShape,global.initialShape);
 assert.equal(local.frames[0].stage,'before-first-action');
 assert.ok(local.frames.slice(1).every(x=>x.stage==='after-action'||x.stage==='failed-action'));
 assert.ok(local.frames.slice(1).every(x=>x.chosen||x.error));
 assert.equal(local.referenceProvided,false);
 assert.equal(local.frozen,true);
 assert.equal(local.effectSource,'learned-text-action-model');
 assert.equal(local.semanticValidation,false);
 assert.deepEqual(o.report(),before,'Local replay must not train on answer or alter memory');
 console.log('REAL_LANGUAGE_INITIAL_SHAPE_AND_LOCAL_BODY '+JSON.stringify({
   initial:global.initialShape,branches:global.search.edges.length,
   body:local.frames.map(x=>({state:x.state,chosen:x.chosen?.to,
     alternate:x.alternativePath,correction:x.correctedShape||null})),
   reached:local.success,extraActions:local.executed-global.steps.length
 }));
});
test('multi-step composition exposes different global vs local paths and true corrections when taken, not fake animated detours',()=>{
 const o=make();
 const global=o.plan({required:['She','calm'],start:'She is happy.',
   maxDepth:5,recordSearch:true});
 assert.equal(global.found,true);
 assert.equal(global.unseen,true);
 assert.ok(global.initialShape.length>=3,'Expect at least two separate edits');
 assert.ok(global.search.edges.length>global.steps.length,
   'Real alternative search branches should be captured, not only a single golden line');
 const body=o.embody(global,{maxSteps:32});
 assert.equal(body.frames[0].globalShape[0],'She is happy.');
 for(const f of body.frames.slice(1)){
  if(f.stage==='failed-action')continue;
  assert.equal(f.causalEffectMatched,true,'Observed state must be obtained by applying learned action');
  assert.ok(f.alternatives.length>0,'Record actual choices at each cursor step');
  assert.equal(f.realSemanticWorldFeedback,false,
    'Never mislabel learned textual action model as external semantic oracle');
  if(f.alternativePath)assert.ok(f.correctedShape||f.correctedPathExists===false,
    'An actual detour must record its consequent attempted replan');
 }
});
test('original V17 persistent Brain reports frozen global/cursor experience with its own endogenous noise, no checkpoint contamination',()=>{
 const brain=new Brain({rules:'winner',seed:1234});
 for(const s of training)brain.learnObservedTransformations(s);
 const original=brain.observedTransformations.report();
 const agent=brain.noiseAgent?.status(),rng=brain.noiseAgent?.rng;
 const r=brain.planObservedTransformation({required:['She','calm'],start:'He is calm.'},
   {trace:true,embodied:true});
 assert.equal(r.found,true);
 assert.equal(r.predicted,'She is calm.');
 assert.ok(r.body?.frames.length>=2);
 assert.equal(r.body?.initialShape?.at(-1),'She is calm.');
 assert.ok(r.search?.edges.length>=1);
 assert.equal(r.frozen,true);
 assert.deepEqual(brain.observedTransformations.report(),original);
 assert.deepEqual(brain.noiseAgent?.status(),agent);
 assert.equal(brain.noiseAgent?.rng,rng,'Test must not mutate the original noise policy');
 const impossible=brain.planObservedTransformation({required:['foobarbaz'],start:'He is calm.'},
   {trace:true,embodied:true});
 assert.equal(impossible.found,false);
 assert.ok(impossible.search?.nodes.length>=1);
 assert.equal(impossible.body,null,'Never invent a gold path when no learned solution exists');
});
