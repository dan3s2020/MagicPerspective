// Regression of real RTX 3050 Ti error 2026-11-07:
// --gpu-worlds 0 must mean GPU-measured AUTO for BOTH maze and transform.
// Previously Brain.learnMazesGPU resolved 0, while playTransformsGPU(0)
// sent [] to Python t_reset, where np.array([]).max() crashed.
import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";

function brain(){
 return new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
}
test("ACTUAL GPU Python protocol: gpu-worlds 0 resolves autoWorlds for both labyrinth and transformation in SAME Brain",{
 timeout:120000
},async()=>{
 const g=new GpuWorlds({device:"numpy"});
 try{
  await g.ready;
  const measured=g.info.autoWorlds;
  assert.ok(measured>0);
  // Use a small measured auto count for CI; on RTX 3050 Ti the original
  // CUDA init reports 256. This still tests actual GPU protocol and physics.
  g.info.autoWorlds=3;
  const b=brain(),start=b.trans?.played??0,maze=await b.learnMazesGPU(g,0);
  assert.equal(maze.batch,3,"native labyrinth AUTO did not resolve to 3 worlds");
  const transform=await b.playTransformsGPU(g,0);
  assert.equal(transform.batch,3,"transformation AUTO must use SAME 3 worlds");
  assert.equal(b.trans.played-start,3);
  assert.ok(b.trans.last?.frames?.length>0);
  assert.ok(b.mazes.played>=3);
  console.log("ACTUAL_GPU_AUTO_TRANSFORM_FIXED",JSON.stringify({
   gpuBackend:g.info.device,initAutoWorlds:measured,ciAutoWorlds:3,
   mazeBatch:maze.batch,transformBatch:transform.batch,
   trainedTransformWorlds:b.trans.played,originalErrorNoLongerOccurs:true
  }));
 }finally{g.close();}
});
test("AUTO string and explicit positive batch sizes BOTH preserve real transformation learning",{
 timeout:120000
},async()=>{
 const g=new GpuWorlds({device:"numpy"});
 try{
  await g.ready;
  g.info.autoWorlds=2;
  const b=brain();
  const a=await b.playTransformsGPU(g,"auto");
  assert.equal(a.batch,2);
  const c=await b.playTransformsGPU(g,1);
  assert.equal(c.batch,1);
  assert.equal(b.trans.played,3);
  await assert.rejects(()=>b.playTransformsGPU(g,-1),/Invalid GPU transformation world count/);
  await assert.rejects(()=>b.playTransformsGPU(g,1.5),/Invalid GPU transformation world count/);
  assert.equal(b.trans.played,3,"invalid batch sizes must not modify training");
 }finally{g.close();}
});
test("Python gives precise error+traceback for truly empty transformation batch, not ambiguous NumPy max",{
 timeout:30000
},async()=>{
 const g=new GpuWorlds({device:"numpy"});
 try{
  await g.ready;
  await assert.rejects(
   ()=>g.call({cmd:"t_reset",levels:[],moves:[0,1,2,3]}),
   err=>/t_reset received zero transformation worlds/.test(err.message)&&
    /Python GPU traceback/.test(err.message)&&
    /worlds_gpu.py/.test(err.message)
  );
  await assert.rejects(
   ()=>g.call({cmd:"exercise_learn",worlds:[],knows:{},seed:1}),
   /GPU labyrinth request has zero worlds/
  );
  // The Python backend remains alive after a rejected malformed command.
  const status=await g.call({cmd:"init",device:"numpy"});
  assert.ok(status.autoWorlds>0);
  console.log("PRECISE_PYTHON_EMPTY_BATCH_DIAGNOSTICS",{stillRunning:true});
 }finally{g.close();}
});
test("V17 uses the same automatic world-count contract in both real learning methods",()=>{
 const original=Brain.prototype.learnMazesGPU.toString();
 const transforms=Brain.prototype.playTransformsGPU.toString();
 assert.match(original,/autoWorlds/);
 assert.match(transforms,/autoWorlds/);
 assert.doesNotMatch(transforms,/while \(levels\.length < N\)\s*\{\s*\}/);
});
