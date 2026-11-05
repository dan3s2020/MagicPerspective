// A second, harder control: utterances alter a world of linked propositions.
// The world keeps a hidden randomized mapping from utterance to causal intervention.
// The learner induces Boolean transition dependencies from observed changes, with no goal paths.
import {rng,trajectoryGraph,same} from './engine.mjs';
export const FACT_NAMES=['lantern lit','gate open','bridge safe','message sent','signal active','route marked'];
export const FACT_UTTERANCES=['say:ilan','say:oram','say:syra','say:belu','say:efra','say:noki','say:ulas'];
function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
const hkey=x=>x.join('');
const bitCount=x=>x.reduce((a,b)=>a+b,0);
const bitsOf=i=>Array.from({length:6},(_,b)=>(i>>b)&1);
function change(s,kind){const v=s.slice();switch(kind){
 case 0:v[0]^=1;break;
 case 1:if(v[0])v[1]^=1;break;
 case 2:if(v[1])v[2]^=1;break;
 case 3:if(v[2])v[3]^=1;break;
 case 4:if(v[3])v[4]^=1;break;
 case 5:if(v[4])v[5]^=1;break;
 case 6:if(v[5])v[0]^=1;break;
 default:throw Error('unknown physical operation');
 }return v;}
export const phrase=s=>s.map((v,i)=>v?FACT_NAMES[i]:'not '+FACT_NAMES[i]);
export class FactWorld{
 #physics;
 constructor(seed=11){this.#physics=shuffle([0,1,2,3,4,5,6],rng(seed));this.state=bitsOf(0);this.goal=bitsOf(0);this.steps=0;}
 reset(start,goal){if(start.length!==6||goal.length!==6||[...start,...goal].some(x=>x!==0&&x!==1))throw Error('Bad fact state');
   this.state=start.slice();this.goal=goal.slice();this.steps=0;return this.observe();}
 observe(){return {facts:phrase(this.state),goal:phrase(this.goal),values:this.state.slice(),solved:same(this.state,this.goal),utterances:[...FACT_UTTERANCES],steps:this.steps};}
 step(utterance){const i=FACT_UTTERANCES.indexOf(utterance);if(i<0)throw Error('unknown speech action');const before=this.state.slice();
   this.state=change(before,this.#physics[i]);this.steps++;return {utterance,before,after:this.state.slice(),solved:same(this.state,this.goal)};}
 makeChallenge(seed,hops=10){const r=rng(seed);let start=bitsOf((Math.floor(r()*32)*2)%64);
   // Force held-out odd parity states, never probed during training.
   const odd=Array.from({length:64},(_,i)=>bitsOf(i)).filter(v=>bitCount(v)%2===1);
   start=odd[Math.floor(r()*odd.length)];let goal=start.slice();for(let j=0;j<hops;j++)goal=change(goal,this.#physics[Math.floor(r()*7)]);
   if(same(start,goal))goal=change(goal,this.#physics[0]);return {start,goal};}
}
// Generic deterministic Boolean function induction: choose the smallest input feature
// subset (at most three bits) that explains the observed change of each output bit.
const subsets=[[]];for(let i=0;i<6;i++)subsets.push([i]);
for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)subsets.push([i,j]);
for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)for(let k=j+1;k<6;k++)subsets.push([i,j,k]);
const sig=(s,sub)=>sub.map(i=>s[i]).join('');
export class FactEffects{
 constructor(){this.samples=Object.fromEntries(FACT_UTTERANCES.map(u=>[u,[]]));this.cache=new Map();}
 observe(e){if(!FACT_UTTERANCES.includes(e.utterance))throw Error('unknown utterance');this.samples[e.utterance].push({before:e.before.slice(),after:e.after.slice()});this.cache.delete(e.utterance);}
 fit(utterance){if(this.cache.has(utterance))return this.cache.get(utterance);const samples=this.samples[utterance],rules=[];
  if(!samples.length)return null;
  for(let bit=0;bit<6;bit++){
   let best=null;
   for(const sub of subsets){const vals=new Map(),n=1<<sub.length;let valid=true;
    for(const s of samples){const k=sig(s.before,sub),diff=s.before[bit]^s.after[bit];
      if(vals.has(k)&&vals.get(k)!==diff){valid=false;break;}vals.set(k,diff);}
    if(!valid)continue;
    // Avoid inferring a conditional rule when too many input cases were unseen.
    if(vals.size<n)continue;
    best={features:sub,table:Object.fromEntries(vals)};break;
   }
   if(!best)return null;rules.push(best);
  }
  const out={utterance,seen:samples.length,rules};this.cache.set(utterance,out);return out;
 }
 ready(){return FACT_UTTERANCES.every(u=>this.fit(u));}
 predict(s,utterance){const model=this.fit(utterance);if(!model)return null;const n=s.slice();
   model.rules.forEach((r,i)=>{n[i]^=r.table[sig(s,r.features)]||0;});return n;}
 report(){return FACT_UTTERANCES.map(u=>{const f=this.fit(u);if(!f)return {utterance:u,rule:'UNKNOWN',seen:this.samples[u].length};
   const changed=f.rules.map((r,i)=>({i,r})).filter(x=>Object.values(x.r.table).some(Boolean));
   return {utterance:u,seen:f.seen,rule:changed.map(({i,r})=>{const criteria=r.features.map(j=>FACT_NAMES[j]).join(' / ')||'always';return FACT_NAMES[i]+' toggles: '+criteria;}).join('; ')||'no effect'};});}
 export(){return structuredClone(this.samples);}
 static restore(o){const m=new FactEffects();for(const u of FACT_UTTERANCES)for(const x of o[u]||[])m.observe({utterance:u,...x});return m;}
}
export function exploreFacts(world,model){const samples=[];
  // Only *even parity* initial configurations in training; odd-parity combinations are withheld.
  for(let i=0;i<64;i++){const state=bitsOf(i);if(bitCount(state)%2!==0)continue;
   for(const utterance of FACT_UTTERANCES){world.reset(state,state);const result=world.step(utterance);model.observe(result);
    samples.push({before:state,utterance,after:result.after});}
  }
 return samples;
}
export function factField(model,goal){if(!model.ready())return null;
 const states=Array.from({length:64},(_,i)=>bitsOf(i));const backwards=new Map(states.map(s=>[hkey(s),[]]));
 for(const s of states)for(const u of FACT_UTTERANCES){const next=model.predict(s,u),k=hkey(next);backwards.get(k).push({state:s,action:u});}
 const queue=[goal],dist=new Map([[hkey(goal),0]]),hist=[1];
 for(let i=0;i<queue.length;i++){
  const state=queue[i],d=dist.get(hkey(state));for(const e of backwards.get(hkey(state))){const k=hkey(e.state);if(dist.has(k))continue;
   dist.set(k,d+1);queue.push(e.state);hist[d+1]=(hist[d+1]||0)+1;}
 }
 return {dist,hist,states:queue.length};
}
export function planFacts(start,goal,model){const f=factField(model,goal);if(!f)return {found:false,reason:'Effects unavailable',steps:[],branches:[]};
 let s=start.slice(),d=f.dist.get(hkey(s)),steps=[],branches=[];
 if(d===undefined)return {found:false,reason:'Unreachable goal under learned rules',steps,branches,fieldSize:f.states};
 while(d>0&&steps.length<64){const choices=FACT_UTTERANCES.map(utterance=>{
   const values=model.predict(s,utterance);return {utterance,after:phrase(values),values,distance:f.dist.get(hkey(values))??null,confidence:1};});
  const best=choices.find(c=>c.distance===d-1);if(!best)break;
  branches.push({state:phrase(s),distance:d,options:choices.map(({utterance,after,distance,confidence})=>({utterance,after,distance,confidence}))});
  steps.push({from:phrase(s),utterance:best.utterance,predicted:phrase(best.values),beforeBits:s.slice(),afterBits:best.values.slice(),distanceBefore:d,distanceAfter:d-1,confidence:1});
  s=best.values;d--;
 }
 return {found:same(s,goal),steps,branches,distance:steps.length,expanded:f.states,fieldSize:f.states,hist:f.hist,
  complete:true,goal:phrase(goal),start:phrase(start),latentInfo:'The full 6-bit relational state graph with measured transitions; fixed 12D sketch for display'};
}
export function executeFacts(world,start,goal,p){world.reset(start,goal);const observations=[];
 for(const step of p.steps){const result=world.step(step.utterance);const ok=same(result.after,step.afterBits);
   observations.push({...step,actual:phrase(result.after),predictionCorrect:ok});if(!ok)break;}
 return {solved:world.observe().solved,observations,final:phrase(world.observe().values),steps:observations.length,
  modelMatches:observations.every(x=>x.predictionCorrect)};
}
export function oracleFacts(world,start,goal){const q=[start.slice()],seen=new Map([[hkey(start),0]]);
 for(let i=0;i<q.length;i++){const s=q[i],d=seen.get(hkey(s));if(same(s,goal))return d;
  for(const u of FACT_UTTERANCES){world.reset(s,goal);const v=world.step(u).after,k=hkey(v);
   if(!seen.has(k)){seen.set(k,d+1);q.push(v);}
  }
 }return null;
}
export function randomFacts(world,start,goal,seed,budget=24){world.reset(start,goal);const r=rng(seed);for(let i=0;i<budget&&!world.observe().solved;i++)world.step(FACT_UTTERANCES[Math.floor(r()*7)]);return world.observe().solved;}
export function greedyFacts(world,start,goal,model,seed,budget=24){world.reset(start,goal);const r=rng(seed),visits=new Map();
 for(let i=0;i<budget&&!world.observe().solved;i++){
   const s=world.observe().values,opts=FACT_UTTERANCES.map(u=>{const v=model.predict(s,u),k=hkey(v);return {u,v,cost:v.filter((x,i)=>x!==goal[i]).length+.75*(visits.get(k)||0)+.01*r()};});
   opts.sort((a,b)=>a.cost-b.cost);const {u,v}=opts[0];world.step(u);const k=hkey(v);visits.set(k,(visits.get(k)||0)+1);
 }
 return world.observe().solved;
}
export function benchmarkFacts({seeds=[11,29,53],tasks=35,hops=12}={}){
 const rows=[],examples=[],models=[];let best=null;
 for(const seed of seeds){const world=new FactWorld(seed),model=new FactEffects(),training=exploreFacts(world,model);
   if(!model.ready())throw Error('Failed to identify causal rules');models.push({seed,training:training.length,rules:model.report()});
   for(let i=0;i<tasks;i++){
    const {start,goal}=world.makeChallenge((seed*8003+i*1091)>>>0,hops),p=planFacts(start,goal,model),ex=executeFacts(world,start,goal,p);
    const oracle=oracleFacts(world,start,goal),random=randomFacts(world,start,goal,seed*500+i),greedy=greedyFacts(world,start,goal,model,seed*500+i);
    const row={seed,index:i,planned:p.found,solved:ex.solved,optimal:oracle,steps:ex.steps,random,greedy,modelMatches:ex.modelMatches,
      unseenInitial:bitCount(start)%2===1,fieldSize:p.fieldSize};rows.push(row);
    if(examples.length<5||!best||p.steps.length>best.plan.steps.length){const example={kind:'relational',seed,index:i,start:phrase(start),goal:phrase(goal),
      plan:p,execution:ex,graph:trajectoryGraph(p),optimal:oracle};if(examples.length<5)examples.push(example);if(!best||p.steps.length>best.plan.steps.length)best=example;}
   }
 }
 if(best&&!examples.some(e=>e.seed===best.seed&&e.index===best.index))examples.push(best);
 const avg=prop=>rows.reduce((s,r)=>s+Number(r[prop]),0)/rows.length;
 return {summary:{trainedInteractions:models.reduce((s,m)=>s+m.training,0),tested:rows.length,plannerSuccess:avg('solved'),
    greedySuccess:avg('greedy'),randomSuccess:avg('random'),optimalMatches:rows.filter(r=>r.steps===r.optimal&&r.solved).length,
    predictionConsistency:avg('modelMatches'),failures:rows.filter(r=>!r.solved).length},models,examples,rows};
}
