export const GRID_W=42;
export const GRID_H=26;
export const WALL_L=20;
export const WALL_R=24;
export const DEFAULT_SWARM_SIZE=16;
export const EGO_COUNT=DEFAULT_SWARM_SIZE;
export const DEFAULT_MAX_GLOBAL_ACTIONS=1024;
export const IDENTITY_TRACK_COUNT=3;
export const IDENTITY_TRACK_FIELDS=Object.freeze(["presence","relX","relY","relZ","nearest","sizeLog","overlap","motionX","motionY","motionZ","compactness","degree"]);
export const IDENTITY_TRACK_FEATURE_NAMES=Object.freeze(Array.from({length:IDENTITY_TRACK_COUNT},(_,i)=>IDENTITY_TRACK_FIELDS.map(n=>`identityTrack${i}_${n}`)).flat());
export const IDENTITY_OBS_FEATURE_NAMES=Object.freeze([...IDENTITY_TRACK_FEATURE_NAMES,...Array.from({length:IDENTITY_TRACK_COUNT},(_,i)=>`identityPredictedAgency${i}`),"identityAmbiguity"]);
export const AGENCY_N=4+IDENTITY_TRACK_COUNT;

export const STAGES=Object.freeze([
  {name:"Wide gate",short:"Wide",pass:.70},
  {name:"Funnel",short:"Funnel",pass:.68},
  {name:"Narrow slit",short:"Slit",pass:.64},
  {name:"Offset tunnel",short:"Offset",pass:.60},
  {name:"Keyhole",short:"Keyhole",pass:.58},
  {name:"Procedural",short:"Random",pass:.54}
]);

export const V5_MAP_SEQUENCE=Object.freeze(["direct","bend","s-curve","backtrack","maze-zigzag","spiral"]);
export const TWO_D_MAP_SEQUENCE=Object.freeze([
  "v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural",
  ...V5_MAP_SEQUENCE
]);
export const THREE_D_MAP_SEQUENCE=Object.freeze(["3d-maze","3d-branching"]);
export const ALL_MAP_SEQUENCE=Object.freeze([...TWO_D_MAP_SEQUENCE,...THREE_D_MAP_SEQUENCE]);
export const MAP_MODES=Object.freeze([
  {id:"stage",name:"Current V1 curriculum stage"},
  {id:"v1-wide",name:"V1 · Wide gate"},
  {id:"v1-funnel",name:"V1 · Funnel"},
  {id:"v1-slit",name:"V1 · Narrow slit"},
  {id:"v1-offset",name:"V1 · Offset tunnel"},
  {id:"v1-keyhole",name:"V1 · Keyhole"},
  {id:"v1-procedural",name:"V1 · Procedural gate"},
  {id:"v1-composite-long",name:"V1 · Composite long unseen slices"},
  {id:"direct",name:"V5 cave · Direct"},
  {id:"bend",name:"V5 cave · Bend"},
  {id:"s-curve",name:"V5 cave · S-Curve"},
  {id:"backtrack",name:"V5 cave · Backtrack"},
  {id:"maze-zigzag",name:"V5 cave · Maze Zigzag"},
  {id:"spiral",name:"V5 cave · Spiral"},
  {id:"v5-all",name:"V5 CAVES · ALL 6"},
  {id:"all",name:"ALL 2D maps"},
  {id:"3d-maze",name:"V9 · 3D maze"},
  {id:"3d-branching",name:"V9 · 3D branching maze"},
  {id:"3d-all",name:"V9 · ALL 3D"},
  {id:"all-v9",name:"V9 · ALL 2D + 3D"}
]);

export function mapKindForMode(mode,ordinal=0,currentStage=0){
  const m=MAP_MODES.some(x=>x.id===mode)?mode:"stage";
  const idx=(n,len)=>((Math.floor(Number(n)||0)%len)+len)%len;
  if(m==="all-v9")return ALL_MAP_SEQUENCE[idx(ordinal,ALL_MAP_SEQUENCE.length)];
  if(m==="3d-all")return THREE_D_MAP_SEQUENCE[idx(ordinal,THREE_D_MAP_SEQUENCE.length)];
  if(m==="v5-all")return V5_MAP_SEQUENCE[idx(ordinal,V5_MAP_SEQUENCE.length)];
  if(m==="all")return TWO_D_MAP_SEQUENCE[idx(ordinal,TWO_D_MAP_SEQUENCE.length)];
  if(m==="stage")return "v1-stage-"+Math.max(0,Math.min(STAGES.length-1,Math.floor(Number(currentStage)||0)));
  return m;
}

