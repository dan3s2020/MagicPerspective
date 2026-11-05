import {RNG} from "./math.js";
import {CAUSAL_HORIZONS,HIGHER_COMPONENTS,LOCAL_COMPONENTS,META_COMPONENTS,WORLD_MODEL_COMPONENTS,clamp,finite,hashValue} from "./causal-types.js";
import {ORACLE_METRICS} from "./causal-metrics.js";

export const QANDA_VERSION="v9-vectric4v8-qanda-brsi1-g6";
export const QANDA_INPUT_N=64,QANDA_HIDDEN_N=96;
export const QANDA_COMPONENT_LABELS=Object.freeze([
  ...LOCAL_COMPONENTS.map(x=>"local:"+x),
  ...HIGHER_COMPONENTS.map(x=>"higher:"+x),
  ...META_COMPONENTS.map(x=>"meta:"+x),
  ...WORLD_MODEL_COMPONENTS.map(x=>"world:"+x)
]);
export const QANDA_COMPONENT_N=QANDA_COMPONENT_LABELS.length;
export const QANDA_SCOPE_LABELS=Object.freeze([
  "A","B-cell","B-higher","A-meta","B-meta","A-world","B-world",
  "v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural",
  "direct","bend","s-curve","backtrack","maze-zigzag","spiral",
  "3d-maze","3d-branching"
]);
export const QANDA_SCOPE_N=QANDA_SCOPE_LABELS.length;
export const QANDA_RETENTION_N=14,QANDA_GENERALIZATION_N=14;
export const QANDA_CAUSAL_METRICS=Object.freeze(["utility",...ORACLE_METRICS]);
let _qo=0;const _ql={};
_ql.decision=[_qo,_qo+=3];
_ql.alpha=[_qo,_qo+=1];
_ql.components=[_qo,_qo+=QANDA_COMPONENT_N];
_ql.componentAlpha=[_qo,_qo+=QANDA_COMPONENT_N];
_ql.scope=[_qo,_qo+=QANDA_SCOPE_N];
_ql.causal=[_qo,_qo+=CAUSAL_HORIZONS.length*2*QANDA_CAUSAL_METRICS.length];
_ql.retention=[_qo,_qo+=QANDA_RETENTION_N];
_ql.generalization=[_qo,_qo+=QANDA_GENERALIZATION_N];
_ql.plasticity=[_qo,_qo+=4];
_ql.interaction=[_qo,_qo+=1];
_ql.uncertainty=[_qo,_qo+=1];
export const QANDA_LAYOUT=Object.freeze(_ql);
export const QANDA_OUTPUT_N=QANDA_LAYOUT.uncertainty[1];

