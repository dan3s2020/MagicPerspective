import {createRetentionBattery} from "./retention-battery.js";
import {createGeneralizationBattery,assertNoLeakage} from "./generalization-battery.js";
import {createScopeCheckpoint} from "./causal-checkpoint.js";
import {
  gradientComponentNorm,higherContribution,localContribution,metaContribution,worldContribution,reconstructHigherContributions,reconstructLocalContributions,reconstructMetaContributions,reconstructWorldContributions
} from "./causal-contributions.js";
import {ALPHA_COARSE,CAUSAL_HORIZONS,experienceId,hashValue,LOCAL_COMPONENTS,HIGHER_COMPONENTS,META_COMPONENTS,WORLD_MODEL_COMPONENTS} from "./causal-types.js";
import {finalizeRecommendationFromAnswer,runExperienceInteractionExperiment,runExperienceTripleInteractionExperiment,runOracleExperiment} from "./causal-oracle.js";
import {createOracleAnswer} from "./oracle-dataset.js";
import {ingestOracleAnswer,maybeImproveQanda,qandaProposal} from "./qanda-rsi.js";
import {oracleCausalTargetVector} from "./qanda-brsi-controller.js";
import {shouldTestPair} from "./causal-interactions.js";
import {runRecursiveQandaExperiment,verifyQandaChallengerDownstream} from "./recursive-qanda.js";

