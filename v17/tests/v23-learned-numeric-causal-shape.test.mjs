import test from "node:test";
import assert from "node:assert/strict";
import {LearnedNumericalTextPhysics} from "../transcend/torus-aether/worlds/learned-numeric-causal-shape.mjs";

const grammar=[
 (e,q)=>"Account "+e+" received "+q+" credits.",
 (e,q)=>"Account "+e+" spent "+q+" credits.",
 (e,q)=>"Account "+e+" scaled by "+q+" units.",
 (e,q)=>"Account "+e+" mirrored "+q+" credits.",
 (e,q)=>"Account "+e+" reset to "+q+" credits."
];
const independentEffects=[
 (x,q)=>x+q,(x,q)=>x-q,(x,q)=>x*q,(x,q)=>q-x,(x,q)=>q
];
const random=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const question=e=>"After the full report, what is the balance of "+e+"?";
const starting=(e,x)=>"Account "+e+" begins with "+x+" credits.";
function train(){
 const m=new LearnedNumericalTextPhysics();
 for(let op=0;op<5;op++){
  const rng=random(129+op);
  for(let i=0;i<24;i++){
   const entity="training_"+op+"_"+i,quantity=1+Math.floor(rng()*11);
   const before=Math.floor(rng()*201)-100;
   const result=m.observeAction({sentence:grammar[op](entity,quantity),entity,
    quantity,before,after:independentEffects[op](before,quantity)});
   if(i===23)assert.equal(result.verified,true,"Cannot learn action law "+op);
  }
 }
 for(let i=0;i<8;i++){
  const entity="initial_training_"+i,value=12211+i*131;
  assert.equal(m.observeInitial({sentence:starting(entity,value),entity,value}),true);
  const queryEntity="question_training_"+i;
  assert.equal(m.observeQuestion({question:question(queryEntity),entity:queryEntity}),true);
 }
 return m;
}
function heldout(seed,index){
 const rand=random(seed*971+index*733+11),entity="unseen_numeric_"+seed+"_"+index;
 let balance=100000+Math.floor(rand()*700000);
 const initial=balance,steps=15+Math.floor(rand()*50);
 const lines=[starting(entity,initial)],truth=[];
 for(let i=0;i<steps;i++){
  let op=Math.floor(rand()*5),q=1+Math.floor(rand()*5);
  if(op===2&&Math.abs(balance*q)>1e10)op=0;
  const action=grammar[op](entity,q),after=independentEffects[op](balance,q);
  truth.push({action,entity,op,q,before:balance,after});
  lines.push(action);balance=after;
  lines.push(grammar[Math.floor(rand()*5)]("distractor_"+seed+"_"+index+"_"+i,1+Math.floor(rand()*8)));
  lines.push("A museum record contains noise about music, landscapes, chemistry, and a transaction that never happened.");
 }
 return {entity,question:question(entity),text:lines.join("\n"),
  start:initial,truth,answer:balance};
}
function worldOracle(truth){
 let i=0;
 return (state,planned,utterance)=>{
  const event=truth[i++];
  return event?{accepted:event.entity===state.entity&&event.before===state.balance&&event.action===utterance,
    balance:event.after}:{accepted:false,balance:state.balance};
 };
}
test("infer FIVE previously unlabeled causal numeric laws from witnessed full transformations",()=>{
 const m=train();
 assert.equal(m.laws.size,5);
 const discovered=[...m.laws.values()].map(x=>x.coefficients);
 assert.deepEqual(discovered,[[1,1,0,0],[1,-1,0,0],[0,0,1,0],[-1,1,0,0],[0,1,0,0]]);
 assert.ok([...m.laws.values()].every(x=>x.verified&&x.samples.length===24));
 const checkpoint=m.export(),restored=LearnedNumericalTextPhysics.restore(checkpoint);
 assert.deepEqual(restored.export(),checkpoint);
 console.log("V23_NUMERIC_LAWS",JSON.stringify({observed:120,verifiedRules:5,coefficients:discovered}));
});
test("300 unknown-answer mathematical text problems, full original shape BEFORE any step",()=>{
 const m=train(),frozen=JSON.stringify(m.export());
 let success=0,maxTokens=0,totalCharacters=0;
 for(const seed of [17,55,83])for(let index=0;index<100;index++){
  const w=heldout(seed,index);
  assert.equal(frozen.includes(w.entity),false,"Heldout entity appeared in training");
  assert.equal(w.question.includes(String(w.answer)),false,"Answer leaked through goal");
  const p=m.plan(w.text,w.question);
  assert.equal(p.found,true,p.reason);
  assert.equal(p.originalMethod,"Discoverer.shape");
  assert.equal(p.goal.answerProvided,false);
  assert.equal(p.plannedBeforeAction,true);
  assert.equal(p.answer,w.answer);
  assert.equal(p.path.length,w.truth.length);
  assert.equal(JSON.stringify(m.export()),frozen,"Heldout leaked into learning");
  const exec=m.execute(p,{step:worldOracle(w.truth)});
  assert.equal(exec.success,true);
  assert.equal(exec.actualAnswer,w.answer);
  totalCharacters+=w.text.length;maxTokens=Math.max(maxTokens,w.text.split(/\s+/).length);
  success++;
 }
 assert.equal(success,300);
 console.log("V23_NUMERIC_HELDOUT",JSON.stringify({success,total:300,
  accuracy:1,totalCharacters,maxWhitespaceTokens:maxTokens,
  objective:"terminal time, never provided answer",OpenThoughts3:"NOT_TESTED"}));
});
test("100000 numeric operations: independently verified complete invented answer not literally in source text",()=>{
 const m=train(),entity="holdout_long_100000",initial=712345,steps=100000;
 const lines=[starting(entity,initial)],query=question(entity);
 let answer=initial;
 for(let i=0;i<steps;i++){
  const q=1+i%9;lines.push(grammar[0](entity,q));answer+=q;
 }
 const text=lines.join("\n");
 assert.equal(text.includes(String(answer)),false,"Final numeric answer present in observed text");
 const before=JSON.stringify(m.export());
 const p=m.plan(text,query);
 assert.equal(p.found,true,p.reason);
 assert.equal(p.answer,answer);
 assert.equal(p.path.length,steps);
 assert.equal(p.plannedBeforeAction,true);
 assert.equal(p.goal.answerProvided,false);
 assert.ok(p.maxLocalNodes<=129);
 assert.ok(p.originalShapeCalls<1000);
 assert.equal(JSON.stringify(m.export()),before);
 let i=0;
 const execution=m.execute(p,{step:(state,predicted,action)=>{
  const amount=1+(i++%9);
  return {accepted:action===grammar[0](entity,amount),
    balance:state.balance+amount};
 }});
 assert.equal(execution.success,true);
 assert.equal(execution.actualAnswer,answer);
 console.log("V23_NUMERIC_100K",JSON.stringify({actions:steps,characters:text.length,
  exactFullAnswer:answer,truthInDocument:false,
  originalShapeCalls:p.originalShapeCalls,maxLocalNodes:p.maxLocalNodes,
  allActionsIndependentlyExecuted:true}));
});
test("ablate learned numeric operators; reject unseen nonlinear physics or physical resistance",()=>{
 const m=train(),w=heldout(17,999),plan=m.plan(w.text,w.question);
 assert.equal(plan.found,true);
 const withoutLaws=LearnedNumericalTextPhysics.restore(m.export());
 withoutLaws.laws.clear();
 assert.equal(withoutLaws.plan(w.text,w.question).found,false);
 const withoutQuestion=LearnedNumericalTextPhysics.restore(m.export());
 withoutQuestion.questions.clear();
 assert.equal(withoutQuestion.plan(w.text,w.question).found,false);
 const bad=m.execute(plan,{step:state=>({accepted:false,balance:state.balance})});
 assert.equal(bad.success,false);assert.equal(bad.trace.length,1);
 const unsupported=new LearnedNumericalTextPhysics();
 for(let k=0;k<25;k++){
  const e="nonlin_"+k,x=k*2+1,q=(k%7)+1;
  unsupported.observeAction({sentence:"Account "+e+" curved "+q+" units.",entity:e,quantity:q,before:x,after:x*x+q});
 }
 assert.ok([...unsupported.laws.values()].every(x=>!x.verified));
 assert.equal(m.parseEffect("Account x made an unseen exponentiation by 3 units."),null);
});
