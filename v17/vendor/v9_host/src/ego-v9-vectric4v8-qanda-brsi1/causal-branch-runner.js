import {evaluateBatch} from "./evaluate-batch.js";
import {trainLocalSequence,zeroLocalGrad,addLocalGrad,scaleGrad} from "./brain.js";
import {trainHigherSequence,zeroHigherGrad,addHigherGrad,scaleHigherGrad,higherAdamStep} from "./higher-self.js";
import {adamStep} from "./optimizer.js";
import {combineHigherGradient,combineLocalGradient,combineMetaGradient,combineWorldGradient} from "./causal-contributions.js";
import {assertCheckpointPair} from "./causal-checkpoint.js";
import {defaultUtility} from "./causal-metrics.js";
import {addMetaGrad,applyMetaGrad,scaleMetaGrad,trainMetaRecords,zeroMetaGrad} from "./meta-controller.js";
import {updateSpecialization} from "./specialization.js";
import {resolveNativeTraceHorizons} from "./predictive-causal-outcome.js";
import {addWorldGrad,applyWorldGrad} from "./world-model-learner.js";
import {applySemanticSoundModuleGrad,learnSemanticSoundModuleEvents} from "./modules/semantic-sound-registry.js";

function cfgForHorizon(cfg,h){
  const actions=Math.max(1,Math.floor(h)),c=structuredClone(cfg);
  // Oracle horizons are exact exogenous action exposures. The normal V9 adaptive
  // episode budget must not silently expand an h=10 causal horizon into >10 actions.
  c.maxGlobalActions=actions;c.mapAdaptiveActionBudget=false;c.scaleActionBudgetWithSwarm=false;
  c.computeBudgetAtN16=Math.max(Number(c.computeBudgetAtN16)||0,actions*4);return c;
}
function avgMetrics(results){
  const keys=["success","totalReward","actions","actionEfficiency","entropy","rejectRate","meanDistance","worstDistance","meanN","meanK","finalK","computeSpent","computeBudget","actionBudget","budgetScale","budgetDistance","budgetDetour","energyCapacity","energySpent","energyRemaining","energyDebt","energyEfficiency","energyPerProgress","perspectiveD","effectiveD","organCount","births","retirements","fusions","actor","value","own","world","agency","continuity"],out={};
  for(const k of keys)out[k]=0;let n=0;
  for(const r of results){const w=r.envCount||r.metrics?.envs||1;n+=w;for(const k of keys)out[k]+=(Number(r.metrics?.[k])||0)*w;}
  if(n)for(const k of keys)out[k]/=n;return out;
}
function evalA(model,meta,specialists,worldModel,semanticSoundModel,cfg,specs){return avgMetrics([evaluateBatch({group:"A",stage:specs[0]?.stage||0,envs:specs,config:cfg,policyVersion:1,batchNumber:0,training:false,captureTrace:false,sharedModel:model,privateModels:null,higherModel:null,metaModel:meta,specialistSystem:specialists,worldModel,semanticSoundModel})]);}
function evalB(models,higher,meta,specialists,worldModel,semanticSoundModel,cfg,specs){return avgMetrics([evaluateBatch({group:"B",stage:specs[0]?.stage||0,envs:specs,config:cfg,policyVersion:1,batchNumber:0,training:false,captureTrace:false,sharedModel:null,privateModels:models,higherModel:higher,metaModel:meta,specialistSystem:specialists,worldModel,semanticSoundModel})]);}
export function evaluateBranchCases(branch,evalSpecs){
  return (evalSpecs||[]).map((spec,i)=>({
    caseId:spec.caseId??spec.envId??i,capability:spec.capability||spec.family||spec.mapKind,
    family:spec.family||spec.capability||spec.mapKind,mapKind:spec.mapKind,
    metrics:evaluateBranchFrozen(branch,[spec])
  }));
}
function metricsFromCases(cases){return avgMetrics((cases||[]).map(x=>({metrics:x.metrics,envCount:1})));}

