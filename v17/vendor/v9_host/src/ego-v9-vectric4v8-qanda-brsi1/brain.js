import { ACTION_N, AGENCY_N, BODY_OBS_N, IDENTITY_TRACK_COUNT, NET, WORLD_OBS_N } from "./config.js";
import { clamp, entropy, sigmoid, softmax, unit2 } from "./math.js";

function randn(rng) { return rng.normal(); }
function initDense(outN,inN,rng,scale=Math.sqrt(2/(inN+outN))) {
  const W=new Float64Array(outN*inN), b=new Float64Array(outN);
  for (let i=0;i<W.length;i++) W[i]=randn(rng)*scale;
  return {W,b,outN,inN};
}
function initGRU(inputN,stateN,rng) {
  const n=inputN+stateN;
  return {
    inputN,stateN,
    Wz:initDense(stateN,n,rng,Math.sqrt(1/n)),
    Wr:initDense(stateN,n,rng,Math.sqrt(1/n)),
    Wh:initDense(stateN,n,rng,Math.sqrt(1/n))
  };
}
function zerosDense(p){return {W:new Float64Array(p.W.length),b:new Float64Array(p.b.length),outN:p.outN,inN:p.inN};}
function zerosGRU(g){return {inputN:g.inputN,stateN:g.stateN,Wz:zerosDense(g.Wz),Wr:zerosDense(g.Wr),Wh:zerosDense(g.Wh)};}

export function createLocalBrain(rng) {
  const body=initDense(NET.bodyHidden,BODY_OBS_N,rng);
  const world=initDense(NET.worldHidden,WORLD_OBS_N,rng);
  const gruInput=NET.bodyHidden+NET.worldHidden+ACTION_N+1+3;
  const gru=initGRU(gruInput,NET.selfHidden,rng);
  const repN=NET.bodyHidden+NET.worldHidden+NET.selfHidden+NET.higherContext;
  const actor=initDense(ACTION_N,repN,rng,Math.sqrt(1/repN));
  const critic=initDense(1,repN,rng,Math.sqrt(1/repN));
  const ownIn=repN+ACTION_N+1;
  const ownPred=initDense(BODY_OBS_N,ownIn,rng,Math.sqrt(1/ownIn));
  const worldPred=initDense(WORLD_OBS_N,repN,rng,Math.sqrt(1/repN));
  const agency=initDense(AGENCY_N,ownIn,rng,Math.sqrt(1/ownIn));
  return {version:1,body,world,gru,actor,critic,ownPred,worldPred,agency};
}

export function zeroLocalGrad(model) {
  return {
    body:zerosDense(model.body),world:zerosDense(model.world),gru:zerosGRU(model.gru),
    actor:zerosDense(model.actor),critic:zerosDense(model.critic),
    ownPred:zerosDense(model.ownPred),worldPred:zerosDense(model.worldPred),agency:zerosDense(model.agency)
  };
}

function denseForward(p,x,act="linear") {
  const pre=new Float64Array(p.outN), y=new Float64Array(p.outN);
  for (let o=0;o<p.outN;o++) {
    let s=p.b[o], row=o*p.inN;
    for (let i=0;i<p.inN;i++) s+=p.W[row+i]*x[i];
    pre[o]=s;
    y[o]=act==="tanh"?Math.tanh(s):s;
  }
  return {x,pre,y,act};
}
export function denseBackward(p,g,cache,dy) {
  const dx=new Float64Array(p.inN);
  for (let o=0;o<p.outN;o++) {
    let d=dy[o];
    if (cache.act==="tanh") d*=1-cache.y[o]*cache.y[o];
    g.b[o]+=d;
    const row=o*p.inN;
    for (let i=0;i<p.inN;i++) { g.W[row+i]+=d*cache.x[i]; dx[i]+=p.W[row+i]*d; }
  }
  return dx;
}
function concat(...parts) {
  let n=0; for (const p of parts) n+=p.length;
  const out=new Float64Array(n); let k=0;
  for (const p of parts) { out.set(p,k); k+=p.length; }
  return out;
}
function oneHot(i,n=ACTION_N) { const a=new Float64Array(n); if(i>=0&&i<n)a[i]=1; return a; }

