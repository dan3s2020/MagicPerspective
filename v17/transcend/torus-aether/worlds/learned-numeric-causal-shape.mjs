// V23 - learned numerical action physics from complete before/action/after
// examples, with the EXACT V17 Discoverer.shape at every planning scale.
// No next-character/word predictor. The answer number does not occur in
// any goal constraint and is COMPUTED from learned effect functions.
import {Discoverer,KIND} from "./exercise.mjs";
import {logTokens} from "./grounded-temporal-hypermaze.mjs";

const split=text=>String(text).match(/[^.!?\n]+[.!?]?/gu)||[];
const lower=v=>String(v).toLocaleLowerCase("en-US");
const one=(t,v)=>{let at=-1;for(let i=0;i<t.length;i++)if(t[i]===String(v)){if(at>=0)return -1;at=i;}return at;};
const pattern=(t,slots)=>t.map((x,i)=>slots.includes(i)?"*":lower(x));
const signature=(t,roles)=>JSON.stringify([t,roles]);
const matches=(p,t)=>p.length===t.length&&p.every((x,i)=>x==="*"||x===lower(t[i]));
const valid=x=>typeof x==="number"&&Number.isSafeInteger(x);
const check=x=>{if(!valid(x))throw Error("Unsafe exact integer state");return x;};
const features=(x,q)=>[x,q,x*q,1];
// Empirically solve the effect in the observed span {x,q,x*q,1}.
// The grammar supplies NO predefined add/sub/multiply semantics.
function fit(rows){
 if(rows.length<10)return null;
 const k=4,M=Array.from({length:k},()=>Array(k+1).fill(0));
 for(const [x,q,y] of rows){
  const f=features(x,q);
  for(let i=0;i<k;i++){
   for(let j=0;j<k;j++)M[i][j]+=f[i]*f[j];
   M[i][k]+=f[i]*y;
  }
 }
 for(let c=0;c<k;c++){
  let at=c;for(let j=c+1;j<k;j++)if(Math.abs(M[j][c])>Math.abs(M[at][c]))at=j;
  if(Math.abs(M[at][c])<1e-8)return null;
  [M[at],M[c]]=[M[c],M[at]];
  const scale=M[c][c];for(let j=c;j<=k;j++)M[c][j]/=scale;
  for(let r=0;r<k;r++)if(r!==c){
   const f=M[r][c];
   for(let j=c;j<=k;j++)M[r][j]-=f*M[c][j];
  }
 }
 const coef=M.map(row=>row[k]).map(v=>{const a=Math.abs(v-Math.round(v))<1e-8?Math.round(v):v;return Object.is(a,-0)?0:a;});
 if(!rows.every(([x,q,y])=>Math.abs(coef.reduce((sum,v,i)=>sum+v*features(x,q)[i],0)-y)<1e-6))return null;
 return coef;
}

