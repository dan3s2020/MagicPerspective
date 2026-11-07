// Read-only explanation atlas over the NATIVE V17 Brain's six persistent
// text transition graphs. The learner and its action selection are unchanged.
// PRE-ACTION preview accepts a question but NO reference answer; AFTERWARD
// diagnosis sees answer characters one at a time, always BEFORE those rows
// are trained into the native Brain. Reports how previous exercises supplied
// each option and exactly which route/operator was missing or outranked.
// This does NOT turn local next-character likelihood into causal semantics.
import {ConstructedPathLearner} from "./constructed-paths.mjs";
import {tokenizeObservation} from "./observed-transformations.mjs";
import {ContextAxisNavigator} from "../../../research/text-hypermaze/context-axis-evidence.mjs";
const END=256;
const safeStr=s=>String(s??"");
const clip=(n,lo,hi)=>Math.max(lo,Math.min(hi,Math.trunc(n)||lo));
const character=c=>c===END?"<EOS>":String.fromCharCode(c);
const sourceSig=model=>({
  textRows:model.textRows,
  textChars:model.textChars,
  scaleStates:model.scales.map(g=>g.edges.size),
  observedEdges:model.scales.map(g=>g.observations)
});
export class NativeTextPathAtlas {
 constructor({maxFrames=160,maxLast=8}={}){
  this.maxFrames=clip(maxFrames,8,2048);
  this.maxLast=clip(maxLast,1,30);
  this.episodes=0;this.explainedChars=0;this.predictionHits=0;
  this.predictionMisses=0;this.freeRunExact=0;
  this.missedByReason={};this.last=null;this.recent=[];
  this.version=1;
 }
 before(model,question,{episode=null,maxOutput=80,beamWidth=3,fanOut=6,observed=null}={}){
  if(!(model instanceof ConstructedPathLearner))
    throw Error("Text atlas must inspect original native ConstructedPathLearner");
  if(typeof question!=="string"||!question.trim())
    return {ready:false,reason:"no-real-question"};
  const sourceBefore=sourceSig(model);
  const max=Math.min(clip(maxOutput,4,160),this.maxFrames);
  let candidate={predicted:"",path:[],expanded:0,finished:false};
  if(model.textRows>0)
    candidate=model.imagineText(question,{maxChars:max,beamWidth,fanOut,record:false});
  const paths=[],edges=[],selected=[],seen=new Set();
  // These are the actual NATIVE learned alternatives that the planned
  // route considered; never expand an unknown/fabricated edge.
  let prefix="";
  for(let i=0;i<candidate.path.length;i++){
    const step=candidate.path[i],opts=step.alternatives||[];
    const from=prefix;let chosen=null;
    for(const opt of opts){
      const token=character(opt.character);
      const next=opt.character===END?from:from+token;
      const e={step:i,from,to:next,action:token,
        supportWeight:opt.weight,transferableScore:opt.transferableScore,
        nativeScaleEvidence:step.scaleEvidence||[],
        chosen:opt.character===step.action,
        previouslyObservedContext:true};
      edges.push(e);
      if(e.chosen)chosen=e;
    }
    if(!chosen)break;
    selected.push(chosen);
    prefix=chosen.to;
    if(!seen.has(prefix)){seen.add(prefix);paths.push(prefix);}
  }
  const evidence=observed&&typeof observed==="object"?
    {observedSentenceCount:observed.records?.size??null,
      reusableEditOperators:observed.operators?.size??null,
      source:"same-original-brain-observed-world"}:null;
  return {ready:true,episode,question:question.slice(0,1000),
    nativeModelVersion:"V17-six-persistent-char-scales",
    sourceBefore,questionKey:ConstructedPathLearner.qkey(question),
    preActionPrediction:candidate.predicted,
    preActionPlan:candidate.path.slice(0,this.maxFrames).map(p=>({
      action:character(p.action),position:p.position,
      scaleEvidence:p.scaleEvidence,alternatives:p.alternatives
    })),
    initialShape:paths,selectedEdges:selected,alternativeEdges:edges,
    exploredBeamCandidates:candidate.expanded,
    beamWidth,fanOut,maxOutput:max,finished:candidate.finished,
    observedTransformations:evidence,
    answerProvidedToPreview:false,executionNotYetPerformed:true,
    warning:"This is original native character-path prediction. A predicted character is NOT proof of a semantic plan."};
 }
 explainObservedAnchors(observed,start){
  if(!observed?.operators?.size||!start)return null;
  const t=tokenizeObservation(start);
  const ops=[...observed.operators.values()];
  let applicable=0,blockedLeft=0,blockedRight=0,sourceMatch=0;
  for(const op of ops){
    if(op.kind!=="replace"||op.beforeLength!==t.length)continue;
    const idx=op.index;
    if(t[idx]!==op.from)continue;
    sourceMatch++;
    const left=op.left===null?idx===0:t[idx-1]===op.left;
    const right=op.right===null?idx===t.length-1:t[idx+1]===op.right;
    if(!left)blockedLeft++;
    if(!right)blockedRight++;
    if(left&&right)applicable++;
  }
  const research=new ContextAxisNavigator(observed);
  const axes=research.axisEvidence(t.length);
  return {source:"actual native observed one-edit operators",
    tokenCount:t.length,operatorsMatchingSource:sourceMatch,
    applicableWithoutRelaxation:applicable,blockedLeft,blockedRight,
    evidencedIndependenceAxes:axes.filter(x=>x.canVaryLeft||x.canVaryRight),
    proposedIntervention:research.suggestBridge(start),
    interventionIsHypothesisOnly:true,
    note:"A context anchor may forbid a path even when the transformation is in the operator atlas. Only observed bridge evidence permits a controlled release; this report never changes production rules."};
 }
 after(model,pre,answer,{observed=null,maxAnalyze=2048}={}){
  if(!pre?.ready)return {ready:false,reason:pre?.reason||"no-pre-action"};
  const before=JSON.stringify(sourceSig(model));
  if(before!==JSON.stringify(pre.sourceBefore))
    throw Error("Current training row already changed the native language model: leakage risk");
  const raw=Array.from(safeStr(answer),ch=>ch.charCodeAt(0));
  const actual=raw.filter(y=>y>=0&&y<128);
  const dropped=raw.length-actual.length;
  const analyzed=actual.slice(0,clip(maxAnalyze,1,16384));
  const frames=[],failureCounts={};
  let hits=0,missing=0,wrongRank=0;
  let literal="";
  for(let i=0;i<analyzed.length;i++){
    const y=analyzed[i],opts=model.nextCharacters(pre.question,literal,128);
    const best=opts[0],trueOption=opts.find(o=>o.character===y);
    const total=opts.reduce((s,o)=>s+o.weight,0);
    const scales=model.byScale.map((scale,index)=>{
      const state=model.textState(pre.question,literal,scale);
      const choices=model.scales[index].choices(state);
      return {scale,state,observedTransitions:choices.reduce((s,o)=>s+o.total,0),
        trueCharacterSeen:choices.some(o=>+o.action===y),
        possibleCharacters:choices.length};
    });
    const predicted=best?.character??null,correct=predicted===y;
    const reason=correct?"correct-known-transition":
      !trueOption?"missing-learned-edge-at-this-context":
      "learned-candidate-lost-to-stronger-alternative";
    if(!correct)failureCounts[reason]=(failureCounts[reason]||0)+1;
    hits+=Number(correct);missing+=Number(!trueOption);wrongRank+=Number(!!trueOption&&!correct);
    if(i<this.maxFrames)frames.push({
      position:i,actual:character(y),
      predicted:predicted===null?"<NONE>":character(predicted),
      correct,reason,
      chosenWeight:best?.weight??null,trueActionWeight:trueOption?.weight??null,
      trueActionRank:trueOption?opts.indexOf(trueOption)+1:null,
      totalCandidateActions:opts.length,
      alternatives:opts.slice(0,8).map((o,rank)=>({
        rank:rank+1,char:character(o.character),
        weight:o.weight,probability:total?o.weight/total:0,
        transferableScore:o.transferableScore})),
      evidence:scales,
      fromPrefix:literal.slice(-64),
      fromPriorEpisodes:true,
      beforeCurrentRowTraining:true
    });
    literal+=String.fromCharCode(y);
  }
  // Native EOS is an actual stored action; record it separately, after all
  // real answer bytes have been diagnosed, not as another observed character.
  const complete=analyzed.length===actual.length&&dropped===0;
  const predicted=pre.preActionPrediction??"";
  const firstDivergence=(()=>{
    for(let i=0;i<Math.max(predicted.length,actual.length);i++)
      if(predicted.charCodeAt(i)!==actual[i])return i;
    return -1;
  })();
  const fullExact=complete&&predicted===String.fromCharCode(...actual.slice(0,Math.min(actual.length,64000)))&&
    actual.length<=64000;
  const out={
    ready:true,episode:pre.episode,question:pre.question,
    nativeModel:pre.nativeModelVersion,questionKey:pre.questionKey,
    preActionPrediction:predicted,actualAnswerPreview:literal.slice(0,256),
    beforeTraining:true,referenceNotUsedForFreePrediction:true,
    teacherForcedUsesObservedPrefix:true,
    observedAnswerChars:actual.length,
    analyzedChars:analyzed.length,
    omittedAnalysisChars:Math.max(0,actual.length-analyzed.length),
    unicodeCharsOutsideNativeAscii:dropped,
    nativeRowsBefore:pre.sourceBefore.textRows,
    nativeRowsAfter:sourceSig(model).textRows,
    contextStatesBefore:pre.sourceBefore.scaleStates,
    predictedBeforeActionFrames:pre.preActionPlan,
    firstDivergence,
    freeRunExactAnswer:fullExact,
    teacherForcedCorrect:hits,
    teacherForcedTotal:analyzed.length,
    teacherForcedAccuracy:analyzed.length?hits/analyzed.length:null,
    missingEdges:missing,wrongRanking:wrongRank,failureCounts,
    initialShape:pre.initialShape,
    allPreActionCandidateEdges:pre.alternativeEdges,
    allPreActionChosenEdges:pre.selectedEdges,
    frames,framesTruncated:analyzed.length>frames.length,
    observedAnchorDiagnostics:this.explainObservedAnchors(observed,pre.question),
    suggestedNextExperiences:Object.keys(failureCounts).sort(),
    noSemanticGroundTruthClaim:true,
    at:Date.now()
  };
  if(before!==JSON.stringify(sourceSig(model)))
    throw Error("Atlas diagnosis mutated the native Brain");
  this.episodes++;this.explainedChars+=analyzed.length;
  this.predictionHits+=hits;this.predictionMisses+=analyzed.length-hits;
  this.freeRunExact+=Number(fullExact);
  for(const [name,count] of Object.entries(failureCounts))
    this.missedByReason[name]=(this.missedByReason[name]||0)+count;
  this.last=out;this.recent.push({
    episode:out.episode,question:out.question.slice(0,100),
    rowsBefore:out.nativeRowsBefore,correct:hits,total:analyzed.length,
    failureCounts,firstDivergence,
    fullExact,at:out.at
  });
  if(this.recent.length>this.maxLast)this.recent.shift();
  return out;
 }
 summary({includeLast=true}={}){
  return {version:this.version,source:"READ-ONLY explanation of the SAME V17 Brain's persistent six scale graphs",
    episodes:this.episodes,explainedChars:this.explainedChars,
    preUpdateAccuracy:this.explainedChars?this.predictionHits/this.explainedChars:null,
    freeRunExact:this.freeRunExact,
    missedByReason:{...this.missedByReason},recent:this.recent.slice(),
    last:includeLast?this.last:null,
    allPastEpisodesOnDisk:"per-brain .path-atlas.jsonl append-only training observations",
    originalNativeGraphPages:"GET /atlas-graph?scale=0..5&offset=0&limit=80",
    graphNotRebuiltHere:true};
 }
 page(model,{scale=0,offset=0,limit=80}={}){
  const i=clip(scale,0,model.scales.length-1),g=model.scales[i];
  const start=clip(offset,0,Number.MAX_SAFE_INTEGER),
    count=clip(limit,1,200),entries=[];
  let seen=0;
  // This is the entire ACTUAL native learned atlas, paged without a fake
  // 220-edge visualization cap. Each state exposes ALL its learned actions.
  for(const [from,actions] of g.edges){
    if(seen++<start)continue;
    if(entries.length>=count)break;
    entries.push({from,actions:[...actions].map(([action,dests])=>({
      action,total:[...dests.values()].reduce((a,b)=>a+b,0),
      destinations:[...dests].map(([to,observations])=>({to,observations}))}))});
  }
  return {scaleIndex:i,contextTokens:model.byScale[i],offset:start,
    returned:entries.length,totalStates:g.edges.size,
    nextOffset:start+entries.length<g.edges.size?start+entries.length:null,
    noTruncationOfOriginalGraph:true,
    entries,source:"original-native-brain-constructedPaths-scales"};
 }
}
