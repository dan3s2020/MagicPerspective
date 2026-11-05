import {inferredExpectedBodyMass} from "./same-dish-body-discovery.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;

export function sameDishInferredResourcePlan(snapshot,config={},options={}){
  const inferredN=Math.max(1e-6,inferredExpectedBodyMass(snapshot)),baseAtN16=Math.max(64,finite(config.computeBudgetAtN16,4096));
  const actionBudget=Math.max(1,Math.floor(finite(options.actionBudget,config.maxGlobalActions||1024))),perDecision=Math.max(0,finite(config.computeCostPerCellDecision,1)),headroom=Math.max(1,finite(config.actionBudgetComputeHeadroom,1.25));
  const baseCompute=baseAtN16*Math.max(.25,inferredN/16),requiredCompute=Math.ceil(actionBudget*perDecision*headroom),computeBudget=config.scaleComputeBudgetWithActionBudget===false?baseCompute:Math.max(baseCompute,requiredCompute);

  const baseEnergy=Math.max(1,finite(config.energyBaseAtN16,180)),swarmExponent=clamp(finite(config.energySwarmExponent,.75),0,2),mapExponent=clamp(finite(config.energyMapScaleExponent,.50),0,2),mapScale=clamp(finite(options.mapScale,1),.25,8),dim=Number(options.physicalDimensions)===3?3:2,dimScale=dim===3?Math.max(1,finite(config.energy3DMultiplier,1.08)):1;
  const energyCapacity=baseEnergy*Math.pow(Math.max(.125,inferredN/16),swarmExponent)*Math.pow(mapScale,mapExponent)*dimScale;

  const dt=Math.max(0,finite(options.dt,0)),maintenance=Math.max(0,finite(config.energyBasalPerCellSecond,.10))*inferredN*dt,coordination=Math.max(0,finite(config.energyCoordinationPerCellLogSecond,.02))*inferredN*Math.log2(1+inferredN)*dt;

  return{
    version:1,mode:"shadow",
    inferredBodyMass:inferredN,
    inferredBodyMassLog:Math.tanh(Math.log2(Math.max(1,inferredN))/4),
    computeBudget,
    energyCapacity,
    maintenancePerStep:maintenance,
    coordinationPerStep:coordination,
    actionBudget,
    physicalDimensions:dim,
    mapScale
  };
}