export const ACTIONS=Object.freeze([
  {name:"STAY",dx:0,dy:0,dz:0,kind:"motion"},
  {name:"+X",dx:1,dy:0,dz:0,kind:"motion"},
  {name:"-X",dx:-1,dy:0,dz:0,kind:"motion"},
  {name:"+Y",dx:0,dy:1,dz:0,kind:"motion"},
  {name:"-Y",dx:0,dy:-1,dz:0,kind:"motion"},
  {name:"+Z",dx:0,dy:0,dz:1,kind:"motion"},
  {name:"-Z",dx:0,dy:0,dz:-1,kind:"motion"},
  {name:"PING",dx:0,dy:0,dz:0,kind:"echo"},
  {name:"SIGNAL",dx:0,dy:0,dz:0,kind:"signal"}
]);
export const ACTION_N=ACTIONS.length;

export const FACE_DEFS=Object.freeze([
  {name:"+X",dx:1,dy:0,dz:0},{name:"-X",dx:-1,dy:0,dz:0},
  {name:"+Y",dx:0,dy:1,dz:0},{name:"-Y",dx:0,dy:-1,dz:0},
  {name:"+Z",dx:0,dy:0,dz:1},{name:"-Z",dx:0,dy:0,dz:-1}
]);
export const SIDE_DEFS=Object.freeze(FACE_DEFS.slice(0,4));

export const BODY_OBS_N=36;
export const WORLD_FEATURE_NAMES=Object.freeze([
  "corticalCoherence","corticalConflict","corticalEnergy","corticalPhase",
  "corticalAmp0","corticalAmp1","corticalAmp2","corticalAmp3","corticalAmp4","corticalAmp5","corticalAmp6","corticalAmp7",
  "corticalPhase0","corticalPhase1","corticalPhase2","corticalPhase3","corticalPhase4","corticalPhase5","corticalPhase6","corticalPhase7",
  "echoEnergy","echoNovelty","echoPhase","echoDelayLog",
  "echoSpec0","echoSpec1","echoSpec2","echoSpec3","echoSpec4","echoSpec5","echoSpec6","echoSpec7",
  "spatialUncertainty","spatialFrontier","spatialPredictionError","bodyConstraintError","knownBodyFraction","knownMapLog",
  "perspectiveActiveD","perspectiveEffectiveD","perspectiveBestError","perspectiveGap",
  "perspectiveLatent0","perspectiveLatent1","perspectiveLatent2","perspectiveLatent3","perspectiveLatent4","perspectiveLatent5","perspectiveLatent6","perspectiveLatent7",
  "computeRemaining","actionBudgetRemaining","energyRemaining","energyDebt","energyRecentCost","energyEfficiency","swarmSizeLog","kNorm","recentProgress",
  ...FACE_DEFS.flatMap(f=>["belief_"+f.name+"_distance","belief_"+f.name+"_confidence"]),
  "frontierDx","frontierDy","frontierDz",
  ...IDENTITY_OBS_FEATURE_NAMES,
  "conceptWorldX","conceptWorldY"
]);
export const WORLD_OBS_N=WORLD_FEATURE_NAMES.length;
export const OBS_N=BODY_OBS_N+WORLD_OBS_N;
export const OBS_FIELDS=(()=>{
  const names=[
    ...FACE_DEFS.flatMap(f=>[f.name+"_contact",f.name+"_wall",f.name+"_push",f.name+"_pull",f.name+"_relativeMotion"]),
    "actualDx","actualDy","actualDz","prevConfidence","prevReward","motorMismatch",
    ...WORLD_FEATURE_NAMES
  ];
  const offsets=Object.create(null);names.forEach((n,i)=>offsets[n]=i);
  return Object.freeze({names:Object.freeze(names),offsets:Object.freeze(offsets)});
})();

export const NET=Object.freeze({
  bodyHidden:32,
  worldHidden:24,
  selfHidden:48,
  policyHidden:64,
  higherHidden:48,
  higherContext:24
});

