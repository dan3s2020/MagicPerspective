// V25: a learned temporal dimension for the EXACT ORIGINAL V17 Discoverer.shape.
// This is NOT a new path solver. The topology is a finite-time lift of actual
// observed V17 text state/action transitions; no future reference answer enters.
// Unlike V24's two-token destination only, an admissible target also includes
// a learned answer-length interval. No generated/imagined transition is accepted.
import {Discoverer,KIND} from "./exercise.mjs";
import {LearnedCognitiveMap,tokenizeWorld} from "./learned-cognitive-map.mjs";

const BOS=["<bos>","<bos>"],D=128;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function signature(question){
 const tokens=tokenizeWorld(question).map(x=>x.toLowerCase()).slice(0,256);
 const v=new Float64Array(D);
 for(let i=0;i<tokens.length;i++){
  for(const s of [tokens[i],...(i>0?[tokens[i-1]+"\u001f"+tokens[i]]:[])]){
   const h=hash(s);v[h%D]+=(h&256)?1:-1;
  }
 }
 const norm=Math.hypot(...v)||1;return Array.from(v,x=>x/norm);
}
const key=a=>JSON.stringify(a);
const rev=()=>new Map();
const encode=(state,step)=>JSON.stringify([state,step]);
const observedFrom=(state)=>JSON.stringify(["text",state]);
const fmt=t=>t.join(" ").replace(/\s+([,.!?;:])/g,"$1").trim();

