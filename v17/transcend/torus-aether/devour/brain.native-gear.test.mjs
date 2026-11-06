import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from './brain.mjs';

// Exercise the ACTUAL Brain.chat path, without initializing a large training
// graph or touching any original checkpoint.
function fakeBrain(){
 const brain=Object.create(Brain.prototype),events=[];
 brain.lived=21;
 brain.trace={node:(...args)=>events.push(['node',...args]),setEdge:(...args)=>events.push(['edge',...args])};
 brain.align={write:()=>[76,69,71,65,67,89]}; // 'LEGACY' if the driver has no verified path
 return {brain,events};
}
test('native gear actually emits from Brain.chat, not just the separate /gear viewer',()=>{
 const {brain,events}=fakeBrain();let called=0;
 brain.setGearDriver({generate(history,options){called++;
  assert.equal(history.at(-1)[1],'Describe She calm');
  assert.equal(options.seed,987);
  return {used:true,text:'She is calm.',source:'native gear cursor',chars:12,
    goal:{0:'She',2:'calm'},expanded:8,
    route:[{from:'He',to:'She',slot:0,evidence:2,before:'He is tired',after:'She is tired'},
      {from:'tired',to:'calm',slot:2,evidence:2,before:'She is tired',after:'She is calm'}]};
 }});
 const answer=brain.chat([['you','Describe She calm']],{max:200,seed:987,T:0,learn:false});
 assert.equal(answer.text,'She is calm.');assert.equal(answer.gear.used,true);
 assert.equal(called,1);assert.ok(events.some(e=>e[0]==='edge'&&e[3]==='gear-char'));
 assert.ok(events.some(e=>e[0]==='edge'&&e[3]==='gear-transform'));
});
test('native gear refuses unsupported goal and exact previous V17 writing path remains intact',()=>{
 const {brain}=fakeBrain();brain.setGearDriver({generate:()=>({used:false,reason:'no proven path'})});
 const answer=brain.chat([['you','Explain gravity']],{max:200,T:0,seed:123,learn:false});
 assert.equal(answer.text,'LEGACY');assert.equal(answer.gear.used,false);
 assert.match(answer.gear.reason,/no proven path/);
});
