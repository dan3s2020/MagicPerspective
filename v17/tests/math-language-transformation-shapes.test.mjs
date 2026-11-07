import test from "node:test";
import assert from "node:assert/strict";
import {seeded} from "../research/local-axes/transport.mjs";
import {
 mod,inverseMod,evaluate,generateHiddenWorld,observeWorld,
 ObservedMathNavigator,executeWorld
} from "../research/local-axes/modular-language.mjs";

test("learn the meanings of four unknown mathematical operation words, not their answers, from observations",()=>{
 const results=[];
 for(const seed of [19,23,29,37,43]){
  const w=generateHiddenWorld({seed}),m=new ObservedMathNavigator({p:w.p,actions:w.actions});
  const trained=observeWorld(w,m,{perAction:16,seed:993});
  const report=m.infer();
  assert.equal(report.rules,4,"all operator meanings induced without seeing formula coefficients");
  let transitions=0;
  for(const word of w.actions){
    assert.deepEqual(m.rules.get(word),{
      a:mod(w.hidden.get(word).a,w.p),
      b:mod(w.hidden.get(word).b,w.p)});
    for(let x=0;x<w.p;x++)if(!trained.has(x)){
      assert.equal(evaluate(m.rules.get(word),x,w.p),evaluate(w.hidden.get(word),x,w.p));
      assert.equal(m.evidence.predict("state:"+x,"word:"+word),null,
        "native graph has never observed the heldout input / action edge");
      transitions++;
    }
  }
  results.push({seed,trainedNumbers:trained.size,heldoutOperatorTransitions:transitions,
    learnedSymbols:w.actions,exactAccuracy:1});
 }
 console.log("LEARNED_MATH_ACTION_WORDS",JSON.stringify(results));
});
test("pre-action mathematical-language solution SHAPE traverses unseen starts, goals and multi-action compositions",()=>{
 const records=[];
 for(const seed of [17,19,23,29,37]){
  const w=generateHiddenWorld({seed}),m=new ObservedMathNavigator({p:w.p,actions:w.actions});
  const trained=observeWorld(w,m,{perAction:16,seed:101});
  assert.equal(m.infer().rules,4);
  const rng=seeded(1245+seed);let correct=0,total=0,compositions=0,steps=0;
  for(let i=0;i<130;i++){
    let start=Math.floor(rng()*w.p),goal=Math.floor(rng()*w.p);
    if(trained.has(start)||start===goal){i--;continue;}
    const prompt="from "+start+" to "+goal;
    const pre=m.parseAndPlan(prompt);
    assert.ok(pre.ready,JSON.stringify(pre));
    assert.equal(pre.preaction,true);
    const after=executeWorld(w,pre,{trace:i===0});
    correct+=+after.solved;steps+=after.steps;compositions+=+(after.steps>=2);
    assert.equal(after.exact,true);
    total++;
  }
  assert.ok(compositions>40,"not just one-step memorization");
  records.push({seed,unseenProblems:total,solved:correct,composed2Plus:compositions,
    averageActions:steps/total,accuracy:correct/total});
 }
 console.log("UNSEEN_MATH_LANGUAGE_SOLUTION_SHAPES",JSON.stringify(records));
});
test("randomized action-label evidence cannot fake mathematical generalization",()=>{
 let original=0,garbled=0,examples=0;
 for(const seed of [17,19,23,29,37]){
  const w=generateHiddenWorld({seed}),model=new ObservedMathNavigator({p:w.p,actions:w.actions});
  const control=new ObservedMathNavigator({p:w.p,actions:w.actions});
  const train=observeWorld(w,model,{perAction:16,seed:811});
  observeWorld(w,control,{perAction:16,noise:1,seed:811});
  const learned=model.infer(),invalid=control.infer();
  assert.equal(learned.rules,4);
  garbled+=invalid.rules;
  for(let start=0;start<w.p;start++)if(!train.has(start)){
   const action=w.actions[0],truth=evaluate(w.hidden.get(action),start,w.p);
   original+=+(evaluate(model.rules.get(action),start,w.p)===truth);
   if(control.rules.has(action))garbled+=+(evaluate(control.rules.get(action),start,w.p)===truth);
   examples++;
  }
 }
 assert.equal(original,examples);
 assert.ok(garbled/examples<.05,JSON.stringify({original,garbled,examples}));
 console.log("MATH_RANDOMIZED_EVIDENCE_CAUSAL_CONTROL",
  JSON.stringify({heldout:examples,learned:original/examples,randomizedApproximationUpperBound:garbled/examples}));
});
test("learning noise can be overcome by CONSISTENT repetitions, without knowing an oracle answer",()=>{
 const records=[];
 for(const seed of [17,19,23,29,37]){
  const w=generateHiddenWorld({seed}),m=new ObservedMathNavigator({p:w.p,actions:w.actions});
  observeWorld(w,m,{perAction:24,noise:.30,seed:1979+seed});
  const r=m.infer({minFraction:.55});
  let correct=0,total=0;
  for(const word of w.actions)for(let x=0;x<101;x++){
    total++;correct+=+(m.rules.has(word)&&evaluate(m.rules.get(word),x,101)===evaluate(w.hidden.get(word),x,101));
  }
  records.push({seed,accepted:r.rules,all:r.allRules,transitionAccuracy:correct/total});
 }
 assert.ok(records.every(x=>x.transitionAccuracy===1),JSON.stringify(records));
 console.log("NOISY_MATHEMATICAL_TRANSFORM_RECONSTRUCTION",JSON.stringify(records));
});
test("model correctly rejects out-of-class nonlinear x→x² transformation instead of inventing an affine route",()=>{
 const m=new ObservedMathNavigator({p:101,actions:["unknown"]});
 for(let x=0;x<50;x++)m.observe(x,"unknown",mod(x*x,101));
 const r=m.infer({minFraction:.55});
 assert.equal(r.rules,0);
 const p=m.shape(51,77);
 assert.equal(p.ready,false);
 console.log("NONLINEAR_WORLD_FALSIFICATION",JSON.stringify({fit:r.reports[0].fit,accepted:r.rules===1,
  preactionPlan:p.ready}));
});
