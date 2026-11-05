import {ACTION_N,ACTIONS,DEFAULT_SWARM_SIZE,NET,FACE_DEFS,OBS_FIELDS,BODY_OBS_N} from "./config.js";
import {RNG,sampleCategorical} from "./math.js";
import {makeWorld,distanceAt,worldDimension,bodyMetrics,checkpointZone,occupiedMap} from "./world.js";
import {EgoScheduler} from "./scheduler.js";
import {buildObservation,consumeSinceLastMotion,localEdgeSense,preparePerception} from "./sensors.js";
import {resolveIntent} from "./mechanics.js";
import {consumePendingReward,rewardTransition} from "./reward.js";
import {auxForward,forwardLocal} from "./brain.js";
import {forwardHigher,poolSelfStates} from "./higher-self.js";
import {advanceCorticalSound,createCorticalSound,emitCortical,emitCorticalSequence,hearCorticalRaw,reinforceCortical,resizeCorticalSound,boostSignal,corticalEmitterAudioSnapshot,corticalSequenceAudioSnapshots,corticalSnapshot} from "./cortical-sound.js";
import {createEchoField,echoSnapshot,emitEcho,resizeEchoField} from "./echo-field.js";
import {createSpatialCortex,noteActualMotion,resizeSpatial,spatialSnapshot} from "./spatial-cortex.js";
import {createPerspectiveEngine,perspectiveSnapshot,updatePerspectives} from "./perspective-engine.js";
import {createLifecycle,budCell,fusionBud,lifecycleMaintenance,lifecycleResourceStats,lifecycleSnapshot,lowestUsefulRetireCandidate,noteCellOutcome,reactivateDormant,retireCell} from "./lifecycle.js";
import {META_ACTIONS,chooseMeta,createMetaController,metaFeatures,metaSnapshot} from "./meta-controller.js";
import {assignSpecialists,createSpecializationSystem,emptySpecialistStats,markMorphParent,noteSpecialist,specialistEntry,specializationSnapshot} from "./specialization.js";
import {applyAdaptiveActionBudget,computeBudgetForActionHorizon} from "./action-budget.js";
import {actionEnergyBreakdown,canAffordMorphology,createEnergyEconomy,energyContext,energySnapshot,morphologyEnergyCost,noteEnergyProgress,spendEnergy} from "./energy.js";
import {createWorldModel,worldModelSnapshot} from "./world-model-learner.js";
import {createOrganSystem,organForCell,organSnapshot,updateOrgans} from "./organogenesis.js";
import {effectiveFeatureGates,policyActionMask} from "./experimental-features.js";
import {createIdentityField,identityAgencyTargets,identitySnapshot,noteIdentityPrediction} from "./identity-field.js";
import {createSemanticSoundModuleEpisode,createSemanticSoundModuleModel,semanticSoundImplementation,semanticSoundModuleEpisodeResult,semanticSoundModuleHear,semanticSoundModuleHigherBias,semanticSoundModuleOutcome,semanticSoundModulePlanSignal,semanticSoundModuleSnapshot} from "./modules/semantic-sound-registry.js";
import {corticalAudioFrame} from "./cortical-audio.js";
import {applyConceptObservation,conceptWorldSnapshot} from "./concept-world-2xf32.js";
import {createConceptFlowState,leastResistancePolicy,observeConceptFlow,conceptFlowSnapshot} from "./concept-flow-2d.js";

function argmax(a){let bi=0,b=-Infinity;for(let i=0;i<a.length;i++)if(a[i]>b){b=a[i];bi=i;}return bi;}
function unit3(x,y,z){const m=Math.hypot(x,y,z);return m?{x:x/m,y:y/m,z:z/m}:{x:0,y:0,z:0};}
function flowIntents(world){
  return (world?.egoRuntime||[]).map(r=>({action:Number(r?.intentAction)||0,confidence:Number(r?.confidence)||0}));
}
function flowCellDrives(world){
  return (world?.egoRuntime||[]).map(r=>{const a=ACTIONS[Number(r?.intentAction)||0]||ACTIONS[0],c=Math.max(0,Math.min(1,Number(r?.confidence)||0));return{x:(Number(a?.dx)||0)*c,y:(Number(a?.dy)||0)*c};});
}

