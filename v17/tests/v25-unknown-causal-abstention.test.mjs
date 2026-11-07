import test from "node:test";
import assert from "node:assert/strict";
import {GroundedTemporalHypermaze} from "../transcend/torus-aether/worlds/grounded-temporal-hypermaze.mjs";
import {LearnedNumericalTextPhysics} from "../transcend/torus-aether/worlds/learned-numeric-causal-shape.mjs";
import {ObservedNoEffectEvidence} from "../transcend/torus-aether/worlds/observed-no-effect-gate.mjs";
import {runV25StrictLab} from "../transcend/torus-aether/devour/v25-strict-adapter.mjs";

const move=(e,a,b)=>"The courier carried "+e+" from "+a+" to "+b+".";
const neutral=(e,a,b)=>"A visitor wondered whether "+e+" could have moved from "+a+" to "+b+", but nothing was observed.";
const numericQuery=e=>"After the full report, what is the balance of "+e+"?";
const temporalQuery=e=>"After the entire log, where is "+e+"?";
function temporal(){
 const m=new GroundedTemporalHypermaze();
 for(let i=0;i<8;i++)m.observeAction({sentence:move("train_"+i,"a_"+i,"b_"+i),
  item:"train_"+i,before:"a_"+i,after:"b_"+i});
 for(let i=0;i<8;i++)m.observeQuestion({question:temporalQuery("trainquestion_"+i),item:"trainquestion_"+i});
 return m;
}
function numeric(){
 const m=new LearnedNumericalTextPhysics();
 for(let i=0;i<24;i++){
  const e="training_"+i,from=10+3*i,q=1+i%7;
  m.observeAction({sentence:"Account "+e+" received "+q+" credits.",
    entity:e,before:from,quantity:q,after:from+q});
 }
 for(let i=0;i<8;i++){
  const e="numericinitial_"+i,x=100+i*19;
  m.observeInitial({sentence:"Account "+e+" begins with "+x+" credits.",entity:e,value:x});
  const q="numericquery_"+i;
  m.observeQuestion({question:numericQuery(q),entity:q});
 }
 return m;
}
const observedNeutral=gate=>{
 for(let i=0;i<8;i++){
  const e="observed_neutral_"+i,a="location_"+i+"_a",b="location_"+i+"_b";
  assert.equal(gate.observe({sentence:neutral(e,a,b),entity:e,
   before:"holder_"+i,after:"holder_"+i,accepted:true}).learned,true);
 }
 assert.equal(gate.compiled().length,1);
};
test("legacy completed paths were confidently WRONG when unknown causal effects were ignored",()=>{
 const m=numeric(),item="test_balance";
 const doc="Account test_balance begins with 10 credits.\n"+
  "Account test_balance received 2 credits.\n"+
  "Account test_balance donated 5 credits.\n"+
  "Account test_balance received 3 credits.";
 const legacy=m.plan(doc,numericQuery(item));
 assert.equal(legacy.found,true);
 assert.equal(legacy.answer,15);
 const independentWorldGroundTruth=10+2-5+3;
 assert.equal(independentWorldGroundTruth,10);
 assert.notEqual(legacy.answer,independentWorldGroundTruth);
 const c=new ObservedNoEffectEvidence();
 const strict=c.strictPlan(m,doc,numericQuery(item));
 assert.equal(strict.found,false);assert.equal(strict.reason,"UNKNOWN_RELEVANT_SENTENCE");
 assert.equal(strict.audit.unknown.length,1);
 assert.match(strict.audit.unknown[0].excerpt,/donated/);
 console.log("V25_FALSIFIED_LEGACY",JSON.stringify({
   unverifiedLegacyAnswer:legacy.answer,independentPhysicalTruth:independentWorldGroundTruth,
   strictAbstains:true,unknownEvent:"donated"}));
});
test("original frozen route abstains at UNKNOWN semantic transitions, even on valid-looking 2D projected paths",()=>{
 const m=temporal(),target="target";
 const doc=[move(target,"A","B"),"The courier teleported target from B to Z.",
   move(target,"B","C")].join("\n");
 const legacy=m.plan(doc,temporalQuery(target));
 assert.equal(legacy.found,true);assert.equal(legacy.plannedAnswer,"C");
 const strict=new ObservedNoEffectEvidence().strictPlan(m,doc,temporalQuery(target));
 assert.equal(strict.found,false);assert.equal(strict.reason,"UNKNOWN_RELEVANT_SENTENCE");
 assert.equal(strict.audit.unknown.length,1);
 assert.match(strict.audit.unknown[0].excerpt,/teleported/);
 const pronoun=[move(target,"A","B"),"It was teleported to Z.",move(target,"B","C")].join("\n");
 const unresolved=new ObservedNoEffectEvidence().strictPlan(m,pronoun,temporalQuery(target));
 assert.equal(unresolved.found,false);
 assert.equal(unresolved.audit.unknown.length,1);
 assert.match(unresolved.audit.unknown[0].meaning,/coreference/);
});
test("independently witnessed no-effect sentences DO NOT become false missing transitions",()=>{
 const m=temporal(),gate=new ObservedNoEffectEvidence();
 assert.throws(()=>gate.observe({sentence:neutral("x","A","B"),
  entity:"x",before:"A",after:"B"}),/unchanged/);
 assert.throws(()=>gate.observe({sentence:neutral("x","A","B"),
  entity:"x",before:"A",after:"A",accepted:false}),/unchanged/);
 observedNeutral(gate);
 const e="heldout_target";
 const doc=[move(e,"A","B"),neutral(e,"Site_X","Site_Y"),move(e,"B","C")].join("\n");
 const safe=gate.strictPlan(m,doc,temporalQuery(e));
 assert.equal(safe.found,true);
 assert.equal(safe.plannedAnswer,"C");
 assert.equal(safe.audit.recognizedEffects,2);
 assert.equal(safe.audit.recognizedNeutral,1);
 assert.equal(safe.audit.unknown.length,0);
 const negative=new ObservedNoEffectEvidence().strictPlan(m,doc,temporalQuery(e));
 assert.equal(negative.found,false);
 assert.equal(negative.audit.unknown.length,1);
 const restored=ObservedNoEffectEvidence.restore(gate.export());
 assert.deepEqual(restored.compiled(),gate.compiled());
 assert.equal(restored.strictPlan(m,doc,temporalQuery(e)).found,true);
});
test("numeric strict mode preserves original 100+ step operator when every relevant event has learned physics",()=>{
 const model=numeric(),gate=new ObservedNoEffectEvidence(),e="newaccount",begin=100;
 const steps=300;
 const document=["Account "+e+" begins with "+begin+" credits.",
  ...Array.from({length:steps},(_,i)=>"Account "+e+" received "+(i%7+1)+" credits.")].join("\n");
 const correct=begin+Array.from({length:steps},(_,i)=>i%7+1).reduce((a,b)=>a+b,0);
 const before=JSON.stringify(model.export());
 const plan=gate.strictPlan(model,document,numericQuery(e));
 assert.equal(plan.found,true);
 assert.equal(plan.answer,correct);
 assert.equal(plan.path.length,steps);
 assert.equal(plan.plannedBeforeAction,true);
 assert.equal(plan.goal.answerProvided,false);
 assert.equal(plan.audit.unknown.length,0);
 assert.equal(JSON.stringify(model.export()),before,"No heldout model change permitted");
});
test("same original V17 Brain stores strictly witnessed no-effect evidence and refuses unverified plans",()=>{
 const model=numeric(),brain={v23Numeric:model.export()};
 const e="samebrain",q=numericQuery(e);
 const document=["Account "+e+" begins with 10 credits.",
  "Account "+e+" received 2 credits.",
  "Account "+e+" donated 5 credits.",
  "Account "+e+" received 3 credits."].join("\n");
 const blocked=runV25StrictLab(brain,{kind:"numeric",command:"plan",document,question:q});
 assert.equal(blocked.found,false);assert.equal(blocked.strictClosedWorld,true);
 const neutralTraining=Array.from({length:8},(_,i)=>({
  sentence:neutral("evidence_"+i,"x_"+i,"y_"+i),entity:"evidence_"+i,
  before:"v_"+i,after:"v_"+i,accepted:true}));
 const learned=runV25StrictLab(brain,{kind:"numeric",command:"teach-neutral",observations:neutralTraining});
 assert.equal(learned.changed,true);assert.equal(learned.verifiedNeutralPatterns,1);
 assert.ok(brain.v25NeutralEvidence);
 const known=["Account "+e+" begins with 10 credits.",
  "Account "+e+" received 2 credits.",
  neutral(e,"anywhere","elsewhere"),
  "Account "+e+" received 3 credits."].join("\n");
 const safe=runV25StrictLab(brain,{kind:"numeric",command:"plan",document:known,question:q,offset:0,limit:10});
 assert.equal(safe.found,true,JSON.stringify(safe));
 assert.equal(safe.answer,15);
 assert.equal(safe.strictClosedWorld,true);
 assert.equal(safe.audit.recognizedNeutral,1);
 assert.equal(safe.path.total,2);
 const frozenBefore=JSON.stringify(brain.v23Numeric);
 const another=runV25StrictLab(brain,{kind:"numeric",command:"audit",document:known,question:q});
 assert.equal(another.found,true);
 assert.equal(JSON.stringify(brain.v23Numeric),frozenBefore);
});
