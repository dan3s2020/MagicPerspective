import { ACTION_N, ALL_MAP_SEQUENCE, DEFAULT_CONFIG, DEFAULT_SWARM_SIZE, OBS_N, STAGES, mapKindForMode } from "./config.js";
import {pretrainMapKinds,readinessThreshold,summarizeReadiness} from "./workflow.js";
import {createCausalRuntimeState,ensureCausalRuntime,shouldCaptureOracleBatch,reserveOracleCapture,releaseOracleCapture,enqueueOracleCapture,processCausalQueue,causalSummary} from "./causal-runtime.js";
import {createGroupRuntime,ensureGroupRuntime,groupCanLaunch,groupIsEnabled,groupPolicyVersion,groupRuntimeState,beginGroupAtomicWork,finishGroupAtomicWork,markGroupPolicyUpdate,markGroupBatchComplete,groupRuntimeSnapshot} from "./group-runtime.js";
import {createScopeCheckpoint} from "./causal-checkpoint.js";
import {createQandaController,createQandaAdam,qandaParameterCount} from "./qanda-brsi-controller.js";
import {createQandaState,ensureQandaState,qandaSummary} from "./qanda-rsi.js";
import { RNG } from "./math.js";
import { createLocalBrain, zeroLocalGrad, addLocalGrad, scaleGrad, trainLocalSequence, localParameterCount } from "./brain.js";
import { createAdam, adamStep } from "./optimizer.js";
import {addMetaGrad,applyMetaGrad,createMetaController,metaParameterCount,scaleMetaGrad,zeroMetaGrad} from "./meta-controller.js";
import {createSpecializationSystem,mergeSpecialistStats,specialistParameterCount,updateSpecialization} from "./specialization.js";
import {effectiveFeatureGates,experimentalManifest,policyActionMask} from "./experimental-features.js";
import {createCurriculumFrontier,curriculumFrontierSnapshot,ensureCurriculumFrontier,frontierBudgetAtN16,noteFrontierBatch} from "./curriculum-frontier.js";
import {addWorldGrad,applyWorldGrad,createWorldAdam,createWorldModel,scaleWorldGrad,worldModelParameterCount,zeroWorldGrad} from "./world-model-learner.js";
import {addSemanticSoundModuleGrad,applySemanticSoundModuleGrad,createSemanticSoundModuleModel,learnSemanticSoundModuleEvents,semanticSoundModuleParameterCount,zeroSemanticSoundModuleGrad} from "./modules/semantic-sound-registry.js";
import {
  createHigherSelf, createHigherAdam, higherAdamStep,
  zeroHigherGrad, addHigherGrad, higherParameterCount
} from "./higher-self.js";
import {averageConceptWorldModels,conceptWorldSnapshot,createConceptWorldModel} from "./concept-world-2xf32.js";

function cloneConfig(overrides={}) {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    mechanics:{...DEFAULT_CONFIG.mechanics,...(overrides.mechanics||{})},
    reward:{...DEFAULT_CONFIG.reward,...(overrides.reward||{})}
  };
}
function mix32(x){
  x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;
}
function partition(items,n){
  const out=Array.from({length:Math.min(Math.max(1,n),Math.max(1,items.length))},()=>[]);
  for(let i=0;i<items.length;i++)out[i%out.length].push(items[i]);
  return out.filter(a=>a.length);
}
function weightedMetrics(results){
  const keys=["success","totalReward","actions","actionEfficiency","progressRatio","worstProgressRatio","startMeanDistance","startWorstDistance","entropy","rejectRate","meanDistance","worstDistance","meanN","meanK","finalK","computeSpent","computeBudget","actionBudget","budgetScale","budgetDistance","budgetDetour","energyCapacity","energySpent","energyRemaining","energyDebt","energyEfficiency","energyPerProgress","perspectiveD","effectiveD","identityAmbiguity","selfVsSameSeparation","selfVsCrossSeparation","organCount","births","retirements","fusions","actor","value","own","world","agency","continuity"];
  const out={envs:0};
  for(const k of keys)out[k]=0;
  for(const r of results){
    const w=r.envCount||r.metrics?.envs||1;out.envs+=w;
    for(const k of keys)out[k]+=(Number(r.metrics?.[k])||0)*w;
  }
  if(out.envs)for(const k of keys)out[k]/=out.envs;
  return out;
}
function summarizeGpu(results=[]){
  const byWorker=new Map();
  for(const r of results){
    const g=r?.gpu;if(!g)continue;const id=Number.isInteger(r?._workerId)?r._workerId:"?";
    const prev=byWorker.get(id),curRecords=Number(g.stats?.records)||0,prevRecords=Number(prev?.stats?.records)||-1;
    if(!prev||curRecords>=prevRecords)byWorker.set(id,g);
  }
  const rows=[...byWorker.values()];if(!rows.length)return{active:false,workers:0,verified:0,adapters:[],devices:[],records:0,dispatches:0,gpuMs:0,queueWaitMs:0,target:.75,targetUtilization:.75,actualShare:0,gpuWorkloadRecords:0,totalWorkloadRecords:0,reasons:[]};
  const adapters=[...new Set(rows.map(g=>g.adapter?.description||g.adapter?.device||g.adapter?.vendor||"GPU"))],gpuWorkloadRecords=rows.reduce((s,g)=>s+(Number(g.workload?.gpuRecords)||0),0),totalWorkloadRecords=rows.reduce((s,g)=>s+(Number(g.workload?.totalRecords)||0),0);
  const samples=rows.flatMap(g=>(g.stats?.perDevice||[]).map(d=>({...d,backend:g.backend||null}))),dm=new Map();
  for(const d of samples){
    const key=String(d.name||d.device||d.vendor||d.index||"?"),q=dm.get(key)||{name:key,vendor:d.vendor||"",records:0,trajectories:0,kernelMs:0,wallMs:0,queueWaitMs:0,dutyWeighted:0,dutyWeight:0,targetDuty:Number(d.targetDuty)||0,residentBytes:0,peakResidentBytes:0,globalMem:0,hostUnifiedMemory:false,recordBufferBytes:0,pendingJobs:0};
    const w=Math.max(1,Number(d.records)||1);q.records+=Number(d.records)||0;q.trajectories+=Number(d.trajectories)||0;q.kernelMs+=Number(d.kernelMs)||0;q.wallMs+=Number(d.deviceWallMs??d.wallMs)||0;q.queueWaitMs+=Number(d.queueWaitMs)||0;q.dutyWeighted+=(Number(d.duty)||0)*w;q.dutyWeight+=w;q.targetDuty=Math.max(q.targetDuty,Number(d.targetDuty)||0);q.residentBytes=Math.max(q.residentBytes,Number(d.residentBytes)||0);q.peakResidentBytes=Math.max(q.peakResidentBytes,Number(d.peakResidentBytes)||0);q.globalMem=Math.max(q.globalMem,Number(d.globalMem)||0);q.hostUnifiedMemory=q.hostUnifiedMemory||d.hostUnifiedMemory===true;q.recordBufferBytes=Math.max(q.recordBufferBytes,Number(d.recordBufferBytes)||0);q.pendingJobs=Math.max(q.pendingJobs,Number(d.pendingJobs)||0);dm.set(key,q);
  }
  const devices=[...dm.values()].map(d=>({...d,duty:d.dutyWeight?d.dutyWeighted/d.dutyWeight:0}));
  return{
    active:rows.some(g=>g.available&&((Number(g.workload?.gpuRecords)||0)>0||(Number(g.stats?.records)||0)>0)),workers:rows.length,verified:rows.filter(g=>g.verified).length,adapters,devices,
    native:rows.some(g=>g.native===true||g.backend==="native-opencl"),backend:rows.find(g=>g.backend)?.backend||null,
    records:rows.reduce((s,g)=>s+(Number(g.stats?.records)||0),0),
    dispatches:rows.reduce((s,g)=>s+(Number(g.stats?.dispatches)||0),0),
    gpuMs:rows.reduce((s,g)=>s+(Number(g.stats?.gpuMs)||0),0),
    queueWaitMs:rows.reduce((s,g)=>s+(Number(g.stats?.queueWaitMs)||0),0),
    target:rows.reduce((m,g)=>Math.max(m,Number(g.stats?.targetWorkloadShare)||0),0)||1,
    targetUtilization:rows.reduce((m,g)=>Math.max(m,Number(g.stats?.targetUtilization)||0),0)||.75,
    actualShare:totalWorkloadRecords?gpuWorkloadRecords/totalWorkloadRecords:0,gpuWorkloadRecords,totalWorkloadRecords,
    reasons:[...new Set(rows.flatMap(g=>[g.fallbackReason,g.reason]).filter(Boolean))]
  };
}


