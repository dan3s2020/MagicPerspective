import test from 'node:test';
import assert from 'node:assert/strict';
import {TextActionPaths,tokenize,matchScore} from './text_action_paths.mjs';
test('real Unicode words survive rather than being replaced with question marks',()=>{
 assert.deepEqual(tokenize('Bună! Énergie 中文 123'),['bună','!','énergie','中文','123']);
});
test('trainer learns only from observed Q/A, never the heldout reference',()=>{
 const n=new TextActionPaths();
 const questions=[
  ['What is the capital of France?','Paris is the capital of France.'],
  ['Where is Paris located?','Paris is located in France.'],
  ['What language is spoken in France?','French is commonly spoken in France.'],
  ['What is the capital of Spain?','Madrid is the capital of Spain.'],
  ['Where is Madrid located?','Madrid is located in Spain.'],
  ['What language is spoken in Spain?','Spanish is commonly spoken in Spain.'],
 ];
 assert.equal(n.plan('Capital of France?').actions.length,0);
 for(let k=0;k<9;k++)for(const [q,a] of questions)n.learn(q,a);
 const before=JSON.stringify(n.export());
 const a=n.evaluate('What is the capital of France?','Paris is the capital of France.',{maxSteps:15});
 const after=JSON.stringify(n.export());assert.equal(before,after,'heldout evaluation must be strictly frozen');
 assert.ok(a.route.actions.length>0);assert.ok(a.route.expanded>0);
 assert.ok(a.route.actions.every(x=>x.alternatives.length>0));
 assert.ok(n.summary().rows===54);
});
test('train-first action is measured BEFORE updating, and checkpoint reproduces path',()=>{
 const n=new TextActionPaths();const first=n.learn('Explain gravity','Gravity attracts masses together.');
 assert.ok(first.trained);assert.equal(n.preUpdateHits,0);
 for(let i=0;i<10;i++)n.learn('Explain gravity','Gravity attracts masses together.');
 const route=n.plan('Explain gravity',{maxSteps:12});
 const restored=TextActionPaths.restore(JSON.parse(JSON.stringify(n.export())));
 assert.deepEqual(restored.plan('Explain gravity',{maxSteps:12}),route);
 assert.equal(restored.summary().rows,11);
});
test('path comparator matches semantic words as an overlap diagnostic, not a correctness oracle',()=>{
 const r=matchScore('Paris is in France.','Paris is the capital of France.');
 assert.ok(r.f1>0&&r.f1<1);assert.equal(r.exact,false);
});
test('input boundaries prevent unbounded decoding and invalid checkpoints',()=>{
 const n=new TextActionPaths();for(let i=0;i<20;i++)n.learn('spell bananas','bananas have yellow skins');
 assert.ok(n.plan('spell bananas',{maxSteps:100000,branching:1000,beamWidth:100}).actions.length<=128);
 assert.throws(()=>TextActionPaths.restore({version:1,vocab:[],edges:[],cues:[]}),/Invalid/);
});
test('user selects an observed word action and navigates from that state',()=>{
 const n=new TextActionPaths();
 for(let i=0;i<14;i++){
  n.learn('What causes rainfall?','Water vapor condenses into droplets.');
  n.learn('What causes snowfall?','Water vapor freezes into crystals.');
 }
 const choices=n.propose('What causes rainfall?',[],12);
 assert.ok(choices.length>=2);
 const chosen=choices.find(x=>x.token!==choices[0].token);
 const route=n.plan('What causes rainfall?',{prefix:[chosen.token],maxSteps:12});
 assert.deepEqual(route.prefix,[chosen.token]);
 assert.ok(route.output.startsWith(chosen.token));
});
