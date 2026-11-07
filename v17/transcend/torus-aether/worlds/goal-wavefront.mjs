// Native V17 goal-attraction wavefront, directed observed graph extension.
// Called from Discoverer.shape() ONLY. Original 3-argument maze code is unchanged.
// V(goal)=1, V(s)=0.97*conduct(s)*max_observed_edges[P(outcome|s,action)*V(next)].
// This is a highest-likelihood predicted trajectory, not expected-value stochastic control.
const GAMMA=0.97;
const idx=(n,N)=>Number.isInteger(n)&&n>=0&&n<N;
class Heap {
  constructor(){this.h=[];}
  get length(){return this.h.length;}
  add(x){const h=this.h;h.push(x);let i=h.length-1;
    while(i>0){let p=(i-1)>>1;if(h[p].v>=x.v)break;h[i]=h[p];i=p;}h[i]=x;}
  pop(){const h=this.h,top=h[0],last=h.pop();if(h.length){
    let i=0;while(2*i+1<h.length){let j=2*i+1;
      if(j+1<h.length&&h[j+1].v>h[j].v)j++;
      if(h[j].v<=last.v)break;h[i]=h[j];i=j;}h[i]=last;}return top;}
}
export function observedGoalField(space,{temperature=0,random=()=>0.5}={}){
  if(!space||!Array.isArray(space.nodes)||!Array.isArray(space.edges))
    throw Error("Need actual observed nodes and transitions");
  const N=space.nodes.length;
  if(!N||N>50000||space.edges.length>500000)throw Error("Observed graph out of range");
  if(!idx(space.start,N))throw Error("Start is not an observed node");
  const goals=new Set(space.goals||[]);
  if(!goals.size||[...goals].some(g=>!idx(g,N)))throw Error("Visible goal state is required");
  const conduct=space.conduct??null;
  if(conduct&&(!Array.isArray(conduct)||conduct.length!==N||
    conduct.some(c=>typeof c!=="number"||!Number.isFinite(c)||c<0||c>1)))
    throw Error("Conductance must be an empirical probability in [0,1]");
  const outgoing=Array.from({length:N},()=>[]),incoming=Array.from({length:N},()=>[]);
  const totals=new Map();
  for(const e of space.edges){
    if(!idx(e.from,N)||!idx(e.to,N)||typeof e.action!=="string"||!e.action||
       !Number.isSafeInteger(e.count)||e.count<=0)
      throw Error("Only real observed from/action/to/count edges permitted");
    const k=e.from+"\u0000"+e.action;totals.set(k,(totals.get(k)||0)+e.count);
  }
  for(const e of space.edges){
    const probability=e.count/totals.get(e.from+"\u0000"+e.action);
    const provenance=e.provenance||"observed";
    if(!["observed","learned-rule-hypothesis"].includes(provenance))
      throw Error("Unknown provenance: an action cannot appear without source evidence");
    const edge={...e,provenance,probability};outgoing[e.from].push(edge);incoming[e.to].push(edge);
  }
  const V=new Float64Array(N),heap=new Heap();
  for(const g of goals){V[g]=1;heap.add({id:g,v:1});}
  let pops=0;while(heap.length){
    const {id,v}=heap.pop();pops++;if(v+1e-14<V[id])continue;
    for(const e of incoming[id]){
      if(goals.has(e.from))continue;
      const proposal=GAMMA*(conduct?conduct[e.from]:1)*e.probability*v;
      if(proposal>V[e.from]+1e-14){V[e.from]=proposal;heap.add({id:e.from,v:proposal});}
    }
  }
  let residual=0,reachable=0;
  for(let i=0;i<N;i++){
    if(V[i]>0)reachable++;
    if(goals.has(i))continue;
    let best=0;for(const e of outgoing[i])
      best=Math.max(best,GAMMA*(conduct?conduct[i]:1)*e.probability*V[e.to]);
    residual=Math.max(residual,Math.abs(V[i]-best));
  }
  const path=[],nodes=[space.start],seen=new Set(nodes);
  let here=space.start,likelihood=1;
  const T=Number.isFinite(temperature)?Math.max(0,temperature):0;
  const maxSteps=Math.min(10000,Math.max(1,Math.trunc(space.maxSteps||160)));
  for(let k=0;k<maxSteps&&!goals.has(here);k++){
    const choices=outgoing[here].filter(e=>V[e.to]>V[here]+1e-14&&!seen.has(e.to))
      .map(e=>({...e,score:GAMMA*(conduct?conduct[here]:1)*e.probability*V[e.to]}))
      .sort((a,b)=>b.score-a.score||b.count-a.count||a.action.localeCompare(b.action)||a.to-b.to);
    if(!choices.length)break;
    let best=choices[0];
    if(T>0&&choices.length>1){
      const weights=choices.map(e=>Math.exp((e.score-best.score)/(T*.03*Math.max(best.score,1e-12))));
      let draw=Math.max(0,Math.min(.9999999999,random()))*weights.reduce((a,b)=>a+b,0);
      for(let i=0;i<weights.length;i++){draw-=weights[i];if(draw<=0){best=choices[i];break;}}
    }
    likelihood*=best.probability;
    path.push({from:here,to:best.to,action:best.action,observedCount:best.count,
      provenance:best.provenance,
      empiricalOutcomeProbability:best.probability,potentialBefore:V[here],
      potentialAfter:V[best.to],edgeScore:best.score});
    here=best.to;nodes.push(here);seen.add(here);
  }
  const found=goals.has(here);
  return {found,reason:found?"OBSERVED_GOAL_REACHED":V[space.start]===0?"NO_OBSERVED_ROUTE":"PATH_LIMIT_OR_CYCLE",
    frozen:true,originalDiscovererDirectlyUsed:true,start:space.start,goals:[...goals],
    nodes,path,firstAction:path[0]?.action??null,plannedBeforeFirstAction:true,
    predictedOutcomeProbability:likelihood,
    math:{maxBellmanResidual:residual,reachableStates:reachable,queuePops:pops,
      strictlyUphill:path.every(e=>e.potentialAfter>e.potentialBefore),
      noUnobservedEdges:path.every(e=>e.provenance==="observed"),
      inferredHypothesisSteps:path.filter(e=>e.provenance==="learned-rule-hypothesis").length,
      law:"V(goal)=1;V(s)=0.97*conduct(s)*max P(next|s,action)*V(next)",
      scope:"observed graph goal navigation; NOT unconstrained semantic text answers",
      fullCUDAVerified:false}};
}
export async function executeObservedGoal({discoverer,space,act,observe=()=>{},limit=160}){
  if(typeof discoverer?.shape!=="function"||typeof act!=="function")
    throw Error("Require original Discoverer and real action/physics callback");
  const original=discoverer.shape(null,0,-1,{...space,maxSteps:limit});
  const trace=[],goal=new Set(space.goals);
  let state=space.start,reason=original.reason;
  for(let i=0;i<limit&&!goal.has(state);i++){
    const plan=discoverer.shape(null,0,-1,{...space,start:state,maxSteps:limit-i});
    const step=plan.path[0];if(!step){reason=plan.reason;break;}
    const actual=await act({state,action:step.action,predicted:step.to,step:i});
    if(!idx(actual,space.nodes.length))throw Error("Actual state must be observed before replanning");
    const event={step:i,before:state,action:step.action,predicted:step.to,actual,
      matched:step.to===actual,shapeBeforeAction:plan.nodes};
    trace.push(event);await observe(event);state=actual;
  }
  return {original,trace,finalState:state,reached:goal.has(state),
    reason:goal.has(state)?"ACTUAL_GOAL_REACHED":reason,noAnswerOracle:true};
}
