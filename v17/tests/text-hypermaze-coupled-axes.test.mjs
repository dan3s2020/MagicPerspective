import test from "node:test";
import assert from "node:assert/strict";
import {ObservedTransformations,tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {ContextAxisNavigator} from "../research/text-hypermaze/context-axis-evidence.mjs";
import {CoupledTextMaze} from "../research/text-hypermaze/coupled-axes.mjs";

const nTokens=s=>tokenizeObservation(s).filter(t=>/^\d+$/.test(t)).map(Number);
const arithmeticValid=(s,op)=>{
 const t=nTokens(s);
 return t.length===3 && (op==="+"?t[0]+t[1]===t[2]:t[0]-t[1]===t[2]);
};
const plus=[
 ["2 + 3 = 5.","3 + 3 = 6."],
 ["2 + 3 = 5.","2 + 4 = 6."],
 ["3 + 3 = 6.","4 + 3 = 7."],
 ["2 + 4 = 6.","2 + 5 = 7."]
];
const minus=[
 ["8 - 3 = 5.","9 - 3 = 6."],
 ["8 - 3 = 5.","8 - 4 = 4."],
 ["9 - 3 = 6.","10 - 3 = 7."],
 ["8 - 4 = 4.","8 - 5 = 3."]
];
function mathLearner(){const m=new CoupledTextMaze();for(const [a,b] of [...plus,...minus])assert.equal(m.observePair(a,b).learned,true);return m;}
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

test("NATIVE V17 one-edit text planner fails to discover an unseen two-token arithmetic action; the observed coupled moves identify it",()=>{
 const original=new ObservedTransformations();
 for(const [a,b] of plus) {original.observeSentence(a);original.observeSentence(b);}
 const baseline=original.plan({start:"2 + 3 = 5.",required:["9","6"],maxDepth:8});
 assert.equal(baseline.found,false,"no direct 2-token arithmetic actions are learned by its one-edit operator");
 const model=mathLearner(),a=model.axesFor("2 + 3 = 5."),b=model.axesFor("8 - 3 = 5.");
 assert.equal(a.stateDimensions,3);assert.equal(a.transformationRank,2);assert.equal(a.invariantDimension,1);
 assert.equal(b.stateDimensions,3);assert.equal(b.transformationRank,2);assert.equal(b.invariantDimension,1);
 const p=model.plan("2 + 3 = 5.",[{index:0,value:9},{index:2,value:6}]);
 assert.equal(p.found,true,JSON.stringify(p));assert.equal(p.predicted,"9 + 6 = 15.");
 assert.equal(p.steps,10);assert.equal(p.referenceAnswerProvided,false);
 assert.equal(model.execute(p).verified,true);
 console.log("LEARNED_COUPLED_TEXT_AXES",JSON.stringify({addition:a,subtraction:b,
   baselineSolved:baseline.found,novelPrediction:p.predicted,steps:p.steps,expanded:p.expanded}));
});

test("true conserved solution shape inferred from observed transformations, NOT hardcoded + or - grammar",()=>{
 const model=mathLearner();
 const plusAxis=model.axesFor("2 + 3 = 5."),minusAxis=model.axesFor("8 - 3 = 5.");
 const norm=vec=>vec.map(x=>Math.abs(x));
 assert.deepEqual(norm(plusAxis.invariants[0]),[1,1,1]);
 assert.deepEqual(norm(minusAxis.invariants[0]),[1,1,1]);
 const validPlus=model.invariantResidual("2 + 3 = 5.","3 + 3 = 6.");
 const invalidPlus=model.invariantResidual("2 + 3 = 5.","2 + 3 = 6.");
 const validMinus=model.invariantResidual("8 - 3 = 5.","8 - 4 = 4.");
 const invalidMinus=model.invariantResidual("8 - 3 = 5.","8 - 4 = 6.");
 assert.equal(validPlus.tangent,true);assert.equal(validMinus.tangent,true);
 assert.equal(invalidPlus.tangent,false);assert.equal(invalidMinus.tangent,false);
 console.log("GEOMETRIC_SOLUTION_INVARIANTS",JSON.stringify({
  additionInvariant:plusAxis.invariants,subtractionInvariant:minusAxis.invariants,
  observedValidNoise:validPlus,offManifoldNoise:invalidPlus}));
});

test("all withheld arithmetic targets are predicted before executing, without the unknown result supplied in the goal",()=>{
 const model=mathLearner();let tested=0,correct=0,steps=0;
 for(const [symbol,start,x0,x1,y0,y1] of [
  ["+","2 + 3 = 5.",6,12,5,8],
  ["-","8 - 3 = 5.",12,18,4,9]
 ]) {
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const goal=[{index:0,value:x},{index:2,value:y}];
   const p=model.plan(start,goal);
   assert.ok(p.found,JSON.stringify({symbol,x,y,p}));
   const expected=symbol==="+"?x+y:x-y;
   const actual=nTokens(p.predicted);
   assert.deepEqual(actual,[x,y,expected]);
   assert.equal(p.steps,Math.abs(x-nTokens(start)[0])+Math.abs(y-nTokens(start)[1]));
   assert.equal(model.execute(p).matchedPrediction,true);
   assert.equal(arithmeticValid(p.predicted,symbol),true);
   assert.ok(plus.concat(minus).every(([a,b])=>a!==p.predicted&&b!==p.predicted),
     "The entire predicted sentence must be truly unseen");
   tested++;correct++;steps+=p.steps;
  }
 }
 assert.equal(tested,70);
 console.log("HELDOUT_MATH_AS_MAZE",JSON.stringify({heldOut:tested,correct,meanSteps:steps/tested,
  answerProvidedInGoal:false,learnedPairs:model.observations,
  planningUsesOnlyObservedNumericDeltas:true}));
});

