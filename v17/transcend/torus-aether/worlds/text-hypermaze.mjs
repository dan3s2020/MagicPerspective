import {VeilAether} from "./veil-aether.mjs";
// Text Hypermaze V20: observed transition graph; no per-occurrence phrase nodes.
// Each word/punctuation symbol has one reusable node. All edges come from corpus
// observations. Prediction is measured BEFORE each document is absorbed.
// Known-goal navigation uses the V17 c=1 field V(s)=0.97*max(V(successors)).
export const textTokens = s => String(s).normalize("NFC").match(/[\p{L}\p{M}\p{N}_]+(?:['’\-][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu)||[];
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const fterm=n=>n>0?n*Math.log(n):0;
export class TextHypermaze {
 constructor({maxNodes=12000,maxEdges=120000,frameLimit=90}={}){
  if(!Number.isInteger(maxNodes)||maxNodes<8||!Number.isInteger(maxEdges)||maxEdges<8)throw Error("Bad graph budget");
  Object.assign(this,{version:1,maxNodes,maxEdges,frameLimit,documents:0,
   observedTokens:0,observedTransitions:0,skippedNewTokens:0,skippedNewEdges:0,
   onlineCorrect:0,onlineTested:0,onlineBaselineCorrect:0,onlineTransitions:0,last:null,frequentId:-1});
  this.index=new Map();this.nodes=[];this.edges=new Map();
  this.veil=new VeilAether(); // V21 opt-in contextual evidence; original model untouched
 }
 intern(token){
  const label=String(token).normalize("NFC");let id=this.index.get(label);
  if(id!==undefined)return id;
  if(this.nodes.length>=this.maxNodes){this.skippedNewTokens++;return -1;}
  id=this.nodes.length;this.index.set(label,id);
  this.nodes.push({id,label,count:0,in:0,out:0,degreeIn:0,degreeOut:0,
   outLogSum:0,bestTo:-1,bestCount:0});
  return id;
 }
 transition(a,b){
  const k=a+":"+b;let e=this.edges.get(k),fresh=!e;
  if(fresh){
   if(this.edges.size>=this.maxEdges){this.skippedNewEdges++;return false;}
   e={from:a,to:b,count:0};this.edges.set(k,e);
   this.nodes[a].degreeOut++;this.nodes[b].degreeIn++;
  }
  const node=this.nodes[a],old=e.count++;
  node.out++;node.outLogSum+=fterm(old+1)-fterm(old);
  this.nodes[b].in++;this.observedTransitions++;
  if(e.count>node.bestCount){node.bestTo=b;node.bestCount=e.count;}
  return true;
 }
 predict(token){
  const id=this.index.get(String(token).normalize("NFC"));
  return id===undefined||this.nodes[id].bestTo<0?null:this.nodes[this.nodes[id].bestTo].label;
 }
 // Frozen test over truly withheld corpus rows. NO calls to intern or transition.
 // No target answer is injected: a visible end token is supplied only for
 // a separate known-goal reachability task, analogous to the 2D target cell.
 evaluateDocuments(documents,{maxRouteSamples=3}={}){
  if(!Array.isArray(documents)||documents.some(x=>typeof x!=="string"))
   throw Error("Expected an array of withheld original text documents");
  if(!Number.isInteger(maxRouteSamples)||maxRouteSamples<0||maxRouteSamples>20)
   throw Error("Invalid route sample count");
  const before=JSON.stringify([this.documents,this.nodes.length,this.edges.size,
   this.observedTokens,this.onlineCorrect,this.onlineTested]);
  let observed=0,covered=0,hits=0,unigramHits=0,reachable=0,unknown=0;
  const samples=[],frequent=this.frequentId>=0?this.nodes[this.frequentId].label:null;
  for(const document of documents){
   const words=textTokens(document);
   for(let i=1;i<words.length;i++){
    observed++;const guess=this.predict(words[i-1]);
    if(guess!==null){covered++;hits+=Number(guess===words[i]);}
    unigramHits+=Number(frequent===words[i]);
   }
   if(samples.length<maxRouteSamples&&words.length>1){
    const path=this.plan(words[0],words.at(-1),{maxSteps:160});
    if(path.found)reachable++;else unknown++;
    samples.push({start:words[0],goal:words.at(-1),found:path.found,
     optimal:path.math?.optimal??false,residual:path.math?.maxResidual??null,
     predicted:path.path,actual:words.slice(0,90),observedWords:words.length});
   }
  }
  if(before!==JSON.stringify([this.documents,this.nodes.length,this.edges.size,
   this.observedTokens,this.onlineCorrect,this.onlineTested]))
   throw Error("Frozen test must never change learning state");
  return {frozen:true,documents:documents.length,observedTransitions:observed,
   predictionsCovered:covered,accuracy:covered?hits/covered:null,
   coverage:observed?covered/observed:null,
   baselineUnigramAccuracy:observed?unigramHits/observed:null,
   routeSamples:samples.length,routeReachable:reachable,routeUnreachable:unknown,samples,
   notes:"Accuracy is next-token observation, path success is known-goal reachability; not semantic understanding."};
 }
 // A document is an independent world observation. Its first and last symbols
 // are a visible start/goal; unseen intermediate text is withheld from planner.
 observeWorld(document,{id=null}={}){
  if(typeof document!=="string")throw Error("Expected complete original text");
  const words=textTokens(document);
  // V21: score PRE-INGEST contextual futures, then learn observed transitions.
  this.veil.observeTokens(words,{id});
  const record=this.documents<4||this.documents%20===0;
  const window=record?words.slice(0,this.frameLimit+1):[];
  const oldN=this.nodes.length,oldE=this.edges.size;
  const global=record&&window.length>=2?this.plan(window[0],window.at(-1)):null;
  const predicted=global?.found?global.path:[],frames=[];
  let correct=0,known=0,matched=0,baseline=0;
  const frequent=this.frequentId>=0?this.nodes[this.frequentId]:null;
  for(let i=1;i<words.length;i++){
   const guess=this.predict(words[i-1]),observed=words[i];
   if(guess!==null){known++;correct+=Number(guess===observed);}
   baseline+=Number(frequent?.label===observed);
   const a=this.index.get(words[i-1]),b=this.index.get(observed);
   const seen=a!==undefined&&b!==undefined&&this.edges.has(a+":"+b);
   matched+=Number(seen);
   if(record&&i<=this.frameLimit)frames.push({step:i,from:words[i-1],predictedNext:guess,
    observedNext:observed,correct:guess!==null&&guess===observed,knownEdge:seen,
    originalShapeNext:predicted[i]??null});
  }
  this.onlineCorrect+=correct;this.onlineTested+=known;
  this.onlineBaselineCorrect+=baseline;this.onlineTransitions+=Math.max(0,words.length-1);
  for(const word of words){const k=this.intern(word);if(k>=0){
   const node=this.nodes[k];node.count++;
   if(this.frequentId<0||node.count>this.nodes[this.frequentId].count)this.frequentId=k;
  }}
  for(let i=1;i<words.length;i++){
   const a=this.index.get(words[i-1]),b=this.index.get(words[i]);
   if(a!==undefined&&b!==undefined)this.transition(a,b);
  }
  this.documents++;this.observedTokens+=words.length;
  if(record)this.last={id,start:window[0]??null,goal:window.at(-1)??null,
   initialShape:predicted,actual:window,frames,goalProvidedBeforePlanning:true,
   plannedBeforeMovement:true,goalReachableBeforeLearning:!!global?.found,
   originalDistance:global?.distance??null,originalResidual:global?.math?.maxResidual??null,
   knownEdgesBeforeLearning:matched,totalSteps:Math.max(0,words.length-1),
   onlineAccuracy:known?correct/known:null,coverage:words.length>1?known/(words.length-1):null,
   baseline:words.length>1?baseline/(words.length-1):null,
   newNodes:this.nodes.length-oldN,newEdges:this.edges.size-oldE,
   source:"real corpus, captured every 20 documents; global goal supplied; predictions BEFORE this document"};
  return this.last;
 }
 // Exact V17 max-attraction Bellman equation on an observed directed graph,
 // with c=1 for passable edges. Reverse BFS is its mathematically equivalent
 // fixed-point solver for unweighted nonnegative path lengths.
 plan(start,goal,{maxSteps=160}={}){
  if(typeof start!=="string"||typeof goal!=="string")throw Error("Specify start and target symbols");
  if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>10000)throw Error("Bad path limit");
  const a=this.index.get(start),b=this.index.get(goal);
  if(a===undefined||b===undefined)return {found:false,reason:"UNKNOWN_SYMBOL",path:[],distance:null};
  const N=this.nodes.length,rev=Array.from({length:N},()=>[]),fwd=Array.from({length:N},()=>[]);
  for(const e of this.edges.values()){rev[e.to].push(e.from);fwd[e.from].push(e);}
  const dist=new Int32Array(N).fill(-1),queue=[b];dist[b]=0;
  for(let h=0;h<queue.length;h++)for(const v of rev[queue[h]])if(dist[v]<0){
   dist[v]=dist[queue[h]]+1;queue.push(v);
  }
  const V=Array.from(dist,d=>d<0?0:Math.pow(.97,d));
  let residual=0;for(let i=0;i<N;i++)if(i!==b){
   let best=0;for(const e of fwd[i])best=Math.max(best,V[e.to]);
   residual=Math.max(residual,Math.abs(V[i]-.97*best));
  }
  if(dist[a]<0)return {found:false,reason:"NO_OBSERVED_PATH",path:[],
   distance:null,math:{maxResidual:residual,reachable:queue.length}};
  const ids=[a],links=[],seen=new Set([a]);let pos=a;
  while(pos!==b&&links.length<maxSteps){
   const choices=fwd[pos].filter(e=>dist[e.to]===dist[pos]-1&&!seen.has(e.to));
   choices.sort((x,y)=>y.count-x.count||x.to-y.to);
   const e=choices[0];if(!e)break;
   links.push({from:this.nodes[pos].label,to:this.nodes[e.to].label,count:e.count,
    action:"append:"+this.nodes[e.to].label,vFrom:V[pos],vTo:V[e.to]});
   pos=e.to;ids.push(pos);seen.add(pos);
  }
  const found=pos===b;
  return {found,start,goal,reason:found?"GOAL_REACHED":"PATH_LIMIT",
   path:ids.map(id=>this.nodes[id].label),links,
   routeNodes:ids.map(id=>{const n=this.nodes[id];return {id:n.id,label:n.label,count:n.count,features:this.features(n)};}),
   distance:dist[a],truncated:!found,
   math:{maxResidual:residual,reachable:queue.length,
    optimal:found&&links.length===dist[a],strictUphill:links.every(e=>e.vTo>e.vFrom),
    pathLength:links.length,field:"V(goal)=1; V(s)=0.97 max V(successor)=0.97^d(s,goal)",
    caveat:"Shortest path in OBSERVED token-transition graph, not semantic correctness"}};
 }
 features(n){
  const entropy=n.out?Math.log(n.out)-n.outLogSum/n.out:0;
  return [Math.log1p(n.count)/12,Math.log1p(n.degreeIn)/7,
   Math.log1p(n.degreeOut)/7,entropy/7,Math.log1p(n.out)/12].map(x=>cap(x,0,1));
 }
 snapshot({maxDraw=220}={}){
  const ids=new Set(),last=this.last;
  for(const word of [...(last?.initialShape||[]),...(last?.actual||[])]) {
   const id=this.index.get(word);if(id!==undefined)ids.add(id);
  }
  for(const n of this.nodes.slice().sort((a,b)=>b.count-a.count)){
   if(ids.size>=maxDraw)break;ids.add(n.id);
  }
  const nodes=[...ids].map(id=>this.nodes[id]).filter(Boolean)
   .map(n=>({id:n.id,label:n.label,count:n.count,features:this.features(n)}));
  const edges=[...this.edges.values()].filter(e=>ids.has(e.from)&&ids.has(e.to))
   .sort((a,b)=>b.count-a.count).slice(0,1800).map(e=>[e.from,e.to,e.count]);
  return {version:1,documents:this.documents,tokens:this.observedTokens,
   nodes:this.nodes.length,edges:this.edges.size,observedTransitions:this.observedTransitions,
   skippedNewTokens:this.skippedNewTokens,skippedNewEdges:this.skippedNewEdges,
   onlinePreIngestAccuracy:this.onlineTested?this.onlineCorrect/this.onlineTested:null,
   onlinePredictions:this.onlineTested,onlineBaselineAccuracy:this.onlineTransitions?
    this.onlineBaselineCorrect/this.onlineTransitions:null,
   last,veil:this.veil.snapshot(),geometry:{axes:["frequency","in_degree","out_degree","transition_entropy","outgoing_mass"],
    isTrainedLatentManifold:false},sample:{nodes,edges}};
 }
 export(){
  return {version:1,maxNodes:this.maxNodes,maxEdges:this.maxEdges,frameLimit:this.frameLimit,
   nodes:this.nodes.map(n=>({...n})),edges:[...this.edges.values()].map(e=>({...e})),
   documents:this.documents,observedTokens:this.observedTokens,observedTransitions:this.observedTransitions,
   skippedNewTokens:this.skippedNewTokens,skippedNewEdges:this.skippedNewEdges,
   onlineCorrect:this.onlineCorrect,onlineTested:this.onlineTested,
   onlineBaselineCorrect:this.onlineBaselineCorrect,onlineTransitions:this.onlineTransitions,
   frequentId:this.frequentId,last:this.last,veil:this.veil.export()};
 }
 static restore(data){
  if(data?.version!==1||!Array.isArray(data.nodes)||!Array.isArray(data.edges))
   throw Error("Invalid graph checkpoint");
  const m=new TextHypermaze(data);m.nodes=data.nodes.map(n=>({...n}));
  m.index=new Map(m.nodes.map(n=>[n.label,n.id]));
  m.edges=new Map(data.edges.map(e=>[e.from+":"+e.to,{...e}]));
  for(const k of ["documents","observedTokens","observedTransitions","skippedNewTokens",
   "skippedNewEdges","onlineCorrect","onlineTested","onlineBaselineCorrect","onlineTransitions"])
   m[k]=data[k]||0;
  m.frequentId=Number.isInteger(data.frequentId)?data.frequentId:-1;
  m.last=data.last||null;
  m.veil=data.veil?VeilAether.restore(data.veil):new VeilAether();
  return m;
 }
}