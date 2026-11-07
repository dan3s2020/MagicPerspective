// True repository StateDependentTextAxes: input-axis goals, no answer oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {StateDependentTextAxes} from '../research/text-hypermaze/state-dependent-axes.mjs';

const cases=[
  {name:'addition',f:(a,b)=>a+b,supported:true},
  {name:'multiplication',f:(a,b)=>a*b,supported:true},
  {name:'affine',f:(a,b)=>2*a+3*b+5,supported:true},
  {name:'quadratic',f:(a,b)=>a*a+b,supported:true},
  {name:'square_sum',f:(a,b)=>a*a+b*b,supported:true},
  {name:'noisy_add',f:(a,b)=>a+b,supported:true,corrupt:true},
  {name:'cubic',f:(a,b)=>a*a*a+b,supported:false},
  {name:'coupled_cubic',f:(a,b)=>a*a*b+b*b,supported:false}
];

function fit(c){
  const m=new StateDependentTextAxes({maxValue:3000,maxExpanded:10000});
  const encode=(a,b)=>a+' @ '+b+' = '+c.f(a,b)+'.';
  let pairs=0;
  for(let a=1;a<=4;a++)for(let b=1;b<=4;b++){
    if(a<4){
      const after=c.corrupt&&a===2&&b===2?
        (a+1)+' @ '+b+' = '+(c.f(a+1,b)+7)+'.':encode(a+1,b);
      assert.equal(m.observePair(encode(a,b),after).learned,true);
      pairs++;
    }
    if(b<4){
      assert.equal(m.observePair(encode(a,b),encode(a,b+1)).learned,true);
      pairs++;
    }
  }
  assert.equal(pairs,24);
  assert.equal(m.discover(encode(4,4)).pairedObservations,24);
  return {m,encode};
}

test('54/54 independent whole-equation goals and 18/18 unsupported refusals', {timeout:60000},()=>{
  const ledger=[];let totalCorrect=0,totalAbstained=0;
  for(const c of cases){
    const {m,encode}=fit(c),model=m.discover(encode(4,4));
    assert.equal(model.ready,true,c.name);
    assert.deepEqual(model.axes,[0,1],c.name);
    assert.equal(model.dependent,2,c.name);
    assert.equal(model.operators.length,4,c.name);
    let exact=0,found=0,refused=0;
    for(let a=5;a<=7;a++)for(let b=5;b<=7;b++){
      const plan=m.plan(encode(4,4),
        [{index:0,value:a},{index:2,value:b}],
        {maxSteps:12,maxExpanded:10000});
      // Independent external correct value is checked only AFTER planning.
      const answer=encode(a,b);
      if(plan.found){
        found++;
        assert.equal(plan.predictedBeforeExecution,true,c.name);
        assert.equal(plan.referenceAnswerProvided,false,c.name);
        exact+=+(plan.predicted===answer);
      }else{
        refused++;
        assert.equal(plan.reason,'inconsistent-local-field-evidence',c.name);
      }
    }
    const minInliers=Math.min(...model.operators.map(x=>x.verifiedFraction));
    if(c.supported){
      assert.equal(exact,9,c.name);
      assert.equal(found,9,c.name);
      assert.ok(minInliers>=.9,c.name);
      totalCorrect+=exact;
    }else{
      assert.equal(found,0,c.name);
      assert.equal(refused,9,c.name);
      assert.ok(minInliers<.9,c.name);
      totalAbstained+=refused;
    }
    ledger.push({world:c.name,found,exact,refused,
      pairedObservations:model.pairedObservations,
      minInlierFraction:minInliers,
      maxTrainingResidual:Math.max(...model.operators.map(x=>x.maxTrainingResidual))});
  }
  assert.equal(totalCorrect,54);
  assert.equal(totalAbstained,18);
  console.log('REAL_LEARNED_CAUSAL_AXES '+JSON.stringify({
    controlledExact:totalCorrect,totalGoals:54,
    unsupportedAbstained:totalAbstained,totalUnsupported:18,ledger}));
});

test('causal ablation: own-axis dependence is necessary on unseen quadratics',()=>{
  const c=cases.find(x=>x.name==='quadratic'),{m,encode}=fit(c);
  let baseline=0;
  for(let a=5;a<=7;a++)for(let b=5;b<=7;b++){
    const p=m.plan(encode(4,4),[{index:0,value:a},{index:2,value:b}],{maxSteps:12});
    baseline+=+(p.predicted===encode(a,b));
  }
  assert.equal(baseline,9);
  const original=m.discover.bind(m);
  m.discover=start=>{
    const current=original(start);
    return {...current,operators:current.operators.map(op=>({
      ...op,slopes:op.slopes.map((v,i)=>i===op.primary?0:v)
    }))};
  };
  let ablated=0;
  for(let a=5;a<=7;a++)for(let b=5;b<=7;b++){
    const p=m.plan(encode(4,4),[{index:0,value:a},{index:2,value:b}],{maxSteps:12});
    ablated+=+(p.predicted===encode(a,b));
  }
  assert.ok(ablated<baseline,'Removing learned own-axis dependency must cause errors');
  console.log('LEARNED_OWN_AXIS_ABLATION '+JSON.stringify({baseline,ablated}));
});
