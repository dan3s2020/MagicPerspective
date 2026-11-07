// MagicPerspective: isolated experimental causal AXIS discovery from observed transitions.
// The original V17 brain, user interface, live training and model checkpoint are untouched.
// Learner never reads the hidden world's transformations or future random draws.
export const ACTIONS=["a","b","c","d","e","f"];
const CORE=6,ID=[0,1,2,3,4,5];
export function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export const permute=(values,order)=>order.map(i=>values[i]);
export const k=a=>a.join(",");
export function uniquePermutations(values=ID){
 if(!values.length)return [[]];
 const out=[];for(let i=0;i<values.length;i++)
  for(const tail of uniquePermutations(values.filter((_,j)=>j!==i)))out.push([values[i],...tail]);
 return out;
}
export function shuffle(a,r){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
// Identify stable sources of each output using action-conditional equality evidence.
// 2048D acceleration: hashes of independent 4-transition signatures nominate
// candidate source axes, then ALL 230 observations validate each candidate.
// No ground-truth axis index, action permutation, or noise rule enters the learner.
function bestChannelMapping(rows,D){
 const n=rows.length,best=[],fast=D>128,groups=10,width=4,buckets=[];
 const signature=(field,pos,g)=>{
  let a=0;for(let t=0;t<width;t++)a=a*CORE+rows[g*width+t][field][pos];return a;
 };
 if(fast)for(let g=0;g<groups;g++){
  const map=new Map();for(let i=0;i<D;i++){const v=signature("before",i,g),list=map.get(v)||[];list.push(i);map.set(v,list);}buckets.push(map);
 }
 for(let j=0;j<D;j++){
  let candidates;
  if(fast){
   const found=new Set();for(let g=0;g<groups;g++)for(const i of buckets[g].get(signature("after",j,g))||[])found.add(i);
   candidates=found.size?[...found]:Array.from({length:D},(_,i)=>i);
  }else candidates=Array.from({length:D},(_,i)=>i);
  let top=-1,runner=-1,source=-1;
  for(const i of candidates){
   let matched=0;for(const row of rows)matched+=+(row.before[i]===row.after[j]);
   if(matched>top){runner=top;top=matched;source=i;}
   else if(matched>runner)runner=matched;
  }
  best.push({index:source,confidence:top/n,second:runner/n});
 }
 return best;
}
export class LearnedAxisNavigator{
 constructor({D=64,minimumReliability=.55}={}){
  this.D=D;this.minimumReliability=minimumReliability;
  this.axes=[];this.transforms=new Map();this.noise=new Map();this.trainingCount=0;
 }
 learn(events){
  const D=this.D;
  if(!events.length||events.some(e=>e.before.length!==D||e.after.length!==D||!ACTIONS.includes(e.action)))
   throw Error("Invalid real-world transition observations");
  this.trainingCount=events.length;
  const evidence=new Map();
  for(const action of ACTIONS){
   const rows=events.filter(e=>e.action===action);
   if(rows.length<40)throw Error("Not enough observations per action");
   evidence.set(action,bestChannelMapping(rows,D));
  }
  const quality=Array.from({length:D},(_,j)=>Math.min(...ACTIONS.map(a=>evidence.get(a)[j].confidence)));
  this.axes=quality.map((v,i)=>v>=this.minimumReliability?i:-1).filter(i=>i>=0);
  if(!this.axes.length)throw Error("No reliable axes discovered");
  this.alphabet=[...new Set(this.read(events[0].before))].sort((a,b)=>a-b);
  if(this.alphabet.length!==this.axes.length)throw Error("Stable axes do not carry unique symbolic values");
  for(const action of ACTIONS){
   const order=this.axes.map(j=>this.axes.indexOf(evidence.get(action)[j].index));
   if(order.includes(-1)||new Set(order).size!==this.axes.length)throw Error("Action transform is not a stable permutation");
   this.transforms.set(action,order);
  }
  for(const action of ACTIONS){
   const counts=new Map();
   for(const e of events.filter(e=>e.action===action)){
    const predicted=permute(this.read(e.before),this.transforms.get(action)),actual=this.read(e.after);
    const residual=actual.map(x=>predicted.indexOf(x));
    if(residual.includes(-1)||new Set(residual).size!==this.axes.length)throw Error("Unexpected non-permutation chance outcome");
    const key=k(residual);counts.set(key,(counts.get(key)||0)+1);
   }
   const total=[...counts.values()].reduce((s,x)=>s+x,0);
   this.noise.set(action,[...counts].map(([key,count])=>({order:key.split(",").map(Number),p:count/total,count})).sort((a,b)=>b.count-a.count));
  }
  return this;
 }
 read(state){return this.axes.map(i=>state[i]);}
 move(core,action){const rule=this.transforms.get(action);if(!rule)throw Error("Unlearned action");return permute(core,rule);}
 alternatives(core,action){const next=this.move(core,action);return this.noise.get(action).map(o=>({...o,next:permute(next,o.order)}));}
 // Predict a complete solution-shape BEFORE the first move, using only observed operators.
 route(start,goal,{limit=1440}={}){
  if(k(start)===k(goal))return [];
  const queue=[{state:start,route:[]}],seen=new Set([k(start)]);
  for(let i=0;i<queue.length&&i<limit;i++){
   const cur=queue[i];
   for(const action of ACTIONS){
    const next=this.move(cur.state,action),id=k(next);
    if(seen.has(id))continue;
    const steps=cur.route.concat([{action,from:cur.state.slice(),predicted:next.slice()}]);
    if(id===k(goal))return steps;
    seen.add(id);queue.push({state:next,route:steps});
   }
  }
  return null;
 }
 // A measured decision trace. Executor is called AFTER choosing the action.
 // Future random outcomes and the hidden teacher never enter the path planner.
 observeExecution(execute,start,goal,{limit=14,chanceAware=false}={}){
  const target=this.read(goal),initialState=this.read(start),initialShape=this.route(initialState,target);
  const distances=this.distances(target),history=[];let state=start.slice();
  for(let step=0;step<limit;step++){
   const before=this.read(state);
   if(k(before)===k(target))break;
   const action=this.decide(before,target,{chanceAware,distanceMap:distances});
   if(!action)break;
   const predicted=this.move(before,action);
   const possible=this.alternatives(before,action).map(o=>({next:o.next.slice(),p:o.p}));
   // World outcome is observed only after committing to this action.
   const nextWorld=execute(state,action),observed=this.read(nextWorld);
   const probability=possible.find(o=>k(o.next)===k(observed))?.p||0;
   const afterShape=this.route(observed,target);
   history.push({step,before:before.slice(),action,predicted:predicted.slice(),
    observed:observed.slice(),surprise:k(predicted)!==k(observed),
    probabilityOfObserved:probability,possibleWorlds:possible,
    repairedShape:afterShape?.map(x=>x.action)||null});
   state=nextWorld;
  }
  const solved=k(this.read(state))===k(target);
  return {axes:this.axes.slice(),start:initialState,target:target.slice(),
   initialShape:initialShape?.map(x=>x.action)||null,
   solved,steps:history.length,surprises:history.filter(x=>x.surprise).length,
   history};
 }
 // Derive all distances from learned transformations, never from the hidden-world oracle.
 distances(goal){
  const states=uniquePermutations(this.alphabet),ids=new Map(states.map((s,i)=>[k(s),i]));
  const back=Array.from({length:states.length},()=>[]);
  for(let i=0;i<states.length;i++)for(const action of ACTIONS){
   const j=ids.get(k(this.move(states[i],action)));back[j].push(i);
  }
  const distance=new Int16Array(states.length).fill(-1),target=ids.get(k(goal)),q=[target];distance[target]=0;
  for(let p=0;p<q.length;p++)for(const prev of back[q[p]])if(distance[prev]<0){distance[prev]=distance[q[p]]+1;q.push(prev);}
  return {index:ids,dist:distance};
 }
 decide(core,goal,{chanceAware=false,distanceMap=null}={}){
  if(k(core)===k(goal))return null;
  const {index,dist}=distanceMap||this.distances(goal);
  if(!chanceAware){
   let action=null,best=Infinity;
   for(const a of ACTIONS){const d=dist[index.get(k(this.move(core,a)))];if(d>=0&&d<best){best=d;action=a;}}
   return action;
  }
  let best=Infinity,choice=null;
  for(const a of ACTIONS){
   const expected=this.alternatives(core,a).reduce((s,o)=>s+o.p*Math.max(0,dist[index.get(k(o.next))]),0);
   if(expected<best){best=expected;choice=a;}
  }
  return choice;
 }
}
