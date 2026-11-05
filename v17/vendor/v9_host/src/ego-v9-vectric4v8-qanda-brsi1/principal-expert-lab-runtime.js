export const PRINCIPAL_EXPERT_MAPS=Object.freeze(["v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural"]);

export function normalizeExpertLabControls(input={}){
  const int=(v,f,min=1,max=1_000_000)=>{const n=Math.floor(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):f;};
  return Object.freeze({
    aSimulations:int(input.aSimulations,20,1,100000),
    bSimulations:int(input.bSimulations,20,1,100000),
    stepBudget:int(input.stepBudget,250,16,1_000_000),
    optimizerMicrobatch:int(input.optimizerMicrobatch,32,1,100000),
    workerThreads:int(input.workerThreads,8,1,64),
    cells:int(input.cells,16,2,300),
    aEnabled:input.aEnabled!==false,
    bEnabled:input.bEnabled!==false
  });
}

export function expertRuntimeConfig(baseConfig,lineage,map,controls,expertId){
  const c=normalizeExpertLabControls(controls),L=String(lineage||"").toUpperCase();
  if(L!=="A"&&L!=="B")throw new Error("expert lineage must be A or B");
  if(!PRINCIPAL_EXPERT_MAPS.includes(map))throw new Error("unsupported expert map "+map);
  return{
    ...baseConfig,
    mapMode:map,
    groupASimulationCount:c.aSimulations,
    groupBSimulationCount:c.bSimulations,
    maxGlobalActions:c.stepBudget,
    carrotStartActions:c.stepBudget,
    carrotMinActions:c.stepBudget,
    carrotMaxActions:c.stepBudget,
    horizonCurriculumMode:"fixed",
    mapAdaptiveActionBudget:false,
    scaleActionBudgetWithSwarm:false,
    scaleComputeBudgetWithActionBudget:true,
    optimizerMicrobatchSize:c.optimizerMicrobatch,
    workerThreadCount:c.workerThreads,
    scalableSwarm:false,
    swarmSizeMin:c.cells,
    swarmSizeMax:c.cells,
    pretrainAutoCurriculum:false,
    principalWorkerNamespace:String(expertId||L+":"+map),
    rsiInheritanceGateStrict:false,
    gpuEnabled:true,
    gpuRequired:false,
    nativeMultiGpuEnabled:true,
    nativeMultiGpuRequired:false,
    nativeGpuMinDevices:1
  };
}

export function createExpertRunControl(initial="idle"){
  let status=String(initial||"idle"),stopRequested=false;
  const allowed=new Set(["idle","running","pause_requested","paused","stop_requested","stopped","failed"]);
  if(!allowed.has(status))status="idle";
  return{
    get status(){return status;},
    get stopRequested(){return stopRequested;},
    start(){if(status==="idle"||status==="paused"){status="running";return true;}return false;},
    requestPause(){if(status==="running"){status="pause_requested";return true;}return false;},
    requestStop(){if(status==="stopped")return false;stopRequested=true;if(status!=="failed")status="stop_requested";return true;},
    noteQuiescent(){
      if(status==="pause_requested"){status="paused";return true;}
      if(status==="stop_requested"){status="stopped";return true;}
      return false;
    },
    fail(){status="failed";return status;},
    mayLaunch(lineage,controls){
      const c=normalizeExpertLabControls(controls),L=String(lineage||"").toUpperCase();
      return status==="running"&&(L==="A"?c.aEnabled:L==="B"?c.bEnabled:false);
    },
    shouldContinue(lineage,controls){return this.mayLaunch(lineage,controls);},
    snapshot(){return{status,stopRequested};}
  };
}

export function expertIds(){
  return["A","B"].flatMap(lineage=>PRINCIPAL_EXPERT_MAPS.map(map=>({id:lineage+":"+map,lineage,map})));
}



export function planLineageSimulationBudget(expertRows,lineage,simulationBudget){
  const L=String(lineage||"").toUpperCase();
  if(L!=="A"&&L!=="B")return[];
  const budget=Math.max(0,Math.floor(Number(simulationBudget)||0));
  if(!budget)return[];
  const order=new Map(PRINCIPAL_EXPERT_MAPS.map((map,i)=>[map,i]));
  const rows=[...(expertRows||[])].filter(x=>x&&x.lineage===L);
  const active=rows.filter(x=>x.busy).reduce((sum,x)=>sum+Math.max(1,Math.floor(Number(x.activeSimulations)||1)),0);
  let remaining=Math.max(0,budget-active);
  if(!remaining)return[];
  const idle=rows.filter(x=>!x.busy).sort((a,b)=>
    (Number(a.batch)||0)-(Number(b.batch)||0)
    ||(Number(a.totalSimulations)||0)-(Number(b.totalSimulations)||0)
    ||(order.get(a.map)??999)-(order.get(b.map)??999)
    ||String(a.id||"").localeCompare(String(b.id||""))
  );
  if(!idle.length)return[];
  const selected=idle.slice(0,Math.min(idle.length,remaining));
  const base=Math.floor(remaining/selected.length),extra=remaining%selected.length;
  return selected.map((expert,i)=>({id:expert.id,simulations:base+(i<extra?1:0)})).filter(x=>x.simulations>0);
}