function zeros(n){return new Float64Array(n);}
function randn(r,s){let u=Math.max(1e-12,r.next()),v=Math.max(1e-12,r.next());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*s;}
export function createQandaController(rng=new RNG(0x8A4D41)){
  const w1=zeros(QANDA_INPUT_N*QANDA_HIDDEN_N),b1=zeros(QANDA_HIDDEN_N),w2=zeros(QANDA_HIDDEN_N*QANDA_OUTPUT_N),b2=zeros(QANDA_OUTPUT_N);
  for(let i=0;i<w1.length;i++)w1[i]=randn(rng,Math.sqrt(2/QANDA_INPUT_N));for(let i=0;i<w2.length;i++)w2[i]=randn(rng,Math.sqrt(2/QANDA_HIDDEN_N));
  return{version:QANDA_VERSION,inputN:QANDA_INPUT_N,hiddenN:QANDA_HIDDEN_N,outputN:QANDA_OUTPUT_N,w1,b1,w2,b2};
}
export function createQandaAdam(m){const z=()=>({w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(m.b2.length)});return{step:0,m:z(),v:z()};}
function hashFeatures(s,n=4){const h=hashValue(s),out=[];for(let i=0;i<n;i++)out.push(parseInt(h.slice(i*8,i*8+8),16)/0xffffffff);return out;}
function arr(x){return Array.isArray(x)?x:ArrayBuffer.isView(x)?Array.from(x):[];}
export function encodeQandaInput(record){
  // IMPORTANT: this encoder may only use information available BEFORE the oracle
  // answers the current experience. Never feed target fields (selected alpha,
  // measured plasticity, recommended scope, etc.) back into the predictor.
  const x=[];
  x.push(...arr(record.experienceFeatures).slice(0,16));
  x.push(...arr(record.stateSignature).slice(0,8));
  x.push(...arr(record.updateSignature).slice(0,16));
  x.push(...arr(record.optimizerSignature).slice(0,8));
  x.push(...arr(record.recentCausalHistory).slice(0,8));
  x.push(...hashFeatures(record.contextId||record.experienceId||"",4));
  x.push(...hashFeatures(record.preCheckpointHash||"",4));
  while(x.length<QANDA_INPUT_N)x.push(0);
  return Float64Array.from(x.slice(0,QANDA_INPUT_N).map(v=>clamp(finite(v),-10,10)));
}
function softmax3(y){let mx=Math.max(y[0],y[1],y[2]),z=0,o=new Float64Array(3);for(let i=0;i<3;i++){o[i]=Math.exp(y[i]-mx);z+=o[i];}for(let i=0;i<3;i++)o[i]/=z;return o;}
export function forwardQanda(m,x){
  const h=zeros(m.hiddenN);for(let j=0;j<m.hiddenN;j++){let z=m.b1[j];for(let i=0;i<m.inputN;i++)z+=m.w1[j*m.inputN+i]*x[i];h[j]=Math.tanh(z);}
  const y=zeros(m.outputN);for(let k=0;k<m.outputN;k++){let z=m.b2[k];for(let j=0;j<m.hiddenN;j++)z+=m.w2[k*m.hiddenN+j]*h[j];y[k]=z;}
  const d=softmax3(y.slice(0,3));return{h,y,decisionProbs:d,decision:d[0]>=d[1]&&d[0]>=d[2]?0:d[1]>=d[2]?1:2,alpha:2/(1+Math.exp(-y[3]))};
}
function statusClass(s){if(s==="reject")return 0;if(s==="provisional"||s==="delay"||s==="unresolved")return 1;return 2;}
function lastDelta(curve){return curve?.length?finite(curve.at(-1).delta??curve.at(-1).value):0;}
export function oracleCausalTargetVector(r){
  const out=[];
  for(const [protocol,curve] of [["coupled",r.wholeUpdate?.coupledCausalCurve||[]],["natural",r.wholeUpdate?.naturalCausalCurve||[]]]){
    const byH=new Map(curve.map(x=>[Number(x.horizon),x]));
    for(const h of CAUSAL_HORIZONS){
      const p=byH.get(h)||null;
      out.push(finite(p?.delta??p?.value));
      for(const metric of ORACLE_METRICS)out.push(finite(p?.paired?.[metric]?.mean));
    }
  }
  return Float64Array.from(out);
}
export function decodeCausalMetricVector(flat){
  const a=Array.from(flat||[]),out={coupled:[],natural:[]};let o=0;
  for(const protocol of ["coupled","natural"]){
    for(const horizon of CAUSAL_HORIZONS){
      const row={horizon,utility:finite(a[o++]),metrics:{}};
      for(const metric of ORACLE_METRICS)row.metrics[metric]=finite(a[o++]);
      out[protocol].push(row);
    }
  }
  return out;
}
function targetVector(r){
  const y=zeros(QANDA_OUTPUT_N),decision=statusClass(r.recommendation?.status);y[decision]=1;y[3]=clamp(finite(r.magnitude?.selectedAlpha,1)/2,0,1);
  const useful=new Set(r.components?.useful||[]),harmful=new Set(r.components?.harmful||[]);
  const kind=r.changeSignature?.kind==="world"?"world":(r.changeSignature?.kind==="meta"?"meta":(r.changeSignature?.kind==="higher"?"higher":
    ((String(r.sourceLineage||"").startsWith("BH-")||String(r.experienceId||"").startsWith("B-higher"))?"higher":"local"))),prefix=kind+":";
  for(let i=0;i<QANDA_COMPONENT_N;i++){
    const label=QANDA_COMPONENT_LABELS[i];
    if(!label.startsWith(prefix)){y[QANDA_LAYOUT.components[0]+i]=0;continue;}
    const raw=label.slice(prefix.length);
    y[QANDA_LAYOUT.components[0]+i]=useful.has(raw)?1:harmful.has(raw)?-1:0;
  }
  const measuredBetas=new Map((r.components?.componentMagnitudes||[]).map(x=>[x.name,finite(x.beta,1)]));
  for(let i=0;i<QANDA_COMPONENT_N;i++){
    const label=QANDA_COMPONENT_LABELS[i],raw=label.startsWith(prefix)?label.slice(prefix.length):null;
    y[QANDA_LAYOUT.componentAlpha[0]+i]=raw==null?0:clamp((measuredBetas.get(raw)??1)/2,0,1);
  }
  const scopeSet=new Set(r.scope?.recommendedScope||[]);
  if(String(r.experienceId||"").startsWith("A-world"))scopeSet.add("A-world");
  else if(String(r.experienceId||"").startsWith("B-world"))scopeSet.add("B-world");
  else if(String(r.experienceId||"").startsWith("A-meta"))scopeSet.add("A-meta");
  else if(String(r.experienceId||"").startsWith("B-meta"))scopeSet.add("B-meta");
  else if(String(r.experienceId||"").startsWith("A:"))scopeSet.add("A");
  else if(String(r.experienceId||"").startsWith("B-cell"))scopeSet.add("B-cell");
  else if(String(r.experienceId||"").startsWith("B-higher"))scopeSet.add("B-higher");
  for(let i=0;i<QANDA_SCOPE_N;i++)y[QANDA_LAYOUT.scope[0]+i]=scopeSet.has(QANDA_SCOPE_LABELS[i])?1:0;
  const causal=oracleCausalTargetVector(r);for(let i=0;i<causal.length;i++)y[QANDA_LAYOUT.causal[0]+i]=causal[i];
  const rr=Array.isArray(r.retention?.perCapability)?r.retention.perCapability:[];for(let i=0;i<QANDA_RETENTION_N;i++)y[QANDA_LAYOUT.retention[0]+i]=finite(rr[i]?.success??rr[i]?.delta);
  const gg=Array.isArray(r.generalization?.perFamily)?r.generalization.perFamily:[];for(let i=0;i<QANDA_GENERALIZATION_N;i++)y[QANDA_LAYOUT.generalization[0]+i]=finite(gg[i]?.delta??gg[i]?.success);
  y[QANDA_LAYOUT.plasticity[0]]=finite(r.plasticity?.AULC);y[QANDA_LAYOUT.plasticity[0]+1]=finite(r.plasticity?.slope);y[QANDA_LAYOUT.plasticity[0]+2]=finite(r.plasticity?.thresholdSpeedup);y[QANDA_LAYOUT.plasticity[0]+3]=lastDelta(r.wholeUpdate?.naturalCausalCurve);
  y[QANDA_LAYOUT.interaction[0]]=Math.min(1,(r.interactions?.edges?.length||0)/4);y[QANDA_LAYOUT.uncertainty[0]]=finite(r.confidence?.measurementResolution);
  return{y,decision};
}
function zeroGrad(m){return{w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(m.b2.length)};}
export function qandaAdamStep(m,g,o,lr){o.step++;const b1=.9,b2=.999,e=1e-8,c1=1-b1**o.step,c2=1-b2**o.step;for(const k of["w1","b1","w2","b2"])for(let i=0;i<m[k].length;i++){const x=clamp(g[k][i],-5,5);o.m[k][i]=b1*o.m[k][i]+(1-b1)*x;o.v[k][i]=b2*o.v[k][i]+(1-b2)*x*x;m[k][i]-=lr*(o.m[k][i]/c1)/(Math.sqrt(o.v[k][i]/c2)+e);}}
export function qandaBatchGradient(model,records,{recordWeights=null}={}){
  const g=zeroGrad(model);let loss=0,correct=0;
  if(!records.length)return{grad:g,loss:0,accuracy:0,count:0};
  for(let ri=0;ri<records.length;ri++){
    const rw=recordWeights?Number(recordWeights[ri]??0):1;if(rw===0)continue;
    const r=records[ri],x=encodeQandaInput(r),f=forwardQanda(model,x),t=targetVector(r),dy=zeros(model.outputN);
    for(let k=0;k<3;k++)dy[k]=rw*(f.decisionProbs[k]-(k===t.decision?1:0));
    loss+=rw*-Math.log(Math.max(1e-12,f.decisionProbs[t.decision]));correct+=f.decision===t.decision?rw:0;
    for(let k=3;k<dy.length;k++){const target=t.y[k],pred=k===3?f.alpha/2:f.y[k],d=pred-target;loss+=rw*.5*d*d;dy[k]=rw*(k===3?d*(f.alpha/2)*(1-f.alpha/2):d);}
    const dh=zeros(model.hiddenN);
    for(let k=0;k<model.outputN;k++){g.b2[k]+=dy[k];for(let j=0;j<model.hiddenN;j++){g.w2[k*model.hiddenN+j]+=dy[k]*f.h[j];dh[j]+=model.w2[k*model.hiddenN+j]*dy[k];}}
    for(let j=0;j<model.hiddenN;j++){const dz=dh[j]*(1-f.h[j]*f.h[j]);g.b1[j]+=dz;for(let i=0;i<model.inputN;i++)g.w1[j*model.inputN+i]+=dz*x[i];}
  }
  for(const k of["w1","b1","w2","b2"])for(let i=0;i<g[k].length;i++)g[k][i]/=records.length;
  return{grad:g,loss:loss/records.length,accuracy:correct/records.length,count:records.length};
}
export function qandaRecordContribution(model,records,index){
  if(!Number.isInteger(index)||index<0||index>=records.length)throw new Error("qanda contribution index out of range");
  const w=new Float64Array(records.length);w[index]=1;return qandaBatchGradient(model,records,{recordWeights:w});
}

