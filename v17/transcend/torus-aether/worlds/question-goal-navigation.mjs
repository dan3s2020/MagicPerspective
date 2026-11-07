// V24: question-to-goal induction, then the EXACT ORIGINAL V17 Discoverer.shape
// on actual observed text state/action topology (LearnedCognitiveMap).
// No next-token substitution, no reference answer during frozen planning.
// The map learns each observed answer action, but limited active edge capacity
// and goal generalization remain measurable constraints, never hidden.
import {LatentGoalField} from "../../../../isolated/noise-space/causal_text_world.mjs";
import {TemporalTextShape} from "./temporal-text-shape.mjs";
import {tokenizeWorld,LearnedCognitiveMap} from "./learned-cognitive-map.mjs";

const D=5, F=128, C=32, START=["<bos>","<bos>"];
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=x=>((x%1)+1)%1;
const delta=(a,b)=>{let x=b-a; if(x>0.5)x-=1; else if(x<-.5)x+=1;return x;};
const sqDist=(a,b)=>a.reduce((s,x,i)=>s+(x-b[i])*(x-b[i]),0)/Math.max(1,a.length);
const phaseDist=(a,b)=>a.reduce((s,x,i)=>s+delta(x,b[i])**2,0)/D;
const h32=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0;};
function features(question){
 const words=tokenizeWorld(question).slice(0,192),f=new Float64Array(F);
 for(let i=0;i<words.length;i++){
  for(const s of ["w:"+words[i],...(i>0?["b:"+words[i-1]+"\u001f"+words[i]]:[])]){
   const h=h32(s),idx=h%F;f[idx]+=h&256?1:-1;
  }
 }
 const z=Math.hypot(...f)||1;return Array.from(f,x=>x/z);
}
function observedPhase(chars,geometry){
 if(!(geometry?.U instanceof Map))return null;
 const p=Array.from({length:D},()=>[0,0]);let n=0;
 for(const c of String(chars)){
  const q=geometry.U.get(c.charCodeAt(0));
  if(!Array.isArray(q)||q.length<D||q.some(v=>!Number.isFinite(v)))continue;
  n++;
  for(let j=0;j<D;j++){const a=2*Math.PI*q[j];p[j][0]+=Math.cos(a);p[j][1]+=Math.sin(a);}
 }
 return n?{pos:p.map(([x,y])=>wrap(Math.atan2(y,x)/(2*Math.PI))),observed:n,total:chars.length}:null;
}
function textOf(tokens){return tokens.join(" ").replace(/\s+([,.!?;:])/g,"$1").replace(/([([{])\s+/g,"$1").trim();}
const key=token=>JSON.stringify(token);
const originalEdgeKey=(before,action)=>JSON.stringify(["text",before])+"\u001f"+String(action);

export class QuestionGoalNavigator {
 constructor({seed=17,lr=0.09,maxTerminals=9000}={}){
  this.version=1;this.seed=seed;this.lr=lr;this.maxTerminals=maxTerminals;
  this.latent=new LatentGoalField(seed+31);
  this.temporal=new TemporalTextShape();
  this.T=Array.from({length:D*2},(_,j)=>Array.from({length:F},(_,i)=>
   ((h32("t:"+seed+":"+j+":"+i)%2000)-1000)/100000));
  this.terminals=new Map();this.rows=0;this.observedActions=0;this.observedChars=0;
  this.geometryRows=0;this.geometryChars=0;this.skippedTerminalNovelty=0;
  this.last=null;
 }
 goal5(question){
  if(!this.geometryRows)return null;
  const f=features(question),v=this.T.map(row=>row.reduce((s,x,i)=>s+x*f[i],0));
  return Array.from({length:D},(_,j)=>wrap(Math.atan2(v[2*j+1],v[2*j])/(2*Math.PI)));
 }
 learn(question,answer,{map,geometry}={}){
  if(typeof question!=="string"||!question.trim()||typeof answer!=="string"||!answer.trim())
   return {learned:false,reason:"missing-observed-QA"};
  if(!(map instanceof LearnedCognitiveMap))throw Error("Expected existing V17 LearnedCognitiveMap");
  const tokens=tokenizeWorld(answer);
  if(!tokens.length)return {learned:false,reason:"no-observed-answer-tokens"};
  // Every observed character of the complete question and complete answer
  // enters training via goal fitting / actual corpus state transitions, NOT
  // only the first 256 words of text.
  const terminal=tokens.length>=2?tokens.slice(-2):[START[1],tokens[0]];
  const state0=START.slice(),phase=observedPhase(answer,geometry),f=features(question);
  const answerVector=this.latent.target(answer);
  let cursor=state0;
  for(let i=0;i<tokens.length;i++){
   const next=[cursor[1],tokens[i]],action="observed-append:"+tokens[i];
   map.observeExternalTransition({domain:"text",before:cursor,action,after:next,
     context:question.slice(0,128)});
   cursor=next;this.observedActions++;
  }
  this.latent.fit(question,answer);
  const id=key(terminal);
  let row=this.terminals.get(id);
  if(!row){
   if(this.terminals.size>=this.maxTerminals){this.skippedTerminalNovelty++;}
   else{row={terminal:terminal.slice(),seen:0,mean32:Array(C).fill(0),pos5:null,geoN:0};this.terminals.set(id,row);}
  }
  if(row){
   row.seen++;
   for(let j=0;j<C;j++)row.mean32[j]+=(answerVector[j]-row.mean32[j])/row.seen;
   if(phase){
    // Circular averaging in true learned 5D symbol phases.
    if(!row.pos5)row.pos5=phase.pos;
    else row.pos5=row.pos5.map((v,j)=>
      wrap(v+delta(v,phase.pos[j])/(row.geoN+1)));
    row.geoN++;
   }
  }
  if(phase){
   const goal=phase.pos.flatMap(p=>[Math.cos(p*2*Math.PI),Math.sin(p*2*Math.PI)]);
   const p=this.T.map(t=>t.reduce((s,x,i)=>s+x*f[i],0));
   for(let j=0;j<D*2;j++){
    const err=cap(goal[j]-p[j],-2,2);
    for(let i=0;i<F;i++)this.T[j][i]+=this.lr*err*f[i];
   }
   this.geometryRows++;this.geometryChars+=phase.observed;
  }
  this.temporal.learn(question,answer);
  this.rows++;this.observedChars+=answer.length;
  return {learned:true,rows:this.rows,observedActions:this.observedActions,
   observedAnswerChars:answer.length,allObservedWords:tokens.length,
   geometryAvailable:!!phase};
 }
 summary(map=null){
  return {version:1,rows:this.rows,goalUpdates:this.latent.updates,
   observedActions:this.observedActions,observedChars:this.observedChars,
   targets:this.terminals.size,skippedTerminalNovelty:this.skippedTerminalNovelty,
   temporal:this.temporal.lengthField.report(),
   geometryRows:this.geometryRows,geometryChars:this.geometryChars,
   observedMapEdges:map?.externalEdges?.size??null,
   compactedMapEdges:map?.compactedExternalEdges??null,
   effectiveDimensions:this.geometryRows?38:33,
   declaredAxes:{geometric5D:this.geometryRows>0,goal32:true,transitionTime:true},
   truth:"Only observed text transitions; question->target must generalize on real unseen answers."};
 }
 export(){return {version:1,seed:this.seed,lr:this.lr,maxTerminals:this.maxTerminals,
  T:this.T.map(row=>row.slice()),latent:this.latent.export(),terminals:[...this.terminals],
  temporal:this.temporal.export(),
  rows:this.rows,observedActions:this.observedActions,observedChars:this.observedChars,
  geometryRows:this.geometryRows,geometryChars:this.geometryChars,
  skippedTerminalNovelty:this.skippedTerminalNovelty};}
 static restore(s){
  if(s?.version!==1||!Array.isArray(s.T)||s.T.length!==D*2||
   s.T.some(row=>!Array.isArray(row)||row.length!==F||row.some(x=>!Number.isFinite(x)))||
   !Array.isArray(s.terminals))throw Error("Invalid V24 question-goal checkpoint");
  const m=new QuestionGoalNavigator({seed:s.seed,lr:s.lr,maxTerminals:s.maxTerminals});
  m.T=s.T.map(x=>x.slice());m.latent=LatentGoalField.restore(s.latent);
  m.terminals=new Map(s.terminals);
  if(s.temporal)m.temporal=TemporalTextShape.restore(s.temporal);
  // Old V24 checkpoints remain readable. No fake retroactive temporal training.
  for(const k of ["rows","observedActions","observedChars","geometryRows",
   "geometryChars","skippedTerminalNovelty"])m[k]=s[k]||0;
  return m;
 }
 candidates(question,{geometryWeight=1.75,maxCandidates=9}={}){
  if(!this.rows||!this.terminals.size)return [];
  const g32=this.latent.goal(question),g5=this.goal5(question);
  const rows=[];
  for(const [id,row] of this.terminals){
   const semantic=sqDist(g32,row.mean32);
   const geom=g5&&row.pos5?phaseDist(g5,row.pos5):null;
   const score=semantic+(geom==null?0:geometryWeight*geom)-
    .003*Math.log1p(row.seen);
   rows.push({id,terminal:row.terminal.slice(),score,semantic,geometricDistance:geom,
    seen:row.seen,geometryObserved:row.geoN});
  }
  rows.sort((a,b)=>a.score-b.score||b.seen-a.seen||a.id.localeCompare(b.id));
  return rows.slice(0,cap(Math.trunc(maxCandidates),1,50));
 }
 plan(question,{map,geometry=null,disc=null,temperature=0,maxNodes=1500,
  maxCandidates=9,geometryWeight=1.75,record=false,
  navigationMode="legacy",maxTemporalStates=6000}={}){
  if(typeof question!=="string"||!question.trim()||question.length>100000)
   throw Error("A nonempty question under 100000 characters is required");
  if(!(map instanceof LearnedCognitiveMap))throw Error("Native V17 observed map required");
  const before=this.summary(map),candidates=this.candidates(question,{maxCandidates,geometryWeight});
  if(!candidates.length)return {ready:false,reason:"NOT_TRAINED",
   referenceAnswerProvided:false,training:before};
  if(navigationMode==="temporal"){
   const p=this.temporal.plan(question,{map,terminals:candidates,
    maxCandidates,temperature:disc?.temp??temperature,maxStates:maxTemporalStates});
   if(!p.ready)return {...p,training:before,navigationMode:"temporal",
    targetEstimatedFromQuestion:!!candidates.length,question,
    originalOperator:"Discoverer.shape",
    predictedTargets:p.attempts||[],referenceAnswerProvided:false};
   const full=p.initialShape.map(h=>({
    ...h,action:h.action,after:h.context.slice(),
    geometry5:observedPhase(h.token,geometry)?.pos??null,
    predictedBeforeAction:true
   }));
   const g32=this.latent.goal(question),g5=this.goal5(question);
   return {...p,question,navigationMode:"temporal",temporal:true,training:before,
    predictedText:p.answer,initialFullRoute:full,
    observedEdgesUsed:full.length,plannedSteps:full.length,
    predictedBeforeFirstMovement:true,targetEstimatedFromQuestion:true,
    predictedGoal:{tokens:p.target,learned5DTarget:g5,learned32DTarget:g32,
     expectedTokens:p.predictedLength},
    predictedTargets:p.attempts||[],noAnswerOracle:true,
    geometryActive:!!(g5&&full.some(h=>h.geometry5)),
    dimensions:g5?38:33,
    originalOperator:"Discoverer.shape",
    honestCaveat:"The exact ORIGINAL attraction law runs on time-indexed observed states. The full answer is NOT independently verified."};
  }
  const g32=this.latent.goal(question),g5=this.goal5(question);
  const attempts=[];let chosen=null,path=null;
  for(const c of candidates){
   // Goal is a prediction from question, never the reference answer.
   const goal={slots:{"0":c.terminal[0],"1":c.terminal[1]}};
   const result=map.formObservedWorld("text",START,goal,
    {disc:disc||{temp:Math.max(0,Number(temperature)||0)},
     maxNodes:cap(Math.trunc(maxNodes),10,20000)});
   attempts.push({target:c.terminal,score:c.score,
    reachable:result.found,reason:result.reason||null,
    states:result.states,observedEdges:result.learnedEdges});
   if(result.found&&result.path?.length){
    chosen=c;path=result;break;
   }
  }
  if(!path)return {ready:false,reason:"NO_REACHABLE_LEARNED_GOAL",
   predictedTargets:attempts,training:before,referenceAnswerProvided:false,
   originalMethod:"Discoverer.shape"};
  const moves=path.path.map((step,i)=>{
   return {step:i,action:step.action,fromIndex:step.from,toIndex:step.to,
    before:null,after:null,
    valueBefore:path.field?.values?.[step.from]??null,
    valueAfter:path.field?.values?.[step.to]??null};
  });
  // formObservedWorld exposes states count rather than raw world states.
  // Reconstruct actual states ONLY from saved edges, without an oracle.
  let cursor=START.slice(),tokens=[],blocked=0;
  const originalActions=[],full=[];
  for(const action of moves){
   const edge=map.externalEdges.get(originalEdgeKey(cursor,action.action));
   if(!edge||edge.ambiguous||!Array.isArray(edge.after)){
    blocked++;break;
   }
   cursor=edge.after.slice();tokens.push(cursor[1]);
   const q=observedPhase(cursor.join(" "),geometry);
   originalActions.push(action.action);
   full.push({...action,after:cursor.slice(),geometry5:q?.pos??null,
    geometricKnown:!!q,observedCount:edge.count,
    predictedBeforeAction:true});
  }
  const found=blocked===0&&full.length===moves.length;
  const result={
   ready:found,reason:found?"GOAL_PATH_PREDICTED":"BROKEN_OBSERVED_EDGE",
   question,referenceAnswerProvided:false,
   targetEstimatedFromQuestion:true,predictedGoal:{tokens:chosen.terminal,
    distance32:chosen.semantic,distance5:chosen.geometricDistance,
    learned5DTarget:g5,learned32DTarget:g32,seen:chosen.seen},
   predictedText:textOf(tokens),predictedBeforeFirstMovement:true,
   initialFullRoute:full,actions:originalActions,
   completed:found,plannedSteps:moves.length,observedEdgesUsed:full.length,
   originalOperator:path.directOriginalMethod,field:path.field?.values??null,
   predictedTargets:attempts,training:before,
   geometryActive:!!(g5&&full.some(x=>x.geometricKnown)),
   dimensions:!!(g5&&full.some(x=>x.geometricKnown))?38:33,
   noAnswerOracle:true,
   honestCaveat:"A learned question->goal estimate + exact native Discoverer.shape over previously observed text transitions; not guaranteed correct for unseen language semantics."};
  if(record)this.last={found,predictedText:result.predictedText.slice(0,120),
   plannedSteps:result.plannedSteps,observed:result.observedEdgesUsed,
   directOriginalMethod:result.originalOperator};
  return result;
 }
 execute(route,{map}={}){
  if(!(map instanceof LearnedCognitiveMap)||!route?.ready)
   throw Error("A successful frozen route and learned cognitive map are required");
  if(route.temporal){
   const trace=route.frames||[];
   const complete=trace.length-1===route.plannedSteps&&
     JSON.stringify(trace.at(-1)?.context)===JSON.stringify(route.predictedGoal?.tokens);
   return {reached:complete,blocked:complete?0:1,replans:0,steps:Math.max(0,trace.length-1),
    frames:trace.map((x,i)=>({step:i,state:x.context,action:x.action||null,token:x.token||null,
      matched:i===0?null:true,observedCount:x.evidenceCount||0})),
    predictedBeforeMovement:true,realWorldFeedback:false,
    explanation:"Time-indexed frozen replay of known observed effects, no independent semantic referee."};
  }
  let state=START.slice(),replans=0,blocked=0;
  const frames=[{step:0,state:state.slice(),token:null,
   expected:route.initialFullRoute[0]?.after||null}];
  for(const action of route.initialFullRoute){
   const edge=map.externalEdges.get(originalEdgeKey(state,action.action));
   if(!edge||edge.ambiguous||JSON.stringify(edge.after)!==JSON.stringify(action.after)){
    blocked++;
    frames.push({step:frames.length,state:state.slice(),action:action.action,
     blocked:true,predicted:action.after,actual:null});
    break;
   }
   state=edge.after.slice();
   frames.push({step:frames.length,state:state.slice(),action:action.action,
    token:state[1],expected:action.after,matched:true,observedCount:edge.count});
  }
  const reached=blocked===0&&JSON.stringify(state)===
    JSON.stringify(route.predictedGoal.tokens);
  return {reached,blocked,replans,frames,steps:frames.length-1,
   predictedBeforeMovement:true,
   realWorldFeedback:false,
   explanation:"Frozen replay verifies observed transitions; external physical action feedback is not available for arbitrary prose."};
 }
 evaluate(question,answer,opts={}){
  const planned=this.plan(question,opts);
  if(!planned.ready)return {planned,referenceVisibleOnlyAfterPlan:true,
    exact:false,answerAccuracy:0};
  const normalized=textOf(tokenizeWorld(answer));
  const guessed=textOf(tokenizeWorld(planned.predictedText));
  const exact=guessed===normalized;
  const ref=tokenizeWorld(answer),pred=tokenizeWorld(planned.predictedText);
  let matching=0;
  for(let i=0;i<Math.min(ref.length,pred.length);i++)if(ref[i]===pred[i])matching++;
  return {planned,referenceVisibleOnlyAfterPlan:true,exact,
   correctTokenPositions:matching,answerTokens:ref.length,
   answerAccuracy:matching/Math.max(1,ref.length),
   predictedTokens:pred.length};
 }
}
