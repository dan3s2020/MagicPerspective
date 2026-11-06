import test from 'node:test';
import assert from 'node:assert/strict';
import {LanguageWorld,ActionDynamics,CausalTextAgent} from './causal_text_world.mjs';
import {TextActionPaths} from './text_action_paths.mjs';

function trainedHead(){const p=new TextActionPaths();
 for(const [q,a] of [
  ['What follows one?', 'two.'], ['What follows two?', 'three.'],
  ['What follows three?', 'four.'], ['Where does rain fall?', 'On earth.'],
  ['What is rain?', 'Water falling from clouds.']])for(let i=0;i<6;i++)p.learn(q,a);
 return p;
}
test('opaque action physics is not exposed through ordinary observation or feedback',()=>{
 const w=new LanguageWorld({prompt:'what is water',reference:'blue clear water',seed:13,initial:['blue','clear']});
 const first=w.observe();assert.deepEqual(Object.keys(first),['prompt','tokens','length','step']);
 const a=w.act({tool:1,token:'water'});assert.ok(!('reference' in a));
 assert.ok(!('reference' in a.event));assert.equal(typeof a.feedback.delta,'number');
});
test('learn physical effects from interventions, predict unseen states before action',()=>{
 const agent=new CausalTextAgent({seed:9});agent.probe(141);
 const mapping=new LanguageWorld({prompt:'gamma alpha beta',seed:141,initial:['alpha','beta']}).observerLawForTestOnly();
 const state=new LanguageWorld({prompt:'gamma alpha beta',seed:141,initial:['one','two']});
 const s0=state.observe();const action={tool:mapping.indexOf('swap'),token:'omega'};
 const expected=agent.dynamics.predict(s0,action);
 assert.equal(expected.available,true);assert.deepEqual(expected.tokens,['two','one']);
 const actual=state.act(action);
 assert.deepEqual(actual.observation.tokens,expected.tokens);
 const obs=agent.dynamics.observe(s0,action,actual.observation);assert.equal(obs.predictionMatched,true);
});
test('frozen heldout path does not access reference or alter weights, and has measured trace',()=>{
 const path=trainedHead(),agent=new CausalTextAgent({seed:33});agent.probe(23);
 for(let i=0;i<24;i++)agent.train('What follows one?','two.',path,{seed:i,maxActions:8});
 const before=JSON.stringify(agent.export());
 const route=agent.navigate('What follows three?',path,{steps:10});
 assert.ok(route.steps>0);assert.ok(route.events[0].predicted);
 assert.equal(JSON.stringify(agent.export()),before);
 const evalR=agent.evaluate('What follows three?','four.',path,{steps:10});
 assert.equal(evalR.referenceReadAfterPlanning,true);
 assert.equal(JSON.stringify(agent.export()),before);
});
test('Q/A training emits actual observed interventions and reward history, not oracle action paths',()=>{
 const path=trainedHead(),a=new CausalTextAgent();a.probe(11);
 const r=a.train('What follows two?','three.',path,{maxActions:12,seed:22});
 assert.ok(r.trained&&r.events.length>0);
 for(const e of r.events){assert.ok(Array.isArray(e.before)&&Array.isArray(e.after));assert.ok(e.feedback);assert.ok(e.model);}
 assert.equal(a.value.updates,r.events.length);
});
test('restore persists learned dynamics and critic exactly',()=>{
 const path=trainedHead(),a=new CausalTextAgent({seed:32});a.probe(101);
 for(let i=0;i<9;i++)a.train('Where does rain fall?','on earth.',path,{maxActions:7,seed:10+i});
 const b=CausalTextAgent.restore(JSON.parse(JSON.stringify(a.export())));
 assert.deepEqual(b.export(),a.export());
 assert.deepEqual(b.navigate('What is rain?',path),a.navigate('What is rain?',path));
});
test('alternate action physics fails predicted transition and is observable',()=>{
 const agent=new CausalTextAgent();agent.probe(11);
 const other=new LanguageWorld({prompt:'gamma alpha beta',seed:101,initial:['alpha','beta']});
 const pre=other.observe(),action={tool:0,token:'omega'},prediction=agent.dynamics.predict(pre,action);
 const out=other.act(action);assert.equal(prediction.available,true);
 if(other.observerLawForTestOnly()[0]!==new LanguageWorld({prompt:'gamma alpha beta',seed:11}).observerLawForTestOnly()[0]){
  assert.notDeepEqual(prediction.tokens,out.observation.tokens);
 }
});
