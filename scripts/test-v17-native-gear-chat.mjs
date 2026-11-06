// End-to-end acceptance against the running ORIGINAL V17 /chat endpoint.
// Intentionally trains four fresh nonce Q/A observations in the selected brain.
// The unseen fifth answer is NEVER submitted to the training endpoint.
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const port=Number(process.argv[2]||8872),brain=Number(process.argv[3]||0);
const host='http://127.0.0.1:'+port,nonce=randomBytes(4).toString('hex');
const a='Sera'+nonce,b='Daro'+nonce,x='bright'+nonce,y='tired'+nonce,z='calm'+nonce;
const examples=[
  `Describe ${a} ${x} => ${a} is ${x}.`,
  `Describe ${a} ${y} => ${a} is ${y}.`,
  `Describe ${b} ${y} => ${b} is ${y}.`,
  `Describe ${b} ${z} => ${b} is ${z}.`
];
async function post(url,obj){
 const response=await fetch(host+url,{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(obj),signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error(url+' HTTP '+response.status);
 return response.json();
}
console.log('Testing running V17 brain #'+brain+' on '+host);
const learned=await post('/gear',{w:brain,mode:'observe',examples});
assert.equal(learned.ok,true,JSON.stringify(learned));
assert.equal(learned.accepted,4,'fresh Q/A training examples must be accepted');
const prompt=`Describe ${a} ${z}`,expected=`${a} is ${z}.`;
const answer=await post('/chat',{w:brain,history:[['you',prompt]],opts:{T:0,max:180,stopBlank:true,learn:false,seed:97013}});
assert.equal(answer.error,undefined,JSON.stringify(answer));
assert.equal(answer.text,expected,'unseen fifth answer must come from real Brain.chat');
assert.equal(answer.gear?.used,true,'original Brain.chat must explicitly select the real gear');
assert.ok(answer.gear.route.length>=2,'unseen answer must require multiple learned operators');
assert.equal(answer.gear.characters,expected.length,'real cursor action count must match emitted characters');
console.log('PASS /chat: '+answer.text);
console.log('PASS: '+answer.gear.route.length+' observed transformations -> '+answer.gear.characters+' native character actions.');
console.log('Expected answer was NOT included in the four training observations.');
let trace=false;try{
 const r=await fetch(host+'/graph?w='+brain,{signal:AbortSignal.timeout(12000)});
 if(r.ok){const snapshot=await r.json();trace=Array.isArray(snapshot.nodes)&&
   snapshot.nodes.some(n=>String(n[0]).startsWith('gear:chat:97013:char:'));}
}catch{}
console.log(trace?'PASS: real Brain GraphTrace contains native character nodes.':'GRAPH TRACE: not yet present in returned snapshot; inspect live graph.');