function gruForward(g,x,hPrev) {
  const base=concat(x,hPrev);
  const zc=denseForward(g.Wz,base), rc=denseForward(g.Wr,base);
  const z=new Float64Array(g.stateN), r=new Float64Array(g.stateN);
  for(let i=0;i<g.stateN;i++){z[i]=sigmoid(zc.y[i]);r[i]=sigmoid(rc.y[i]);}
  const rh=new Float64Array(g.stateN);
  for(let i=0;i<g.stateN;i++)rh[i]=r[i]*hPrev[i];
  const hc=denseForward(g.Wh,concat(x,rh));
  const hHat=new Float64Array(g.stateN), h=new Float64Array(g.stateN);
  for(let i=0;i<g.stateN;i++){hHat[i]=Math.tanh(hc.y[i]);h[i]=(1-z[i])*hPrev[i]+z[i]*hHat[i];}
  return {h,x,hPrev,base,zc,rc,z,r,rh,hc,hHat};
}

export function gruBackward(g,gg,c,dh) {
  const n=g.stateN, dx=new Float64Array(g.inputN), dhPrev=new Float64Array(n);
  const dz=new Float64Array(n), dhHat=new Float64Array(n);
  for(let i=0;i<n;i++){
    dhPrev[i]+=dh[i]*(1-c.z[i]);
    dz[i]=dh[i]*(c.hHat[i]-c.hPrev[i]);
    dhHat[i]=dh[i]*c.z[i];
  }
  const daHat=new Float64Array(n);
  for(let i=0;i<n;i++) daHat[i]=dhHat[i]*(1-c.hHat[i]*c.hHat[i]);
  const dq=denseBackward(g.Wh,gg.Wh,c.hc,daHat);
  for(let i=0;i<g.inputN;i++) dx[i]+=dq[i];
  const dr=new Float64Array(n);
  for(let i=0;i<n;i++){const q=dq[g.inputN+i];dr[i]+=q*c.hPrev[i];dhPrev[i]+=q*c.r[i];}
  const daR=new Float64Array(n);
  for(let i=0;i<n;i++)daR[i]=dr[i]*c.r[i]*(1-c.r[i]);
  const dbaseR=denseBackward(g.Wr,gg.Wr,c.rc,daR);
  const daZ=new Float64Array(n);
  for(let i=0;i<n;i++)daZ[i]=dz[i]*c.z[i]*(1-c.z[i]);
  const dbaseZ=denseBackward(g.Wz,gg.Wz,c.zc,daZ);
  for(let i=0;i<g.inputN;i++)dx[i]+=dbaseR[i]+dbaseZ[i];
  for(let i=0;i<n;i++)dhPrev[i]+=dbaseR[g.inputN+i]+dbaseZ[g.inputN+i];
  return {dx,dhPrev};
}

export function forwardCore(model, obs, hPrev, higherContext=null, prevAction=0, prevReward=0, prevMismatch=[0,0,0], options={}) {
  const bodyObs=obs.slice(0,BODY_OBS_N), worldObs=obs.slice(BODY_OBS_N);
  const bc=denseForward(model.body,bodyObs,"tanh"), wc=denseForward(model.world,worldObs,"tanh");
  const prevA=oneHot(prevAction);
  const coreX=concat(bc.y,wc.y,prevA,Float64Array.of(Math.tanh(prevReward*0.25)),Float64Array.of(prevMismatch[0]||0,prevMismatch[1]||0,prevMismatch[2]||0));
  const gc=gruForward(model.gru,coreX,hPrev);
  const hc=higherContext && higherContext.length===NET.higherContext?higherContext:new Float64Array(NET.higherContext);
  const policySelf=options.zeroSelfForPolicy?new Float64Array(NET.selfHidden):gc.h;
  const rep=concat(bc.y,wc.y,policySelf,hc);
  return {rep,hidden:gc.h,cache:{bc,wc,gc,rep,higherContext:hc}};
}

