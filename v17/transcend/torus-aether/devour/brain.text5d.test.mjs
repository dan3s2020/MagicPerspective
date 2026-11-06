import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from './brain.mjs';

// Tests the original Brain.evalTextExercises with an explicit frozen-learner stub.
// Does NOT modify GPU/CPU checkpoints or leak any held-out response to write().
test('real V17 unseen-text evaluator exposes before-answer shape, witnessed prefixes and 5D geometry',()=>{
  const brain=Object.create(Brain.prototype),prompts=[],geometry=new Map();
  for(let i=32;i<128;i++)geometry.set(i,[i/160,.2,.3,.4,.5]);
  brain.trace={geo:{U:geometry}};
  brain.e={};brain.chain={play:()=>({out:[0,1]})};
  brain.ctxOf=()=>[];brain.histOf=()=>[];
  brain.align={
    readFrozen(ex,record){for(let i=0;i<ex.length;i++)record(i,ex[i],i%5===0?65:ex[i],[[65,1]]);return .7;},
    write(prefix,{max}){prompts.push([...prefix]);return Array.from('answer\n\n').slice(0,max).map(c=>c.charCodeAt(0));}
  };
  const ex=[...'Q: observed question\nA: hidden answer\n\n'].map(x=>x.charCodeAt(0));
  const returned=brain.evalTextExercises([ex],{T:0,noise:0,seed:777});
  const result=returned.exercises[0];
  assert.equal(result.rows.length,ex.length);
  assert.ok(result.shape.length>0);
  assert.ok(returned.space5.length>10);
  assert.ok(result.replans.length<=3);
  assert.ok(result.replans.length>=1);
  assert.deepEqual(prompts[0],ex.slice(0,result.a0),'first prediction sees the question ONLY');
  for(let i=1;i<prompts.length;i++){
    const p=prompts[i];assert.ok(p.length<=ex.length);
    assert.equal(ex.slice(0,p.length).join(','),p.join(','),'true-prefix replans may not inspect future bytes');
  }
});