export function trainQanda(model,records,opt,{learningRate=.001,epochs=2}={}){
  if(!records.length)return{count:0,loss:0,headLosses:{}};
  let total=0;
  for(let ep=0;ep<epochs;ep++){
    const g=zeroGrad(model);let loss=0;
    for(const r of records){
      const x=encodeQandaInput(r),f=forwardQanda(model,x),t=targetVector(r),dy=zeros(model.outputN);
      for(let k=0;k<3;k++)dy[k]=f.decisionProbs[k]-(k===t.decision?1:0);
      loss+=-Math.log(Math.max(1e-12,f.decisionProbs[t.decision]));
      for(let k=3;k<dy.length;k++){const target=t.y[k],pred=k===3?f.alpha/2:f.y[k],d=pred-target;loss+=.5*d*d;dy[k]=k===3?d*(f.alpha/2)*(1-f.alpha/2):d;}
      const dh=zeros(model.hiddenN);
      for(let k=0;k<model.outputN;k++){g.b2[k]+=dy[k];for(let j=0;j<model.hiddenN;j++){g.w2[k*model.hiddenN+j]+=dy[k]*f.h[j];dh[j]+=model.w2[k*model.hiddenN+j]*dy[k];}}
      for(let j=0;j<model.hiddenN;j++){const dz=dh[j]*(1-f.h[j]*f.h[j]);g.b1[j]+=dz;for(let i=0;i<model.inputN;i++)g.w1[j*model.inputN+i]+=dz*x[i];}
    }
    for(const k of["w1","b1","w2","b2"])for(let i=0;i<g[k].length;i++)g[k][i]/=records.length;qandaAdamStep(model,g,opt,learningRate);total+=loss/records.length;
  }
  const h=evaluateQanda(model,records);
  return{count:records.length,loss:total/epochs,optimizerStep:opt.step,headLosses:{
    decision:h.decisionLoss,alpha:h.alphaMse,components:h.componentMse,componentAlpha:h.componentAlphaMse,
    scope:h.scopeMse,causal:h.causalMse,retention:h.retentionMse,generalization:h.generalizationMse,
    plasticity:h.plasticityMse,interaction:h.interactionMse,uncertainty:h.uncertaintyMse
  }};
}
export function decodeQandaOutput(f){
  const slice=(r)=>Array.from(f.y.slice(r[0],r[1])),causalPredictions=slice(QANDA_LAYOUT.causal);
  return{
    decision:f.decision,decisionProbs:Array.from(f.decisionProbs),alpha:f.alpha,
    componentScores:Object.fromEntries(QANDA_COMPONENT_LABELS.map((x,i)=>[x,f.y[QANDA_LAYOUT.components[0]+i]])),
    componentBetas:Object.fromEntries(QANDA_COMPONENT_LABELS.map((x,i)=>[x,2*clamp(f.y[QANDA_LAYOUT.componentAlpha[0]+i],0,1)])),
    scopeScores:Object.fromEntries(QANDA_SCOPE_LABELS.map((x,i)=>[x,f.y[QANDA_LAYOUT.scope[0]+i]])),
    causalPredictions,causalMetricPredictions:decodeCausalMetricVector(causalPredictions),retentionPredictions:slice(QANDA_LAYOUT.retention),
    generalizationPredictions:slice(QANDA_LAYOUT.generalization),plasticityPredictions:slice(QANDA_LAYOUT.plasticity),
    interactionRisk:f.y[QANDA_LAYOUT.interaction[0]],uncertainty:f.y[QANDA_LAYOUT.uncertainty[0]]
  };
}
export function evaluateQanda(model,records){
  let decisionLoss=0,correct=0;const head={componentMse:0,componentAlphaMse:0,scopeMse:0,alphaMse:0,causalMse:0,retentionMse:0,generalizationMse:0,plasticityMse:0,interactionMse:0,uncertaintyMse:0};
  if(!records.length)return{count:0,loss:0,decisionLoss:0,accuracy:0,...head};
  for(const r of records){const f=forwardQanda(model,encodeQandaInput(r)),t=targetVector(r);decisionLoss+=-Math.log(Math.max(1e-12,f.decisionProbs[t.decision]));correct+=f.decision===t.decision?1:0;
    head.alphaMse+=(f.alpha/2-t.y[3])**2;
    for(const [name,range] of [["componentMse",QANDA_LAYOUT.components],["componentAlphaMse",QANDA_LAYOUT.componentAlpha],["scopeMse",QANDA_LAYOUT.scope],["causalMse",QANDA_LAYOUT.causal],["retentionMse",QANDA_LAYOUT.retention],["generalizationMse",QANDA_LAYOUT.generalization],["plasticityMse",QANDA_LAYOUT.plasticity],["interactionMse",QANDA_LAYOUT.interaction],["uncertaintyMse",QANDA_LAYOUT.uncertainty]]){let q=0,n=0;for(let k=range[0];k<range[1];k++){q+=(f.y[k]-t.y[k])**2;n++;}head[name]+=q/Math.max(1,n);}
  }
  for(const k of Object.keys(head))head[k]/=records.length;
  const d=decisionLoss/records.length,total=d+Object.values(head).reduce((a,b)=>a+b,0);
  return{count:records.length,loss:total,decisionLoss:d,accuracy:correct/records.length,...head};
}
export function qandaParameterCount(m){return m.w1.length+m.b1.length+m.w2.length+m.b2.length;}