export function forwardLocal(model, obs, hPrev, higherContext=null, prevAction=0, prevReward=0, prevMismatch=[0,0,0], options={}) {
  const core=forwardCore(model,obs,hPrev,higherContext,prevAction,prevReward,prevMismatch,options);
  const ac=denseForward(model.actor,core.rep), cc=denseForward(model.critic,core.rep);
  const policyLogits=Float64Array.from(ac.y),bias=options.actionBias,actionMask=options.actionMask;
  if(bias)for(let i=0;i<Math.min(policyLogits.length,bias.length);i++)policyLogits[i]+=Number(bias[i])||0;
  if(actionMask)for(let i=0;i<policyLogits.length;i++)if(!actionMask[i])policyLogits[i]=-1e9;
  const probs=softmax(policyLogits);
  return {logits:policyLogits,baseLogits:ac.y,probs,value:cc.y[0],hidden:core.hidden,entropy:entropy(probs),cache:{...core.cache,ac,cc}};
}
export function auxForward(model, rep, action, confidence) {
  const ai=concat(rep,oneHot(action),Float64Array.of(confidence));
  const own=denseForward(model.ownPred,ai);
  const world=denseForward(model.worldPred,rep);
  const agency=denseForward(model.agency,ai);
  return {ai,own,world,agency};
}

export function addSlice(dst,src,off,n){for(let i=0;i<n;i++)dst[i]+=src[off+i];}

