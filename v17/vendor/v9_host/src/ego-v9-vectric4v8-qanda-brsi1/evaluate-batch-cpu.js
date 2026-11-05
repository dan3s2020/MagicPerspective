import { runEpisode } from "./rollout.js";
import { computeGAE } from "./gae.js";
import { addLocalGrad, trainLocalSequence, zeroLocalGrad } from "./brain.js";
import { addHigherGrad, scaleHigherGrad, trainHigherSequence, zeroHigherGrad } from "./higher-self.js";
import { addMetaGrad, scaleMetaGrad, trainMetaRecords, zeroMetaGrad } from "./meta-controller.js";
import {mergeSpecialistStats} from "./specialization.js";
import {addWorldGrad,scaleWorldGrad,trainWorldModelRecords,zeroWorldGrad} from "./world-model-learner.js";
import {addSemanticSoundModuleGrad,scaleSemanticSoundModuleGrad,zeroSemanticSoundModuleGrad} from "./modules/semantic-sound-registry.js";
import {trainConceptWorld,conceptWorldSnapshot} from "./concept-world-2xf32.js";

function counterpartArgs(msg,spec,group,actionSeed){
  const id=msg.identityModels||{},isA=group==="A";
  const sharedModel=isA?(id.groupA||(msg.group==="A"?msg.sharedModel:null)):null;
  const privateModels=!isA?(id.groupB||(msg.group==="B"?msg.privateModels:null)):null;
  const higherModel=!isA?(id.higher||(msg.group==="B"?msg.higherModel:null)):null;
  const metaModel=isA?(id.metaA||(msg.group==="A"?msg.metaModel:null)):(id.metaB||(msg.group==="B"?msg.metaModel:null));
  const specialistSystem=isA?(id.specialistsA||(msg.group==="A"?msg.specialistSystem:null)):(id.specialistsB||(msg.group==="B"?msg.specialistSystem:null));
  const worldModel=isA?(id.worldModelA||(msg.group==="A"?msg.worldModel:null)):(id.worldModelB||(msg.group==="B"?msg.worldModel:null));
  const semanticSoundModel=isA?(id.semanticSoundA||(msg.group==="A"?msg.semanticSoundModel:null)):(id.semanticSoundB||(msg.group==="B"?msg.semanticSoundModel:null));
  const conceptModel=isA?(id.conceptA||(msg.group==="A"?msg.conceptModel:null)):(id.conceptB||(msg.group==="B"?msg.conceptModel:null));
  if(isA&&!sharedModel)return null;if(!isA&&(!privateModels||!higherModel))return null;
  return{group,stage:msg.stage,mapKind:spec.mapKind||msg.config.mapMode||"stage",envId:spec.envId??0,envSeed:spec.envSeed,actionSeed,swarmSize:spec.swarmSize,actionBudget:spec.actionBudget,
    config:{...msg.config,identityEnabled:false},sharedModel,privateModels,higherModel,metaModel,specialistSystem,worldModel,semanticSoundModel,conceptModel,training:false,captureTrace:false,capturePreview:true,identityCounterparts:[]};
}
function identityCounterparts(msg,spec,envIndex){
  const limit=Math.max(0,Math.floor(Number(msg.config.identityExposureEnvsPerWorker)||0));if(msg.config.identityEnabled===false||envIndex>=limit)return[];
  const focal=msg.group,other=focal==="A"?"B":"A",out=[];
  const sameArgs=counterpartArgs(msg,spec,focal,((spec.actionSeed>>>0)^0x51a9b37d)>>>0);
  if(sameArgs){const ep=runEpisode(sameArgs);if(ep.preview?.frames?.length)out.push({preview:ep.preview,observerTruth:"SAME_SPECIES_OTHER",speciesKey:focal});}
  const crossArgs=counterpartArgs(msg,spec,other,((spec.actionSeed>>>0)^0xa17e39c5)>>>0);
  if(crossArgs){const ep=runEpisode(crossArgs);if(ep.preview?.frames?.length)out.push({preview:ep.preview,observerTruth:"CROSS_SPECIES_OTHER",speciesKey:other});}
  return out;
}