function hiddenFingerprint(hStates=[]){
  return hStates.map((h,i)=>{let sum=0,q=0,mx=0;for(const x of h||[]){const v=Number(x)||0;sum+=v;q+=v*v;mx=Math.max(mx,Math.abs(v));}const n=Math.max(1,h?.length||0);return{cell:i,mean:sum/n,l2:Math.sqrt(q),maxAbs:mx};});
}
function allLocalSides(world){
  const occupied=occupiedMap(world.cubes);
  return world.cubes.map((_,i)=>({ego:i,sides:FACE_DEFS.map(face=>{const q=localEdgeSense(world,i,face,occupied);return{side:face.name,contact:q.contact,wall:q.wall,push:q.push,pull:q.pull,relativeMotion:q.relativeMotion,neighborId:q.neighborId??null};})}));
}
function nativeTraceState(world,scheduler,hStates=[]){
  const body=bodyMetrics(world),distances=world.progressSignal==="exploration"?world.cubes.map((c,i)=>-(Number(world.egoRuntime?.[i]?.maxProgress)||0)):world.cubes.map(c=>distanceAt(world,c.x,c.y,c.z||0)),zones=world.cubes.map(c=>checkpointZone(world,c));
  return{globalStep:world.globalStep,simTime:world.simTime,scheduler:{cycle:scheduler.cycle,orderPos:scheduler.orderPos,stepInTurn:scheduler.stepInTurn,decisions:scheduler.decisions,stepsPerEgoTurn:scheduler.stepsPerEgoTurn},
    body,distances,zones,maxProgress:world.egoRuntime.map(r=>Number(r.maxProgress)||0),positions:world.cubes.map(c=>[c.x,c.y,c.z||0]),allLocalSides:allLocalSides(world),recurrentFingerprint:hiddenFingerprint(hStates)};
}
function worldVisualMeta(world){return{stage:world.stage,seed:world.seed,mapKind:world.mapKind,routeKind:world.routeKind,v5Procedural:world.v5Procedural===true,physicalDimensions:worldDimension(world),gridW:world.gridW??null,gridH:world.gridH??null,gridD:world.gridD??1,maxGlobalActions:world.maxGlobalActions??null,actionBudgetPlan:world.actionBudgetPlan?{...world.actionBudgetPlan}:null,free:world.free?Uint8Array.from(world.free):null,free3d:world.free3d?Uint8Array.from(world.free3d):null,terrain:world.terrain?Uint8Array.from(world.terrain):null,checkpoint:world.checkpoint?{...world.checkpoint}:null,opening:(world.opening||[]).map(b=>({...b}))};}
function makePreview(world,config){const exactMoves=config.exactMoveRendering!==false,fps=exactMoves?Math.max(1,Math.min(60,Number(config.exactPreviewMovesPerSecond)||30)):Math.max(1,Math.min(60,Number(config.previewFps)||30)),legacyMax=Math.max(8,Math.floor(Number(config.previewMaxFrames)||600)),maxFrames=exactMoves?Math.max(legacyMax,Math.floor(Number(world.maxGlobalActions)||0)+2):legacyMax;return{fps,durationSeconds:0,maxFrames,exactMoves,cellCount:world.cubes.length,envSeed:world.seed>>>0,...worldVisualMeta(world),frames:[]};}
function addPreviewFrame(preview,world,activeEgo,force=false){
  if(!preview)return;const prev=preview.frames.at(-1);if(prev&&prev.globalStep===world.globalStep&&!force)return;const dim=worldDimension(world),positions=new Int32Array(world.cubes.length*(dim===3?3:2));
  for(let i=0;i<world.cubes.length;i++){const q=i*(dim===3?3:2);positions[q]=world.cubes[i].x;positions[q+1]=world.cubes[i].y;if(dim===3)positions[q+2]=world.cubes[i].z||0;}
  const organIds=Int32Array.from(world.cubes.map((_,i)=>organForCell(world.v9?.organs,i)?.id??-1)),specialistIds=Int32Array.from(world.v9?.specialistIds||new Array(world.cubes.length).fill(0));
  const corticalAudioEvents=(world.v9?.pendingCorticalAudioEvents||[]).splice(0).map(e=>structuredClone(e)),fallbackAudio=world.v9?.featureGates?.corticalSound===false?null:corticalAudioFrame(world.v9?.cortical),corticalAudio=corticalAudioEvents.at(-1)?.audio||fallbackAudio;
  const conceptCoords=Float32Array.from((world.v9?.conceptCoords||[]).flatMap(z=>[Number(z?.[0])||0,Number(z?.[1])||0]));
  const f={positions,cellCount:world.cubes.length,physicalDimensions:dim,activeEgo:Math.max(0,Math.min(world.cubes.length-1,Number(activeEgo)||0)),lastMoves:Uint32Array.from(world.lastMoves||[]),organIds,specialistIds,conceptCoords,globalStep:world.globalStep,simTime:world.simTime,success:Boolean(world.success),k:world.v9?.currentK||1,computeSpent:world.v9?.computeSpent||0,corticalAudio,corticalAudioEvents};
  if(preview.frames.length<preview.maxFrames)preview.frames.push(f);else if(force&&preview.frames.length)preview.frames[preview.frames.length-1]=f;
}
function initV9(world,hStates,config,seed,metaModel,specialistSystem,worldModel,group,identityCounterparts){
  const computeBudget=computeBudgetForActionHorizon(world,config,world.maxGlobalActions),featureGates=effectiveFeatureGates(config);
  const specialists=specialistSystem||createSpecializationSystem(seed,config),specialistIds=featureGates.specialization?assignSpecialists(specialists,world.cubes.length,seed):new Array(world.cubes.length).fill(0),spatial=createSpatialCortex(world,config),identity=createIdentityField(world,{...config,identityEnabled:featureGates.identity!==false&&config.identityEnabled!==false},group,identityCounterparts,seed);
  world.v9={featureGates,computeSpent:0,computeBudget,currentK:Math.max(1,Number(config.initialK)||1),perception:[],events:[],pendingCorticalAudioEvents:[],semanticSound:null,energy:createEnergyEconomy(world,config),cortical:createCorticalSound(world.cubes.length,config),echo:createEchoField(world.cubes.length,config),spatial,identity,perspective:createPerspectiveEngine(config),organs:createOrganSystem(),lifecycle:null,meta:metaModel||createMetaController(seed,config),specialists,specialistIds,worldModel:worldModel||createWorldModel(seed),worldModelRecords:[],worldModelRecordCap:Math.max(64,Number(config.worldModelRecordCap)||1024),lastMetaAt:0,recentReward:0};
  world.v9.lifecycle=createLifecycle(world,config);
  if(featureGates.perspective)updatePerspectives(world.v9.perspective,world.v9.spatial,worldDimension(world));
  if(featureGates.organogenesis)updateOrgans(world.v9.organs,world,world.v9.cortical,world.v9.echo,world.v9.specialistIds,world.v9.spatial);
}
function resizeSubsystems(world,hStates){const n=world.cubes.length;resizeCorticalSound(world.v9.cortical,n);resizeEchoField(world.v9.echo,n);resizeSpatial(world.v9.spatial,n);world.v9.perception.length=n;while(hStates.length<n)hStates.push(new Float64Array(NET.selfHidden));while(hStates.length>n)hStates.pop();while(world.v9.specialistIds.length<n)world.v9.specialistIds.push(0);while(world.v9.specialistIds.length>n)world.v9.specialistIds.pop();}
function snapshotWorld(world,activeEgo){const g=world.v9.featureGates||{};return{...worldVisualMeta(world),cubes:world.cubes.map((c,i)=>({...c,specialistId:world.v9.specialistIds[i]??0,organId:g.organogenesis?(organForCell(world.v9.organs,i)?.id??null):null})),globalStep:world.globalStep,simTime:world.simTime,success:world.success,lastMoves:[...(world.lastMoves||[])],activeEgo,v9:{featureGates:{...g},computeSpent:world.v9.computeSpent,computeBudget:world.v9.computeBudget,currentK:world.v9.currentK,energy:g.energy?energySnapshot(world.v9.energy):null,cortical:g.corticalSound?corticalSnapshot(world.v9.cortical):null,echo:g.echo?echoSnapshot(world.v9.echo):null,spatial:g.spatial?spatialSnapshot(world.v9.spatial):null,identity:g.identity?identitySnapshot(world.v9.identity):null,perspective:g.perspective?perspectiveSnapshot(world.v9.perspective):null,organs:g.organogenesis?organSnapshot(world.v9.organs):null,lifecycle:lifecycleSnapshot(world.v9.lifecycle),meta:g.metaController?metaSnapshot(world.v9.meta):null,specialization:g.specialization?specializationSnapshot(world.v9.specialists):null,worldModel:g.worldModel?worldModelSnapshot(world.v9.worldModel):null,semanticSound:world.v9.semanticSound?structuredClone(world.v9.semanticSound):null,worldModelRecordCount:g.worldModel?(world.v9.worldModelRecords?.length||0):0,events:(world.v9.events||[]).slice(-64).map(e=>({...e})),specialistIds:[...world.v9.specialistIds]}};}