export function trainLocalSequence(model, records, cfg, options={}) {
  const grad=zeroLocalGrad(model);
  if(!records.length)return {grad,metrics:{loss:0,actor:0,value:0,entropy:0,own:0,world:0,agency:0,continuity:0,steps:0}};
  const caches=[];
  const rlEnabled=cfg.rlEnabled!==false;
  let h=Float64Array.from(records[0].hiddenBefore||new Float64Array(NET.selfHidden));
  const m={loss:0,actor:0,value:0,entropy:0,own:0,world:0,agency:0,continuity:0,steps:records.length};
  const lossWeights=options?.lossWeights||null;
  const lossWeight=(i)=>lossWeights?Number(lossWeights[i]??0):1;

  for(const r of records){
    const f=forwardLocal(model,r.obs,h,r.higherContext,r.prevAction,r.prevReward,r.prevMismatch,{actionBias:r.specialistBias||null,actionMask:r.actionMask||null});
    const aux=auxForward(model,f.cache.rep,r.action,r.confidence);
    caches.push({r,f,aux,hPrev:h});
    h=f.hidden;
  }

  let dhFuture=new Float64Array(NET.selfHidden);
  const tbptt=Math.max(1,Math.floor(Number(cfg.tbpttSteps)||caches.length));
  for(let t=caches.length-1;t>=0;t--){
    // Truncate recurrent gradients between fixed local-decision chunks while
    // keeping the forward hidden trajectory intact.
    if(t<caches.length-1 && ((t+1)%tbptt)===0) dhFuture.fill(0);
    const {r,f,aux,hPrev}=caches[t], repN=f.cache.rep.length, lw=lossWeight(t);
    const dRep=new Float64Array(repN);
    if(rlEnabled){
      const adv=Number(r.advantage)||0, ret=Number(r.return)||0;
      const p=Math.max(1e-12,f.probs[r.action]);
      m.actor+=-adv*Math.log(p);
      m.value+=0.5*(f.value-ret)*(f.value-ret);
      m.entropy+=f.entropy;

      const dLogits=new Float64Array(ACTION_N);
      for(let j=0;j<ACTION_N;j++){
        dLogits[j]=lw*(-adv*((j===r.action?1:0)-f.probs[j]));
        if(cfg.entropyCoef) dLogits[j]+=lw*cfg.entropyCoef*f.probs[j]*(Math.log(Math.max(1e-12,f.probs[j]))+f.entropy);
      }
      addSlice(dRep,denseBackward(model.actor,grad.actor,f.cache.ac,dLogits),0,repN);

      const dValue=Float64Array.of(lw*cfg.valueCoef*(f.value-ret));
      addSlice(dRep,denseBackward(model.critic,grad.critic,f.cache.cc,dValue),0,repN);
    }

    const ownTarget=r.nextObs.slice(0,BODY_OBS_N), worldTarget=r.nextObs.slice(BODY_OBS_N);
    const dOwn=new Float64Array(BODY_OBS_N);
    for(let i=0;i<dOwn.length;i++){const e=aux.own.y[i]-ownTarget[i];m.own+=e*e/dOwn.length;dOwn[i]=lw*cfg.ownPredictCoef*2*e/dOwn.length;}
    const dAiOwn=denseBackward(model.ownPred,grad.ownPred,aux.own,dOwn);
    addSlice(dRep,dAiOwn,0,repN);

    const dWorld=new Float64Array(WORLD_OBS_N);
    for(let i=0;i<dWorld.length;i++){const e=aux.world.y[i]-worldTarget[i];m.world+=e*e/dWorld.length;dWorld[i]=lw*cfg.worldPredictCoef*2*e/dWorld.length;}
    addSlice(dRep,denseBackward(model.worldPred,grad.worldPred,aux.world,dWorld),0,repN);

    const agencyTarget=r.agencyTarget||[0,0,0,0],identityAgencyActive=r.identityAgencyActive===true,dAg=new Float64Array(AGENCY_N),agencyN=4+(identityAgencyActive?IDENTITY_TRACK_COUNT:0);
    for(let i=0;i<4;i++){const target=Number(agencyTarget[i])||0,e=aux.agency.y[i]-target;m.agency+=e*e/agencyN;dAg[i]=lw*cfg.agencyCoef*2*e/agencyN;}
    if(identityAgencyActive)for(let i=0;i<IDENTITY_TRACK_COUNT;i++){const j=4+i,target=Number.isFinite(Number(agencyTarget[j]))?Number(agencyTarget[j]):.5,e=aux.agency.y[j]-target;m.agency+=e*e/agencyN;dAg[j]=lw*cfg.agencyCoef*2*e/agencyN;}
    const dAiAg=denseBackward(model.agency,grad.agency,aux.agency,dAg);
    addSlice(dRep,dAiAg,0,repN);

    const b0=0,w0=NET.bodyHidden,h0=NET.bodyHidden+NET.worldHidden;
    const dBody=new Float64Array(NET.bodyHidden), dWorldH=new Float64Array(NET.worldHidden), dh=new Float64Array(NET.selfHidden);
    addSlice(dBody,dRep,b0,NET.bodyHidden); addSlice(dWorldH,dRep,w0,NET.worldHidden); addSlice(dh,dRep,h0,NET.selfHidden);
    for(let i=0;i<dh.length;i++)dh[i]+=dhFuture[i];

    if(cfg.continuityCoef){
      for(let i=0;i<dh.length;i++){
        const e=f.hidden[i]-hPrev[i];
        m.continuity+=e*e/dh.length;
        dh[i]+=lw*cfg.continuityCoef*2*e/dh.length;
      }
    }

    const gb=gruBackward(model.gru,grad.gru,f.cache.gc,dh);
    addSlice(dBody,gb.dx,0,NET.bodyHidden);
    addSlice(dWorldH,gb.dx,NET.bodyHidden,NET.worldHidden);
    dhFuture=gb.dhPrev;
    if(cfg.continuityCoef){
      for(let i=0;i<dhFuture.length;i++){
        const e=f.hidden[i]-hPrev[i];
        dhFuture[i]-=lw*cfg.continuityCoef*2*e/dhFuture.length;
      }
    }

    denseBackward(model.body,grad.body,f.cache.bc,dBody);
    denseBackward(model.world,grad.world,f.cache.wc,dWorldH);
  }
  const n=records.length;
  m.actor/=n;m.value/=n;m.entropy/=n;m.own/=n;m.world/=n;m.agency/=n;m.continuity/=n;
  m.loss=(rlEnabled?(m.actor+cfg.valueCoef*m.value-cfg.entropyCoef*m.entropy):0)+cfg.ownPredictCoef*m.own+cfg.worldPredictCoef*m.world+cfg.agencyCoef*m.agency+cfg.continuityCoef*m.continuity;
  scaleGrad(grad,1/n);
  return {grad,metrics:m};
}

