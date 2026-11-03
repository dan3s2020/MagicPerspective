// V4: candidate-law search and intervention-driven causal induction, not an LLM.
import {RNG} from './projection.mjs';
export const MOD=11,ACTIONS=['amber','violet'];
const mod=x=>((x%MOD)+MOD)%MOD;
export function applyLaw(law,x){
  if(law.kind==='add')return mod(x+law.a);
  if(law.kind==='multiply')return mod(x*law.a);
  if(law.kind==='affine')return mod(x*law.a+law.b);
  if(law.kind==='square')return mod(x*x+law.a);
  throw Error('Unknown law');
}
const lawCost={add:1,multiply:1.2,affine:2.2,square:2};
export function candidateLaws(){
  const rules=[];
  for(let a=0;a<MOD;a++){rules.push({kind:'add',a});rules.push({kind:'multiply',a});rules.push({kind:'square',a});}
  for(let a=0;a<MOD;a++)for(let b=0;b<MOD;b++)rules.push({kind:'affine',a,b});
  return rules;
}
const LAWS=candidateLaws();
export function createRuleWorld(seed){
  const rng=new RNG(seed),law=Object.fromEntries(ACTIONS.map(action=>{
    const kind=['add','multiply','affine','square'][rng.int(4)];
    return [action,{kind,a:rng.int(MOD),b:rng.int(MOD)}];
  }));
  return Object.freeze({
    seed,
    teacher:()=>structuredClone(law),
    intervene:(x,action)=>{
      if(!Number.isInteger(x)||x<0||x>=MOD||!ACTIONS.includes(action))throw Error('Invalid intervention');
      return {input:x,action,output:applyLaw(law[action],x)};
    }
  });
}
export class RuleLearner{
  constructor(){this.samples=Object.fromEntries(ACTIONS.map(a=>[a,[]]));this.creations=0;this.activeKinds=Object.fromEntries(ACTIONS.map(a=>[a,'add']));}
  observe(event){
    if(!ACTIONS.includes(event.action)||![event.input,event.output].every(x=>Number.isInteger(x)&&x>=0&&x<MOD))throw Error('Invalid causal observation');
    const old=this.best(event.action)?.law.kind;
    this.samples[event.action].push({input:event.input,output:event.output});
    const next=this.best(event.action)?.law.kind;
    if(next!==old){this.creations++;this.activeKinds[event.action]=next;}
  }
  compatible(action){
    if(!ACTIONS.includes(action))throw Error('Invalid action');
    const samples=this.samples[action];
    return LAWS.map(law=>({law,mismatch:samples.reduce((n,s)=>n+(applyLaw(law,s.input)!==s.output),0),
      cost:lawCost[law.kind]})).sort((a,b)=>a.mismatch-b.mismatch||a.cost-b.cost||
      a.law.kind.localeCompare(b.law.kind)||a.law.a-b.law.a||(a.law.b||0)-(b.law.b||0));
  }
  best(action){return this.compatible(action)[0]}
  predict(x,action){
    if(!Number.isInteger(x)||x<0||x>=MOD)throw Error('Invalid state');
    const ranked=this.compatible(action),best=ranked[0],consistent=ranked.filter(x=>x.mismatch===best.mismatch);
    const outputs=new Set(consistent.map(x=>applyLaw(x.law,x)));
    return {value:applyLaw(best.law,x),law:best.law.kind,
      consistency:best.mismatch===0,alternatives:consistent.length,
      uncertainty:outputs.size>1?1-1/outputs.size:0,modelComplexity:best.cost};
  }
  chooseExperiment(x){
    return ACTIONS.map(action=>{
      const r=this.compatible(action),min=r[0].mismatch,compatible=r.filter(y=>y.mismatch===min);
      const diversity=new Set(compatible.map(y=>applyLaw(y.law,x))).size;
      return {action,diversity,observations:this.samples[action].length};
    }).sort((a,b)=>b.diversity-a.diversity||a.observations-b.observations)[0];
  }
  plan(start,goal,maxDepth=8){
    if(![start,goal].every(x=>Number.isInteger(x)&&x>=0&&x<MOD))throw Error('Invalid plan states');
    const queue=[{state:start,actions:[]}],seen=new Set([start]);
    for(let k=0;k<queue.length;k++){
      const item=queue[k];if(item.state===goal)return {found:true,actions:item.actions,projected:item.state};
      if(item.actions.length>=maxDepth)continue;
      for(const action of ACTIONS){
        const state=this.predict(item.state,action).value;
        if(seen.has(state))continue;seen.add(state);queue.push({state,actions:[...item.actions,action]});
      }
    }
    return {found:false,actions:[],projected:null};
  }
  summary(){return {samples:Object.fromEntries(ACTIONS.map(a=>[a,this.samples[a].length])),
    best:Object.fromEntries(ACTIONS.map(a=>[a,this.best(a)])),creations:this.creations}}
  snapshot(){return {schema:1,samples:this.samples,creations:this.creations,activeKinds:this.activeKinds}}
  static restore(s){
    if(s?.schema!==1||!s.samples)throw Error('Invalid causal checkpoint');
    const m=new RuleLearner();for(const a of ACTIONS)for(const item of s.samples[a]||[])m.observe({action:a,...item});
    return m;
  }
}
// Each world has new hidden laws. Learn from interventions on six known states;
// test on five HELD-OUT states that are never used for induction.
export function runRuleExperiment(learner,world,{repeats=1}={}){
  if(!Number.isInteger(repeats)||repeats<1||repeats>20)throw Error('Invalid repetitions');
  const pairs=[];
  for(let r=0;r<repeats;r++)for(let x=0;x<6;x++)for(const action of ACTIONS)pairs.push({x,action});
  const rng=new RNG(world.seed^0x51514);
  for(let i=pairs.length-1;i>0;i--){const j=rng.int(i+1);[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
  for(const item of pairs)learner.observe(world.intervene(item.x,item.action));
  return learner.summary();
}
export function evaluateRules({count=24,seed=910037}={}){
  if(!Number.isInteger(count)||count<1||count>300)throw Error('Invalid count');
  let correct=0,baselineCorrect=0,total=0,models=0,alternate=0;
  const kinds={};
  for(let j=0;j<count;j++){
    const world=createRuleWorld(seed+j*1091),learner=new RuleLearner();
    runRuleExperiment(learner,world);
    for(const action of ACTIONS){
      kinds[learner.best(action).law.kind]=(kinds[learner.best(action).law.kind]||0)+1;
      const first=learner.samples[action][0],fixedAdd=mod(first.output-first.input);
      if(learner.best(action).law.kind!=='add')alternate++;
      models++;
      for(let x=6;x<MOD;x++){
        const expected=world.intervene(x,action).output;
        if(learner.predict(x,action).value===expected)correct++;
        if(mod(x+fixedAdd)===expected)baselineCorrect++;
        total++;
      }
    }
  }
  return {count,total,heldOutAccuracy:correct/total,fixedAdditionAccuracy:baselineCorrect/total,
    alternativePerspectives:alternate,models,kinds};
}
