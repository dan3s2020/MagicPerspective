import {RNG} from "./math.js";

export const BRSI_CONTROLLER_VERSION="v7-brsi1-g1";
export const BRSI_FEATURE_N=32;
export const BRSI_HIDDEN_N=48;
export const STRENGTHS=Object.freeze({
  light:{id:"light",lrScale:.35,epochs:1,exampleFraction:.5},
  normal:{id:"normal",lrScale:.65,epochs:2,exampleFraction:.75},
  strong:{id:"strong",lrScale:1.0,epochs:3,exampleFraction:1}
});
export const BRSI_ACTIONS=Object.freeze([
  {id:"WAIT",intervention:"wait",strength:"normal",scopes:["A","B-cell","B-higher"]},
  ...["light","normal","strong"].map(strength=>({id:"ACTOR_"+strength.toUpperCase(),intervention:"actor_self",strength,scopes:["A","B-cell"]})),
  ...["light","normal","strong"].map(strength=>({id:"OWN_"+strength.toUpperCase(),intervention:"own_prediction",strength,scopes:["A","B-cell"]})),
  ...["light","normal","strong"].map(strength=>({id:"WORLD_"+strength.toUpperCase(),intervention:"world_prediction",strength,scopes:["A","B-cell"]})),
  ...["light","normal","strong"].map(strength=>({id:"AGENCY_"+strength.toUpperCase(),intervention:"agency_prediction",strength,scopes:["A","B-cell"]})),
  ...["light","normal","strong"].map(strength=>({id:"HIGHER_"+strength.toUpperCase(),intervention:"higher_success_replay",strength,scopes:["B-higher"]}))
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const tanh=x=>Math.tanh(clamp(Number(x)||0,-20,20));
function zeros(n){return new Float64Array(n);}
function randn(rng,scale){
  let u=Math.max(1e-12,rng.next()),v=Math.max(1e-12,rng.next());
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*scale;
}
function init(rng,n,scale){const a=new Float64Array(n);for(let i=0;i<n;i++)a[i]=randn(rng,scale);return a;}
export function createBrsiController(rng=new RNG(0xB251001)){
  return{version:BRSI_CONTROLLER_VERSION,inputN:BRSI_FEATURE_N,hiddenN:BRSI_HIDDEN_N,actionN:BRSI_ACTIONS.length,
    w1:init(rng,BRSI_FEATURE_N*BRSI_HIDDEN_N,Math.sqrt(2/BRSI_FEATURE_N)),b1:zeros(BRSI_HIDDEN_N),
    w2:init(rng,BRSI_HIDDEN_N*BRSI_ACTIONS.length,Math.sqrt(2/BRSI_HIDDEN_N)),b2:zeros(BRSI_ACTIONS.length)};
}
export function createBrsiAdam(m){
  return{step:0,m:{w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(m.b2.length)},
    v:{w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(m.b2.length)}};
}
export function validActionMask(scope){
  return BRSI_ACTIONS.map(a=>a.scopes.includes(scope));
}
function softmaxMasked(logits,mask){
  let mx=-Infinity;for(let i=0;i<logits.length;i++)if(mask[i])mx=Math.max(mx,logits[i]);
  const p=new Float64Array(logits.length);let z=0;
  for(let i=0;i<logits.length;i++){if(!mask[i])continue;p[i]=Math.exp(logits[i]-mx);z+=p[i];}
  if(!(z>0)){p[0]=1;return p;}for(let i=0;i<p.length;i++)p[i]/=z;return p;
}
export function forwardBrsi(m,x,scope){
  if(x.length!==BRSI_FEATURE_N)throw new Error("BRSI feature length mismatch");
  const h=new Float64Array(m.hiddenN);
  for(let j=0;j<m.hiddenN;j++){let z=m.b1[j];for(let i=0;i<m.inputN;i++)z+=m.w1[j*m.inputN+i]*x[i];h[j]=Math.tanh(z);}
  const logits=new Float64Array(m.actionN);
  for(let k=0;k<m.actionN;k++){let z=m.b2[k];for(let j=0;j<m.hiddenN;j++)z+=m.w2[k*m.hiddenN+j]*h[j];logits[k]=z;}
  const mask=validActionMask(scope),probs=softmaxMasked(logits,mask);
  let action=0;for(let i=1;i<probs.length;i++)if(probs[i]>probs[action])action=i;
  return{h,logits,probs,action,confidence:probs[action],waitProb:probs[0],mask};
}
function localMetric(summary,name,side){
  const x=summary?.stats?.[side]?.[name];return Number.isFinite(Number(x))?Number(x):0;
}
export function brsiFeatures({summary,scope,lineage=null,batch=0,recentHistory=[]}){
  const c=summary?.counts||{},n=Math.max(1,Number(c.total)||((Number(c.success)||0)+(Number(c.failure)||0))||1);
  const succ=(Number(c.success)||0)/n,fail=(Number(c.failure)||0)/n,newFrac=(Number(c.newCount)||0)/n;
  const del=summary?.stats?.deltas||{};
  const h=summary?.stats||{};
  const last=recentHistory?.at?.(-1)||null;
  const recent=recentHistory.slice(-8),promoRate=recent.length?recent.filter(x=>x.promoted).length/recent.length:0;
  const x=[
    clamp(n/768,0,1),succ,fail,clamp(newFrac,0,1),
    clamp(localMetric(summary,"acceptRate","success"),0,1),clamp(localMetric(summary,"acceptRate","failure"),0,1),tanh((Number(del.accept)||0)*3),
    clamp(localMetric(summary,"highConfRejectRate","success"),0,1),clamp(localMetric(summary,"highConfRejectRate","failure"),0,1),tanh((Number(del.highConfReject)||0)*3),
    tanh(localMetric(summary,"ownMse","success")*3),tanh(localMetric(summary,"ownMse","failure")*3),tanh((Number(del.own)||0)*3),
    tanh(localMetric(summary,"worldMse","success")*3),tanh(localMetric(summary,"worldMse","failure")*3),tanh((Number(del.world)||0)*3),
    tanh(localMetric(summary,"agencyMse","success")*3),tanh(localMetric(summary,"agencyMse","failure")*3),tanh((Number(del.agency)||0)*3),
    tanh(localMetric(summary,"reward","success")/5),tanh(localMetric(summary,"reward","failure")/5),tanh((Number(del.reward)||0)/5),
    tanh((Number(h.successPredictionMse)||0)*3),tanh((Number(h.failurePredictionMse)||0)*3),tanh((Number(h.delta)||0)*3),
    scope==="A"?1:0,scope==="B-cell"?1:0,scope==="B-higher"?1:0,
    clamp((Number(lineage?.generation)||0)/10,0,1),
    tanh(Number(last?.mechanismAdvantage)||0),
    last?.promoted?1:0,
    clamp(.5*promoRate+.5*clamp((Number(summary?.mapKinds)||0)/12,0,1),0,1)
  ];
  return Float64Array.from(x);
}
export function teacherActionIndex(diagnosis,scope){
  if(!diagnosis?.ready)return 0;
  let intervention=scope==="B-higher"?"higher_success_replay":diagnosis.target==="actor_self"?"actor_self":
    diagnosis.metric==="ownMse"?"own_prediction":diagnosis.metric==="worldMse"?"world_prediction":
    diagnosis.metric==="agencyMse"?"agency_prediction":"wait";
  const i=BRSI_ACTIONS.findIndex(a=>a.intervention===intervention&&a.strength==="normal"&&a.scopes.includes(scope));
  return i>=0?i:0;
}
export function actionSpec(index){
  return BRSI_ACTIONS[Math.max(0,Math.min(BRSI_ACTIONS.length-1,Math.floor(Number(index)||0)))];
}
export function chooseBrsiAction(model,features,scope,{minConfidence=.38,exploreIndex=null}={}){
  const f=forwardBrsi(model,features,scope);
  let action=f.action;
  const exploring=Number.isInteger(exploreIndex)&&f.mask[exploreIndex];
  if(exploring)action=exploreIndex;
  if(!exploring&&action!==0&&f.probs[action]<Math.max(minConfidence,f.waitProb))action=0;
  return{...f,action,spec:actionSpec(action)};
}
function zeroGrad(m){return{w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(m.b2.length)};}
function addGrad(a,b,s=1){for(const k of["w1","b1","w2","b2"])for(let i=0;i<a[k].length;i++)a[k][i]+=b[k][i]*s;}
function trainOne(m,ex){
  const f=forwardBrsi(m,ex.features,ex.scope),target=Math.max(0,Math.min(m.actionN-1,Math.floor(ex.targetAction||0))),w=clamp(Number(ex.weight)||1,.05,20);
  const g=zeroGrad(m),dl=new Float64Array(m.actionN);
  for(let k=0;k<m.actionN;k++)dl[k]=f.mask[k]?w*(f.probs[k]-(k===target?1:0)):0;
  for(let k=0;k<m.actionN;k++){g.b2[k]+=dl[k];for(let j=0;j<m.hiddenN;j++)g.w2[k*m.hiddenN+j]+=dl[k]*f.h[j];}
  const dh=new Float64Array(m.hiddenN);
  for(let j=0;j<m.hiddenN;j++){let q=0;for(let k=0;k<m.actionN;k++)q+=m.w2[k*m.hiddenN+j]*dl[k];dh[j]=q*(1-f.h[j]*f.h[j]);g.b1[j]+=dh[j];for(let i=0;i<m.inputN;i++)g.w1[j*m.inputN+i]+=dh[j]*ex.features[i];}
  return{grad:g,loss:-w*Math.log(Math.max(1e-12,f.probs[target])),correct:f.action===target?1:0};
}
export function trainBrsiExamples(model,examples,opt,{learningRate=.002,epochs=2}={}){
  const used=examples.filter(x=>x?.features?.length===BRSI_FEATURE_N&&validActionMask(x.scope)[x.targetAction]);
  let loss=0,correct=0,steps=0;
  for(let ep=0;ep<Math.max(1,epochs);ep++){
    const g=zeroGrad(model);let n=0,l=0,c=0;
    for(const ex of used){const o=trainOne(model,ex);addGrad(g,o.grad);l+=o.loss;c+=o.correct;n++;}
    if(!n)continue;for(const k of["w1","b1","w2","b2"])for(let i=0;i<g[k].length;i++)g[k][i]/=n;
    brsiAdamStep(model,g,opt,learningRate);loss+=l/n;correct+=c/n;steps++;
  }
  return{count:used.length,loss:steps?loss/steps:0,accuracy:steps?correct/steps:0,optimizerStep:opt.step};
}
export function evaluateBrsiExamples(model,examples){
  let loss=0,correct=0,wSum=0,n=0,waitN=0,waitCorrect=0,interveneN=0,interveneCorrect=0;
  for(const ex of examples){
    if(!ex?.features||!validActionMask(ex.scope)[ex.targetAction])continue;
    const f=forwardBrsi(model,ex.features,ex.scope),w=clamp(Number(ex.weight)||1,.05,20),p=Math.max(1e-12,f.probs[ex.targetAction]),ok=f.action===ex.targetAction;
    loss+=-w*Math.log(p);wSum+=w;correct+=ok?1:0;n++;
    if(ex.targetAction===0){waitN++;waitCorrect+=ok?1:0;}else{interveneN++;interveneCorrect+=ok?1:0;}
  }
  return{count:n,loss:wSum?loss/wSum:0,accuracy:n?correct/n:0,
    waitCount:waitN,waitAccuracy:waitN?waitCorrect/waitN:0,
    interveneCount:interveneN,interveneAccuracy:interveneN?interveneCorrect/interveneN:0};
}
export function brsiAdamStep(model,grad,opt,lr=.002){
  const b1=.9,b2=.999,eps=1e-8;opt.step++;const c1=1-Math.pow(b1,opt.step),c2=1-Math.pow(b2,opt.step);
  for(const k of["w1","b1","w2","b2"]){const p=model[k],g=grad[k],mm=opt.m[k],vv=opt.v[k];for(let i=0;i<p.length;i++){const gi=Number.isFinite(g[i])?clamp(g[i],-5,5):0;mm[i]=b1*mm[i]+(1-b1)*gi;vv[i]=b2*vv[i]+(1-b2)*gi*gi;p[i]-=lr*(mm[i]/c1)/(Math.sqrt(vv[i]/c2)+eps);}}
}
export function brsiParameterCount(m){return m.w1.length+m.b1.length+m.w2.length+m.b2.length;}
