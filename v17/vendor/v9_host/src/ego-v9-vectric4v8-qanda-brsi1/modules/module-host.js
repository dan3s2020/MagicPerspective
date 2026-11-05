import {MODULE_MODES,createModuleSlot,moduleCompatible,moduleSlotSnapshot,normalizeModuleMode} from "./module-contract.js";

export function createModuleHost(hostVersion){return{version:1,hostVersion:String(hostVersion),slots:new Map(),activeByCapability:new Map()};}
export function attachModule(host,definition,{mode="off",adapter=null}={}){
  if(host.slots.has(definition.id))throw new Error("module already attached: "+definition.id);
  if(!moduleCompatible(definition,host.hostVersion)&&!adapter)throw new Error(definition.id+" requires an adapter for host "+host.hostVersion);
  if(adapter&&adapter.moduleId!==definition.id)throw new Error("adapter/module mismatch");
  if(adapter&&!adapter.hostVersions.includes("*")&&!adapter.hostVersions.includes(host.hostVersion))throw new Error("adapter incompatible with host "+host.hostVersion);
  const slot=createModuleSlot(definition,{mode,adapter});host.slots.set(slot.id,slot);
  if(slot.mode===MODULE_MODES.ACTIVE)setActiveModule(host,slot.capability,slot.id);
  return slot;
}
export function setActiveModule(host,capability,id=null){
  const cap=String(capability);
  if(id==null){host.activeByCapability.delete(cap);for(const s of host.slots.values())if(s.capability===cap&&s.mode===MODULE_MODES.ACTIVE)s.mode=MODULE_MODES.SHADOW;return null;}
  const slot=host.slots.get(id);if(!slot||slot.capability!==cap)throw new Error("module "+id+" is not attached for "+cap);
  if(slot.definition?.activationPolicy==="shadow-only")throw new Error("module "+id+" is SHADOW-only and cannot be ACTIVE");
  for(const s of host.slots.values())if(s.capability===cap&&s.id!==id&&s.mode===MODULE_MODES.ACTIVE)s.mode=MODULE_MODES.SHADOW;
  slot.mode=MODULE_MODES.ACTIVE;host.activeByCapability.set(cap,id);return slot;
}
export function setModuleMode(host,id,mode){
  const slot=host.slots.get(id);if(!slot)throw new Error("module not attached: "+id);
  const m=normalizeModuleMode(mode);
  if(m===MODULE_MODES.ACTIVE)return setActiveModule(host,slot.capability,id);
  slot.mode=m;if(host.activeByCapability.get(slot.capability)===id)host.activeByCapability.delete(slot.capability);return slot;
}
export function modulesForCapability(host,capability){return [...host.slots.values()].filter(s=>s.capability===capability);}
export function activeModuleForCapability(host,capability){const id=host.activeByCapability.get(String(capability));return id?host.slots.get(id)||null:null;}
export function runCapabilityHook(host,capability,hook,input){
  const results=[];
  for(const slot of modulesForCapability(host,capability)){
    if(slot.mode===MODULE_MODES.OFF)continue;
    const fn=slot.adapter?.hooks?.[hook]||slot.definition.hooks?.[hook];if(typeof fn!=="function")continue;
    const output=fn({module:slot.definition,input,mode:slot.mode});
    slot.stats.runs++;slot.stats.lastHook=hook;if(slot.mode===MODULE_MODES.SHADOW)slot.stats.shadowRuns++;else slot.stats.activeRuns++;
    results.push({id:slot.id,mode:slot.mode,output,effective:slot.mode===MODULE_MODES.ACTIVE?output:null});
  }
  return results;
}
export function replaceModule(host,oldId,newDefinition,options={}){
  const old=host.slots.get(oldId);if(!old)throw new Error("module not attached: "+oldId);
  if(old.capability!==newDefinition.capability)throw new Error("replacement capability mismatch");
  const wasActive=host.activeByCapability.get(old.capability)===oldId;host.slots.delete(oldId);if(wasActive)host.activeByCapability.delete(old.capability);
  return attachModule(host,newDefinition,{...options,mode:wasActive?"active":(options.mode??old.mode)});
}
export function moduleHostSnapshot(host){return{version:host.version,hostVersion:host.hostVersion,active:Object.fromEntries(host.activeByCapability),modules:[...host.slots.values()].map(moduleSlotSnapshot)};}
