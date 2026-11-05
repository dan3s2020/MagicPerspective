import {createConceptFlowState,mergeConceptFlowStates,conceptFlowSnapshot} from "./concept-flow-2d.js";
const EPS=1e-12;
const f32=x=>Math.fround(Number.isFinite(Number(x))?Number(x):0);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):0));

function hash32(s){
  let h=0x811c9dc5;
  for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}
  return h>>>0;
}
function prng(seed){
  let s=(Number(seed)>>>0)||1;
  return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
}
function init2(seed,scale=.45){const r=prng(seed);return[f32((r()*2-1)*scale),f32((r()*2-1)*scale)];}
function initArray(n,seed,scale=.12){const r=prng(seed),a=new Array(n);for(let i=0;i<n;i++)a[i]=f32((r()*2-1)*scale);return a;}
function tanh2(a,b){return[f32(Math.tanh(a)),f32(Math.tanh(b))];}
function copyModel(m){return structuredClone(m);}

export const CONCEPT_WORLD_SCHEMA="octopus-2d-everything-concept-v1";

export function createConceptWorldModel({seed=1,sourceObsN,actionN,id="A"}={}){
  const n=Math.max(1,Math.floor(Number(sourceObsN)||1)),actions=Math.max(1,Math.floor(Number(actionN)||1)),base=Number(seed)>>>0;
  return{
    schema:CONCEPT_WORLD_SCHEMA,seed:base,id:String(id||"A"),sourceObsN:n,actionN:actions,step:0,sparseEpsilon:1e-7,
    flow:createConceptFlowState(null,String(id||"A")),
    root:init2(hash32(base+":root"),.35),
    scalarBasis:init2(hash32(base+":scalar"),.35),
    featureAtoms:Array.from({length:n},(_,i)=>init2(hash32(base+":feature:"+i),.35)),
    actionAtoms:Array.from({length:actions},(_,i)=>init2(hash32(base+":action:"+i),.35)),
    composer:{W:initArray(8,hash32(base+":compose:W"),.18),b:initArray(2,hash32(base+":compose:b"),.03)},
    transition:{W:initArray(8,hash32(base+":transition:W"),.18),b:initArray(2,hash32(base+":transition:b"),.03)},
    decoder:{W:initArray(n*2,hash32(base+":decoder:W"),.05),b:new Array(n).fill(0)},
    stats:{records:0,lastLoss:null,reconstructionMse:null,transitionMse:null,coordinateNorm:null,meanPairDistance:null}
  };
}