export function runEpisode({group="A",stage=0,mapKind="stage",envId=0,envSeed=1,actionSeed=2,swarmSize=null,actionBudget=null,config,sharedModel=null,privateModels=null,higherModel=null,metaModel=null,specialistSystem=null,worldModel=null,semanticSoundModel=null,conceptModel=null,training=true,captureTrace=false,capturePreview=false,ablation=null,identityCounterparts=[],actionPolicyHook=null,metaPolicyHook=null,onStart=null,onLearnerRoot=null,onStep=null,onObserve=null,observeEverySteps=25,captureCellIo=true}){
  const n=Math.max(2,Math.floor(Number(swarmSize)||Number(config.swarmSizeMax)||DEFAULT_SWARM_SIZE)),budget=Math.max(1,Math.floor(Number(actionBudget)||Number(config.maxGlobalActions)||1)),physicalDimensions=String(mapKind).startsWith("3d-")?3:(Number(config.physicalDimensions)===3?3:2),world=makeWorld(stage,envSeed,budget,mapKind,n,physicalDimensions),rng=new RNG(actionSeed);
  const horizonConfig=String(config.horizonCurriculumMode)==="moving-carrot"?{...config,mapAdaptiveActionBudget:false}:config;
  applyAdaptiveActionBudget(world,horizonConfig,budget);
  if(config.reward?.progressSignal==="exploration")world.progressSignal="exploration";
  const initialDistances=world.cubes.map(q=>distanceAt(world,q.x,q.y,q.z||0)),startMeanDistance=initialDistances.reduce((s,x)=>s+x,0)/Math.max(1,initialDistances.length),startWorstDistance=Math.max(...initialDistances);
  const hStates=Array.from({length:world.cubes.length},()=>new Float64Array(NET.selfHidden));initV9(world,hStates,config,actionSeed,metaModel,specialistSystem,worldModel,group,identityCounterparts);
  const semanticMode=String(config.semanticSoundMode||"off").toLowerCase(),semanticModuleId=String(config.semanticSoundModule||"");
  const semanticBinding=semanticSoundImplementation(semanticModuleId),semanticEnabled=Boolean(semanticBinding)&&semanticMode!=="off";
  const semanticModel=semanticEnabled?structuredClone(semanticSoundModel||createSemanticSoundModuleModel(semanticModuleId,(actionSeed^0x53c0a1)>>>0,config)):null;
  const semanticRuntime=semanticModel?createSemanticSoundModuleEpisode(semanticModel,{mode:semanticMode,envId}):null;
  if(semanticRuntime)world.v9.semanticSound={mode:semanticMode,moduleId:semanticModuleId,...semanticSoundModuleSnapshot(semanticRuntime.model)};
  let scheduler=new EgoScheduler({...config,stepsPerEgoTurn:world.v9.currentK,swarmSize:world.cubes.length}),open=new Array(world.cubes.length).fill(null),trajectories=Array.from({length:world.cubes.length},()=>[]),higherHidden=new Float64Array(NET.higherHidden),higherContext=new Float64Array(NET.higherContext),lastPool=poolSelfStates(hStates);
  const gates=world.v9.featureGates,actionMask=policyActionMask(config,physicalDimensions),higherRecords=[],trace=[],metaRecords=[],specialistStats=emptySpecialistStats(world.v9.specialists),preview=capturePreview?makePreview(world,config):null,traceRoot=captureTrace?nativeTraceState(world,scheduler,hStates):null;let totalReward=0,entropySum=0,actionCount=0,rejects=0,metaRewardWindow=0,pendingMeta=null,sumN=0,sumK=0,nkSamples=0;
  const liveCellIo=typeof onStep==="function"&&captureCellIo?new Array(world.cubes.length).fill(null):null;
  const conceptEnabled=config.conceptWorldEnabled!==false&&conceptModel?.schema==="octopus-2d-everything-concept-v1";
  const conceptOnly=conceptEnabled&&config.conceptWorldOnly!==false;
  const conceptFlowEnabled=conceptEnabled&&config.conceptFlowEnabled!==false;
  const conceptFlow=conceptFlowEnabled?createConceptFlowState(conceptModel.flow,conceptModel.id||group):null;
  if(conceptFlowEnabled)conceptModel.flow=conceptFlow;
  const conceptRecords=[],conceptCap=Math.max(16,Math.floor(Number(config.conceptWorldRecordCapPerEpisode)||256));
  world.v9.conceptCoords=Array.from({length:world.cubes.length},()=>[0,0]);
  const conceptualize=(rawObs,ego,prevAction=0)=>{
    if(!conceptEnabled)return{obs:rawObs,coord:null};
    const q=applyConceptObservation(conceptModel,rawObs,{conceptOnly,prevAction});
    if(Number.isInteger(ego)&&ego>=0){while(world.v9.conceptCoords.length<world.cubes.length)world.v9.conceptCoords.push([0,0]);world.v9.conceptCoords[ego]=Array.from(q.coord);}
    return q;
  };
  const brainPrevious=(prevAction,pending,prevMismatch)=>conceptOnly?{action:0,reward:0,mismatch:[0,0,0]}:{action:prevAction,reward:pending,mismatch:prevMismatch};
  let learnerRootPrepared=false;
  const obsNames=OBS_FIELDS.names;
  const agencyNames=["actualDx","actualDy","actualDz","accepted",...Array.from({length:Math.max(0,(world.v9.identity?.predictedAgency?.length||0))},(_,i)=>"identityAgency"+i)];
  if(preview)addPreviewFrame(preview,world,scheduler.currentEgo(),true);
  if(typeof onStart==="function"){try{onStart({type:"start",group,envId,snapshot:snapshotWorld(world,scheduler.currentEgo())});}catch{}}
  const getModel=i=>group==="A"?sharedModel:privateModels[privateModels.length===1?0:i];
  const specEntry=i=>gates.specialization?specialistEntry(world.v9.specialists,world.v9.specialistIds[i]??0):null;
  const effectiveHigherContext=(i,base)=>{const out=Float64Array.from(base||new Float64Array(NET.higherContext));if(semanticRuntime?.mode==="active"){const bias=semanticSoundModuleHigherBias(semanticModel,semanticRuntime,i,NET.higherContext),scale=Math.max(0,Number(config.semanticSoundHigherBiasScale)||.25);for(let k=0;k<out.length;k++)out[k]=Math.tanh(out[k]+scale*bias[k]);}return out;};
  if(typeof onLearnerRoot==="function"){
    try{
      // Optional PRINCIPAL root-sensing phase. It uses the same learner-facing
      // local sensors as normal execution, performs no action, and never exposes
      // the complete map/target/replay truth. Ordinary V9 runs are unchanged.
      for(let i=0;i<world.cubes.length;i++)preparePerception(world,i);
      // Complete the internal body-coordinate propagation from the already
      // learner-visible mutual contact graph without adding extra map evidence.
      const poses=world.v9.spatial?.poses||[];
      for(let pass=0;pass<world.cubes.length;pass++){
        let changed=false;
        for(let i=0;i<world.cubes.length;i++){
          if(poses[i])continue;
          const senses=world.v9.perception?.[i]?.senses||[];
          for(let fi=0;fi<FACE_DEFS.length;fi++){
            const f=FACE_DEFS[fi],sense=senses[fi],j=sense?.neighborId;
            if(!f||!sense?.contact||!Number.isInteger(j)||!poses[j])continue;
            const q=poses[j];poses[i]={x:q.x-f.dx,y:q.y-f.dy,z:q.z-f.dz};changed=true;break;
          }
        }
        if(!changed)break;
      }
      const rootCells=world.cubes.map((_,i)=>{
        const rawObs=buildObservation(world,i),rt=world.egoRuntime[i],pose=world.v9.spatial?.poses?.[i]||null,conceptual=conceptualize(rawObs,i,Number(rt?.intentAction)||0),obs=conceptual.obs;
        return{
          id:String(world.v9.lifecycle?.meta?.[i]?.uid??i),
          obs:Array.from(obs),
          hidden:Array.from(hStates[i]),
          higherContext:Array.from(effectiveHigherContext(i,higherContext)),
          prevAction:Number(rt?.intentAction)||0,
          prevReward:Number(rt?.pendingReward)||0,
          prevMismatch:[Number(rt?.motorMismatchX)||0,Number(rt?.motorMismatchY)||0,Number(rt?.motorMismatchZ)||0],
          position:pose?[Number(pose.x)||0,Number(pose.y)||0,Number(pose.z)||0]:null,
          uncertainty:Number(world.v9.spatial?.uncertainty)||1
        };
      });
      const rootPacket={
        type:"learner-root",group,envId,mapKind,
        rootGlobalAction:world.globalStep,
        physicalDimensions,
        stepsPerEgoTurn:scheduler.stepsPerEgoTurn,
        scheduler:scheduler.snapshot(),
        cells:rootCells,
        higherHidden:Array.from(higherHidden),
        higherContext:Array.from(higherContext),
        v9Perspective:gates.perspective?perspectiveSnapshot(world.v9.perspective):null,
        v9:{
          featureGates:{...gates},
          computeSpent:world.v9.computeSpent,
          computeBudget:world.v9.computeBudget,
          currentK:world.v9.currentK,
          lastMetaAt:world.v9.lastMetaAt,
          energy:gates.energy?energySnapshot(world.v9.energy):null,
          cortical:gates.corticalSound?corticalSnapshot(world.v9.cortical):null,
          echo:gates.echo?echoSnapshot(world.v9.echo):null,
          spatial:gates.spatial?spatialSnapshot(world.v9.spatial):null,
          identity:gates.identity?identitySnapshot(world.v9.identity):null,
          perspective:gates.perspective?perspectiveSnapshot(world.v9.perspective):null,
          organs:gates.organogenesis?organSnapshot(world.v9.organs):null,
          lifecycle:lifecycleSnapshot(world.v9.lifecycle),
          meta:gates.metaController?metaSnapshot(world.v9.meta):null,
          specialization:gates.specialization?specializationSnapshot(world.v9.specialists):null,
          worldModel:gates.worldModel?worldModelSnapshot(world.v9.worldModel):null,
          semanticSound:world.v9.semanticSound?structuredClone(world.v9.semanticSound):null,
          worldModelRecordCount:gates.worldModel?(world.v9.worldModelRecords?.length||0):0,
          events:(world.v9.events||[]).slice(-64).map(e=>({...e})),
          specialistIds:[...world.v9.specialistIds]
        },
        source:{
          learnerVisible:true,
          initialPerceptionSweep:true,
          hiddenWorldTruthIncluded:false,
          internalLearnerStateIncluded:true
        }
      };
      onLearnerRoot(rootPacket);
      learnerRootPrepared=true;
    }catch(error){
      try{onLearnerRoot({type:"learner-root-error",group,envId,error:error?.message||String(error)});}catch{}
    }
  }
  const finalizePrevious=(i,obs,rawNextObs,pending,nextValue,terminal)=>{
    const tr=open[i];if(!tr)return;
    tr.reward=pending;tr.nextObs=Float64Array.from(obs);tr.nextValue=terminal?0:nextValue;tr.terminal=terminal;trajectories[i].push(tr);
    if(conceptEnabled&&tr.conceptRawObs&&rawNextObs&&conceptRecords.length<conceptCap)conceptRecords.push({obs:tr.conceptRawObs,nextObs:Array.from(rawNextObs),action:tr.action,reward:pending,accepted:Number(tr.agencyTarget?.[3]||0)});
    open[i]=null;totalReward+=pending;
  };
  const flushAll=()=>{
    for(let i=0;i<world.cubes.length;i++){
      preparePerception(world,i);
      const rawObs=buildObservation(world,i),runtime=world.egoRuntime[i],pending=consumePendingReward(world,i),prevAction=runtime.intentAction,prevMismatch=[runtime.motorMismatchX||0,runtime.motorMismatchY||0,runtime.motorMismatchZ||0],q=conceptualize(rawObs,i,prevAction),obs=q.obs,bp=brainPrevious(prevAction,pending,prevMismatch);
      if(open[i]){const f=forwardLocal(getModel(i),obs,hStates[i],effectiveHigherContext(i,higherContext),bp.action,bp.reward,bp.mismatch,{actionBias:specEntry(i)?.actionBias,actionMask});finalizePrevious(i,obs,rawObs,pending,f.value,false);}
    }
  };
  const afterMorph=()=>{resizeSubsystems(world,hStates);while(open.length<world.cubes.length)open.push(null);while(trajectories.length<world.cubes.length)trajectories.push([]);while(open.length>world.cubes.length)open.pop();while(trajectories.length>world.cubes.length)trajectories.pop();scheduler=new EgoScheduler({...config,stepsPerEgoTurn:world.v9.currentK,swarmSize:world.cubes.length});lastPool=poolSelfStates(hStates);};
  const executeMeta=(name)=>{
    const life=world.v9.lifecycle,mode=gates.morphology?String(config.morphologyMode||"shadow"):"off",kmode=gates.adaptiveK?String(config.adaptiveKMode||"shadow"):"off";let ev=null,cost=0,changed=false,energyCost=0,energyPenalty=0;
    const charge=breakdown=>{if(!gates.energy)return{cost:0,penalty:0};const q=spendEnergy(world.v9.energy,breakdown,config);energyCost+=q.cost;energyPenalty+=q.penalty;return q;};
    const morphAction=["BUD","RETIRE","FUSION_BUD","REACTIVATE"].includes(name),growthAction=["BUD","FUSION_BUD","REACTIVATE"].includes(name),morphCost=morphologyEnergyCost(name,config);
    if(morphAction&&mode==="active"){
      if(growthAction&&gates.energy&&!canAffordMorphology(world.v9.energy,morphCost,config)){
        world.v9.events.push({step:world.globalStep,type:"ENERGY_BLOCKED_"+name,remaining:world.v9.energy.remaining,cost:morphCost});
      }else{
        flushAll();
        if(name==="BUD")ev=budCell(world,life,hStates,world.v9.spatial,config,world.globalStep);
        else if(name==="RETIRE"){const c=lowestUsefulRetireCandidate(world,life,hStates);if(c.index>=0)ev=retireCell(world,life,hStates,world.v9.spatial,world.globalStep,c.index,c.score<-.05?"APOPTOSIS_SLOT_ECONOMICS":"REDUNDANT_KILL",config);}
        else if(name==="FUSION_BUD")ev=fusionBud(world,life,hStates,world.v9.spatial,config,world.globalStep);
        else ev=reactivateDormant(world,life,hStates,world.v9.spatial,config,world.globalStep);
        if(ev){
          if(Number.isInteger(ev.index)){open.splice(ev.index,1);trajectories.splice(ev.index,1);world.v9.specialistIds.splice(ev.index,1);}
          else{const parent=Number.isInteger(ev.parent)?ev.parent:0,parentSlot=world.v9.specialistIds[parent]??0;world.v9.specialistIds.push(parentSlot);markMorphParent(specialistStats,parentSlot);}
          changed=true;cost=name==="RETIRE"?.2:1;charge({morphology:morphCost});afterMorph();
        }
      }
    }else if(morphAction&&mode==="shadow")world.v9.events.push({step:world.globalStep,type:"WOULD_"+name});
    if(name==="K_UP"&&kmode==="active")world.v9.currentK=Math.min(Number(config.maxK)||8,world.v9.currentK+1);
    if(name==="K_DOWN"&&kmode==="active")world.v9.currentK=Math.max(Number(config.minK)||1,world.v9.currentK-1);
    if((name==="K_UP"||name==="K_DOWN")&&kmode==="shadow")world.v9.events.push({step:world.globalStep,type:"WOULD_"+name});
    if(name==="PING"&&gates.echo){const e=Math.max(0,Math.min(world.cubes.length-1,scheduler.currentEgo()));emitEcho(world,world.v9.echo,e,world.globalStep,gates.corticalSound?world.v9.cortical?.cells?.[e]:null);cost+=Number(config.echoCost)||1.5;charge({communication:Number(config.energyPingCost)||.35});}
    if(name==="PRIME_SIGNAL"&&gates.corticalSound){boostSignal(world.v9.cortical,Math.max(0,Math.min(world.cubes.length-1,scheduler.currentEgo())),1,world.globalStep);cost+=Number(config.corticalSignalCost)||.2;}
    if(kmode==="active")scheduler.stepsPerEgoTurn=world.v9.currentK;world.v9.computeSpent+=cost;
    const applied=name==="HOLD"||(name==="PING"&&gates.echo)||(name==="PRIME_SIGNAL"&&gates.corticalSound)||changed||((name==="K_UP"||name==="K_DOWN")&&kmode==="active");
    return{ev,changed,cost,energyCost,energyPenalty,applied};
  };

  while(!world.success&&world.globalStep<world.maxGlobalActions&&world.v9.computeSpent<world.v9.computeBudget){
    if(!world.cubes.length)break;const signalLifetime=Math.max(1,Math.round((Number(config.corticalSignalLifetimeTurns)||1)*world.cubes.length));if(gates.corticalSound)advanceCorticalSound(world.v9.cortical,world.globalStep,signalLifetime);const ego=Math.min(scheduler.currentEgo(),world.cubes.length-1),runtime=world.egoRuntime[ego],higherHiddenAtDecision=Float64Array.from(higherHidden);preparePerception(world,ego);if(semanticRuntime&&gates.corticalSound){const raw=hearCorticalRaw(world.v9.cortical,ego);semanticSoundModuleHear(semanticModel,semanticRuntime,{ego,step:world.globalStep,real:raw.real,imag:raw.imag,hidden:hStates[ego],higher:higherContext,source:"external"});if(raw.ownEnergy>1e-8)semanticSoundModuleHear(semanticModel,semanticRuntime,{ego,step:world.globalStep,real:raw.ownReal,imag:raw.ownImag,hidden:hStates[ego],higher:higherContext,source:"self"});}
    const rawObs=buildObservation(world,ego),pending=consumePendingReward(world,ego),prevAction=runtime.intentAction,prevMismatch=[runtime.motorMismatchX||0,runtime.motorMismatchY||0,runtime.motorMismatchZ||0],conceptual=conceptualize(rawObs,ego,prevAction),obs=conceptual.obs,bp=brainPrevious(prevAction,pending,prevMismatch),selfMode=ablation?.selfMode||"normal";
    let hBefore=selfMode==="reset"?new Float64Array(NET.selfHidden):(selfMode==="shuffle"?Float64Array.from(hStates[(ego+1)%hStates.length]):Float64Array.from(hStates[ego])),model=getModel(ego),baseHc=ablation?.higherMode==="off"?new Float64Array(NET.higherContext):higherContext,hc=effectiveHigherContext(ego,baseHc),se=specEntry(ego),f=forwardLocal(model,obs,hBefore,hc,bp.action,bp.reward,bp.mismatch,{zeroSelfForPolicy:selfMode==="zero",actionBias:se?.actionBias,actionMask});hStates[ego]=Float64Array.from(f.hidden);
    const preFlowIntents=flowIntents(world);
    const flowPolicy=conceptFlowEnabled?leastResistancePolicy(conceptFlow,{coord:conceptual.coord,probs:f.probs,actionMask,intents:preFlowIntents,activeCell:ego,strength:Number(config.conceptFlowPolicyStrength)||.65}):null;
    const decisionProbs=flowPolicy?.probs||f.probs;
    const baseAction=training?sampleCategorical(decisionProbs,rng):argmax(decisionProbs),baseConfidence=decisionProbs[baseAction];let action=baseAction,confidence=baseConfidence,policyOverride=null;
    if(typeof actionPolicyHook==="function"){
      try{
        const q=actionPolicyHook({world,group,envId,ego,scheduler:scheduler.snapshot(),obs:Array.from(obs),representation:Array.from(f.cache.rep),bodyHidden:Array.from(f.cache.bc.y),worldHidden:Array.from(f.cache.wc.y),selfHidden:Array.from(f.hidden),probs:Array.from(decisionProbs),rawPolicyProbs:Array.from(f.probs),entropy:f.entropy,value:f.value,baseAction,baseConfidence,hiddenBefore:Array.from(hBefore),hiddenAfter:Array.from(f.hidden),higherContext:Array.from(hc),higherHiddenBefore:Array.from(higherHiddenAtDecision),pendingReward:pending,prevAction,prevMismatch:Array.from(prevMismatch)});
        const ai=Number(q?.actionIndex);
        if(Number.isInteger(ai)&&ai>=0&&ai<ACTION_N&&(actionMask[ai]??1)){action=ai;confidence=Math.max(0,Math.min(1,Number(q?.confidence??f.probs[ai]??baseConfidence)||0));}
        policyOverride=q?{...q,meta:q.meta?structuredClone(q.meta):null}:null;
      }catch(error){policyOverride={error:error?.message||String(error)};}
    }
    const liveForward=typeof onStep==="function"&&captureCellIo?(()=>{
      const aux=auxForward(model,f.cache.rep,action,confidence),bodyInput=Array.from(obs.slice(0,BODY_OBS_N)),worldInput=Array.from(obs.slice(BODY_OBS_N));
      return{
        input:{
          observation:Array.from(obs),
          body:{count:bodyInput.length,names:Array.from(obsNames.slice(0,BODY_OBS_N)),values:bodyInput,named:Object.fromEntries(obsNames.slice(0,BODY_OBS_N).map((n,i)=>[n,bodyInput[i]]))},
          world:{count:worldInput.length,names:Array.from(obsNames.slice(BODY_OBS_N)),values:worldInput,named:Object.fromEntries(obsNames.slice(BODY_OBS_N).map((n,i)=>[n,worldInput[i]]))},
          previous:{action:prevAction,actionName:ACTIONS?.[prevAction]?.name??String(prevAction),reward:pending,mismatch:Array.from(prevMismatch)},
          higherContext:Array.from(hc),
          recurrentHiddenBefore:Array.from(hBefore)
        },
        routing:{
          bodyEncoder:{inN:BODY_OBS_N,outN:NET.bodyHidden,activation:"tanh",output:Array.from(f.cache.bc.y)},
          worldEncoder:{inN:obs.length-BODY_OBS_N,outN:NET.worldHidden,activation:"tanh",output:Array.from(f.cache.wc.y)},
          gru:{inputN:f.cache.gc.x.length,stateN:NET.selfHidden,input:Array.from(f.cache.gc.x),updateGate:Array.from(f.cache.gc.z),resetGate:Array.from(f.cache.gc.r),candidate:Array.from(f.cache.gc.hHat),hiddenAfter:Array.from(f.hidden)},
          policyRepresentation:{parts:{bodyHidden:NET.bodyHidden,worldHidden:NET.worldHidden,selfHidden:NET.selfHidden,higherContext:NET.higherContext},count:f.cache.rep.length,values:Array.from(f.cache.rep)}
        },
        output:{
          policy:{actionNames:ACTIONS.map(a=>a.name),logits:Array.from(f.logits),probabilities:Array.from(decisionProbs),rawProbabilities:Array.from(f.probs),baseAction,baseActionName:ACTIONS[baseAction]?.name||"STAY",baseConfidence,selectedAction:action,selectedActionName:ACTIONS[action]?.name||"STAY",selectedConfidence:confidence,entropy:f.entropy},
          value:f.value,
          predictions:{
            ownBody:{names:Array.from(obsNames.slice(0,BODY_OBS_N)),values:Array.from(aux.own.y)},
            world:{names:Array.from(obsNames.slice(BODY_OBS_N)),values:Array.from(aux.world.y)},
            agency:{names:agencyNames.slice(0,aux.agency.y.length),values:Array.from(aux.agency.y)}
          }
        }
      };
    })():null;
    finalizePrevious(ego,obs,rawObs,pending,f.value,false);
    if(gates.identity&&world.v9.identity?.enabled){const aux=auxForward(model,f.cache.rep,action,confidence);noteIdentityPrediction(world.v9.identity,Array.from(aux.agency.y).slice(4),world.globalStep);}
    open[ego]={group,egoId:ego,cellUid:world.v9.lifecycle.meta[ego]?.uid??ego,specialistId:world.v9.specialistIds[ego]??0,specialistBias:Float64Array.from(se?.actionBias||[]),actionMask:Uint8Array.from(actionMask),globalStep:world.globalStep,simTime:world.simTime,obs:Float64Array.from(obs),conceptRawObs:Array.from(rawObs),conceptCoordinate:conceptual.coord?Array.from(conceptual.coord):null,conceptFlowDecision:flowPolicy?.scores?.[action]?structuredClone(flowPolicy.scores[action]):null,baseAction,baseConfidence,policyOverride,action,confidence,value:f.value,hiddenBefore:hBefore,higherContext:Float64Array.from(hc),prevAction:bp.action,prevReward:bp.reward,prevMismatch:Float64Array.from(bp.mismatch),logProb:Math.log(Math.max(1e-12,confidence)),entropy:f.entropy,reward:0,nextObs:null,nextValue:0,terminal:false,agencyTarget:[0,0,0,0],swarmSize:world.cubes.length,physicalDimensions:worldDimension(world),perspectiveD:gates.perspective?world.v9.perspective.activeD:0};
    const before=world.cubes.map(c=>({...c}));let extraCost=0;if(action===7&&gates.echo){emitEcho(world,world.v9.echo,ego,world.globalStep,gates.corticalSound?world.v9.cortical?.cells?.[ego]:null);extraCost+=Number(config.reward.pingCost)||.03;}if(action===8&&gates.corticalSound)extraCost+=Number(config.reward.signalCost)||.01;
    const mech=resolveIntent(world,ego,action,confidence,config.mechanics),u=unit3(mech.actual.dx||0,mech.actual.dy||0,mech.actual.dz||0),idTarget=gates.identity?identityAgencyTargets(world.v9.identity,world,before,world.cubes,world.globalStep,world.globalStep+1):{active:false,targets:[]};open[ego].agencyTarget=[u.x,u.y,u.z,mech.accepted?1:0,...(idTarget.targets||[])];open[ego].identityAgencyActive=idTarget.active===true;if(!mech.accepted)rejects++;
    if(gates.spatial)for(const id of mech.movedIds||[]){const b=before[id],a=world.cubes[id];if(b&&a)noteActualMotion(world.v9.spatial,id,a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));}
    const motionAction=action>=1&&action<=6,communication=action===7?"PING":(action===8?"SIGNAL":null),energyBreakdown=gates.energy?actionEnergyBreakdown({confidence,motion:motionAction,accepted:mech.accepted,movedCount:(mech.movedIds||[]).length,cellCount:world.cubes.length,dt:scheduler.dt(),communication},config):null,energyUse=gates.energy?spendEnergy(world.v9.energy,energyBreakdown,config):{cost:0,penalty:0,debtAdded:0,remaining:0,debt:0};
    const rewardVector=rewardTransition(world,before,scheduler.dt(),config.reward,ego,{computeExtraCost:extraCost,energyPenalty:energyUse.penalty}),localR=rewardVector[ego]?.total||0;if(gates.energy)noteEnergyProgress(world.v9.energy,Math.max(0,rewardVector[ego]?.selfDelta||0)+.35*Math.max(0,rewardVector[ego]?.groupDelta||0));if(gates.corticalSound)reinforceCortical(world.v9.cortical,ego,localR);noteCellOutcome(world.v9.lifecycle,ego,{reward:localR,accepted:mech.accepted,progress:rewardVector[ego]?.selfDelta||0});
    if(conceptFlowEnabled){
      const flowOutcome=observeConceptFlow(conceptFlow,{
        coord:conceptual.coord,action,intents:preFlowIntents,activeCell:ego,
        accepted:mech.accepted,progress:Number(rewardVector[ego]?.selfDelta||0)>0,reward:localR,
        mismatch:Math.hypot(Number(runtime.motorMismatchX)||0,Number(runtime.motorMismatchY)||0,Number(runtime.motorMismatchZ)||0),
        support:Number(mech.drive?.support)||0,opposition:Number(mech.drive?.opposition)||0,netDrive:Number(mech.netDrive)||0,
        cellDrives:flowCellDrives(world)
      });
      if(open[ego])open[ego].conceptFlowOutcome=flowOutcome;
    }
    const senseNow=world.v9.perception?.[ego]?.senses||[],wallContact=senseNow.reduce((z,x)=>z+(x?.wall||0),0),push=senseNow.reduce((z,x)=>z+(x?.push||0),0),pull=senseNow.reduce((z,x)=>z+(x?.pull||0),0);
    if(gates.specialization)noteSpecialist(specialistStats,world.v9.specialistIds[ego]??0,{accepted:mech.accepted,confidence,reward:localR,selfDelta:rewardVector[ego]?.selfDelta||0,groupDelta:rewardVector[ego]?.groupDelta||0,wallContact,push,pull,action,energyCost:energyUse.cost,bandAmplitudes:gates.corticalSound?world.v9.cortical?.cells?.[ego]?.amp:null});
    if(action===8&&gates.corticalSound){const semanticPlan=semanticRuntime?semanticSoundModulePlanSignal(semanticModel,semanticRuntime,{ego,step:world.globalStep,hidden:hStates[ego],higher:hc,training,creditWindow:signalLifetime}):null;if(semanticRuntime?.mode==="active"&&semanticPlan?.frames?.length)emitCorticalSequence(world.v9.cortical,ego,semanticPlan.frames,{step:world.globalStep,lifetimeDecisions:signalLifetime});else emitCortical(world.v9.cortical,ego,hStates[ego],{uncertainty:gates.spatial?world.v9.spatial.uncertainty:0,progress:rewardVector[ego]?.selfDelta||0,conflict:world.v9.cortical.lastConflict,boost:1,bandBias:se?.bandBias,step:world.globalStep});const audio=corticalEmitterAudioSnapshot(world.v9.cortical,ego,8);audio.step=world.globalStep;audio.event=audio.bands.length>0;audio.emitter=ego;if(semanticPlan)audio.semantic={moduleId:semanticModuleId,mode:semanticRuntime.mode,latent:Array.from(semanticPlan.latent),microFrames:semanticPlan.frames.length};if(semanticRuntime?.mode==="active"&&semanticPlan?.frames?.length){audio.microframes=corticalSequenceAudioSnapshots(world.v9.cortical,ego,8);audio.sequenceLifetime=signalLifetime;}world.v9.pendingCorticalAudioEvents.push({step:world.globalStep,emitter:ego,audio});}
    if(semanticRuntime)semanticSoundModuleOutcome(semanticModel,semanticRuntime,{ego,step:world.globalStep,reward:localR,progress:rewardVector[ego]?.selfDelta||0,groupDelta:rewardVector[ego]?.groupDelta||0,accepted:mech.accepted,action,actual:mech.actual,movedCount:(mech.movedIds||[]).length});
    world.globalStep++;world.simTime+=scheduler.dt();world.v9.computeSpent+=Number(config.computeCostPerCellDecision)||1;world.v9.recentReward=.97*world.v9.recentReward+.03*localR;metaRewardWindow+=localR;actionCount++;entropySum+=f.entropy;sumN+=world.cubes.length;sumK+=world.v9.currentK;nkSamples++;scheduler.advance();consumeSinceLastMotion(world,ego);
    if(gates.perspective)updatePerspectives(world.v9.perspective,world.v9.spatial,worldDimension(world));
    const interval=Math.max(2,Number(config.morphologyInterval)||8);if((gates.metaController||gates.organogenesis||gates.morphology)&&world.globalStep-world.v9.lastMetaAt>=interval){
      if(gates.organogenesis)updateOrgans(world.v9.organs,world,gates.corticalSound?world.v9.cortical:null,gates.echo?world.v9.echo:null,world.v9.specialistIds,gates.spatial?world.v9.spatial:null);
      const maintenance=gates.morphology?lifecycleMaintenance(world,world.v9.lifecycle,hStates,gates.spatial?world.v9.spatial:null,config,world.globalStep):[];
      for(const ev of maintenance)if(Number.isInteger(ev?.index)){open.splice(ev.index,1);trajectories.splice(ev.index,1);world.v9.specialistIds.splice(ev.index,1);}
      if(maintenance.some(ev=>Number.isInteger(ev?.index)))afterMorph();
      if(gates.metaController){
        if(pendingMeta){
          pendingMeta.reward=metaRewardWindow-.10*(pendingMeta.computeCost||0)-(pendingMeta.energyPenalty||0);
          if(training&&pendingMeta.applied)metaRecords.push(pendingMeta);
        }
        const ss=gates.spatial?world.v9.spatial:{uncertainty:0,frontierFraction:0,predictionErrorEMA:0},cr=1-world.v9.computeSpent/Math.max(1,world.v9.computeBudget),resource=lifecycleResourceStats(world.v9.lifecycle),ec=gates.energy?energyContext(world.v9.energy):{remaining:0,debt:0,efficiency:0,recentCost:0},ef=metaFeatures({uncertainty:ss.uncertainty,frontier:ss.frontierFraction,conflict:gates.corticalSound?world.v9.cortical.lastConflict:0,echoNovelty:gates.echo?(world.v9.echo.last[Math.min(ego,world.v9.echo.last.length-1)]?.novelty||0):0,computeRemaining:cr,energyRemaining:ec.remaining,energyDebt:ec.debt,energyEfficiency:ec.efficiency,recentEnergyCost:ec.recentCost,n:world.cubes.length,k:world.v9.currentK,progress:world.v9.recentReward,reward:metaRewardWindow,stagnation:Math.max(0,ss.predictionErrorEMA-.2),effectiveD:gates.perspective?world.v9.perspective.effectiveD:0,slotPressure:resource.pressure,slotEfficiency:resource.efficiency,fragmentCount:Math.max(world.v9.lifecycle.logicalFragments?.length||1,gates.organogenesis?(world.v9.organs?.organs?.length||1):1)}),baseMetaChoice=chooseMeta(world.v9.meta,ef,rng,!training);
        let choice=baseMetaChoice;
        if(typeof metaPolicyHook==="function"){
          const q=metaPolicyHook({
            group,envId,ego,globalStep:world.globalStep,
            features:Array.from(ef),
            baseChoice:{index:baseMetaChoice.index,name:baseMetaChoice.name,probs:Array.from(baseMetaChoice.probs),value:baseMetaChoice.value},
            world,
            learnerVisible:true
          });
          if(q&&Number.isInteger(Number(q.actionIndex))){
            const idx=Math.max(0,Math.min(META_ACTIONS.length-1,Number(q.actionIndex)));
            choice={...baseMetaChoice,index:idx,name:META_ACTIONS[idx],probs:Float64Array.from(q.probabilities||baseMetaChoice.probs)};
          }
        }
        const metaResult=executeMeta(choice.name);
        pendingMeta={features:Float64Array.from(choice.features),action:choice.index,reward:0,applied:Boolean(metaResult.applied),computeCost:Number(metaResult.cost)||0,energyCost:Number(metaResult.energyCost)||0,energyPenalty:Number(metaResult.energyPenalty)||0,nBefore:world.cubes.length,kBefore:world.v9.currentK};
        world.v9.events.push({step:world.globalStep,type:"META",action:choice.name,applied:Boolean(metaResult.applied),n:world.cubes.length,k:world.v9.currentK,d:gates.perspective?world.v9.perspective.activeD:0});
      }
      world.v9.lastMetaAt=world.globalStep;metaRewardWindow=0;
    }
    if(group==="B"&&scheduler.orderPos===0&&scheduler.stepInTurn===0){const newPool=poolSelfStates(hStates);if(ablation?.higherMode==="reset")higherHidden=new Float64Array(NET.higherHidden);const hf=forwardHigher(higherModel,lastPool,higherHidden);higherRecords.push({pool:Float64Array.from(lastPool),nextPool:Float64Array.from(newPool),hiddenBefore:Float64Array.from(higherHidden),swarmSize:world.cubes.length,physicalDimensions:worldDimension(world),perspectiveD:gates.perspective?world.v9.perspective.activeD:0});higherHidden=Float64Array.from(hf.hidden);higherContext=Float64Array.from(hf.context);lastPool=newPool;}
    if(typeof onObserve==="function"&&(world.success||world.globalStep%Math.max(1,Math.floor(Number(observeEverySteps)||25))===0)){
      const observeSnapshot=snapshotWorld(world,scheduler.currentEgo());
      try{onObserve({
        type:"observe",group,envId,ego,globalStep:world.globalStep,action,confidence,entropy:f.entropy,value:f.value,
        accepted:mech.accepted,reason:mech.reason,localReward:structuredClone(rewardVector[ego]||{}),
        energy:gates.energy?{cost:energyUse.cost,penalty:energyUse.penalty,...energyContext(world.v9.energy)}:null,
        runtime:{motorMismatchX:runtime.motorMismatchX||0,motorMismatchY:runtime.motorMismatchY||0,motorMismatchZ:runtime.motorMismatchZ||0},
        snapshot:observeSnapshot
      });}catch{}
    }
    if(typeof onStep==="function"){
      const currentField=policyOverride?.meta?.field||[];
      const currentVector=currentField.find(x=>Number(x.id)===Number(ego))||null;
      const ioRecord={
        cell:ego,cellUid:world.v9.lifecycle.meta[ego]?.uid??ego,step:world.globalStep,
        position:world.cubes[ego]?{...world.cubes[ego]}:null,
        input:liveForward?.input||null,routing:liveForward?.routing||null,output:liveForward?.output||null,
        movement:{
          abstract:policyOverride?.meta?.preMovement||null,
          vector:currentVector?structuredClone(currentVector):null,
          cognitiveAction:policyOverride?.meta?.cognitiveAction??null,
          cognitiveActionName:policyOverride?.meta?.cognitiveActionName??null,
          appliedAction:action,appliedActionName:ACTIONS[action]?.name||"STAY",confidence
        },
        outcome:{
          accepted:mech.accepted,reason:mech.reason,actual:{...mech.actual},movedIds:[...(mech.movedIds||[])],
          reward:structuredClone(rewardVector[ego]||{}),
          motorMismatch:[runtime.motorMismatchX||0,runtime.motorMismatchY||0,runtime.motorMismatchZ||0],
          energy:gates.energy?{cost:energyUse.cost,penalty:energyUse.penalty,...energyContext(world.v9.energy)}:null
        }
      };
      if(liveCellIo){
        liveCellIo[ego]=ioRecord;
        while(liveCellIo.length<world.cubes.length)liveCellIo.push(null);
        while(liveCellIo.length>world.cubes.length)liveCellIo.pop();
      }
      const livePacket={type:"step",group,envId,ego,globalStep:world.globalStep,baseAction,baseConfidence,action,confidence,entropy:f.entropy,value:f.value,policyProbs:Array.from(f.probs),observation:Array.from(obs),hiddenBefore:Array.from(hBefore),hiddenAfter:Array.from(f.hidden),higherContext:Array.from(hc),higherHiddenBefore:Array.from(higherHiddenAtDecision),higherHiddenAfter:Array.from(higherHidden),perception:world.v9.perception?.[ego]?structuredClone(world.v9.perception[ego]):null,pendingRewardConsumed:pending,accepted:mech.accepted,reason:mech.reason,actual:{...mech.actual},movedIds:[...(mech.movedIds||[])],localReward:structuredClone(rewardVector[ego]||{}),energy:gates.energy?{cost:energyUse.cost,penalty:energyUse.penalty,...energyContext(world.v9.energy)}:null,runtime:{motorMismatchX:runtime.motorMismatchX||0,motorMismatchY:runtime.motorMismatchY||0,motorMismatchZ:runtime.motorMismatchZ||0},policyOverride:policyOverride?structuredClone(policyOverride):null,snapshot:snapshotWorld(world,scheduler.currentEgo()),activeCellIo:captureCellIo?structuredClone(ioRecord):null,cellIo:captureCellIo?structuredClone(liveCellIo):null};
      try{onStep(livePacket);}catch{}
    }
    if(captureTrace&&trace.length<1200){
      const traceOccupied=occupiedMap(world.cubes),localSides=FACE_DEFS.map(face=>{const s=localEdgeSense(world,ego,face,traceOccupied);return{side:face.name,contact:s.contact,wall:s.wall,push:s.push,pull:s.pull,relativeMotion:s.relativeMotion,neighborId:s.neighborId??null};});
      trace.push({...nativeTraceState(world,scheduler,hStates),ego,cellUid:world.v9.lifecycle.meta[ego]?.uid??ego,specialistId:world.v9.specialistIds[ego]??0,obs:Array.from(obs),zSelfBefore:Array.from(hBefore),zSelfAfter:Array.from(f.hidden),probs:Array.from(f.probs),baseAction,baseConfidence,policyOverride:policyOverride?structuredClone(policyOverride):null,action,confidence,value:f.value,entropy:f.entropy,higherContext:Array.from(hc),pendingRewardConsumed:pending,accepted:mech.accepted,reason:mech.reason,actual:mech.actual,motorMismatch:[runtime.motorMismatchX||0,runtime.motorMismatchY||0,runtime.motorMismatchZ||0],localSides,localReward:rewardVector[ego],energy:gates.energy?{cost:energyUse.cost,penalty:energyUse.penalty,...energyContext(world.v9.energy)}:null,n:world.cubes.length,k:world.v9.currentK,perspectiveD:gates.perspective?world.v9.perspective.activeD:0,spatial:gates.spatial?{uncertainty:world.v9.spatial.uncertainty,known:world.v9.spatial.map.size}:null,identity:gates.identity&&world.v9.identity?.enabled?{predictedAgency:[...world.v9.identity.predictedAgency],observedCausalMatch:[...world.v9.identity.observedCausalMatch]}:null,cortical:gates.corticalSound?{coherence:world.v9.cortical.lastCoherence,conflict:world.v9.cortical.lastConflict}:null});
    }
    if(preview&&(world.success||world.globalStep%Math.max(1,preview.exactMoves?1:4)===0))addPreviewFrame(preview,world,scheduler.currentEgo(),world.success);
  }
  if(pendingMeta){pendingMeta.reward=metaRewardWindow-.10*(pendingMeta.computeCost||0)-(pendingMeta.energyPenalty||0);if(training&&pendingMeta.applied)metaRecords.push(pendingMeta);}
  if(semanticRuntime)world.v9.semanticSound={mode:semanticRuntime.mode,moduleId:semanticModuleId,...semanticSoundModuleSnapshot(semanticRuntime.model)};
  flushAll();for(let i=0;i<world.cubes.length;i++){
    preparePerception(world,i);
    const rawObs=buildObservation(world,i),runtime=world.egoRuntime[i],q=conceptualize(rawObs,i,runtime.intentAction),obs=q.obs,pending=consumePendingReward(world,i);
    finalizePrevious(i,obs,rawObs,pending,0,true);
  }
  if(preview){addPreviewFrame(preview,world,scheduler.currentEgo(),true);preview.durationSeconds=preview.exactMoves?Math.max(0,(preview.frames.length-1)/Math.max(1,preview.fps)):Math.max(0,world.simTime);preview.mental=snapshotWorld(world,scheduler.currentEgo()).v9;}
  const finalDistances=world.cubes.map(c=>distanceAt(world,c.x,c.y,c.z||0)),meanDistance=finalDistances.reduce((s,x)=>s+x,0)/Math.max(1,finalDistances.length),worstDistance=Math.max(...finalDistances),progressRatio=(startMeanDistance-meanDistance)/Math.max(1,startMeanDistance),worstProgressRatio=(startWorstDistance-worstDistance)/Math.max(1,startWorstDistance),identitySummary=identitySnapshot(world.v9.identity)?.summary||{};
  const budgetPlan=world.actionBudgetPlan||{},termination=world.success?"success":(world.globalStep>=world.maxGlobalActions?"action-budget":(world.v9.computeSpent>=world.v9.computeBudget?"compute-budget":"stopped")),es=gates.energy?(energySnapshot(world.v9.energy)||{}):{};
  return{world,trajectories,higherRecords,metaRecords,specialistStats,worldModelRecords:world.v9.worldModelRecords||[],conceptRecords,conceptWorld:conceptEnabled?conceptWorldSnapshot(conceptModel,conceptRecords.slice(0,16).map(r=>r.obs)):null,conceptFlow:conceptFlowEnabled?conceptFlowSnapshot(conceptFlow):null,semanticSound:semanticRuntime?semanticSoundModuleEpisodeResult(semanticModel,semanticRuntime):null,traceRoot,trace,metrics:{success:world.success?1:0,totalReward,actions:actionCount,actionEfficiency:world.success?1/Math.max(1,actionCount):0,progressRatio,worstProgressRatio,startMeanDistance,startWorstDistance,entropy:actionCount?entropySum/actionCount:0,rejectRate:actionCount?rejects/actionCount:0,meanDistance,worstDistance,meanN:nkSamples?sumN/nkSamples:world.cubes.length,finalK:world.v9.currentK,meanK:nkSamples?sumK/nkSamples:world.v9.currentK,computeSpent:world.v9.computeSpent,computeBudget:world.v9.computeBudget,actionBudget:world.maxGlobalActions,budgetScale:Number(budgetPlan.appliedScale)||1,budgetDistance:Number(budgetPlan.effectiveDistance)||0,budgetDetour:Number(budgetPlan.detourRatio)||1,energyCapacity:Number(es.capacity)||0,energySpent:Number(es.spent)||0,energyRemaining:Number(es.remaining)||0,energyDebt:Number(es.debt)||0,energyEfficiency:Number(es.efficiency)||0,energyPerProgress:(Number(es.spent)||0)/Math.max(1e-9,Number(es.usefulProgress)||0),termination,perspectiveD:gates.perspective?world.v9.perspective.activeD:0,effectiveD:gates.perspective?world.v9.perspective.effectiveD:0,identityAmbiguity:Number(identitySummary.ambiguity)||0,selfVsSameSeparation:Number(identitySummary.selfVsSameSeparation)||0,selfVsCrossSeparation:Number(identitySummary.selfVsCrossSeparation)||0,organCount:gates.organogenesis?(world.v9.organs?.organs?.length||0):0,births:world.v9.lifecycle.births,retirements:world.v9.lifecycle.retirements,fusions:world.v9.lifecycle.fusions},snapshot:snapshotWorld(world,scheduler.currentEgo()),preview};
}