export function createTrainer(overrides={}) {
  const config=cloneConfig(overrides);
  const groupA=createLocalBrain(new RNG(0xA11CE));
  // Scalable B uses one shared local policy; identity remains in each cell's recurrent state.
  // Higher Common Self pools a variable-size set, so parameter count is independent of swarm N.
  const groupB=[createLocalBrain(new RNG(mix32(0xB000)))];
  const higher=createHigherSelf(new RNG(0xC011EC7));
  const metaA=createMetaController(0x4D455441,config),metaB=createMetaController(0x4D455442,config);
  const specialistsA=createSpecializationSystem(0xC5A,config),specialistsB=createSpecializationSystem(0xC5B,config);
  const worldModelA=createWorldModel(0x574D41),worldModelB=createWorldModel(0x574D42);
  const semanticSoundA=createSemanticSoundModuleModel(config.semanticSoundModule||"semantic-sound-cortex-v1",0x534341,config),semanticSoundB=createSemanticSoundModuleModel(config.semanticSoundModule||"semantic-sound-cortex-v1",0x534342,config);
  const rawConceptObsN=Math.max(1,OBS_N-2),conceptA=createConceptWorldModel({seed:0xC0A11A,id:"A",sourceObsN:rawConceptObsN,actionN:ACTION_N}),conceptB=createConceptWorldModel({seed:0xC0A11B,id:"B",sourceObsN:rawConceptObsN,actionN:ACTION_N});
  const parameterCountA=localParameterCount(groupA)+metaParameterCount(metaA)+specialistParameterCount(specialistsA)+worldModelParameterCount(worldModelA)+semanticSoundModuleParameterCount(semanticSoundA);
  const parameterCountB=groupB.reduce((s,m)=>s+localParameterCount(m),0)+higherParameterCount(higher)+metaParameterCount(metaB)+specialistParameterCount(specialistsB)+worldModelParameterCount(worldModelB)+semanticSoundModuleParameterCount(semanticSoundB);
  return finalizeV9Trainer({
    schemaVersion:100,version:"v9-vectric4v8-qanda-brsi1",config,stage:0,batch:0,policyVersion:1,
    parameterCountA,parameterCountB,
    groupA,groupAAdam:createAdam(groupA),groupAReplayAdam:createAdam(groupA),
    groupB,groupBAdam:groupB.map(createAdam),groupBReplayAdam:groupB.map(createAdam),
    higher,higherAdam:createHigherAdam(higher),
    metaA,metaB,specialistsA,specialistsB,worldModelA,worldModelB,worldModelAAdam:createWorldAdam(worldModelA),worldModelBAdam:createWorldAdam(worldModelB),semanticSoundA,semanticSoundB,conceptA,conceptB,
    history:[],evalStreak:0,lastEval:null,mapEpisodeCursor:0,
    causal:createCausalRuntimeState(),qanda:createQandaState(),groupRuntime:createGroupRuntime({policyVersion:1,batch:0,mapEpisodeCursor:0}),curriculumFrontier:createCurriculumFrontier(config),lastGroupMetrics:{A:null,B:null},
    qandaController:createQandaController(new RNG(0x8A4D41)),qandaAdam:null
  });
}

function finalizeV9Trainer(t){
  if(!t.qandaAdam)t.qandaAdam=createQandaAdam(t.qandaController);
  if(!t.semanticSoundA)t.semanticSoundA=createSemanticSoundModuleModel(t.config?.semanticSoundModule||"semantic-sound-cortex-v1",0x534341,t.config||{});
  if(!t.semanticSoundB)t.semanticSoundB=createSemanticSoundModuleModel(t.config?.semanticSoundModule||"semantic-sound-cortex-v1",0x534342,t.config||{});
  const rawConceptObsN=Math.max(1,OBS_N-2);
  if(!t.conceptA||t.conceptA.sourceObsN!==rawConceptObsN)t.conceptA=createConceptWorldModel({seed:0xC0A11A,id:"A",sourceObsN:rawConceptObsN,actionN:ACTION_N});
  if(!t.conceptB||t.conceptB.sourceObsN!==rawConceptObsN)t.conceptB=createConceptWorldModel({seed:0xC0A11B,id:"B",sourceObsN:rawConceptObsN,actionN:ACTION_N});
  t.parameterCountA=localParameterCount(t.groupA)+metaParameterCount(t.metaA)+specialistParameterCount(t.specialistsA)+worldModelParameterCount(t.worldModelA)+semanticSoundModuleParameterCount(t.semanticSoundA);
  t.parameterCountB=t.groupB.reduce((s,m)=>s+localParameterCount(m),0)+higherParameterCount(t.higher)+metaParameterCount(t.metaB)+specialistParameterCount(t.specialistsB)+worldModelParameterCount(t.worldModelB)+semanticSoundModuleParameterCount(t.semanticSoundB);
  t.parameterCountQanda=qandaParameterCount(t.qandaController);
  ensureCausalRuntime(t);ensureQandaState(t);ensureGroupRuntime(t);ensureCurriculumFrontier(t);if(!t.lastGroupMetrics)t.lastGroupMetrics={A:null,B:null};return t;
}

export function setTrainerConfig(t,patch){
  t.config=cloneConfig({...t.config,...patch,
    mechanics:{...t.config.mechanics,...(patch.mechanics||{})},
    reward:{...t.config.reward,...(patch.reward||{})}
  });
}

function swarmBounds(config){
  const a=Math.max(2,Math.floor(Number(config.swarmSizeMin)||DEFAULT_SWARM_SIZE));
  const b=Math.max(2,Math.floor(Number(config.swarmSizeMax)||a));
  return{min:Math.min(a,b),max:Math.max(a,b)};
}
function swarmSizeForSpec(config,ordinal,seed){
  const {min,max}=swarmBounds(config);if(min===max)return min;
  return min+(mix32((seed>>>0)^Math.imul(ordinal+1,0x9e3779b9))%(max-min+1));
}
export function envSpecsForGroup(t,group,count,evalMode=false){
  const runtime=ensureGroupRuntime(t),q=runtime.groups[String(group||"")];if(!q)throw new Error("unknown training group "+group);
  const base=mix32((q.batch+1)*104729+t.stage*1000003+(evalMode?0xEAA1:0x711A));
  const cursor=evalMode?0:Math.max(0,Math.floor(Number(q.mapEpisodeCursor)||0));
  return Array.from({length:count},(_,i)=>{
    const envSeed=mix32(base+i*2654435761);
    return{envId:i,envSeed,actionSeed:mix32(base^((i+1)*2246822519)),mapKind:mapKindForMode(t.config.mapMode||"stage",cursor+i,t.stage),swarmSize:swarmSizeForSpec(t.config,cursor+i,envSeed)};
  }).map(x=>({...x,actionBudget:actionBudgetForSwarm(t.config,x.swarmSize,t.curriculumFrontier)}));
}

export function actionBudgetForSwarm(config,swarmSize,curriculumFrontier=null){
  const base=frontierBudgetAtN16(config,curriculumFrontier);
  if(config.scaleActionBudgetWithSwarm===false)return base;
  return Math.max(1,Math.round(base*Math.max(2,Number(swarmSize)||DEFAULT_SWARM_SIZE)/DEFAULT_SWARM_SIZE));
}
export function swarmEvaluationSizes(config,{includeExtrapolation=true}={}){
  const {min,max}=swarmBounds(config),mid=Math.max(min,Math.round(Math.sqrt(min*max))),out=[min,mid,max];
  if(includeExtrapolation){
    const mult=Math.max(1,Number(config.swarmSizeEvalMultiplier)||2);
    out.push(Math.max(max+1,Math.round(max*mult)));
  }
  return [...new Set(out)].sort((a,b)=>a-b);
}
export function envSpecs(t,count,evalMode=false){
  const base=mix32((t.batch+1)*104729+t.stage*1000003+(evalMode?0xEAA1:0x711A));
  const cursor=evalMode?0:Math.max(0,Math.floor(Number(t.mapEpisodeCursor)||0));
  return Array.from({length:count},(_,i)=>{
    const envSeed=mix32(base+i*2654435761);
    return{
      envId:i,
      envSeed,
      actionSeed:mix32(base^((i+1)*2246822519)),
      mapKind:mapKindForMode(t.config.mapMode||"stage",cursor+i,t.stage),
      swarmSize:swarmSizeForSpec(t.config,cursor+i,envSeed)
    };
  }).map(x=>({...x,actionBudget:actionBudgetForSwarm(t.config,x.swarmSize,t.curriculumFrontier)}));
}