function attachGAE(traj,cfg){
  const {advantages,returns}=computeGAE(traj,cfg.gamma,cfg.gaeLambda);
  for(let i=0;i<traj.length;i++){traj[i].advantage=advantages[i];traj[i].return=returns[i];}
}

export function evaluateBatch(msg,onPreview=()=>{},onProgress=()=>{}){
  if(msg?.modelCachePayload)msg={...msg,...msg.modelCachePayload};
  const group=msg.group,conceptModel=msg.conceptModel?structuredClone(msg.conceptModel):null;
  let conceptRecords=0,conceptLoss=0,conceptRecon=0,conceptTransition=0,conceptGrad=0,conceptUpdates=0;
  const sharedGrad=group==="A"?zeroLocalGrad(msg.sharedModel):null;
  const privateGrads=group==="B"?msg.privateModels.map(m=>zeroLocalGrad(m)):null;
  const higherGrad=group==="B"?zeroHigherGrad(msg.higherModel):null;
  const metaGrad=zeroMetaGrad(msg.metaModel),worldModelGrad=zeroWorldGrad(msg.worldModel),semanticSoundGrad=msg.semanticSoundModel?zeroSemanticSoundModuleGrad(msg.semanticSoundModel):null;
  let gradUnits=0,higherUnits=0,metaUnits=0,worldModelUnits=0,worldModelLoss=0,semanticSoundEpisodes=0,trainableExperienceCount=0;
  const metrics={envs:0,success:0,totalReward:0,actions:0,actionEfficiency:0,progressRatio:0,worstProgressRatio:0,startMeanDistance:0,startWorstDistance:0,entropy:0,rejectRate:0,meanDistance:0,worstDistance:0,meanN:0,meanK:0,finalK:0,computeSpent:0,computeBudget:0,actionBudget:0,budgetScale:0,budgetDistance:0,budgetDetour:0,energyCapacity:0,energySpent:0,energyRemaining:0,energyDebt:0,energyEfficiency:0,energyPerProgress:0,perspectiveD:0,effectiveD:0,identityAmbiguity:0,selfVsSameSeparation:0,selfVsCrossSeparation:0,organCount:0,births:0,retirements:0,fusions:0,actor:0,value:0,own:0,world:0,agency:0,continuity:0};
  let snapshot=null,trace=null,traceRoot=null;
  const replaySamples=[],evidenceSamples=[],higherEvidence=[],oracleSequences=[],oracleHigherRecords=[],oracleMetaRecords=[],oracleWorldRecords=[],envSummaries=[],specialistStats={},semanticSoundEvents=[],semanticSoundEventBuckets=[];

  for(let e=0;e<msg.envs.length;e++){
    const spec=msg.envs[e],counterparts=identityCounterparts(msg,spec,e);
    const ep=runEpisode({
      group,stage:msg.stage,mapKind:spec.mapKind||msg.config.mapMode||"stage",envId:spec.envId??e,envSeed:spec.envSeed,actionSeed:spec.actionSeed,swarmSize:spec.swarmSize,actionBudget:spec.actionBudget,config:msg.config,
      sharedModel:msg.sharedModel,privateModels:msg.privateModels,higherModel:msg.higherModel,metaModel:msg.metaModel,specialistSystem:msg.specialistSystem,worldModel:msg.worldModel,semanticSoundModel:msg.semanticSoundModel,conceptModel,
      training:msg.training!==false,captureTrace:e===0 && msg.captureTrace,capturePreview:e===0 && msg.capturePreview===true,
      ablation:msg.ablation||null,identityCounterparts:counterparts
    });
    if(ep.preview?.frames?.length)onPreview({group,envId:spec.envId??e,batchNumber:Number(msg.batchNumber)||0,policyVersion:msg.policyVersion,preview:ep.preview});
    if(msg.training!==false&&conceptModel&&ep.conceptRecords?.length){
      const cm=trainConceptWorld(conceptModel,ep.conceptRecords,{
        learningRate:Number(msg.config.conceptWorldLearningRate)||.0015,
        reconstructionCoef:Number(msg.config.conceptWorldReconstructionCoef)||.35,
        transitionCoef:Number(msg.config.conceptWorldTransitionCoef)||1,
        maxGradNorm:Number(msg.config.maxGradNorm)||2,
        maxRecords:Math.max(16,Math.floor(Number(msg.config.conceptWorldMaxTrainRecords)||128))
      });
      conceptRecords+=cm.records;conceptLoss+=cm.loss;conceptRecon+=cm.reconstructionMse;conceptTransition+=cm.transitionMse;conceptGrad+=cm.gradNorm;conceptUpdates++;
    }
    metrics.envs++;metrics.success+=ep.metrics.success;metrics.totalReward+=ep.metrics.totalReward;
    metrics.actions+=ep.metrics.actions;metrics.actionEfficiency+=ep.metrics.actionEfficiency||0;metrics.progressRatio+=Number(ep.metrics.progressRatio)||0;metrics.worstProgressRatio+=Number(ep.metrics.worstProgressRatio)||0;metrics.startMeanDistance+=Number(ep.metrics.startMeanDistance)||0;metrics.startWorstDistance+=Number(ep.metrics.startWorstDistance)||0;metrics.entropy+=ep.metrics.entropy;metrics.rejectRate+=ep.metrics.rejectRate;
    metrics.meanDistance+=ep.metrics.meanDistance;metrics.worstDistance+=ep.metrics.worstDistance;
    for(const k of ["meanN","meanK","finalK","computeSpent","computeBudget","actionBudget","budgetScale","budgetDistance","budgetDetour","energyCapacity","energySpent","energyRemaining","energyDebt","energyEfficiency","energyPerProgress","perspectiveD","effectiveD","identityAmbiguity","selfVsSameSeparation","selfVsCrossSeparation","organCount","births","retirements","fusions"])metrics[k]+=Number(ep.metrics[k])||0;
    snapshot=snapshot||ep.snapshot;trace=trace||ep.trace;traceRoot=traceRoot||ep.traceRoot;mergeSpecialistStats(specialistStats,ep.specialistStats||{});
    if(msg.training!==false&&semanticSoundGrad&&ep.semanticSound?.gradient){
      addSemanticSoundModuleGrad(msg.semanticSoundModel,semanticSoundGrad,ep.semanticSound.gradient);semanticSoundEpisodes++;
      semanticSoundEventBuckets.push((ep.semanticSound.events||[]).map(ev=>({...ev,envId:spec.envId??e})));
    }
    if(msg.training!==false&&ep.worldModelRecords?.length){
      const wg=trainWorldModelRecords(msg.worldModel,ep.worldModelRecords),n=wg.records||ep.worldModelRecords.length;
      addWorldGrad(worldModelGrad,wg,n);worldModelUnits+=n;worldModelLoss+=Number(wg.loss||0)*n;
      const oracleEnvLimit=Math.max(0,Math.floor(Number(msg.oracleCaptureEnvs??1)));
      if(msg.captureOracle===true&&(oracleEnvLimit===0||e<oracleEnvLimit))oracleWorldRecords.push({
        group,envId:spec.envId??e,envSeed:spec.envSeed,actionSeed:spec.actionSeed,mapKind:spec.mapKind||msg.config.mapMode||"stage",
        swarmSize:ep.snapshot?.cubes?.length||spec.swarmSize,physicalDimensions:ep.snapshot?.physicalDimensions||2,
        perspectiveD:ep.metrics.perspectiveD||0,records:structuredClone(ep.worldModelRecords)
      });
    }
    envSummaries.push({group,envId:spec.envId??e,envSeed:spec.envSeed,mapKind:spec.mapKind||msg.config.mapMode||"stage",swarmStart:spec.swarmSize,
      physicalDimensions:ep.snapshot?.physicalDimensions||1,success:Boolean(ep.metrics.success),totalReward:ep.metrics.totalReward,actions:ep.metrics.actions,progressRatio:ep.metrics.progressRatio,worstProgressRatio:ep.metrics.worstProgressRatio,
      meanN:ep.metrics.meanN,finalN:ep.snapshot?.cubes?.length||ep.metrics.meanN,meanK:ep.metrics.meanK,finalK:ep.metrics.finalK,
      computeSpent:ep.metrics.computeSpent,computeBudget:ep.metrics.computeBudget,actionBudget:ep.metrics.actionBudget,budgetScale:ep.metrics.budgetScale,identityAmbiguity:ep.metrics.identityAmbiguity,selfVsSameSeparation:ep.metrics.selfVsSameSeparation,selfVsCrossSeparation:ep.metrics.selfVsCrossSeparation,
      budgetDistance:ep.metrics.budgetDistance,budgetDetour:ep.metrics.budgetDetour,energyCapacity:ep.metrics.energyCapacity,energySpent:ep.metrics.energySpent,energyRemaining:ep.metrics.energyRemaining,energyDebt:ep.metrics.energyDebt,energyEfficiency:ep.metrics.energyEfficiency,energyPerProgress:ep.metrics.energyPerProgress,termination:ep.metrics.termination,perspectiveD:ep.metrics.perspectiveD,effectiveD:ep.metrics.effectiveD,organCount:ep.metrics.organCount,
      births:ep.metrics.births,retirements:ep.metrics.retirements,fusions:ep.metrics.fusions,rejectRate:ep.metrics.rejectRate});

    if(msg.training!==false&&ep.metaRecords?.length){
      const oracleEnvLimit=Math.max(0,Math.floor(Number(msg.oracleCaptureEnvs??1)));
      if(msg.captureOracle===true&&(oracleEnvLimit===0||e<oracleEnvLimit))oracleMetaRecords.push({
        group,envId:spec.envId??e,envSeed:spec.envSeed,actionSeed:spec.actionSeed,
        mapKind:spec.mapKind||msg.config.mapMode||"stage",records:structuredClone(ep.metaRecords)
      });
      const mg=trainMetaRecords(msg.metaModel,ep.metaRecords,{gamma:msg.config.metaGamma||.92,entropy:msg.config.metaEntropy||.015});
      addMetaGrad(metaGrad,mg,mg.records||ep.metaRecords.length);metaUnits+=mg.records||ep.metaRecords.length;
    }

    if(msg.training!==false){
      const cellCount=ep.trajectories.length;
      const evidenceWant=Math.max(1,Math.floor(msg.config.rsiEvidencePerEnv||2));
      const evidenceCap=Math.max(16,Math.floor(msg.config.rsiEvidenceWorkerCap||256));
      for(let sidx=0;sidx<evidenceWant && evidenceSamples.length<evidenceCap;sidx++){
        const ego=(spec.envSeed+sidx*7)%cellCount,traj=ep.trajectories[ego];
        if(!traj?.length)continue;
        const idx=(spec.actionSeed+sidx*17)%traj.length,q=traj[idx];
        evidenceSamples.push({
          group,egoId:ego,swarmSize:cellCount,policyVersion:msg.policyVersion,stage:msg.stage,mapKind:spec.mapKind||msg.config.mapMode||"stage",
          physicalDimensions:q.physicalDimensions||ep.snapshot?.physicalDimensions||2,perspectiveD:q.perspectiveD||ep.metrics.perspectiveD||0,
          envSeed:spec.envSeed,actionSeed:spec.actionSeed,episodeSuccess:Boolean(ep.metrics.success),episodeReturn:ep.metrics.totalReward,
          obs:Float64Array.from(q.obs),nextObs:Float64Array.from(q.nextObs),action:q.action,confidence:q.confidence,reward:q.reward,
          hiddenBefore:Float64Array.from(q.hiddenBefore),higherContext:Float64Array.from(q.higherContext||[]),
          prevAction:q.prevAction,prevReward:q.prevReward,prevMismatch:Float64Array.from(q.prevMismatch||[0,0,0]),
          actionMask:q.actionMask?Uint8Array.from(q.actionMask):null,agencyTarget:Array.from(q.agencyTarget||[0,0,0,0]),identityAgencyActive:q.identityAgencyActive===true
        });
      }
      if(group==="B"&&ep.higherRecords?.length&&higherEvidence.length<Math.max(8,Math.floor(msg.config.rsiHigherEvidenceWorkerCap||128))){
        const hi=spec.envSeed%ep.higherRecords.length,h=ep.higherRecords[hi];
        higherEvidence.push({
          group:"B",policyVersion:msg.policyVersion,stage:msg.stage,mapKind:spec.mapKind||msg.config.mapMode||"stage",
          envSeed:spec.envSeed,actionSeed:spec.actionSeed,episodeSuccess:Boolean(ep.metrics.success),episodeReturn:ep.metrics.totalReward,
          pool:Float64Array.from(h.pool),nextPool:Float64Array.from(h.nextPool),hiddenBefore:Float64Array.from(h.hiddenBefore)
        });
      }

      const want=Math.max(0,Math.floor(msg.config.replaySamplesPerEnv||0));
      for(let s=0;s<want;s++){
        const ego=(spec.envSeed+s*7)%cellCount;
        const traj=ep.trajectories[ego];
        if(!traj?.length)continue;
        const idx=(spec.actionSeed+s*13)%traj.length;
        const q=traj[idx];
        replaySamples.push({
          group,egoId:ego,swarmSize:cellCount,policyVersion:msg.policyVersion,stage:msg.stage,mapKind:spec.mapKind||msg.config.mapMode||"stage",
          obs:Float64Array.from(q.obs),nextObs:Float64Array.from(q.nextObs),
          action:q.action,confidence:q.confidence,
          hiddenBefore:Float64Array.from(q.hiddenBefore),
          higherContext:Float64Array.from(q.higherContext||[]),
          prevAction:q.prevAction,prevReward:q.prevReward,
          prevMismatch:Float64Array.from(q.prevMismatch||[0,0,0]),actionMask:q.actionMask?Uint8Array.from(q.actionMask):null,
          physicalDimensions:q.physicalDimensions||ep.snapshot?.physicalDimensions||2,agencyTarget:Array.from(q.agencyTarget||[0,0,0,0]),identityAgencyActive:q.identityAgencyActive===true
        });
      }
      for(let i=0;i<cellCount;i++){
        const traj=ep.trajectories[i];if(!traj.length)continue;
        attachGAE(traj,msg.config);trainableExperienceCount+=traj.length;
        const oracleEnvLimit=Math.max(0,Math.floor(Number(msg.oracleCaptureEnvs??1)));if(msg.captureOracle===true&&(oracleEnvLimit===0||e<oracleEnvLimit))oracleSequences.push({
          group,egoId:i,envId:spec.envId??e,envSeed:spec.envSeed,actionSeed:spec.actionSeed,
          mapKind:spec.mapKind||msg.config.mapMode||"stage",records:structuredClone(traj)
        });
        const modelIndex=group==="B"?(msg.privateModels.length===1?0:i):null;
        const model=group==="A"?msg.sharedModel:msg.privateModels[modelIndex];
        const out=trainLocalSequence(model,traj,msg.config);
        if(group==="A")addLocalGrad(sharedGrad,out.grad);else addLocalGrad(privateGrads[modelIndex],out.grad);
        gradUnits++;
        for(const k of ["actor","value","own","world","agency","continuity"])metrics[k]+=out.metrics[k];
      }

      if(group==="B" && ep.higherRecords.length){
        const oracleEnvLimit=Math.max(0,Math.floor(Number(msg.oracleCaptureEnvs??1)));if(msg.captureOracle===true&&(oracleEnvLimit===0||e<oracleEnvLimit))oracleHigherRecords.push({
          group:"B-higher",envId:spec.envId??e,envSeed:spec.envSeed,actionSeed:spec.actionSeed,
          mapKind:spec.mapKind||msg.config.mapMode||"stage",records:structuredClone(ep.higherRecords)
        });
        const h=trainHigherSequence(msg.higherModel,ep.higherRecords);
        addHigherGrad(higherGrad,h.grad);higherUnits++;
      }
    }
    onProgress({group,envId:spec.envId??e,done:e+1,total:msg.envs.length,batchNumber:Number(msg.batchNumber)||0,policyVersion:msg.policyVersion});
  }

  if(semanticSoundEventBuckets.length){
    const cap=Math.max(0,Math.floor(Number(msg.config.semanticSoundEventCapPerWorker)||256)),indices=new Array(semanticSoundEventBuckets.length).fill(0);
    let progress=true;
    while(semanticSoundEvents.length<cap&&progress){
      progress=false;
      for(let i=0;i<semanticSoundEventBuckets.length&&semanticSoundEvents.length<cap;i++){
        const bucket=semanticSoundEventBuckets[i],idx=indices[i];
        if(idx<bucket.length){semanticSoundEvents.push(bucket[idx]);indices[i]++;progress=true;}
      }
    }
  }
  if(semanticSoundGrad&&semanticSoundEpisodes)scaleSemanticSoundModuleGrad(msg.semanticSoundModel,semanticSoundGrad,1/semanticSoundEpisodes);

  if(gradUnits){
    const s=1/gradUnits;
    if(group==="A"){
      import("./brain.js").then(()=>{});
      // scale explicitly to keep worker result deterministic and self-contained
      const arrays=[]; 
      const visit=(g)=>{for(const p of [g.body,g.world,g.gru.Wz,g.gru.Wr,g.gru.Wh,g.actor,g.critic,g.ownPred,g.worldPred,g.agency]){arrays.push(p.W,p.b);}};
      visit(sharedGrad);for(const a of arrays)for(let i=0;i<a.length;i++)a[i]*=s;
    } else {
      const sharedAcrossCells=privateGrads.length===1;
      for(const g of privateGrads){
        const arrays=[];for(const p of [g.body,g.world,g.gru.Wz,g.gru.Wr,g.gru.Wh,g.actor,g.critic,g.ownPred,g.worldPred,g.agency])arrays.push(p.W,p.b);
        const denom=sharedAcrossCells?gradUnits:Math.max(1,msg.envs.length);
        for(const a of arrays)for(let i=0;i<a.length;i++)a[i]*=1/Math.max(1,denom);
      }
    }
    for(const k of ["actor","value","own","world","agency","continuity"])metrics[k]/=gradUnits;
  }
  if(higherUnits)scaleHigherGrad(higherGrad,1/higherUnits);
  if(metaUnits){scaleMetaGrad(metaGrad,1/metaUnits);metaGrad.records=metaUnits;}
  if(worldModelUnits){scaleWorldGrad(worldModelGrad,1/worldModelUnits);worldModelGrad.records=worldModelUnits;worldModelGrad.loss=worldModelLoss/worldModelUnits;}
  if(metrics.envs){
    metrics.success/=metrics.envs;metrics.totalReward/=metrics.envs;metrics.actions/=metrics.envs;
    metrics.actionEfficiency/=metrics.envs;metrics.progressRatio/=metrics.envs;metrics.worstProgressRatio/=metrics.envs;metrics.startMeanDistance/=metrics.envs;metrics.startWorstDistance/=metrics.envs;metrics.entropy/=metrics.envs;metrics.rejectRate/=metrics.envs;
    metrics.meanDistance/=metrics.envs;metrics.worstDistance/=metrics.envs;
    for(const k of ["meanN","meanK","finalK","computeSpent","computeBudget","actionBudget","budgetScale","budgetDistance","budgetDetour","energyCapacity","energySpent","energyRemaining","energyDebt","energyEfficiency","energyPerProgress","perspectiveD","effectiveD","organCount","births","retirements","fusions"])metrics[k]/=metrics.envs;
  }
  const conceptMetrics=conceptUpdates?{records:conceptRecords,updates:conceptUpdates,loss:conceptLoss/conceptUpdates,reconstructionMse:conceptRecon/conceptUpdates,transitionMse:conceptTransition/conceptUpdates,gradNorm:conceptGrad/conceptUpdates}:null;
  return {group,policyVersion:msg.policyVersion,sharedGrad,privateGrads,higherGrad,metaGrad,worldModelGrad,worldModelUnits,worldModelLoss:worldModelUnits?worldModelLoss/worldModelUnits:0,semanticSoundGrad,semanticSoundEpisodes,semanticSoundEvents,specialistStats,envSummaries,metrics,snapshot,traceRoot,trace,replaySamples,evidenceSamples,higherEvidence,oracleSequences,oracleHigherRecords,oracleMetaRecords,oracleWorldRecords,
    conceptModel,conceptMetrics,conceptWorld:conceptModel?conceptWorldSnapshot(conceptModel,[]):null,
    gradientUnits:gradUnits,higherUnits,metaUnits,trainableExperienceCount,envCount:msg.envs.length};
}
