import test from "node:test";
import assert from "node:assert/strict";
import {makeMathWorld, applyMathRule, verifyMathTransition, rational, equalRational} from "../transcend/torus-aether/worlds/math.mjs";
import {ObservedMathRules, makeLearnedMathWorld, inspectPredictedMathPath} from "../transcend/torus-aether/worlds/math-observed.mjs";
import {trainOriginalDiscoverer} from "../transcend/torus-aether/worlds/math.mjs";

function generator(seed=0x2112ac1d) {
  let s=seed>>>0;
  const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  return ()=>({a:(rand()<.5?-1:1)*(2+Math.floor(rand()*8)),
    b:(rand()<.5?-1:1)*(1+Math.floor(rand()*12)),
    c:Math.floor(rand()*161)-80});
}
const key=x=>[x.a,x.b,x.c].join(":");
function experience(n) {
  const next=generator(),seen=new Set(),m=new ObservedMathRules();
  for(let i=0;i<n;i++){
    let p=next();while(seen.has(key(p)))p=next();
    seen.add(key(p));
    const w=makeMathWorld(p.a,p.b,p.c);
    for(const edge of w.edges.values())
      m.observe(edge.fromState,edge.rule,edge.toState);
  }
  return {m,seen};
}
test("induction: observed before/action/after discovers all five exact context-sensitive transformations",()=>{
  const {m}=experience(64);assert.equal(m.total,320);
  m.fit();const s=m.summary();
  assert.equal(s.learnedStageActions,5,JSON.stringify(s));
  for(const x of s.models) assert.equal(x.formulas.length,3);
  for(const p of [ {a:7,b:-4,c:39},{a:-9,b:12,c:-63},{a:2,b:3,c:13} ]){
    const w=makeMathWorld(p.a,p.b,p.c,{mirror:true});
    for(const edge of w.edges.values())
      assert.deepEqual(m.predict(edge.fromState,edge.rule),edge.toState);
  }
  console.log("MATH_LEARNED_TRANSFORMATIONS",JSON.stringify(s));
});
test("native Discoverer.shape + induced equations: HELDOUT first-action forms are valid, no hidden teacher in inference",()=>{
  const {m,seen}=experience(64);m.fit();
  const d=trainOriginalDiscoverer(140,11);
  const next=generator(0x7a5510ad),N=512;
  let success=0,prediction=0,valid=0,shortest=0,unique=0;
  const first=[];
  for(let i=0;i<N;i++){
    let p=next();while(seen.has(key(p)))p=next();
    seen.add(key(p));unique++;
    const w=makeLearnedMathWorld(p.a,p.b,p.c,m,{mirror:i%2===1});
    assert.equal(w.availableRoutes,2,JSON.stringify({p,rules:m.summary()}));
    const r=inspectPredictedMathPath(w,d,verifyMathTransition);
    if(i<4)first.push({p,trace:r.trace.map(e=>e.action),shape:r.path,solved:r.solved});
    prediction+=Number(r.predictedBeforeAction);
    valid+=Number(r.valid);
    success+=Number(r.solved);
    shortest+=Number(r.steps===2);
    assert.ok(r.solved,JSON.stringify({p,r}));
    assert.equal(r.steps,2);
    const end=r.trace.at(-1).to;
    assert.ok(equalRational(end.c,rational(p.c-p.a*p.b,p.a)),JSON.stringify({p,end}));
    assert.equal(end.a,1);assert.equal(end.b,0);
  }
  console.log("MATH_INDUCED_HELDOUT",JSON.stringify({trainProblems:64,observedActionEvents:320,
    tested:unique,firstActionPredictions:prediction,provedLegalSolutions:success,
    validPaths:valid,shortestPaths:shortest,
    hypothesisLanguage:"rational expression depth<=2 on state coefficients",first}));
  assert.equal(success,N);
  assert.equal(prediction,N);
});
test("negative controls: no math experience and missing learned steps cannot solve the heldout equations",()=>{
  const d=trainOriginalDiscoverer(140,11);
  const cold=new ObservedMathRules().fit();
  let hits=0;
  for(let i=0;i<64;i++){
    const w=makeLearnedMathWorld(2+(i%8),1+(i%12),i-30,cold);
    hits+=Number(inspectPredictedMathPath(w,d,verifyMathTransition).solved);
  }
  assert.equal(hits,0);
  const {m}=experience(64);m.fit();
  m.rules.delete("divided|subtract");
  m.rules.delete("offset|divide");
  let ablation=0;
  for(let i=0;i<64;i++){
    const w=makeLearnedMathWorld(2+(i%8),1+(i%12),i-30,m);
    ablation+=Number(inspectPredictedMathPath(w,d,verifyMathTransition).solved);
  }
  assert.equal(ablation,0);
  console.log("MATH_NEGATIVE_CONTROLS",JSON.stringify({coldSolutions:hits,removedRequiredRulesSolutions:ablation,totalEach:64}));
});
test("frozen training and no numerical answer leakage into the original Discoverer.shape call",()=>{
  const {m}=experience(64);m.fit();
  assert.throws(()=>m.observe({stage:"factored",a:2,b:1,c:rational(3)},"divide",{}),/Frozen/);
  const d=trainOriginalDiscoverer(140,11),x=makeLearnedMathWorld(3,2,11,m),y=makeLearnedMathWorld(7,-8,37,m);
  assert.deepEqual(x.ret,y.ret);
  let payload;
  const original=d.shape.bind(d);
  d.shape=(ret,n,me)=>{payload={ret,n,me};return original(ret,n,me);};
  const r=inspectPredictedMathPath(x,d,verifyMathTransition);
  assert.ok(r.solved);
  assert.deepEqual(Object.keys(payload).sort(),["me","n","ret"]);
  assert.ok(payload.ret.every(v=>Number.isInteger(v)&&v>=0&&v<=3));
  assert.deepEqual(r.path,inspectPredictedMathPath(y,d,verifyMathTransition).path);
});

