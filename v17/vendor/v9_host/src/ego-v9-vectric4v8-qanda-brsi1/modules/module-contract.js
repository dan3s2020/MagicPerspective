export const MODULE_MODES=Object.freeze({OFF:"off",SHADOW:"shadow",ACTIVE:"active"});

export function normalizeModuleMode(mode){
  const m=String(mode??MODULE_MODES.OFF).toLowerCase();
  if(!Object.values(MODULE_MODES).includes(m))throw new Error("invalid module mode "+mode);
  return m;
}
export function assertModuleDefinition(def){
  if(!def||typeof def!=="object")throw new Error("module definition required");
  for(const k of ["id","capability","version"])if(!String(def[k]??"").trim())throw new Error("module "+k+" required");
  if(!Array.isArray(def.compatibility?.hostVersions)||!def.compatibility.hostVersions.length)throw new Error(def.id+" compatibility.hostVersions required");
  return def;
}
export function moduleCompatible(def,hostVersion){
  assertModuleDefinition(def);
  return def.compatibility.hostVersions.includes("*")||def.compatibility.hostVersions.includes(String(hostVersion));
}
export function createModuleSlot(def,{mode="off",adapter=null}={}){
  assertModuleDefinition(def);
  return{id:def.id,capability:def.capability,version:def.version,definition:def,adapter,mode:normalizeModuleMode(mode),stats:{runs:0,shadowRuns:0,activeRuns:0,lastHook:null}};
}
export function moduleSlotSnapshot(slot){return{id:slot.id,capability:slot.capability,version:slot.version,mode:slot.mode,adapterId:slot.adapter?.id||null,stats:{...slot.stats}};}
