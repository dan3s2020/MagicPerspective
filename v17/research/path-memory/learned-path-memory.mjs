// Learned path memory from OBSERVED, ACTION-LABELED text transitions.
// No signed-area, 2048, commutator, or quantum rule is supplied to the learner.
// We learn a conditional transition from action observations, then ask whether
// different action orders with the same visible endpoint have different futures.
// Uses original V17 tokenization to preserve concrete text-state positions.
// This is experimental and opt-in: never changes existing Brain.write() by default.
import {tokenizeObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const EPS=1e-8;
const tpl=xs=>xs.map(t=>/^-?\d+$/u.test(t)?"#":t).join("\u001f");
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const arr=x=>Array.isArray(x)?x.slice():tokenizeObservation(x);
const parse=x=>{
 // The V17 tokenizer treats a minus sign as punctuation. For signed integer
 // observations only, reconstruct the numeric token before template matching.
 // No linguistic/semantic interpretation is introduced.
 const raw=arr(x),tokens=[];
 for(let i=0;i<raw.length;i++){
  const v=String(raw[i]);
  if(v==="-"&&i+1<raw.length&&/^\d+$/u.test(String(raw[i+1]))){
   tokens.push("-"+String(raw[i+1]));i++;
  }else tokens.push(v);
 }
 const indices=tokens.flatMap((v,i)=>/^-?\d+$/u.test(v)?[i]:[]);
 const values=indices.map(i=>Number(tokens[i]));
 if(!values.length||values.some(v=>!Number.isSafeInteger(v)))throw Error("Only safe integer numeric observations are supported");
 return {tokens,indices,values,template:tpl(tokens)};
};
const average=a=>a.reduce((s,x)=>s+x,0)/a.length;
const variance=a=>a.reduce((s,x)=>s+(x-average(a))**2,0)/a.length;
const round=x=>{const n=Math.round(x);return Math.abs(x-n)<1e-6?(n===0?0:n):x;};
const copy=o=>JSON.parse(JSON.stringify(o));

function linearSolve(M,Y,lambda=1e-10){
 const d=Y[0].length,normal=Array.from({length:d},()=>Array(d+1).fill(0));
 for(let k=0;k<M.length;k++)for(let i=0;i<d;i++){
  for(let j=0;j<d;j++)normal[i][j]+=Y[k][i]*Y[k][j];
  normal[i][d]+=Y[k][i]*M[k];
 }
 for(let i=0;i<d;i++)normal[i][i]+=lambda;
 for(let j=0;j<d;j++){
  let p=j;for(let i=j+1;i<d;i++)if(Math.abs(normal[i][j])>Math.abs(normal[p][j]))p=i;
  if(Math.abs(normal[p][j])<EPS)return null;
  [normal[j],normal[p]]=[normal[p],normal[j]];
  let factor=normal[j][j];for(let c=j;c<=d;c++)normal[j][c]/=factor;
  for(let i=0;i<d;i++)if(i!==j){
   factor=normal[i][j];for(let c=j;c<=d;c++)normal[i][c]-=factor*normal[j][c];
  }
 }
 return normal.map(row=>row[d]);
}
const predict=(coefs,v)=>coefs[0]+coefs.slice(1).reduce((s,x,i)=>s+x*v[i],0);

export class LearnedPathMemory {
 constructor({minPerAction=20,maxExpanded=10000,maxSamples=100000}={}){
  Object.assign(this,{minPerAction,maxExpanded,maxSamples});
  this.examples=[];this.model=null;
 }
 observe(before,action,after){
  if(typeof action!=="string"||!action.trim())throw Error("Action name required for a genuine observed intervention");
  const x=parse(before),y=parse(after);
  if(x.template!==y.template||!same(x.indices,y.indices)||x.values.length!==y.values.length)
   throw Error("Observations must share the same text template and numeric positions");
  if(this.examples.length&&x.template!==this.examples[0].template)
   throw Error("Refusing to merge incompatible text grammars");
  if(this.examples.length>=this.maxSamples)throw Error("Explicit observation memory limit reached");
  this.examples.push({action,before:x.values,after:y.values,template:x.template,
   textTemplate:typeof before==="string"?before:null});
  return this.examples.length;
 }
 fit(){
  const groups=new Map(),records=this.examples;
  if(!records.length)throw Error("No observed transitions");
  const n=records[0].before.length;
  for(const rec of records){
   const g=groups.get(rec.action)||[];g.push(rec);groups.set(rec.action,g);
  }
  if(groups.size<2)throw Error("Need multiple independent action directions");
  for(const [a,rows] of groups)if(rows.length<this.minPerAction)
   throw Error("Insufficient action observations for "+a);
  // Discover the coordinates that have repeatable nonzero, unit displacements.
  const observedControls=new Map();
  for(const [action,rows] of groups){
   const hits=[];
   for(let j=0;j<n;j++){
    const d=rows.map(r=>r.after[j]-r.before[j]),mean=average(d),v=variance(d);
    if(Math.abs(Math.abs(mean)-1)<1e-6&&v<1e-8)
     hits.push({index:j,delta:Math.round(mean)});
   }
   if(hits.length!==1)throw Error("Cannot distinguish exactly one primary movement axis for "+action+
    "; found "+hits.length);
   observedControls.set(action,hits[0]);
  }
  const axes=[...new Set([...observedControls.values()].map(x=>x.index))].sort((a,b)=>a-b);
  if(axes.length!==2)throw Error("This research implementation has verified only TWO learned control axes");
  const candidates=Array.from({length:n},(_,j)=>j).filter(j=>!axes.includes(j));
  const regressions=[];
  for(const dependent of candidates){
   const models=new Map();let base=0,residual=0,total=0;
   for(const [a,rows] of groups){
    const x=rows.map(r=>[1,...axes.map(j=>r.before[j])]);
    const y=rows.map(r=>r.after[dependent]-r.before[dependent]);
    const coefficients=linearSolve(y,x);
    if(!coefficients)continue;
    const mse=average(rows.map((r,i)=>(y[i]-predict(coefficients,axes.map(j=>r.before[j])))**2));
    const baseline=variance(y);
    base+=baseline*rows.length;residual+=mse*rows.length;total+=rows.length;
    models.set(a,{coefficients,mse,baseline,observations:rows.length});
   }
   if(models.size!==groups.size)continue;
   const explained=Math.max(0,(base-residual)/(base+EPS));
   regressions.push({dependent,models,explained,meanSquaredError:residual/total,
    predictableVariance:(base-residual)/total});
  }
  regressions.sort((a,b)=>b.predictableVariance-a.predictableVariance||
   b.explained-a.explained);
  const chosen=regressions[0];
  if(!chosen||chosen.explained<.90||chosen.predictableVariance<.01)
   throw Error("No reproducibly state-dependent coordinate: path-memory not established");
  const actions={};
  for(const [a,rule] of observedControls)
   actions[a]={axis:axes.indexOf(rule.index),delta:rule.delta,
    zCoefficients:chosen.models.get(a).coefficients};
  this.model={
   version:1,template:records[0].template, numericCount:n,
   inputAxes:axes,dependent:chosen.dependent,
   rejectedAxes:candidates.filter(j=>j!==chosen.dependent),
   actions,samples:records.length,predictableVariance:chosen.predictableVariance,
   explainedVariance:chosen.explained,
   fitResidual:chosen.meanSquaredError
  };
  // Determine whether a path-history coordinate is demanded by observed actions.
  const seed=records[0].before;
  const keys=Object.keys(actions),commutators=[];
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
   const a=keys[i],b=keys[j];
   const ab=this.move(this.move(seed,a),b),ba=this.move(this.move(seed,b),a);
   const projected=axes.every(p=>Math.abs(ab[p]-ba[p])<EPS);
   const historyDifference=ab[chosen.dependent]-ba[chosen.dependent];
   if(projected&&Math.abs(historyDifference)>1e-5)
    commutators.push({a,b,discrepancy:round(historyDifference)});
  }
  this.model.derivedPathMemoryDimensions=commutators.length?1:0;
  this.model.nonCommutingPairs=commutators;
  return copy(this.model);
 }
 move(input,action){
  if(!this.model)throw Error("Fit observation-based model before predicting");
  const state=Array.isArray(input)?input.slice():parse(input).values;
  const rule=this.model.actions[action];
  if(!rule)throw Error("Action not learned: "+action);
  const axes=this.model.inputAxes,dep=this.model.dependent;
  const effect=predict(rule.zCoefficients,axes.map(i=>state[i]));
  state[dep]=round(state[dep]+effect);
  state[axes[rule.axis]]=round(state[axes[rule.axis]]+rule.delta);
  return state;
 }
 run(start,actions){
  const initial=Array.isArray(start)?start.slice():parse(start).values,history=[],state=initial.slice();
  let current=state;
  for(const action of actions){
   const next=this.move(current,action);
   history.push({action,before:current.slice(),predicted:next.slice()});
   current=next;
  }
  // Canonical action ordering defines a position-only comparison.
  // This is NOT a hardcoded signed-area feature. It is a direct counterfactual
  // replay of exactly the SAME learned operations in a fixed order.
  const canonical=actions.slice().sort();
  let baseline=initial.slice();
  for(const action of canonical)baseline=this.move(baseline,action);
  const dependent=this.model.dependent;
  return {start:initial,actions:actions.slice(),trajectory:history,final:current,
   baseline:baseline.slice(),
   discoveredMemoryResidual:round(current[dependent]-baseline[dependent]),
   memoryDimensions:this.model.derivedPathMemoryDimensions,
   knownTemplate:this.model.template};
 }
 plan(start,goal,{maxSteps=30}={}){
  if(!this.model)throw Error("Model not fitted");
  if(!Array.isArray(goal)||goal.length!==2||goal.some(x=>!Number.isSafeInteger(x)))
   throw Error("Goal must specify ONLY two visible controls, never the unknown output");
  const origin=Array.isArray(start)?start.slice():parse(start).values;
  const axes=this.model.inputAxes,at=s=>axes.map(i=>s[i]),key=s=>at(s).join("|");
  const want=goal.join("|"),q=[{state:origin,actions:[]}],seen=new Set([key(origin)]);
  for(let i=0;i<q.length&&i<this.maxExpanded;i++){
   const c=q[i];
   if(key(c.state)===want)return {...this.run(origin,c.actions),goal:goal.slice(),
    found:true,expanded:i+1,plannedBeforeExecution:true,referenceDependentAnswerGiven:false};
   if(c.actions.length>=maxSteps)continue;
   for(const action of Object.keys(this.model.actions)){
    const next=this.move(c.state,action),code=key(next);
    if(seen.has(code))continue;
    seen.add(code);q.push({state:next,actions:c.actions.concat(action)});
   }
  }
  return {found:false,reason:"Target not reachable within learned actions/budget",
   maxSteps,expanded:Math.min(q.length,this.maxExpanded)};
 }
 execute(start,actions,environment){
  if(typeof environment!=="function")throw Error("Require actual action executor for verification");
  let state=Array.isArray(start)?start.slice():parse(start).values;
  const trace=[];
  for(const action of actions){
   const predicted=this.move(state,action),after=environment(state.slice(),action);
   const observed=Array.isArray(after)?after.slice():parse(after).values;
   const dependent=this.model.dependent;
   trace.push({action,before:state.slice(),predicted,observed,
    error:round(observed[dependent]-predicted[dependent]),
    matchesDependent:Math.abs(observed[dependent]-predicted[dependent])<1e-5});
   state=observed;
  }
  return {final:state,trace,success:trace.every(x=>x.matchesDependent)};
 }
 export(){return {version:1,model:copy(this.model),samples:this.examples.length,
   examples:copy(this.examples),configuration:{minPerAction:this.minPerAction,
   maxExpanded:this.maxExpanded,maxSamples:this.maxSamples}};}
 static restore(state){
  if(state?.version!==1||!state.model?.actions)throw Error("Unknown model checkpoint schema");
  const m=new LearnedPathMemory(state.configuration||{});
  m.model=copy(state.model);
  m.examples=Array.isArray(state.examples)?copy(state.examples):[];
  if(state.samples>0&&!Array.isArray(state.examples))
   throw Error("Old checkpoint lacks the training ledger; refusing partial resume");
  if(m.examples.length!==state.samples)throw Error("Checkpoint training ledger size mismatch");
  return m;
 }
}