function bModelIndex(state,cell){return state.groupB.length===1?0:cell;}
function applySemanticUpdate(state,group,grad,total,events){
  const model=group==="A"?state.semanticSoundA:state.semanticSoundB;if(!model)return{changed:false};
  let changed=false;
  if(grad&&total){applySemanticSoundModuleGrad(model,structuredClone(grad),{codecLearningRate:Number(state.config.semanticSoundCodecLearningRate)||.0005,vocalLearningRate:Number(state.config.semanticSoundVocalLearningRate)||.0003,maxNorm:Number(state.config.maxGradNorm)||2});changed=true;}
  if(events?.length){learnSemanticSoundModuleEvents(model,structuredClone(events));changed=true;}
  return{changed};
}
function applySourceCoUpdates(s,scope,cell,coUpdates){
  const q=coUpdates||{},isA=String(scope).startsWith("A");
  if(isA){
    if(scope!=="A"&&q.localGrad&&q.localTotal)adamStep(s.groupA,structuredClone(q.localGrad),s.groupAAdam,s.config.learningRate,s.config.maxGradNorm);
    if(scope!=="A-meta"&&q.metaGrad&&q.metaTotal)applyMetaGrad(s.metaA,structuredClone(q.metaGrad),s.config.metaLearningRate||.003,s.config.maxGradNorm);
    if(scope!=="A-world"&&q.worldGrad&&q.worldTotal)applyWorldGrad(s.worldModelA,structuredClone(q.worldGrad),s.worldModelAAdam,s.config.worldModelLearningRate||.001,s.config.maxGradNorm);
    applySemanticUpdate(s,"A",q.semanticGrad,q.semanticTotal,q.semanticEvents);
    if(q.specialistStats)updateSpecialization(s.specialistsA,q.specialistStats,s.config,q.sourceBatchMarker??s.batch+1);
  }else{
    const target=bModelIndex(s,cell);
    if(q.localTotal&&Array.isArray(q.localGrads)){
      for(let i=0;i<s.groupB.length;i++){
        if(scope==="B-cell"&&i===target)continue;
        if(q.localGrads[i])adamStep(s.groupB[i],structuredClone(q.localGrads[i]),s.groupBAdam[i],s.config.learningRate,s.config.maxGradNorm);
      }
    }
    if(scope!=="B-higher"&&q.higherGrad&&q.higherTotal)higherAdamStep(s.higher,structuredClone(q.higherGrad),s.higherAdam,s.config.learningRate,s.config.maxGradNorm);
    if(scope!=="B-meta"&&q.metaGrad&&q.metaTotal)applyMetaGrad(s.metaB,structuredClone(q.metaGrad),s.config.metaLearningRate||.003,s.config.maxGradNorm);
    if(scope!=="B-world"&&q.worldGrad&&q.worldTotal)applyWorldGrad(s.worldModelB,structuredClone(q.worldGrad),s.worldModelBAdam,s.config.worldModelLearningRate||.001,s.config.maxGradNorm);
    applySemanticUpdate(s,"B",q.semanticGrad,q.semanticTotal,q.semanticEvents);
    if(q.specialistStats)updateSpecialization(s.specialistsB,q.specialistStats,s.config,q.sourceBatchMarker??s.batch+1);
  }
  s.policyVersion=(Number(s.policyVersion)||0)+1;
  s.batch=(Number(s.batch)||0)+1;
}
export function createInitialBranch({checkpoint,scope,cell=null,aggregateGrad,contribution,alpha,coUpdates=null}){
  const s=structuredClone(checkpoint.state);
  if(scope==="A"){
    const g=combineLocalGradient(aggregateGrad,contribution,alpha);
    adamStep(s.groupA,g,s.groupAAdam,s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="B-cell"){
    const g=combineLocalGradient(aggregateGrad,contribution,alpha);
    adamStep(s.groupB[bModelIndex(s,cell)],g,s.groupBAdam[bModelIndex(s,cell)],s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="B-higher"){
    const g=combineHigherGradient(aggregateGrad,contribution,alpha);
    higherAdamStep(s.higher,g,s.higherAdam,s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="A-meta"||scope==="B-meta"){
    const g=combineMetaGradient(aggregateGrad,contribution,alpha),model=scope==="A-meta"?s.metaA:s.metaB;
    applyMetaGrad(model,g,s.config.metaLearningRate||.003,s.config.maxGradNorm);
  }else if(scope==="A-world"||scope==="B-world"){
    const g=combineWorldGradient(aggregateGrad,contribution,alpha),model=scope==="A-world"?s.worldModelA:s.worldModelB,opt=scope==="A-world"?s.worldModelAAdam:s.worldModelBAdam;
    applyWorldGrad(model,g,opt,s.config.worldModelLearningRate||.001,s.config.maxGradNorm);
  }else throw new Error("unsupported branch scope "+scope);
  applySourceCoUpdates(s,scope,cell,coUpdates);
  return{scope,cell,alpha,state:s,preHash:checkpoint.hash};
}
export function createMultiInterventionBranch({checkpoint,scope,cell=null,aggregateGrad,interventions=[],coUpdates=null}){
  const s=structuredClone(checkpoint.state);
  let g=structuredClone(aggregateGrad);
  if(scope==="A"||scope==="B-cell"){
    for(const q of interventions)addLocalGrad(g,q.contribution,(Number(q.alpha)-1));
    if(scope==="A")adamStep(s.groupA,g,s.groupAAdam,s.config.learningRate,s.config.maxGradNorm);
    else adamStep(s.groupB[bModelIndex(s,cell)],g,s.groupBAdam[bModelIndex(s,cell)],s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="B-higher"){
    for(const q of interventions)addHigherGrad(g,q.contribution,(Number(q.alpha)-1));
    higherAdamStep(s.higher,g,s.higherAdam,s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="A-meta"||scope==="B-meta"){
    for(const q of interventions)addMetaGrad(g,q.contribution,(Number(q.alpha)-1));
    applyMetaGrad(scope==="A-meta"?s.metaA:s.metaB,g,s.config.metaLearningRate||.003,s.config.maxGradNorm);
  }else if(scope==="A-world"||scope==="B-world"){
    for(const q of interventions)addWorldGrad(g,q.contribution,(Number(q.alpha)-1));
    const model=scope==="A-world"?s.worldModelA:s.worldModelB,opt=scope==="A-world"?s.worldModelAAdam:s.worldModelBAdam;
    applyWorldGrad(model,g,opt,s.config.worldModelLearningRate||.001,s.config.maxGradNorm);
  }else throw new Error("unsupported branch scope "+scope);
  applySourceCoUpdates(s,scope,cell,coUpdates);
  return{scope,cell,alpha:null,state:s,preHash:checkpoint.hash,multi:true};
}
export function createReplacementBranch({checkpoint,scope,cell=null,aggregateGrad,originalContribution,replacementContribution,coUpdates=null}){
  const s=structuredClone(checkpoint.state);
  if(scope==="A"||scope==="B-cell"){
    const g=combineLocalGradient(aggregateGrad,originalContribution,0);addLocalGrad(g,replacementContribution,1);
    if(scope==="A")adamStep(s.groupA,g,s.groupAAdam,s.config.learningRate,s.config.maxGradNorm);
    else adamStep(s.groupB[bModelIndex(s,cell)],g,s.groupBAdam[bModelIndex(s,cell)],s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="B-higher"){
    const g=combineHigherGradient(aggregateGrad,originalContribution,0);addHigherGrad(g,replacementContribution,1);
    higherAdamStep(s.higher,g,s.higherAdam,s.config.learningRate,s.config.maxGradNorm);
  }else if(scope==="A-meta"||scope==="B-meta"){
    const g=combineMetaGradient(aggregateGrad,originalContribution,0);addMetaGrad(g,replacementContribution,1);
    applyMetaGrad(scope==="A-meta"?s.metaA:s.metaB,g,s.config.metaLearningRate||.003,s.config.maxGradNorm);
  }else if(scope==="A-world"||scope==="B-world"){
    const g=combineWorldGradient(aggregateGrad,originalContribution,0);addWorldGrad(g,replacementContribution,1);
    const model=scope==="A-world"?s.worldModelA:s.worldModelB,opt=scope==="A-world"?s.worldModelAAdam:s.worldModelBAdam;
    applyWorldGrad(model,g,opt,s.config.worldModelLearningRate||.001,s.config.maxGradNorm);
  }else throw new Error("unsupported branch scope "+scope);
  applySourceCoUpdates(s,scope,cell,coUpdates);
  return{scope,cell,alpha:null,state:s,preHash:checkpoint.hash,replacement:true};
}
export function assertPairedBranches(a,b){if(a.preHash!==b.preHash)throw new Error("branch pre-hash mismatch");return true;}

function deterministicReplayBatch(branch,horizon){
  const snap=branch.state.replaySnapshot,all=snap?.records||[],n=Math.max(0,Math.floor(branch.state.config.replayBatchSize||0));
  if(!all.length||!n)return[];
  const take=Math.min(n,all.length),start=((Math.floor(horizon)||0)*2654435761>>>0)%all.length,out=[];
  for(let i=0;i<take;i++)out.push(all[(start+i)%all.length]);return out;
}
function applyReplayToBranch(branch,horizon){
  if(branch.state.config?.rsiInheritanceGateStrict===true)return{used:0,blocked:"strict-rsi-inheritance"};
  const samples=deterministicReplayBatch(branch,horizon);if(!samples.length)return{used:0};
  const cfg={...branch.state.config,rlEnabled:false},lr=cfg.learningRate*Math.max(0,Number(cfg.replayLearningRateScale)||0);
  if(!(lr>0))return{used:0};
  if(String(branch.scope).startsWith("A")){
    const rows=samples.filter(x=>x?.group==="A");if(!rows.length)return{used:0};
    const g=zeroLocalGrad(branch.state.groupA);for(const rec of rows)addLocalGrad(g,trainLocalSequence(branch.state.groupA,[rec],cfg).grad);
    scaleGrad(g,1/rows.length);adamStep(branch.state.groupA,g,branch.state.groupAReplayAdam,lr,cfg.maxGradNorm);return{used:rows.length};
  }
  const rows=samples.filter(x=>x?.group==="B"),by=Array.from({length:branch.state.groupB.length},()=>[]);
  for(const rec of rows){
    const idx=branch.state.groupB.length===1?0:Number(rec.egoId);
    if(Number.isInteger(idx)&&idx>=0&&idx<by.length)by[idx].push(rec);
  }
  let used=0;
  for(let i=0;i<by.length;i++){if(!by[i].length)continue;const g=zeroLocalGrad(branch.state.groupB[i]);for(const rec of by[i])addLocalGrad(g,trainLocalSequence(branch.state.groupB[i],[rec],cfg).grad);scaleGrad(g,1/by[i].length);adamStep(branch.state.groupB[i],g,branch.state.groupBReplayAdam[i],lr,cfg.maxGradNorm);used+=by[i].length;}
  return{used};
}
function naturalTrainA(branch,spec,h){
  const cfg=cfgForHorizon(branch.state.config,h),r=evaluateBatch({group:"A",stage:branch.state.stage,envs:[spec],config:cfg,policyVersion:branch.state.policyVersion,batchNumber:branch.state.batch+1,training:true,captureTrace:true,sharedModel:branch.state.groupA,privateModels:null,higherModel:null,metaModel:branch.state.metaA,specialistSystem:branch.state.specialistsA,worldModel:branch.state.worldModelA,semanticSoundModel:branch.state.semanticSoundA});
  adamStep(branch.state.groupA,r.sharedGrad,branch.state.groupAAdam,cfg.learningRate,cfg.maxGradNorm);if(r.metaUnits)applyMetaGrad(branch.state.metaA,r.metaGrad,cfg.metaLearningRate||.003,cfg.maxGradNorm);if(r.worldModelUnits)applyWorldGrad(branch.state.worldModelA,r.worldModelGrad,branch.state.worldModelAAdam,cfg.worldModelLearningRate||.001,cfg.maxGradNorm);if(cfg.rsiInheritanceGateStrict!==true){applySemanticUpdate(branch.state,"A",r.semanticSoundGrad,r.semanticSoundEpisodes,r.semanticSoundEvents);updateSpecialization(branch.state.specialistsA,r.specialistStats||{},cfg,branch.state.batch+1);}const replay=applyReplayToBranch(branch,h),nativeHorizons=r.traceRoot?resolveNativeTraceHorizons({root:r.traceRoot,trace:r.trace,terminalSummary:r.metrics}):[];branch.state.batch++;branch.state.policyVersion++;return{actions:r.metrics.actions,experiences:r.trainableExperienceCount,trained:true,replay,nativeHorizons};
}
function naturalTrainB(branch,spec,h){
  const cfg=cfgForHorizon(branch.state.config,h),r=evaluateBatch({group:"B",stage:branch.state.stage,envs:[spec],config:cfg,policyVersion:branch.state.policyVersion,batchNumber:branch.state.batch+1,training:true,captureTrace:true,sharedModel:null,privateModels:branch.state.groupB,higherModel:branch.state.higher,metaModel:branch.state.metaB,specialistSystem:branch.state.specialistsB,worldModel:branch.state.worldModelB,semanticSoundModel:branch.state.semanticSoundB});
  for(let i=0;i<branch.state.groupB.length;i++)adamStep(branch.state.groupB[i],r.privateGrads[i],branch.state.groupBAdam[i],cfg.learningRate,cfg.maxGradNorm);
  higherAdamStep(branch.state.higher,r.higherGrad,branch.state.higherAdam,cfg.learningRate,cfg.maxGradNorm);if(r.metaUnits)applyMetaGrad(branch.state.metaB,r.metaGrad,cfg.metaLearningRate||.003,cfg.maxGradNorm);if(r.worldModelUnits)applyWorldGrad(branch.state.worldModelB,r.worldModelGrad,branch.state.worldModelBAdam,cfg.worldModelLearningRate||.001,cfg.maxGradNorm);if(cfg.rsiInheritanceGateStrict!==true){applySemanticUpdate(branch.state,"B",r.semanticSoundGrad,r.semanticSoundEpisodes,r.semanticSoundEvents);updateSpecialization(branch.state.specialistsB,r.specialistStats||{},cfg,branch.state.batch+1);}const replay=applyReplayToBranch(branch,h),nativeHorizons=r.traceRoot?resolveNativeTraceHorizons({root:r.traceRoot,trace:r.trace,terminalSummary:r.metrics}):[];branch.state.batch++;branch.state.policyVersion++;return{actions:r.metrics.actions,experiences:r.trainableExperienceCount,trained:true,replay,nativeHorizons};
}
export function advanceNaturalBranch(branch,spec,horizon){
  const out=String(branch.scope).startsWith("A")?naturalTrainA(branch,spec,horizon):naturalTrainB(branch,spec,horizon);
  if(!out.trained)throw new Error("natural branch failed to train");
  return out;
}
function generateCoupledPackets(reference,spec,h){
  const cfg=cfgForHorizon(reference.state.config,h);
  const group=String(reference.scope).startsWith("A")?"A":"B";
  const out=evaluateBatch({group,stage:reference.state.stage,envs:[spec],config:cfg,policyVersion:reference.state.policyVersion,batchNumber:reference.state.batch+1,training:true,captureTrace:false,captureOracle:true,
    sharedModel:group==="A"?reference.state.groupA:null,privateModels:group==="B"?reference.state.groupB:null,higherModel:group==="B"?reference.state.higher:null,metaModel:group==="A"?reference.state.metaA:reference.state.metaB,specialistSystem:group==="A"?reference.state.specialistsA:reference.state.specialistsB,worldModel:group==="A"?reference.state.worldModelA:reference.state.worldModelB,semanticSoundModel:group==="A"?reference.state.semanticSoundA:reference.state.semanticSoundB});out.oracleHorizon=h;return out;
}
function applyCoupledMeta(branch,packets,group){
  const model=group==="A"?branch.state.metaA:branch.state.metaB,rows=(packets.oracleMetaRecords||[]).filter(x=>x.group===group);
  if(!model||!rows.length)return{records:0};
  const g=zeroMetaGrad(model);let units=0;
  for(const q of rows){
    if(!q.records?.length)continue;
    const mg=trainMetaRecords(model,q.records,{gamma:branch.state.config.metaGamma||.92,entropy:branch.state.config.metaEntropy||.015});
    const n=mg.records||q.records.length;addMetaGrad(g,mg,n);units+=n;
  }
  if(units){scaleMetaGrad(g,1/units);g.records=units;applyMetaGrad(model,g,branch.state.config.metaLearningRate||.003,branch.state.config.maxGradNorm);}
  return{records:units};
}
function coupledTrainA(branch,packets){
  const g=zeroLocalGrad(branch.state.groupA),seqs=packets.oracleSequences||[];
  for(const q of seqs)addLocalGrad(g,trainLocalSequence(branch.state.groupA,q.records,branch.state.config).grad);
  if(seqs.length)scaleGrad(g,1/seqs.length);
  adamStep(branch.state.groupA,g,branch.state.groupAAdam,branch.state.config.learningRate,branch.state.config.maxGradNorm);
  const meta=applyCoupledMeta(branch,packets,"A");
  if(packets.worldModelUnits)applyWorldGrad(branch.state.worldModelA,packets.worldModelGrad,branch.state.worldModelAAdam,branch.state.config.worldModelLearningRate||.001,branch.state.config.maxGradNorm);
  if(branch.state.config?.rsiInheritanceGateStrict!==true){
    applySemanticUpdate(branch.state,"A",packets.semanticSoundGrad,packets.semanticSoundEpisodes,packets.semanticSoundEvents);
    updateSpecialization(branch.state.specialistsA,packets.specialistStats||{},branch.state.config,branch.state.batch+1);
  }
  const replay=applyReplayToBranch(branch,packets.oracleHorizon||0);
  branch.state.batch++;branch.state.policyVersion++;
  return{actions:Number(packets.metrics?.actions)||seqs.reduce((s,x)=>s+x.records.length,0),experiences:Number(packets.trainableExperienceCount)||seqs.reduce((s,x)=>s+x.records.length,0),trained:true,replay,meta};
}
function coupledTrainB(branch,packets){
  const seqs=packets.oracleSequences||[];
  if(branch.state.groupB.length===1){
    const g=zeroLocalGrad(branch.state.groupB[0]);
    for(const q of seqs)addLocalGrad(g,trainLocalSequence(branch.state.groupB[0],q.records,branch.state.config).grad);
    if(seqs.length)scaleGrad(g,1/seqs.length);
    adamStep(branch.state.groupB[0],g,branch.state.groupBAdam[0],branch.state.config.learningRate,branch.state.config.maxGradNorm);
  }else{
    const by=new Map(seqs.map(x=>[x.egoId,x.records]));
    for(let i=0;i<branch.state.groupB.length;i++){
      const rec=by.get(i)||[];if(!rec.length)continue;
      const g=trainLocalSequence(branch.state.groupB[i],rec,branch.state.config).grad;
      adamStep(branch.state.groupB[i],g,branch.state.groupBAdam[i],branch.state.config.learningRate,branch.state.config.maxGradNorm);
    }
  }
  const hr=packets.oracleHigherRecords?.[0]?.records||[];
  if(hr.length){const hg=trainHigherSequence(branch.state.higher,hr).grad;higherAdamStep(branch.state.higher,hg,branch.state.higherAdam,branch.state.config.learningRate,branch.state.config.maxGradNorm);}
  const meta=applyCoupledMeta(branch,packets,"B");
  if(packets.worldModelUnits)applyWorldGrad(branch.state.worldModelB,packets.worldModelGrad,branch.state.worldModelBAdam,branch.state.config.worldModelLearningRate||.001,branch.state.config.maxGradNorm);
  if(branch.state.config?.rsiInheritanceGateStrict!==true){
    applySemanticUpdate(branch.state,"B",packets.semanticSoundGrad,packets.semanticSoundEpisodes,packets.semanticSoundEvents);
    updateSpecialization(branch.state.specialistsB,packets.specialistStats||{},branch.state.config,branch.state.batch+1);
  }
  const replay=applyReplayToBranch(branch,packets.oracleHorizon||0);
  branch.state.batch++;branch.state.policyVersion++;
  return{actions:Number(packets.metrics?.actions)||(packets.oracleSequences||[]).reduce((s,x)=>s+x.records.length,0),experiences:Number(packets.trainableExperienceCount)||(packets.oracleSequences||[]).reduce((s,x)=>s+x.records.length,0),trained:true,replay,meta};
}
export function generateCoupledFuturePackets(referenceBranch,spec,horizon){return generateCoupledPackets(referenceBranch,spec,horizon);}
export function advanceCoupledBranch(branch,packets){
  const out=String(branch.scope).startsWith("A")?coupledTrainA(branch,packets):coupledTrainB(branch,packets);
  if(!out.trained)throw new Error("coupled branch failed to train");
  return out;
}
export function evaluateBranchFrozen(branch,evalSpecs){
  return String(branch.scope).startsWith("A")?evalA(branch.state.groupA,branch.state.metaA,branch.state.specialistsA,branch.state.worldModelA,branch.state.semanticSoundA,branch.state.config,evalSpecs):evalB(branch.state.groupB,branch.state.higher,branch.state.metaB,branch.state.specialistsB,branch.state.worldModelB,branch.state.semanticSoundB,branch.state.config,evalSpecs);
}
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function scheduledFutureSpec(base,index,budget){
  const env0=Number(base?.envSeed)||1,act0=Number(base?.actionSeed)||2,i=Math.max(0,Math.floor(index));
  return{...base,envId:String(base?.envId??"future")+"-seg"+i,envSeed:mix32(env0^Math.imul(i+1,0x9e3779b1)),
    actionSeed:mix32(act0^Math.imul(i+1,0x85ebca6b)),actionBudget:Math.max(1,Math.floor(budget))};
}
function sortedHorizons(horizons){return [...new Set((horizons||[]).map(x=>Math.max(1,Math.floor(Number(x)||1))))].sort((a,b)=>a-b);}
function evaluateAtHorizon(branch,evalSpecs,h,experiences,optimizerUpdates){
  const cases=evaluateBranchCases(branch,evalSpecs);
  return{horizon:h,experiences,optimizerUpdates,cases,metrics:metricsFromCases(cases)};
}
export function runNaturalPair({onBranch,offBranch,horizons,futureSpec,evalSpecs}){
  assertPairedBranches(onBranch,offBranch);
  const hs=sortedHorizons(horizons),a=structuredClone(onBranch),b=structuredClone(offBranch),on=[],off=[];
  let consumedA=0,consumedB=0,updatesA=0,updatesB=0,segment=0,previous=0;const nativeOn=[],nativeOff=[];
  for(const h of hs){
    const targetDelta=h-previous;
    let da=0,db=0;
    while(da<targetDelta||db<targetDelta){
      const remaining=Math.max(1,Math.max(targetDelta-da,targetDelta-db)),sp=scheduledFutureSpec(futureSpec,segment++,remaining);
      if(da<targetDelta){const ta=advanceNaturalBranch(a,{...sp,actionBudget:targetDelta-da},targetDelta-da);if(!ta.trained||!(ta.experiences>0))throw new Error("natural ON branch failed to consume future trainable experience");nativeOn.push({targetHorizon:h,segment:segment-1,records:ta.nativeHorizons});da+=Math.min(targetDelta-da,ta.experiences);updatesA++;}
      if(db<targetDelta){const tb=advanceNaturalBranch(b,{...sp,actionBudget:targetDelta-db},targetDelta-db);if(!tb.trained||!(tb.experiences>0))throw new Error("natural OFF branch failed to consume future trainable experience");nativeOff.push({targetHorizon:h,segment:segment-1,records:tb.nativeHorizons});db+=Math.min(targetDelta-db,tb.experiences);updatesB++;}
    }
    consumedA+=da;consumedB+=db;previous=h;
    on.push(evaluateAtHorizon(a,evalSpecs,h,consumedA,updatesA));off.push(evaluateAtHorizon(b,evalSpecs,h,consumedB,updatesB));
  }
  return{protocol:"natural",horizonResolution:"exact_trainable_experience_count",seedSchedule:"paired-deterministic",on,off,native:{on:nativeOn,off:nativeOff}};
}
export function runCoupledPair({onBranch,offBranch,horizons,futureSpec,evalSpecs,referenceBranch=offBranch}){
  assertPairedBranches(onBranch,offBranch);
  const hs=sortedHorizons(horizons),a=structuredClone(onBranch),b=structuredClone(offBranch),reference=structuredClone(referenceBranch),on=[],off=[];
  let consumed=0,updates=0,segment=0,previous=0;
  for(const h of hs){
    let delta=0,targetDelta=h-previous;
    while(delta<targetDelta){
      const remaining=targetDelta-delta,sp=scheduledFutureSpec(futureSpec,segment++,remaining);
      const packets=generateCoupledPackets(reference,sp,remaining),available=Math.max(0,Math.floor(Number(packets.trainableExperienceCount)||0));
      if(!(available>0))throw new Error("coupled reference produced no future experience");
      const ta=advanceCoupledBranch(a,packets),tb=advanceCoupledBranch(b,packets),tr=advanceCoupledBranch(reference,packets);
      if(!ta.trained||!tb.trained||!tr.trained)throw new Error("coupled causal future must train");
      const used=Math.min(remaining,available);delta+=used;updates++;
    }
    consumed+=delta;previous=h;
    on.push(evaluateAtHorizon(a,evalSpecs,h,consumed,updates));off.push(evaluateAtHorizon(b,evalSpecs,h,consumed,updates));
  }
  return{protocol:"coupled",horizonResolution:"exact_trainable_experience_count",packetIdentity:true,seedSchedule:"reference-recorded",on,off};
}
export function compareCurve(run,utility=defaultUtility){
  const off=new Map(run.off.map(x=>[x.horizon,x]));return run.on.map(x=>({horizon:x.horizon,on:utility(x.metrics),off:utility(off.get(x.horizon)?.metrics||{}),delta:utility(x.metrics)-utility(off.get(x.horizon)?.metrics||{})}));
}