export const DEFAULT_CONFIG=Object.freeze({
  stepsPerEgoTurn:1,
  egoDecisionHz:30,
  maxGlobalActions:DEFAULT_MAX_GLOBAL_ACTIONS,
  groupASimulationCount:4000,
  groupBSimulationCount:4000,
  optimizerMicrobatchSize:32,
  workerThreadCount:4,
  oracleWorkerThreadCount:2,
  resourceSchedulerVersion:1,
  autoResourceScaling:true,
  cpuTargetUtilization:.82,
  cpuHighUtilization:.94,
  ramCeilingUtilization:.90,
  workerOversubscription:2,
  resourceTuneMs:3000,
  gpuEnabled:true,
  gpuRequired:false,
  gpuStrictConfigVersion:1,
  gpuTargetUtilization:.75,
  gpuMaxBufferMB:32,
  nativeGpuConfigVersion:2,
  nativeMultiGpuEnabled:true,
  nativeMultiGpuRequired:true,
  nativeGpuMinDevices:2,
  nativeGpuTargetUtilization:.75,
  nativeGpuVerify:true,
  nativeGpuResidentBuffers:true,
  nativeGpuVramTargetFraction:.35,
  nativeGpuVramMaxMB:1536,
  nativeSharedGpuBufferMaxMB:256,
  mapMode:"all-v9",
  pretrainAutoCurriculum:true,
  horizonCurriculumMode:"moving-carrot",
  carrotStartActions:100,
  carrotMinActions:100,
  carrotStepActions:50,
  carrotMaxActions:1024,
  carrotAdvanceThreshold:.72,
  carrotRetreatThreshold:.28,
  carrotChecksRequired:3,
  carrotRetreatChecks:6,
  carrotAdvancePolicy:"best",
  carrotAllowRetreat:false,
  experimentalProfile:"full-v9",
  scalableSwarm:true,
  swarmSizeMin:4,
  swarmSizeMax:32,
  swarmSizeEvalMultiplier:2,
  scaleActionBudgetWithSwarm:true,
  mapAdaptiveActionBudget:true,
  actionBudgetReferenceDistance:16,
  actionBudgetMinScale:.50,
  actionBudgetMaxScale:8,
  actionBudgetDetourWeight:.20,
  actionBudget3DMultiplier:1.15,
  scaleComputeBudgetWithActionBudget:true,
  actionBudgetComputeHeadroom:1.25,
  exactMoveRendering:true,
  previewFps:30,
  previewMaxFrames:600,
  exactPreviewMovesPerSecond:30,
  gamma:.985,
  gaeLambda:.95,
  learningRate:.0008,
  entropyCoef:.004,
  valueCoef:.5,
  ownPredictCoef:.20,
  worldPredictCoef:.12,
  agencyCoef:.20,
  continuityCoef:.02,
  maxGradNorm:2,
  tbpttSteps:24,
  replayCapacity:20000,
  replayBatchSize:64,
  replaySamplesPerEnv:4,
  replayLearningRateScale:.5,
  rsiEvidencePerEnv:2,
  rsiEvidenceWorkerCap:128,
  rsiHigherEvidenceWorkerCap:64,
  diagnosticEveryBatches:20,
  diagnosticEnvCount:4,

  conceptWorldEnabled:true,
  conceptWorldOnly:true,
  conceptWorldLearningRate:.0015,
  conceptWorldReconstructionCoef:.35,
  conceptWorldTransitionCoef:1,
  conceptWorldMaxTrainRecords:128,

  physicalDimensions:2,
  hiddenTruthSensors:false,
  identityEnabled:true,
  identityVisualRadius:16,
  identityExposureEnvsPerWorker:1,

  // Same-dish causal body discovery is intentionally SHADOW-only first.
  // It may observe learner-visible local geometry + the focal EGO's own sensorimotor consequence,
  // but it must not feed simulator membership back into policy/Higher/reward.
  sameDishBodyDiscoveryMode:"shadow",
  sameDishShadowRadius:12,
  sameDishShadowTrackGap:3,
  sameDishShadowAssociationJump:2.25,
  morphologyMode:"active",
  adaptiveKMode:"active",
  initialK:1,
  minK:1,
  maxK:8,
  morphologyInterval:8,
  lifecycleMinCells:2,
  lifecycleMaxCells:64,
  lifecycleMaturationActions:8,
  lifecycleBirthCooldown:8,
  lifecycleDeathCooldown:8,
  lifecycleFragmentSimilarity:.62,
  sporeFragmentWidth:12,
  sporeFragmentCopies:2,
  computeBudgetAtN16:4096,
  computeCostPerCellDecision:1,
  scaleComputeBudgetWithActionBudget:true,
  mapAdaptiveActionBudget:true,
  actionBudgetReferenceDistance:16,
  actionBudgetMinScale:.50,
  actionBudgetMaxScale:8,
  actionBudgetDetourWeight:.20,
  actionBudget3DMultiplier:1.15,
  actionBudgetComputeHeadroom:1.25,

  energyBaseAtN16:180,
  energySwarmExponent:.75,
  energyMapScaleExponent:.50,
  energy3DMultiplier:1.08,
  energyDecisionCost:.05,
  energyIntentCost:.25,
  energyMoveCost:.35,
  energyRejectedIntentCost:.10,
  energyBasalPerCellSecond:.10,
  energyCoordinationPerCellLogSecond:.02,
  energyPingCost:.35,
  energySignalCost:.20,
  energyBirthCost:6,
  energyFusionCost:8,
  energyReactivateCost:5,
  energyRetireCost:1,
  energyMorphologyReserveFraction:.05,
  energyRewardScale:.15,
  energyDebtPenaltyMultiplier:2,

  energyEnabled:true,
  worldModelEnabled:true,
  organogenesisEnabled:true,
  energyBaseAtN16:180,
  energySwarmExponent:.75,
  energyMapScaleExponent:.50,
  energy3DMultiplier:1.08,
  energyDecisionCost:.05,
  energyIntentCost:.25,
  energyMoveCost:.35,
  energyRejectedIntentCost:.10,
  energyBasalPerCellSecond:.10,
  energyCoordinationPerCellLogSecond:.02,
  energyPingCost:.35,
  energySignalCost:.20,
  energyBirthCost:6,
  energyFusionCost:8,
  energyReactivateCost:5,
  energyRetireCost:1,
  energyRewardScale:.15,
  energyDebtPenaltyMultiplier:2,
  energyMorphologyReserveFraction:.05,

  cSpecializationEnabled:true,
  metaControllerEnabled:true,
  cSpecialistArchiveCap:8,
  cSpecialistPerSwarm:4,
  cSpecialistAdapterLR:.01,
  cSpecialistEvolutionEvery:10,
  cSpecialistMutationStd:.025,
  cSpecialistMutationFraction:.35,

  corticalSoundEnabled:true,
  corticalSignalLifetimeTurns:1,
  semanticSoundModule:"semantic-sound-cortex-v1",
  semanticSoundMode:"shadow",
  semanticSoundLatentN:16,
  semanticSoundSemanticN:32,
  semanticSoundMicroFrames:8,
  semanticSoundMaxNodes:256,
  semanticSoundMatchThreshold:.82,
  semanticSoundNodeRate:.08,
  semanticSoundEdgeRate:.12,
  semanticSoundCodecLearningRate:.0005,
  semanticSoundVocalLearningRate:.0003,
  semanticSoundVocalExploration:.12,
  semanticSoundHigherBiasScale:.25,
  semanticSoundImitationWindowDecisions:32,
  semanticSoundConsequenceWindowDecisions:2,
  semanticSoundEventCapPerEpisode:256,
  semanticSoundEventCapPerWorker:256,
  corticalBands:32,
  corticalPlasticity:.015,
  corticalSignalCost:.20,
  corticalHistoryLength:96,
  corticalCellHistoryLength:24,
  corticalPhaseTolerance:.35,
  echoEnabled:true,
  echoEveryMetaDecision:false,
  echoCost:1.5,
  echoHarmonics:4,
  echoHistoryLength:64,
  echoHarmonics:4,
  echoHistoryLength:64,
  spatialCortexEnabled:true,
  spatialBeliefRadius:48,
  perspectiveEnabled:true,
  perspectiveMaxLatentD:8,
  perspectiveComplexityPenalty:.015,
  worldModelLearningRate:.001,
  worldModelRecordCap:1024,
  metaLearningRate:.003,
  metaGamma:.92,
  metaEntropy:.015,

  mechanics:{
    minAlignment:.25,
    passiveLoadBase:.06,
    passiveLoadPerExtraCell:.19,
    minNetDrive:.02
  },
  reward:{
    alphaSelf:1,
    betaGroup:.35,
    lambdaLaggard:.60,
    outsideCostRate:.55,
    inGateCostRate:.18,
    enterGateBonus:.8,
    crossExitBonus:8,
    newBestScale:.18,
    terminalBonus:80,
    computeCostRate:.002,
    birthCost:.10,
    retireCost:.02,
    pingCost:.03,
    signalCost:.01
  }
});

export function globalActionDt(egoDecisionHz,swarmSize=DEFAULT_SWARM_SIZE){
  const hz=Math.max(.001,Number(egoDecisionHz)||DEFAULT_CONFIG.egoDecisionHz);
  const n=Math.max(1,Math.floor(Number(swarmSize)||DEFAULT_SWARM_SIZE));
  return 1/(n*hz);
}