test("corrupted learned action effects invalidate unseen solutions even though the planning procedure remains unchanged",()=>{
 const model=mathLearner();const corrupted=mathLearner();
 for(const grammar of corrupted.grammars.values())for(const op of grammar.actions.values()){
   op.delta[op.delta.length-1]=-op.delta[op.delta.length-1];
 }
 let good=0,bad=0,checked=0;
 for(let x=6;x<11;x++)for(let y=5;y<8;y++){
  const goal=[{index:0,value:x},{index:2,value:y}];
  const a=model.plan("2 + 3 = 5.",goal),b=corrupted.plan("2 + 3 = 5.",goal);
  good+=+ (a.found && arithmeticValid(a.predicted,"+"));
  bad+=+ (b.found && arithmeticValid(b.predicted,"+"));
  checked++;
 }
 assert.equal(good,checked);
 assert.ok(bad<checked/2,JSON.stringify({good,bad,checked}));
 console.log("CORRUPTED_TRANSFORMATION_CONTROL",JSON.stringify({checked,realCorrect:good,corruptedCorrect:bad}));
});

function sparse(d,n,bridges=[]){
 const lex=Array.from({length:d},(_,j)=>Array.from({length:n},(_,i)=>"dim"+j+"value"+i));
 const sentence=ids=>ids.map((i,j)=>lex[j][i]).join(" ")+" artifact.";
 const baseline=Array(d).fill(0),m=new ObservedTransformations(),samples=[sentence(baseline)];
 for(let j=0;j<d;j++)for(let i=1;i<n;i++){const x=baseline.slice();x[j]=i;samples.push(sentence(x));}
 for(const v of bridges)samples.push(sentence(v));
 samples.forEach(s=>m.observeSentence(s));
 return {m,lex,sentence,base:sentence(baseline),samples};
}
test("three contextual axes: the unchanged V17 planner is over-restricted, and two witnessed bridge contexts release exactly the needed anchors",()=>{
 const star=sparse(3,5);
 const blind=new ContextAxisNavigator(star.m);
 let unconstrained=0;
 for(let i=1;i<5;i++)for(let j=1;j<5;j++)for(let k=1;k<5;k++){
  const goal=[star.lex[0][i],star.lex[1][j],star.lex[2][k]];
  unconstrained+=+blind.plan(star.base,goal,{maxSteps:3}).found;
 }
 assert.equal(unconstrained,0,"no evidence yet for neighbor-context independence");
 const first=blind.suggestBridge(star.base);assert.deepEqual(first.positions,[0,1]);
 star.m.observeSentence(first.candidate);
 const second=new ContextAxisNavigator(star.m).suggestBridge(star.base);
 assert.deepEqual(second.positions,[1,2]);star.m.observeSentence(second.candidate);
 const learned=new ContextAxisNavigator(star.m);
 let exact=0,native=0,visited=0;
 for(let i=1;i<5;i++)for(let j=1;j<5;j++)for(let k=1;k<5;k++){
  const goal=[star.lex[0][i],star.lex[1][j],star.lex[2][k]],
    target=star.sentence([i,j,k]);
  const p=learned.plan(star.base,goal,{maxSteps:3}),
    b=star.m.plan({required:goal,start:star.base,maxDepth:3,maxExpanded:2000});
  exact+=+ (p.found && p.predicted===target && p.steps===3);
  native+=+ (b.found&&b.predicted===target);
  visited+=p.expanded;
  assert.equal(star.m.containsSentence(target),false);
 }
 assert.equal(exact,64);
 assert.ok(native<64);
 console.log("OBSERVED_TEXT_AXIS_INDEPENDENCE",JSON.stringify({trainingSentences:star.samples.length+2,
  witnessedBridges:[first.candidate,second.candidate],heldoutTripleChanges:64,
  nativeExact:native,evidenceGatedExact:exact,meanExpanded:visited/64,
  observedAxisEvidence:learned.axisEvidence(5)}));
});

