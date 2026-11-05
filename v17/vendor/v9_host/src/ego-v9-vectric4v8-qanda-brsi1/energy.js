const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
export const ENERGY_VERSION=1;

export function createEnergyEconomy(world,config={}){
  const n=Math.max(1,Math.floor(Number(world?.cubes?.length)||1));
  const base=Math.max(1,finite(config.energyBaseAtN16,180));
  const swarmExponent=clamp(finite(config.energySwarmExponent,.75),0,2);
  const mapExponent=clamp(finite(config.energyMapScaleExponent,.50),0,2);
  const mapScale=clamp(finite(world?.actionBudgetPlan?.appliedScale,1),.25,8);
  const dim=world?.physicalDimensions===3?3:2;
  const dimScale=dim===3?Math.max(1,finite(config.energy3DMultiplier,1.08)):1;
  const capacity=base*Math.pow(Math.max(.125,n/16),swarmExponent)*Math.pow(mapScale,mapExponent)*dimScale;
  return{
    version:ENERGY_VERSION,capacity,remaining:capacity,debt:0,spent:0,usefulProgress:0,recentCost:0,efficiency:0,
    categories:{decision:0,intent:0,motion:0,rejected:0,maintenance:0,coordination:0,communication:0,morphology:0},
    events:[]
  };
}

export function energyContext(e){
  if(!e)return{remaining:1,debt:0,recentCost:0,efficiency:0,spent:0,capacity:1};
  const cap=Math.max(1e-9,finite(e.capacity,1));
  return{
    remaining:clamp(finite(e.remaining,0)/cap,0,1),
    debt:Math.tanh(Math.max(0,finite(e.debt,0))/cap),
    recentCost:Math.tanh(Math.max(0,finite(e.recentCost,0))/Math.max(1,cap*.02)),
    efficiency:clamp(finite(e.efficiency,0),0,1),
    spent:Math.max(0,finite(e.spent,0)),
    capacity:cap
  };
}

export function actionEnergyBreakdown({confidence=0,motion=false,accepted=true,movedCount=0,cellCount=1,dt=0,communication=null}={},config={}){
  const c=clamp(finite(confidence,0),0,1),n=Math.max(1,Math.floor(finite(cellCount,1))),stepDt=Math.max(0,finite(dt,0));
  const decision=Math.max(0,finite(config.energyDecisionCost,.05));
  const intent=motion?Math.max(0,finite(config.energyIntentCost,.25))*c*c:0;
  const moved=Math.max(0,Math.floor(finite(movedCount,0)));
  const motionCost=Math.max(0,finite(config.energyMoveCost,.35))*moved;
  const rejected=motion&&!accepted?Math.max(0,finite(config.energyRejectedIntentCost,.10))*c:0;
  const maintenance=Math.max(0,finite(config.energyBasalPerCellSecond,.10))*n*stepDt;
  const coordination=Math.max(0,finite(config.energyCoordinationPerCellLogSecond,.02))*n*Math.log2(1+n)*stepDt;
  let comm=0;
  if(communication==="PING")comm=Math.max(0,finite(config.energyPingCost,.35));
  else if(communication==="SIGNAL")comm=Math.max(0,finite(config.energySignalCost,.20));
  return{decision,intent,motion:motionCost,rejected,maintenance,coordination,communication:comm,morphology:0};
}

function breakdownTotal(b){
  if(typeof b==="number")return Math.max(0,finite(b,0));
  let q=0;for(const k of ["decision","intent","motion","rejected","maintenance","coordination","communication","morphology"])q+=Math.max(0,finite(b?.[k],0));
  return q;
}

export function spendEnergy(e,breakdown,config={}){
  if(!e)return{cost:0,penalty:0,debtAdded:0,remaining:0,debt:0};
  const cost=breakdownTotal(breakdown),before=Math.max(0,finite(e.remaining,0)),paid=Math.min(before,cost),debtAdded=Math.max(0,cost-paid);
  e.remaining=Math.max(0,before-cost);e.debt=Math.max(0,finite(e.debt,0))+debtAdded;e.spent=Math.max(0,finite(e.spent,0))+cost;
  e.recentCost=.97*Math.max(0,finite(e.recentCost,0))+.03*cost;
  if(breakdown&&typeof breakdown==="object")for(const k of Object.keys(e.categories))e.categories[k]+=Math.max(0,finite(breakdown[k],0));
  else e.categories.decision+=cost;
  const cap=Math.max(1e-9,finite(e.capacity,1)),debtRatio=e.debt/cap;
  const scale=Math.max(0,finite(config.energyRewardScale,.15)),debtMult=Math.max(0,finite(config.energyDebtPenaltyMultiplier,2));
  const penalty=cost*scale*(1+debtRatio*debtMult);
  if(debtAdded>0){e.events.push({type:"ENERGY_DEBT",cost,debtAdded,debt:e.debt});if(e.events.length>64)e.events.shift();}
  return{cost,penalty,debtAdded,remaining:e.remaining,debt:e.debt};
}

export function noteEnergyProgress(e,progress){
  if(!e)return;
  e.usefulProgress+=Math.max(0,finite(progress,0));
  const raw=e.usefulProgress/Math.max(1,e.spent);
  e.efficiency=clamp(1-Math.exp(-3*raw),0,1);
}

export function morphologyEnergyCost(name,config={}){
  if(name==="BUD")return Math.max(0,finite(config.energyBirthCost,6));
  if(name==="FUSION_BUD")return Math.max(0,finite(config.energyFusionCost,8));
  if(name==="REACTIVATE")return Math.max(0,finite(config.energyReactivateCost,5));
  if(name==="RETIRE")return Math.max(0,finite(config.energyRetireCost,1));
  return 0;
}

export function canAffordMorphology(e,cost,config={}){
  if(!e)return true;
  const reserve=clamp(finite(config.energyMorphologyReserveFraction,.05),0,.95)*Math.max(0,finite(e.capacity,0));
  return Math.max(0,finite(e.remaining,0))-Math.max(0,finite(cost,0))>=reserve;
}

export function energySnapshot(e){
  if(!e)return null;
  return{version:e.version,capacity:e.capacity,remaining:e.remaining,debt:e.debt,spent:e.spent,usefulProgress:e.usefulProgress,recentCost:e.recentCost,efficiency:e.efficiency,categories:{...e.categories},events:e.events.slice(-16)};
}
