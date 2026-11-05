import {ALPHA_COARSE,CAUSAL_HORIZONS,HIGHER_COMPONENTS,LOCAL_COMPONENTS,META_COMPONENTS,WORLD_MODEL_COMPONENTS,hashValue,mean,pathGet} from "./causal-types.js";
import {
  advanceNaturalBranch,compareCurve,createInitialBranch,createMultiInterventionBranch,createReplacementBranch,
  evaluateBranchFrozen,runCoupledPair,runNaturalPair
} from "./causal-branch-runner.js";
import {analyzeTopLevelComponents,applyQandaProposalGradient,componentNames,recursivelyResolveComponent,scaleGradientComponent,sliceRemovedGradient} from "./causal-components.js";
import {defaultUtility,pairedSummary,thresholdSpeedup} from "./causal-metrics.js";
import {createOracleAnswer} from "./oracle-dataset.js";
import {interactionEffect,interactionLabel} from "./causal-interactions.js";
import {retentionFeasible} from "./retention-battery.js";
import {forwardLocal} from "./brain.js";
import {forwardHigher} from "./higher-self.js";
import {forwardMeta} from "./meta-controller.js";
import {forwardWorldModel} from "./world-model-learner.js";

function lastCurveDelta(curve){return curve?.length?Number(curve.at(-1).delta)||0:0;}
function l2(a){let q=0;for(const x of a||[])q+=(Number(x)||0)**2;return Math.sqrt(q);}
function diffL2(a,b){let q=0,n=Math.min(a?.length||0,b?.length||0);for(let i=0;i<n;i++){const d=(Number(b[i])||0)-(Number(a[i])||0);q+=d*d;}return Math.sqrt(q);}
function cosine(a,b){let ab=0,aa=0,bb=0,n=Math.min(a?.length||0,b?.length||0);for(let i=0;i<n;i++){const x=Number(a[i])||0,y=Number(b[i])||0;ab+=x*y;aa+=x*x;bb+=y*y;}return aa>0&&bb>0?ab/Math.sqrt(aa*bb):0;}
function buildChangeSignature({checkpoint,onBranch,scope,cell,contribution,experienceRecord}){
  const higher=scope==="B-higher",meta=scope==="A-meta"||scope==="B-meta",world=scope==="A-world"||scope==="B-world";
  const i=(!higher&&!meta&&!world&&scope!=="A")?(checkpoint.state.groupB.length===1?0:cell):null;
  const pre=world?(scope==="A-world"?checkpoint.state.worldModelA:checkpoint.state.worldModelB):
    (meta?(scope==="A-meta"?checkpoint.state.metaA:checkpoint.state.metaB):
    (higher?checkpoint.state.higher:(scope==="A"?checkpoint.state.groupA:checkpoint.state.groupB[i])));
  const post=world?(scope==="A-world"?onBranch.state.worldModelA:onBranch.state.worldModelB):
    (meta?(scope==="A-meta"?onBranch.state.metaA:onBranch.state.metaB):
    (higher?onBranch.state.higher:(scope==="A"?onBranch.state.groupA:onBranch.state.groupB[i])));
  const opt=world?(scope==="A-world"?checkpoint.state.worldModelAAdam:checkpoint.state.worldModelBAdam):
    (meta?null:(higher?checkpoint.state.higherAdam:(scope==="A"?checkpoint.state.groupAAdam:checkpoint.state.groupBAdam[i])));
  const names=world?WORLD_MODEL_COMPONENTS:(meta?META_COMPONENTS:(higher?HIGHER_COMPONENTS:LOCAL_COMPONENTS)),blocks=[];
  for(const name of names){
    const w0=pathGet(pre,name),w1=pathGet(post,name),g=pathGet(contribution,name),m=pathGet(opt?.m,name);
    if(!ArrayBuffer.isView(w0)||!ArrayBuffer.isView(w1))continue;
    const weightNorm=l2(w0),deltaNorm=diffL2(w0,w1),gradientNorm=ArrayBuffer.isView(g)?l2(g):0;
    blocks.push({name,weightNorm,deltaNorm,updateToWeightRatio:deltaNorm/Math.max(1e-12,weightNorm),gradientNorm,
      gradientMomentCosine:ArrayBuffer.isView(g)&&ArrayBuffer.isView(m)?cosine(g,m):0});
  }
  let behavior={};const r=experienceRecord||{};
  try{
    if(world&&r.features){
      const a=forwardWorldModel(pre,r.features),b=forwardWorldModel(post,r.features);
      behavior={wallProbabilityDrift:Math.abs((Number(a.pWall)||0)-(Number(b.pWall)||0)),logitDrift:Math.abs((Number(a.logit)||0)-(Number(b.logit)||0)),hiddenDrift:diffL2(a.h,b.h)};
    }else if(meta&&r.features){
      const a=forwardMeta(pre,r.features),b=forwardMeta(post,r.features);
      behavior={policyDriftL1:a.probs.reduce((s,x,j)=>s+Math.abs(x-(b.probs[j]||0)),0),logitDrift:diffL2(a.logits,b.logits),valueDrift:Math.abs((Number(a.value)||0)-(Number(b.value)||0))};
    }else if(higher&&r.pool){
      const hp=r.hiddenBefore||new Float64Array(pre.h),a=forwardHigher(pre,r.pool,hp),b=forwardHigher(post,r.pool,hp);
      behavior={contextDrift:diffL2(a.context,b.context),recurrentStateDrift:diffL2(a.hidden,b.hidden),predictionDrift:diffL2(a.prediction,b.prediction)};
    }else if(r.obs){
      const h=r.hiddenBefore||new Float64Array(pre.gru.stateN),hc=r.higherContext||null,opts={actionBias:r.specialistBias||null};
      const a=forwardLocal(pre,r.obs,h,hc,r.prevAction||0,r.prevReward||0,r.prevMismatch||[0,0,0],opts);
      const b=forwardLocal(post,r.obs,h,hc,r.prevAction||0,r.prevReward||0,r.prevMismatch||[0,0,0],opts);
      behavior={policyDriftL1:Array.from(a.probs).reduce((s,x,j)=>s+Math.abs(x-(b.probs[j]||0)),0),
        logitDrift:diffL2(a.logits,b.logits),bodyActivationDrift:diffL2(a.cache.bc.y,b.cache.bc.y),worldActivationDrift:diffL2(a.cache.wc.y,b.cache.wc.y),
        recurrentStateDrift:diffL2(a.hidden,b.hidden),valueDrift:Math.abs((Number(a.value)||0)-(Number(b.value)||0))};
    }
  }catch(e){behavior={measurementError:String(e?.message||e)};}
  const afterStep=world?(scope==="A-world"?Number(onBranch.state.worldModelAAdam?.step)||0:Number(onBranch.state.worldModelBAdam?.step)||0):
    (meta?0:(higher?Number(onBranch.state.higherAdam?.step)||0:(scope==="A"?Number(onBranch.state.groupAAdam?.step)||0:Number(onBranch.state.groupBAdam?.[i]?.step)||0)));
  return{kind:world?"world":(meta?"meta":(higher?"higher":"local")),optimizerStepBefore:Number(opt?.step)||0,optimizerStepAfter:afterStep,blocks,behavior};
}
export function classifyCausalCurve(curve,resolution=.01){
  if(!curve?.length)return"unresolved";
  const first=Number(curve[0].delta)||0,last=Number(curve.at(-1).delta)||0;
  const positives=curve.filter(x=>(Number(x.delta)||0)>resolution).length;
  const negatives=curve.filter(x=>(Number(x.delta)||0)<-resolution).length;
  if(Math.abs(first)<=resolution&&last>resolution)return"delayed_useful";
  if(first>resolution&&last>resolution)return"immediately_useful";
  if(first>resolution&&Math.abs(last)<=resolution)return"temporarily_useful";
  if(first>=-resolution&&last<-resolution)return"ultimately_harmful";
  if(last>resolution&&positives>0&&negatives>0)return"enabling";
  if(last<-resolution)return"interfering";
  if(positives===0&&negatives===0)return"neutral_within_resolution";
  return"unresolved";
}
function batterySpecs(battery,split=null){
  const rows=split?battery?.splits?.[split]:battery?.cases;return (rows||[]).map(x=>({...x,envId:x.caseId}));
}
function evaluateCases(branch,cases){
  return cases.map(c=>({caseId:c.caseId,capability:c.capability||c.family,mapKind:c.mapKind,
    metrics:evaluateBranchFrozen(branch,[{...c,envId:c.caseId}])}));
}
function perFamily(rows){
  const m=new Map();for(const r of rows){const k=r.capability||r.mapKind||"unknown";if(!m.has(k))m.set(k,[]);m.get(k).push(r);}
  return [...m.entries()].map(([family,xs])=>({family,delta:mean(xs.map(x=>Number(x.delta)||0)),n:xs.length}));
}
function pairedCaseDeltas(a,b){
  const bm=new Map(b.map(x=>[x.caseId,x]));return a.map(x=>{const q=bm.get(x.caseId);return{caseId:x.caseId,capability:x.capability||x.family,family:x.family||x.capability,
    success:(aMetric(x,"success")-aMetric(q,"success")),totalReward:(aMetric(x,"totalReward")-aMetric(q,"totalReward")),
    delta:defaultUtility(x.metrics)-defaultUtility(q?.metrics||{})};});
}
function aMetric(x,k){return Number(x?.metrics?.[k])||0;}
function curveWithPaired(run,experimentId,protocol){
  const base=compareCurve(run),on=new Map(run.on.map(x=>[x.horizon,x])),off=new Map(run.off.map(x=>[x.horizon,x]));
  return base.map(p=>({...p,paired:pairedSummary(on.get(p.horizon)?.cases||[],off.get(p.horizon)?.cases||[],{experimentId:experimentId+"|"+protocol,horizon:p.horizon})}));
}
function generalizationFeasibilityFromRun(run,resolution=.01){
  const a=run.on.at(-1)?.cases||[],b=run.off.at(-1)?.cases||[],d=pairedCaseDeltas(a,b),families=perFamily(d),
    failed=families.filter(x=>x.delta<-resolution);
  return{feasible:failed.length===0,failed,perFamily:families,perCase:d};
}
function bootstrapManifest(curve,protocol){
  return curve.map(p=>({protocol,horizon:p.horizon,metrics:Object.fromEntries(Object.entries(p.paired||{}).map(([k,v])=>[k,{n:v.n,ci95:v.ci95,mean:v.mean,median:v.median,sd:v.sd,min:v.min,max:v.max,positive:v.positive,negative:v.negative,zero:v.zero}]))}));
}
function alphaKey(a){return Number(a).toFixed(6);}
async function evaluateAlpha(ctx,alpha,cache){
  const key=alphaKey(alpha);if(cache.has(key))return cache.get(key);
  const candidate=createInitialBranch({...ctx,alpha}),off=createInitialBranch({...ctx,alpha:0});
  const run=runNaturalPair({onBranch:candidate,offBranch:off,horizons:[ctx.maxH],futureSpec:ctx.futureSpec,evalSpecs:ctx.selectionSpecs});
  const curve=compareCurve(run),out={alpha,utility:lastCurveDelta(curve),curve,run};cache.set(key,out);return out;
}
async function refineAlpha(ctx,coarse,{iterations=3,resolution=.025}={}){
  const cache=new Map(),rows=[];
  for(const a of coarse)rows.push(await evaluateAlpha(ctx,a,cache));
  let best=rows.slice().sort((a,b)=>b.utility-a.utility)[0],vals=rows.map(x=>x.alpha).sort((a,b)=>a-b);
  let idx=vals.indexOf(best.alpha),lo=vals[Math.max(0,idx-1)],hi=vals[Math.min(vals.length-1,idx+1)];
  for(let it=0;it<iterations&&hi-lo>resolution;it++){
    const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3,ra=await evaluateAlpha(ctx,a,cache),rb=await evaluateAlpha(ctx,b,cache);rows.push(ra,rb);
    if(ra.utility>=rb.utility)hi=b;else lo=a;
    best=[...cache.values()].sort((x,y)=>y.utility-x.utility)[0];
  }
  const unique=[...new Map(rows.map(x=>[alphaKey(x.alpha),x])).values()].sort((a,b)=>a.alpha-b.alpha);
  const close=unique.filter(x=>Math.abs(x.utility-best.utility)<=Math.max(.005,Math.abs(best.utility)*.02));
  return{tested:unique,best,interval:[Math.min(...close.map(x=>x.alpha)),Math.max(...close.map(x=>x.alpha))],stopReason:hi-lo<=resolution?"alpha_resolution":"iteration_cap"};
}
function baselineBranch(ctx){return{scope:ctx.scope,cell:ctx.cell,state:structuredClone(ctx.checkpoint.state),preHash:ctx.checkpoint.hash};}
function evaluateAlphaRetention(ctx,alpha,retentionBattery){
  const candidate=createInitialBranch({...ctx,alpha}),off=createInitialBranch({...ctx,alpha:0}),pre=baselineBranch(ctx);
  advanceNaturalBranch(candidate,ctx.futureSpec,ctx.maxH);advanceNaturalBranch(off,ctx.futureSpec,ctx.maxH);
  const cases=batterySpecs(retentionBattery),cand=evaluateCases(candidate,cases),offRows=evaluateCases(off,cases),preRows=evaluateCases(pre,cases);
  const causal=pairedCaseDeltas(cand,offRows),absolute=pairedCaseDeltas(cand,preRows),f=retentionFeasible(causal,retentionBattery);
  return{alpha,feasible:f.feasible,failed:f.failed,perCapability:causal,absoluteVsPre: absolute,causalRetention:causal};
}
function selectFeasibleAlpha(ctx,alpha,retentionBattery,measurementResolution=.01){
  const ranked=alpha.tested.slice().sort((a,b)=>b.utility-a.utility),checked=[];
  for(const row of ranked){
    const r=evaluateAlphaRetention(ctx,row.alpha,retentionBattery),g=generalizationFeasibilityFromRun(row.run,measurementResolution);
    checked.push({...row,...r,retentionFeasible:r.feasible,generalizationFeasible:g.feasible,generalizationFamilies:g.perFamily,
      failedGeneralization:g.failed,feasible:r.feasible&&g.feasible});
  }
  const selected=checked.find(x=>x.feasible);
  if(selected)return{selected,checked};
  const base=checked.find(x=>x.alpha===0);
  const zero=base||{...evaluateAlphaRetention(ctx,0,retentionBattery),alpha:0,utility:0,retentionFeasible:true,generalizationFeasible:true,feasible:true,generalizationFamilies:[],failedGeneralization:[]};
  return{selected:{...zero,alpha:0,utility:0},checked,noFeasibleNonzero:true};
}
async function measureComponentMagnitudes(contribution,kind,evaluateReplacement,betas=[0,.5,1,1.5,2]){
  const rows=[];
  for(const name of componentNames(kind)){
    const tested=[];
    for(const beta of betas){const result=await evaluateReplacement(scaleGradientComponent(contribution,name,beta));tested.push({beta,utility:result.utility});}
    const best=tested.slice().sort((a,b)=>b.utility-a.utility)[0]||{beta:1,utility:0};
    rows.push({name,tested,beta:best.beta,bestUtility:best.utility});
  }
  return rows;
}
function applyComponentBetas(contribution,rows){
  let g=structuredClone(contribution);for(const r of rows)g=scaleGradientComponent(g,r.name,r.beta);return g;
}
function harmfulLeaves(node,out=[]){
  if(node?.children?.length){for(const c of node.children)harmfulLeaves(c,out);return out;}
  if(node?.classification==="harmful")out.push({id:node.id,path:node.path,start:node.start,end:node.end});
  return out;
}
function applyHarmfulLeaves(contribution,trees){
  let g=structuredClone(contribution),removed=[];
  for(const tree of trees)for(const leaf of harmfulLeaves(tree,[])){g=sliceRemovedGradient(g,leaf.path,leaf.start,leaf.end);removed.push(leaf.id);}
  return{gradient:g,removed};
}
function contextMatrix(branch,baseline,battery){
  const rows=[];
  for(const c of battery?.splits?.selection||[]){
    const m=evaluateBranchFrozen(branch,[{...c,envId:c.caseId}]),b=evaluateBranchFrozen(baseline,[{...c,envId:c.caseId}]);
    rows.push({caseId:c.caseId,family:c.family,delta:defaultUtility(m)-defaultUtility(b),metrics:m,baselineMetrics:b});
  }
  const fam=new Map();for(const r of rows){if(!fam.has(r.family))fam.set(r.family,[]);fam.get(r.family).push(r.delta);}
  return [...fam.entries()].map(([family,x])=>({family,meanDelta:mean(x),n:x.length}));
}
function plasticityFromCurve(curve,run){
  const aulc=curve.reduce((s,x)=>s+(Number(x.delta)||0),0),last=curve.at(-1)?.delta||0;
  let slope=0;if(curve.length>1){const a=curve[0],b=curve.at(-1);slope=(b.delta-a.delta)/Math.max(1,b.horizon-a.horizon);}
  const on=(run?.on||[]).map(x=>({horizon:x.horizon,metrics:x.metrics})),off=(run?.off||[]).map(x=>({horizon:x.horizon,metrics:x.metrics}));
  const thresholdSpeedups=[.5,.75,.9].map(threshold=>({threshold,...thresholdSpeedup(on,off,threshold,m=>Number(m?.success)||0)}));
  const firstMeasured=thresholdSpeedups.find(x=>x.speedup!=null);
  return{AULC:aulc,slope,thresholdSpeedup:firstMeasured?.speedup??null,thresholdSpeedups,lastDelta:last};
}
function recommendation({classification,alpha,cleanBetter,retentionOk,generalizationOk,longDelta,noFeasibleAlpha=false}){
  if(noFeasibleAlpha||!retentionOk)return{status:"reject",reason:"hard_retention_regression"};
  if(!generalizationOk)return{status:"reject",reason:"heldout_generalization_regression"};
  if(classification==="ultimately_harmful"||classification==="interfering"||longDelta<0)return{status:"reject",reason:"negative_long_horizon"};
  if(classification==="delayed_useful"||classification==="enabling")return{status:"provisional",alpha,reason:"delayed_or_enabling"};
  if(cleanBetter)return{status:"accept_cleaned",alpha,reason:"verified_cleaned_update"};
  if(Math.abs(alpha-1)>.025)return{status:"accept_scaled",alpha,reason:"verified_alpha_response"};
  if(longDelta>0)return{status:"accept_unchanged",alpha:1,reason:"verified_positive"};
  return{status:"unresolved",alpha,reason:"within_measurement_resolution"};
}

