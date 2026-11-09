import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import fs from "node:fs";
const winner={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const rows=[
  [[81,58,32,65,10,65,58,32,49,10,10],[81,58,32,66,10,65,58,32,50,10,10]],
  [[81,58,32,67,10,65,58,32,51,10,10]]
];
function fakeCuda(delayed=0){
  const events=[];
  return {events, settings:{textChunk:128},info:{textMemoryWindow:16384},
    async call(request){
      events.push(request.cmd);
      if(request.cmd==="text_load")return {memory:0};
      assert.equal(request.cmd,"text_learn");
      if(delayed)await new Promise(r=>setTimeout(r,delayed));
      // Deterministic stand-in for the ORIGINAL CUDA reply, not a model.
      const seen=request.exercises.reduce((sum,e)=>sum+e.length,0);
      return {trust:[["test:p",2,3]],hits:2,seen,
        variants:[],busy:.002,vramUsedGB:.01,memory:seen,textChunk:128};
    }};
}
function state(brain){
  return {chars:brain.chars,exercises:brain.exercises,
    alignMem:brain.align.mem.n,
    alignTrust:[...brain.align.trust.entries()],
    alignHits:brain.align.hits,alignSeen:brain.align.seen,
    text:{...brain.textGpu,cardMs:0,mergeMs:0}};
}
test("V43 CUDA packet matches original V42 update math and exact source order",async()=>{
  const serial=new Brain({rules:winner,seed:37});
  const piped=new Brain({rules:winner,seed:37});
  const g1=fakeCuda(),g2=fakeCuda();
  for(const batch of rows)await serial.learnTextGPU(g1,batch);
  for(const batch of rows){
    const packet=await piped.beginV43TextGPU(g2,batch);
    piped.commitV43TextGPU(g2,batch,packet);
  }
  assert.deepEqual(state(piped),state(serial));
  assert.deepEqual(g1.events,g2.events);
  assert.deepEqual(g2.events,["text_load","text_learn","text_learn"]);
});
test("original Brain remains unchanged before CUDA packet commit",async()=>{
  const brain=new Brain({rules:winner,seed:41}),gpu=fakeCuda(5);
  const before={chars:brain.chars,exercises:brain.exercises||0};
  const packet=await brain.beginV43TextGPU(gpu,rows[0]);
  assert.deepEqual({chars:brain.chars,exercises:brain.exercises||0},before);
  brain.commitV43TextGPU(gpu,rows[0],packet);
  assert.equal(brain.exercises,2);
  assert.equal(brain.chars,rows[0][0].length+rows[0][1].length);
  assert.throws(()=>brain.commitV43TextGPU(fakeCuda(),rows[0],packet),
    /different GPU process/);
});
test("GPU batch N+1 can compute while original symbolic CPU work on N continues",async()=>{
  const brain=new Brain({rules:winner,seed:43}),gpu=fakeCuda(16);
  const one=await brain.beginV43TextGPU(gpu,rows[0]);
  brain.commitV43TextGPU(gpu,rows[0],one);
  let finished=false;
  const next=brain.beginV43TextGPU(gpu,rows[1]).then(packet=>{finished=true;return packet;});
  // CPU work on previous row occurs while next CUDA command is outstanding.
  brain.live(65,false,{old:true});
  assert.equal(finished,false,"Next CUDA packet has not secretly committed");
  assert.equal(brain.exercises,2,"Original Brain only commits completed CUDA batch");
  assert.equal(gpu.events.filter(c=>c==="text_learn").length,2,
    "Next CUDA training was dispatched while CPU did previous symbolic work");
  const packet=await next;
  assert.equal(brain.exercises,2,"Results are deferred until ordered CPU boundary");
  brain.commitV43TextGPU(gpu,rows[1],packet);
  assert.equal(brain.exercises,3);
});
test("V43 conveyor opt-in; legacy V42 original training path and CPU fallback are retained",()=>{
  const worker=fs.readFileSync(new URL("../transcend/torus-aether/devour/worker.mjs",import.meta.url),"utf8");
  const brain=fs.readFileSync(new URL("../transcend/torus-aether/devour/brain.mjs",import.meta.url),"utf8");
  assert.match(worker,/if\(v43World && TEXT && gpuSet\)/);
  assert.match(worker,/else\{\s*for await \(const ex of stream\(\)\)/);
  assert.match(worker,/next\.started=brain\.beginV43TextGPU/);
  assert.match(worker,/processGpuText\(current\.exs,current\.meta,phase\)/);
  assert.match(worker,/V43 original CUDA conveyor failed without CPU fallback/);
  assert.match(brain,/async learnTextGPU\(gpu, exs, onProgress = null\)/);
  assert.match(brain,/async beginV43TextGPU/);
  assert.match(brain,/commitV43TextGPU/);
});

test("V43 replays stale next-card computation instead of training from pre-puppet trust",async()=>{
  const brain=new Brain({rules:winner,seed:47}),gpu=fakeCuda();
  const baseline=await brain.beginV43TextGPU(gpu,rows[0]);
  brain.commitV43TextGPU(gpu,rows[0],baseline);
  const speculative=await brain.beginV43TextGPU(gpu,rows[1]);
  const priorCount=brain.exercises;
  // Player 2 is INSIDE the same Brain: its actual movements train AligningGraph.
  brain.live(250);brain.live(66);
  assert.throws(()=>brain.commitV43TextGPU(gpu,rows[1],speculative),
    /V43_STALE_CARD_PACKET/);
  assert.equal(brain.exercises,priorCount,"Uncommitted stale CUDA result cannot change native Brain");
  const oldLoadCount=gpu.events.filter(e=>e==="text_load").length;
  brain.resetV43TextGPUForOrderedReplay(gpu);
  const rebased=await brain.beginV43TextGPU(gpu,rows[1]);
  brain.commitV43TextGPU(gpu,rows[1],rebased);
  assert.equal(gpu.events.filter(e=>e==="text_load").length,oldLoadCount+1);
  assert.equal(brain.exercises,priorCount+rows[1].length);
  assert.equal(brain.align.mem.n,
    rows.flat().reduce((n,b)=>n+b.length,0)+2);
});
