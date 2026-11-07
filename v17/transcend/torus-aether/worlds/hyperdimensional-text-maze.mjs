// Real V17 goal-conditioned text-state navigation.
// Reuses the corpus-trained TextActionPaths actions, CausalTextAgent learned 32D
// target field, actual GraphTrace.geo.U 5D symbol locations, and native NoiseAgency
// selection history. Entire route is planned BEFORE reading the held-out answer.
// 5 circular geometry axes + 32 learned goal-state axes + 1 time axis = 38D.
// No oracle solution path, prewritten answer, LLM or test-label access.
import {tokenize,words,matchScore} from "../../../../isolated/noise-space/text_action_paths.mjs";

const D=5,F=128,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=x=>((x%1)+1)%1;
const displacement=(a,b)=>{let d=b-a;if(d>0.5)d-=1;if(d<-.5)d+=1;return d;};
function hash(s){
 let h=2166136261;
 for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}
 return h>>>0;
}
function random(seed){let s=seed>>>0||1;return ()=>{
 s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),s|1);
 t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function features(question){
 const t=words(question).slice(0,128),f=new Float64Array(F);
 const keys=[...t.map(s=>"w:"+s)];
 for(let i=1;i<t.length;i++)keys.push("b:"+t[i-1]+" "+t[i]);
 for(const key of keys){const h=hash(key),idx=h%F;f[idx]+=(h&256)?1:-1;}
 const norm=Math.sqrt(f.reduce((s,v)=>s+v*v,0))||1;
 return Array.from(f,x=>x/norm);
}
export function torusChar(word,geo){
 const U=geo?.U;
 if(!(U instanceof Map))return null;
 const phase=Array.from({length:D},()=>[0,0]);let n=0;
 for(const c of String(word)){
  const p=U.get(c.charCodeAt(0));
  if(!Array.isArray(p)||p.length<D||p.some(x=>!Number.isFinite(x)))continue;
  n++;
  for(let j=0;j<D;j++){const a=2*Math.PI*p[j];phase[j][0]+=Math.cos(a);phase[j][1]+=Math.sin(a);}
 }
 if(!n)return null;
 return phase.map(([x,y])=>wrap(Math.atan2(y,x)/(2*Math.PI)));
}
export function advanceTorus(pos,coordinate,rate=0.37){
 if(!coordinate)return pos.slice();
 return pos.map((x,j)=>wrap(x+rate*displacement(x,coordinate[j])));
}
export function torusDistance(a,b){
 if(!a||!b)return null;
 return a.reduce((s,x,j)=>{const d=displacement(x,b[j]);return s+d*d;},0)/D;
}
function normText(tokens){
 return tokens.join(" ").replace(/\s+([,.!?;:])/g,"$1").replace(/([({])\s+/g,"$1").trim();
}
function copyState(s){return {tokens:s.tokens.slice(),xyz:s.xyz.slice(),time:s.time,score:s.score,
 actions:s.actions.slice(),done:s.done,matched:s.matched};}
function compactCoordinates(x){return x.map(v=>+v.toFixed(6));}
function noiseFromAgency(agency,seed,known,requested){
 const manual=clamp(Number(requested)||0,0,2);
 if(!agency||!(agency.policy instanceof Map))return {strength:manual,site:manual?"imagination":"none",native:false};
 const context="text:"+(known?"known":"unknown")+":plan";
 const table=agency.policy.get(context);
 if(!Array.isArray(table)||table.length<5)return {strength:manual,site:manual?"imagination":"none",native:false};
 const total=table.reduce((s,x)=>s+(x.n||0),0);
 const strengths=[0,.12,.42,.35,1],sites=["none","perception","perception","imagination","imagination"];
 let best=-Infinity,ids=[];
 for(let i=0;i<5;i++){
  const a=table[i],value=a?.n?a.total/a.n:0;
  const score=value+.45*Math.sqrt(Math.log(total+2)/((a?.n||0)+1))+(!a?.n?.valueOf()?0.15:0);
  if(score>best+1e-12){best=score;ids=[i];}
  else if(Math.abs(score-best)<1e-12)ids.push(i);
 }
 const r=random(seed),id=ids[Math.floor(r()*ids.length)];
 return {strength:Math.max(manual,strengths[id]),site:sites[id],native:true,
  context,evidence:total,arm:id};
}
export class HyperdimensionalTextMaze{
 constructor({seed=11,lr=.075}={}){
  this.seed=seed;this.lr=lr;this.W=Array.from({length:D*2},(_,j)=>
   Array.from({length:F},(_,i)=>((hash("axis:"+seed+":"+j+":"+i)%2000)-1000)/100000));
  this.rows=0;this.geometryRows=0;this.geometrySamples=0;this.lettersSeen=0;
  this.last=null;
 }
 goal5(question){
  if(!this.geometryRows)return null;
  const f=features(question),v=this.W.map(row=>row.reduce((s,w,i)=>s+w*f[i],0));
  return Array.from({length:D},(_,j)=>wrap(Math.atan2(v[2*j+1],v[2*j])/(2*Math.PI)));
 }
 learn(question,answer,geo){
  if(typeof question!=="string"||!question.trim()||typeof answer!=="string"||!answer.trim())
   return {trained:false,reason:"empty-observed-pair"};
  let state=new Array(D).fill(.5),known=0,seen=0;
  // Scan every character of the actually observed training answer; no 256-token truncation.
  for(const c of answer){
   seen++;
   const p=torusChar(c,geo);
   if(p){state=advanceTorus(state,p);known++;}
  }
  this.lettersSeen+=seen;this.rows++;
  if(known){
   const f=features(question),target=state.flatMap(v=>[Math.cos(v*2*Math.PI),Math.sin(v*2*Math.PI)]);
   const prediction=this.W.map(row=>row.reduce((s,v,j)=>s+v*f[j],0));
   for(let j=0;j<D*2;j++){
    const err=clamp(target[j]-prediction[j],-2,2);
    for(let i=0;i<F;i++)this.W[j][i]+=this.lr*err*f[i];
   }
   this.geometryRows++;this.geometrySamples+=known;
  }
  return {trained:true,rows:this.rows,geometryRows:this.geometryRows,
   observedChars:seen,coordsKnown:known,coverage:seen?known/seen:0};
 }
 status(){
  return {version:1,rows:this.rows,geometryRows:this.geometryRows,lettersSeen:this.lettersSeen,
   geometrySamples:this.geometrySamples,dimensions:38,
   axes:{torus:5,learnedAnswerGoal:32,time:1},
   note:"Real corpus-trained Q/A axes; this does not assert general semantic correctness."};
 }
 export(){return {version:1,seed:this.seed,lr:this.lr,W:this.W,rows:this.rows,
  geometryRows:this.geometryRows,geometrySamples:this.geometrySamples,lettersSeen:this.lettersSeen};}
 static restore(saved){
  if(saved?.version!==1||!Array.isArray(saved.W)||saved.W.length!==10||
   saved.W.some(row=>!Array.isArray(row)||row.length!==F||row.some(x=>!Number.isFinite(x))))
   throw Error("Invalid hyperdimensional text-maze checkpoint");
  const m=new HyperdimensionalTextMaze({seed:saved.seed,lr:saved.lr});
  m.W=saved.W.map(r=>r.slice());m.rows=saved.rows||0;m.geometryRows=saved.geometryRows||0;
  m.geometrySamples=saved.geometrySamples||0;m.lettersSeen=saved.lettersSeen||0;return m;
 }
 plan(question,{paths,causal,geometry,noiseAgency=null,noise=0,seed=11,
  maxSteps=96,beamWidth=5,branching=8,prefix=[],
  torusWeight=3.5,latentWeight=2.4,record=true}={}){
  if(typeof question!=="string"||!question.trim()||question.length>50000)
   throw Error("A nonempty question up to 50000 characters is required");
  if(!paths||typeof paths.propose!=="function"||!causal?.latent?.goal)
   throw Error("The original learned text action graph and native goal learner are required");
  if(!paths.rows||!causal.episodes)
   return {ready:false,reason:"Text transitions and learned goal episodes are not trained",
    training:this.status(),preActionShape:null};
  if(!Array.isArray(prefix)||prefix.some(t=>typeof t!=="string")||prefix.length>512)
   throw Error("Invalid initial text state");
  const steps=clamp(Math.trunc(maxSteps),1,2048),width=clamp(Math.trunc(beamWidth),1,12),
   fan=clamp(Math.trunc(branching),1,20),r=random(seed),
   expected=clamp(causal.goalLength(question),1,steps);
  const nativeNoise=noiseFromAgency(noiseAgency,seed,paths.rows>10,noise);
  const goal32=causal.latent.goal(question),goal5=this.goal5(question);
  const goalDistance=tokens=>causal.latent.distance(tokens,goal32);
  const initialTokens=prefix.map(x=>x.toLowerCase()),start=new Array(D).fill(.5);
  let xyz=start.slice();
  for(const token of initialTokens)xyz=advanceTorus(xyz,torusChar(token,geometry));
  const spatialCoverage=geometry?.U instanceof Map?geometry.U.size:0;
  const stateOf=(tokens,pos,step)=>({
   coordinates:[...compactCoordinates(pos),
    ...causal.latent.target(normText(tokens)).map(x=>+x.toFixed(6)),
    +(step/Math.max(1,expected)).toFixed(6)],
   torus5:compactCoordinates(pos),
   distance5:goal5==null?null:torusDistance(pos,goal5),
   distance32:goalDistance(tokens),step,wordCount:tokens.length,
   token:tokens.at(-1)||null
  });
  let beam=[{tokens:initialTokens,xyz,score:0,actions:[],done:false,matched:0,time:0}],
   expanded=0,blocked=0,singletons=0,decisionEntropy=[];
  let nodes=0;
  for(let step=0;step<steps;step++){
   const pool=[],seen=new Map();
   for(const node of beam){
    if(node.done){pool.push(node);continue;}
    const proposals=paths.propose(question,node.tokens,fan);
    if(!proposals.length){blocked++;pool.push({...node,done:true});continue;}
    if(proposals.length===1)singletons++;
    const before=goalDistance(node.tokens),before5=goal5&&torusDistance(node.xyz,goal5);
    const prefixText=normText(node.tokens);
    const options=[];
    for(const p of proposals){
     const done=p.token==="<eos>"||p.id===1;
     const tokens=done?node.tokens:node.tokens.concat(p.token);
     const coord=done?null:torusChar(p.token,geometry);
     const next5=advanceTorus(node.xyz,coord);
     const after=goalDistance(tokens),after5=goal5&&torusDistance(next5,goal5);
     const progress32=before-after;
     const progress5=before5===null||after5===null?0:before5-after5;
     const lengthCost=Math.abs(tokens.length-expected)/Math.max(8,expected);
     const edgeObserved=Number(p.observedTransitions)>0;
     const noiseDelta=nativeNoise.strength?(r()-.5)*2*nativeNoise.strength:0;
     const stepScore=0.55*p.score + latentWeight*progress32 +
      torusWeight*progress5 + (edgeObserved?0.45:-0.65) +
      (done?(tokens.length>=expected*.45?1.2:-2.5):0)-
      0.035*lengthCost + noiseDelta;
     options.push({p,done,tokens,next5,stepScore,progress32,progress5,edgeObserved,noiseDelta});
    }
    options.sort((a,b)=>b.stepScore-a.stepScore||a.p.id-b.p.id);
    const choices=options.slice(0,5).map(x=>({token:x.p.token,
     score:+x.stepScore.toFixed(5),observed:x.edgeObserved,
     move5:+x.progress5.toFixed(6),move32:+x.progress32.toFixed(6),
     next5:compactCoordinates(x.next5)}));
    for(const o of options){
     expanded++;
     const nextScore=node.score+o.stepScore;
     const current=stateOf(node.tokens,node.xyz,step);
     const next=stateOf(o.tokens,o.next5,step+1);
     const action={step,from:prefixText.slice(-100),action:o.p.token,
      to:normText(o.tokens).slice(-100),
      predictedBeforeMoving:true,observedTransition:o.edgeObserved,
      transitionCount:o.p.observedTransitions,
      promptEvidence:o.p.promptEvidence,
      score:+o.stepScore.toFixed(6),
      delta5:+o.progress5.toFixed(6),delta32:+o.progress32.toFixed(6),
      noise:+o.noiseDelta.toFixed(6),
      fromState:current,toState:next,alternatives:choices};
     const state={tokens:o.tokens,xyz:o.next5,score:nextScore,
      actions:node.actions.concat(action),done:o.done,
      matched:node.matched+(o.edgeObserved?1:0),time:step+1};
     const key=o.done?"#e:"+o.tokens.join("\u001f"):"#"+o.tokens.slice(-6).join("\u001f");
     const old=seen.get(key);
     if(!old||old.score<state.score)seen.set(key,state);
    }
   }
   if(!seen.size&&!pool.length)break;
   const rank=state=>state.score/Math.pow(Math.max(1,state.actions.length),.7)-
    .03*Math.abs(state.tokens.length-expected)/Math.max(1,expected);
   beam=pool.concat([...seen.values()])
    .sort((a,b)=>rank(b)-rank(a)||b.matched-a.matched||a.tokens.length-b.tokens.length)
    .slice(0,width);
   if(beam.every(x=>x.done))break;
  }
  const finished=beam.filter(x=>x.done);
  const rankEnd=s=>s.score/Math.pow(Math.max(1,s.actions.length),.7)-
    .03*Math.abs(s.tokens.length-expected)/Math.max(1,expected);
  const best=finished.sort((a,b)=>rankEnd(b)-rankEnd(a))[0]||beam[0]||
   {tokens:initialTokens,xyz,score:0,actions:[],done:false,matched:0};
  const final=stateOf(best.tokens,best.xyz,best.actions.length);
  const initial=stateOf(initialTokens,xyz,0);
  const result={
   ready:true,source:"native V17 corpus TextActionPaths + CausalTextAgent + 5D Geometry + NoiseAgency",
   learned:this.status(),question,answerNotSupplied:true,
   dimensions:38,axes:{symbolTorus:5,learnedGoal:32,time:1},
   target:{predicted5:goal5?compactCoordinates(goal5):null,
    predicted32:goal32.map(x=>+x.toFixed(6)),expectedWords:expected,
    5Dlearned:this.geometryRows>0},
   start:initial,initialShape:best.actions.map(a=>a.action),
   predictedText:normText(best.tokens),initialFullPath:best.actions,
   predictedFinal:final,goalDistance32:final.distance32,
   goalDistance5:final.distance5,expanded,blocked,
   singletonFrontierStates:singletons,visitedFrontiers:nodes,
   completed:best.done,stopReason:best.done?"learned-eos-or-blocked":"max-horizon",
   noisePolicy:nativeNoise,availableGeometrySymbols:spatialCoverage,
   parameters:{maxSteps:steps,beamWidth:width,branching:fan,noise,seed,torusWeight,latentWeight},
   controls:"Generated route from question + learned Q/A transitions; no held-out answer or teacher route",
   warning:"38D representation and actual search are implemented, but semantic correctness and 100% unseen accuracy are unverified."
  };
  if(record)this.last={question,shape:result.initialShape.slice(0,60),expanded,blocked,
   goal5:result.target.predicted5,goal32Length:goal32.length,atRows:this.rows};
  return result;
 }
 execute(route,{paths,causal,geometry,maxReplans=3}={}){
  if(!route?.ready||!route?.question)throw Error("Missing precomputed route");
  const history=[],trajectory=[],predicted=route.initialFullPath.slice(),
    original=route.initialShape.slice(),limit=route.parameters.maxSteps,
    expectedNoise=route.parameters.noise,seed=route.parameters.seed;
  let replans=0,divergences=0,blocked=0,step=0;
  for(;step<limit&&trajectory.length<limit;step++){
   const wanted=predicted[step],label=wanted?.action;
   if(!label||label==="<eos>")break;
   const options=paths.propose(route.question,history,Math.max(route.parameters.branching,12));
   let choice=options.find(x=>x.token===label);
   if(!choice){
    blocked++;divergences++;
    if(replans>=maxReplans)break;
    replans++;
    const revised=this.plan(route.question,{paths,causal,geometry,
      prefix:history,maxSteps:Math.max(1,limit-step),beamWidth:route.parameters.beamWidth,
      branching:route.parameters.branching,noise:expectedNoise,seed:seed+replans});
    if(!revised.ready||!revised.initialFullPath.length)break;
    const next=revised.initialFullPath[0]?.action;
    choice=options.find(x=>x.token===next);
    if(!choice)break;
   }
   if(choice.id===1)break;
   const before=normText(history);
   history.push(choice.token);
   const after=normText(history);
   trajectory.push({step,from:before.slice(-120),action:choice.token,to:after.slice(-120),
    matchedInitial:choice.token===original[step],wasObserved:choice.observedTransitions>0,
    actualState:history.slice(-12),initialPlannedState:wanted?.toState||null,
    alternatives:options.slice(0,5).map(x=>({token:x.token,score:x.score,observed:x.observedTransitions>0})),
    repaired:choice.token!==label});
  }
  return {
   generated:normText(history),steps:trajectory.length,replans,divergences,
   blocked,trajectory,plannedBeforeFirstMove:true,
   matchesInitialPrefix:trajectory.reduce((n,t)=>n+Number(t.matchedInitial),0),
   referenceWasNotUsed:true,finished:step<limit
  };
 }
 evaluate(question,answer,opts={}){
  const plan=this.plan(question,opts);
  if(!plan.ready)return {ready:false,reason:plan.reason};
  const executed=this.execute(plan,opts);
  // Only now score against withheld reference. Neither plan nor execute receives it.
  const reference=matchScore(executed.generated,answer);
  const planned=matchScore(plan.predictedText,answer);
  return {ready:true,plan,executed,metrics:{planned,executed:reference},
   heldoutAnswerUsedOnlyAfterMovement:true};
 }
}
