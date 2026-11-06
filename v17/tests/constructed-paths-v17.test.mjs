import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ConstructedTransitionGraph,ConstructedPathLearner} from '../transcend/torus-aether/worlds/constructed-paths.mjs';
import {makeMaze,SEEDS,seedOf} from '../transcend/torus-aether/worlds/labyrinth.mjs';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';

test('One generic path-construction operator learns transitions, not a supplied plan',()=>{
  const g=new ConstructedTransitionGraph();
  g.observe('a','go','b');g.observe('b','go','c');
  assert.deepEqual(g.path('a',x=>x==='c').route.map(x=>x.action),['go','go']);
  assert.equal(g.path('a',x=>x==='unseen').found,false);
  assert.equal(g.predict('a','go'),'b');
  assert.equal(g.observations,2);
});
test('paired complete/incomplete labyrinths teach reusable operation, never copy the test map', {timeout:90000},()=>{
  const learner=new ConstructedPathLearner({seed:17});
  for(let i=0;i<8;i++)learner.trainPair(makeMaze(seedOf(SEEDS.train,i),[7,9,11][i%3]),{samples:20});
  assert.equal(learner.paired,8);
  assert.ok(learner.examples>100);
  assert.ok(learner.pathPolicyUpdates>100,'Training comparison must teach a shared reusable decision operator');
  assert.ok(learner.pathPolicy.some(w=>Math.abs(w)>1e-6));
  const trained=learner.examples,open=learner.open;
  const worlds=Array.from({length:6},(_,i)=>makeMaze(seedOf(SEEDS.test,5000+i*119),[7,9,11][i%3]));
  const baseline=new ConstructedPathLearner({seed:17});
  const pairs=[];
  for(const w of worlds){
    const full=learner.construct(Array.from(w.wall),w.n,w.start,w.goal);
    const result=learner.navigateBlind(w,{train:false,record:true});
    const control=baseline.navigateBlind(w,{train:false});
    assert.ok(result.initialUnknowns>0,'Partial world is genuinely incomplete at first action');
    assert.ok(result.seenCells>result.initialUnknowns/10);
    assert.equal(result.firstShape.length,result.firstShapeLength);
    assert.ok(result.routeRepairs>=0);
    assert.equal(result.actualWorldNeverReadByPlanner,true);
    assert.ok(result.firstUncertain>0 || result.firstShapeLength===0);
    assert.ok(full.length>0,'Complete-map reference must be viable');
    pairs.push({learned:result.solved,control:control.solved,learnedSteps:result.steps,controlSteps:control.steps,
      initialBlindPath:result.firstShapeLength,firstUncertain:result.firstUncertain});
  }
  assert.equal(learner.examples,trained,'No unseen supervision in evaluation');
  assert.equal(learner.pathPolicyUpdates,trained+learner.links.observations,
    'Frozen evaluation must not update shared path-selection weights');
  assert.equal(learner.open,open,'No environment wall statistics copied into learner during frozen eval');
  assert.ok(pairs.some(x=>x.initialBlindPath>0));
  console.log('BLIND_PATH_PAIRED_FROZEN '+JSON.stringify(pairs));
});
test('text character is an action, answer is a composed prefix path; no reference is seen during inference',()=>{
  const m=new ConstructedPathLearner({seed:21});
  const q='What gate is ahead?';
  const a='A small gate opens.\n';
  for(let i=0;i<7;i++)m.trainText(q,a);
  assert.equal(m.textRows,7);
  assert.ok(m.textChars>=7*a.length);
  const before=m.textRows,states=m.scales.map(g=>g.edges.size);
  const prediction=m.imagineText(q,{maxChars:45,beamWidth:3});
  assert.equal(prediction.previewBeforeAnswer,true);
  assert.equal(prediction.referenceNotAvailable,true);
  assert.ok(prediction.path.length>0);
  assert.ok(prediction.path.some(x=>x.scaleEvidence.length===6));
  assert.ok(prediction.predicted.length>0);
  assert.equal(m.textRows,before);
  assert.deepEqual(m.scales.map(g=>g.edges.size),states);
  const other=m.imagineText(q,{maxChars:45,beamWidth:3});
  assert.equal(other.predicted,prediction.predicted);
  console.log('TEXT_ABSTRACT_CHAR_PATH '+JSON.stringify({actual:a,predicted:prediction.predicted,
    pathLength:prediction.path.length,macroBoundaries:prediction.wordOrSentenceBoundaries}));
});
test('a path-selection operation actually transfers from paired maze training into text candidate ranking',()=>{
  const paired=new ConstructedPathLearner({seed:11});
  const baseline=new ConstructedPathLearner({seed:11});
  const q='Which passage leads onward?';
  for(let k=0;k<6;k++){
    for(const m of [paired,baseline]){
      m.trainText(q,k%2?'A north gate.':'A south door.');
    }
  }
  for(let k=0;k<10;k++)paired.trainPair(makeMaze(seedOf(SEEDS.train,740+k),7),{samples:12});
  const a=paired.nextCharacters(q,'A ',8),b=baseline.nextCharacters(q,'A ',8);
  assert.ok(a.length>=2&&b.length>=2);
  assert.ok(paired.pathPolicyUpdates>0);
  assert.equal(baseline.pathPolicyUpdates,0);
  assert.notDeepEqual(a.map(x=>x.weight),b.map(x=>x.weight),
    'The learned maze path operator must genuinely influence text successor scores');
  assert.equal(paired.textRows,baseline.textRows,
    'Both text worlds must receive exactly identical text supervision');
});
test('the ORIGINAL V17 Brain retains the learned path constructor across save/resume; a frozen test does not train it',{timeout:90000},()=>{
  const brain=new Brain({rules:'winner',seed:19});
  brain.learnConstructedText('Where is the exit?','The exit is through the blue door.');
  brain.learnConstructedText('What opens the door?','The key opens the blue door.');
  const maze=makeMaze(seedOf(SEEDS.train,401),7);
  brain.trainConstructedMaze(maze,true);
  assert.equal(brain.constructedPaths.paired,1);
  const status=brain.constructedPaths.summary();
  const count=brain.constructedPaths.examples,rows=brain.constructedPaths.textRows;
  const frozen=brain.testConstructedMaze(2,100);
  assert.equal(frozen.results.length,2);
  assert.equal(frozen.frozen,true);
  assert.equal(brain.constructedPaths.examples,count);
  assert.equal(brain.constructedPaths.textRows,rows);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'magic-pathv17-')),save=path.join(temp,'brain.v8');
  try{
    brain.save(save);
    const restored=Brain.load(save);
    assert.equal(restored.constructedPaths.paired,1);
    assert.equal(restored.constructedPaths.textRows,2);
    assert.deepEqual(restored.constructedPaths.weights,brain.constructedPaths.weights);
    assert.deepEqual(restored.constructedPaths.summary().scaleGraphStates,status.scaleGraphStates);
    assert.equal(typeof restored.constructedPaths.imagineText,'function');
    assert.equal(typeof restored.constructedPaths.construct,'function');
    assert.equal(typeof restored.constructedPaths.links.predict,'function');
    assert.equal(typeof restored.constructedPaths.scales[0].choices,'function');
    assert.ok(restored.constructedPaths.imagineText('Where is the exit?',{maxChars:48}).path.length);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
