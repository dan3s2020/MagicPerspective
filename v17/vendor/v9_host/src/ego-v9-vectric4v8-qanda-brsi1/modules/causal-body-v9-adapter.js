import {createModuleAdapter} from "./module-adapter.js";
import {CAUSAL_BODY_DISCOVERY_V1_ID} from "./causal-body-discovery-v1.js";

export const causalBodyDiscoveryV9Adapter=createModuleAdapter({
  id:"causal-body-discovery-v9-adapter-v1",
  moduleId:CAUSAL_BODY_DISCOVERY_V1_ID,
  hostVersions:["v9-vectric4v8-qanda-brsi1"],
  hooks:{
    createState:({module,input})=>module.hooks.createState({module,input}),
    observe:({module,input})=>module.hooks.observe({module,input}),
    snapshot:({module,input})=>module.hooks.snapshot({module,input}),
    expectedBodyMass:({module,input})=>module.hooks.expectedBodyMass({module,input}),
    ownershipPool:({module,input})=>module.hooks.ownershipPool({module,input}),
    higherPool:({module,input})=>module.hooks.higherPool({module,input}),
    policyPatch:({module,input})=>module.hooks.policyPatch({module,input}),
    resourcePlan:({module,input})=>module.hooks.resourcePlan({module,input})
  }
});
