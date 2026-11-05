export const GROUP_RUNTIME_VERSION="v9-group-runtime-1";
export const TRAINING_GROUPS=Object.freeze(["A","B"]);

function validGroup(group){
  const g=String(group||"");
  if(!TRAINING_GROUPS.includes(g))throw new Error("unknown training group "+g);
  return g;
}
function freshGroup({policyVersion=1,batch=0,mapEpisodeCursor=0}={}){
  return{
    targetEnabled:true,status:"enabled",inFlight:0,generation:0,changeRequestedAt:null,changeEffectiveAt:Date.now(),enabledSince:Date.now(),enabledMs:0,
    batch:Math.max(0,Math.floor(Number(batch)||0)),
    optimizerSteps:0,policyVersion:Math.max(1,Math.floor(Number(policyVersion)||1)),
    mapEpisodeCursor:Math.max(0,Math.floor(Number(mapEpisodeCursor)||0)),
    launched:0,completed:0,discarded:0,lastTransition:null
  };
}
export function createGroupRuntime({policyVersion=1,batch=0,mapEpisodeCursor=0}={}){
  return{
    version:GROUP_RUNTIME_VERSION,
    scheduler:{policy:"fair_work_conserving",noGlobalBarrier:true,weights:{A:1,B:1},epoch:0},
    maintenance:{lastReadinessMinBatch:0,lastHeldoutMinBatch:0,lastDiagnosticMinBatch:0},
    groups:{
      A:freshGroup({policyVersion,batch,mapEpisodeCursor}),
      B:freshGroup({policyVersion,batch,mapEpisodeCursor})
    },
    lastEvent:null
  };
}
export function ensureGroupRuntime(t){
  if(!t||typeof t!=="object")throw new Error("trainer required");
  if(!t.groupRuntime||t.groupRuntime.version!==GROUP_RUNTIME_VERSION){
    t.groupRuntime=createGroupRuntime({policyVersion:t.policyVersion||1,batch:t.batch||0,mapEpisodeCursor:t.mapEpisodeCursor||0});
  }
  const r=t.groupRuntime;
  if(!r.scheduler||typeof r.scheduler!=="object")r.scheduler={policy:"fair_work_conserving",noGlobalBarrier:true,weights:{A:1,B:1},epoch:0};
  r.scheduler.policy="fair_work_conserving";r.scheduler.noGlobalBarrier=true;
  r.scheduler.weights={A:Math.max(0,Number(r.scheduler.weights?.A)||1),B:Math.max(0,Number(r.scheduler.weights?.B)||1)};
  if(!r.maintenance||typeof r.maintenance!=="object")r.maintenance={lastReadinessMinBatch:0,lastHeldoutMinBatch:0,lastDiagnosticMinBatch:0};
  for(const g of TRAINING_GROUPS){
    if(!r.groups?.[g]){
      r.groups=r.groups||{};
      r.groups[g]=freshGroup({policyVersion:t.policyVersion||1,batch:t.batch||0,mapEpisodeCursor:t.mapEpisodeCursor||0});
    }
    const q=r.groups[g];
    q.targetEnabled=q.targetEnabled!==false;
    q.status=["enabled","stop_requested","quiescing","disabled"].includes(q.status)?q.status:(q.targetEnabled?"enabled":"disabled");
    q.inFlight=Math.max(0,Math.floor(Number(q.inFlight)||0));
    q.generation=Math.max(0,Math.floor(Number(q.generation)||0));
    q.batch=Math.max(0,Math.floor(Number(q.batch)||0));
    q.optimizerSteps=Math.max(0,Math.floor(Number(q.optimizerSteps)||0));
    q.policyVersion=Math.max(1,Math.floor(Number(q.policyVersion)||Number(t.policyVersion)||1));
    q.mapEpisodeCursor=Math.max(0,Math.floor(Number(q.mapEpisodeCursor)||0));
    q.launched=Math.max(0,Math.floor(Number(q.launched)||0));
    q.completed=Math.max(0,Math.floor(Number(q.completed)||0));
    q.discarded=Math.max(0,Math.floor(Number(q.discarded)||0));
    q.changeRequestedAt=q.changeRequestedAt==null?null:Number(q.changeRequestedAt);q.changeEffectiveAt=q.changeEffectiveAt==null?null:Number(q.changeEffectiveAt);q.enabledSince=q.enabledSince==null?null:Number(q.enabledSince);q.enabledMs=Math.max(0,Number(q.enabledMs)||0);
    if(!q.targetEnabled&&q.inFlight===0)q.status="disabled";
    else if(!q.targetEnabled&&q.status!=="stop_requested")q.status="quiescing";
    else if(q.status==="disabled"||q.status==="quiescing")q.status="enabled";
  }
  return r;
}
export function recoverGroupRuntimeAfterRestore(t){
  const r=ensureGroupRuntime(t);
  for(const g of TRAINING_GROUPS){
    const q=r.groups[g];
    q.inFlight=0;
    q.status=q.targetEnabled?"enabled":"disabled";
  }
  r.lastEvent={type:"restore_recovered",activeGroups:activeGroupNames(t)};
  return r;
}
export function groupRuntimeState(t,group){
  return ensureGroupRuntime(t).groups[validGroup(group)];
}
export function groupPolicyVersion(t,group){
  return groupRuntimeState(t,group).policyVersion;
}
export function groupIsEnabled(t,group){
  return groupRuntimeState(t,group).targetEnabled;
}
export function groupCanLaunch(t,group){
  const q=groupRuntimeState(t,group);
  return q.targetEnabled&&q.status==="enabled";
}
export function activeGroupNames(t){
  const r=ensureGroupRuntime(t);
  return TRAINING_GROUPS.filter(g=>r.groups[g].targetEnabled);
}
function closeEnabledWindow(q,at){if(q.enabledSince!=null){q.enabledMs+=Math.max(0,at-q.enabledSince);q.enabledSince=null;}}
export function requestGroupEnabled(t,group,enabled,at=Date.now(),reason="user"){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g],next=Boolean(enabled),before={targetEnabled:q.targetEnabled,status:q.status,inFlight:q.inFlight},requestedAt=Number(at)||Date.now();
  q.generation++;q.targetEnabled=next;q.changeRequestedAt=requestedAt;
  if(next){q.status="enabled";if(q.enabledSince==null)q.enabledSince=requestedAt;if(q.inFlight===0)q.changeEffectiveAt=requestedAt;}
  else if(q.inFlight>0)q.status="stop_requested";
  else{q.status="disabled";q.changeEffectiveAt=requestedAt;closeEnabledWindow(q,requestedAt);}
  const ev={type:"group_selection_change",group:g,enabled:next,before,after:{targetEnabled:q.targetEnabled,status:q.status,inFlight:q.inFlight},generation:q.generation,reason,changeRequestedAt:requestedAt,changeEffectiveAt:q.changeEffectiveAt};
  q.lastTransition=ev;r.lastEvent=ev;r.scheduler.epoch=(Number(r.scheduler.epoch)||0)+1;return ev;
}
export function markGroupQuiescing(t,group,at=Date.now()){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g];
  if(q.targetEnabled||q.inFlight<=0||q.status==="disabled")return null;
  const before=q.status;q.status="quiescing";
  const ev={type:"group_quiescing",group:g,before,after:q.status,generation:q.generation,changeRequestedAt:q.changeRequestedAt,at:Number(at)||Date.now()};
  q.lastTransition=ev;r.lastEvent=ev;return ev;
}
export function beginGroupAtomicWork(t,group){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g];
  if(!q.targetEnabled||q.status!=="enabled")return null;
  q.inFlight++;q.launched++;
  return{group:g,generation:q.generation,policyVersion:q.policyVersion,ordinal:q.launched};
}
export function finishGroupAtomicWork(t,group,token,{committed=true,policyVersionDelta=0}={}){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g];
  q.inFlight=Math.max(0,q.inFlight-1);
  if(committed){q.completed++;q.policyVersion+=Math.max(0,Math.floor(Number(policyVersionDelta)||0));}
  else q.discarded++;
  if(!q.targetEnabled&&q.inFlight===0){
    q.status="disabled";q.changeEffectiveAt=Date.now();closeEnabledWindow(q,q.changeEffectiveAt);
    const ev={type:"group_quiesced",group:g,generation:q.generation,completed:q.completed,discarded:q.discarded,policyVersion:q.policyVersion,changeRequestedAt:q.changeRequestedAt,changeEffectiveAt:q.changeEffectiveAt,quiesceDurationMs:q.changeRequestedAt?Math.max(0,q.changeEffectiveAt-q.changeRequestedAt):0};
    q.lastTransition=ev;r.lastEvent=ev;
  }else if(q.targetEnabled)q.status="enabled";
  else if(q.inFlight>0)q.status="quiescing";
  return groupRuntimeSnapshot(t);
}
export function markGroupPolicyUpdate(t,group,delta=1){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g],n=Math.max(0,Math.floor(Number(delta)||0));
  q.policyVersion+=n;q.optimizerSteps+=n;if(n)r.scheduler.epoch=(Number(r.scheduler.epoch)||0)+1;return q.policyVersion;
}
export function markGroupBatchComplete(t,group,{optimizerSteps=0,simulations=0,advanceCursor=false}={}){
  const g=validGroup(group),r=ensureGroupRuntime(t),q=r.groups[g];
  q.batch++;
  q.optimizerSteps+=Math.max(0,Math.floor(Number(optimizerSteps)||0));
  if(advanceCursor)q.mapEpisodeCursor+=Math.max(0,Math.floor(Number(simulations)||0));
  r.scheduler.epoch=(Number(r.scheduler.epoch)||0)+1;
  return q.batch;
}
export function resetGroupMapCursors(t,value=0){
  const r=ensureGroupRuntime(t),v=Math.max(0,Math.floor(Number(value)||0));
  for(const g of TRAINING_GROUPS)r.groups[g].mapEpisodeCursor=v;
  return v;
}
export function minGroupBatch(t){
  const r=ensureGroupRuntime(t);
  return Math.min(...TRAINING_GROUPS.map(g=>r.groups[g].batch));
}
export function allGroupsDisabled(t){
  return activeGroupNames(t).length===0;
}
export function allocationSnapshot(t,poolSnapshot=null){
  const r=ensureGroupRuntime(t),workers=Math.max(0,Number(poolSnapshot?.count)||0),runnable=TRAINING_GROUPS.filter(g=>r.groups[g].targetEnabled&&r.groups[g].status==="enabled"),den=Math.max(1,runnable.length),perGroup={};
  for(const g of TRAINING_GROUPS){
    const q=r.groups[g],share=runnable.includes(g)?1/den:0,service=poolSnapshot?.stats?.byGroup?.[g]||{};
    perGroup[g]={targetEnabled:q.targetEnabled,status:q.status,inFlight:q.inFlight,batch:q.batch,policyVersion:q.policyVersion,workerShare:share,effectiveWorkers:share*workers,gpuShare:null,service:{...service}};
  }
  return{policy:r.scheduler.policy,noGlobalBarrier:true,requestedActiveGroups:TRAINING_GROUPS.filter(g=>r.groups[g].targetEnabled),runnableGroups:runnable,effectiveActiveGroups:TRAINING_GROUPS.filter(g=>r.groups[g].status!=="disabled"),workers,perGroup};
}
export function groupRuntimeSnapshot(t){
  const r=ensureGroupRuntime(t);
  return{
    version:r.version,
    scheduler:{policy:r.scheduler.policy,noGlobalBarrier:Boolean(r.scheduler.noGlobalBarrier),weights:{...r.scheduler.weights},epoch:Number(r.scheduler.epoch)||0},
    maintenance:{...r.maintenance},
    activeGroups:activeGroupNames(t),
    groups:Object.fromEntries(TRAINING_GROUPS.map(g=>{const q=r.groups[g];return[g,{targetEnabled:q.targetEnabled,status:q.status,inFlight:q.inFlight,generation:q.generation,batch:q.batch,optimizerSteps:q.optimizerSteps,policyVersion:q.policyVersion,mapEpisodeCursor:q.mapEpisodeCursor,launched:q.launched,completed:q.completed,discarded:q.discarded,changeRequestedAt:q.changeRequestedAt,changeEffectiveAt:q.changeEffectiveAt,enabledMs:q.enabledMs}];})),
    lastEvent:r.lastEvent?structuredClone(r.lastEvent):null
  };
}