test("numerical extrapolation far outside training coefficients, verified against independent exact symbolic rules",()=>{
  const {m}=experience(64);m.fit();
  const n=2048;let passed=0,unique=0;
  const next=generator(0x778a4ccf);
  const seen=new Set();
  for(let i=0;i<n;i++){
    const q=next(),s={stage:"factored",
      a:(q.a<0?-1:1)*(20+((Math.abs(q.a)*37+i)%981)),
      b:(q.b<0?-1:1)*(20+((Math.abs(q.b)*29+i)%981)),
      c:rational(((q.c*937+i*31)%200001))};
    const id=[s.a,s.b,s.c.n].join(":");
    if(seen.has(id))continue;seen.add(id);unique++;
    const order1=["divide","subtract"],order2=["distribute","subtract","divide"];
    for(const chain of [order1,order2]){
      let state=s;
      for(const action of chain){
        const predicted=m.predict(state,action);
        const exact=applyMathRule(state,action);
        assert.deepEqual(predicted,exact,JSON.stringify({s,state,action,predicted,exact}));
        assert.ok(verifyMathTransition(state,action,predicted));
        state=predicted;
      }
      assert.equal(state.stage,"isolated");
      assert.ok(equalRational(state.c,rational(s.c.n-s.a*s.b,s.a)));
    }
    passed++;
  }
  console.log("MATH_OUT_OF_DISTRIBUTION_EXTRAPOLATION",JSON.stringify({
    examples:passed,branchesPerExample:2,verifiedSymbolicSteps:passed*5,
    trainingCoefficientLimit:"abs(a)<=9, abs(b)<=12, abs(c)<=80",
    testCoefficientRange:"20..1000 (a,b), ~200000 c",heldoutOnly:true}));
  assert.equal(passed,n);
});
test("corrupted observations cannot synthesize a valid five-rule algebra",()=>{
  const {m}=experience(64);
  const records=m.observed.get("factored|divide");
  for(let i=0;i<records.length;i+=2)
    records[i].after.c=rational(records[i].after.c.n+7,records[i].after.c.d);
  m.fit();
  assert.ok(m.rules.size<5,JSON.stringify(m.summary()));
  const d=trainOriginalDiscoverer(140,11);
  const w=makeLearnedMathWorld(3,-2,13,m);
  const result=inspectPredictedMathPath(w,d,verifyMathTransition);
  // The independent rules have not been fabricated to fill conflicting evidence.
  assert.ok(w.availableRoutes<2, "inconsistent observations must not yield both correct derivations");
  console.log("MATH_CORRUPTED_EVIDENCE",JSON.stringify({learned:m.rules.size,originalRequired:5,availableRoutes:w.availableRoutes}));
});