export function trainLocalSequenceContribution(model,records,cfg,index){
  const n=records?.length||0;
  if(!Number.isInteger(index)||index<0||index>=n)throw new Error("local contribution index out of range");
  const lossWeights=new Float64Array(n);lossWeights[index]=1;
  return trainLocalSequence(model,records,cfg,{lossWeights});
}

function visitDense(model,fn,prefix){
  fn(model.W,prefix+".W");fn(model.b,prefix+".b");
}
export function visitLocalParams(model,fn){
  visitDense(model.body,fn,"body");visitDense(model.world,fn,"world");
  visitDense(model.gru.Wz,fn,"gru.Wz");visitDense(model.gru.Wr,fn,"gru.Wr");visitDense(model.gru.Wh,fn,"gru.Wh");
  visitDense(model.actor,fn,"actor");visitDense(model.critic,fn,"critic");visitDense(model.ownPred,fn,"ownPred");
  visitDense(model.worldPred,fn,"worldPred");visitDense(model.agency,fn,"agency");
}
export function visitLocalParamPairs(model,grad,fn){
  const pairs=[[model.body,grad.body],[model.world,grad.world],[model.gru.Wz,grad.gru.Wz],[model.gru.Wr,grad.gru.Wr],[model.gru.Wh,grad.gru.Wh],[model.actor,grad.actor],[model.critic,grad.critic],[model.ownPred,grad.ownPred],[model.worldPred,grad.worldPred],[model.agency,grad.agency]];
  for(const [p,g] of pairs){fn(p.W,g.W);fn(p.b,g.b);}
}
export function scaleGrad(g,s){visitLocalGrad(g,a=>{for(let i=0;i<a.length;i++)a[i]*=s;});}
export function visitLocalGrad(g,fn){
  const ps=[g.body,g.world,g.gru.Wz,g.gru.Wr,g.gru.Wh,g.actor,g.critic,g.ownPred,g.worldPred,g.agency];
  for(const p of ps){fn(p.W);fn(p.b);}
}
export function addLocalGrad(dst,src,scale=1){
  const d=[],s=[];visitLocalGrad(dst,a=>d.push(a));visitLocalGrad(src,a=>s.push(a));
  for(let k=0;k<d.length;k++)for(let i=0;i<d[k].length;i++)d[k][i]+=scale*s[k][i];
}
export function localGradNorm(g){let q=0;visitLocalGrad(g,a=>{for(const v of a)q+=v*v;});return Math.sqrt(q);}

export function serializeLocalBrain(m){
  const dense=p=>({outN:p.outN,inN:p.inN,W:Array.from(p.W),b:Array.from(p.b)});
  return {version:m.version,body:dense(m.body),world:dense(m.world),gru:{inputN:m.gru.inputN,stateN:m.gru.stateN,Wz:dense(m.gru.Wz),Wr:dense(m.gru.Wr),Wh:dense(m.gru.Wh)},actor:dense(m.actor),critic:dense(m.critic),ownPred:dense(m.ownPred),worldPred:dense(m.worldPred),agency:dense(m.agency)};
}
export function deserializeLocalBrain(d){
  const dense=p=>({outN:p.outN,inN:p.inN,W:Float64Array.from(p.W),b:Float64Array.from(p.b)});
  return {version:d.version||1,body:dense(d.body),world:dense(d.world),gru:{inputN:d.gru.inputN,stateN:d.gru.stateN,Wz:dense(d.gru.Wz),Wr:dense(d.gru.Wr),Wh:dense(d.gru.Wh)},actor:dense(d.actor),critic:dense(d.critic),ownPred:dense(d.ownPred),worldPred:dense(d.worldPred),agency:dense(d.agency)};
}