export function frozenModelsForGroup(t,group){
  const policyVersion=groupPolicyVersion(t,group);
  if(group==="A")return{
    policyVersion,
    sharedModel:structuredClone(t.groupA),
    metaModel:structuredClone(t.metaA),
    specialistSystem:structuredClone(t.specialistsA),
    worldModel:structuredClone(t.worldModelA),
    semanticSoundModel:String(t.config.semanticSoundMode||"off")==="off"?null:structuredClone(t.semanticSoundA),
    conceptModel:structuredClone(t.conceptA)
  };
  return{
    policyVersion,
    privateModels:structuredClone(t.groupB),
    higherModel:structuredClone(t.higher),
    metaModel:structuredClone(t.metaB),
    specialistSystem:structuredClone(t.specialistsB),
    worldModel:structuredClone(t.worldModelB),
    semanticSoundModel:String(t.config.semanticSoundMode||"off")==="off"?null:structuredClone(t.semanticSoundB),
    conceptModel:structuredClone(t.conceptB)
  };
}

function frozenIdentityModels(t){
  return{
    groupA:structuredClone(t.groupA),groupB:structuredClone(t.groupB),higher:structuredClone(t.higher),
    metaA:structuredClone(t.metaA),metaB:structuredClone(t.metaB),
    specialistsA:structuredClone(t.specialistsA),specialistsB:structuredClone(t.specialistsB),
    worldModelA:structuredClone(t.worldModelA),worldModelB:structuredClone(t.worldModelB),
    semanticSoundA:String(t.config.semanticSoundMode||"off")==="off"?null:structuredClone(t.semanticSoundA),
    semanticSoundB:String(t.config.semanticSoundMode||"off")==="off"?null:structuredClone(t.semanticSoundB),
    conceptA:structuredClone(t.conceptA),conceptB:structuredClone(t.conceptB)
  };
}

async function dispatchGroup(pool,t,group,specs,{training=true,captureTrace=true,capturePreview=training,captureOracle=false,ablation=null,models=null,policyVersion=null,configOverride=null}={}){
  const frozen=models||frozenModelsForGroup(t,group);
  const expectedPolicyVersion=policyVersion==null?Number(frozen.policyVersion):Number(policyVersion),effectiveConfig=cloneConfig(configOverride||t.config);
  const prepared=specs.map((q,i)=>({...q,mapKind:q.mapKind||mapKindForMode(effectiveConfig.mapMode||"stage",q.envId??i,t.stage)}));
  const identityModels=frozenIdentityModels(t);
  if(group==="A"){identityModels.groupA=frozen.sharedModel;identityModels.metaA=frozen.metaModel;identityModels.specialistsA=frozen.specialistSystem;identityModels.worldModelA=frozen.worldModel;identityModels.semanticSoundA=frozen.semanticSoundModel;identityModels.conceptA=frozen.conceptModel;}
  else{identityModels.groupB=frozen.privateModels;identityModels.higher=frozen.higherModel;identityModels.metaB=frozen.metaModel;identityModels.specialistsB=frozen.specialistSystem;identityModels.worldModelB=frozen.worldModel;identityModels.semanticSoundB=frozen.semanticSoundModel;identityModels.conceptB=frozen.conceptModel;}
  const configSnapshot=structuredClone(effectiveConfig),batchNumber=groupRuntimeState(t,group).batch+1,workerNs=String(effectiveConfig.principalWorkerNamespace||"").trim(),conceptStep=Number(frozen.conceptModel?.step)||0,flowSerial=Number(frozen.conceptModel?.flow?.serial)||0,cacheKey=`${workerNs?workerNs+":":""}${group}:pv${expectedPolicyVersion}:cw${conceptStep}:cf${flowSerial}`;
  const modelCachePayload={
    sharedModel:group==="A"?frozen.sharedModel:null,
    privateModels:group==="B"?frozen.privateModels:null,
    higherModel:group==="B"?frozen.higherModel:null,
    metaModel:frozen.metaModel,
    specialistSystem:frozen.specialistSystem,
    worldModel:frozen.worldModel,
    semanticSoundModel:frozen.semanticSoundModel,
    conceptModel:frozen.conceptModel,
    identityModels
  };
  const oraclePerWorker=Math.max(0,Math.floor(Number(t.causal?.config?.oracleEnvironmentsPerWorker??1)||0));
  const oracleCaptureCount=captureOracle?(oraclePerWorker===0?prepared.length:Math.min(prepared.length,Math.max(1,pool.count)*oraclePerWorker)):0;
  const promises=prepared.map((spec,idx)=>pool.submit({
    type:"evaluate",
    group,stage:t.stage,envs:[spec],config:configSnapshot,
    policyVersion:expectedPolicyVersion,batchNumber,training,captureTrace:captureTrace&&idx===0,capturePreview:capturePreview===true&&idx===0,captureOracle:captureOracle&&idx<oracleCaptureCount,oracleCaptureEnvs:1,ablation,
    liveObserve:effectiveConfig.liveSimulationObserver===true,liveObserverEverySteps:Math.max(1,Math.floor(Number(effectiveConfig.liveObserverEverySteps)||25)),
    modelCacheKey:cacheKey,modelCachePayload
  }));
  const results=await Promise.all(promises);
  for(const r of results)if(r.policyVersion!==expectedPolicyVersion)throw new Error(`Stale worker result policy ${r.policyVersion}; expected ${expectedPolicyVersion} for group ${group}`);
  return results;
}

function mergeConceptWorldFromWorkers(t,group,results){
  if(t.config.conceptWorldEnabled===false)return{changed:false,metrics:null,snapshot:null};
  const key=group==="A"?"conceptA":"conceptB",rows=(results||[]).filter(r=>r?.conceptModel?.schema==="octopus-2d-everything-concept-v1");
  if(!rows.length)return{changed:false,metrics:null,snapshot:conceptWorldSnapshot(t[key],[])};
  t[key]=averageConceptWorldModels(t[key],rows.map(r=>({model:r.conceptModel,weight:Math.max(1,Number(r.envCount)||1)})));
  const ms=(results||[]).map(r=>r.conceptMetrics).filter(Boolean),weight=ms.reduce((a,m)=>a+Math.max(1,Number(m.records)||1),0)||1;
  const mean=k=>ms.reduce((a,m)=>a+(Number(m[k])||0)*Math.max(1,Number(m.records)||1),0)/weight;
  return{changed:true,metrics:ms.length?{records:ms.reduce((a,m)=>a+(Number(m.records)||0),0),loss:mean("loss"),reconstructionMse:mean("reconstructionMse"),transitionMse:mean("transitionMse"),gradNorm:mean("gradNorm")}:null,snapshot:conceptWorldSnapshot(t[key],[])};
}

