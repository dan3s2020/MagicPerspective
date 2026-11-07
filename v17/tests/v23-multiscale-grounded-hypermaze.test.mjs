import test from "node:test";
import assert from "node:assert/strict";
import {GroundedTemporalHypermaze} from "../transcend/torus-aether/worlds/grounded-temporal-hypermaze.mjs";
import {MultiscaleGroundedHypermaze} from "../transcend/torus-aether/worlds/multiscale-grounded-hypermaze.mjs";

const event=(item,from,to)=>"The courier carried "+item+" from "+from+" to "+to+".";
function learned(){
 const m=new GroundedTemporalHypermaze();
 for(let i=0;i<6;i++){
  const item="training"+i,from="source"+i,to="destination"+i;
  assert.equal(m.observeAction({sentence:event(item,from,to),item,before:from,after:to}).learned,true);
  m.observeQuestion({question:"After the entire log, where is question"+i+"?",item:"question"+i});
 }
 return m;
}
const makeWorld=(n,seed=7)=>{
 const item="heldout_"+seed+"_"+n;
 const sentences=Array.from({length:n},(_,i)=>event(item,"p_"+seed+"_"+i,"p_"+seed+"_"+(i+1)));
 return {item,n,text:sentences.join("\n"),
   question:"After the entire log, where is "+item+"?",
   answer:"p_"+seed+"_"+n};
};
const independentlyVerified=world=>{
 let step=0;
 return (before,modelAction,utterance)=>{
  const i=step++,from="p_"+world.item.split("_")[1]+"_"+i,to="p_"+world.item.split("_")[1]+"_"+(i+1);
  const accepted=before.item===world.item&&before.holder===from&&
    modelAction.from===from&&modelAction.to===to&&
    utterance===event(world.item,from,to);
  return {accepted,holder:to};
 };
};
test("reproduce original scalar underflow at ~920 learned steps, then recover without editing original operator",()=>{
 const m=learned(),n=new MultiscaleGroundedHypermaze(m);
 for(const steps of [100,500,900,920,1000,3000]){
  const w=makeWorld(steps,7),direct=m.plan(w.text,w.question);
  const hierarchical=n.plan(w.text,w.question);
  assert.equal(direct.found,steps<=900,"Numeric regression boundary changed unexpectedly at "+steps);
  assert.equal(hierarchical.found,true,"Multiscale failed "+steps);
  assert.equal(hierarchical.plannedAnswer,w.answer);
  assert.equal(hierarchical.goal.answerProvided,false);
  assert.equal(hierarchical.originalMethod,"Discoverer.shape");
  assert.ok(hierarchical.levels.every(x=>x.originalMethod==="Discoverer.shape"));
  assert.ok(hierarchical.maximumLocalNodes<=129);
  const executed=n.execute(hierarchical,{step:independentlyVerified(w)});
  assert.equal(executed.success,true);assert.equal(executed.matchesFrozenAnswer,true);
 }
 console.log("V23_UNDERFLOW_REPAIR",JSON.stringify({
  originalFailsAt:[920,1000,3000],hierarchicalPasses:[100,500,900,920,1000,3000],
  originalAlgorithmUntouched:true}));
});
test("100000 whole actions and multi-megabyte input: complete path BEFORE movement, causally checked",()=>{
 const m=learned(),before=JSON.stringify(m.export());
 const n=new MultiscaleGroundedHypermaze(m,{chunkSize:128});
 for(const steps of [5000,16384,25000,100000]){
  const w=makeWorld(steps,19);
  assert.equal(before.includes(w.item),false);
  assert.equal(w.question.includes(w.answer),false);
  const plan=n.plan(w.text,w.question);
  assert.equal(plan.found,true,plan.reason);
  assert.equal(plan.path.length,steps);
  assert.equal(plan.plannedBeforeAction,true);
  assert.equal(plan.plannedAnswer,w.answer);
  assert.equal(plan.maximumLocalNodes<=129,true);
  assert.equal(plan.goal.answerProvided,false);
  assert.equal(JSON.stringify(m.export()),before,"Heldout changed learned model before physical execution");
  assert.ok(plan.levels.every(x=>x.fieldAtStart>0&&x.groups<=128));
  const executed=n.execute(plan,{step:independentlyVerified(w)});
  assert.equal(executed.success,true);
  assert.equal(executed.matchesFrozenAnswer,true);
  assert.equal(executed.actualAnswer,w.answer);
  if(steps===100000)assert.ok(plan.recursiveOriginalCalls<1000,
    "Hierarchy must avoid thousands of tiny redundant calls");
  console.log("V23_MACRO_SHAPE",JSON.stringify({
   steps,inputCharacters:w.text.length,success:executed.success,
   originalShapeCalls:plan.recursiveOriginalCalls,localNodeCap:plan.maximumLocalNodes,
   depth:Math.max(...plan.levels.map(x=>x.depth)),answerGivenInGoal:false,
   semanticOpenThoughtsProof:false
  }));
 }
});
test("independent final answer is determined by full experienced world, never frozen goal text",()=>{
 const m=learned(),n=new MultiscaleGroundedHypermaze(m);
 const a=makeWorld(1200,5),b=makeWorld(1300,5);
 const p=n.plan(a.text,a.question),q=n.plan(b.text,b.question);
 assert.equal(p.found,true);assert.equal(q.found,true);
 assert.notEqual(p.plannedAnswer,q.plannedAnswer);
 assert.equal(p.goal.answerProvided,false);assert.equal(q.goal.answerProvided,false);
 const rejected=n.execute(p,{step:(before)=>({accepted:false,holder:before.holder})});
 assert.equal(rejected.success,false);assert.equal(rejected.stepsExecuted,1);
 const noRules=GroundedTemporalHypermaze.restore(m.export());noRules.actions.clear();
 assert.equal(new MultiscaleGroundedHypermaze(noRules).plan(a.text,a.question).found,false);
 const wrong=a.text+"\n"+event(a.item,"wrong_from","wrong_to");
 const conflict=n.plan(wrong,a.question);
 assert.equal(conflict.found,false);assert.equal(conflict.reason,"CONTRADICTORY_EVENT_CHAIN");
 const restored=GroundedTemporalHypermaze.restore(m.export());
 assert.equal(new MultiscaleGroundedHypermaze(restored).plan(a.text,a.question).plannedAnswer,p.plannedAnswer);
});