function slotForward(model,i,value){
  const atom=model.featureAtoms[i]||[0,0],v=clamp(value,-4,4),pre0=atom[0]+model.scalarBasis[0]*v,pre1=atom[1]+model.scalarBasis[1]*v;
  const out=tanh2(pre0,pre1);
  return{out,cache:{i,v,atom:[atom[0],atom[1]],pre:[pre0,pre1],out}};
}
function composeForward(model,left,right){
  const x=[left[0],left[1],right[0],right[1]],W=model.composer.W,b=model.composer.b;
  const p0=b[0]+W[0]*x[0]+W[1]*x[1]+W[2]*x[2]+W[3]*x[3];
  const p1=b[1]+W[4]*x[0]+W[5]*x[1]+W[6]*x[2]+W[7]*x[3];
  const out=tanh2(p0,p1);
  return{out,cache:{x,out}};
}
export function encodeEverythingConcept(model,rawObservation,{capture=false}={}){
  const n=Math.min(model.sourceObsN,rawObservation?.length||0);
  let z=[f32(model.root[0]),f32(model.root[1])],steps=[];
  const eps=Math.max(0,Number(model.sparseEpsilon)||0);
  for(let i=0;i<n;i++){
    const value=Number(rawObservation[i])||0;
    // Zero is the default/absence concept carried by the shared root/decoder
    // bias. Only observed deviations are composed, so disabled/absent sensor
    // channels do not waste recursive depth or CPU.
    if(Math.abs(value)<=eps)continue;
    const slot=slotForward(model,i,value),comp=composeForward(model,z,slot.out);
    if(capture)steps.push({slot:slot.cache,compose:comp.cache});
    z=comp.out;
  }
  return capture?{coord:Float32Array.of(z[0],z[1]),cache:{steps}}:Float32Array.of(z[0],z[1]);
}
export function actionConcept(model,action){
  const i=Math.max(0,Math.min(model.actionN-1,Math.floor(Number(action)||0))),a=model.actionAtoms[i]||[0,0];
  return Float32Array.of(f32(a[0]),f32(a[1]));
}
export function applyConceptObservation(model,rawObservation,{conceptOnly=true,prevAction=0}={}){
  const base=encodeEverythingConcept(model,rawObservation),a=actionConcept(model,prevAction),q=composeForward(model,base,a),z=Float32Array.of(q.out[0],q.out[1]),out=new Float64Array(model.sourceObsN+2);
  if(!conceptOnly)for(let i=0;i<Math.min(model.sourceObsN,rawObservation.length);i++)out[i]=Number(rawObservation[i])||0;
  out[model.sourceObsN]=z[0];out[model.sourceObsN+1]=z[1];
  return{obs:out,coord:z};
}
function transitionForward(model,z,a){
  const x=[z[0],z[1],a[0],a[1]],W=model.transition.W,b=model.transition.b;
  const p0=b[0]+W[0]*x[0]+W[1]*x[1]+W[2]*x[2]+W[3]*x[3],p1=b[1]+W[4]*x[0]+W[5]*x[1]+W[6]*x[2]+W[7]*x[3];
  const out=tanh2(p0,p1);return{out,cache:{x,out}};
}
function decoderForward(model,z){
  const y=new Array(model.sourceObsN),W=model.decoder.W,b=model.decoder.b;
  for(let i=0;i<y.length;i++)y[i]=Math.tanh(b[i]+W[i*2]*z[0]+W[i*2+1]*z[1]);
  return y;
}
function zerosLikeModel(m){
  return{
    root:[0,0],scalarBasis:[0,0],
    featureAtoms:Array.from({length:m.sourceObsN},()=>[0,0]),
    actionAtoms:Array.from({length:m.actionN},()=>[0,0]),
    composer:{W:new Array(8).fill(0),b:[0,0]},
    transition:{W:new Array(8).fill(0),b:[0,0]},
    decoder:{W:new Array(m.sourceObsN*2).fill(0),b:new Array(m.sourceObsN).fill(0)}
  };
}
function backCompose(model,cache,dout,g){
  const W=model.composer.W,x=cache.x,o=cache.out,d0=dout[0]*(1-o[0]*o[0]),d1=dout[1]*(1-o[1]*o[1]);
  g.composer.b[0]+=d0;g.composer.b[1]+=d1;
  for(let i=0;i<4;i++){g.composer.W[i]+=d0*x[i];g.composer.W[4+i]+=d1*x[i];}
  return[
    d0*W[0]+d1*W[4],
    d0*W[1]+d1*W[5],
    d0*W[2]+d1*W[6],
    d0*W[3]+d1*W[7]
  ];
}
function backEncode(model,cache,dz,g){
  let d=[dz[0],dz[1]];
  for(let k=cache.steps.length-1;k>=0;k--){
    const step=cache.steps[k],dx=backCompose(model,step.compose,d,g),slot=step.slot,o=slot.out;
    const ds0=dx[2]*(1-o[0]*o[0]),ds1=dx[3]*(1-o[1]*o[1]);
    g.featureAtoms[slot.i][0]+=ds0;g.featureAtoms[slot.i][1]+=ds1;
    g.scalarBasis[0]+=ds0*slot.v;g.scalarBasis[1]+=ds1*slot.v;
    d=[dx[0],dx[1]];
  }
  g.root[0]+=d[0];g.root[1]+=d[1];
}
function gradNorm(g){
  let q=0;
  const add=a=>{for(const x of a)q+=x*x;};
  add(g.root);add(g.scalarBasis);for(const a of g.featureAtoms)add(a);for(const a of g.actionAtoms)add(a);
  add(g.composer.W);add(g.composer.b);add(g.transition.W);add(g.transition.b);add(g.decoder.W);add(g.decoder.b);
  return Math.sqrt(q);
}
function applyGrad(model,g,lr,maxNorm){
  const n=gradNorm(g),scale=Math.min(1,Math.max(.01,Number(maxNorm)||3)/Math.max(EPS,n)),step=(arr,ga,limit=3)=>{for(let i=0;i<arr.length;i++)arr[i]=f32(clamp(arr[i]-lr*scale*ga[i],-limit,limit));};
  step(model.root,g.root,1);step(model.scalarBasis,g.scalarBasis,1);
  for(let i=0;i<model.featureAtoms.length;i++)step(model.featureAtoms[i],g.featureAtoms[i],1);
  for(let i=0;i<model.actionAtoms.length;i++)step(model.actionAtoms[i],g.actionAtoms[i],1);
  step(model.composer.W,g.composer.W,2);step(model.composer.b,g.composer.b,2);step(model.transition.W,g.transition.W,2);step(model.transition.b,g.transition.b,2);step(model.decoder.W,g.decoder.W,2);step(model.decoder.b,g.decoder.b,2);
  model.step++;return n;
}

