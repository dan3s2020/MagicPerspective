import {EGO_COUNT} from "./config.js";
import {evaluateLocalRecord} from "./brain.js";
import {higherPredictionMse} from "./higher-self.js";

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function trim(a,n){if(a.length>n)a.splice(0,a.length-n);}
function latestSeq(a){return a.length?Number(a[a.length-1]._evidenceSeq)||0:0;}
function deterministicTake(a,n){
  if(a.length<=n)return a.slice();
  const out=[];for(let i=0;i<n;i++)out.push(a[Math.floor(i*a.length/n)]);
  return out;
}
function cloneRecord(r){return structuredClone(r);}

export function createEvidenceState(){
  return{version:1,seq:0,A:[],B:Array.from({length:EGO_COUNT},()=>[]),HigherB:[],totals:{A:0,B:0,HigherB:0}};
}
export function ensureEvidenceState(t){
  if(!t.rsiEvidence||t.rsiEvidence.version!==1)t.rsiEvidence=createEvidenceState();
  const e=t.rsiEvidence;
  if(!Array.isArray(e.B)||e.B.length!==EGO_COUNT)e.B=Array.from({length:EGO_COUNT},(_,i)=>Array.isArray(e.B?.[i])?e.B[i]:[]);
  e.A=Array.isArray(e.A)?e.A:[];e.HigherB=Array.isArray(e.HigherB)?e.HigherB:[];e.totals=e.totals||{A:0,B:0,HigherB:0};
  return e;
}
export function ingestEvidence(t,localSamples=[],higherSamples=[],cfg={}){
  const e=ensureEvidenceState(t),capA=Math.max(128,Number(cfg.evidenceCapA)||2048),capB=Math.max(64,Number(cfg.evidenceCapPerCell)||384),capH=Math.max(64,Number(cfg.evidenceCapHigher)||1024);
  for(const raw of localSamples){
    if(!raw||!(raw.obs instanceof Float64Array)||!(raw.nextObs instanceof Float64Array))continue;
    const r=cloneRecord(raw);r._evidenceSeq=++e.seq;r._evidenceBatch=t.batch;
    if(r.group==="A"){e.A.push(r);e.totals.A++;trim(e.A,capA);}
    else if(r.group==="B"&&Number.isInteger(r.egoId)&&r.egoId>=0&&r.egoId<EGO_COUNT){e.B[r.egoId].push(r);e.totals.B++;trim(e.B[r.egoId],capB);}
  }
  for(const raw of higherSamples){
    if(!raw||!(raw.pool instanceof Float64Array)||!(raw.nextPool instanceof Float64Array))continue;
    const r=cloneRecord(raw);r._evidenceSeq=++e.seq;r._evidenceBatch=t.batch;e.HigherB.push(r);e.totals.HigherB++;trim(e.HigherB,capH);
  }
  return evidenceSummary(t);
}
export function evidenceFor(t,scope,cell=null){
  const e=ensureEvidenceState(t);
  if(scope==="A")return e.A;
  if(scope==="B-cell")return e.B[Math.max(0,Math.min(EGO_COUNT-1,Number(cell)||0))];
  if(scope==="B-higher")return e.HigherB;
  return[];
}
export function clearEvidenceFor(t,scope,cell=null){
  const e=ensureEvidenceState(t);
  if(scope==="A")e.A.length=0;
  else if(scope==="B-cell")e.B[Math.max(0,Math.min(EGO_COUNT-1,Number(cell)||0))].length=0;
  else if(scope==="B-higher")e.HigherB.length=0;
}
export function evidenceSummary(t){
  const e=ensureEvidenceState(t);
  const sf=a=>({count:a.length,success:a.filter(x=>x.episodeSuccess).length,failure:a.filter(x=>!x.episodeSuccess).length,latestSeq:latestSeq(a)});
  return{A:sf(e.A),B:e.B.map(sf),HigherB:sf(e.HigherB),seq:e.seq,totals:{...e.totals}};
}

