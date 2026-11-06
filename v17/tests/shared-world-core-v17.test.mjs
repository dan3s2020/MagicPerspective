import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {SharedTransformationCore} from '../transcend/torus-aether/worlds/shared-transformation-core.mjs';

const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const make=()=>new Brain({rules,c:{margin:.05,window:400},seed:11});
const corpus=['She is happy.','She is tired.','He is tired.','He is calm.'];
test('one original Brain owns compact SHARED rule nodes; maze,text,transform update same weights without phrase nodes',()=>{
  const brain=make();
  const before=brain.worldCore.report();
  assert.equal(brain.unifiedEnabled,false,'original baseline must be unchanged');
  assert.equal(before.updates,0);
  brain.enableUnifiedWorldLearning();
  for(const row of corpus)brain.learnObservedTransformations(row);
  const text=brain.worldCore.report();
  assert.ok(text.observed.text>=4,JSON.stringify(text));
  assert.ok(text.rules.some(x=>x.id==='action:replace'));
  assert.ok(text.updates>0);
  const same=brain.worldCore;
  const maze=brain.playMaze(false);
  assert.ok(maze.steps>0);
  const ma=brain.worldCore.report();
  assert.ok(ma.observed.maze>0,'Real original maze episode MUST update same object');
  assert.strictEqual(brain.worldCore,same);
  assert.strictEqual(brain.constructedPaths.worldCore,same);
  assert.ok(ma.rules.some(x=>x.id==='action:move'));
  const tr=brain.playTransform(false);
  assert.ok(tr.steps>=0);
  const end=brain.worldCore.report();
  assert.ok(end.observed.transform>0,'Real original transformation world must update same graph');
  assert.ok(end.structuralNodes<=20,'No node per word, character or cell permitted');
  assert.equal(end.rawPhraseNodes,0);
  assert.ok(end.updates>text.updates);
  assert.notDeepEqual(end.policy,before.policy,'Real action outcomes must change shared weights');
});
test('a text observation changes the SAME score consulted by maze, and a maze action changes score consulted by text',()=>{
  const c=new SharedTransformationCore();
  const mazeArgs={progress:1,support:.6,uncertainty:0,novelty:1,terminal:0};
  assert.equal(c.scoreMaze(mazeArgs),0,'untrained graph has no effect');
  c.observeTextEdit({before:['She','is','happy'],after:['She','is','calm'],
    action:{kind:'replace',from:'happy',to:'calm'}});
  const afterText=c.scoreMaze(mazeArgs);
  assert.ok(Math.abs(afterText)>1e-6,'text really updates maze-facing policy weights');
  const textArgs=[['He','is','tired'],['He','is','calm'],
    {kind:'replace',observedSupport:2},['He','calm']];
  const beforeMaze=c.scoreText(...textArgs);
  c.observeBlindMaze({action:'move:0',moved:false,progress:0,uncertainty:1});
  assert.notEqual(c.scoreText(...textArgs),beforeMaze,'maze experience must influence text action ranking');
  assert.equal(c.report().structuralNodes<=20,true);
});
test('original learned text operators remain reusable, shared field is optional, no goal/answer oracle',()=>{
  const b=make();b.enableUnifiedWorldLearning();
  for(const x of corpus)b.learnObservedTransformations(x);
  const start='She is happy.',req=['She','calm'];
  const pure=b.planObservedTransformation({required:req,start},
    {trace:true,embodied:true,useUnified:false});
  const shared=b.planObservedTransformation({required:req,start},
    {trace:true,embodied:true,useUnified:true});
  assert.equal(pure.found,true);
  assert.equal(shared.found,true);
  assert.equal(pure.predicted,'She is calm.');
  assert.equal(shared.predicted,'She is calm.');
  assert.equal(shared.unseen,true);
  assert.equal(shared.sharedWorldUsed,true);
  assert.equal(pure.sharedWorldUsed,false);
  assert.equal(shared.body.frozen,true);
  assert.equal(shared.body.realSemanticWorldFeedback,undefined);
  assert.equal(b.observedTransformations.containsSentence('She is calm.'),false);
  assert.ok(shared.steps.every(step=>b.observedTransformations.operators.has(step.key)));
  assert.ok(shared.body.frames.slice(1).every(frame=>frame.effectSource==='learned-text-action-model'));
});
test('checkpoint restores same original V17 Brain and cross-domain weights; new real observations continue learning',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'magic-unified-checkpoint-'));
  try{
    const original=make();original.enableUnifiedWorldLearning();
    for(const x of corpus.slice(0,3))original.learnObservedTransformations(x);
    original.playMaze(false);
    const report=original.worldCore.report(),file=path.join(dir,'brain.v8');
    original.save(file);
    const loaded=Brain.load(file);
    assert.equal(loaded.unifiedEnabled,true);
    assert.strictEqual(loaded.constructedPaths.worldCore,loaded.worldCore);
    assert.deepEqual(loaded.worldCore.report(),report);
    const n=report.updates;
    loaded.learnObservedTransformations('He is calm.');
    assert.ok(loaded.worldCore.updates>n,'serialized operator hook was rebound on resume');
    const baseline=make();const bFile=path.join(dir,'baseline.v8');baseline.save(bFile);
    const restored=Brain.load(bFile);
    assert.equal(restored.unifiedEnabled,false);
    assert.equal(restored.worldCore.updates,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('no fake learning when absent action or fabricated source; graph input is bounded by TYPES',()=>{
  const c=new SharedTransformationCore();
  assert.throws(()=>c.observe({world:'maze',action:'move',changed:true,source:'generated-demo'}));
  assert.throws(()=>c.observe({world:'text',action:'replace',source:'observed-corpus-difference'}));
  for(let i=0;i<100;i++)c.observeTextEdit({
    before:['This',String(i)],after:['This',String(i+1)],
    action:{kind:'replace',from:String(i),to:String(i+1)}
  });
  const s=c.report();
  assert.equal(s.observed.text,100);
  assert.ok(s.structuralNodes<=8);
  assert.equal(s.rawPhraseNodes,0);
});
