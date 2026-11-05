import {
  SEMANTIC_SOUND_CAPABILITY,SEMANTIC_SOUND_V1_ID,semanticSoundCortexV1Definition,
  createSemanticSoundCortexV1,semanticSoundParameterCount,zeroSemanticSoundGrad,addSemanticSoundGrad,scaleSemanticSoundGrad,
  applySemanticSoundGrad,learnSemanticSoundEvents,semanticSoundSnapshot
} from "./semantic-sound-cortex-v1.js";
import {
  semanticSoundV9Adapter,createSemanticSoundEpisodeRuntime,semanticSoundHear,semanticSoundPlanSignal,
  semanticSoundOutcome,semanticSoundHigherBias,semanticSoundEpisodeResult
} from "./semantic-sound-v9-adapter.js";

const implementations=new Map([
  [SEMANTIC_SOUND_V1_ID,Object.freeze({
    id:SEMANTIC_SOUND_V1_ID,capability:SEMANTIC_SOUND_CAPABILITY,definition:semanticSoundCortexV1Definition,adapter:semanticSoundV9Adapter,
    driver:Object.freeze({
      createModel:createSemanticSoundCortexV1,parameterCount:semanticSoundParameterCount,zeroGrad:zeroSemanticSoundGrad,addGrad:addSemanticSoundGrad,scaleGrad:scaleSemanticSoundGrad,
      applyGrad:applySemanticSoundGrad,learnEvents:learnSemanticSoundEvents,snapshot:semanticSoundSnapshot,
      createEpisodeRuntime:createSemanticSoundEpisodeRuntime,hear:semanticSoundHear,planSignal:semanticSoundPlanSignal,outcome:semanticSoundOutcome,higherBias:semanticSoundHigherBias,episodeResult:semanticSoundEpisodeResult
    })
  })]
]);

export function listSemanticSoundModules(){return [...implementations.values()].map(x=>({id:x.id,capability:x.capability,version:x.definition.version,adapterId:x.adapter.id,hostVersions:[...x.adapter.hostVersions]}));}
export function semanticSoundImplementation(id){return implementations.get(String(id||""))||null;}
export function semanticSoundImplementationForModel(model){return semanticSoundImplementation(model?.kind);}
export function requireSemanticSoundImplementation(idOrModel){
  const q=typeof idOrModel==="string"?semanticSoundImplementation(idOrModel):semanticSoundImplementationForModel(idOrModel);
  if(!q)throw new Error("unknown semantic sound module "+(typeof idOrModel==="string"?idOrModel:idOrModel?.kind));return q;
}
export function createSemanticSoundModuleModel(id,seed,config){return requireSemanticSoundImplementation(id).driver.createModel(seed,config);}
export function semanticSoundModuleParameterCount(model){return requireSemanticSoundImplementation(model).driver.parameterCount(model);}
export function zeroSemanticSoundModuleGrad(model){return requireSemanticSoundImplementation(model).driver.zeroGrad(model);}
export function addSemanticSoundModuleGrad(model,a,b,s=1){return requireSemanticSoundImplementation(model).driver.addGrad(a,b,s);}
export function scaleSemanticSoundModuleGrad(model,g,s){return requireSemanticSoundImplementation(model).driver.scaleGrad(g,s);}
export function applySemanticSoundModuleGrad(model,g,options){return requireSemanticSoundImplementation(model).driver.applyGrad(model,g,options);}
export function learnSemanticSoundModuleEvents(model,events){return requireSemanticSoundImplementation(model).driver.learnEvents(model,events);}
export function semanticSoundModuleSnapshot(model){return requireSemanticSoundImplementation(model).driver.snapshot(model);}
export function createSemanticSoundModuleEpisode(model,options){return requireSemanticSoundImplementation(model).driver.createEpisodeRuntime(model,options);}
export function semanticSoundModuleHear(model,runtime,input){return requireSemanticSoundImplementation(model).driver.hear(runtime,input);}
export function semanticSoundModulePlanSignal(model,runtime,input){return requireSemanticSoundImplementation(model).driver.planSignal(runtime,input);}
export function semanticSoundModuleOutcome(model,runtime,input){return requireSemanticSoundImplementation(model).driver.outcome(runtime,input);}
export function semanticSoundModuleHigherBias(model,runtime,ego,higherN){return requireSemanticSoundImplementation(model).driver.higherBias(runtime,ego,higherN);}
export function semanticSoundModuleEpisodeResult(model,runtime){return requireSemanticSoundImplementation(model).driver.episodeResult(runtime);}