export const CAUSAL_RUNTIME_VERSION="v9-vectric4v8-causal-runtime-3";
export const DEFAULT_CAUSAL_RUNTIME_CONFIG=Object.freeze({
  enabled:true,experimentsPerBatch:0,oracleEnvironmentsPerWorker:1,reconstructionTolerance:1e-10, // experiments=0 uses all worker lanes; oracleEnvironmentsPerWorker=0 captures all envs
  maxCompleted:128,maxInteractions:256,recentContributionCap:12,maxInteractionPairsPerExperience:4,maxRecursiveFixtures:4,
  retentionCasesPerFamily:1,generalizationCasesPerFamily:1,
  componentResolution:.01,measurementResolution:.01,
  horizons:CAUSAL_HORIZONS
});
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
export function createCausalRuntimeState(overrides={}){
  const config={...DEFAULT_CAUSAL_RUNTIME_CONFIG,...overrides};
  const retentionBattery=createRetentionBattery({countPerFamily:config.retentionCasesPerFamily,version:1});
  const generalizationBattery=createGeneralizationBattery({countPerFamily:config.generalizationCasesPerFamily,version:1});assertNoLeakage(generalizationBattery);
  return{version:CAUSAL_RUNTIME_VERSION,config,queue:[],captures:{},captureReservation:null,nextCapture:1,nextExperiment:1,completed:[],interactions:[],recentContributions:[],recursiveFixtures:[],retentionBattery,generalizationBattery,last:null,errors:[]};
}
export function ensureCausalRuntime(t){
  if(!t.causal||t.causal.version!==CAUSAL_RUNTIME_VERSION)t.causal=createCausalRuntimeState(t.causal?.config||{});
  t.causal.config={...DEFAULT_CAUSAL_RUNTIME_CONFIG,...t.causal.config};
  if(!Array.isArray(t.causal.recursiveFixtures))t.causal.recursiveFixtures=[];
  if(!Object.prototype.hasOwnProperty.call(t.causal,"captureReservation"))t.causal.captureReservation=null;
  if(!t.causal.retentionBattery)t.causal.retentionBattery=createRetentionBattery({countPerFamily:t.causal.config.retentionCasesPerFamily,version:1});
  if(!t.causal.generalizationBattery)t.causal.generalizationBattery=createGeneralizationBattery({countPerFamily:t.causal.config.generalizationCasesPerFamily,version:1});
  assertNoLeakage(t.causal.generalizationBattery);return t.causal;
}
export function shouldCaptureOracleBatch(t){const c=ensureCausalRuntime(t);return c.config.enabled&&!c.captureReservation&&c.queue.length===0&&Object.keys(c.captures).length===0;}
export function reserveOracleCapture(t,owner="training"){
  const c=ensureCausalRuntime(t);if(!shouldCaptureOracleBatch(t))return null;
  const token="oracle-reservation-"+String(owner)+"-"+String(c.nextCapture)+"-"+String(c.nextExperiment);
  c.captureReservation={token,owner:String(owner),captureOrdinal:c.nextCapture,experimentOrdinal:c.nextExperiment};return token;
}
export function releaseOracleCapture(t,token){
  const c=ensureCausalRuntime(t);if(c.captureReservation?.token===token)c.captureReservation=null;return c.captureReservation;
}
export function recoverOracleCaptureReservation(t){const c=ensureCausalRuntime(t);c.captureReservation=null;return c;}
function copyGrad(x){return structuredClone(x);}
export function enqueueOracleCapture(t,{checkpointA,checkpointB,aggregateA,aggregateB,aggregateHigher,aggregateMetaA,aggregateMetaB,aggregateWorldA,aggregateWorldB,aggregateSemanticA=null,aggregateSemanticB=null,semanticEventsA=[],semanticEventsB=[],specialistEvidenceA,specialistEvidenceB,aResults,bResults,totalA,totalB,totalHigher,totalMetaA=0,totalMetaB=0,totalWorldA=0,totalWorldB=0,totalSemanticA=0,totalSemanticB=0,sourceBatchMarker=null}){
  const c=ensureCausalRuntime(t);if(!c.config.enabled)return null;
  const A=[],B=[],H=[],MA=[],MB=[],WA=[],WB=[];
  for(const ar of aResults||[]){
    const scale=1/Math.max(1,totalA),metaScale=1/Math.max(1,totalMetaA);
    for(const q of ar.oracleSequences||[])A.push({...structuredClone(q),_finalScale:scale});
    for(const q of ar.oracleMetaRecords||[])MA.push({...structuredClone(q),_finalScale:metaScale});
    for(const q of ar.oracleWorldRecords||[])WA.push({...structuredClone(q),_finalScale:(q.records?.length||0)/Math.max(1,totalWorldA)});
  }
  for(const br of bResults||[]){
    const localScale=1/Math.max(1,totalB),higherScale=1/Math.max(1,totalHigher),metaScale=1/Math.max(1,totalMetaB);
    for(const q of br.oracleSequences||[])B.push({...structuredClone(q),_finalScale:localScale});
    for(const q of br.oracleHigherRecords||[])H.push({...structuredClone(q),_finalScale:higherScale});
    for(const q of br.oracleMetaRecords||[])MB.push({...structuredClone(q),_finalScale:metaScale});
    for(const q of br.oracleWorldRecords||[])WB.push({...structuredClone(q),_finalScale:(q.records?.length||0)/Math.max(1,totalWorldB)});
  }
  if(!A.length&&!B.length&&!H.length&&!MA.length&&!MB.length&&!WA.length&&!WB.length)return null;
  const captureId="cap-"+c.nextCapture+++"-b"+t.batch;
  const cap={captureId,batch:t.batch,checkpointA:checkpointA||null,checkpointB:checkpointB||null,aggregateA:aggregateA?copyGrad(aggregateA):null,aggregateB:(aggregateB||[]).map(copyGrad),aggregateHigher:aggregateHigher?copyGrad(aggregateHigher):null,
    aggregateMetaA:aggregateMetaA?copyGrad(aggregateMetaA):null,aggregateMetaB:aggregateMetaB?copyGrad(aggregateMetaB):null,
    aggregateWorldA:aggregateWorldA?copyGrad(aggregateWorldA):null,aggregateWorldB:aggregateWorldB?copyGrad(aggregateWorldB):null,
    aggregateSemanticA:aggregateSemanticA?copyGrad(aggregateSemanticA):null,aggregateSemanticB:aggregateSemanticB?copyGrad(aggregateSemanticB):null,
    semanticEventsA:structuredClone(semanticEventsA||[]),semanticEventsB:structuredClone(semanticEventsB||[]),
    specialistEvidenceA:structuredClone(specialistEvidenceA||{}),specialistEvidenceB:structuredClone(specialistEvidenceB||{}),
    totalA,totalB,totalHigher,totalMetaA,totalMetaB,totalWorldA,totalWorldB,totalSemanticA,totalSemanticB,sourceBatchMarker,
    A,B,H,MA,MB,WA,WB,verified:{A:{},B:{},H:{},MA:{},MB:{},WA:{},WB:{}}};
  c.captures[captureId]=cap;
  for(let si=0;si<cap.A.length;si++)for(let i=0;i<cap.A[si].records.length;i++)c.queue.push({captureId,kind:"A",sequence:si,index:i});
  for(let si=0;si<cap.B.length;si++)for(let i=0;i<cap.B[si].records.length;i++)c.queue.push({captureId,kind:"B",sequence:si,index:i,cell:cap.B[si].egoId});
  for(let si=0;si<cap.H.length;si++)for(let i=0;i<cap.H[si].records.length;i++)c.queue.push({captureId,kind:"H",sequence:si,index:i});
  for(let si=0;si<cap.MA.length;si++)for(let i=0;i<cap.MA[si].records.length;i++)c.queue.push({captureId,kind:"MA",sequence:si,index:i});
  for(let si=0;si<cap.MB.length;si++)for(let i=0;i<cap.MB[si].records.length;i++)c.queue.push({captureId,kind:"MB",sequence:si,index:i});
  for(let si=0;si<cap.WA.length;si++)for(let i=0;i<cap.WA[si].records.length;i++)c.queue.push({captureId,kind:"WA",sequence:si,index:i});
  for(let si=0;si<cap.WB.length;si++)for(let i=0;i<cap.WB[si].records.length;i++)c.queue.push({captureId,kind:"WB",sequence:si,index:i});
  return{captureId,queued:c.queue.length};
}
function bModelIndex(state,cell){return state.groupB.length===1?0:cell;}
function verifySequence(cap,item,tol){
  if(item.kind==="A"){
    if(cap.verified.A[item.sequence])return;
    const seq=cap.A[item.sequence],r=reconstructLocalContributions(cap.checkpointA.state.groupA,seq.records,cap.checkpointA.state.config,{finalScale:seq._finalScale});
    if(r.residual.relativeL2>tol)throw new Error("A contribution reconstruction failed "+r.residual.relativeL2);cap.verified.A[item.sequence]=r.residual;
  }else if(item.kind==="B"){
    if(cap.verified.B[item.sequence])return;
    const seq=cap.B[item.sequence],mi=bModelIndex(cap.checkpointB.state,item.cell),model=cap.checkpointB.state.groupB[mi],r=reconstructLocalContributions(model,seq.records,cap.checkpointB.state.config,{finalScale:seq._finalScale});
    if(r.residual.relativeL2>tol)throw new Error("B contribution reconstruction failed "+r.residual.relativeL2);cap.verified.B[item.sequence]=r.residual;
  }else if(item.kind==="H"){
    if(cap.verified.H[item.sequence])return;
    const seq=cap.H[item.sequence],r=reconstructHigherContributions(cap.checkpointB.state.higher,seq.records,{finalScale:seq._finalScale});
    if(r.residual.relativeL2>tol)throw new Error("Higher contribution reconstruction failed "+r.residual.relativeL2);cap.verified.H[item.sequence]=r.residual;
  }else if(item.kind==="MA"||item.kind==="MB"){
    const isA=item.kind==="MA",seq=(isA?cap.MA:cap.MB)[item.sequence],state=isA?cap.checkpointA.state:cap.checkpointB.state,model=isA?state.metaA:state.metaB;
    if(cap.verified[item.kind][item.sequence])return;
    const r=reconstructMetaContributions(model,seq.records,{finalScale:seq._finalScale,gamma:state.config.metaGamma||.92,entropy:state.config.metaEntropy||.015});
    if(r.residual.relativeL2>tol)throw new Error(item.kind+" contribution reconstruction failed "+r.residual.relativeL2);cap.verified[item.kind][item.sequence]=r.residual;
  }else{
    const isA=item.kind==="WA",seq=(isA?cap.WA:cap.WB)[item.sequence],state=isA?cap.checkpointA.state:cap.checkpointB.state,model=isA?state.worldModelA:state.worldModelB;
    if(cap.verified[item.kind][item.sequence])return;
    const r=reconstructWorldContributions(model,seq.records,{finalScale:seq._finalScale});
    if(r.residual.relativeL2>tol)throw new Error(item.kind+" contribution reconstruction failed "+r.residual.relativeL2);cap.verified[item.kind][item.sequence]=r.residual;
  }
}
function contributionFor(cap,item){
  if(item.kind==="A"){const q=cap.A[item.sequence];return localContribution(cap.checkpointA.state.groupA,q.records,cap.checkpointA.state.config,item.index,q._finalScale);}
  if(item.kind==="B"){const q=cap.B[item.sequence],mi=bModelIndex(cap.checkpointB.state,item.cell);return localContribution(cap.checkpointB.state.groupB[mi],q.records,cap.checkpointB.state.config,item.index,q._finalScale);}
  if(item.kind==="H"){const q=cap.H[item.sequence];return higherContribution(cap.checkpointB.state.higher,q.records,item.index,q._finalScale);}
  if(item.kind==="MA"||item.kind==="MB"){
    const isA=item.kind==="MA",q=(isA?cap.MA:cap.MB)[item.sequence],state=isA?cap.checkpointA.state:cap.checkpointB.state,model=isA?state.metaA:state.metaB;
    return metaContribution(model,q.records,item.index,{finalScale:q._finalScale,gamma:state.config.metaGamma||.92,entropy:state.config.metaEntropy||.015});
  }
  const isA=item.kind==="WA",q=(isA?cap.WA:cap.WB)[item.sequence],state=isA?cap.checkpointA.state:cap.checkpointB.state,model=isA?state.worldModelA:state.worldModelB;
  return worldContribution(model,q.records,item.index,q._finalScale);
}
function contextFor(cap,item){
  const coA={localGrad:cap.aggregateA,localTotal:cap.totalA,metaGrad:cap.aggregateMetaA,metaTotal:cap.totalMetaA,worldGrad:cap.aggregateWorldA,worldTotal:cap.totalWorldA,semanticGrad:cap.aggregateSemanticA,semanticTotal:cap.totalSemanticA,semanticEvents:cap.semanticEventsA,specialistStats:cap.specialistEvidenceA,sourceBatchMarker:cap.sourceBatchMarker};
  const coB={localGrads:cap.aggregateB,localTotal:cap.totalB,higherGrad:cap.aggregateHigher,higherTotal:cap.totalHigher,
    metaGrad:cap.aggregateMetaB,metaTotal:cap.totalMetaB,worldGrad:cap.aggregateWorldB,worldTotal:cap.totalWorldB,semanticGrad:cap.aggregateSemanticB,semanticTotal:cap.totalSemanticB,semanticEvents:cap.semanticEventsB,specialistStats:cap.specialistEvidenceB,sourceBatchMarker:cap.sourceBatchMarker};
  if(item.kind==="A"){const q=cap.A[item.sequence],r=q.records[item.index];return{scope:"A",cell:null,seq:q,record:r,checkpoint:cap.checkpointA,aggregateGrad:cap.aggregateA,coUpdates:coA,scale:q._finalScale};}
  if(item.kind==="B"){const q=cap.B[item.sequence],r=q.records[item.index],mi=bModelIndex(cap.checkpointB.state,item.cell);return{scope:"B-cell",cell:item.cell,modelIndex:mi,seq:q,record:r,checkpoint:cap.checkpointB,aggregateGrad:cap.aggregateB[mi],coUpdates:coB,scale:q._finalScale};}
  if(item.kind==="H"){const q=cap.H[item.sequence],r=q.records[item.index];return{scope:"B-higher",cell:null,seq:q,record:r,checkpoint:cap.checkpointB,aggregateGrad:cap.aggregateHigher,coUpdates:coB,scale:q._finalScale};}
  if(item.kind==="MA"){const q=cap.MA[item.sequence],r=q.records[item.index];return{scope:"A-meta",cell:null,seq:q,record:r,checkpoint:cap.checkpointA,aggregateGrad:cap.aggregateMetaA,coUpdates:coA,scale:q._finalScale};}
  if(item.kind==="MB"){const q=cap.MB[item.sequence],r=q.records[item.index];return{scope:"B-meta",cell:null,seq:q,record:r,checkpoint:cap.checkpointB,aggregateGrad:cap.aggregateMetaB,coUpdates:coB,scale:q._finalScale};}
  if(item.kind==="WA"){const q=cap.WA[item.sequence],r=q.records[item.index];return{scope:"A-world",cell:r.cell??null,modelIndex:0,seq:q,record:r,checkpoint:cap.checkpointA,aggregateGrad:cap.aggregateWorldA,coUpdates:coA,scale:q._finalScale};}
  const q=cap.WB[item.sequence],r=q.records[item.index];return{scope:"B-world",cell:r.cell??null,modelIndex:0,seq:q,record:r,checkpoint:cap.checkpointB,aggregateGrad:cap.aggregateWorldB,coUpdates:coB,scale:q._finalScale};
}
function makeFutureSpec(t,item,ctx){
  const c=ensureCausalRuntime(t),dev=c.generalizationBattery.splits.development;
  const x=dev[(c.nextExperiment+item.index)%dev.length],swarmSize=Math.max(2,Math.floor(Number(ctx.record?.swarmSize)||Number(ctx.seq?.records?.[0]?.swarmSize)||Number(t.config.swarmSizeMax)||16));
  return{...x,envId:"future-"+x.caseId,swarmSize};
}
function selectionSpecs(c,swarmSize){return c.generalizationBattery.splits.selection.map(x=>({...x,envId:x.caseId,swarmSize}));}
function experienceFeatures(ctx){
  const r=ctx.record||{};
  if(ctx.scope.endsWith("-world")){
    const f=Array.from(r.features||[]).slice(0,14);
    return [...f,Number(r.targetWall)||0,Number(r.predicted)||0,Number(r.weight)||0,Number(r.face)||0];
  }
  return[
    Number(r.reward)||0,Number(r.advantage)||0,Number(r.return)||0,Number(r.confidence)||0,Number(r.value)||0,
    Number(r.action)||0,Number(r.prevReward)||0,Number(r.terminal?1:0),ctx.seq.records.length,ctx.seq.egoId??-1,
    Math.tanh(Math.log2(Math.max(1,Number(r.swarmSize)||16))/4),
    Math.tanh((Number(r.perspectiveD)||0)/4),
    Number(r.physicalDimensions===3?1:0),
    Number(r.conceptFlowDecision?.resistance)||0,
    Number(r.conceptFlowDecision?.affordance)||0,
    Number(r.conceptFlowDecision?.confidence)||0
  ];
}
function updateSignature(contribution,kind){
  const names=kind==="H"?HIGHER_COMPONENTS:(kind==="MA"||kind==="MB"?META_COMPONENTS:(kind==="WA"||kind==="WB"?WORLD_MODEL_COMPONENTS:LOCAL_COMPONENTS));return names.map(x=>gradientComponentNorm(contribution,x));
}
function checkpointClock(ctx){
  const s=ctx.checkpoint?.state||{},group=ctx.scope==="A"||ctx.scope==="A-meta"||ctx.scope==="A-world"?"A":(String(ctx.scope||"").startsWith("B")?"B":null),q=group?s.groupRuntime?.groups?.[group]:null;
  return{batch:q?.batch??s.batch??0,policyVersion:q?.policyVersion??s.policyVersion??0,group};
}
function stateSignature(ctx){const clock=checkpointClock(ctx);return[
  clock.batch||0,ctx.checkpoint.state.stage||0,clock.policyVersion||0,ctx.cell??-1,
  ctx.scope==="A"?1:0,ctx.scope==="B-cell"?1:0,ctx.scope==="B-higher"?1:0,
  ctx.scope.endsWith("-world")?2:(ctx.scope.endsWith("-meta")?1:0)
];}
function numericStateStats(root){
  let n=0,sum=0,sq=0,maxAbs=0;
  const walk=v=>{
    if(v==null)return;
    if(ArrayBuffer.isView(v)){for(const x of v){const q=Number(x)||0;n++;sum+=q;sq+=q*q;maxAbs=Math.max(maxAbs,Math.abs(q));}return;}
    if(Array.isArray(v)){for(const x of v)walk(x);return;}
    if(typeof v==="object"){for(const [k,x] of Object.entries(v))if(k!=="step")walk(x);}
  };
  walk(root);return[n?sum/n:0,Math.sqrt(sq),maxAbs,n];
}
function optimizerSignature(ctx){
  const s=ctx.checkpoint.state;let primary=null,replay=null;
  if(ctx.scope==="A"){primary=s.groupAAdam;replay=s.groupAReplayAdam;}
  else if(ctx.scope==="B-cell"){const i=ctx.modelIndex??ctx.cell??0;primary=s.groupBAdam?.[i];replay=s.groupBReplayAdam?.[i];}
  else if(ctx.scope==="B-higher")primary=s.higherAdam;
  else if(ctx.scope==="A-meta")primary=s.metaA;
  else if(ctx.scope==="B-meta")primary=s.metaB;
  else if(ctx.scope==="A-world")primary=s.worldModelAAdam;
  else if(ctx.scope==="B-world")primary=s.worldModelBAdam;
  const p=numericStateStats(primary),r=numericStateStats(replay);
  return[Number(primary?.step)||0,p[0],Math.log1p(p[1]),p[2],Number(replay?.step)||0,r[0],Math.log1p(r[1]),r[2]];
}
const CLASS_CODE=Object.freeze({immediately_useful:1,delayed_useful:.75,temporarily_useful:.35,enabling:.6,neutral_within_resolution:0,unresolved:0,ultimately_harmful:-1,interfering:-.75});
function recentCausalHistory(t,ctx){
  const rows=(t.causal?.completed||[]).filter(x=>String(x.sourceLineage||"").startsWith(ctx.scope)).slice(-4),out=[];
  for(const x of rows){
    const curve=x.wholeUpdate?.naturalCausalCurve||[];
    out.push(Number(curve.at(-1)?.delta)||0,Number(CLASS_CODE[x.wholeUpdate?.classification])||0);
  }
  while(out.length<8)out.unshift(0);
  return out.slice(-8);
}
function contextId(ctx){
  const r=ctx.record||{},q=ctx.seq||{};
  return [ctx.scope,q.mapKind||"unknown","N"+(r.swarmSize??q.swarmSize??q.records?.[0]?.swarmSize??"?"),"D"+(r.physicalDimensions??q.physicalDimensions??"?")].join("|");
}
function lineageFor(t,ctx){
  const clock=checkpointClock(ctx),p=clock.policyVersion??t.policyVersion??0,b=clock.batch??t.batch??0;
  return ctx.scope+(ctx.cell!=null?"["+ctx.cell+"]":"")+"-p"+p+"-b"+b;
}
function cleanupCaptureIfDone(c,captureId){
  if(c.queue.some(x=>x.captureId===captureId))return;
  delete c.captures[captureId];
}
function interactionCandidateMeta(answer,contribution,ctx){
  const curve=answer.wholeUpdate.naturalCausalCurve||[],firstOrder=curve.at(-1)?.delta||0,first=curve[0]?.delta||0;
  return{experienceId:answer.experienceId,checkpointHash:answer.preCheckpointHash,scope:ctx.scope,cell:ctx.cell,modelIndex:ctx.modelIndex??ctx.cell,contribution,firstOrder,
    signChanged:Math.sign(first)!==0&&Math.sign(firstOrder)!==0&&Math.sign(first)!==Math.sign(firstOrder),classification:answer.wholeUpdate.classification,
    tbpttSegment:[ctx.scope,ctx.seq?.envId??"?",ctx.seq?.egoId??ctx.cell??"?"].join("|"),
    contextScope:new Set(answer.scope?.recommendedScope||[]),
    usefulComponents:[...(answer.components.useful||[])],harmfulComponents:[...(answer.components.harmful||[])],
    components:[...(answer.components.useful||[]),...(answer.components.harmful||[]),...(answer.components.interactionDependent||[])]};
}
function measureInteractions(t,current,cap,ctx,futureSpec,evalSpecs){
  const c=ensureCausalRuntime(t),same=x=>x.checkpointHash===current.checkpointHash&&x.scope===current.scope&&(x.modelIndex??x.cell)===(current.modelIndex??current.cell)&&x.experienceId!==current.experienceId;
  const eligible=c.recentContributions.filter(x=>same(x)&&shouldTestPair(x,current)),capN=Math.max(1,c.config.maxInteractionPairsPerExperience);
  const candidates=eligible.slice(-capN),skipped=eligible.slice(0,Math.max(0,eligible.length-candidates.length));
  const edges=[];
  for(const prev of candidates){
    const edge=runExperienceInteractionExperiment({checkpoint:ctx.checkpoint,scope:ctx.scope,cell:ctx.cell,aggregateGrad:ctx.aggregateGrad,
      experienceA:prev,experienceB:current,coUpdates:ctx.coUpdates,futureSpec,evalSpecs,horizon:200,resolution:c.config.measurementResolution});
    edges.push(edge);c.interactions.push(edge);
  }
  let higherOrder=null;
  const interacting=edges.filter(x=>x.label!=="neutral_within_resolution");
  if(interacting.length>=2){
    const ids=new Set(interacting.slice(0,2).flatMap(x=>[x.experienceA,x.experienceB]).filter(x=>x!==current.experienceId));
    const prior=[...ids].map(id=>c.recentContributions.find(x=>x.experienceId===id)).filter(Boolean).slice(0,2);
    if(prior.length===2){
      higherOrder=runExperienceTripleInteractionExperiment({checkpoint:ctx.checkpoint,scope:ctx.scope,cell:ctx.cell,aggregateGrad:ctx.aggregateGrad,
        experiences:[prior[0],prior[1],current],coUpdates:ctx.coUpdates,futureSpec,evalSpecs,horizon:200,resolution:c.config.measurementResolution});
      c.interactions.push(higherOrder);
    }
  }
  while(c.interactions.length>c.config.maxInteractions)c.interactions.shift();
  const unresolvedGroups=skipped.map(x=>({experienceIds:[x.experienceId,current.experienceId],status:"untested_compute_cap"}));
  return{edges,higherOrder,unresolvedGroups};
}
export async function processCausalQueue(t,limit=null,oracleExecutor=null){
  const c=ensureCausalRuntime(t),n=Math.max(0,Math.floor(limit??c.config.experimentsPerBatch)),events=[],prepared=[];
  for(let k=0;k<n&&c.queue.length;k++){
    const item=c.queue.shift(),cap=c.captures[item.captureId];if(!cap)continue;
    try{
      verifySequence(cap,item,c.config.reconstructionTolerance);
      const ctx=contextFor(cap,item),contribution=contributionFor(cap,item),expId=experienceId({scope:ctx.scope,batch:cap.batch,envId:ctx.seq.envId,egoId:ctx.seq.egoId,localStep:item.index,globalActionIndex:ctx.record?.globalStep??null});
      const futureSpec=makeFutureSpec(t,item,ctx),evalSpecs=selectionSpecs(c,futureSpec.swarmSize),experimentId="oracle-"+c.nextExperiment++;
      const inputRecord={experienceId:expId,preCheckpointHash:ctx.checkpoint.hash,experienceFeatures:experienceFeatures(ctx),stateSignature:stateSignature(ctx),updateSignature:updateSignature(contribution,item.kind),
        optimizerSignature:optimizerSignature(ctx),recentCausalHistory:recentCausalHistory(t,ctx),contextId:contextId(ctx)};
      const prediction=qandaProposal(t,inputRecord),alphaValues=[...new Set([...ALPHA_COARSE,prediction.alpha].map(x=>Number(x).toFixed(6)))].map(Number).sort((a,b)=>a-b);
      const oracleArgs={experimentId,experienceId:expId,sourceLineage:lineageFor(t,ctx),checkpoint:ctx.checkpoint,scope:ctx.scope,cell:ctx.cell,
        aggregateGrad:ctx.aggregateGrad,contribution,coUpdates:ctx.coUpdates,experienceRecord:ctx.record,experienceFeatures:inputRecord.experienceFeatures,stateSignature:inputRecord.stateSignature,updateSignature:inputRecord.updateSignature,
        optimizerSignature:inputRecord.optimizerSignature,recentCausalHistory:inputRecord.recentCausalHistory,contextId:inputRecord.contextId,
        futureSpec,selectionSpecs:evalSpecs,retentionBattery:c.retentionBattery,generalizationBattery:c.generalizationBattery,alphaValues,
        horizons:c.config.horizons,componentResolution:c.config.componentResolution,measurementResolution:c.config.measurementResolution,rsiProposal:prediction};
      prepared.push({item,cap,ctx,contribution,expId,futureSpec,evalSpecs,experimentId,inputRecord,prediction,oracleArgs});
    }catch(e){
      const err={captureId:item.captureId,itemKey:[item.kind,item.sequence,item.index,item.cell==null?"":item.cell].join(":"),kind:item.kind,sequence:item.sequence,index:item.index,cell:item.cell??null,message:e?.stack||String(e)};c.errors.push(err);if(c.errors.length>64)c.errors.shift();c.last={captureId:item.captureId,itemKey:err.itemKey,error:err};events.push(c.last);cleanupCaptureIfDone(c,item.captureId);
    }
  }

  const settled=await Promise.allSettled(prepared.map(p=>oracleExecutor?oracleExecutor(p.oracleArgs):runOracleExperiment(p.oracleArgs)));
  for(let pi=0;pi<prepared.length;pi++){
    const p=prepared[pi],state=settled[pi];
    try{
      if(state.status!=="fulfilled")throw state.reason;
      const out=state.value?.answer?state.value:state.value?.oracleResult??state.value;
      if(!out?.answer)throw new Error("causal oracle worker returned no answer");
      let raw=structuredClone(out.answer);delete raw.recordHash;raw.rsiPrediction=p.prediction;
      const measuredComponents=new Map();
      const componentPrefix=p.ctx.scope==="B-higher"?"higher:":(p.ctx.scope.endsWith("-meta")?"meta:":(p.ctx.scope.endsWith("-world")?"world:":"local:"));
      for(const x of out.answer.components.useful||[])measuredComponents.set(componentPrefix+x,1);
      for(const x of out.answer.components.harmful||[])measuredComponents.set(componentPrefix+x,-1);
      const componentResiduals={};for(const [name,pred] of Object.entries(p.prediction.componentScores||{}))componentResiduals[name]=Number(pred)-Number(measuredComponents.get(name)||0);
      const measuredScope=new Set(out.answer.scope?.recommendedScope||[]);
      measuredScope.add(p.ctx.scope);
      const scopeResiduals={};for(const [name,pred] of Object.entries(p.prediction.scopeScores||{}))scopeResiduals[name]=Number(pred)-(measuredScope.has(name)?1:0);
      const measuredCurve=Array.from(oracleCausalTargetVector(out.answer));
      raw.rsiResiduals={alpha:p.prediction.alpha-out.answer.magnitude.selectedAlpha,statusMatch:
        (p.prediction.status==="accept"&&String(out.answer.recommendation.status).startsWith("accept"))||p.prediction.status===out.answer.recommendation.status,
        componentResiduals,scopeResiduals,causalResiduals:(p.prediction.causalPredictions||[]).map((x,i)=>Number(x)-Number(measuredCurve[i]||0)),
        proposalVerification:out.answer.rsiProposalVerification};
      let answer=createOracleAnswer(raw);
      const meta=interactionCandidateMeta(answer,p.contribution,p.ctx),interaction=measureInteractions(t,meta,p.cap,p.ctx,p.futureSpec,p.evalSpecs);
      {
        const q=structuredClone(answer);delete q.recordHash;q.interactions.edges=interaction.edges;
        q.interactions.higherOrder=interaction.higherOrder?[interaction.higherOrder]:[];
        q.interactions.unresolvedGroups=interaction.unresolvedGroups;
        q.recommendation=finalizeRecommendationFromAnswer(q,c.config.measurementResolution);
        answer=createOracleAnswer(q);
      }
      const fixture={inputRecord:p.inputRecord,checkpoint:structuredClone(p.ctx.checkpoint),scope:p.ctx.scope,cell:p.ctx.cell,aggregateGrad:structuredClone(p.ctx.aggregateGrad),contribution:structuredClone(p.contribution),coUpdates:structuredClone(p.ctx.coUpdates||null),
        futureSpec:structuredClone(p.futureSpec),evalSpecs:structuredClone(p.evalSpecs),horizon:200};
      c.recursiveFixtures.push(fixture);if(c.recursiveFixtures.length>c.config.maxRecursiveFixtures)c.recursiveFixtures.shift();
      ingestOracleAnswer(t,answer);
      const qTrain=maybeImproveQanda(t,false,({champion,candidate,championOpt,trainRecords,heldRecords})=>{
        const downstream=verifyQandaChallengerDownstream({champion,candidate,fixtures:c.recursiveFixtures});
        const targetIndex=Math.max(0,trainRecords.length-1);
        const recursive=runRecursiveQandaExperiment({champion,championOpt,trainRecords,targetIndex,futureRecords:heldRecords,fixtures:c.recursiveFixtures,learningRate:t.qanda.config.learningRate,
          horizons:[1,Math.min(10,heldRecords.length||1),Math.min(50,heldRecords.length||1)].filter((x,i,a)=>x>0&&a.indexOf(x)===i)});
        return{pass:downstream.pass&&recursive.pass,downstream,recursive};
      });
      c.completed.push(answer);if(c.completed.length>c.config.maxCompleted)c.completed.shift();
      c.recentContributions.push(meta);if(c.recentContributions.length>c.config.recentContributionCap)c.recentContributions.shift();
      c.last={captureId:p.item.captureId,itemKey:[p.item.kind,p.item.sequence,p.item.index,p.item.cell==null?"":p.item.cell].join(":"),kind:p.item.kind,sequence:p.item.sequence,index:p.item.index,cell:p.item.cell??null,
        experimentId:p.experimentId,experienceId:p.expId,normalContributionHash:answer.normalContributionHash,answerRecordHash:answer.recordHash,recommendation:answer.recommendation,classification:answer.wholeUpdate.classification,qTrain,edge:interaction.edges[0]||null,interactions:interaction,parallelBatch:prepared.length,
        prediction:{controllerId:p.prediction.controllerId,generation:p.prediction.generation,validation:structuredClone(p.prediction.validation||null),status:p.prediction.status,alpha:p.prediction.alpha,decisionProbs:p.prediction.decisionProbs,componentScores:p.prediction.componentScores,componentBetas:p.prediction.componentBetas,scopeScores:p.prediction.scopeScores,causalPredictions:p.prediction.causalPredictions,causalMetricPredictions:p.prediction.causalMetricPredictions},
        measured:{status:answer.recommendation.status,alpha:answer.magnitude.selectedAlpha,useful:answer.components.useful,harmful:answer.components.harmful,scope:answer.scope.recommendedScope,retentionFeasible:answer.retention.feasible},
        residuals:answer.rsiResiduals};
      events.push(c.last);
    }catch(e){
      const err={captureId:p.item.captureId,itemKey:[p.item.kind,p.item.sequence,p.item.index,p.item.cell==null?"":p.item.cell].join(":"),kind:p.item.kind,sequence:p.item.sequence,index:p.item.index,cell:p.item.cell??null,message:e?.stack||String(e)};c.errors.push(err);if(c.errors.length>64)c.errors.shift();c.last={captureId:p.item.captureId,itemKey:err.itemKey,error:err};events.push(c.last);
    }finally{cleanupCaptureIfDone(c,p.item.captureId);}
  }
  return{ran:events.length>0,events,queue:c.queue.length,captures:Object.keys(c.captures).length,last:c.last,parallelJobs:prepared.length};
}
export function causalSummary(t){
  const c=ensureCausalRuntime(t);return{version:c.version,enabled:c.config.enabled,queue:c.queue.length,captures:Object.keys(c.captures).length,completed:c.completed.length,
    interactions:c.interactions.length,last:c.last,errors:c.errors.length,retentionBattery:c.retentionBattery.hash,generalizationBattery:c.generalizationBattery.hash};
}
