import {checkpointZone,distanceAt,isPassed} from "./world.js";

export function computeSwarmError(world,rewardCfg){
  const ds=world.cubes.map(c=>distanceAt(world,c.x,c.y,c.z||0)),mean=ds.reduce((a,b)=>a+b,0)/Math.max(1,ds.length),worst=Math.max(...ds);let zone=0;
  for(const c of world.cubes){const z=checkpointZone(world,c);if(z==="PRE_GATE")zone+=1;else if(z==="IN_GATE")zone+=.35;}zone/=Math.max(1,world.cubes.length);
  return mean+(rewardCfg.lambdaLaggard||.6)*worst+zone;
}
export function rewardTransition(world,beforeCells,dt,rewardCfg,activeEgo=0,resourceCost=0){
  const rc=typeof resourceCost==="number"?{computeExtraCost:resourceCost,energyPenalty:0}:(resourceCost||{}),computeExtraCost=Number(rc.computeExtraCost)||0,activeEnergyPenalty=Math.max(0,Number(rc.energyPenalty)||0);
  // optional (revisitPenalty > 0, default off): places the body has already occupied in this episode
  // optional (progressSignal "exploration", default "distance"): what the organs call "progress" (selfDelta, groupDelta,
  // maxProgress) is a place the body had not occupied yet in this episode, never the distance to the exit
  const explore=rewardCfg.progressSignal==="exploration";
  const rp=Number(rewardCfg.revisitPenalty)||0;let visited=null;
  if(rp>0||explore){visited=world.visitedByBody||(world.visitedByBody=new Set(beforeCells.map(c=>c.x+","+c.y+","+(c.z||0))));}
  const pkey=c=>c.x+","+c.y+","+(c.z||0),isNew=(o,a)=>!(o.x===a.x&&o.y===a.y&&(o.z||0)===(a.z||0))&&!visited.has(pkey(a));
  const after=world.cubes,beforeWorld={...world,cubes:beforeCells};
  const groupDelta=explore?after.reduce((s,a,i)=>s+(isNew(beforeCells[i]||a,a)?1:0),0)/Math.max(1,after.length):computeSwarmError(beforeWorld,rewardCfg)-computeSwarmError(world,rewardCfg),rewards=new Array(after.length);let allPassed=true;
  for(let i=0;i<after.length;i++){
    const r=world.egoRuntime[i],old=beforeCells[i]||after[i],oldD=explore?0:distanceAt(beforeWorld,old.x,old.y,old.z||0),newD=explore?0:distanceAt(world,after[i].x,after[i].y,after[i].z||0),selfDelta=explore?(isNew(old,after[i])?1:0):oldD-newD,oldZone=checkpointZone(beforeWorld,old),zone=checkpointZone(world,after[i]);let zoneCost=0;
    if(zone==="PRE_GATE")zoneCost=(rewardCfg.outsideCostRate||0)*dt;else if(zone==="IN_GATE")zoneCost=(rewardCfg.inGateCostRate||0)*dt;let milestone=0;
    if(!r.enteredGate&&oldZone==="PRE_GATE"&&zone!=="PRE_GATE"){r.enteredGate=true;milestone+=rewardCfg.enterGateBonus||0;}if(!r.crossedExit&&isPassed(world,after[i])){r.crossedExit=true;milestone+=rewardCfg.crossExitBonus||0;}
    const progress=explore?(Number(r.maxProgress)||0)+selfDelta:r.initialDistance-newD,newBest=Math.max(0,progress-r.maxProgress);if(newBest>0)r.maxProgress=progress;const bestBonus=newBest*(rewardCfg.newBestScale||0),computePenalty=i===activeEgo?((rewardCfg.computeCostRate||0)+computeExtraCost):0,energyPenalty=i===activeEgo?activeEnergyPenalty:0;
    // optional (stillPenalty > 0, default off): the acting cell pays when its action left it where it was, so staying
    // in place costs and exploring does not; it says nothing about where the target is.
    const sp=Number(rewardCfg.stillPenalty)||0,stillPenalty=sp>0&&i===activeEgo&&old.x===after[i].x&&old.y===after[i].y&&(old.z||0)===(after[i].z||0)?sp:0;
    // the acting cell pays revisitPenalty when it moved into a place the body had already occupied (exploring is free)
    const moved=!(old.x===after[i].x&&old.y===after[i].y&&(old.z||0)===(after[i].z||0)),revisitPenalty=rp>0&&i===activeEgo&&moved&&visited.has(pkey(after[i]))?rp:0;
    const total=(rewardCfg.alphaSelf||1)*selfDelta+(rewardCfg.betaGroup||0)*groupDelta-zoneCost+milestone+bestBonus-computePenalty-energyPenalty-stillPenalty-revisitPenalty;
    rewards[i]=sp>0||rp>0||explore?{total,selfDelta,groupDelta,zoneCost,milestone,bestBonus,computePenalty,energyPenalty,stillPenalty,revisitPenalty,zone}:{total,selfDelta,groupDelta,zoneCost,milestone,bestBonus,computePenalty,energyPenalty,zone};if(!isPassed(world,after[i]))allPassed=false;
  }
  if(visited)for(const c of after)visited.add(pkey(c));
  if(allPassed&&after.length){world.success=true;for(const rr of rewards){rr.terminal=rewardCfg.terminalBonus||0;rr.total+=rr.terminal;}}else for(const rr of rewards)rr.terminal=0;
  for(let i=0;i<rewards.length;i++)world.egoRuntime[i].pendingReward+=rewards[i].total;return rewards;
}
export function consumePendingReward(world,egoId){const r=world.egoRuntime[egoId],v=r.pendingReward;r.pendingReward=0;r.previousReward=v;return v;}
