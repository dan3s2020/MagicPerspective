import {hashValue,canonicalize} from "./causal-types.js";

export const CHECKPOINT_SCHEMA_VERSION=2;

function common(t){
  return{
    schemaVersion:CHECKPOINT_SCHEMA_VERSION,
    stage:t.stage,batch:t.batch,policyVersion:t.policyVersion,mapEpisodeCursor:t.mapEpisodeCursor,
    groupRuntime:t.groupRuntime?structuredClone(t.groupRuntime):null,
    config:structuredClone(t.config),evalStreak:t.evalStreak||0,
    historyTail:structuredClone((t.history||[]).slice(-8))
  };
}
export function createScopeCheckpoint(t,scope,cell=null,{replaySnapshot=null,seedCursor=null}={}){
  const base=common(t);
  let state;
  if(scope==="A")state={
    ...base,scope,cell:null,
    groupA:structuredClone(t.groupA),groupAAdam:structuredClone(t.groupAAdam),
    groupAReplayAdam:structuredClone(t.groupAReplayAdam),metaA:structuredClone(t.metaA),specialistsA:structuredClone(t.specialistsA),
    worldModelA:structuredClone(t.worldModelA),worldModelAAdam:structuredClone(t.worldModelAAdam),semanticSoundA:structuredClone(t.semanticSoundA)
  };
  else if(scope==="B-system"||scope==="B-cell"||scope==="B-higher")state={
    ...base,scope,cell,
    groupB:structuredClone(t.groupB),groupBAdam:structuredClone(t.groupBAdam),
    groupBReplayAdam:structuredClone(t.groupBReplayAdam),
    higher:structuredClone(t.higher),higherAdam:structuredClone(t.higherAdam),metaB:structuredClone(t.metaB),specialistsB:structuredClone(t.specialistsB),
    worldModelB:structuredClone(t.worldModelB),worldModelBAdam:structuredClone(t.worldModelBAdam),semanticSoundB:structuredClone(t.semanticSoundB)
  };
  else if(scope==="RSI-controller")state={
    ...base,scope,cell:null,
    brsiController:structuredClone(t.qandaController||t.brsiController),
    brsiAdam:structuredClone(t.qandaAdam||t.brsiAdam)
  };
  else throw new Error("unknown checkpoint scope "+scope);
  if(replaySnapshot!=null)state.replaySnapshot=structuredClone(replaySnapshot);
  if(seedCursor!=null)state.seedCursor=structuredClone(seedCursor);
  const subHashes={};
  for(const [k,v] of Object.entries(state))if(k!=="historyTail")subHashes[k]=hashValue(v);
  const hash=hashValue({schemaVersion:CHECKPOINT_SCHEMA_VERSION,scope,cell,subHashes});
  return{schemaVersion:CHECKPOINT_SCHEMA_VERSION,scope,cell,state,subHashes,hash};
}
export function assertCheckpointPair(a,b){
  if(!a||!b||a.hash!==b.hash)throw new Error("causal branch pre-checkpoint mismatch");
  return true;
}
export function cloneCheckpoint(cp){return structuredClone(cp);}
export function checkpointManifest(cp){return{schemaVersion:cp.schemaVersion,scope:cp.scope,cell:cp.cell,hash:cp.hash,subHashes:structuredClone(cp.subHashes)};}