export function finalizeRecommendationFromAnswer(answer,measurementResolution=.01){
  const a=answer||{},classification=a.wholeUpdate?.classification||"unresolved",longDelta=lastCurveDelta(a.wholeUpdate?.naturalCausalCurve||[]);
  const alpha=Number(a.recommendation?.alpha??a.magnitude?.selectedAlpha??0),selectedKind=a.recommendation?.selectedKind||a.retention?.selectedKind||a.generalization?.selectedKind||"raw";
  const cleanBetter=selectedKind==="clean",retentionOk=a.retention?.feasible===true,generalizationOk=a.generalization?.feasible===true;
  const noFeasibleAlpha=Boolean(a.magnitude?.noFeasibleNonzero)||selectedKind==="none";
  let rec=recommendation({classification,alpha,cleanBetter,retentionOk,generalizationOk,longDelta,noFeasibleAlpha});
  const edges=a.interactions?.edges||[],higher=a.interactions?.higherOrder||[],unresolved=a.interactions?.unresolvedGroups||[];
  const negativeEdges=edges.filter(x=>Number(x.effect)<-measurementResolution),positiveEdges=edges.filter(x=>Number(x.effect)>measurementResolution);
  const negativeHigher=higher.filter(x=>Number(x.effect)<-measurementResolution);
  const aulc=Number(a.plasticity?.AULC)||0,scope=[...(a.scope?.recommendedScope||[])];
  if((rec.status.startsWith("accept")||rec.status==="provisional")&&aulc<-measurementResolution){
    rec={status:"reject",alpha:rec.alpha,reason:"future_learning_regression"};
  }else if(rec.status.startsWith("accept")&&(negativeEdges.length||negativeHigher.length)){
    rec={status:"accept_context_scoped",alpha:rec.alpha,reason:"verified_but_interaction_dependent"};
  }else if(rec.status.startsWith("accept")&&unresolved.length){
    rec={status:"provisional",alpha:rec.alpha,reason:"interaction_evidence_pending"};
  }else if(rec.status.startsWith("accept")&&!scope.length){
    rec={status:"unresolved",alpha:rec.alpha,reason:"no_verified_scope"};
  }
  return{...rec,selectedKind,componentMask:structuredClone(a.recommendation?.componentMask||{removed:[]}),componentBetas:structuredClone(a.recommendation?.componentBetas||{}),scope,
    provisionalUntilHorizon:rec.status==="provisional"?(a.recommendation?.provisionalUntilHorizon??a.wholeUpdate?.naturalCausalCurve?.at(-1)?.horizon??null):null,
    interactionDependencies:{negative:negativeEdges.map(x=>x.experienceA===a.experienceId?x.experienceB:x.experienceA),positive:positiveEdges.map(x=>x.experienceA===a.experienceId?x.experienceB:x.experienceA),higherOrder:negativeHigher.map(x=>x.experiences),unresolved:unresolved.map(x=>x.experienceIds)}};
}

