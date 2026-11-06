import test from 'node:test';
import assert from 'node:assert/strict';
import {NestedTextGears} from './nested_text_gears.mjs';
import {NativeGearDrive} from './native_gear_drive.mjs';

const four=[
 ['Describe She happy','She is happy.'],
 ['Describe She tired','She is tired.'],
 ['Describe He tired','He is tired.'],
 ['Describe He calm','He is calm.']
];
function train(){const gears=new NestedTextGears(),g=new NativeGearDrive({gears});for(const [q,a] of four)g.observePair(q,a);return g;}
test('native chat drive composes unseen answer using learned cues and operators',()=>{
 const g=train();assert.equal(g.gears.examples.some(x=>x.join(' ')==='She is calm'),false);
 const steps=[],a=g.generate([['you','Describe She calm']],{onStep:e=>steps.push(e)});
 assert.equal(a.used,true);assert.equal(a.text,'She is calm.');assert.ok(a.route.length>=2);
 assert.equal(steps.length,a.text.length);assert.ok(steps.every(s=>s.verified));
 assert.equal(g.summary().cursorSteps,a.text.length);
});
test('unsupported prompt never fabricates a route and preserves original writer fallback',()=>{
 const g=train();const x=g.generate([['you','Explain the origin of dark matter']]);
 assert.equal(x.used,false);assert.equal(g.summary().accepted,0);
});
test('missing transform does not hallucinate a target sentence',()=>{
 const gears=new NestedTextGears(),g=new NativeGearDrive({gears});
 for(const [q,a]of four.slice(0,3))g.observePair(q,a);
 const x=g.generate([['you','Describe She calm']]);assert.equal(x.used,false);
});
test('restored drive resumes learned associations and output is frozen at inference',()=>{
 const g=train(),copy=NativeGearDrive.restore(g.export(),{gears:NestedTextGears.restore(g.gears.export())});
 const before=copy.export();const output=copy.generate([['you','Describe She calm']]);
 assert.equal(output.text,'She is calm.');
 const after=copy.export();
 for(const k of ['cueCounts','cueTotals','glob','lengths','examples','rows'])assert.deepEqual(after[k],before[k]);
});
test('several held-out combinations must be produced without target included in training',()=>{
 const sub=['He','She','It'],prop=['calm','tired','happy','kind'];let pass=0;
 for(const [s,p] of sub.flatMap(s=>prop.map(p=>[s,p]))){
  const g=new NativeGearDrive({gears:new NestedTextGears()});
  const train=sub.flatMap(x=>prop.map(y=>[x,y])).filter(([x,y])=>x!==s||y!==p);
  for(const [x,y] of train)g.observePair(`Describe ${x} ${y}`,`${x} is ${y}.`);
  const result=g.generate([['you',`Describe ${s} ${p}`]]);
  if(result.used&&result.text===`${s} is ${p}.`)pass++;
 }
 assert.equal(pass,sub.length*prop.length);
});
