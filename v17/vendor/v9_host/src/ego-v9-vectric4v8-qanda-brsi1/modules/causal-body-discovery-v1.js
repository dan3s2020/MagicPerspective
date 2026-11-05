import {createCausalBodyDiscovery,discoverySnapshot,inferredExpectedBodyMass,ownershipWeightedPool,updateCausalBodyDiscovery} from "../same-dish-body-discovery.js";
import {ownershipWeightedHigherPool} from "../same-dish-higher-shadow.js";
import {sameDishMembershipFreePolicyPatch} from "../same-dish-policy-shadow.js";
import {sameDishInferredResourcePlan} from "../same-dish-resource-shadow.js";

export const CAUSAL_BODY_DISCOVERY_CAPABILITY="causal-body-discovery";
export const CAUSAL_BODY_DISCOVERY_V1_ID="causal-body-discovery-v1";

export const causalBodyDiscoveryV1Definition=Object.freeze({
  id:CAUSAL_BODY_DISCOVERY_V1_ID,
  capability:CAUSAL_BODY_DISCOVERY_CAPABILITY,
  version:"1.0.0-shadow",
  activationPolicy:"shadow-only",
  compatibility:Object.freeze({hostVersions:Object.freeze(["v9-vectric4v8-qanda-brsi1"])}),
  state:Object.freeze({schemaVersion:1,ownership:"episode-local",promotion:"shadow-state-must-not-be-silently-promoted"}),
  effectSurface:Object.freeze([
    "SHADOW: observer diagnostics only",
    "ACTIVE candidate: inferred ownership/context only through an explicit host adapter; never hidden membership"
  ]),
  hooks:Object.freeze({
    createState:({input})=>createCausalBodyDiscovery(input||{}),
    observe:({input})=>{
      if(!input?.state)throw new Error("causal body discovery state required");
      return updateCausalBodyDiscovery(input.state,input.observation,input.intervention||{});
    },
    snapshot:({input})=>discoverySnapshot(input?.state),
    expectedBodyMass:({input})=>inferredExpectedBodyMass(input?.snapshot||discoverySnapshot(input?.state)),
    ownershipPool:({input})=>ownershipWeightedPool(input?.states||[],input?.ownership||[]),
    higherPool:({input})=>ownershipWeightedHigherPool(input?.states||[],input?.ownership||[]),
    policyPatch:({input})=>sameDishMembershipFreePolicyPatch(input?.snapshot||discoverySnapshot(input?.state),input?.options||{}),
    resourcePlan:({input})=>sameDishInferredResourcePlan(input?.snapshot||discoverySnapshot(input?.state),input?.config||{},input?.options||{})
  })
});

export function createCausalBodyDiscoveryV1State(options={}){return createCausalBodyDiscovery(options);}
export function causalBodyDiscoveryV1Observe(state,observation,intervention={}){return updateCausalBodyDiscovery(state,observation,intervention);}
export function causalBodyDiscoveryV1Snapshot(state){return discoverySnapshot(state);}
