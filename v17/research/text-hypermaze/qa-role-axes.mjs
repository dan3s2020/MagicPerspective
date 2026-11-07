// V29: outcome-grounded Q/A role transformations in the SAME native V17 Brain.
// This module is NOT a language model or an answer decoder. It infers variable
// question->answer ACTION AXES from two real observed complete Q/A outcomes,
// then calls the original Brain's Discoverer.shapeGraph() for the entire route.
// No exact heldout answer, hidden correct goal tokens, BFS or next-char head
// participates in planning. Unknown grammar/physics => abstention.
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {createHash} from "node:crypto";
import {tokenizeObservation,renderObservation}
 from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const digest=s=>createHash("sha256").update(String(s)).digest("hex");
const chunkDigests=(tokens,width=96)=>{
 const chunks=[];
 for(let i=0;i<tokens.length;i+=width)
  chunks.push(digest(JSON.stringify(tokens.slice(i,i+width))));
 return chunks;
};
// A repeated phrase can begin at different absolute offsets in different
// texts. Select phrase anchors by token CONTENT, not by fixed offsets or
// 96-token chunk boundaries. No trained weights, LLM or next-token model.
const anchorHash=t=>{
 let h=2166136261;
 for(const c of String(t).normalize("NFC")){
  h^=c.codePointAt(0);h=Math.imul(h,16777619);
 }
 return h>>>0;
};
function observeMotifWorld(L,questionTokens,answerTokens,episode,archive=null){
 const M=L.motifGraph ||= {
  version:1,maxNodes:50000,maxEdges:90000,
  nodes:new Map(),edges:new Map(),activeSharedAnchors:0,
  sharedAnchorsEver:0,seenMotifs:0,
  physicallyVerifiedActions:0,
  sourceOnlyEdgesObserved:0,
  observedRoleBoundaries:0,
  evictedSingletons:0,evictedRepeated:0,evictedEdges:0,
  observedEpisodes:0,sourceStatus:"lexical-overlap-and-text-order, NOT verified causal transitions"
 };
 if(M.version!==1)throw Error("Unsupported long-language motif graph schema");
 M.observedEpisodes++;
 if(archive)archive.beginEpisode(episode);
 let sourceEdgeOrdinal=0;
 try {
 const ensureMotif=(tokens,at,width,role)=>{
  const words=tokens.slice(at,at+width);
  const id=String(width)+":"+digest(JSON.stringify(words));
  const archiveWitness=archive?.motif({
   id,width,role,at,example:renderObservation(words)
  })||null;
  let node=M.nodes.get(id);
  if(!node){
   while(M.nodes.size>=M.maxNodes){
    // Retain repeated cross-exercise motifs ahead of singletons whenever
    // bounded 4GB local CPU memory forces eviction. Never pretend that
    // evicted evidence is still fully represented in the active graph.
    let drop=null;
    for(const [key,candidate] of M.nodes){
     if(candidate.episodes<2){drop=key;break;}
    }
    if(drop===null)drop=M.nodes.keys().next().value;
    const stale=M.nodes.get(drop);
    if(stale.episodes>=2){M.activeSharedAnchors--;M.evictedRepeated++;}
    else M.evictedSingletons++;
    M.nodes.delete(drop);
   }
   node={scale:width,example:renderObservation(words).slice(0,110),
    roles:new Set([role]),firstEpisode:archiveWitness?.firstEpisode??episode,
    lastEpisode:episode,
    episodes:Math.max(1,archiveWitness?.episodes??1),occurrences:0};
   // Disk-backed exact match restores an old cross-exercise axis even
   // if the original 50,000-node active memory evicted the old witness.
   if(node.episodes>=2){
    M.activeSharedAnchors++;
    M.diskRecoveredSharedAnchors=(M.diskRecoveredSharedAnchors||0)+1;
    if(archive)archive.recallsAfterEviction++;
   }
   M.nodes.set(id,node);
  }else{
   node.roles.add(role);
   if(node.lastEpisode!==episode){
    node.lastEpisode=episode;node.episodes++;
    if(node.episodes===2){M.activeSharedAnchors++;M.sharedAnchorsEver++;}
   }
  }
  node.occurrences++;M.seenMotifs++;
  return id;
 };
 const connect=(from,to,role)=>{
  if(!from||!to||from===to)return;
  const k=JSON.stringify([from,to,role]);
  let e=M.edges.get(k);
  if(!e){
   while(M.edges.size>=M.maxEdges){
    M.edges.delete(M.edges.keys().next().value);
    M.evictedEdges++;
   }
   e={from,to,role,status:"SOURCE_SEQUENCE_ONLY",
    episodes:0,lastEpisode:null,count:0};
   M.edges.set(k,e);
  }
  e.count++;M.sourceOnlyEdgesObserved++;
  if(e.lastEpisode!==episode){e.episodes++;e.lastEpisode=episode;}
  archive?.edge({from,to,role,ordinal:sourceEdgeOrdinal++});
 };
 const roleScan=(tokens,role)=>{
  let prev=null,first=null,tail=null,observed=0;
  for(let i=0;i+5<=tokens.length;i++){
   if(i!==0&&(anchorHash(tokens[i])&31)!==0)continue;
   // Two learned scale-views of the SAME authentic observed words.
   // A five-token anchor may recur across unrelated 96-token passages;
   // a twelve-token motif carries more specificity but is often rare.
   for(const width of [5,12]){
    if(i+width>tokens.length)continue;
    const id=ensureMotif(tokens,i,width,role);
    if(!first)first=id;
    connect(prev,id,role+"-source-order");
    prev=id;tail=id;observed++;
   }
  }
  return {first,last:tail,observed};
 };
 const q=roleScan(questionTokens,"question");
 const a=roleScan(answerTokens,"answer");
 if(q.last&&a.first){
  // Human-question→GPT-answer adjacency is a witnessed role boundary, not
  // a learned semantic action nor a verified first-attempt solution.
  connect(q.last,a.first,"observed-qa-role-boundary");
  M.observedRoleBoundaries++;
 }
 if(archive)archive.commitEpisode();
 return {multiscaleMotifEvidence:true,
  sourceMotifsSeen:q.observed+a.observed,
  sharedCrossEpisodeAnchors:M.activeSharedAnchors,
  archiveDiskEnabled:!!archive,
  archiveDiskRetrievedPriorWitnesses:M.diskRecoveredSharedAnchors||0,
  sourceOnly:true,
  physicallyVerified:false};
 }catch(err){archive?.rollbackEpisode();throw err;}
}
const isWord=s=>/^[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*$/u.test(s);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const oneChange=(a,b)=>{
 if(a.length!==b.length)return -1;
 let at=-1;
 for(let i=0;i<a.length;i++)if(a[i]!==b[i]){
  if(at!==-1)return -1;
  at=i;
 }
 return at;
};
const key=t=>JSON.stringify(t);
const witness=(from,to)=>{
 const qi=oneChange(from.q,to.q),ai=oneChange(from.a,to.a);
 if(qi<0||ai<0)return null;
 if(!isWord(from.q[qi])||!isWord(to.q[qi]))return null;
 if(from.q[qi]!==from.a[ai]||to.q[qi]!==to.a[ai])return null;
 return {qi,ai};
};
const empty=(maxExamples=1024)=>({
 version:1,maxExamples,seen:0,trained:0,evicted:0,contradictions:0,
 examples:[],edges:[],conflicts:[]
});
export class QARoleAxes {
 constructor(state=null,{maxExamples=1024}={}){
  if(state&&state.version!==1)throw Error("Unsupported original Q/A evidence version");
  this.state=state||empty(maxExamples);
  // Runtime-only external disk adapter, NEVER serialized into Brain.v8.
  // The original evidence state/checkpoint remains the only learning Brain.
  this.diskMotifArchive=null;
 }
 attachMotifArchive(archive){
  if(archive!==null&&(!archive?.beginEpisode||!archive?.lookupMotif))
   throw Error("Disk phrase archive must support exact read/write");
  this.diskMotifArchive=archive;
  return {enabled:!!archive,originalBrain:true};
 }
 lookupPreviouslyObservedMotif(id){
  return this.diskMotifArchive?.lookupMotif(id)||null;
 }
 observe(question,answer){
  const S=this.state;S.seen++;
  const q=tokenizeObservation(question),a=tokenizeObservation(answer);
  if(q.length<3||a.length<2)
   return {learned:false,reason:"invalid-qa-role-observation",seen:S.seen};
  // The real OpenThoughts3 sample contains ~31,000–65,000 answer tokens.
  // They were previously silently excluded by this 128-token rule. For
  // long Q/A, witness ALL 96-token linked chunks in the same native Brain
  // with exact raw source hashes and a bounded active segment graph.
  // Do NOT claim these sequence observations learned general semantic
  // action physics or can reproduce an unseen long answer.
  if(q.length>128||a.length>128)
   return this._observeLong(question,answer,q,a);
  const qk=key(q),ak=key(a);
  if(S.conflicts.includes(qk))return {learned:false,reason:"known-contradiction"};
  const duplicate=S.examples.find(x=>key(x.q)===qk);
  if(duplicate){
   if(key(duplicate.a)!==ak){
    S.conflicts.push(qk);S.contradictions++;
    return {learned:false,reason:"contradictory-observed-answer"};
   }
   return {learned:false,reason:"duplicate"};
  }
  const candidate={q,a,question:String(question),answer:String(answer)};
  let compared=0;const discovered=[];
  for(let i=Math.max(0,S.examples.length-96);i<S.examples.length;i++){
   const prev=S.examples[i];
   if(prev.q.length!==q.length||prev.a.length!==a.length)continue;
   compared++;
   const w=witness(prev,candidate);
   if(w)discovered.push({...w,a:i,b:S.examples.length});
  }
  S.examples.push(candidate);S.trained++;
  S.edges.push(...discovered);
  if(S.examples.length>S.maxExamples){
   S.examples.shift();S.evicted++;
   S.edges=S.edges.filter(e=>e.a>0&&e.b>0)
    .map(e=>({...e,a:e.a-1,b:e.b-1}));
  }
  return {learned:true,seen:S.seen,trained:S.trained,
   newlyObservedAxes:discovered.length,realWitnesses:S.edges.length,
   activeQAPairs:S.examples.length};
 }
 // True source-sequential long-form role experience. This is a compressed
 // observed topology, NOT a synthetic reasoning plan or oracle goal.
 // Each digest stands for a real consecutive original 96-token window;
 // every input token has a deterministically accounted chunk position.
 _observeLong(question,answer,q,a){
  const S=this.state;
  const L=S.longForm ||= {
   episodes:0,questionTokens:0,answerTokens:0,questionChunks:0,
   answerChunks:0,observedRoleTransitions:0,
   activeChunks:0,evictedSequences:0,
   tooLongToRetainChunks:0,sequences:[],maxActiveChunks:40000
  };
  L.episodes++;L.questionTokens+=q.length;L.answerTokens+=a.length;
  const qCount=Math.ceil(q.length/96),aCount=Math.ceil(a.length/96);
  L.questionChunks+=qCount;L.answerChunks+=aCount;
  L.observedRoleTransitions+=qCount+aCount-1;
  const canStore=q.length<=120000&&a.length<=120000;
  if(!canStore){
   L.tooLongToRetainChunks++;
   return {learned:false,observed:true,roleTrajectoryLearned:false,
    reason:"real-long-answer-witness-counted-but-above-retention-cap",
    answerTokens:a.length,questionTokens:q.length,seen:S.seen};
  }
  const qs=chunkDigests(q),as=chunkDigests(a);
  const seq={questionSHA256:digest(question),answerSHA256:digest(answer),
   questionTokens:q.length,answerTokens:a.length,
   questionChunks:qs,answerChunks:as,
   roleBoundary:{from:qs.at(-1),to:as[0]},
   evidence:"observed source-sequential, NOT externally validated semantic actions"
  };
  // Memory accumulates across DIFFERENT Q/A episodes; exact 96-token
  // chunk repetition is NOT needed to discover reusable shorter anchors.
  const multiScale=observeMotifWorld(L,q,a,L.episodes,this.diskMotifArchive);
  L.sequences.push(seq);
  L.activeChunks+=qs.length+as.length;
  while(L.activeChunks>L.maxActiveChunks||L.sequences.length>96){
   const drop=L.sequences.shift();
   L.activeChunks-=drop.questionChunks.length+drop.answerChunks.length;
   L.evictedSequences++;
  }
  return {learned:false,observed:true,roleTrajectoryLearned:true,
   reason:"original-long-qa-trajectory-witnessed-without-semantic-claim",
   questionTokens:q.length,answerTokens:a.length,
   observedSequentialEdges:qCount+aCount-1,
   retainedSegmentHashes:qs.length+as.length,
   ...multiScale,seen:S.seen};
 }
 // Connected components are formed ONLY by independently witnessed
 // one-question-axis / one-answer-axis changes in complete real Q/A outcomes.
 _components(){
  const S=this.state,n=S.examples.length,parent=Array.from({length:n},(_,i)=>i);
  const root=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x};
  for(const e of S.edges)parent[root(e.a)]=root(e.b);
  const groups=new Map();
  for(let i=0;i<n;i++){const k=root(i);if(!groups.has(k))groups.set(k,[]);
    groups.get(k).push(i)}
  return [...groups.values()].filter(ids=>ids.length>=3);
 }
 _grammar(ids){
  const S=this.state,rows=ids.map(i=>S.examples[i]);
  const first=rows[0],ql=first.q.length,al=first.a.length;
  // A real contradictory outcome falsifies the entire connected
  // transformation world that used that witnessed question, not just the
  // identical input. No frozen route may depend on disputed physics.
  if(rows.some(x=>S.conflicts.includes(key(x.q))))return null;
  if(rows.some(x=>x.q.length!==ql||x.a.length!==al))return null;
  const variableQ=[],variableA=[];
  for(let i=0;i<ql;i++)if(rows.some(x=>x.q[i]!==first.q[i]))variableQ.push(i);
  for(let i=0;i<al;i++)if(rows.some(x=>x.a[i]!==first.a[i]))variableA.push(i);
  if(!variableQ.length||variableQ.length>8||
     variableQ.length!==variableA.length)return null;
  const axes=[],used=new Set();
  for(const qi of variableQ){
   const matches=variableA.filter(ai=>!used.has(ai)&&
     rows.every(x=>x.q[qi]===x.a[ai])&&
     new Set(rows.map(x=>x.q[qi])).size>=2);
   if(matches.length!==1)return null;
   const ai=matches[0],support=S.edges.filter(e=>
     ids.includes(e.a)&&ids.includes(e.b)&&e.qi===qi&&e.ai===ai).length;
   if(support<1)return null;
   used.add(ai);axes.push({qi,ai,support});
  }
  if(used.size!==variableA.length)return null;
  if(rows.some(x=>axes.some(t=>!isWord(x.q[t.qi]))))return null;
  return {ids,first,ql,al,variableQ,variableA,axes,
   questionTemplate:first.q.map((x,i)=>variableQ.includes(i)?null:x),
   answerTemplate:first.a.map((x,i)=>variableA.includes(i)?null:x)};
 }
 plan(question,brain){
  const q=tokenizeObservation(question);
  const nope=(reason,more={})=>({found:false,reason,
   fullAnswer:null,predicted:null,referenceAnswerProvided:false,
   originalPlanner:"Discoverer.shapeGraph",plannedBeforeFirstAction:true,
   goalSource:"learned-observed-question-answer-effects",...more});
  if(!brain?.disc||typeof brain.disc.shapeGraph!=="function")
   return nope("missing-original-discoverer");
  if(q.length<3||q.length>128)return nope("unsupported-query-length");
  const S=this.state;
  if(S.conflicts.includes(key(q)))return nope("contradictory-observed-question");
  if(S.examples.some(x=>equal(x.q,q)))return nope("already-observed-question-not-heldout");
  const candidates=[];
  for(const ids of this._components()){
   const g=this._grammar(ids);
   if(!g||q.length!==g.ql||
      g.questionTemplate.some((t,i)=>t!==null&&q[i]!==t))continue;
   const predicted=g.answerTemplate.slice();
   for(const axis of g.axes)predicted[axis.ai]=q[axis.qi];
   if(predicted.some(x=>typeof x!=="string"))continue;
   candidates.push({g,predicted});
  }
  if(!candidates.length)return nope("no-learned-question-answer-transformation");
  const outputs=new Set(candidates.map(x=>key(x.predicted)));
  if(outputs.size!==1)return nope("ambiguous-learned-answer-effects",
    {candidateWorlds:candidates.length});
  // Favor the best witnessed component, not the full reference answer.
  candidates.sort((a,b)=>b.g.ids.length-a.g.ids.length);
  const {g,predicted}=candidates[0];
  const start=g.first.a.slice(),axes=g.axes.filter(t=>start[t.ai]!==predicted[t.ai]);
  if(!axes.length)return nope("no-new-solution-transformation");
  if(axes.length>8)return nope("unbounded-composition");
  const count=2**axes.length,states=[],neighbors=[];
  for(let mask=0;mask<count;mask++){
   const state=start.slice();
   for(let k=0;k<axes.length;k++)if(mask&(1<<k))
    state[axes[k].ai]=predicted[axes[k].ai];
   states.push(state);neighbors.push([]);
  }
  for(let mask=0;mask<count;mask++)for(let k=0;k<axes.length;k++){
   if(mask&(1<<k))continue;
   const to=mask|(1<<k),axis=axes[k];
   neighbors[mask].push({to,action:{kind:"observed-q-a-role-binding",
    questionIndex:axis.qi,answerIndex:axis.ai,
    from:states[mask][axis.ai],to:predicted[axis.ai],
    actualObservedContrastSupport:axis.support}});
  }
  const kinds=Array(count).fill(KIND.floor);
  kinds[0]=KIND.self;kinds[count-1]=KIND.target;
  const result=brain.disc.shapeGraph(kinds,neighbors,0,{details:true,
   geometryWeight:0,edgePreference:null});
  if(!result?.targetReached)return nope("original-attraction-could-not-reach-goal");
  const path=result.path,final=renderObservation(states[count-1]);
  return {found:true,originalPlanner:"Discoverer.shapeGraph",
   goalSource:"learned-observed-question-answer-effects",
   plannedBeforeFirstAction:true,referenceAnswerProvided:false,
   goalAnswerNotPassedToPlanner:true,predicted:final,
   fullAnswer:final,sourceAnswer:renderObservation(start),
   initialShape:[renderObservation(start),...path.map(x=>renderObservation(states[x.to]))],
   values:result.values,actions:path.map(x=>x.action),
   topology:{
    originalNativeV17Graph:true,complete:true,sourceId:0,
    nodes:states.map((tokens,id)=>({
     id,text:renderObservation(tokens),depth:axes.reduce((n,_,k)=>n+Number(!!(id&(1<<k))),0),
     goal:id===count-1,kind:kinds[id],
     observed:S.examples.some(x=>equal(x.a,tokens)),
     potential:result.values[id]??null,position5D:null,
     geometryEvidence:"unavailable; learned Q/A action axes are not 5D coordinates"
    })),
    edges:neighbors.flatMap((rows,from)=>rows.map(e=>({
     from,to:e.to,kind:"observed-qa-role-effect",
     observedSupport:e.action.actualObservedContrastSupport,
     action:e.action
    }))),
    initialShapeIds:[0,...path.map(e=>e.to)],
    coordinatesAreOriginalLearned5DTorus:false,
    source:"actual learned role-binding world, original V17 attraction"
   },
   trace:path.map(x=>({from:renderObservation(states[x.from]),
    to:renderObservation(states[x.to]),action:x.action,value:x.value})),
   graph:{nodes:count,edges:neighbors.reduce((n,a)=>n+a.length,0),
    learnedAxes:g.axes.length,activeAxes:axes.length,
    actualTrainingPairs:g.ids.length,observedActionContrasts:
     g.axes.reduce((s,x)=>s+x.support,0)},
   fullAnswerExactVerifiedExternally:false,
   originalModelGrounded:true,
   internalMode:"original V17 shape over learned Q/A variable binding actions"};
 }
 execute(plan){
  if(!plan?.found)return {attempted:false,reason:"no-global-shape"};
  let t=tokenizeObservation(plan.sourceAnswer);
  const frames=[renderObservation(t)];
  for(const a of plan.actions){
   if(t[a.answerIndex]!==a.from)
    return {attempted:true,correct:false,reason:"observed-action-effect-rejected",
     actual:renderObservation(t),frames,actions:plan.actions};
   t=t.slice();t[a.answerIndex]=a.to;frames.push(renderObservation(t));
  }
  return {attempted:true,actual:renderObservation(t),frames,
   actions:plan.actions,internalMatch:renderObservation(t)===plan.predicted,
   externallyVerified:false};
 }
}