function aggregateAGrad(t,results){
  const total=results.reduce((s,r)=>s+(r.gradientUnits||0),0),den=Math.max(1,total),g=zeroLocalGrad(t.groupA);
  for(const r of results)addLocalGrad(g,r.sharedGrad,(r.gradientUnits||0)/den);
  return{grad:g,total};
}
function aggregateBGrads(t,results){
  const total=results.reduce((s,r)=>s+(r.gradientUnits||0),0),den=Math.max(1,total),locals=[];
  const shared=t.groupB.length===1;
  for(let i=0;i<t.groupB.length;i++){
    const g=zeroLocalGrad(t.groupB[i]);
    if(shared){for(const r of results)addLocalGrad(g,r.privateGrads[0],(r.gradientUnits||0)/den);}
    else{
      const envTotal=results.reduce((s,r)=>s+r.envCount,0)||1;
      for(const r of results)addLocalGrad(g,r.privateGrads[i],r.envCount/envTotal);
    }
    locals.push(g);
  }
  const higherTotal=results.reduce((s,r)=>s+(r.higherUnits||0),0),higherDen=Math.max(1,higherTotal),higher=zeroHigherGrad(t.higher);
  for(const r of results)if(r.higherGrad)addHigherGrad(higher,r.higherGrad,(r.higherUnits||0)/higherDen);
  return{locals,higher,total,higherTotal};
}
function aggregateWorldModel(t,results,group){
  const model=group==="A"?t.worldModelA:t.worldModelB,g=zeroWorldGrad(model),total=results.reduce((z,r)=>z+(r.worldModelUnits||0),0)||0;
  if(total)for(const r of results)if(r.worldModelGrad)addWorldGrad(g,r.worldModelGrad,r.worldModelUnits||0);
  if(total){scaleWorldGrad(g,1/total);g.records=total;g.loss=results.reduce((z,r)=>z+(Number(r.worldModelLoss)||0)*(r.worldModelUnits||0),0)/total;}
  return{grad:g,total};
}
function aggregateSpecialistEvidence(results){
  const out={};for(const r of results)mergeSpecialistStats(out,r.specialistStats||{});return out;
}
function aggregateSemanticSound(t,results,group){
  const model=group==="A"?t.semanticSoundA:t.semanticSoundB,g=zeroSemanticSoundModuleGrad(model),total=results.reduce((z,r)=>z+(r.semanticSoundEpisodes||0),0),events=[];
  if(total)for(const r of results)if(r.semanticSoundGrad)addSemanticSoundModuleGrad(model,g,r.semanticSoundGrad,(r.semanticSoundEpisodes||0)/total);
  const cap=Math.max(0,Math.floor(Number(t.config.semanticSoundEventCapPerWorker)||256))*Math.max(1,results.length);
  for(const r of results)for(const ev of r.semanticSoundEvents||[]){if(events.length>=cap)break;events.push(ev);}
  return{grad:g,total,events};
}
function applySemanticSoundAggregate(t,agg,group){
  const model=group==="A"?t.semanticSoundA:t.semanticSoundB;let gradResult=null,learned=null;
  if(agg.total)gradResult=applySemanticSoundModuleGrad(model,agg.grad,{codecLearningRate:Number(t.config.semanticSoundCodecLearningRate)||.0005,vocalLearningRate:Number(t.config.semanticSoundVocalLearningRate)||.0003,maxNorm:Number(t.config.maxGradNorm)||2});
  if(agg.events.length)learned=learnSemanticSoundModuleEvents(model,agg.events);
  return{changed:Boolean(agg.total||learned?.learned),gradResult,learned,eventCount:agg.events.length};
}
function aggregateMeta(t,results,group){
  const model=group==="A"?t.metaA:t.metaB,g=zeroMetaGrad(model);
  const total=results.reduce((s,r)=>s+(r.metaUnits||0),0)||0;
  if(total)for(const r of results)if(r.metaGrad)addMetaGrad(g,r.metaGrad,r.metaUnits||0);
  if(total){scaleMetaGrad(g,1/total);g.records=total;}
  return{grad:g,total};
}
function applyAggregates(t,aAgg,bAgg,metaA,metaB,worldA,worldB){
  const zero={rawNorm:0,clippedNorm:0,records:0};
  const clipA=aAgg.total?adamStep(t.groupA,aAgg.grad,t.groupAAdam,t.config.learningRate,t.config.maxGradNorm):zero,clips=[];
  for(let i=0;i<t.groupB.length;i++)clips.push(bAgg.total?adamStep(t.groupB[i],bAgg.locals[i],t.groupBAdam[i],t.config.learningRate,t.config.maxGradNorm):zero);
  const hc=bAgg.higherTotal?higherAdamStep(t.higher,bAgg.higher,t.higherAdam,t.config.learningRate,t.config.maxGradNorm):zero;
  const ma=metaA.total?applyMetaGrad(t.metaA,metaA.grad,t.config.metaLearningRate||.003,t.config.maxGradNorm||2):zero;
  const mb=metaB.total?applyMetaGrad(t.metaB,metaB.grad,t.config.metaLearningRate||.003,t.config.maxGradNorm||2):zero;
  const wa=worldA.total?applyWorldGrad(t.worldModelA,worldA.grad,t.worldModelAAdam,t.config.worldModelLearningRate||.001,t.config.maxGradNorm||2):zero;
  const wb=worldB.total?applyWorldGrad(t.worldModelB,worldB.grad,t.worldModelBAdam,t.config.worldModelLearningRate||.001,t.config.maxGradNorm||2):zero;
  return{A:clipA,B:{local:clips,higher:hc},metaA:ma,metaB:mb,worldA:wa,worldB:wb};
}


function applyAuxReplay(t,samples=[]){
  const auxCfg={...t.config,rlEnabled:false};
  const currentReplayRecord=rec=>{
    const dim=Number(rec?.physicalDimensions)===3||String(rec?.mapKind||"").startsWith("3d-")?3:2;
    return{...rec,actionMask:policyActionMask(t.config,dim)};
  };
  const lr=t.config.learningRate*Math.max(0,Number(t.config.replayLearningRateScale)||0);
  const A=samples.filter(x=>x?.group==="A");
  const B=samples.filter(x=>x?.group==="B");
  let gradA=0,gradB=0,usedA=0,usedB=0;

  if(A.length&&lr>0){
    const g=zeroLocalGrad(t.groupA);
    for(const rec of A){
      const out=trainLocalSequence(t.groupA,[currentReplayRecord(rec)],auxCfg);
      addLocalGrad(g,out.grad);usedA++;
    }
    scaleGrad(g,1/usedA);
    gradA=adamStep(t.groupA,g,t.groupAReplayAdam,lr,t.config.maxGradNorm).clippedNorm;
  }

  if(B.length&&lr>0){
    const by=Array.from({length:t.groupB.length},()=>[]);
    for(const rec of B){
      const idx=t.groupB.length===1?0:Number(rec.egoId);
      if(Number.isInteger(idx)&&idx>=0&&idx<by.length)by[idx].push(rec);
    }
    let norms=0,normN=0;
    for(let i=0;i<t.groupB.length;i++){
      if(!by[i].length)continue;
      const g=zeroLocalGrad(t.groupB[i]);
      for(const rec of by[i]){
        const out=trainLocalSequence(t.groupB[i],[currentReplayRecord(rec)],auxCfg);
        addLocalGrad(g,out.grad);usedB++;
      }
      scaleGrad(g,1/by[i].length);
      norms+=adamStep(t.groupB[i],g,t.groupBReplayAdam[i],lr,t.config.maxGradNorm).clippedNorm;
      normN++;
    }
    gradB=normN?norms/normN:0;
  }
  return {usedA,usedB,gradA,gradB};
}

