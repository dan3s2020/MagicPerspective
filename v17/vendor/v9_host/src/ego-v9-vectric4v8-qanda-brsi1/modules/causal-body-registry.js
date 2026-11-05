import {CAUSAL_BODY_DISCOVERY_CAPABILITY,CAUSAL_BODY_DISCOVERY_V1_ID,causalBodyDiscoveryV1Definition} from "./causal-body-discovery-v1.js";
import {causalBodyDiscoveryV9Adapter} from "./causal-body-v9-adapter.js";

const implementations=new Map([
  [CAUSAL_BODY_DISCOVERY_V1_ID,Object.freeze({
    id:CAUSAL_BODY_DISCOVERY_V1_ID,
    capability:CAUSAL_BODY_DISCOVERY_CAPABILITY,
    definition:causalBodyDiscoveryV1Definition,
    adapter:causalBodyDiscoveryV9Adapter
  })]
]);

export function listCausalBodyDiscoveryModules(){
  return [...implementations.values()].map(x=>({
    id:x.id,capability:x.capability,version:x.definition.version,adapterId:x.adapter.id,hostVersions:[...x.adapter.hostVersions]
  }));
}
export function causalBodyDiscoveryImplementation(id){return implementations.get(String(id||""))||null;}
export function requireCausalBodyDiscoveryImplementation(id){
  const q=causalBodyDiscoveryImplementation(id);if(!q)throw new Error("unknown causal body discovery module "+id);return q;
}
