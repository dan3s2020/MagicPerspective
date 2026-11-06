import test from 'node:test';
import assert from 'node:assert/strict';
import {CausalTextAgent} from './causal_text_world.mjs';
import {TextActionPaths} from './text_action_paths.mjs';
import {GeometricLearningLab} from './learning_geometry.mjs';
import {IsolatedGpuRunner} from './gpu_runner.mjs';

test('CUDA delegation skips the original CPU 32D SGD, without disabling observed causal experience',()=>{
 const agent=new CausalTextAgent({seed:11}),head=new TextActionPaths();
 const before=agent.latent.export();
 const trial=agent.train('What numbers come next?','3 4',head,{maxActions:10,skipLatentUpdate:true});
 assert.equal(trial.trained,true);
 assert.equal(agent.latent.updates,before.updates);
 assert.deepEqual(agent.latent.W,before.W);
 assert.ok(agent.value.updates>0,'Other CPU-only value table must not be hidden');
 assert.ok(agent.dynamics.observations>0);
});

test('V17 NumPy test protocol and auxiliary Torch CPU run in ONE process; not a CUDA claim',
 {timeout:180000},async()=>{
 const gpu=new IsolatedGpuRunner();
 try{
  await gpu.start({device:'numpy',worlds:1,textBatch:1,vram:1,util:100});
  assert.equal(gpu.info.device,'numpy');
  assert.equal(gpu.info.auxiliary.torchCUDA,false);
  const geo=new GeometricLearningLab(23);
  const sample={world:'maze',x:[.1,.2,.3,.4,.5],y:[.2,.25,.35,.45,.5],
   prev:[.1,.18,.31,.35,.52],action:2,heldout:false};
  const trained=await gpu.geometry(geo,[sample]);
  assert.equal(trained.trained,1);
  assert.equal(trained.state.updates,1);
  assert.equal(GeometricLearningLab.restore(trained.state).summary().updates,1);
  const brain=new CausalTextAgent({seed:23});
  const r=await gpu.latent(brain,[{features:brain.latent.features('a question'),
   target:brain.latent.target('an answer')}]);
  assert.equal(r.trained,1);
  assert.equal(r.state.updates,1);
  assert.equal(r.device,'cpu');
 }finally{gpu.close();}
});