export async function trainOneGroupBatch(pool,t,group,onProgress=()=>{},replaySamples=[],oracleReplaySnapshot=null,shouldContinue=()=>true){
  ensureCausalRuntime(t);ensureQandaState(t);ensureGroupRuntime(t);
  const g=String(group||"");if(g!=="A"&&g!=="B")throw new Error("trainOneGroupBatch requires A or B");
  const runtime=ensureGroupRuntime(t),gState=runtime.groups[g];
  if(!groupCanLaunch(t,g))return{skipped:true,group:g,reason:"group_not_enabled",groupRuntime:groupRuntimeSnapshot(t),replaySamples:[],simulationSummaries:[]};
  const n=Math.max(1,Math.floor(g==="A"?t.config.groupASimulationCount:t.config.groupBSimulationCount)),strictInheritance=t.config.rsiInheritanceGateStrict===true;
  const specs=envSpecsForGroup(t,g,n,false),micro=Math.max(1,Math.min(n,Math.floor(Number(t.config.optimizerMicrobatchSize)||32)));
  const optimizerStepsPlanned=Math.ceil(n/micro),groupPolicyVersionStart=gState.policyVersion,policyVersionStart=t.policyVersion;
  t.lastTrainingEnvSeedsByGroup=t.lastTrainingEnvSeedsByGroup||{};t.lastTrainingEnvSpecsByGroup=t.lastTrainingEnvSpecsByGroup||{};
  t.lastTrainingEnvSeedsByGroup[g]=specs.map(x=>x.envSeed);t.lastTrainingEnvSpecsByGroup[g]=specs.map(x=>({envSeed:x.envSeed,mapKind:x.mapKind,swarmSize:x.swarmSize}));
  t.lastTrainingEnvSeeds=t.lastTrainingEnvSeedsByGroup[g];t.lastTrainingEnvSpecs=t.lastTrainingEnvSpecsByGroup[g];
  const manualCaptureRequested=Boolean(t.forceCapture),captureTrace=manualCaptureRequested||(t.config.automaticTraceEnabled!==false&&(gState.batch%10===0));
  const all=[],collectedReplay=[];let captureEvent=null,capturedOracle=false,optimizerSteps=0,cSpecialists=null,metaRecords=0,worldRecords=0,worldLossWeighted=0,semanticSoundEpisodes=0,semanticSoundEvents=0,processedSpecs=0,lastConceptMerge=null;
  const norm={local:0,higher:0,meta:0,count:0};
  for(let offset=0;offset<n;offset+=micro){
    if(!shouldContinue())break;
    const token=beginGroupAtomicWork(t,g);if(!token)break;
    const end=Math.min(n,offset+micro),groupSpecs=specs.slice(offset,end),first=offset===0;
    let reservation=null,captureThis=false,checkpoint=null,committed=false;
    try{
      if(!capturedOracle){reservation=reserveOracleCapture(t,"group-"+g);captureThis=Boolean(reservation);}
      if(captureThis)checkpoint=createScopeCheckpoint(t,g==="A"?"A":"B-system",null,{replaySnapshot:oracleReplaySnapshot});
      onProgress({phase:"group-microbatch",group:g,index:optimizerSteps+1,total:optimizerStepsPlanned,offset,end,policyVersion:token.policyVersion,globalPolicyVersion:t.policyVersion});
      const rows=await dispatchGroup(pool,t,g,groupSpecs,{training:true,captureTrace:captureTrace&&first,capturePreview:first,captureOracle:captureThis,policyVersion:token.policyVersion});
      const sourceBatchMarker=gState.batch+1+optimizerSteps/Math.max(1,optimizerStepsPlanned);
      const conceptMerge=mergeConceptWorldFromWorkers(t,g,rows);lastConceptMerge=conceptMerge;
      let didUpdate=false;
      if(g==="A"){
        const local=aggregateAGrad(t,rows),meta=aggregateMeta(t,rows,"A"),world=aggregateWorldModel(t,rows,"A"),semantic=aggregateSemanticSound(t,rows,"A"),specialistEvidence=aggregateSpecialistEvidence(rows);
        const clip=local.total?adamStep(t.groupA,local.grad,t.groupAAdam,t.config.learningRate,t.config.maxGradNorm):{clippedNorm:0};
        const mc=meta.total?applyMetaGrad(t.metaA,meta.grad,t.config.metaLearningRate||.003,t.config.maxGradNorm||2):{clippedNorm:0};
        if(world.total)applyWorldGrad(t.worldModelA,world.grad,t.worldModelAAdam,t.config.worldModelLearningRate||.001,t.config.maxGradNorm||2);
        const sem=strictInheritance?{changed:false,gradResult:null,learned:null,eventCount:0}:applySemanticSoundAggregate(t,semantic,"A");semanticSoundEpisodes+=semantic.total;semanticSoundEvents+=strictInheritance?0:sem.eventCount;
        if(rows.length&&t.config.cSpecializationEnabled!==false&&!strictInheritance)cSpecialists=updateSpecialization(t.specialistsA,specialistEvidence,t.config,sourceBatchMarker);
        didUpdate=Boolean(local.total||meta.total||world.total||sem.changed||conceptMerge.changed);norm.local+=clip.clippedNorm||0;norm.meta+=mc.clippedNorm||0;metaRecords+=meta.total;worldRecords+=world.total;worldLossWeighted+=(Number(world.grad?.loss)||0)*world.total;
        if(captureThis){captureEvent=enqueueOracleCapture(t,{checkpointA:checkpoint,checkpointB:null,aggregateA:structuredClone(local.grad),aggregateB:[],aggregateHigher:null,aggregateMetaA:structuredClone(meta.grad),aggregateMetaB:null,aggregateWorldA:structuredClone(world.grad),aggregateWorldB:null,aggregateSemanticA:strictInheritance?null:structuredClone(semantic.grad),aggregateSemanticB:null,semanticEventsA:strictInheritance?[]:structuredClone(semantic.events),semanticEventsB:[],specialistEvidenceA:strictInheritance?{}:structuredClone(specialistEvidence),specialistEvidenceB:{},aResults:rows,bResults:[],totalA:local.total,totalB:0,totalHigher:0,totalMetaA:meta.total,totalMetaB:0,totalWorldA:world.total,totalWorldB:0,totalSemanticA:strictInheritance?0:semantic.total,totalSemanticB:0,sourceBatchMarker});capturedOracle=Boolean(captureEvent);}
      }else{
        const local=aggregateBGrads(t,rows),meta=aggregateMeta(t,rows,"B"),world=aggregateWorldModel(t,rows,"B"),semantic=aggregateSemanticSound(t,rows,"B"),specialistEvidence=aggregateSpecialistEvidence(rows),clips=[];
        for(let i=0;i<t.groupB.length;i++)clips.push(local.total?adamStep(t.groupB[i],local.locals[i],t.groupBAdam[i],t.config.learningRate,t.config.maxGradNorm):{clippedNorm:0});
        const hc=local.higherTotal?higherAdamStep(t.higher,local.higher,t.higherAdam,t.config.learningRate,t.config.maxGradNorm):{clippedNorm:0};
        const mc=meta.total?applyMetaGrad(t.metaB,meta.grad,t.config.metaLearningRate||.003,t.config.maxGradNorm||2):{clippedNorm:0};
        if(world.total)applyWorldGrad(t.worldModelB,world.grad,t.worldModelBAdam,t.config.worldModelLearningRate||.001,t.config.maxGradNorm||2);
        const sem=strictInheritance?{changed:false,gradResult:null,learned:null,eventCount:0}:applySemanticSoundAggregate(t,semantic,"B");semanticSoundEpisodes+=semantic.total;semanticSoundEvents+=strictInheritance?0:sem.eventCount;
        if(rows.length&&t.config.cSpecializationEnabled!==false&&!strictInheritance)cSpecialists=updateSpecialization(t.specialistsB,specialistEvidence,t.config,sourceBatchMarker);
        didUpdate=Boolean(local.total||local.higherTotal||meta.total||world.total||sem.changed||conceptMerge.changed);norm.local+=clips.length?clips.reduce((z,x)=>z+(x.clippedNorm||0),0)/clips.length:0;norm.higher+=hc.clippedNorm||0;norm.meta+=mc.clippedNorm||0;metaRecords+=meta.total;worldRecords+=world.total;worldLossWeighted+=(Number(world.grad?.loss)||0)*world.total;
        if(captureThis){captureEvent=enqueueOracleCapture(t,{checkpointA:null,checkpointB:checkpoint,aggregateA:null,aggregateB:local.locals.map(x=>structuredClone(x)),aggregateHigher:structuredClone(local.higher),aggregateMetaA:null,aggregateMetaB:structuredClone(meta.grad),aggregateWorldA:null,aggregateWorldB:structuredClone(world.grad),aggregateSemanticA:null,aggregateSemanticB:strictInheritance?null:structuredClone(semantic.grad),semanticEventsA:[],semanticEventsB:strictInheritance?[]:structuredClone(semantic.events),specialistEvidenceA:{},specialistEvidenceB:strictInheritance?{}:structuredClone(specialistEvidence),aResults:[],bResults:rows,totalA:0,totalB:local.total,totalHigher:local.higherTotal,totalMetaA:0,totalMetaB:meta.total,totalWorldA:0,totalWorldB:world.total,totalSemanticA:0,totalSemanticB:strictInheritance?0:semantic.total,sourceBatchMarker});capturedOracle=Boolean(captureEvent);}
      }
      all.push(...rows);collectedReplay.push(...rows.flatMap(x=>x.replaySamples||[]));processedSpecs+=groupSpecs.length;norm.count++;
      if(didUpdate){t.policyVersion++;optimizerSteps++;}
      committed=true;finishGroupAtomicWork(t,g,token,{committed:true,policyVersionDelta:didUpdate?1:0});
    }catch(e){
      if(!committed)finishGroupAtomicWork(t,g,token,{committed:false,policyVersionDelta:0});
      throw e;
    }finally{if(reservation)releaseOracleCapture(t,reservation);}
    if(!groupCanLaunch(t,g))break;
  }
  if(!all.length)return{skipped:true,group:g,reason:"group_quiesced_before_dispatch",groupRuntime:groupRuntimeSnapshot(t),replaySamples:[],simulationSummaries:[]};
  const advanceCursor=["all","v5-all","all-v9","3d-all"].includes(t.config.mapMode||"stage");
  const replay=groupIsEnabled(t,g)?applyAuxReplay(t,(replaySamples||[]).filter(x=>x?.group===g)):{usedA:0,usedB:0,gradA:0,gradB:0};
  const replayUpdated=(replay.usedA+replay.usedB)>0&&t.config.learningRate*Math.max(0,Number(t.config.replayLearningRateScale)||0)>0;
  if(replayUpdated){markGroupPolicyUpdate(t,g,1);t.policyVersion++;}
  markGroupBatchComplete(t,g,{optimizerSteps,simulations:processedSpecs,advanceCursor});
  const rt=ensureGroupRuntime(t);t.mapEpisodeCursor=Math.min(rt.groups.A.mapEpisodeCursor,rt.groups.B.mapEpisodeCursor);
  const metrics=weightedMetrics(all);t.lastGroupMetrics=t.lastGroupMetrics||{A:null,B:null};t.lastGroupMetrics[g]=metrics;t.batch++;
  const frontierEvent=noteFrontierBatch(t,g,metrics,rt.groups[g].batch);
  const A=t.lastGroupMetrics.A||weightedMetrics([]),B=t.lastGroupMetrics.B||weightedMetrics([]),den=Math.max(1,norm.count);
  const row={batch:t.batch,groupBatch:rt.groups[g].batch,trainingGroup:g,stage:t.stage,mapMode:t.config.mapMode||"stage",experimental:experimentalManifest(t.config),A,B,parameterCountA:t.parameterCountA,parameterCountB:t.parameterCountB,parameterCountQanda:t.parameterCountQanda,
    optimizerMicrobatchSize:micro,optimizerSteps,optimizerStepsPlanned,policyVersionStart,policyVersionEnd:t.policyVersion,groupPolicyVersionStart,groupPolicyVersionEnd:rt.groups[g].policyVersion,
    gradA:g==="A"?norm.local/den:0,gradB:g==="B"?norm.local/den:0,gradH:g==="B"?norm.higher/den:0,gradMetaA:g==="A"?norm.meta/den:0,gradMetaB:g==="B"?norm.meta/den:0,
    metaRecordsA:g==="A"?metaRecords:0,metaRecordsB:g==="B"?metaRecords:0,worldModelRecordsA:g==="A"?worldRecords:0,worldModelRecordsB:g==="B"?worldRecords:0,
    worldModelLossA:g==="A"?worldLossWeighted/Math.max(1,worldRecords):0,worldModelLossB:g==="B"?worldLossWeighted/Math.max(1,worldRecords):0,
    semanticSoundEpisodes,semanticSoundEvents,semanticSoundMode:t.config.semanticSoundMode||"off",semanticSoundModule:t.config.semanticSoundModule||null,
    conceptWorld:{group:g,conceptOnly:t.config.conceptWorldOnly!==false,metrics:lastConceptMerge?.metrics||null,snapshot:conceptWorldSnapshot(g==="A"?t.conceptA:t.conceptB,[])},
    cSpecialistsA:g==="A"?cSpecialists:null,cSpecialistsB:g==="B"?cSpecialists:null,replayUsedA:replay.usedA,replayUsedB:replay.usedB,replayGradA:replay.gradA,replayGradB:replay.gradB,gpu:summarizeGpu(all),causal:causalSummary(t),qanda:qandaSummary(t),curriculumFrontier:curriculumFrontierSnapshot(t),frontierDecision:frontierEvent.decision,groupRuntime:groupRuntimeSnapshot(t)};
  t.history.push(row);if(t.history.length>240)t.history.shift();
  const lastSnapshot=rows=>{for(let i=rows.length-1;i>=0;i--)if(rows[i]?.snapshot)return rows[i].snapshot;return null;};
  const firstTrace=rows=>rows.find(x=>x.trace?.length)?.trace||[],trace=firstTrace(all),manualCaptureDelivered=manualCaptureRequested&&Boolean(trace.length);if(manualCaptureDelivered)t.forceCapture=false;
  return{group:g,row,snapshotA:g==="A"?lastSnapshot(all):null,snapshotB:g==="B"?lastSnapshot(all):null,traceA:g==="A"?trace:[],traceB:g==="B"?trace:[],manualCaptureRequested,manualCaptureDelivered,
    simulationSummaries:all.flatMap(x=>x.envSummaries||[]),replaySamples:collectedReplay,causal:{ran:false,background:true,queue:t.causal.queue.length,captures:Object.keys(t.causal.captures||{}).length,last:t.causal.last},qanda:qandaSummary(t),captureEvent,groupRuntime:groupRuntimeSnapshot(t)};
}