function aggregateLocal(model,records){
  const rows=records.map(r=>{
    const q=evaluateLocalRecord(model,r);
    return{r,q,accepted:Number(r.agencyTarget?.[2])>=.5,highConfReject:Number(r.confidence)>=.65&&Number(r.agencyTarget?.[2])<.5,reward:Number(r.reward)||0};
  });
  const agg=xs=>({
    n:xs.length,
    acceptRate:mean(xs.map(x=>x.accepted?1:0)),
    highConfRejectRate:mean(xs.map(x=>x.highConfReject?1:0)),
    reward:mean(xs.map(x=>x.reward)),
    ownMse:mean(xs.map(x=>x.q.ownMse)),
    worldMse:mean(xs.map(x=>x.q.worldMse)),
    agencyMse:mean(xs.map(x=>x.q.agencyMse)),
    actionProb:mean(xs.map(x=>x.q.actionProb))
  });
  const good=rows.filter(x=>x.r.episodeSuccess),bad=rows.filter(x=>!x.r.episodeSuccess);
  return{rows,success:agg(good),failure:agg(bad)};
}
function obsDistance(a,b){
  const n=Math.min(a.length,b.length);let q=0;
  for(let i=0;i<n;i++){const d=a[i]-b[i];q+=d*d;}
  return q/Math.max(1,n);
}
function actorDataset(rows,maxExamples){
  const good=rows.filter(x=>x.r.episodeSuccess&&x.accepted).sort((a,b)=>b.reward-a.reward||a.r._evidenceSeq-b.r._evidenceSeq);
  const bad=rows.filter(x=>!x.r.episodeSuccess).sort((a,b)=>(Number(b.highConfReject)-Number(a.highConfReject))||(a.reward-b.reward)||a.r._evidenceSeq-b.r._evidenceSeq);
  if(!good.length)return[];
  const corrections=[];
  const badBudget=Math.max(1,Math.floor(maxExamples*.65));
  for(const x of bad.slice(0,badBudget)){
    let pool=good.filter(g=>g.r.mapKind===x.r.mapKind);
    if(!pool.length)pool=good;
    let best=pool[0],bd=Infinity;
    for(const g of pool){const d=obsDistance(x.r.obs,g.r.obs);if(d<bd){bd=d;best=g;}}
    const rec=cloneRecord(x.r);rec.targetAction=best.r.action;rec.weight=clamp(1.5/(1+bd),.5,2.5);rec.matchedSuccessSeq=best.r._evidenceSeq;corrections.push(rec);
    if(corrections.length>=badBudget)break;
  }
  const positiveBudget=Math.max(1,maxExamples-corrections.length);
  for(const x of good.slice(0,positiveBudget)){const rec=cloneRecord(x.r);rec.targetAction=x.r.action;rec.weight=.65;corrections.push(rec);}
  return corrections.slice(0,maxExamples);
}
function predictionDataset(rows,metric,maxExamples){
  return rows.slice().sort((a,b)=>(b.q[metric]||0)-(a.q[metric]||0)||b.r._evidenceSeq-a.r._evidenceSeq).slice(0,maxExamples).map(x=>cloneRecord(x.r));
}
function controlDataset(records,n){
  return deterministicTake(records.slice().sort((a,b)=>a._evidenceSeq-b._evidenceSeq),n).map(r=>{const x=cloneRecord(r);x.targetAction=x.action;x.weight=1;return x;});
}

export function diagnoseLocalEvidence(model,records,cfg={},meta={}){
  const minS=Math.max(4,Number(cfg.minSuccessEvidence)||24),minF=Math.max(4,Number(cfg.minFailureEvidence)||24),minNew=Math.max(1,Number(cfg.minNewEvidence)||32),lastAttempt=Number(meta.lastAttemptSeq)||0;
  const success=records.filter(x=>x.episodeSuccess),failure=records.filter(x=>!x.episodeSuccess),latest=latestSeq(records),newCount=records.filter(x=>x._evidenceSeq>lastAttempt).length;
  if(success.length<minS||failure.length<minF||newCount<minNew)return{ready:false,reason:"insufficient_evidence",counts:{success:success.length,failure:failure.length,newCount,latestSeq:latest}};
  const a=aggregateLocal(model,records),d={
    highConfReject:a.failure.highConfRejectRate-a.success.highConfRejectRate,
    agency:a.failure.agencyMse-a.success.agencyMse,
    world:a.failure.worldMse-a.success.worldMse,
    own:a.failure.ownMse-a.success.ownMse,
    accept:a.success.acceptRate-a.failure.acceptRate,
    reward:a.success.reward-a.failure.reward
  };
  const threshold=Math.max(.002,Number(cfg.minContrast)||.01);
  let code="successful_action_pattern",target="actor_self",metric=null,contrast=Math.max(0,d.accept,d.highConfReject);
  if(d.highConfReject>=Math.max(.03,threshold)){code="high_confidence_rejection";target="actor_self";contrast=d.highConfReject;}
  else{
    const pred=[["agency_model_error","agencyMse",d.agency],["world_model_error","worldMse",d.world],["own_model_error","ownMse",d.own]].sort((x,y)=>y[2]-x[2])[0];
    if(pred[2]>=threshold){code=pred[0];target="prediction";metric=pred[1];contrast=pred[2];}
  }
  const maxExamples=Math.max(16,Number(cfg.targetExamples)||128);
  const dataset=target==="actor_self"?actorDataset(a.rows,maxExamples):predictionDataset(a.rows,metric,maxExamples);
  if(dataset.length<Math.min(8,maxExamples))return{ready:false,reason:"no_target_dataset",counts:{success:success.length,failure:failure.length,newCount,latestSeq:latest}};
  const control=controlDataset(records,dataset.length);
  const confidence=clamp(.5+.25*Math.min(1,(success.length+failure.length)/(minS+minF)*.5)+.25*Math.min(1,Math.max(0,contrast)/(threshold*4)),.5,.99);
  const component=target==="actor_self"?"actor + recurrent self representation":metric==="agencyMse"?"agency prediction pathway":metric==="worldMse"?"world prediction pathway":"own-state prediction pathway";
  const hypothesis=target==="actor_self"
    ?`Successful episodes show a stronger accepted-action pattern than failures; training ${component} toward matched successful actions should reduce ${code.replaceAll("_"," ")} without harming general performance.`
    :`Failed episodes show higher ${code.replaceAll("_"," ")} than successful episodes; targeted auxiliary retraining on the highest-error transitions should reduce that error and improve downstream behavior.`;
  return{ready:true,scope:meta.scope||"local",code,target,metric,component,hypothesis,confidence,contrast,counts:{success:success.length,failure:failure.length,newCount,latestSeq:latest},stats:{success:a.success,failure:a.failure,deltas:d},dataset,controlDataset:control};
}

