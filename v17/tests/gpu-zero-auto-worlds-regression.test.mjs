import test from "node:test";
import assert from "node:assert/strict";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

// Regression for actual Windows trace:
// GPU ready with autoWorlds:256; -GpuWorlds 0 generated an empty transformation
// batch, then Python TBatch called numpy.ndarray.max() on an empty array.
// The native card's NumPy backend executes the IDENTICAL V17 world rules.
// The user's NVIDIA card is hardware-specific, so this test also documents
// that CUDA on the user's machine must be validated independently.

test("GpuWorlds auto count 0 must produce REAL transformation worlds, not an empty t_reset", {timeout:120000}, async()=>{
 const g=new GpuWorlds({device:"numpy",worlds:0,util:100});
 try {
   const info=await g.ready;
   assert.equal(info.device,"numpy");
   assert.ok(info.autoWorlds>=1);
   // Emulate the exact RTX 3050 Ti auto-world negotiation while keeping the
   // CI run bounded: the card announces its own capacity, not a hardwired 0.
   g.info.autoWorlds=2;
   const resetSizes=[],orig=g.call.bind(g);
   g.call=(request,opts)=>{
     if(request.cmd==="t_reset")resetSizes.push(request.levels.length);
     return orig(request,opts);
   };
   const brain=new Brain({rules:"winner",seed:17});
   const before=brain.trans?.played||0;
   const result=await brain.playTransformsGPU(g,0);
   assert.equal(result.batch,2,"0 must resolve to GPU's autoWorlds count");
   assert.equal(brain.trans.played,before+2);
   assert.deepEqual(resetSizes,[2]);
   assert.ok(brain.trans.last,"real GPU world episodes must have been lived");
   console.log("V17_AUTO_GPU_TRANSFORM_REGRESSION",JSON.stringify({
     configuredWorlds:0,cardAutoWorlds:2,realTransformWorlds:result.batch,
     pythonResetBatchSizes:resetSizes,livedEpisodes:brain.trans.played,
     actualBackend:"numpy; same GPU protocol, not Nvidia card"}));
 } finally {g.close();}
});

test('GPU world setting "auto" also resolves to a positive real transformation batch',{timeout:120000},async()=>{
 const g=new GpuWorlds({device:"numpy",worlds:0,util:100});
 try{
   await g.ready;g.info.autoWorlds=1;
   const brain=new Brain({rules:"winner",seed:3});
   const t=await brain.playTransformsGPU(g,"auto");
   assert.equal(t.batch,1);
   assert.equal(brain.trans.played,1);
   console.log("V17_AUTO_STRING_TRANSFORMS",JSON.stringify({requested:"auto",produced: t.batch}));
 }finally{g.close();}
});

test("empty Python transform requests raise a meaningful protocol error instead of a zero-size numpy reduction", {timeout:60000},async()=>{
 const g=new GpuWorlds({device:"numpy",worlds:0,util:100});
 try{
   await g.ready;
   await assert.rejects(g.call({cmd:"t_reset",levels:[],moves:[0,1,2,3]}),
     /t_reset requires at least one transform world; resolve GPU auto-world count/);
   // The Python subprocess remains alive after the rejected command.
   const r=await g.call({cmd:"maze_check",items:[[1000003,7]]});
   assert.equal(r.mazes.length,1);
   console.log("V17_EMPTY_WORLD_PROTOCOL_GUARD",JSON.stringify({processRecovered:true}));
 }finally{g.close();}
});