test("four contextual axes: three adjacent observed bridge interventions allow unobserved four-step composition",()=>{
 const w=sparse(4,4),initial=w.samples.length;
 for(let k=0;k<3;k++){
   const hint=new ContextAxisNavigator(w.m).suggestBridge(w.base);
   assert.ok(hint,JSON.stringify({k,axes:new ContextAxisNavigator(w.m).axisEvidence(6)}));
   w.m.observeSentence(hint.candidate);
 }
 const nav=new ContextAxisNavigator(w.m);let exact=0,checked=0;
 for(let a=1;a<4;a++)for(let b=1;b<4;b++)for(let c=1;c<4;c++)for(let d=1;d<4;d++){
  const ids=[a,b,c,d],goals=ids.map((v,i)=>w.lex[i][v]);
  const p=nav.plan(w.base,goals,{maxSteps:4,maxExpanded:4000});
  exact+=+(p.found&&p.predicted===w.sentence(ids)&&p.steps===4);
  checked++;
 }
 assert.equal(checked,81);assert.equal(exact,81);
 console.log("FOUR_DIMENSIONAL_OBSERVED_TEXT_MAZE",JSON.stringify({observed:initial+3,
   heldOut:checked,exact,axisEvidence:nav.axisEvidence(6),
   randomTwoProbeLimit:"With 3 possible adjacent bridges, two random probes cannot unlock all 4 axes"}));
});

test("partial evidence does not establish semantic independence: the same sparse observations fit two incompatible worlds",()=>{
 const source=sparse(3,5),nav=new ContextAxisNavigator(source.m);
 const imaginedValidInIndependentWorld="dim0value2 dim1value3 dim2value4 artifact.";
 const imaginedInvalidInExclusiveWorld=imaginedValidInIndependentWorld;
 assert.equal(source.m.containsSentence(imaginedValidInIndependentWorld),false);
 const constraints=[source.lex[0][2],source.lex[1][3],source.lex[2][4]];
 assert.equal(nav.plan(source.base,constraints,{maxSteps:3}).found,false);
 // Two hidden worlds accept exactly the SAME observed singles; one admits
 // full cross-products, one admits at most one nonzero coordinate.
 // No learning algorithm can distinguish them from the supplied positives.
 const isIndependent=()=>true,isExclusive=ids=>ids.filter(i=>i!==0).length<=1;
 assert.equal(isIndependent(),true);
 assert.equal(isExclusive([2,3,4]),false);
 assert.equal(source.samples.every(text=>isExclusive(
    Array.from({length:3},(_,i)=>+text.match(new RegExp("dim"+i+"value(\\d+)"))[1]))),true);
 console.log("OBSERVATIONAL_AMBIGUITY_CONTROL",JSON.stringify({
  trainingSentences:source.samples.length,unseenHypothesis:imaginedValidInIndependentWorld,
  possibleWorldA:"valid",possibleWorldB:"invalid",independentSemanticsNotProven:true}));
});

test("stochastic perturbations along DISCOVERED axes allow re-planning; open-loop first-path execution diverges",()=>{
 const model=mathLearner(),start="2 + 3 = 5.",goals=[{index:0,value:10},{index:2,value:8}];
 const initial=model.plan(start,goals);assert.equal(initial.steps,13);
 const grammar=model.grammars.get(model.structure(tokenizeObservation(start)));
 let closed=0,open=0,unexpected=0,invalid=0;
 for(let seed=1;seed<=50;seed++){
   const random=seeded(seed);
   const episode=(closedLoop)=>{
     let tokens=tokenizeObservation(start),disturbances=0;
     for(let i=0;i<(closedLoop?90:initial.actions.length);i++){
       const planned=closedLoop?model.plan(tokens.join(" ").replace(/\s+([.!?])/g,"$1"),goals):initial;
       if(closedLoop&&!planned.found)return {ok:false,disturbances};
       const action=closedLoop?planned.actions[0]:initial.actions[i];
       if(!action)break;
       const next=model.apply(tokens,action,grammar);if(!next)break;
       tokens=next;
       if(random()<.32){
         const actions=[...grammar.actions.values()];
         const disturbance=actions[Math.floor(random()*actions.length)];
         const perturbed=model.apply(tokens,disturbance,grammar);
         if(perturbed){tokens=perturbed;disturbances++;}
       }
       const number=nTokens(tokens.join(" "));
       if(number.length!==3 || number[0]+number[1]!==number[2])invalid++;
       if(closedLoop && number[0]===10 && number[1]===8)return {ok:true,disturbances};
     }
     const nums=nTokens(tokens.join(" "));
     return {ok:nums[0]===10&&nums[1]===8,disturbances};
   };
   const a=episode(true),b=episode(false);
   closed+=+a.ok;open+=+b.ok;unexpected+=a.disturbances;
 }
 assert.ok(closed>open,JSON.stringify({closed,open}));
 assert.equal(invalid,0,"real observed tangent-axis perturbations preserve invariant");
 console.log("STOCHASTIC_TEXT_MAZE_REPLANNING",JSON.stringify({episodes:50,closedLoopSolved:closed,
   openLoopSolved:open,observedPerturbations:unexpected,violatedInvariants:invalid}));
});
