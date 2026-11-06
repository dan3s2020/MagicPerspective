import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {NativeSelfCodeWorld,CodeActionPolicy} from './selfcode-native.mjs';

function fakeBrain(){
 const ev=[],nodes=new Map(),edges=[],shared=[];
 return {events:ev,shared,observeShared(e){shared.push(e)},trace:{nodes,edges,node(id,type,label){if(!nodes.has(id))nodes.set(id,{id,type,label});return nodes.get(id)},
  fire(id){const x=nodes.get(id);if(x)x.fired=true},setEdge(...a){edges.push(a)}},
 live(b){if(!Number.isSafeInteger(b))throw Error('Bad symbol');ev.push(b)},
 predict(){return Array.from({length:128},()=>1/128)}};
}
const root=()=>path.join(fs.mkdtempSync(path.join(os.tmpdir(),'mp-native-selfcode-')),'brain.v8');
test('native learner uses the very same Brain.live and trace',()=>{
 const brain=fakeBrain(),a=new NativeSelfCodeWorld({brain,seed:41,saveFile:root(),enableEvaluator:false});
 const initial=brain.events.length;
 for(let i=0;i<15;i++)a.step();
 const s=a.status();assert.equal(initial,0);assert.ok(brain.events.length>300);
 assert.equal(brain.shared.length,15);assert.ok(brain.shared.every(e=>e.domain==='selfcode'));
 assert.ok(brain.shared.every(e=>typeof e.before==='string'&&typeof e.after==='string'));
 assert.ok(s.graphNodes>=40);assert.equal(s.ticks,15);
 assert.ok(brain.trace.nodes.has('code:unknown'));
 assert.ok([...brain.trace.nodes.keys()].some(x=>x.startsWith('code:self/')));
 assert.ok(s.policy.n.walk+s.policy.n.portal===15);
 assert.equal(s.originalUnchanged,true);
});
test('native self-code checkpoints persist separately and do not replace Brain',()=>{
 const checkpoint=root(),brain=fakeBrain();
 const a=new NativeSelfCodeWorld({brain,saveFile:checkpoint,seed:12,enableEvaluator:false});
 for(let i=0;i<19;i++)a.step();a.save();
 assert.equal(fs.existsSync(checkpoint),false);
 assert.equal(fs.existsSync(checkpoint+'.selfcode.json'),true);
 const b=new NativeSelfCodeWorld({brain:fakeBrain(),saveFile:checkpoint,seed:12,enableEvaluator:false});
 assert.equal(b.status().ticks,19);assert.deepEqual(b.status().policy.n,a.status().policy.n);
});
test('portal policy chooses locally and learns from feedback',()=>{
 const p=new CodeActionPolicy();assert.equal(p.choose({random:()=>0,remaining:0}),'walk');
 for(let i=0;i<30;i++)p.learn('portal',0.8);
 for(let i=0;i<30;i++)p.learn('walk',-0.8);
 assert.equal(p.choose({random:()=>0.5,remaining:2}),'portal');
 assert.deepEqual(p.serialize().n,{walk:30,portal:30});
});

test('pause buffers evaluator feedback until resume and keeps its causal provenance',()=>{
 const brain=fakeBrain(),a=new NativeSelfCodeWorld({brain,saveFile:root(),enableEvaluator:false});
 a.pause();const before=brain.events.length;
 a.onEvaluation({kind:'probe',slot:'promotion-margin',value:.004,delta:.05,index:1});
 assert.equal(brain.events.length,before);assert.equal(a.status().probes,0);
 a.resume();assert.equal(a.status().probes,1);assert.ok(brain.events.length>before);
 assert.equal(a.status().lastProbe.slot,'promotion-margin');
});