export function diagnoseHigherEvidence(model,records,cfg={},meta={}){
  const minS=Math.max(4,Number(cfg.minHigherSuccessEvidence)||16),minF=Math.max(4,Number(cfg.minHigherFailureEvidence)||16),minNew=Math.max(1,Number(cfg.minNewEvidence)||32),lastAttempt=Number(meta.lastAttemptSeq)||0;
  const success=records.filter(x=>x.episodeSuccess),failure=records.filter(x=>!x.episodeSuccess),latest=latestSeq(records),newCount=records.filter(x=>x._evidenceSeq>lastAttempt).length;
  if(success.length<minS||failure.length<minF||newCount<minNew)return{ready:false,reason:"insufficient_evidence",counts:{success:success.length,failure:failure.length,newCount,latestSeq:latest}};
  const sErr=mean(success.map(r=>higherPredictionMse(model,r))),fErr=mean(failure.map(r=>higherPredictionMse(model,r))),contrast=fErr-sErr,maxExamples=Math.max(8,Number(cfg.higherTargetExamples)||64);
  const dataset=success.slice().sort((a,b)=>higherPredictionMse(model,a)-higherPredictionMse(model,b)||b._evidenceSeq-a._evidenceSeq).slice(0,maxExamples).map(cloneRecord);
  const control=deterministicTake(records,maxExamples).map(cloneRecord);
  return{ready:dataset.length>=8,reason:dataset.length>=8?null:"no_target_dataset",scope:"B-higher",code:"successful_coordination_dynamics",target:"higher_success_replay",component:"Higher-B recurrent context/prediction",hypothesis:"Successful episodes contain Higher-B transition dynamics that differ from failures; reinforcing those successful pooled-self transitions should improve coordination on fresh episodes.",confidence:clamp(.6+.2*Math.min(1,records.length/(minS+minF))+.2*Math.min(1,Math.max(0,contrast)/.05),.6,.99),contrast,counts:{success:success.length,failure:failure.length,newCount,latestSeq:latest},stats:{successPredictionMse:sErr,failurePredictionMse:fErr},dataset,controlDataset:control};
}


export function summarizeLocalEvidence(model,records,cfg={},meta={}){
  const minS=Math.max(1,Number(cfg.minSuccessEvidence)||24),minF=Math.max(1,Number(cfg.minFailureEvidence)||24),minNew=Math.max(1,Number(cfg.minNewEvidence)||32),lastAttempt=Number(meta.lastAttemptSeq)||0;
  const success=records.filter(x=>x.episodeSuccess),failure=records.filter(x=>!x.episodeSuccess),latest=latestSeq(records),newCount=records.filter(x=>x._evidenceSeq>lastAttempt).length;
  const a=aggregateLocal(model,records),d={
    highConfReject:a.failure.highConfRejectRate-a.success.highConfRejectRate,
    agency:a.failure.agencyMse-a.success.agencyMse,
    world:a.failure.worldMse-a.success.worldMse,
    own:a.failure.ownMse-a.success.ownMse,
    accept:a.success.acceptRate-a.failure.acceptRate,
    reward:a.success.reward-a.failure.reward
  };
  return{ready:success.length>=minS&&failure.length>=minF&&newCount>=minNew,
    counts:{total:records.length,success:success.length,failure:failure.length,newCount,latestSeq:latest},
    stats:{success:a.success,failure:a.failure,deltas:d},
    mapKinds:[...new Set(records.map(x=>x.mapKind).filter(Boolean))].length};
}

