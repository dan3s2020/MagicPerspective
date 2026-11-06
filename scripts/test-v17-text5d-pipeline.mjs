// Acceptance against the REAL running V17 server (no synthetic / demo API).
// Safe: evaluation uses a frozen checkpoint and does not update training.
import assert from 'node:assert/strict';
const port=Number(process.argv[2]||8872),worker=Number(process.argv[3]||0);
const base=`http://127.0.0.1:${port}`;
const fetchJSON=async(path,opts={})=>{
 const r=await fetch(base+path,{...opts,signal:AbortSignal.timeout(180000)});
 if(!r.ok)throw Error(path+' HTTP '+r.status);
 return r.json();
};
const g=await fetchJSON('/graph?w='+worker);
assert.ok(Array.isArray(g.nodes),'original living graph not accessible');
assert.ok(Array.isArray(g.textSteps),'V17 live text trace missing');
console.log('PASS: /graph actual 5D geometry positions:',g.U?.length||0,'recent text movements:',g.textSteps.length);
const e=await fetchJSON('/eval',{method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({w:worker,kind:'text',opts:{count:1,max:700,T:0,noise:0}})});
if(e.error)throw Error('Frozen evaluation error: '+e.error);
assert.ok(Array.isArray(e.space5),'frozen 5D geometry missing');
assert.ok(Array.isArray(e.exercises)&&e.exercises.length===1,'held-out exercise missing');
const x=e.exercises[0];
assert.ok(Array.isArray(x.rows)&&x.rows.length>0,'per-character predictions missing');
assert.equal(typeof x.shape,'string','before-answer open-loop shape missing');
assert.ok(Array.isArray(x.replans),'frozen replanning audit missing');
console.log('PASS: /eval:',x.rows.length,'actual observed symbols;',x.shape.length,'open-loop characters;',x.replans.length,'replans;',e.space5.length,'5D learned points.');
const chat=await fetchJSON('/chat',{method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({w:worker,history:[['you','What can you predict from your experience?']],opts:{max:60,T:0,learn:false,seed:87261}})});
if(chat.error)throw Error('Real native Brain.chat: '+chat.error);
assert.equal(typeof chat.text,'string');assert.ok(Array.isArray(chat.space5));
assert.equal(typeof chat.gear?.used,'boolean');
if(chat.gear.used){assert.ok(Array.isArray(chat.gear.route));assert.equal(chat.gear.steps.length,chat.text.length);}
console.log('PASS: /chat actual output, motor:',chat.gear.used?'NativeGearDrive':'V17 legacy',', chars:',chat.text.length);
console.log('The UI draws learned 5D context projections from these real data. Visual projection is not proof of a solved hyperdimensional maze.');
