const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finitePositive=(x,fallback=0)=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):fallback;

function initialDistances(world){
  const values=[];
  for(const r of world?.egoRuntime||[]){
    const d=Number(r?.initialDistance);
    if(Number.isFinite(d)&&d>=0)values.push(d);
  }
  return values;
}

function worldDimension(world){
  return world?.physicalDimensions===3?3:2;
}

export function mapActionDemandProfile(world,config={}){
  const n=Math.max(1,Math.floor(Number(world?.cubes?.length)||1));
  const ds=initialDistances(world);
  const fallback=Math.max(1,(finitePositive(world?.gridW,42)+finitePositive(world?.gridH,26)+(worldDimension(world)===3?finitePositive(world?.gridD,1):0))/4);
  const meanInitialDistance=ds.length?ds.reduce((s,x)=>s+x,0)/ds.length:fallback;
  const maxInitialDistance=ds.length?Math.max(...ds):meanInitialDistance;
  // All cells must reach the checkpoint, so give the lagging tail meaningful weight
  // instead of budgeting from the centroid alone.
  const effectiveDistance=.65*meanInitialDistance+.35*maxInitialDistance;

  const rawPathLength=finitePositive(world?.pathLength,0);
  const pathLength=rawPathLength||effectiveDistance;
  // pathLength / actual shortest-path demand captures tortuosity without hard-coding
  // map names. A mild capped multiplier adds time for backtracks/mazes/spirals.
  const detourRatio=clamp(pathLength/Math.max(1,effectiveDistance),1,5);
  const detourWeight=Math.max(0,finitePositive(config.actionBudgetDetourWeight,.20));
  const detourScale=1+detourWeight*(detourRatio-1);
  const dimensionScale=worldDimension(world)===3
    ?Math.max(1,finitePositive(config.actionBudget3DMultiplier,1.15))
    :1;

  return{
    swarmSize:n,
    meanInitialDistance,
    maxInitialDistance,
    effectiveDistance,
    pathLength,
    detourRatio,
    detourScale,
    dimensionScale,
    physicalDimensions:worldDimension(world)
  };
}

export function planAdaptiveActionBudget(world,config={},baselineBudget=null){
  const n=Math.max(1,Math.floor(Number(world?.cubes?.length)||1));
  const baseline=Math.max(1,Math.floor(Number(baselineBudget)||Number(config.maxGlobalActions)||1));
  const profile=mapActionDemandProfile(world,config);

  if(config.mapAdaptiveActionBudget===false){
    return{
      enabled:false,
      baselineBudget:baseline,
      finalBudget:baseline,
      requestedScale:1,
      appliedScale:1,
      minScale:1,
      maxScale:1,
      referenceDistance:null,
      ...profile
    };
  }

  const referenceDistance=Math.max(1,finitePositive(config.actionBudgetReferenceDistance,16));
  const minScale=Math.max(.05,finitePositive(config.actionBudgetMinScale,.50));
  const maxScale=Math.max(minScale,finitePositive(config.actionBudgetMaxScale,8));
  const requestedScale=(profile.effectiveDistance/referenceDistance)*profile.detourScale*profile.dimensionScale;
  const boundedScale=clamp(requestedScale,minScale,maxScale);

  // Round upward to a complete initial-swarm cycle. This keeps A/B matched and
  // avoids a timeout that gives only part of the initial swarm one last turn.
  const rawBudget=Math.max(n,baseline*boundedScale);
  const finalBudget=Math.max(n,Math.ceil(rawBudget/n)*n);

  return{
    enabled:true,
    baselineBudget:baseline,
    finalBudget,
    requestedScale,
    appliedScale:finalBudget/baseline,
    minScale,
    maxScale,
    referenceDistance,
    ...profile
  };
}

export function applyAdaptiveActionBudget(world,config={},baselineBudget=null){
  const plan=planAdaptiveActionBudget(world,config,baselineBudget);
  world.maxGlobalActions=plan.finalBudget;
  world.actionBudgetPlan=plan;
  return plan;
}

export function computeBudgetForActionHorizon(world,config={},actionBudget=null){
  const n=Math.max(1,Math.floor(Number(world?.cubes?.length)||1));
  const baseAtN16=Math.max(64,finitePositive(config.computeBudgetAtN16,4096));
  const baseCompute=baseAtN16*Math.max(.25,n/16);
  if(config.scaleComputeBudgetWithActionBudget===false)return baseCompute;

  const actions=Math.max(1,Math.floor(Number(actionBudget)||Number(world?.maxGlobalActions)||1));
  const perDecision=Math.max(0,finitePositive(config.computeCostPerCellDecision,1));
  // Meta-actions (echo, signalling, morphology) spend extra compute. Keep a
  // headroom so the compute limiter does not silently invalidate the action horizon.
  const headroom=Math.max(1,finitePositive(config.actionBudgetComputeHeadroom,1.25));
  const required=Math.ceil(actions*perDecision*headroom);
  return Math.max(baseCompute,required);
}