export async function trainOneBatch(pool,t,onProgress=()=>{},replaySamples=[],oracleReplaySnapshot=null){
  ensureCausalRuntime(t);ensureQandaState(t);
  const nA=Math.max(1,Math.floor(t.config.groupASimulationCount));
  const nB=Math.max(1,Math.floor(t.config.groupBSimulationCount));
  const paired=Math.max(nA,nB),specs=envSpecs(t,paired,false);
  const micro=Math.max(1,Math.min(paired,Math.floor(Number(t.config.optimizerMicrobatchSize)||32)));
  const optimizerStepsPlanned=Math.ceil(paired/micro),policyVersionStart=t.policyVersion;
  t.lastTrainingEnvSeeds=specs.map(x=>x.envSeed);
  t.lastTrainingEnvSpecs=specs.map(x=>({envSeed:x.envSeed,mapKind:x.mapKind,swarmSize:x.swarmSize}));
  const manualCaptureRequested=Boolean(t.forceCapture),captureTrace=manualCaptureRequested||(t.batch%10===0),wantOracle=shouldCaptureOracleBatch(t);

  const allA=[],allB=[],collectedReplay=[];
  let captureEvent=null,capturedOracle=false,optimizerSteps=0,cA=null,cB=null,metaRecordsA=0,metaRecordsB=0,lastConceptA=null,lastConceptB=null;
  const norm={A:0,B:0,H:0,MA:0,MB:0,count:0};

  for(let offset=0;offset<paired;offset+=micro){
    const end=Math.min(paired,offset+micro),aSpecs=offset<nA?specs.slice(offset,Math.min(end,nA)):[],bSpecs=offset<nB?specs.slice(offset,Math.min(end,nB)):[];
    const first=offset===0,captureThis=wantOracle&&!capturedOracle&&aSpecs.length>0&&bSpecs.length>0;
    const checkpointA=captureThis?createScopeCheckpoint(t,"A",null,{replaySnapshot:oracleReplaySnapshot}):null;
    const checkpointB=captureThis?createScopeCheckpoint(t,"B-system",null,{replaySnapshot:oracleReplaySnapshot}):null;

    onProgress({phase:"microbatch",index:optimizerSteps+1,total:optimizerStepsPlanned,offset,end,groupA:aSpecs.length,groupB:bSpecs.length,policyVersion:t.policyVersion});
    const [aRows,bRows]=await Promise.all([
      aSpecs.length?dispatchGroup(pool,t,"A",aSpecs,{training:true,captureTrace:captureTrace&&first,capturePreview:first,captureOracle:captureThis}):Promise.resolve([]),
      bSpecs.length?dispatchGroup(pool,t,"B",bSpecs,{training:true,captureTrace:captureTrace&&first,capturePreview:first,captureOracle:captureThis}):Promise.resolve([])
    ]);

    const conceptA=mergeConceptWorldFromWorkers(t,"A",aRows),conceptB=mergeConceptWorldFromWorkers(t,"B",bRows);lastConceptA=conceptA;lastConceptB=conceptB;
    const aAgg=aggregateAGrad(t,aRows),bAgg=aggregateBGrads(t,bRows),metaA=aggregateMeta(t,aRows,"A"),metaB=aggregateMeta(t,bRows,"B"),worldA=aggregateWorldModel(t,aRows,"A"),worldB=aggregateWorldModel(t,bRows,"B"),semanticA=aggregateSemanticSound(t,aRows,"A"),semanticB=aggregateSemanticSound(t,bRows,"B");
    const specialistEvidenceA=aggregateSpecialistEvidence(aRows),specialistEvidenceB=aggregateSpecialistEvidence(bRows);
    const sourceBatchMarker=t.batch+1+optimizerSteps/Math.max(1,optimizerStepsPlanned);
    const oracleAggregates=captureThis?{
      A:structuredClone(aAgg.grad),B:bAgg.locals.map(x=>structuredClone(x)),H:structuredClone(bAgg.higher),
      MA:structuredClone(metaA.grad),MB:structuredClone(metaB.grad),WA:structuredClone(worldA.grad),WB:structuredClone(worldB.grad),SA:structuredClone(semanticA.grad),SB:structuredClone(semanticB.grad),
      semanticEventsA:structuredClone(semanticA.events),semanticEventsB:structuredClone(semanticB.events),specialistA:structuredClone(specialistEvidenceA),specialistB:structuredClone(specialistEvidenceB),
      totalMetaA:metaA.total,totalMetaB:metaB.total,totalWorldA:worldA.total,totalWorldB:worldB.total,totalSemanticA:semanticA.total,totalSemanticB:semanticB.total,sourceBatchMarker
    }:null;
    const clips=applyAggregates(t,aAgg,bAgg,metaA,metaB,worldA,worldB),semanticApplyA=applySemanticSoundAggregate(t,semanticA,"A"),semanticApplyB=applySemanticSoundAggregate(t,semanticB,"B");

    if(aRows.length&&t.config.cSpecializationEnabled!==false)cA=updateSpecialization(t.specialistsA,specialistEvidenceA,t.config,sourceBatchMarker);
    if(bRows.length&&t.config.cSpecializationEnabled!==false)cB=updateSpecialization(t.specialistsB,specialistEvidenceB,t.config,sourceBatchMarker);

    allA.push(...aRows);allB.push(...bRows);
    collectedReplay.push(...aRows.flatMap(x=>x.replaySamples||[]),...bRows.flatMap(x=>x.replaySamples||[]));
    metaRecordsA+=metaA.total;metaRecordsB+=metaB.total;
    norm.A+=clips.A.clippedNorm||0;
    norm.B+=clips.B.local.length?clips.B.local.reduce((z,x)=>z+(x.clippedNorm||0),0)/clips.B.local.length:0;
    norm.H+=clips.B.higher.clippedNorm||0;norm.MA+=clips.metaA.clippedNorm||0;norm.MB+=clips.metaB.clippedNorm||0;norm.count++;

    const changedA=Boolean(aAgg.total||metaA.total||worldA.total||semanticApplyA.changed||conceptA.changed);
    const changedB=Boolean(bAgg.total||bAgg.higherTotal||metaB.total||worldB.total||semanticApplyB.changed||conceptB.changed);
    if(changedA)markGroupPolicyUpdate(t,"A",1);
    if(changedB)markGroupPolicyUpdate(t,"B",1);
    if(changedA||changedB){t.policyVersion++;optimizerSteps++;}

    if(captureThis){
      captureEvent=enqueueOracleCapture(t,{checkpointA,checkpointB,aggregateA:oracleAggregates.A,aggregateB:oracleAggregates.B,aggregateHigher:oracleAggregates.H,
        aggregateMetaA:oracleAggregates.MA,aggregateMetaB:oracleAggregates.MB,aggregateWorldA:oracleAggregates.WA,aggregateWorldB:oracleAggregates.WB,aggregateSemanticA:oracleAggregates.SA,aggregateSemanticB:oracleAggregates.SB,semanticEventsA:oracleAggregates.semanticEventsA,semanticEventsB:oracleAggregates.semanticEventsB,specialistEvidenceA:oracleAggregates.specialistA,specialistEvidenceB:oracleAggregates.specialistB,
        aResults:aRows,bResults:bRows,totalA:aAgg.total,totalB:bAgg.total,totalHigher:bAgg.higherTotal,totalMetaA:oracleAggregates.totalMetaA,totalMetaB:oracleAggregates.totalMetaB,totalWorldA:oracleAggregates.totalWorldA,totalWorldB:oracleAggregates.totalWorldB,totalSemanticA:oracleAggregates.totalSemanticA,totalSemanticB:oracleAggregates.totalSemanticB,
        sourceBatchMarker:oracleAggregates.sourceBatchMarker});
      capturedOracle=Boolean(captureEvent);
    }
  }

  if(["all","v5-all","all-v9","3d-all"].includes(t.config.mapMode||"stage"))t.mapEpisodeCursor=(Math.max(0,Math.floor(Number(t.mapEpisodeCursor)||0))+paired);
  markGroupBatchComplete(t,"A",{optimizerSteps:0,simulations:nA,advanceCursor:false});
  markGroupBatchComplete(t,"B",{optimizerSteps:0,simulations:nB,advanceCursor:false});
  const replay=applyAuxReplay(t,replaySamples),metricsA=weightedMetrics(allA),metricsB=weightedMetrics(allB);
  t.batch++;

  const causal={ran:false,background:true,queue:t.causal.queue.length,captures:Object.keys(t.causal.captures||{}).length,last:t.causal.last};
  const qanda=qandaSummary(t),den=Math.max(1,norm.count);
  const row={batch:t.batch,stage:t.stage,mapMode:t.config.mapMode||"stage",experimental:experimentalManifest(t.config),A:metricsA,B:metricsB,parameterCountA:t.parameterCountA,parameterCountB:t.parameterCountB,
    parameterCountQanda:t.parameterCountQanda,optimizerMicrobatchSize:micro,optimizerSteps,optimizerStepsPlanned,policyVersionStart,policyVersionEnd:t.policyVersion,
    gradA:norm.A/den,gradB:norm.B/den,gradH:norm.H/den,gradMetaA:norm.MA/den,gradMetaB:norm.MB/den,metaRecordsA,metaRecordsB,
    worldModelRecordsA:allA.reduce((z,r)=>z+(r.worldModelUnits||0),0),worldModelRecordsB:allB.reduce((z,r)=>z+(r.worldModelUnits||0),0),
    worldModelLossA:allA.reduce((z,r)=>z+(Number(r.worldModelLoss)||0)*(r.worldModelUnits||0),0)/Math.max(1,allA.reduce((z,r)=>z+(r.worldModelUnits||0),0)),
    worldModelLossB:allB.reduce((z,r)=>z+(Number(r.worldModelLoss)||0)*(r.worldModelUnits||0),0)/Math.max(1,allB.reduce((z,r)=>z+(r.worldModelUnits||0),0)),
    semanticSoundEpisodesA:allA.reduce((z,r)=>z+(r.semanticSoundEpisodes||0),0),semanticSoundEpisodesB:allB.reduce((z,r)=>z+(r.semanticSoundEpisodes||0),0),semanticSoundMode:t.config.semanticSoundMode||"off",semanticSoundModule:t.config.semanticSoundModule||null,
    conceptWorld:{A:{metrics:lastConceptA?.metrics||null,snapshot:conceptWorldSnapshot(t.conceptA,[])},B:{metrics:lastConceptB?.metrics||null,snapshot:conceptWorldSnapshot(t.conceptB,[])},conceptOnly:t.config.conceptWorldOnly!==false},
    cSpecialistsA:cA,cSpecialistsB:cB,replayUsedA:replay.usedA,replayUsedB:replay.usedB,replayGradA:replay.gradA,replayGradB:replay.gradB,gpu:summarizeGpu([...allA,...allB]),causal:causalSummary(t),qanda};
  t.history.push(row);if(t.history.length>240)t.history.shift();

  const lastSnapshot=rows=>{for(let i=rows.length-1;i>=0;i--)if(rows[i]?.snapshot)return rows[i].snapshot;return null;};
  const firstTrace=rows=>rows.find(x=>x.trace?.length)?.trace||[];
  const traceA=firstTrace(allA),traceB=firstTrace(allB),manualCaptureDelivered=manualCaptureRequested&&Boolean(traceA.length||traceB.length);if(manualCaptureDelivered)t.forceCapture=false;
  return{row,snapshotA:lastSnapshot(allA),snapshotB:lastSnapshot(allB),traceA,traceB,manualCaptureRequested,manualCaptureDelivered,
    simulationSummaries:[...allA.flatMap(x=>x.envSummaries||[]),...allB.flatMap(x=>x.envSummaries||[])],
    replaySamples:collectedReplay,causal,qanda,captureEvent};
}