export function localParameterCount(model){
  let n=0;
  visitLocalParams(model,a=>{ n+=a.length; });
  return n;
}


function recordMse(pred,target){
  const n=Math.min(pred.length,target.length);let q=0;
  for(let i=0;i<n;i++){const d=pred[i]-target[i];q+=d*d;}
  return n?q/n:0;
}

export function evaluateLocalRecord(model,r){
  const h=r.hiddenBefore||new Float64Array(NET.selfHidden);
  const f=forwardLocal(model,r.obs,h,r.higherContext,r.prevAction,r.prevReward,r.prevMismatch,{actionMask:r.actionMask||null});
  const aux=auxForward(model,f.cache.rep,r.action,Number(r.confidence)||0);
  const ownTarget=r.nextObs.slice(0,BODY_OBS_N),worldTarget=r.nextObs.slice(BODY_OBS_N);
  return{
    actionProb:f.probs[r.action]||0,
    entropy:f.entropy,
    ownMse:recordMse(aux.own.y,ownTarget),
    worldMse:recordMse(aux.world.y,worldTarget),
    agencyMse:recordMse(aux.agency.y,r.agencyTarget||[0,0,0])
  };
}

export function trainTargetedActionBatch(model,records,{backpropSelf=true}={}){
  const grad=zeroLocalGrad(model),m={crossEntropy:0,targetProb:0,count:0};
  for(const r of records){
    const target=Math.max(0,Math.min(ACTION_N-1,Math.floor(Number(r.targetAction??r.action)||0)));
    const weight=Math.max(.05,Math.min(4,Number(r.weight)||1));
    const h=r.hiddenBefore||new Float64Array(NET.selfHidden);
    const f=forwardLocal(model,r.obs,h,r.higherContext,r.prevAction,r.prevReward,r.prevMismatch,{actionMask:r.actionMask||null});
    const p=Math.max(1e-12,f.probs[target]||0);
    m.crossEntropy+=-weight*Math.log(p);m.targetProb+=p;m.count++;
    const dLogits=new Float64Array(ACTION_N);
    for(let j=0;j<ACTION_N;j++)dLogits[j]=weight*(f.probs[j]-(j===target?1:0));
    const dRep=denseBackward(model.actor,grad.actor,f.cache.ac,dLogits);
    if(!backpropSelf)continue;
    const dBody=new Float64Array(NET.bodyHidden),dWorldH=new Float64Array(NET.worldHidden),dh=new Float64Array(NET.selfHidden);
    addSlice(dBody,dRep,0,NET.bodyHidden);
    addSlice(dWorldH,dRep,NET.bodyHidden,NET.worldHidden);
    addSlice(dh,dRep,NET.bodyHidden+NET.worldHidden,NET.selfHidden);
    const gb=gruBackward(model.gru,grad.gru,f.cache.gc,dh);
    addSlice(dBody,gb.dx,0,NET.bodyHidden);
    addSlice(dWorldH,gb.dx,NET.bodyHidden,NET.worldHidden);
    denseBackward(model.body,grad.body,f.cache.bc,dBody);
    denseBackward(model.world,grad.world,f.cache.wc,dWorldH);
  }
  if(m.count){scaleGrad(grad,1/m.count);m.crossEntropy/=m.count;m.targetProb/=m.count;}
  return{grad,metrics:m};
}
