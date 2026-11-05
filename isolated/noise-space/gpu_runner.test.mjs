import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {IsolatedGpuRunner,checkedGpuConfig} from './gpu_runner.mjs';
import {nextTrainingSlice,rotatingHeldout} from './text_schedule.mjs';

test('text scheduling reports wrap, and heldout windows rotate without entering training',()=>{
 const train=Array.from({length:900},(_,i)=>i%127);
 const one=nextTrainingSlice(train,0,320),two=nextTrainingSlice(train,one.cursor,320),
   three=nextTrainingSlice(train,two.cursor,320),four=nextTrainingSlice(train,three.cursor,320);
 assert.equal(one.wrapped,false);assert.equal(three.slice.length,260);
 assert.equal(four.wrapped,true);assert.equal(four.at,0);
 const held=Array.from({length:920},(_,i)=>i);
 assert.equal(rotatingHeldout(held,0).offset,0);
 assert.equal(rotatingHeldout(held,1).offset,420);
 assert.equal(rotatingHeldout(held,2).offset,840);
 assert.equal(rotatingHeldout(held,3).offset,0);
});
test('4GB laptop defaults and explicit batch bounds are safe',()=>{
 const s=checkedGpuConfig({worlds:32,textBatch:4,vram:2.6});
 assert.equal(s.device,'cuda:0');assert.equal(s.worlds,32);assert.equal(s.textBatch,4);
 assert.ok(s.vram<4);
 assert.equal(checkedGpuConfig({worlds:999}).worlds,256);
});
test('original GPU protocol runs real text and maze learning with NumPy backend (NOT a CUDA claim)',
 {timeout:150000},async()=>{
 const gpu=new IsolatedGpuRunner();
 try{
  const info=await gpu.start({device:'numpy',worlds:4,textBatch:2,vram:1,util:100});
  assert.equal(info.device,'numpy');
  const brain=new Brain({rules:{},seed:11});
  const text=await gpu.text(brain,[
   Array.from(Buffer.from('Q: Which number? A: 3\n\n','ascii')),
   Array.from(Buffer.from('Q: Another number? A: 5\n\n','ascii'))
  ]);
  assert.equal(text.worlds,2);assert.ok(brain.chars>0);
  const before=brain.mazes.played;
  const maze=await gpu.maze(brain);
  assert.equal(maze.worlds,4);
  assert.equal(brain.mazes.played,before+4);
  assert.ok(brain.mazes.last?.path?.length>0);
  const transforms=await gpu.transform(brain);
  assert.equal(transforms.worlds,4);
  assert.ok(brain.trans?.last?.frames?.length>0);
  assert.equal(gpu.status().enabled,true,'NumPy backend is alive after V17 text, maze and transform batches');
 }finally{gpu.close();}
});
