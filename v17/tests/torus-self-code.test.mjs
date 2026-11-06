import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {SelfCodeWorld,CodeSemantics,newCodeState} from '../transcend/torus-aether/worlds/self-code.mjs';
import {SharedExperience} from '../transcend/torus-aether/shared/experience.mjs';

const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};

test('real native V17 Brain lives executable code as the fourth world, with the same trace and shared sink',()=>{
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:19});
 const shared=new SharedExperience({capacity:64});
 brain.setSharedObserver(e=>shared.observe(e));
 const world=new SelfCodeWorld(brain);
 assert.ok(brain.trace.nodes.has('code:universe'));
 assert.ok(brain.trace.nodes.has('code:lock'));
 const before=brain.lived;
 world.step();
 assert.ok(brain.lived>before,'the same native Brain.live learned code characters');
 assert.equal(shared.status().domains.code,1);
 assert.equal(shared.take()[0].domain,'code');
 assert.ok(world.status().portals.length>0);
});

test('the original Brain.save/Brain.load persists self-code learning and prevents silent source changes',()=>{
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:19});
 const world=new SelfCodeWorld(brain);
 for(let i=0;i<4;i++)world.step();
 const filename=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'v17-self-code-')),'brain.v8');
 try{
   brain.save(filename);
   const restored=Brain.load(filename);
   const again=new SelfCodeWorld(restored);
   assert.equal(again.state.episodes,4);
   again.step();
   assert.equal(again.state.episodes,5);
 } finally {fs.rmSync(path.dirname(filename),{recursive:true,force:true});}
});

test('lock cannot open before program-causal evidence, regardless of an episode counter',()=>{
 const state=newCodeState(7);
 state.episodes=10000000;
 const model=new CodeSemantics(state);
 assert.equal(model.predict('portal-offset',3,2),null);
});

test('domain code follows original SharedExperience no-oracle contract',()=>{
 const shared=new SharedExperience();
 shared.observe({domain:'code',before:[3,1,4],action:'change:portal-offset:2',after:[3,2,5],context:'self-code'});
 const events=shared.take();
 assert.equal(events.length,1);
 assert.deepEqual(Object.keys(events[0]).sort(),['action','after','before','context','domain']);
});

test('counterfactual code hypothesis learns genuine new input predictions',()=>{
 const s=newCodeState(),m=new CodeSemantics(s);
 for(const x of [1,3,7,11])m.learn('unknown',x,2,(x+2)&15);
 assert.equal(m.predict('unknown',5,2),7);
 assert.equal(Object.hasOwn(s.examples.unknown[0],'op'),false);
});