export async function processOracleBackground(pool,t,limit=null){
  ensureCausalRuntime(t);ensureQandaState(t);
  if(!t.causal.config.enabled||!t.causal.queue.length)return{ran:false,queue:t.causal.queue.length,captures:Object.keys(t.causal.captures||{}).length,last:t.causal.last};
  const requested=Number(limit),configured=Number(t.causal.config.experimentsPerBatch)||0;
  const n=Math.max(1,Math.floor(Number.isFinite(requested)&&requested>0?requested:(configured>0?configured:pool.count)));
  return processCausalQueue(t,n,async request=>{
    const msg=await pool.submit({type:"causal-oracle",request});
    return msg.oracleResult;
  });
}


const MODULE_RSI_TARGETS=Object.freeze([
  {id:"adaptiveActionBudget",off:{mapAdaptiveActionBudget:false},on:{mapAdaptiveActionBudget:true}},
  {id:"energy",off:{energyEnabled:false},on:{energyEnabled:true}},
  {id:"corticalSound",off:{corticalSoundEnabled:false},on:{corticalSoundEnabled:true}},
  {id:"semanticSound",off:{semanticSoundMode:"off"},on:{semanticSoundMode:"active"}},
  {id:"echo",off:{echoEnabled:false},on:{echoEnabled:true}},
  {id:"spatial",off:{spatialCortexEnabled:false},on:{spatialCortexEnabled:true}},
  // Dependency-preserving interventions: prerequisites are identical in both
  // paired branches so ON-OFF isolates the target rather than "target + prerequisite".
  {id:"worldModel",off:{spatialCortexEnabled:true,worldModelEnabled:false},on:{spatialCortexEnabled:true,worldModelEnabled:true}},
  {id:"perspective",off:{spatialCortexEnabled:true,perspectiveEnabled:false},on:{spatialCortexEnabled:true,perspectiveEnabled:true}},
  {id:"organogenesis",off:{organogenesisEnabled:false},on:{organogenesisEnabled:true}},
  {id:"specialization",off:{cSpecializationEnabled:false},on:{cSpecializationEnabled:true}},
  {id:"metaController",off:{metaControllerEnabled:false},on:{metaControllerEnabled:true}},
  {id:"identity",off:{identityEnabled:false},on:{identityEnabled:true}},
  {id:"morphology",off:{metaControllerEnabled:true,morphologyMode:"off"},on:{metaControllerEnabled:true,morphologyMode:"active"}},
  {id:"adaptiveK",off:{metaControllerEnabled:true,adaptiveKMode:"off"},on:{metaControllerEnabled:true,adaptiveKMode:"active"}}
]);