export function buildLocalIntervention(model,records,intervention,cfg={},meta={}){
  const s=summarizeLocalEvidence(model,records,cfg,meta);
  if(!s.ready)return{ready:false,reason:"insufficient_evidence",...s};
  const maxExamples=Math.max(16,Number(cfg.targetExamples)||96);
  let target,metric=null,code=intervention;
  if(intervention==="actor_self"){target="actor_self";}
  else if(intervention==="own_prediction"){target="prediction";metric="ownMse";}
  else if(intervention==="world_prediction"){target="prediction";metric="worldMse";}
  else if(intervention==="agency_prediction"){target="prediction";metric="agencyMse";}
  else return{ready:false,reason:"invalid_intervention",...s};
  const a=aggregateLocal(model,records);
  const dataset=target==="actor_self"?actorDataset(a.rows,maxExamples):predictionDataset(a.rows,metric,maxExamples);
  if(dataset.length<Math.min(8,maxExamples))return{ready:false,reason:"no_target_dataset",...s};
  const control=controlDataset(records,dataset.length);
  const component=target==="actor_self"?"actor + recurrent self representation":metric==="agencyMse"?"agency prediction pathway":metric==="worldMse"?"world prediction pathway":"own-state prediction pathway";
  return{ready:true,scope:meta.scope||"local",code,target,metric,component,
    hypothesis:"BRSI neural controller selected "+intervention+" from measured self-evidence; the intervention is accepted only if fresh verification beats the frozen champion under guardrails.",
    confidence:1,contrast:metric?s.stats.deltas[metric.replace("Mse","")]:Math.max(s.stats.deltas.accept,s.stats.deltas.highConfReject),
    counts:s.counts,stats:s.stats,dataset,controlDataset:control};
}

export function summarizeHigherEvidence(model,records,cfg={},meta={}){
  const minS=Math.max(1,Number(cfg.minHigherSuccessEvidence)||16),minF=Math.max(1,Number(cfg.minHigherFailureEvidence)||16),minNew=Math.max(1,Number(cfg.minNewEvidence)||32),lastAttempt=Number(meta.lastAttemptSeq)||0;
  const success=records.filter(x=>x.episodeSuccess),failure=records.filter(x=>!x.episodeSuccess),latest=latestSeq(records),newCount=records.filter(x=>x._evidenceSeq>lastAttempt).length;
  const sErr=mean(success.map(r=>higherPredictionMse(model,r))),fErr=mean(failure.map(r=>higherPredictionMse(model,r)));
  return{ready:success.length>=minS&&failure.length>=minF&&newCount>=minNew,
    counts:{total:records.length,success:success.length,failure:failure.length,newCount,latestSeq:latest},
    stats:{successPredictionMse:sErr,failurePredictionMse:fErr,delta:fErr-sErr},
    mapKinds:[...new Set(records.map(x=>x.mapKind).filter(Boolean))].length};
}

export function buildHigherIntervention(model,records,cfg={},meta={}){
  const s=summarizeHigherEvidence(model,records,cfg,meta);
  if(!s.ready)return{ready:false,reason:"insufficient_evidence",...s};
  const maxExamples=Math.max(8,Number(cfg.higherTargetExamples)||48);
  const success=records.filter(x=>x.episodeSuccess);
  const dataset=success.slice().sort((a,b)=>higherPredictionMse(model,a)-higherPredictionMse(model,b)||b._evidenceSeq-a._evidenceSeq).slice(0,maxExamples).map(cloneRecord);
  const control=deterministicTake(records,maxExamples).map(cloneRecord);
  if(dataset.length<8)return{ready:false,reason:"no_target_dataset",...s};
  return{ready:true,scope:"B-higher",code:"higher_success_replay",target:"higher_success_replay",
    component:"Higher-B recurrent context/prediction",
    hypothesis:"BRSI neural controller selected Higher-B successful coordination replay; promotion requires fresh verification against the frozen champion.",
    confidence:1,contrast:s.stats.delta,counts:s.counts,stats:s.stats,dataset,controlDataset:control};
}
