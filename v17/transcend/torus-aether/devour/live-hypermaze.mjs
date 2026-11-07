// Real streaming text-world learner/observability sidecar for the EXISTING V17
// worker. It consumes exactly the Q/A rows already passed to the native Brain.
// This is a bounded CONTEXT-TRANSITION model, not a trained semantic xD engine;
// it is explicitly measured against its context-free baseline and unseen text.
// Prediction is made from the PROMPT before the answer is accessed or learned.
// It has real persistence, bounded memory, paths, alternatives, metrics and
// frozen evaluation. The original Brain/CUDA models are not replaced.
import {tokenizeObservation,renderObservation} from "../worlds/observed-transformations.mjs";

const ORDERS=[0,1,2,4,8,16];
const SEP="\u0001";
const encode=words=>words.join(SEP);
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const safe=s=>String(s??"").replace(/\r\n?/g,"\n");
const rand=initial=>()=>{initial=(Math.imul(initial,1664525)+1013904223)>>>0;return initial/4294967296;};
const fmtTokens=ts=>renderObservation(ts).slice(0,320);
const validNumber=n=>Number.isFinite(n)?n:0;

export class LiveHyperMaze {
 constructor({maxContexts=5000,maxBranches=18,maxAnswerTokens=2048,previewSteps=24,noise=0}={}){
  this.orders=ORDERS.slice();
  this.maxContexts=cap(Math.trunc(maxContexts),100,20000);
  this.maxBranches=cap(Math.trunc(maxBranches),4,64);
  this.maxAnswerTokens=cap(Math.trunc(maxAnswerTokens),64,16384);
  this.previewSteps=cap(Math.trunc(previewSteps),4,80);
  this.noise=cap(+noise||0,0,1);
  this.tables=new Map(ORDERS.map(k=>[k,new Map()]));
  this.vocabulary=new Map();
  this.stats={rows:0,observedTokens:0,scored:0,correct:0,baselineCorrect:0,
   totalSurpriseBits:0,noPrediction:0,skippedRows:0,truncatedRows:0,
   sources:{qa:0,prose:0},lastUpdateAt:null};
  this.scaleStats=new Map(ORDERS.map(k=>[k,{n:0,correct:0}]));
  this.timeline=[];
  this.last=null;
  this.version=1;
 }
 promptContext(prompt){
  return tokenizeObservation("Q: "+safe(prompt).slice(-4000)+"\nA:");
 }
 tokenData(answer){
  const tokens=tokenizeObservation(safe(answer));
  return {tokens:tokens.slice(0,this.maxAnswerTokens),total:tokens.length,
    truncated:tokens.length>this.maxAnswerTokens};
 }
 key(history,depth){return depth===0?"":encode(history.slice(-depth));}
 entry(history,depth){return this.tables.get(depth)?.get(this.key(history,depth))||null;}
 choices(history,requestedDepth=this.effectiveDepth()){
  const possibles=this.orders.filter(k=>k<=requestedDepth).sort((a,b)=>b-a);
  for(const d of possibles){
   const item=this.entry(history,d);if(!item?.total)continue;
   if(d!==0&&item.total<2)continue;
   const options=[...item.next.entries()].map(([token,count])=>
    ({token,count,p:count/item.total})).sort((a,b)=>b.count-a.count||
      a.token.localeCompare(b.token)).slice(0,this.maxBranches);
   return {depth:d,total:item.total,token:options[0]?.token??null,
     options,context:history.slice(-d)};
  }
  return {depth:-1,total:0,token:null,options:[],context:[]};
 }
 effectiveDepth(){
  if(this.stats.scored<100)return 0;
  const baseline=this.scaleStats.get(0),b=baseline.n?baseline.correct/baseline.n:0;
  let best=0,score=b;
  for(const d of ORDERS.slice(1)){
   const stat=this.scaleStats.get(d);
   if(stat.n<Math.max(80,Math.floor(this.stats.scored*.03)))continue;
   const acc=stat.correct/stat.n;
   // A longer history is only retained when it predicts better on
   // previously OBSERVED, pre-update next-token outcomes.
   const penalized=acc-0.008*Math.log2(1+d);
   if(penalized>score+0.015){best=d;score=penalized;}
  }
  return best;
 }
 compareScales(history,target){
  for(const d of ORDERS){
   const q=this.choices(history,d),s=this.scaleStats.get(d);
   if(q.token===null)continue;
   s.n++;s.correct+=+(q.token===target);
   if(s.n>=30000){s.n=Math.round(s.n*.5);s.correct=Math.round(s.correct*.5);}
  }
 }
 update(history,target){
  this.vocabulary.set(target,(this.vocabulary.get(target)||0)+1);
  for(const d of ORDERS){
   const table=this.tables.get(d),key=this.key(history,d);
   let item=table.get(key);
   if(!item){
    if(table.size>=this.maxContexts && d!==0){
      const oldest=table.keys().next().value;table.delete(oldest);
    }
    item={total:0,next:new Map()};table.set(key,item);
   }
   // Bounded options per context, with an exact denominator for retained edges.
   if(!item.next.has(target)&&item.next.size>=this.maxBranches){
    let least=null,count=Infinity;
    for(const [t,n] of item.next)if(n<count){least=t;count=n;}
    if(least!==null){item.next.delete(least);item.total-=count;}
   }
   item.next.set(target,(item.next.get(target)||0)+1);
   item.total++;
  }
 }
 preview(prompt,{steps=this.previewSteps,noise=this.noise,seed=20261107}={}){
  // Absolutely no reference answer is received by this method.
  const context=this.promptContext(prompt),history=context.slice(),path=[],rng=rand(seed);
  const count=cap(Math.trunc(steps),1,80),selectedDepth=this.effectiveDepth();
  for(let i=0;i<count;i++){
   const choice=this.choices(history,selectedDepth);
   if(choice.token===null)break;
   let next=choice.token;
   if(noise>0 && rng()<noise&&choice.options.length>1){
     const total=choice.options.reduce((a,b)=>a+b.count,0),pick=rng()*total;
     let cum=0;
     for(const alt of choice.options){cum+=alt.count;if(pick<cum){next=alt.token;break;}}
   }
   path.push({index:i,from:history.at(-1)??"<start>",to:next,
     contextDepth:choice.depth,context:choice.context.slice(),
     options:choice.options.slice(0,5).map(x=>({...x})),
     observedEdge:true,source:"previously learned textual transitions"});
   history.push(next);
  }
  return {path,words:path.map(x=>x.to),selectedDepth,
    source:"before-target-free-rollout-from-learned-context-edges",
    answerAvailable:false};
 }
 learn(prompt,answer,{episode=null,source="qa"}={}){
  if(typeof prompt!=="string"||typeof answer!=="string"||!prompt.trim()||!answer.trim()){
   this.stats.skippedRows++;return null;
  }
  // This operation must occur BEFORE reading the target token sequence.
  const prediction=this.preview(prompt,{seed:((episode||0)+20261107)>>>0});
  const observed=this.tokenData(answer),history=this.promptContext(prompt);
  const selectedDepth=prediction.selectedDepth;
  let right=0,basRight=0,errors=0,surprise=0,unknown=0;
  const frames=[];
  for(let i=0;i<observed.tokens.length;i++){
   const actual=observed.tokens[i];
   const choice=this.choices(history,selectedDepth);
   const baseline=this.choices(history,0);
   const correct=choice.token===actual;
   const same=baseline.token===actual;
   const actualCount=choice.options.find(x=>x.token===actual)?.count||0;
   const v=Math.max(1,this.vocabulary.size);
   const likelihood=choice.token===null?1/(v+1):
     (actualCount+0.5)/(choice.total+0.5*(v+1));
   const bits=-Math.log2(Math.max(1e-15,likelihood));
   if(choice.token===null)unknown++;
   right+=+correct;basRight+=+same;errors+=+!correct;surprise+=bits;
   // Evaluation strictly PRECEDES this experience's state update.
   this.compareScales(history,actual);
   this.update(history,actual);
   if(i<this.previewSteps){
    frames.push({index:i,predicted:choice.token,actual,
      correct,contextDepth:choice.depth,context:choice.context,
      surpriseBits:bits,options:choice.options.slice(0,4).map(x=>({...x})),
      before:history.slice(-Math.max(2,choice.depth))});
   }
   history.push(actual);
  }
  const n=observed.tokens.length;
  this.stats.rows++;this.stats.observedTokens+=n;this.stats.scored+=n;
  this.stats.correct+=right;this.stats.baselineCorrect+=basRight;
  this.stats.totalSurpriseBits+=surprise;this.stats.noPrediction+=unknown;
  this.stats.truncatedRows+=+observed.truncated;
  this.stats.sources[source==="qa"?"qa":"prose"]++;
  this.stats.lastUpdateAt=Date.now();
  const pred=prediction.words,actual=observed.tokens.slice(0,this.previewSteps);
  const agreement=actual.filter((t,i)=>t===pred[i]).length;
  this.last={episode:this.stats.rows,source,corpusEpisode:episode,
    prompt:safe(prompt).slice(0,260),observedAnswerPreview:fmtTokens(actual),
    predictedAnswerPreview:fmtTokens(pred),
    predictedRoute:prediction.path,observedRoute:actual,
    frames,comparedBeforeTraining:true,answerShownToModelBeforePrediction:false,
    freeRunTokenMatches:agreement,freeRunCompared:actual.length,
    teacherForcedCorrect:right,teacherForcedCompared:n,
    teacherForcedBaselineCorrect:basRight,
    selectedContextDepth:selectedDepth,meanSurpriseBits:n?surprise/n:null,
    outputWasTruncated:observed.truncated,
    totalAnswerTokens:observed.total,
    time:this.stats.lastUpdateAt};
  this.timeline.push({at:this.stats.lastUpdateAt,rows:this.stats.rows,
    scored:this.stats.scored,accuracy:n?right/n:0,baseline:n?basRight/n:0,
    freeRunAccuracy:actual.length?agreement/actual.length:0,
    meanSurpriseBits:n?surprise/n:null,contextDepth:this.effectiveDepth(),
    learnedEdges:this.learnedEdges(),observedInputSource:source});
  if(this.timeline.length>180)this.timeline.splice(0,this.timeline.length-180);
  return this.last;
 }
 learnedEdges(){let n=0;for(const [d,table] of this.tables)if(d!==0)
   for(const item of table.values())n+=item.next.size;return n;}
 learnedStates(){return [...this.tables.entries()].reduce((n,[d,t])=>n+(d? t.size:0),0);}
 report(){
  const s=this.stats;return {enabled:true,source:"real-native-V17-corpus-sidecar",
   status:s.rows?"learning":"awaiting-first-real-training-pair",
   trainingBackend:"Node.js streaming context-transition model (CPU); original V17 CUDA remains separate",
   dataLeakageGuard:"predict first; read observed answer and update second",
   rows:s.rows,observedTokens:s.observedTokens,scoreCount:s.scored,
   nextTokenAccuracy:s.scored?s.correct/s.scored:null,
   unigramAccuracy:s.scored?s.baselineCorrect/s.scored:null,
   meanSurpriseBits:s.scored?s.totalSurpriseBits/s.scored:null,
   contextScale:this.effectiveDepth(),contextOrders:ORDERS,
   learnedStates:this.learnedStates(),learnedEdges:this.learnedEdges(),
   truncatedRows:s.truncatedRows,skippedRows:s.skippedRows,
   lastUpdateAt:s.lastUpdateAt,sourceCounts:{...s.sources},
   last:this.last,timeline:this.timeline.slice(-100),
   noSemanticXDMazeClaim:true};
 }
 evaluateFrozen(rows,{max=50}={}){
  const metrics={rows:0,tokens:0,correct:0,unigramCorrect:0,
    freeRunCompared:0,freeRunCorrect:0,examples:[],frozen:true,
    trainingRowsBefore:this.stats.rows,trainingTokensBefore:this.stats.observedTokens};
  for(const row of rows.slice(0,max)){
   const p=safe(row.prompt),a=safe(row.answer);
   if(!p||!a)continue;
   const guess=this.preview(p,{steps:Math.min(this.previewSteps,24),noise:0});
   const target=this.tokenData(a).tokens;
   const hist=this.promptContext(p),depth=this.effectiveDepth();
   let rowHits=0;
   for(const token of target){
    const q=this.choices(hist,depth),b=this.choices(hist,0);
    metrics.tokens++;rowHits+=+(q.token===token);
    metrics.correct+=+(q.token===token);
    metrics.unigramCorrect+=+(b.token===token);
    hist.push(token); // teacher-forced EVALUATION context, no model update
   }
   const capTokens=target.slice(0,guess.words.length),hits=capTokens.filter((t,i)=>t===guess.words[i]).length;
   metrics.freeRunCompared+=capTokens.length;metrics.freeRunCorrect+=hits;
   if(metrics.examples.length<5)metrics.examples.push({prompt:p.slice(0,100),
     pred:fmtTokens(guess.words.slice(0,20)),observed:fmtTokens(target.slice(0,20)),
     nextTokenCorrect:rowHits,total:target.length,freeRunMatches:hits});
   metrics.rows++;
  }
  return {...metrics,
    nextTokenAccuracy:metrics.tokens?metrics.correct/metrics.tokens:null,
    unigramAccuracy:metrics.tokens?metrics.unigramCorrect/metrics.tokens:null,
    freeRunAccuracy:metrics.freeRunCompared?metrics.freeRunCorrect/metrics.freeRunCompared:null,
    trainingRowsAfter:this.stats.rows,trainingTokensAfter:this.stats.observedTokens,
    noTrainingOnHeldout:true};
 }
 export(){
  return {version:this.version,config:{maxContexts:this.maxContexts,
    maxBranches:this.maxBranches,maxAnswerTokens:this.maxAnswerTokens,
    previewSteps:this.previewSteps,noise:this.noise},
   stats:this.stats,scaleStats:[...this.scaleStats],timeline:this.timeline,
   last:this.last,vocabulary:[...this.vocabulary],
   tables:ORDERS.map(d=>[d,[...this.tables.get(d)].map(([key,item])=>
     [key,{total:item.total,next:[...item.next]}])])};
 }
 static restore(data){
  if(!data||data.version!==1||!Array.isArray(data.tables))
   throw Error("Incompatible or missing hypermaze checkpoint");
  const m=new LiveHyperMaze(data.config||{});
  m.stats={...m.stats,...data.stats};
  m.scaleStats=new Map(data.scaleStats);
  m.timeline=Array.isArray(data.timeline)?data.timeline.slice(-180):[];
  m.last=data.last||null;m.vocabulary=new Map(data.vocabulary||[]);
  for(const [d,items] of data.tables){
    if(!m.tables.has(d))continue;
    const dst=m.tables.get(d);
    for(const [key,item] of items.slice(-m.maxContexts))dst.set(key,
      {total:item.total,next:new Map(item.next)});
  }
  return m;
 }
}
// For real frozen held-out exercise strings returned by the original
// devour.mjs heldPick() (the same source used by V17's existing evaluation).
export function parseHeldoutText(input){
 const txt=safe(input).trim();if(!txt)return null;
 const qa=/Q:\s*([\s\S]*?)\nA:\s*([\s\S]+)/i.exec(txt);
 if(qa&&qa[1].trim()&&qa[2].trim())return {prompt:qa[1].trim(),answer:qa[2].trim()};
 const chunks=txt.split(/(?<=[.!?])\s+/).filter(Boolean);
 if(chunks.length>1)return {prompt:chunks[0],answer:chunks.slice(1,4).join(" ")};
 if(txt.length<30)return null;
 const cut=Math.max(20,Math.floor(txt.length*.4));
 return {prompt:txt.slice(0,cut),answer:txt.slice(cut)};
}
