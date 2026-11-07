// Math action-model induction from real observed before/action/after triples.
// The hypothesis LANGUAGE below is a declared inductive bias. The action
// effects are SELECTED by evidence, not read from the mathematics oracle.
// This is isolated research, not a replacement for any V17 brain component.
import {rational, equalRational} from "./math.mjs";
import {KIND, Discoverer} from "./exercise.mjs";
import {ACTIONS} from "./labyrinth.mjs";

const eq = (a,b) => equalRational(a,b);
const add = (a,b) => rational(a.n*b.d + b.n*a.d,a.d*b.d);
const sub = (a,b) => rational(a.n*b.d - b.n*a.d,a.d*b.d);
const mul = (a,b) => rational(a.n*b.n,a.d*b.d);
const div = (a,b) => b.n === 0 ? null : rational(a.n*b.d,a.d*b.n);
const op = {"+":add,"-":sub,"*":mul,"/":div};
const atoms = [
  {text:"0",cost:1,fn:()=>rational(0)},
  {text:"1",cost:1,fn:()=>rational(1)},
  {text:"a",cost:1,fn:s=>rational(s.a)},
  {text:"b",cost:1,fn:s=>rational(s.b)},
  {text:"c",cost:1,fn:s=>s.c}
];
function combine(l,sign,r) {
  return {text:"("+l.text+sign+r.text+")",cost:l.cost+r.cost+1,
    fn:s=>{ try {const a=l.fn(s),b=r.fn(s);return a && b ? op[sign](a,b) : null;}catch{return null;} }};
}
function hypotheses() {
  const one=[];
  for (const x of atoms) for (const y of atoms)
    for (const operation of ["+","-","*","/"]) one.push(combine(x,operation,y));
  const two=[];
  for (const x of one) for (const y of atoms) for (const operation of ["+","-","*","/"]) {
    two.push(combine(x,operation,y),combine(y,operation,x));
  }
  return [...atoms,...one,...two].sort((a,b)=>a.cost-b.cost||a.text.localeCompare(b.text));
}
const CANDIDATES = hypotheses();
const keyOf=(stage,action)=>stage+"|"+action;
const rtext=r=>r ? r.n+"/"+r.d : "undefined";

export class ObservedMathRules {
  constructor() { this.observed=new Map();this.rules=new Map();this.total=0;this.training=false; }
  observe(before,action,after) {
    if(this.training) throw new Error("Frozen model: no heldout observations");
    if(!before||!after||typeof action!=="string"||!after.stage||!before.stage)
      throw new TypeError("Only actual observed before/action/after records");
    const k=keyOf(before.stage,action);
    if(!this.observed.has(k))this.observed.set(k,[]);
    this.observed.get(k).push({before:structuredClone(before),after:structuredClone(after)});
    this.total++;
  }
  fit({minimum=12}={}) {
    if(this.training)throw new Error("Already frozen");
    for(const [key,records] of this.observed) {
      if(records.length<minimum)continue;
      const targets=["a","b","c"].map(field=> {
        const candidates=CANDIDATES.filter(candidate=>records.every(row=>{
          const value=candidate.fn(row.before);
          const expected=field==="c"?row.after.c:rational(row.after[field]);
          return value && eq(value,expected);
        }));
        return candidates[0]||null;
      });
      if(targets.some(x=>!x))continue;
      const stage=records[0].after.stage;
      if(records.some(x=>x.after.stage!==stage))continue;
      this.rules.set(key,{stage,expressions:targets});
    }
    this.training=true;return this;
  }
  predict(before,action) {
    if(!this.training)throw new Error("Fit the model before inference");
    const rule=this.rules.get(keyOf(before.stage,action));if(!rule)return null;
    try {
      const [a,b,c]=rule.expressions.map(x=>x.fn(before));
      if(!a||!b||!c||a.d!==1||b.d!==1||!Number.isSafeInteger(a.n)||!Number.isSafeInteger(b.n))
        return null;
      return Object.freeze({stage:rule.stage,a:a.n,b:b.n,c});
    }catch{return null;}
  }
  summary() {
    return {observations:this.total,learnedStageActions:this.rules.size,models:[...this.rules].map(([key,v])=>({key,stage:v.stage,formulas:v.expressions.map(x=>x.text)}))};
  }
}