export function trainConceptWorld(model,records,{learningRate=.0015,reconstructionCoef=.35,transitionCoef=1,maxGradNorm=3,maxRecords=128}={}){
  const rows=(records||[]).filter(r=>r?.obs?.length&&r?.nextObs?.length).slice(0,Math.max(1,Math.floor(Number(maxRecords)||128)));
  if(!rows.length)return{records:0,loss:0,reconstructionMse:0,transitionMse:0,gradNorm:0};
  const g=zerosLikeModel(model);let recon=0,trans=0,count=0;
  for(const r of rows){
    const cur=encodeEverythingConcept(model,r.obs,{capture:true}),next=encodeEverythingConcept(model,r.nextObs,{capture:false}),act=actionConcept(model,r.action),pred=transitionForward(model,cur.coord,act),dec=decoderForward(model,cur.coord);
    const dz=[0,0];
    for(let i=0;i<model.sourceObsN;i++){
      const target=clamp(r.obs[i],-1,1),e=dec[i]-target;recon+=e*e/model.sourceObsN;
      const dp=reconstructionCoef*2*e/model.sourceObsN*(1-dec[i]*dec[i]),w0=model.decoder.W[i*2],w1=model.decoder.W[i*2+1];
      g.decoder.b[i]+=dp;g.decoder.W[i*2]+=dp*cur.coord[0];g.decoder.W[i*2+1]+=dp*cur.coord[1];dz[0]+=dp*w0;dz[1]+=dp*w1;
    }
    const dt=[0,0];
    for(let j=0;j<2;j++){const e=pred.out[j]-next[j];trans+=.5*e*e;dt[j]=transitionCoef*e*(1-pred.out[j]*pred.out[j]);g.transition.b[j]+=dt[j];}
    const x=pred.cache.x,W=model.transition.W;
    for(let i=0;i<4;i++){g.transition.W[i]+=dt[0]*x[i];g.transition.W[4+i]+=dt[1]*x[i];}
    dz[0]+=dt[0]*W[0]+dt[1]*W[4];dz[1]+=dt[0]*W[1]+dt[1]*W[5];
    const da0=dt[0]*W[2]+dt[1]*W[6],da1=dt[0]*W[3]+dt[1]*W[7],ai=Math.max(0,Math.min(model.actionN-1,Math.floor(Number(r.action)||0)));
    g.actionAtoms[ai][0]+=da0;g.actionAtoms[ai][1]+=da1;
    backEncode(model,cur.cache,dz,g);count++;
  }
  const inv=1/Math.max(1,count);
  const scaleArr=a=>{for(let i=0;i<a.length;i++)a[i]*=inv;};
  scaleArr(g.root);scaleArr(g.scalarBasis);for(const a of g.featureAtoms)scaleArr(a);for(const a of g.actionAtoms)scaleArr(a);scaleArr(g.composer.W);scaleArr(g.composer.b);scaleArr(g.transition.W);scaleArr(g.transition.b);scaleArr(g.decoder.W);scaleArr(g.decoder.b);
  const gn=applyGrad(model,g,Number(learningRate)||.0015,maxGradNorm);
  const rm=recon/count,tm=trans/count,loss=reconstructionCoef*rm+transitionCoef*tm;
  model.stats.records=(Number(model.stats.records)||0)+count;model.stats.lastLoss=loss;model.stats.reconstructionMse=rm;model.stats.transitionMse=tm;
  return{records:count,loss,reconstructionMse:rm,transitionMse:tm,gradNorm:gn};
}