export class LearnedNumericalTextPhysics {
 constructor({minimumEvidence=10,chunkSize=128}={}){
  if(!Number.isInteger(minimumEvidence)||minimumEvidence<10)throw Error("At least 10 grounded effect observations");
  if(!Number.isInteger(chunkSize)||chunkSize<4||chunkSize>256)throw Error("Invalid multiscale chunkSize");
  this.minimumEvidence=minimumEvidence;this.chunkSize=chunkSize;
  this.laws=new Map();this.initials=new Map();this.questions=new Map();
 }
 observeAction({sentence,entity,quantity,before,after,accepted=true}={}){
  if(!valid(quantity)||!valid(before)||!valid(after)||quantity===0||
     typeof entity!=="string"||!entity||typeof sentence!=="string")
    throw Error("Numerical action requires witnessed before, quantity and after");
  const t=logTokens(sentence),ei=one(t,entity),qi=one(t,quantity);
  if(ei<0||qi<0||ei===qi)return {learned:false,reason:"UNIDENTIFIABLE_NUMERICAL_SLOTS"};
  const pat=pattern(t,[ei,qi]),id=signature(pat,[ei,qi]);
  if(!accepted)return {learned:false,reason:"PHYSICAL_ACTION_BLOCKED"};
  const row=this.laws.get(id)||{id,pattern:pat,ei,qi,samples:[],verified:false,coefficients:null};
  row.samples.push([before,quantity,after]);
  if(row.samples.length>=this.minimumEvidence){
    row.coefficients=fit(row.samples);row.verified=!!row.coefficients;
  }
  this.laws.set(id,row);
  return {learned:true,verified:row.verified,samples:row.samples.length,coefficients:row.coefficients};
 }
 observeInitial({sentence,entity,value}={}){
  if(!valid(value))throw Error("Initial state must be a safe integer");
  const t=logTokens(sentence),ei=one(t,entity),vi=one(t,value);
  if(ei<0||vi<0||ei===vi)return false;
  const pat=pattern(t,[ei,vi]),id=signature(pat,[ei,vi]);
  const row=this.initials.get(id)||{pattern:pat,ei,vi,count:0};
  row.count++;this.initials.set(id,row);return true;
 }
 observeQuestion({question,entity}={}){
  const t=logTokens(question),ei=one(t,entity);
  if(ei<0)return false;
  const pat=pattern(t,[ei]),id=signature(pat,[ei]);
  const row=this.questions.get(id)||{pattern:pat,ei,count:0};
  row.count++;this.questions.set(id,row);return true;
 }
 parseQuestion(question){
  const t=logTokens(question),a=[];
  for(const r of this.questions.values())if(r.count>=3&&matches(r.pattern,t))a.push(t[r.ei]);
  const unique=[...new Set(a)];
  return unique.length===1?unique[0]:null;
 }
 parseInitial(sentence){
  const t=logTokens(sentence),res=[];
  for(const r of this.initials.values())if(r.count>=3&&matches(r.pattern,t)){
   const value=Number(t[r.vi]);
   if(valid(value))res.push({entity:t[r.ei],value});
  }
  const unique=new Map(res.map(x=>[JSON.stringify(x),x]));
  return unique.size===1?res[0]:null;
 }
 parseEffect(sentence){
  const t=logTokens(sentence),res=[];
  for(const r of this.laws.values())if(r.verified&&matches(r.pattern,t)){
   const quantity=Number(t[r.qi]);
   if(valid(quantity)&&quantity!==0)res.push({entity:t[r.ei],quantity,
     law:r.coefficients,lawId:r.id,observations:r.samples.length,sentence:sentence.trim()});
  }
  const unique=new Map(res.map(x=>[JSON.stringify(x),x]));
  return unique.size===1?res[0]:null;
 }
 plan(document,question,{seed=74129,temperature=0}={}){
  const entity=this.parseQuestion(question);
  if(!entity)return {found:false,reason:"QUESTION_GRAMMAR_UNLEARNED",plannedBeforeAction:true};
  const sentences=split(document),initials=[],effects=[];
  for(let i=0;i<sentences.length;i++){
   const start=this.parseInitial(sentences[i]);
   if(start&&start.entity===entity)initials.push(start);
   const e=this.parseEffect(sentences[i]);
   if(e&&e.entity===entity)effects.push({...e,sourceIndex:i});
  }
  if(initials.length!==1)return {found:false,reason:"NO_UNAMBIGUOUS_INITIAL_STATE",plannedBeforeAction:true};
  if(!effects.length)return {found:false,reason:"NO_LEARNED_NUMERIC_ACTIONS",plannedBeforeAction:true};
  const start=initials[0].value,events=[];
  let x=start;
  for(const e of effects){
   const f=features(x,e.quantity);
   const value=e.law.reduce((acc,c,i)=>acc+c*f[i],0),rounded=Math.round(value);
   if(!Number.isSafeInteger(rounded)||Math.abs(value-rounded)>1e-7)
     return {found:false,reason:"UNSAFE_OR_NONINTEGER_LEARNED_PHYSICS",plannedBeforeAction:true};
   events.push({...e,from:x,to:rounded,formula:e.law});
   x=rounded;
  }
  // Every state is inferred from learned witnessed laws; unlike a transfer
  // log, the final answer value is NEVER written in the input sentence.
  const levels=[],path=[];
  const solve=(lo,hi,depth)=>{
   const len=hi-lo;let width=1;while(Math.ceil(len/width)>this.chunkSize)width*=this.chunkSize;
   const groups=[];for(let a=lo;a<hi;a+=width)groups.push({lo:a,hi:Math.min(hi,a+width)});
   const N=groups.length,neighbors=Array.from({length:N+1},()=>[]);
   for(let i=1;i<=N;i++){
    const g=groups[N-i];
    neighbors[i].push({to:i-1,action:"observed-affine-range:"+g.lo+":"+g.hi,
      transformation:{range:[g.lo,g.hi],from:events[g.lo].from,to:events[g.hi-1].to}});
   }
   const kinds=Array.from({length:N+1},(_,i)=>i===0?KIND.target:i===N?KIND.self:KIND.floor);
   const actor=new Discoverer((seed+lo*7919+depth*1013)>>>0);actor.temp=temperature;
   let field=[];
   const hops=actor.shape(kinds,0,N,{neighbors,conduct:k=>k===KIND.wall?0:1,
     attract:k=>k===KIND.target?1:0,onField:V=>{field=V;}})||[];
   levels.push({depth,range:[lo,hi],scalarAtStart:field[N]??0,
     originalMethod:"Discoverer.shape",nodes:N+1,pathLength:hops.length});
   if(hops.length!==N||hops.at(-1)?.to!==0)throw Error("ORIGINAL_NUMERIC_SHAPE_FAILED");
   for(const hop of hops){
    const g=groups[N-hop.from];
    if(g.hi-g.lo>1)solve(g.lo,g.hi,depth+1);
    else {
     const e=events[g.lo];
     path.push({index:g.lo,entity:e.entity,from:e.from,to:e.to,
       action:e.sentence,quantity:e.quantity,law:e.law,sourceIndex:e.sourceIndex});
    }
   }
  };
  try{solve(0,events.length,0);}
  catch(err){return {found:false,reason:err.message,plannedBeforeAction:true,levels};}
  if(path.length!==events.length)throw Error("Macro decomposition lost observed arithmetic actions");
  return {found:true,plannedBeforeAction:true,originalMethod:"Discoverer.shape",
   learnedPhysics:"empirically fitted coefficients of [before,quantity,before*quantity,1]",
   start,answer:x,entity,goal:{type:"terminal-event-time",step:events.length,answerProvided:false},
   levels,path,originalShapeCalls:levels.length,maxLocalNodes:Math.max(...levels.map(x=>x.nodes)),
   recognizedEvents:effects.length,inputCharacters:document.length};
 }
 execute(plan,{step}={}){
  if(!plan?.found||typeof step!=="function")throw Error("Expected complete frozen plan and real environment");
  let x=plan.start,trace=[];
  for(const p of plan.path){
   const result=step({entity:plan.entity,balance:x},p,p.action);
   if(!result||typeof result.accepted!=="boolean"||!valid(result.balance))throw Error("Actual world must return accepted/balance");
   const accurate=result.accepted&&result.balance===p.to;
   trace.push({index:p.index,predicted:p.to,observed:result.balance,accurate});
   if(!accurate)break;
   x=result.balance;
  }
  const success=trace.length===plan.path.length&&trace.every(t=>t.accurate)&&x===plan.answer;
  return {success,actualAnswer:success?x:null,matchesFrozenAnswer:success,trace};
 }
 export(){return {version:1,minimumEvidence:this.minimumEvidence,chunkSize:this.chunkSize,
   laws:[...this.laws],initials:[...this.initials],questions:[...this.questions]};}
 static restore(o){
  if(o?.version!==1)throw Error("Invalid numerical physics checkpoint");
  const m=new LearnedNumericalTextPhysics({minimumEvidence:o.minimumEvidence,chunkSize:o.chunkSize});
  m.laws=new Map(o.laws);m.initials=new Map(o.initials);m.questions=new Map(o.questions);
  return m;
 }
}
