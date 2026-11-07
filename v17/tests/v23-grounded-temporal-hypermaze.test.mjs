import test from "node:test";
import assert from "node:assert/strict";
import {GroundedTemporalHypermaze,logTokens} from "../transcend/torus-aether/worlds/grounded-temporal-hypermaze.mjs";

const forms=[
 (i,a,b)=>"The courier carried "+i+" from "+a+" to "+b+".",
 (i,a,b)=>"During the journey, "+i+" traveled from "+a+" into "+b+".",
 (i,a,b)=>"At dawn the team relocated "+i+" from "+a+" toward "+b+"."
];
const rng=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
function train(){
 const m=new GroundedTemporalHypermaze();
 for(let f=0;f<3;f++)for(let k=0;k<8;k++){
  const item="training_item_"+f+"_"+k,from="training_a_"+f+"_"+k,to="training_b_"+f+"_"+k;
  assert.equal(m.observeAction({sentence:forms[f](item,from,to),item,before:from,after:to}).learned,true);
 }
 for(let k=0;k<8;k++){
  const item="question_training_"+k;
  m.observeQuestion({question:"After the entire log, where is "+item+"?",item});
 }
 return m;
}
function world(seed,num,{steps=null,distractors=null}={}){
 const r=rng(seed*1009+num*7907+31),item="unseen_item_"+seed+"_"+num;
 const n=steps??10+Math.floor(r()*50),extra=distractors??80+Math.floor(r()*80);
 const actions=[];
 for(let j=0;j<n;j++){
  const from="location_"+seed+"_"+num+"_"+j,to="location_"+seed+"_"+num+"_"+(j+1);
  actions.push({item,from,to,sentence:forms[Math.floor(r()*3)](item,from,to)});
 }
 const noise=[];
 for(let j=0;j<extra;j++){
  noise.push(forms[Math.floor(r()*3)]("other_item_"+num+"_"+j,"other_a_"+j,"other_b_"+j));
  noise.push("A visitor wondered whether "+item+" could have moved from site_"+j+
    " to site_"+(j+1)+", but nothing was observed.");
  noise.push("Unrelated report "+j+" records number "+Math.floor(r()*100000)+
    " and further details with no physical action on the target.");
 }
 const all=[];
 for(let j=0;j<n;j++){
  all.push(...noise.slice(Math.floor(j*noise.length/n),Math.floor((j+1)*noise.length/n)));
  all.push(actions[j].sentence);
 }
 return {text:all.join("\n"),question:"After the entire log, where is "+item+"?",
   item,actions,expected:actions.at(-1).to,steps:n};
}
function physicalOracle(w){
 let pointer=0;
 return (prior,action,utterance)=>{
  const correct=w.actions[pointer++];
  return correct ? {accepted:prior.item===correct.item&&prior.holder===correct.from&&
    action.item===correct.item&&action.from===correct.from&&utterance===correct.sentence,
    holder:correct.to} : {accepted:false,holder:prior.holder};
 };
}
test("frozen whole answer before act: 300 long heldout noisy text worlds, original Discoverer",()=>{
 const m=train(),frozen=JSON.stringify(m.export());
 let passed=0,maxTokens=0,maxSteps=0,totalChars=0;
 for(const seed of [17,55,83])for(let i=0;i<100;i++){
  const w=world(seed,i);
  assert.equal(frozen.includes(w.item),false,"Data leaked from heldout into training");
  assert.equal(w.question.includes(w.expected),false,"Answer leaked through question");
  const p=m.plan(w.text,w.question,{seed:74129});
  assert.equal(p.found,true,JSON.stringify({seed,i,reason:p.reason}));
  assert.equal(p.originalMethod,"Discoverer.shape");
  assert.equal(p.plannedBeforeAction,true);
  assert.equal(p.goal.answerProvided,false);
  assert.equal(p.path.length,w.steps);
  assert.equal(p.plannedAnswer,w.expected);
  assert.equal(JSON.stringify(m.export()),frozen,"Heldout altered learned model");
  const e=m.execute(p,{step:physicalOracle(w)});
  assert.equal(e.success,true);assert.equal(e.actualAnswer,w.expected);
  assert.equal(e.matchesFrozenAnswer,true);
  passed++;totalChars+=w.text.length;
  maxTokens=Math.max(maxTokens,logTokens(w.text).length);
  maxSteps=Math.max(maxSteps,w.steps);
 }
 assert.equal(passed,300);assert.ok(maxTokens>5000);assert.ok(maxSteps>=50);
 console.log("V23_HELDOUT",JSON.stringify({passed,total:300,totalChars,maxTokens,maxSteps,
  exact:1,hiddenAnswerAsGoal:false,naturalLanguageQAProven:false}));
});
test("120k-token scale input is not artificially limited to original 96-token cap",()=>{
 const m=train(),w=world(101,1,{steps:100,distractors:2600});
 const count=logTokens(w.text).length;
 assert.ok(count>100000,JSON.stringify({count}));
 const p=m.plan(w.text,w.question);
 assert.equal(p.found,true);assert.equal(p.path.length,100);
 assert.equal(p.plannedAnswer,w.expected);
 assert.equal(m.execute(p,{step:physicalOracle(w)}).success,true);
 console.log("V23_LARGE",JSON.stringify({tokens:count,chars:w.text.length,steps:100,exact:true}));
});
test("heldout ablations: no learned law, unknown grammar, contradiction, true world rejection",()=>{
 const m=train(),w=world(17,777,{steps:9,distractors:15}),plan=m.plan(w.text,w.question);
 assert.equal(plan.found,true);
 const absent=new GroundedTemporalHypermaze();
 assert.equal(absent.plan(w.text,w.question).found,false);
 const noActions=GroundedTemporalHypermaze.restore(m.export());noActions.actions.clear();
 assert.equal(noActions.plan(w.text,w.question).found,false);
 const noQuestions=GroundedTemporalHypermaze.restore(m.export());noQuestions.questions.clear();
 assert.equal(noQuestions.plan(w.text,w.question).found,false);
 const restored=GroundedTemporalHypermaze.restore(m.export());
 assert.deepEqual(restored.plan(w.text,w.question).path,plan.path);
 assert.equal(JSON.stringify(restored.export()),JSON.stringify(m.export()));
 assert.equal(m.inferEvent("The courier imagined "+w.item+" from A to B."),null);
 const contradictory=w.actions[0].sentence+"\n"+forms[0](w.item,"not_the_current_holder","elsewhere")+"\n"+
   w.actions.slice(1).map(x=>x.sentence).join("\n");
 const conflict=m.plan(contradictory,w.question);
 assert.equal(conflict.found,false);assert.equal(conflict.reason,"CONTRADICTORY_EVENT_CHAIN");
 const failed=m.execute(plan,{step:()=>({accepted:false,holder:"rejected"})});
 assert.equal(failed.success,false);assert.equal(failed.trace.length,1);
 console.log("V23_ABLATIONS",JSON.stringify({missingRulesAbstain:true,
   unknownSyntaxIgnored:true,contradictionAbstains:true,worldRejectionStops:true}));
});