function vectorDistance(a,b){return Math.hypot(Number(a?.[0]||0)-Number(b?.[0]||0),Number(a?.[1]||0)-Number(b?.[1]||0));}
export function conceptWorldSnapshot(model,samples=[]){
  const coords=(samples||[]).slice(0,32).map(x=>Array.from(encodeEverythingConcept(model,x)));
  let d=0,n=0;for(let i=0;i<coords.length;i++)for(let j=i+1;j<coords.length;j++){d+=vectorDistance(coords[i],coords[j]);n++;}
  const norms=coords.map(z=>Math.hypot(z[0],z[1]));
  return{
    schema:CONCEPT_WORLD_SCHEMA,coordinateType:"2 x IEEE-754 float32",sourceObsN:model.sourceObsN,actionN:model.actionN,step:model.step,
    noCompositeLookupTable:true,conceptOnlyRecommended:true,sparseComposition:true,sparseEpsilon:Number(model.sparseEpsilon)||0,
    stats:{...model.stats,coordinateNorm:norms.length?norms.reduce((a,b)=>a+b,0)/norms.length:null,meanPairDistance:n?d/n:null},
    composer:{kind:"shared recursive 2+2→2 tanh",parameterCount:model.composer.W.length+model.composer.b.length},
    primitiveConcepts:{featureAtoms:model.featureAtoms.length,actionAtoms:model.actionAtoms.length,scalarBasis:1},
    flow:conceptFlowSnapshot(createConceptFlowState(model.flow,model.id||"A"))
  };
}
function weighted(dst,src,w){
  const add=(a,b)=>{for(let i=0;i<a.length;i++)a[i]+=Number(b[i]||0)*w;};
  add(dst.root,src.root);add(dst.scalarBasis,src.scalarBasis);for(let i=0;i<dst.featureAtoms.length;i++)add(dst.featureAtoms[i],src.featureAtoms[i]);for(let i=0;i<dst.actionAtoms.length;i++)add(dst.actionAtoms[i],src.actionAtoms[i]);add(dst.composer.W,src.composer.W);add(dst.composer.b,src.composer.b);add(dst.transition.W,src.transition.W);add(dst.transition.b,src.transition.b);add(dst.decoder.W,src.decoder.W);add(dst.decoder.b,src.decoder.b);
}
export function averageConceptWorldModels(base,rows=[]){
  const valid=(rows||[]).filter(x=>x?.model?.schema===CONCEPT_WORLD_SCHEMA);if(!valid.length)return base;
  const out=copyModel(base),zero=zerosLikeModel(base);out.root=zero.root;out.scalarBasis=zero.scalarBasis;out.featureAtoms=zero.featureAtoms;out.actionAtoms=zero.actionAtoms;out.composer=zero.composer;out.transition=zero.transition;out.decoder=zero.decoder;
  let total=0;for(const r of valid){const w=Math.max(1,Number(r.weight)||1);weighted(out,r.model,w);total+=w;}
  const inv=1/Math.max(1,total),scale=a=>{for(let i=0;i<a.length;i++)a[i]=f32(a[i]*inv);};
  scale(out.root);scale(out.scalarBasis);for(const a of out.featureAtoms)scale(a);for(const a of out.actionAtoms)scale(a);scale(out.composer.W);scale(out.composer.b);scale(out.transition.W);scale(out.transition.b);scale(out.decoder.W);scale(out.decoder.b);
  out.step=Math.max(...valid.map(x=>Number(x.model.step)||0));out.stats=structuredClone(valid.at(-1).model.stats||base.stats);
  out.id=String(base.id||valid.at(-1).model.id||"A");
  out.flow=mergeConceptFlowStates(createConceptFlowState(base.flow,out.id),valid.map(x=>createConceptFlowState(x.model.flow,out.id)));
  return out;
}
