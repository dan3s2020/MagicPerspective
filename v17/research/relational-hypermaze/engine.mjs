// MagicPerspective V23 - observed relational hypermaze research, no token predictor.
// This engine keeps V17's original Discoverer.shape() as the ONLY goal propagator.
// The sentence-to-action templates come from experienced interventions; absent
// grammar or unsupported semantics produce abstention, never a fabricated answer.
import {Discoverer, KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

export const words = text => String(text).match(/[\p{L}\p{M}\p{N}_-]+/gu) || [];
export const stateKey = state => JSON.stringify(state);
export const ROLES = ["S0","S1","S2","S3","A","T0","T1","T2","T3"];
export const isState = s => Array.isArray(s) && s.length === 4 &&
  s.every(v => typeof v === "string" && /^[\p{L}\p{M}\p{N}_-]+$/u.test(v));

export class ObservedGrammar {
  constructor() {this.patterns=new Map();this.actions=new Set();this.experiences=0;}
  // Independent real transition: before/action/after are what actually happened.
  // Held-out test answers must never be supplied here.
  witness({sentence,before,after,action}) {
    if(!isState(before)||!isState(after)||words(action).length!==1)
      throw Error("Expected four-dimensional observed transition");
    const t=words(sentence),values=[...before,action,...after],masked=t.slice();
    const used=new Set();
    for(let role=0;role<values.length;role++){
      const at=t.findIndex((v,i)=>v===values[role]&&!used.has(i));
      if(at<0)throw Error("Witness lacks required state/action slots");
      used.add(at);masked[at]="@"+ROLES[role];
    }
    const key=JSON.stringify(masked);
    const record=this.patterns.get(key)||{pattern:masked,support:0};
    record.support++;this.patterns.set(key,record);this.actions.add(action);
    this.experiences++;return record.support;
  }
  parse(line) {
    const t=words(line),matches=[];
    for(const item of this.patterns.values()){
      if(item.support<2||item.pattern.length!==t.length)continue;
      const found={};let ok=true;
      for(let i=0;i<t.length;i++){
        const p=item.pattern[i];
        if(p.startsWith("@"))found[p.slice(1)]=t[i];
        else if(p!==t[i]){ok=false;break;}
      }
      if(!ok||!this.actions.has(found.A))continue;
      matches.push({before:[found.S0,found.S1,found.S2,found.S3],
        after:[found.T0,found.T1,found.T2,found.T3],action:found.A});
    }
    const distinct=new Map(matches.map(x=>[JSON.stringify(x),x]));
    return distinct.size===1?[...distinct.values()][0]:null;
  }
  snapshot(){return {experiences:this.experiences,templates:this.patterns.size,
    activeTemplates:[...this.patterns.values()].filter(x=>x.support>=2).length,
    actions:[...this.actions]};}
}

export function readWorld(grammar,document,initial,goal,{maxStates=6000}={}) {
  if(!isState(initial)||!isState(goal))throw Error("Four explicit observed axes required");
  const states=[],ids=new Map(),neighbors=[],allEdges=[],conflicts=new Set(),effects=new Map();
  const add=s=>{const k=stateKey(s);let id=ids.get(k);
    if(id===undefined){if(states.length>=maxStates)throw Error("World exceeds safe state limit");
      id=states.length;ids.set(k,id);states.push(s.slice());neighbors.push([]);}
    return id;};
  const start=add(initial),target=add(goal);
  const lines=String(document).split(/\r?\n/);let observed=0;
  for(const sentence of lines){
    const e=grammar.parse(sentence);if(!e)continue;
    observed++;const from=add(e.before),to=add(e.after);
    const effect=stateKey(e.before)+"|"+e.action;
    const existing=effects.get(effect);
    if(existing!==undefined&&existing!==to)conflicts.add(effect);
    else effects.set(effect,to);
    allEdges.push({from,to,action:e.action,effect});
  }
  for(const e of allEdges){
    if(conflicts.has(e.effect))continue;
    if(!neighbors[e.from].some(x=>x.to===e.to&&x.action===e.action))
      neighbors[e.from].push({to:e.to,action:e.action,verified:false,
        transformation:{kind:"experienced-compositional-relation",dimensions:4}});
  }
  return {states,neighbors,start,target,observed,ignored:lines.length-observed,
    textBytes:document.length,lines:lines.length,rejectedConflicts:conflicts.size};
}

export function preactionShape(grammar,document,initial,goal,{seed=17,temperature=0}={}){
  const world=readWorld(grammar,document,initial,goal);
  const kinds=world.states.map((_,i)=>i===world.start?KIND.self:
    i===world.target?KIND.target:KIND.floor);
  // The goal state is stated in the problem, like the known maze exit.
  // The unknown route, actual step effects, and evaluator graph are NEVER inputs.
  const actor=new Discoverer(seed);actor.temp=temperature;
  let values=[];
  const path=actor.shape(kinds,0,world.start,{
    neighbors:world.neighbors,
    conduct:()=>1,
    attract:k=>k===KIND.target?1:0,
    onField:v=>{values=v;}
  })||[];
  const found=world.start===world.target ||
    (path.length>0&&path.at(-1).to===world.target);
  return {found,world,field:values,path,
    route:path.map(e=>({from:world.states[e.from],to:world.states[e.to],action:e.action})),
    predictedBeforeAction:true,method:"Discoverer.shape",temperature,seed};
}

// The rest is an isolated synthetic test-world factory, NOT the learner.
// All generated graph physics stay in the evaluator until the shape is frozen.
export const ACTIONS=["amber","cobalt","jade","violet"];
export const FORMATS=[
  (a,b,op)=>"From "+a[0]+" with phase "+a[1]+" charge "+a[2]+" and epoch "+a[3]+
    ", the "+op+" corridor leads to "+b[0]+" with phase "+b[1]+" charge "+b[2]+" and epoch "+b[3]+".",
  (a,b,op)=>"The "+op+" route transfers "+a[0]+" mode "+a[1]+" energy "+a[2]+" moment "+a[3]+
    " into "+b[0]+" mode "+b[1]+" energy "+b[2]+" moment "+b[3]+".",
  (a,b,op)=>"Archive records passage "+a[0]+" phase "+a[1]+" charge "+a[2]+" time "+a[3]+
    " via "+op+" towards "+b[0]+" phase "+b[1]+" charge "+b[2]+" time "+b[3]+"."
];
export function seededRng(seed) {
  let s=seed|0||1;
  return {next(){s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;},
    int(n){return Math.floor(this.next()*n);}};
}
export function makeGrammar() {
  const grammar=new ObservedGrammar();
  for(let f=0;f<FORMATS.length;f++)for(let i=0;i<5;i++){
    const a=["trainSrc"+f+"_"+i,"sphase"+f+"_"+i,"scharge"+f+"_"+i,"stime"+f+"_"+i];
    const b=["trainDst"+f+"_"+i,"tphase"+f+"_"+i,"tcharge"+f+"_"+i,"ttime"+f+"_"+i];
    const action=ACTIONS[(f+i)%ACTIONS.length];
    grammar.witness({sentence:FORMATS[f](a,b,action),before:a,after:b,action});
  }
  return grammar;
}
export function makeHeldout(seed,{routeLength=6,distractors=95,unseenSurface=false}={}) {
  const r=seededRng(seed);
  const state=i=>["entity"+seed+"_"+i,"phase"+r.int(7),"charge"+r.int(5),"epoch"+r.int(9)];
  const nodes=Array.from({length:routeLength+1+distractors},(_,i)=>state(i));
  const edges=[],effects=new Set();
  const add=(a,b)=>{
    const action=ACTIONS[r.int(ACTIONS.length)],k=stateKey(nodes[a])+"|"+action;
    if(effects.has(k))return false;
    effects.add(k);edges.push({from:nodes[a],to:nodes[b],action});return true;
  };
  for(let i=0;i<routeLength;i++)add(i,i+1);
  for(let i=0;i<distractors;i++){
    const from=r.int(nodes.length-1),to=routeLength+1+r.int(distractors);
    if(to!==from)add(from,to);
  }
  const lines=edges.map(e=>FORMATS[unseenSurface?0:r.int(FORMATS.length)](e.from,e.to,e.action));
  if(unseenSurface)for(let i=0;i<lines.length;i++)
    lines[i]=lines[i].replace(" corridor leads to "," channel sends toward ");
  const filler="A detailed chronicle describes an unrelated landscape with contours artifacts noise and repeated partial observations that do not encode any transition.";
  for(let i=0;i<45;i++)lines.push(filler+" Chapter "+seed+" segment "+i+".");
  for(let i=lines.length-1;i>0;i--){const j=r.int(i+1);[lines[i],lines[j]]=[lines[j],lines[i]];}
  return {document:lines.join("\n"),initial:nodes[0],goal:nodes[routeLength],
    hiddenEdges:edges,oraclePath:nodes.slice(0,routeLength+1),routeLength,seed};
}
export function verifyPhysics(plan,world) {
  const allowed=new Set(world.hiddenEdges.map(e=>
    stateKey(e.from)+"|"+e.action+"|"+stateKey(e.to)));
  let actual=stateKey(world.initial),count=0;
  for(const edge of plan.route){
    if(actual!==stateKey(edge.from)||
       !allowed.has(stateKey(edge.from)+"|"+edge.action+"|"+stateKey(edge.to)))
       return {solved:false,valid:false,steps:count};
    actual=stateKey(edge.to);count++;
  }
  return {solved:plan.found&&actual===stateKey(world.goal),
    valid:true,steps:count};
}