export async function runOracleExperiment({
  experimentId,experienceId,sourceLineage="unknown",checkpoint,scope,cell=null,
  aggregateGrad,contribution,coUpdates=null,experienceRecord=null,experienceFeatures=[],stateSignature=[],updateSignature=[],optimizerSignature=[],recentCausalHistory=[],contextId="",
  futureSpec,selectionSpecs,retentionBattery,generalizationBattery,
  horizons=CAUSAL_HORIZONS,alphaValues=ALPHA_COARSE,componentResolution=.01,measurementResolution=.01,rsiProposal=null
}){
  if(!checkpoint?.hash)throw new Error("oracle requires checkpoint");
  const maxH=Math.max(...horizons),kind=scope==="B-higher"?"higher":((scope==="A-meta"||scope==="B-meta")?"meta":((scope==="A-world"||scope==="B-world")?"world":"local"));
  const baseCtx={checkpoint,scope,cell,aggregateGrad,contribution,coUpdates,futureSpec,selectionSpecs,maxH};
  const onBranch=createInitialBranch({...baseCtx,alpha:1}),offBranch=createInitialBranch({...baseCtx,alpha:0});
  const changeSignature=buildChangeSignature({checkpoint,onBranch,scope,cell,contribution,experienceRecord});
  const coupledRun=runCoupledPair({onBranch,offBranch,horizons,futureSpec,evalSpecs:selectionSpecs});
  const naturalRun=runNaturalPair({onBranch,offBranch,horizons,futureSpec,evalSpecs:selectionSpecs});
  const coupledCurve=curveWithPaired(coupledRun,experimentId,"coupled"),naturalCurve=curveWithPaired(naturalRun,experimentId,"natural");
  const classification=classifyCausalCurve(naturalCurve,measurementResolution);

  const alpha=await refineAlpha(baseCtx,alphaValues),alphaChoice=selectFeasibleAlpha(baseCtx,alpha,retentionBattery,measurementResolution);
  const selectedAlpha=alphaChoice.selected.alpha,selectedBranch=createInitialBranch({...baseCtx,alpha:selectedAlpha});
  const selectedFuture=structuredClone(selectedBranch),selectedOff=structuredClone(offBranch);
  advanceNaturalBranch(selectedFuture,futureSpec,maxH);advanceNaturalBranch(selectedOff,futureSpec,maxH);

  const evalCache=new Map();
  const evaluateReplacement=async replacement=>{
    const key=hashValue(replacement);if(evalCache.has(key))return evalCache.get(key);
    const b=createReplacementBranch({checkpoint,scope,cell,aggregateGrad,originalContribution:contribution,replacementContribution:replacement,coUpdates});
    advanceNaturalBranch(b,futureSpec,maxH);
    const metrics=evaluateBranchFrozen(b,selectionSpecs),out={utility:defaultUtility(metrics),metrics};evalCache.set(key,out);return out;
  };
  const componentRows=await analyzeTopLevelComponents({contribution,kind,evaluateGradient:evaluateReplacement,resolution:componentResolution});
  const componentMagnitudes=await measureComponentMagnitudes(contribution,kind,evaluateReplacement);
  const recursionTrees=[];
  for(const row of componentRows){
    if(["harmful","interaction-dependent","unresolved"].includes(row.classification)){
      recursionTrees.push(await recursivelyResolveComponent({contribution,path:row.name,kind,evaluateGradient:evaluateReplacement,resolution:componentResolution,minSize:32,maxDepth:8}));
    }else recursionTrees.push({id:row.name,path:row.name,start:0,end:null,depth:0,marginal:row.marginal,only:row.only,classification:row.classification,children:[]});
  }
  const magnitudeAdjusted=applyComponentBetas(contribution,componentMagnitudes),cleaned=applyHarmfulLeaves(magnitudeAdjusted,recursionTrees);
  const cleanBranch=createReplacementBranch({checkpoint,scope,cell,aggregateGrad,originalContribution:contribution,replacementContribution:cleaned.gradient,coUpdates});
  const rawFuture=structuredClone(selectedBranch),cleanFuture=structuredClone(cleanBranch),offFuture=structuredClone(offBranch);
  advanceNaturalBranch(rawFuture,futureSpec,maxH);advanceNaturalBranch(cleanFuture,futureSpec,maxH);advanceNaturalBranch(offFuture,futureSpec,maxH);

  const retentionCases=batterySpecs(retentionBattery),retPre=evaluateCases(baselineBranch(baseCtx),retentionCases),retRaw=evaluateCases(rawFuture,retentionCases),retClean=evaluateCases(cleanFuture,retentionCases),retOff=evaluateCases(offFuture,retentionCases);
  const retRawCausal=pairedCaseDeltas(retRaw,retOff),retRawAbsolute=pairedCaseDeltas(retRaw,retPre),retRawStatus=retentionFeasible(retRawCausal,retentionBattery);
  const retCleanCausal=pairedCaseDeltas(retClean,retOff),retCleanAbsolute=pairedCaseDeltas(retClean,retPre),retCleanStatus=retentionFeasible(retCleanCausal,retentionBattery);

  const finalCases=batterySpecs(generalizationBattery,"final"),genRaw=evaluateCases(rawFuture,finalCases),genClean=evaluateCases(cleanFuture,finalCases),genOff=evaluateCases(offFuture,finalCases);
  const genRawDelta=pairedCaseDeltas(genRaw,genOff),genCleanDelta=pairedCaseDeltas(genClean,genOff);
  const rawFinal=mean(genRawDelta.map(x=>x.delta)),cleanFinal=mean(genCleanDelta.map(x=>x.delta));
  const genRawFamilies=perFamily(genRawDelta),genCleanFamilies=perFamily(genCleanDelta);
  const rawFailedGeneralization=genRawFamilies.filter(x=>x.delta<-measurementResolution),cleanFailedGeneralization=genCleanFamilies.filter(x=>x.delta<-measurementResolution);
  const rawGeneralizationOk=rawFailedGeneralization.length===0,cleanGeneralizationOk=cleanFailedGeneralization.length===0;
  const rawFeasible=retRawStatus.feasible&&rawGeneralizationOk,cleanFeasible=retCleanStatus.feasible&&cleanGeneralizationOk;
  const selectedKind=cleanFeasible&&(!rawFeasible||cleanFinal>rawFinal+measurementResolution)?"clean":(rawFeasible?"raw":(cleanFeasible?"clean":"none"));
  const cleanBetter=selectedKind==="clean";
  const selectedRetention=cleanBetter?retCleanCausal:retRawCausal,selectedRetentionAbsolute=cleanBetter?retCleanAbsolute:retRawAbsolute,selectedRetStatus=cleanBetter?retCleanStatus:retRawStatus;
  const selectedGenFamilies=cleanBetter?genCleanFamilies:genRawFamilies,selectedGenDelta=cleanBetter?genCleanDelta:genRawDelta,selectedFailedGeneralization=cleanBetter?cleanFailedGeneralization:rawFailedGeneralization;
  const selectedGeneralizationOk=selectedKind!=="none"&&selectedFailedGeneralization.length===0;

  let proposalVerification=null;
  if(rsiProposal){
    const proposalContribution=applyQandaProposalGradient(contribution,rsiProposal,kind,{harmfulThreshold:-.25});
    const pb=createReplacementBranch({checkpoint,scope,cell,aggregateGrad,originalContribution:contribution,replacementContribution:proposalContribution,coUpdates});
    const pf=structuredClone(pb);advanceNaturalBranch(pf,futureSpec,maxH);
    const proposalSelection=evaluateBranchFrozen(pf,selectionSpecs),offSelection=evaluateBranchFrozen(offFuture,selectionSpecs);
    const pr=evaluateCases(pf,retentionCases),pg=evaluateCases(pf,finalCases),prCausal=pairedCaseDeltas(pr,retOff),prAbsolute=pairedCaseDeltas(pr,retPre),pgDelta=pairedCaseDeltas(pg,genOff),prStatus=retentionFeasible(prCausal,retentionBattery);
    proposalVerification={
      selectedUtilityDelta:defaultUtility(proposalSelection)-defaultUtility(offSelection),
      retentionFeasible:prStatus.feasible,retentionAbsolute:prAbsolute,retentionCausal:prCausal,
      finalGeneralizationDelta:mean(pgDelta.map(x=>x.delta)),generalization:pgDelta,
      proposalContributionHash:hashValue(proposalContribution)
    };
  }

  const finalScopeBranch=cleanBetter?cleanFuture:selectedFuture,contextScope=contextMatrix(finalScopeBranch,selectedOff,generalizationBattery),longDelta=lastCurveDelta(naturalCurve);
  const rec=recommendation({classification,alpha:cleanBetter?1:selectedAlpha,cleanBetter,retentionOk:selectedRetStatus.feasible,generalizationOk:selectedGeneralizationOk,longDelta,noFeasibleAlpha:alphaChoice.noFeasibleNonzero||selectedKind==="none"});
  const answer=createOracleAnswer({
    experimentId,experienceId,sourceLineage,preCheckpointHash:checkpoint.hash,normalContributionHash:hashValue(contribution),
    experienceFeatures:Array.from(experienceFeatures),stateSignature:Array.from(stateSignature),updateSignature:Array.from(updateSignature),
    optimizerSignature:Array.from(optimizerSignature),recentCausalHistory:Array.from(recentCausalHistory),contextId:String(contextId||""),changeSignature,
    wholeUpdate:{coupledCausalCurve:coupledCurve,naturalCausalCurve:naturalCurve,classification},
    magnitude:{testedAlphas:alphaChoice.checked.map(x=>({alpha:x.alpha,utility:x.utility,retentionFeasible:x.retentionFeasible,generalizationFeasible:x.generalizationFeasible,
      feasible:x.feasible,failedRetention:x.failed?.length||0,failedGeneralization:x.failedGeneralization?.map(q=>q.family)||[]})),
      selectedInterval:alpha.interval,selectedAlpha,stopReason:alpha.stopReason,noFeasibleNonzero:Boolean(alphaChoice.noFeasibleNonzero)},
    components:{
      recursionTree:recursionTrees,componentMagnitudes,
      useful:componentRows.filter(x=>x.classification==="useful").map(x=>x.name),
      harmful:componentRows.filter(x=>x.classification==="harmful").map(x=>x.name),
      neutral:componentRows.filter(x=>x.classification==="neutral-within-resolution").map(x=>x.name),
      interactionDependent:componentRows.filter(x=>x.classification==="interaction-dependent").map(x=>x.name),
      unresolved:componentRows.filter(x=>x.classification==="unresolved").map(x=>x.name),
      cleanedContributionHash:hashValue(cleaned.gradient),removed:cleaned.removed,rawFinalUtility:rawFinal,cleanFinalUtility:cleanFinal
    },
    scope:{contextEffectMatrix:contextScope,recommendedScope:contextScope.filter(x=>x.meanDelta>=-measurementResolution).map(x=>x.family)},
    retention:{batteryVersion:retentionBattery?.version||0,selectedKind,perCapability:selectedRetention,causalPerCapability:selectedRetention,absoluteVsPre:selectedRetentionAbsolute,preBaseline:retPre,offBaseline:retOff,feasible:selectedRetStatus.feasible,failed:selectedRetStatus.failed,
      raw:{causal:retRawCausal,absoluteVsPre:retRawAbsolute,feasible:retRawStatus.feasible,failed:retRawStatus.failed},clean:{causal:retCleanCausal,absoluteVsPre:retCleanAbsolute,feasible:retCleanStatus.feasible,failed:retCleanStatus.failed}},
    generalization:{batteryVersion:generalizationBattery?.version||0,selectedKind,perFamily:selectedGenFamilies,selectedPerCase:selectedGenDelta,rawPerCase:genRawDelta,cleanPerCase:genCleanDelta,feasible:selectedGeneralizationOk,failedFamilies:selectedFailedGeneralization,
      raw:{perFamily:genRawFamilies,feasible:rawGeneralizationOk,failedFamilies:rawFailedGeneralization},clean:{perFamily:genCleanFamilies,feasible:cleanGeneralizationOk,failedFamilies:cleanFailedGeneralization}},
    plasticity:plasticityFromCurve(naturalCurve,naturalRun),
    interactions:{edges:[],unresolvedGroups:[]},
    recommendation:{...rec,selectedKind,componentMask:{removed:cleaned.removed},componentBetas:Object.fromEntries(componentMagnitudes.map(x=>[x.name,x.beta])),scope:contextScope.filter(x=>x.meanDelta>=-measurementResolution).map(x=>x.family),provisionalUntilHorizon:classification==="delayed_useful"||classification==="enabling"?maxH:null},
    confidence:{measurementResolution,bootstrapIntervals:[...bootstrapManifest(coupledCurve,"coupled"),...bootstrapManifest(naturalCurve,"natural")]},
    provenance:{developmentWorlds:[futureSpec],selectionWorlds:selectionSpecs,finalWorlds:finalCases,configHash:hashValue(checkpoint.state.config)},
    rsiProposalVerification:proposalVerification
  });
  return{answer,diagnostics:{coupledRun,naturalRun,alpha:alphaChoice.checked,componentRows,componentMagnitudes,recursionTrees,retPre,retRaw,retClean,retOff,genRaw,genClean,genOff}};
}