const pos=(n,x,y)=>y*n+x;
const neighbour=(n,p,a)=>{
  const d=ACTIONS[a],x=p%n+d[0],y=Math.floor(p/n)+d[1];
  return x<0||y<0||x>=n||y>=n?-1:pos(n,x,y);
};
const goal=s=>s.stage==="isolated"&&s.a===1&&s.b===0;
function pathsFromLearnedRules(start,model,maxDepth=4){
  const found=[],seen=new Set();
  const visit=(s,route,stageTrail)=>{
    if(goal(s)){found.push(route);return;}
    if(route.length>=maxDepth)return;
    const actions=[...model.rules.keys()].filter(k=>k.startsWith(s.stage+"|")).map(k=>k.split("|")[1]).sort();
    for(const action of actions){
      const next=model.predict(s,action);
      if(!next||stageTrail.has(next.stage))continue;
      visit(next,[...route,{action,from:s,to:next}],new Set([...stageTrail,next.stage]));
    }
  };
  visit(start,[],new Set([start.stage]));
  found.sort((a,b)=>a.length-b.length);
  return found.slice(0,2);
}
export function makeLearnedMathWorld(a,b,c,model,{mirror=false}={}){
  if(!Number.isSafeInteger(a)||Math.abs(a)<2||Math.abs(a)>1000||
     !Number.isSafeInteger(b)||b===0||Math.abs(b)>1000||
     !Number.isSafeInteger(c)||Math.abs(c)>200000)throw new RangeError("Out of verified safe-integer range");
  if(!(model instanceof ObservedMathRules)||!model.training)throw new TypeError("Frozen observed math rules required");
  const n=11,start=pos(n,5,5),startState={stage:"factored",a,b,c:rational(c)};
  const ret=new Array(n*n).fill(KIND.wall);
  const cells=new Map([[start,startState]]),edges=new Map();ret[start]=KIND.self;
  const found=pathsFromLearnedRules(startState,model);
  for(let branch=0;branch<found.length;branch++){
    const route=found[branch],sign=(branch===0 ? -1 : 1)*(mirror ? -1 : 1);
    if(route.length>4)throw new Error("Geometry capacity exceeded");
    let previous=start;
    for(let step=0;step<route.length;step++){
      const nextPos=pos(n,5+sign*(step+1),5),edge=route[step];
      if(cells.has(nextPos))throw new Error("Geometry collision");
      ret[nextPos]=goal(edge.to)?KIND.target:KIND.floor;
      cells.set(nextPos,edge.to);
      edges.set(previous+":"+nextPos,{from:previous,to:nextPos,action:neighbour(n,previous,sign===-1?3:1)===nextPos?(sign===-1?3:1):-1,
        rule:edge.action,fromState:edge.from,toState:edge.to});
      previous=nextPos;
    }
  }
  return {n,start,ret,cells,edges,availableRoutes:found.length,
    question:a+"(x + "+b+") = "+c,groundTruthNotProvidedToShape:true};
}
export function inspectPredictedMathPath(world,discoverer,verify){
  if(!(discoverer instanceof Discoverer))throw new TypeError("Must be original V17 Discoverer");
  const shape=discoverer.shape(world.ret.slice(),world.n,world.start);
  let p=world.start;const trace=[];let good=true,solved=false;
  for(const a of shape||[]){
    const q=neighbour(world.n,p,a),edge=world.edges.get(p+":"+q);
    if(!edge){good=false;break;}
    // The independent verifier is only called AFTER the frozen shape exists.
    if(!verify(edge.fromState,edge.rule,edge.toState)){good=false;break;}
    trace.push({action:edge.rule,from:edge.fromState,to:edge.toState});
    p=q;if(world.ret[p]===KIND.target){solved=true;break;}
  }
  return {predictedBeforeAction:Boolean(shape),solved:good&&solved,
    valid:good,steps:trace.length,trace,path:shape,routeCount:world.availableRoutes};
}
