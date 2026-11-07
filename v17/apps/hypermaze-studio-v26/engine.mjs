// MagicPerspective V26: native V17 solution shape over a SPARSE learned text
// action graph. The original Discoverer.shape is the only field/path planner.
// This module is independent of the previous UI and V25 research adapter.
// Honest task scope: observed one-token interventions, not semantic Q/A.
import {Discoverer,KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const validTokens=t=>Array.isArray(t)&&t.length>0&&t.length<=32768&&
  t.every(x=>typeof x==="string"&&x.length<=1024);
const key=x=>JSON.stringify(x);
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number(n)||lo));
export function seeded(seed=1){
  let s=(Number(seed)>>>0)||1;
  return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
}
export class ObservedEffects {
  constructor({maxRules=12}={}){
    this.maxRules=clamp(maxRules,1,12);
    this.rules=new Map();this.blocked=new Set();
    this.observations=0;this.conflicts=0;this.rejections=0;
  }
  observe({before,action,after,accepted}={}){
    if(!validTokens(before)||!validTokens(after)||before.length!==after.length||
      typeof action!=="string"||!action||typeof accepted!=="boolean")
      throw Error("Real equal-length before/action/after and accepted boolean required");
    const s=key([before,action]);
    if(!accepted){this.blocked.add(s);this.rejections++;return {learned:false,wall:true};}
    let changed=-1;
    for(let i=0;i<before.length;i++)if(before[i]!==after[i]){
      if(changed!==-1)return {learned:false,reason:"multiple-token transformation is not evidenced"};
      changed=i;
    }
    if(changed<0)return {learned:false,reason:"no physical change"};
    const from=before[changed],to=after[changed];
    let r=this.rules.get(action);
    if(!r){
      if(this.rules.size>=this.maxRules)return {learned:false,reason:"rule capacity"};
      r={action,from,to,count:0,observedPositions:[],ambiguous:false};
      this.rules.set(action,r);
    }else if(r.from!==from||r.to!==to){
      r.ambiguous=true;this.conflicts++;return {learned:false,reason:"contradictory action effect"};
    }
    r.count++;this.observations++;
    if(!r.observedPositions.includes(changed)&&r.observedPositions.length<32)
      r.observedPositions.push(changed);
    this.blocked.delete(s);
    return {learned:true,action,at:changed,from,to,evidence:r.count};
  }
  export(){return {version:1,maxRules:this.maxRules,rules:[...this.rules],
    blocked:[...this.blocked],observations:this.observations,
    conflicts:this.conflicts,rejections:this.rejections};}
  static restore(data){
    if(data?.version!==1||!Array.isArray(data.rules))throw Error("Unknown V26 effects checkpoint");
    const x=new ObservedEffects({maxRules:data.maxRules});
    x.rules=new Map(data.rules);x.blocked=new Set(data.blocked||[]);
    x.observations=data.observations||0;x.conflicts=data.conflicts||0;
    x.rejections=data.rejections||0;return x;
  }
}
function materialize(start,axes,mask){
  const out=start.slice();
  for(let i=0;i<axes.length;i++)if(mask&(1<<i))out[axes[i].at]=axes[i].to;
  return out;
}
export function planShape(learner,start,goal,{seed=1,noise=0,maxAxes=10,
  includeGraph=true}={}){
  if(!validTokens(start))throw Error("Expected 1..32768 text tokens");
  if(!learner?.rules||!Array.isArray(goal?.requires)||!goal.requires.length||
    goal.requires.some(x=>typeof x!=="string"||!x))
    throw Error("Explicit finite goal words and a learned effects model required");
  const unique=new Map(),duplicates=new Set();
  for(let i=0;i<start.length;i++){
    if(unique.has(start[i]))duplicates.add(start[i]);else unique.set(start[i],i);
  }
  const axes=[],used=new Set(),targetWords=new Set();
  for(const r of learner.rules.values()){
    if(axes.length>=clamp(maxAxes,1,10))break;
    const at=unique.get(r.from);
    if(r.ambiguous||at===undefined||duplicates.has(r.from)||used.has(at)||
      targetWords.has(r.to)||learner.blocked.has(key([start,r.action])))continue;
    // The active action is genuinely based on prior observed action physics.
    axes.push({...r,at});used.add(at);targetWords.add(r.to);
  }
  const already=new Set(start);
  const required=goal.requires.filter(t=>!already.has(t));
  const targetBits=[];
  for(const word of required){
    const axis=axes.findIndex(a=>a.to===word);
    if(axis<0)return {found:false,reason:"UNKNOWN_GOAL_AXIS_OR_AMBIGUOUS_SOURCE",
      graph:{nodes:[],edges:[],axes:[]},path:[],learnedAxes:axes.length,
      completeBeforeAction:true};
    targetBits.push(axis);
  }
  const k=axes.length;
  if(!k)return {found:false,reason:"NO_LEARNED_TRAVERSABLE_TRANSFORMATIONS",
    graph:{nodes:[],edges:[],axes:[]},path:[],completeBeforeAction:true};
  const count=1<<k;
  const goalMask=targetBits.reduce((m,i)=>m|(1<<i),0);
  const kinds=Array(count),neighbors=Array.from({length:count},()=>[]);
  const goals=[];
  for(let mask=0;mask<count;mask++){
    const atGoal=(mask&goalMask)===goalMask;
    kinds[mask]=mask===0?KIND.self:atGoal?KIND.target:KIND.floor;
    if(atGoal)goals.push(mask);
    for(let i=0;i<k;i++)if(!(mask&(1<<i))){
      const r=axes[i];
      neighbors[mask].push({to:mask|(1<<i),action:r.action,
        transformation:{axis:i,from:r.from,to:r.to,position:r.at},
        verified:true});
    }
  }
  if(goalMask===0)return {found:true,reason:"ALREADY_AT_GOAL",path:[],
    initial:0,terminal:0,final:start.slice(),goalMask,completeBeforeAction:true,
    graph:includeGraph?makeGraph(k,axes,neighbors,[],[0],null,goals):null,
    learnedAxes:k,nativeMethod:"Discoverer.shape"};
  let field=[];
  const actor=new Discoverer(seed);
  actor.temp=clamp(noise,0,1);
  // This is the EXACT original V17 route planner, including its .97 field,
  // no graph BFS shortcut or separate neural/text response generator.
  const route=actor.shape(kinds,0,0,{neighbors,
    conduct:kind=>kind===KIND.wall?0:1,
    attract:kind=>kind===KIND.target?1:0,
    onField:values=>{field=values}
  })||[];
  const terminal=route.length?route.at(-1).to:0;
  const found=route.length>0&&(terminal&goalMask)===goalMask;
  const predicted=found?materialize(start,axes,terminal):null;
  const masks=[0,...route.map(h=>h.to)];
  return {found,reason:found?"NATIVE_PREACTION_SHAPE":"NO_UPHILL_ROUTE",
    path:route,initial:0,terminal,final:predicted,goalMask,
    completeBeforeAction:true,nativeMethod:"Discoverer.shape",
    learnedAxes:k,worldNodes:count,worldEdges:neighbors.reduce((s,r)=>s+r.length,0),
    fieldAtStart:field[0]||0, field,
    graph:includeGraph?makeGraph(k,axes,neighbors,field,masks,terminal,goals):null};
}
function makeGraph(k,axes,neighbors,field,masks,terminal,goals){
  const chosen=new Set(masks),target=new Set(goals);
  const nodes=Array.from({length:1<<k},(_,id)=>({id,mask:id,
    field:field?.[id]||0,goal:target.has(id),onPlan:chosen.has(id),
    start:id===0,terminal:id===terminal}));
  const edges=[];
  for(let i=0;i<neighbors.length;i++)for(const e of neighbors[i])
    edges.push({from:i,to:e.to,axis:e.transformation.axis,action:e.action,
      onPlan:masks.some((p,j)=>j>0&&masks[j-1]===i&&p===e.to)});
  return {axes:axes.map((a,i)=>({index:i,action:a.action,from:a.from,
      to:a.to,at:a.at,evidence:a.count})),
    nodes,edges,path:masks,dimension:k,realTopology:true,fieldAlgorithm:"Discoverer.shape"};
}
export function executeShape(plan,start,worldStep,{learner=null,learn=false}={}){
  if(!plan?.found||!validTokens(start)||typeof worldStep!=="function")
    throw Error("Plan, original text and independent world physics required");
  let state=start.slice();const trace=[];
  for(const hop of plan.path){
    const predicted=state.slice(),p=hop.transformation;
    if(!p||predicted[p.position]!==p.from)throw Error("Learned path inconsistent with state");
    predicted[p.position]=p.to;
    const actual=worldStep(state.slice(),hop.action);
    if(!actual||typeof actual.accepted!=="boolean"||!validTokens(actual.after))
      throw Error("Independent world action did not report physical outcome");
    const accurate=actual.accepted&&same(predicted,actual.after);
    trace.push({index:trace.length,action:hop.action,axis:p.axis,
      from:p.from,to:p.to,position:p.position,predicted:predicted[p.position],
      observed:actual.after[p.position],accurate,accepted:actual.accepted,
      beforeState:hop.from,afterState:hop.to});
    if(learn&&learner)learner.observe({before:state,action:hop.action,
      after:actual.after,accepted:actual.accepted});
    state=actual.after.slice();
    if(!accurate)break;
  }
  return {solved:trace.length===plan.path.length&&trace.every(x=>x.accurate),
    actual:state,trace,exactFullShape:trace.length===plan.path.length&&
      trace.every(x=>x.accurate)&&same(state,plan.final)};
}
