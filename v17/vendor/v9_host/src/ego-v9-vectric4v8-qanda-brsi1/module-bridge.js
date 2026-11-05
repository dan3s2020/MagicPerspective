import { createV9Vectric4v8QandaBrsi1RouterAdapter } from "../modules/sim-wifi-router/index.js";
import { createV9Vectric4v8QandaBrsi1VramComputeAdapter } from "../modules/vram-compute/index.js";
import { listSemanticSoundModules } from "./modules/semantic-sound-registry.js";
import { listCausalBodyDiscoveryModules } from "./modules/causal-body-registry.js";

export const V9_HOST_VERSION="v9-vectric4v8-qanda-brsi1";

export function createV9ModuleBindings({routerMaxPayloadBytes=1024}={}){
  const simWifi=createV9Vectric4v8QandaBrsi1RouterAdapter({maxPayloadBytes:routerMaxPayloadBytes});
  const vramCompute=createV9Vectric4v8QandaBrsi1VramComputeAdapter();
  return Object.freeze({
    hostVersion:V9_HOST_VERSION,
    communications:Object.freeze({simWifi}),
    compute:Object.freeze({vramCompute}),
    learning:Object.freeze({semanticSound:listSemanticSoundModules(),causalBodyDiscovery:listCausalBodyDiscoveryModules()})
  });
}

export function v9ModuleManifest(options={}){
  const b=createV9ModuleBindings(options);
  return Object.freeze({
    version:1,
    hostVersion:b.hostVersion,
    categories:Object.freeze({
      communications:Object.freeze([{id:"sim-wifi-router",adapter:b.communications.simWifi.name,compatibleVersions:[...b.communications.simWifi.compatibleVersions]}]),
      compute:Object.freeze([{id:"vram-compute",adapter:b.compute.vramCompute.name,compatibleVersions:[...b.compute.vramCompute.compatibleVersions]}]),
      learning:Object.freeze([
        ...b.learning.semanticSound.map(x=>Object.freeze({...x})),
        ...b.learning.causalBodyDiscovery.map(x=>Object.freeze({...x}))
      ])
    })
  });
}