function flattenEnvSummaries(rows=[]){return rows.flatMap(r=>r?.envSummaries||[]).sort((a,b)=>(a.envId??0)-(b.envId??0));}
function pairedMetric(onRows,offRows,key){
  const a=flattenEnvSummaries(onRows),b=flattenEnvSummaries(offRows),byOff=new Map(b.map(x=>[x.envId,x])),d=[];
  for(const x of a){const y=byOff.get(x.envId);if(!y)continue;d.push((Number(x[key])||0)-(Number(y[key])||0));}
  const mean=d.length?d.reduce((s,x)=>s+x,0)/d.length:0;
  let q=0;for(const x of d)q+=(x-mean)*(x-mean);
  return{mean,sd:d.length?Math.sqrt(q/d.length):0,n:d.length,values:d};
}
function modulePairSummary(onRows,offRows){
  const metrics={};
  for(const key of ["success","totalReward","actionEfficiency","actions","computeSpent","energySpent","meanDistance","rejectRate"])metrics[key]=pairedMetric(onRows,offRows,key);
  return{metrics,on:weightedMetrics(onRows),off:weightedMetrics(offRows)};
}

export async function evaluateModuleAblations(pool,t,{cases=2,groups=["A","B"]}={}){
  const n=Math.max(1,Math.min(32,Math.floor(Number(cases)||2))),wanted=groups.filter(g=>g==="A"||g==="B"),rootManifest=experimentalManifest(t.config),commonSpecs=envSpecs(t,n,true),rows=[];
  for(const target of MODULE_RSI_TARGETS){
    const offConfig=cloneConfig({...t.config,...target.off,experimentalProfile:"custom"}),onConfig=cloneConfig({...t.config,...target.on,experimentalProfile:"custom"});
    const rec={id:target.id,rootManifest,onEffective:effectiveFeatureGates(onConfig),offEffective:effectiveFeatureGates(offConfig),groups:{}};
    for(const group of wanted){
      const specs=commonSpecs.map(x=>({...x})),models=frozenModelsForGroup(t,group);
      const [offRows,onRows]=await Promise.all([
        dispatchGroup(pool,t,group,specs,{training:false,captureTrace:false,capturePreview:false,models,configOverride:offConfig}),
        dispatchGroup(pool,t,group,specs,{training:false,captureTrace:false,capturePreview:false,models,configOverride:onConfig})
      ]);
      rec.groups[group]=modulePairSummary(onRows,offRows);
    }
    rows.push(rec);
  }
  return{version:2,kind:"matched-h0-module-ablation",batch:t.batch,policyVersion:t.policyVersion,cases:n,groups:wanted,rootManifest,specs:commonSpecs.map(({envId,envSeed,actionSeed,mapKind,swarmSize,actionBudget})=>({envId,envSeed,actionSeed,mapKind,swarmSize,actionBudget})),rows};
}

export async function evaluateAllMapsReadiness(pool,t,countPerMap=3){
  const count=Math.max(1,Math.floor(Number(countPerMap)||3)),maps={},sizes=swarmEvaluationSizes(t.config),mapKinds=pretrainMapKinds(t.workflow),frozenA=frozenModelsForGroup(t,"A"),frozenB=frozenModelsForGroup(t,"B");
  for(let mi=0;mi<mapKinds.length;mi++){
    const mapKind=mapKinds[mi];maps[mapKind]={};
    for(let si=0;si<sizes.length;si++){
      const swarmSize=sizes[si],base=mix32(0x51A7E^Math.imul(mi+1,0x9e3779b1)^Math.imul(swarmSize,0x85ebca6b));
      const specs=Array.from({length:count},(_,i)=>({
        envId:mi*100000+si*1000+i,
        envSeed:mix32(base^Math.imul(i+1,0x85ebca6b)),
        actionSeed:mix32(base^Math.imul(i+1,0xc2b2ae35)),
        mapKind,swarmSize,actionBudget:actionBudgetForSwarm(t.config,swarmSize,t.curriculumFrontier)
      }));
      const [a,b]=await Promise.all([
        dispatchGroup(pool,t,"A",specs,{training:false,captureTrace:false,models:frozenA}),
        dispatchGroup(pool,t,"B",specs,{training:false,captureTrace:false,models:frozenB})
      ]);
      maps[mapKind][swarmSize]={A:weightedMetrics(a),B:weightedMetrics(b),threshold:readinessThreshold(mapKind),swarmSize};
    }
  }
  return{checkedAtBatch:t.batch,sizes,mapKinds:[...mapKinds],dimensionPhase:t.workflow?.dimensionPhase||"2d",...summarizeReadiness(maps,sizes,mapKinds),maps};
}

export async function evaluateHeldout(pool,t,count=8){
  const specs=envSpecs(t,count,true),frozenA=frozenModelsForGroup(t,"A"),frozenB=frozenModelsForGroup(t,"B");
  const [a,b]=await Promise.all([
    dispatchGroup(pool,t,"A",specs,{training:false,captureTrace:false,models:frozenA}),
    dispatchGroup(pool,t,"B",specs,{training:false,captureTrace:false,models:frozenB})
  ]);
  const A=weightedMetrics(a),B=weightedMetrics(b);
  t.lastEval={batch:t.batch,stage:t.stage,A,B};
  const threshold=STAGES[t.stage].pass;
  const curriculumActive=(t.config.mapMode||"stage")==="stage";
  if(curriculumActive){
    if(A.success>=threshold&&B.success>=threshold)t.evalStreak++;else t.evalStreak=0;
    if(t.evalStreak>=3&&t.stage<STAGES.length-1){t.stage++;t.evalStreak=0;return {A,B,advanced:true};}
  }else t.evalStreak=0;
  return {A,B,advanced:false};
}


export async function evaluateAblations(pool,t,count=t.config.diagnosticEnvCount||4){
  const specs=envSpecs(t,Math.max(1,Math.floor(count)),true),frozenA=frozenModelsForGroup(t,"A"),frozenB=frozenModelsForGroup(t,"B");
  const profiles=[
    {id:"normal",ablation:null},
    {id:"self_zero",ablation:{selfMode:"zero"}},
    {id:"self_reset",ablation:{selfMode:"reset"}},
    {id:"self_shuffle",ablation:{selfMode:"shuffle"}},
    {id:"history_broken",ablation:{historyBroken:true}}
  ];
  const A={},B={};
  for(const p of profiles){
    const ar=await dispatchGroup(pool,t,"A",specs,{training:false,captureTrace:false,ablation:p.ablation,models:frozenA});
    const br=await dispatchGroup(pool,t,"B",specs,{training:false,captureTrace:false,ablation:p.ablation,models:frozenB});
    A[p.id]=weightedMetrics(ar);B[p.id]=weightedMetrics(br);
  }
  for(const p of [
    {id:"higher_off",ablation:{higherMode:"off"}},
    {id:"higher_reset",ablation:{higherMode:"reset"}}
  ]){
    const br=await dispatchGroup(pool,t,"B",specs,{training:false,captureTrace:false,ablation:p.ablation,models:frozenB});
    B[p.id]=weightedMetrics(br);
  }
  return {batch:t.batch,stage:t.stage,policyVersion:t.policyVersion,parameterCountA:t.parameterCountA,parameterCountB:t.parameterCountB,A,B};
}
