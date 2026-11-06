import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {TextActionPaths} from '../../isolated/noise-space/text_action_paths.mjs';
import {CausalTextAgent} from '../../isolated/noise-space/causal_text_world.mjs';
import {frozenTextRoutes,questionAndAnswer} from '../transcend/torus-aether/devour/text-hyperpaths-eval.mjs';
const bytes=t=>Array.from(Buffer.from(t,'latin1'));
const pairs=[
  ['What happens when the gate opens?', 'The gate reveals a hidden passage.'],
  ['What happens when the lever moves?', 'The lever makes the gate open.'],
  ['Where does the explorer go?', 'The explorer follows the passage to the goal.']
];
function world(){
 const paths=new TextActionPaths(),causal=new CausalTextAgent({seed:19});
 for(const [q,a] of pairs){paths.learn(q,a);causal.train(q,a,paths,{maxActions:5,seed:30});}
 return {paths,causal};
}
test('route prediction is produced BEFORE viewing a held-out answer; changing reference cannot change route',()=>{
 const models=world();
 const question='What happens when the explorer moves?';
 const A=bytes('Q: '+question+'\nA: The gate opens a different passage.');
 const B=bytes('Q: '+question+'\nA: Entirely unrelated held-out answer.');
 const first=frozenTextRoutes([A],models);
 const second=frozenTextRoutes([B],models);
 assert.ok(first.enabled && second.enabled);
 assert.ok(first.training.corpusRows===3 && first.training.learnedCausalEpisodes===3);
 assert.equal(first.exercises[0].predictedBeforeAnswer,second.exercises[0].predictedBeforeAnswer);
 assert.equal(first.exercises[0].actionBasedPrediction,second.exercises[0].actionBasedPrediction);
 assert.equal(first.exercises[0].goalVisibleBeforeAnswer,false);
 assert.equal(first.exercises[0].referenceUsedAfterPrediction,true);
 assert.equal(first.exercises[0].learnedGoalDimension,32);
 assert.ok(first.exercises[0].routeLength>0);
 assert.ok(first.exercises[0].learnedTransitionSteps>0);
 assert.equal(models.paths.rows,3);assert.equal(models.causal.episodes,3);
 assert.ok(questionAndAnswer(A)?.answer);
 assert.equal(questionAndAnswer(bytes('raw text without a Q/A boundary')),null);
});
test('original V17 evaluator loads saved real action-world sidecar, never conflates teacher-forced alignment with path', {timeout:30000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-hyperpaths-'));
 const save=path.join(dir,'brain.v8');
 let worker;
 try{
  const models=world();
  const brain=new Brain({rules:'winner',seed:11});
  for(const y of bytes('Q: One route opens a door.\nA: A learned path changes the world.\n\n'))brain.live(y);
  brain.save(save);
  fs.writeFileSync(save+'.causal.json',JSON.stringify({version:1,paths:models.paths.export(),causal:models.causal.export()}));
  worker=new Worker(fileURLToPath(new URL('../transcend/torus-aether/devour/eval-worker.mjs',import.meta.url)),
    {workerData:{saveFile:save}});
  const loaded=await new Promise((ok,fail)=>{
    worker.once('error',fail);
    worker.once('message',ok);
  });
  assert.equal(loaded.type,'loaded');
  assert.equal(loaded.textWorldLoaded,true);
  const long=bytes('Q: What happens when the explorer moves?\nA: The explorer follows the passage to the goal.\n\n');
  const short=bytes('Q: What opens?\nA: Gate.\n\n');
  const result=await new Promise((ok,fail)=>{
    worker.once('error',fail);worker.once('message',ok);
    worker.postMessage({id:4,kind:'text',opts:{list:[long,short],T:0,noise:0}});
  });
  assert.equal(result.id,4);
  assert.equal(result.observedTextWorld.enabled,true);
  assert.equal(result.exercises.length,2);
  assert.ok(result.exercises[1].learnedRoute);
  assert.equal(result.exercises[1].learnedRoute.question,'What happens when the explorer moves?');
  assert.equal(result.exercises[1].learnedRoute.referenceUsedAfterPrediction,true);
  assert.equal(typeof result.exercises[1].shapeSame,'number');
  assert.equal(typeof result.exercises[1].learnedRoute.plannedWordF1,'number');
  assert.ok(result.observedTextWorld.training.learnedActionOutcomes>0);
 }finally{
  if(worker)await worker.terminate();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