export function runExperienceInteractionExperiment({
  checkpoint,scope,cell=null,aggregateGrad,experienceA,experienceB,coUpdates=null,futureSpec,evalSpecs,horizon=200,resolution=.01
}){
  const branch=(a,b)=>createMultiInterventionBranch({checkpoint,scope,cell,aggregateGrad,coUpdates,interventions:[
    {contribution:experienceA.contribution,alpha:a},{contribution:experienceB.contribution,alpha:b}
  ]});
  const rows={};
  for(const key of ["11","10","01","00"]){
    const x=branch(Number(key[0]),Number(key[1]));advanceNaturalBranch(x,futureSpec,horizon);rows[key]=evaluateBranchFrozen(x,evalSpecs);
  }
  const j={J11:defaultUtility(rows["11"]),J10:defaultUtility(rows["10"]),J01:defaultUtility(rows["01"]),J00:defaultUtility(rows["00"])};
  const effect=interactionEffect(j);return{experienceA:experienceA.experienceId,experienceB:experienceB.experienceId,horizon,effect,label:interactionLabel(effect,resolution),rows};
}

export function runExperienceTripleInteractionExperiment({
  checkpoint,scope,cell=null,aggregateGrad,experiences,coUpdates=null,futureSpec,evalSpecs,horizon=200,resolution=.01
}){
  if(!Array.isArray(experiences)||experiences.length!==3)throw new Error("triple interaction requires exactly three experiences");
  const rows={},utility={};
  for(let mask=0;mask<8;mask++){
    const key=mask.toString(2).padStart(3,"0"),interventions=experiences.map((x,i)=>({contribution:x.contribution,alpha:Number(key[i])}));
    const x=createMultiInterventionBranch({checkpoint,scope,cell,aggregateGrad,interventions,coUpdates});
    advanceNaturalBranch(x,futureSpec,horizon);rows[key]=evaluateBranchFrozen(x,evalSpecs);utility[key]=defaultUtility(rows[key]);
  }
  const effect=utility["111"]-utility["110"]-utility["101"]-utility["011"]+utility["100"]+utility["010"]+utility["001"]-utility["000"];
  return{experiences:experiences.map(x=>x.experienceId),order:3,horizon,effect,label:interactionLabel(effect,resolution),rows};
}
