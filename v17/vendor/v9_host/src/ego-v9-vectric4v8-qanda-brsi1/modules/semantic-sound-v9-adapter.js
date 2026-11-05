import {createModuleAdapter} from "./module-adapter.js";
import {addSemanticSoundGrad,createSemanticSoundLearningTracker,decodeSemanticSound,learnSemanticSoundEvents,semanticCodecGradient,semanticContextForLatent,semanticVocalPolicyGradient,vocalSemanticLatent,zeroSemanticSoundGrad} from "./semantic-sound-cortex-v1.js";

export function createSemanticSoundEpisodeRuntime(model,{mode="shadow",envId=0}={}){
  return{mode:String(mode),model,envId,grad:zeroSemanticSoundGrad(model),events:[],learningTracker:createSemanticSoundLearningTracker(),lastHeard:new Map(),semanticByCell:new Map(),pendingSignals:[],stats:{hearSamples:0,signalPlans:0,signalCredits:0}};
}
function pushEvent(rt,event){const row={...event,envId:rt.envId},cap=Math.max(16,Math.floor(Number(rt.model.config?.eventCap)||256));if(rt.events.length<cap)rt.events.push(row);learnSemanticSoundEvents(rt.model,[row],rt.learningTracker);return row;}
export function semanticSoundHear(rt,{ego,step,real,imag,hidden=[],higher=[],source="external"}){
  if(rt.mode==="off")return{context:new Float64Array(rt.model.semanticN),latent:new Float64Array(rt.model.latentN),matches:[]};
  let energy=0;for(let i=0;i<rt.model.bands;i++)energy+=Math.hypot(Number(real?.[i])||0,Number(imag?.[i])||0);energy/=rt.model.bands;
  if(energy<1e-8)return{context:new Float64Array(rt.model.semanticN),latent:new Float64Array(rt.model.latentN),matches:[]};
  const cg=semanticCodecGradient(rt.model,real,imag);addSemanticSoundGrad(rt.grad,cg.grad);const prior=semanticContextForLatent(rt.model,cg.latent,4);
  if(source!=="self")rt.lastHeard.set(ego,{step:Number(step)||0,latent:Float64Array.from(cg.latent)});rt.stats.hearSamples++;rt.model.stats.heard++;
  pushEvent(rt,{type:source==="self"?"SELF_HEAR":"HEAR",channel:String(ego),ego,step,latent:Array.from(cg.latent),context:Array.from(prior.context),energy});
  const q=semanticContextForLatent(rt.model,cg.latent,4);rt.semanticByCell.set(ego,Float64Array.from(q.context));return{context:q.context,latent:cg.latent,matches:q.matches};
}
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function exploredLatent(rt,base,{ego=0,step=0,training=true}={}){
  const out=Float64Array.from(base),sigma=training?Math.max(0,Number(rt.model.config?.vocalExploration)||0):0;
  if(!(sigma>0))return out;
  let q=0;for(let i=0;i<out.length;i++){const h=mix32((Number(rt.envId)||0)^Math.imul((ego+1)>>>0,0x9e3779b1)^Math.imul((step+1)>>>0,0x85ebca6b)^Math.imul(i+1,0xc2b2ae35)),noise=(h/4294967295)*2-1;out[i]+=sigma*noise;q+=out[i]*out[i];}
  if(q>1e-12){q=Math.sqrt(q);for(let i=0;i<out.length;i++)out[i]/=q;}return out;
}
function finalizeSignalCredit(rt,s){
  if(!s||s.finalized)return false;s.finalized=true;
  const advantage=s.creditWeight?s.credit/s.creditWeight:0;
  if(rt.mode==="active"&&s.training&&Math.abs(advantage)>1e-9){
    const pg=semanticVocalPolicyGradient(rt.model,{hidden:s.hidden,higher:s.higher,semantic:s.semantic,heard:s.heard,composition:s.composition,sampledLatent:s.sampled,advantage});
    addSemanticSoundGrad(rt.grad,pg.grad);rt.stats.signalCredits++;
  }
  pushEvent(rt,{type:"SIGNAL_CREDIT",channel:String(s.ego),ego:s.ego,step:s.creditUntil,reward:advantage,context:[s.credit,s.creditSamples,s.creditWeight],causal:rt.mode==="active"});
  return true;
}
function compositionCandidate(rt){
  const out=new Float64Array(rt.model.latentN),rows=(rt.model.compositions||[]).filter(x=>(Number(x.rewardEMA)||0)>0).sort((a,b)=>(Number(b.rewardEMA)||0)-(Number(a.rewardEMA)||0)).slice(0,4);
  let den=0;for(const row of rows){const w=Math.max(1e-6,Number(row.rewardEMA)||0);den+=w;for(let i=0;i<out.length;i++)out[i]+=w*(Number(row.latent?.[i])||0);}
  if(den)for(let i=0;i<out.length;i++)out[i]/=den;return out;
}
export function semanticSoundPlanSignal(rt,{ego,step,hidden=[],higher=[],training=true,creditWindow=1}){
  const semantic=rt.semanticByCell.get(ego)||new Float64Array(rt.model.semanticN),heardRec=rt.lastHeard.get(ego)||null,window=Math.max(1,Number(rt.model.config?.imitationWindow)||32);
  const heard=heardRec&&Number(step)-Number(heardRec.step)<=window?heardRec.latent:new Float64Array(rt.model.latentN),composition=compositionCandidate(rt);
  const v=vocalSemanticLatent(rt.model,hidden,higher,semantic,heard,composition),z=exploredLatent(rt,v.z,{ego,step,training}),decoded=decodeSemanticSound(rt.model,z),cw=Math.max(1,Math.floor(Number(creditWindow)||1));
  rt.pendingSignals.push({ego,step:Number(step)||0,creditUntil:(Number(step)||0)+cw,training:Boolean(training),sampled:Array.from(z),base:Array.from(v.z),hidden:Array.from(hidden),higher:Array.from(higher),semantic:Array.from(semantic),heard:Array.from(heard),composition:Array.from(composition),credit:0,creditSamples:0,creditWeight:0,finalized:false});
  rt.stats.signalPlans++;rt.model.stats.signals++;
  pushEvent(rt,{type:rt.mode==="active"?"SIGNAL":"PROPOSED_SIGNAL",channel:String(ego),ego,step,latent:Array.from(z),context:Array.from(semantic),causal:rt.mode==="active"});
  return{latent:z,frames:decoded.frames};
}
export function semanticSoundOutcome(rt,{ego,step,reward=0,progress=0,groupDelta=0,accepted=false,action=0,actual=null,movedCount=0}){
  if(rt.mode==="off")return;
  const now=Number(step)||0;
  for(const s of rt.pendingSignals){
    if(s.finalized||now<s.step)continue;
    if(now<=s.creditUntil){const span=Math.max(1,s.creditUntil-s.step),age=Math.max(0,now-s.step),w=Math.max(.1,1-age/(span+1)),delta=(Number(groupDelta)||0)+(s.ego===ego ? .25*(Number(reward)||0) : 0);s.credit+=w*delta;s.creditWeight+=w;s.creditSamples++;}
    if(now>=s.creditUntil)finalizeSignalCredit(rt,s);
  }
  const a=Math.max(0,Math.min(8,Math.floor(Number(action)||0))),oneHot=Array.from({length:9},(_,i)=>i===a?1:0),context=[Number(progress)||0,Number(groupDelta)||0,accepted?1:0,Math.tanh((Number(movedCount)||0)/4),Number(actual?.dx)||0,Number(actual?.dy)||0,Number(actual?.dz)||0,...oneHot];
  pushEvent(rt,{type:"OUTCOME",channel:String(ego),ego,step,reward:Number(reward)||0,context,action:a});
}
export function semanticSoundHigherBias(rt,ego,higherN){
  const semantic=rt.semanticByCell.get(ego),out=new Float64Array(higherN);if(!semantic)return out;for(let i=0;i<out.length;i++)out[i]=Math.tanh(semantic[i%semantic.length]||0);return out;
}
export function semanticSoundEpisodeResult(rt){for(const s of rt.pendingSignals)if(!s.finalized)finalizeSignalCredit(rt,s);return{gradient:rt.grad,events:rt.events,stats:{...rt.stats}};}
export const semanticSoundV9Adapter=createModuleAdapter({
  id:"semantic-sound-v9-adapter-v1",moduleId:"semantic-sound-cortex-v1",hostVersions:["v9-vectric4v8-qanda-brsi1"],
  hooks:{
    createRuntime:({input,mode})=>createSemanticSoundEpisodeRuntime(input.model,{mode,envId:input.envId}),
    hear:({input})=>semanticSoundHear(input.runtime,input),
    planSignal:({input})=>semanticSoundPlanSignal(input.runtime,input),
    outcome:({input})=>semanticSoundOutcome(input.runtime,input),
    higherBias:({input})=>semanticSoundHigherBias(input.runtime,input.ego,input.higherN),
    episodeResult:({input})=>semanticSoundEpisodeResult(input.runtime)
  }
});