export class ObservedLengthField{
 constructor({learningRate=0.04,maxPrototypes=4096,maxLength=4096}={}){
  this.learningRate=learningRate;this.maxPrototypes=maxPrototypes;this.maxLength=maxLength;
  this.W=new Array(D).fill(0);this.bias=0;this.rows=0;this.sumLength=0;
  this.maxObservedLength=0;this.clippedLongAnswers=0;this.overflowPrototypes=0;
  this.prototypes=[];this.last=null;
 }
 predict(question){
  if(!this.rows)return {ready:false,reason:"No previously observed answers"};
  const f=signature(question),mean=Math.log1p(this.sumLength/this.rows);
  const raw=this.bias+this.W.reduce((s,w,i)=>s+w*f[i],0);
  // Measure both learned prediction and unconditioned corpus baseline;
  // a poorly trained field must not be represented as perfectly calibrated.
  let neighborhood=0,weight=0,k=0,nearest=null;
  const scores=this.prototypes.map(p=>({
   sim:f.reduce((s,x,i)=>s+x*p.f[i],0),length:p.length
  })).sort((a,b)=>b.sim-a.sim).slice(0,5);
  for(const s of scores){
   if(s.sim<0.10)continue;const w=Math.exp(3*(s.sim-1));
   weight+=w;neighborhood+=w*Math.log1p(s.length);k++;
   if(!nearest)nearest=s;
  }
  const near=weight?neighborhood/weight:mean;
  // Fallback weight is explicitly recorded, not inferred from answer length.
  const confidence=clamp(this.rows/128,0,1);
  const conditional=(.60*raw+.40*near);
  const logLength=confidence*conditional+(1-confidence)*mean;
  const n=clamp(Math.round(Math.expm1(clamp(logLength,0,Math.log1p(this.maxLength)))),1,this.maxLength);
  return {ready:true,estimatedTokens:n,globalMean:this.sumLength/this.rows,
   confidence,neighbors:k,nearestSimilarity:nearest?.sim??null,
   predictedLogLength:logLength,trainedRows:this.rows};
 }
 learn(question,answer){
  if(typeof question!=="string"||!question.trim()||
     typeof answer!=="string"||!answer.trim())return {learned:false};
  const actual=tokenizeWorld(answer).length;
  if(!actual)return {learned:false};
  const bounded=Math.min(actual,this.maxLength),x=signature(question);
  const before=this.predict(question);
  const y=Math.log1p(bounded),predicted=this.bias+this.W.reduce((s,w,i)=>s+w*x[i],0);
  const err=clamp(y-predicted,-3,3);
  const lr=this.learningRate/Math.sqrt(1+this.rows/160);
  this.bias+=lr*err;
  for(let i=0;i<D;i++)this.W[i]+=lr*err*x[i];
  this.rows++;this.sumLength+=actual;this.maxObservedLength=Math.max(actual,this.maxObservedLength);
  if(actual>this.maxLength)this.clippedLongAnswers++;
  if(this.prototypes.length<this.maxPrototypes)this.prototypes.push({f:x,length:bounded});
  else this.overflowPrototypes++;
  this.last={observedTokens:actual,preIngestEstimate:before.ready?before.estimatedTokens:null,
   relativeAbsError:before.ready?Math.abs(actual-before.estimatedTokens)/actual:null};
  return {learned:true,observedTokens:actual,
   previousPrediction:before.ready?before.estimatedTokens:null,rows:this.rows};
 }
 report(){return {rows:this.rows,maxObservedLength:this.maxObservedLength,
  meanObservedLength:this.rows?this.sumLength/this.rows:null,
  prototypes:this.prototypes.length,overflowPrototypes:this.overflowPrototypes,
  clippedLongAnswers:this.clippedLongAnswers,last:this.last};}
 export(){return {version:1,learningRate:this.learningRate,maxPrototypes:this.maxPrototypes,
   maxLength:this.maxLength,W:this.W.slice(),bias:this.bias,rows:this.rows,
   sumLength:this.sumLength,maxObservedLength:this.maxObservedLength,
   clippedLongAnswers:this.clippedLongAnswers,overflowPrototypes:this.overflowPrototypes,
   prototypes:this.prototypes.map(p=>({f:p.f.slice(),length:p.length})),last:this.last};}
 static restore(s){
  if(s?.version!==1||!Array.isArray(s.W)||s.W.length!==D||
    s.W.some(x=>!Number.isFinite(x))||!Array.isArray(s.prototypes))
   throw Error("Invalid V25 learned text length checkpoint");
  const f=new ObservedLengthField(s);f.W=s.W.slice();
  for(const k of ["bias","rows","sumLength","maxObservedLength",
    "clippedLongAnswers","overflowPrototypes","last"])f[k]=s[k]??f[k];
  f.prototypes=s.prototypes.map(p=>({f:p.f.slice(),length:p.length}));
  return f;
 }
}
export class TemporalTextShape{
 constructor({lengthField=null}={}){this.lengthField=lengthField||new ObservedLengthField();}
 learn(question,answer){return this.lengthField.learn(question,answer);}
 export(){return {version:1,lengthField:this.lengthField.export()};}
 static restore(s){
  if(s?.version!==1)throw Error("Invalid V25 temporal checkpoint");
  return new TemporalTextShape({lengthField:ObservedLengthField.restore(s.lengthField)});
 }
 plan(question,{map,terminals,estimatedTokens=null,seed=74129,temperature=0,
  maxStates=6000,maxDepth=1200,maxCandidates=5,minFraction=.88,
  allowTruncated=false}={}){
  if(!(map instanceof LearnedCognitiveMap))throw Error("The original V17 action map is required");
  if(typeof question!=="string"||!question.trim()||question.length>100000)
   throw Error("A nonempty bounded question is required");
  if(!Array.isArray(terminals)||!terminals.length)return {ready:false,reason:"NO_LEARNED_GOAL"};
  const estimate=this.lengthField.predict(question);
  if(!estimate.ready&&estimatedTokens==null)
    return {ready:false,reason:"LENGTH_FIELD_UNTRAINED"};
  const predicted=estimatedTokens==null?estimate.estimatedTokens:
    Math.trunc(Number(estimatedTokens));
  if(!Number.isSafeInteger(predicted)||predicted<1)
    throw Error("Invalid predicted text shape length");
  const desired=clamp(predicted,1,maxDepth);
  const minLength=clamp(Math.floor(desired*clamp(minFraction,.5,1)),1,desired);
  const horizon=Math.max(minLength,Math.min(maxDepth,Math.ceil(desired*1.12)));
  // Reconstruct only genuinely observed, non-conflicting action effects.
  const outgoing=new Map();
  let valid=0,ambiguous=0;
  for(const edge of map.externalEdges.values()){
   if(edge.domain!=="text")continue;
   if(edge.ambiguous){ambiguous++;continue;}
   if(!Array.isArray(edge.before)||edge.before.length!==2||
      !Array.isArray(edge.after)||edge.after.length!==2)continue;
   if(edge.after[0]!==edge.before[1])continue;
   if(!edge.action.startsWith("observed-append:")||
      edge.action.slice("observed-append:".length)!==edge.after[1])continue;
   if(!outgoing.has(key(edge.before)))outgoing.set(key(edge.before),[]);
   outgoing.get(key(edge.before)).push(edge);valid++;
  }
  if(!valid)return {ready:false,reason:"NO_OBSERVED_LEGAL_TEXT_TRANSITIONS",valid};
  for(const list of outgoing.values())list.sort((a,b)=>b.count-a.count||a.action.localeCompare(b.action));
  // The ORIGINAL solver receives a finite graph, but every state has time.
  // Time monotonicity makes illegal shortcuts/cyclic early exits impossible.
  const states=[{context:BOS.slice(),time:0}],seen=new Map([[encode(BOS,0),0]]),
    neighbors=[[]];
  let truncated=false,examined=0;
  for(let head=0;head<states.length;head++){
   const node=states[head];
   if(node.time>=horizon)continue;
   for(const edge of outgoing.get(key(node.context))||[]){
    const tick=node.time+1,s=encode(edge.after,tick);let next=seen.get(s);
    if(next===undefined){
     if(states.length>=maxStates){truncated=true;continue;}
     next=states.length;seen.set(s,next);
     states.push({context:edge.after.slice(),time:tick});neighbors.push([]);
    }
    neighbors[head].push({to:next,action:edge.action,
     transformation:"originally-observed-text:"+edge.count,verified:true});
    examined++;
   }
  }
  const candidates=terminals.slice(0,clamp(Math.trunc(maxCandidates),1,40));
  const attempts=[];
  for(const row of candidates){
   const target=Array.isArray(row)?row:row.terminal;
   if(!Array.isArray(target)||target.length!==2)continue;
   const goalStates=states.flatMap((node,i)=>
     node.time>=minLength&&node.time<=horizon&&
     node.context[0]===target[0]&&node.context[1]===target[1]?[i]:[]);
   if(!goalStates.length){
    attempts.push({target,found:false,reason:truncated?"GRAPH_BUDGET_OR_UNREACHABLE":"UNREACHABLE_GOAL_WITH_LENGTH"});
    continue;
   }
   const actor=new Discoverer(seed);
   actor.temp=clamp(Number(temperature)||0,0,2);
   const goals=new Set(goalStates);
   const kinds=states.map((_,i)=>i===0?KIND.self:goals.has(i)?KIND.target:KIND.floor);
   let values=null;
   const links=actor.shape(kinds,0,0,{
     neighbors,conduct:k=>k===KIND.wall?0:1,
     attract:k=>k===KIND.target?1:0,
     onField:x=>{values=x;}
   })||[];
   const reached=links.length&&goals.has(links.at(-1)?.to);
   if(!reached){
    attempts.push({target,found:false,reason:"NO_ASCENDING_FIELD",goalStates:goalStates.length});
    continue;
   }
   // Execute predicted steps ONLY by reading original observed edges.
   const original=[],tokens=[],frames=[{step:0,context:BOS.slice(),time:0}];
   let cursor=BOS.slice(),invalid=false;
   for(let i=0;i<links.length;i++){
    const hop=links[i],future=states[hop.to];
    const actual=map.externalEdges.get(observedFrom(cursor)+"\u001f"+hop.action);
    if(!actual||actual.ambiguous||key(actual.after)!==key(future.context)){
     invalid=true;break;
    }
    tokens.push(future.context[1]);cursor=future.context.slice();
    const state={step:i+1,context:cursor.slice(),time:future.time,
     action:hop.action,token:future.context[1],
     valueBefore:values?.[hop.from]??null,valueAfter:values?.[hop.to]??null,
     evidenceCount:actual.count,originalOperator:"Discoverer.shape"};
    original.push({...state,fromIndex:hop.from,toIndex:hop.to});
    frames.push(state);
   }
   if(invalid){
    attempts.push({target,found:false,reason:"OBSERVED_EDGE_INVALIDATED"});continue;
   }
   return {ready:true,found:true,originalOperator:"Discoverer.shape",
    source:"V25 time-lifted ONLY observed text transitions + original V17 solver",
    referenceAnswerProvided:false,plannedBeforeFirstMovement:true,
    predictedLength:desired,predictedMinLength:minLength,predictedHorizon:horizon,
    actualPlannedLength:tokens.length,answer:textOf(tokens),initialShape:original,
    frames,fullPathField:values,
    target:target.slice(),trainingLengthEstimate:estimate,
    negativeControls:{observedEdgesOnly:true,cyclesCannotJumpTime:true},
    graph:{states:states.length,edges:examined,validObservedEdges:valid,
      ambiguousObservedEdges:ambiguous,truncated,goalStates:goalStates.length},
    attempts,semanticTruthVerified:false,
    caveat:"Text path uses observed token transitions, not externally verified semantic correctness."};
  }
  return {ready:false,found:false,reason:truncated?"TRUNCATED_NO_REACHABLE_LENGTH_GOAL":"NO_REACHABLE_LENGTH_GOAL",
   graph:{states:states.length,edges:examined,validObservedEdges:valid,
     ambiguousObservedEdges:ambiguous,truncated},attempts,
   prediction:estimate,predictedLength:desired,predictedMinLength:minLength,
   referenceAnswerProvided:false,originalOperator:"Discoverer.shape",
   semanticTruthVerified:false};
 }
}
