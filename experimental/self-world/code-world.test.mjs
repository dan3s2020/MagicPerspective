import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {SelfCodeWorld,PortalLearner,CodeLock,CodeEffectModel,evaluateV17Text} from './code-world.mjs';
import {trainingCorpus,measureEdit} from './causal-laboratory.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const ref=path.join(directory,'reference/engine.mjs');
const sha=s=>crypto.createHash('sha256').update(fs.readFileSync(s)).digest('hex');
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'mp-self-code-'));
function world(brain=null){return new SelfCodeWorld({sourceFiles:[{path:ref,label:'engine.mjs'}],sandbox:tmp(),brain,seed:123});}

test('the source itself is observed as a real, hash-pinned code world',()=>{
 const w=world(),source=w.atlas.describe();
 assert.equal(source.files.length,1);assert.ok(source.nodes.some(n=>n.name==='EpistemicText'));
 assert.equal(source.nodes.find(n=>n.id==='self:locked-edit').locked,true);
 assert.equal(w.atlas.verify(),true);
 assert.match(w.perceive(source.nodes.find(n=>n.name==='EpistemicText').id).code,/EpistemicText/);
 assert.equal(w.status().lock.locked,true);
});
test('the code-world can be experienced through the original Brain.live API, without modifying Brain',()=>{
 const seen=[],brain={live(n){seen.push(n)}};const w=world(brain);
 w.perceive(w.atlas.nodes[0].id);
 assert.ok(seen.length>20);assert.match(String.fromCharCode(...seen),/SELF-CODE-WORLD/);
});
test('portals have a finite exploration budget, local estimates, and reproducible choices',()=>{
 const a=new PortalLearner({budget:2,seed:7,noise:.5}),b=new PortalLearner({budget:2,seed:7,noise:.5});
 const nodes=[{id:'a',kind:'method'},{id:'b',kind:'declaration'},{id:'c',kind:'method'},{id:'lock',kind:'locked'}];
 const ca=a.choose({from:'a',nodes}),cb=b.choose({from:'a',nodes});
 assert.deepEqual(ca,cb);assert.equal(ca.type,'noise-portal');assert.notEqual(ca.to,'lock');
 a.record(ca.to,0.5);a.choose({from:'a',nodes});
 assert.equal(a.choose({from:'a',nodes}).type,'walk');assert.equal(a.used,2);
});
test('only exact allowlisted numeric changes compile in new sandbox files',async()=>{
 const w=world(),before=sha(ref);
 assert.throws(()=>w.editor.makeDraft({id:'unknown',value:1}),/permitted/);
 assert.throws(()=>w.editor.makeDraft({id:'promotion-margin',value:'process.exit()'}),/Bad numeric/);
 assert.throws(()=>w.editor.makeDraft({id:'observation-period',value:-100}),/Bad numeric/);
 const d=w.previewCodeChange({id:'promotion-margin',value:0.025});
 assert.equal(sha(ref),before);assert.notEqual(d.sha256,before);
 assert.equal(fs.existsSync(d.path),true);
 const a=await evaluateV17Text({modulePath:ref,steps:160});
 const b=await evaluateV17Text({modulePath:d.path,steps:160});
 assert.ok(a>=0&&a<=1&&b>=0&&b<=1);
 assert.throws(()=>w.commitSandboxDraft(d.sha256,()=>true),/Lock has not been constructed/);
});
test('sealed lock never supplies hidden outcomes to the learner and rejects easy guessing',async()=>{
 const tasks=Array.from({length:8},(_,i)=>({id:String(i),slot:'secret',value:i/10,secret:i%2?2:-3}));
 let leaks=0;
 const gate=new CodeLock({sealed:tasks,oracle:async item=>item.secret,required:8});
 const result=await gate.evaluate(v=>{assert.equal(Object.hasOwn(v,'secret'),false);leaks++;return 0;});
 assert.equal(leaks,8);assert.equal(result.accuracy,0);assert.equal(result.baseline,0);assert.equal(gate.unlocked,false);
 await assert.rejects(gate.evaluate(()=>0),/already used/);
});
test('the unlock depends on demonstrated counterfactual predictions, not episode counts',async()=>{
 const tasks=Array.from({length:8},(_,i)=>({id:String(i),slot:'causal',value:i+1,secret:i%2?1:-1}));
 const gate=new CodeLock({sealed:tasks,oracle:async x=>x.secret});
 const result=await gate.evaluate(({value})=>value%2===0?1:-1);
 assert.equal(result.accuracy,1);assert.equal(result.baseline,0);assert.equal(result.pass,true);
 const w=world();const d=w.previewCodeChange({id:'perspective-period',value:14});
 assert.throws(()=>w.editor.approve(d.sha256,gate,()=>false),/Regression/);
 const changed=w.editor.approve(d.sha256,gate,()=>true);
 assert.equal(changed.originalUnchanged,true);assert.match(changed.path,/approved-/);
});
test('the causal learner generalizes from measured practice probes only',()=>{
 const m=new CodeEffectModel();m.observe({slot:'x',value:10,delta:-.2,corpusId:'train'});
 m.observe({slot:'x',value:20,delta:.5,corpusId:'train'});
 assert.ok(m.predict({slot:'x',value:18})>0);
 assert.equal(m.predict({slot:'unseen',value:1}),0);
});
test('real original engine executable counterfactual is measurable without touching original',async()=>{
 const w=world(),baseline=sha(ref);
 const r=await measureEdit(w,'perspective-period',14,{seed:19,steps:220,limit:80});
 assert.ok(Number.isFinite(r.delta));assert.equal(sha(ref),baseline);
});
