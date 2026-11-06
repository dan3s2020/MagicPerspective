// The existing V17 GPU maze implementation must feed the same Brain's
// perspective learner after each REAL card batch; numpy mode validates
// protocol/data flow on CPU CI without claiming NVIDIA performance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from './brain.mjs';
import {GpuWorlds} from '../gpu/client.mjs';

test('original GPU card batch trains persistent body perspective in SAME V17 Brain',async()=>{
 const brain=new Brain({seed:11,rules:{}});
 const policy=brain.enableEndogenousNoise();
 const gpu=new GpuWorlds({device:'numpy',worlds:4,vram:1,util:100});
 try{
  const info=await gpu.ready;
  assert.equal(info.device,'numpy');
  const before=brain.mazes.played;
  const P=brain.perspective.episodes;
  const r=await brain.learnMazesGPU(gpu,4);
  assert.ok(r.batch===4);
  assert.equal(brain.mazes.played,before+4);
  assert.equal(brain.perspective.episodes,P+1,
    'An actual V17 GPU batch should generate egocentric learning in same Brain');
  assert.ok(policy.total>0,'The SAME organism must choose its own noise on actual parallel world steps');
  assert.ok(policy.bySite.none>0||policy.noisy>0,'GPU decisions must credit real actions');
  assert.ok(r.noiseChoices && r.noiseChoices.length===4,
    'CUDA-compatible kernel must return measured per-context noise outcomes');
  assert.ok(brain.perspective.last?.trace?.length>0,
    'No recorded local observations after original card batch');
  assert.equal(brain.perspective.last.globalObservationsAfterStart,0);
  const priorNoise=policy.total;
  const priorTransform=brain.trans?.played || 0;
  await brain.playTransformsGPU(gpu,1);
  assert.equal(brain.trans.played,priorTransform+1,'Real GPU-physics causal task never completed');
  assert.ok(policy.total>priorNoise,
    'The same organism must select and receive feedback for each GPU-physics causal action');
  assert.ok(brain.trans.gpu.organismNoise?.choices>priorNoise);
  console.log('V17_GPU_PROTOCOL_PERSPECTIVE '+JSON.stringify({
   protocolDevice:info.device,originalGpuWorlds:r.batch,originalGpuSolved:r.solved,
   sameBrainPerspectiveEpisodes:brain.perspective.episodes,localObservations:brain.perspective.last.bodyObservations,
   updateDevice:'CPU (perspective); original card world batch uses configured device'
  }));
 }finally{gpu.close();}
},{timeout:120000});
