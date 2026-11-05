import {EGO_COUNT,mapKindForMode} from "./config.js";
import {addLocalGrad,scaleGrad,trainLocalSequence,trainTargetedActionBatch,zeroLocalGrad} from "./brain.js";
import {adamStep,createAdam} from "./optimizer.js";
import {addHigherGrad,createHigherAdam,higherAdamStep,scaleHigherGrad,trainHigherSequence,zeroHigherGrad} from "./higher-self.js";
import {clearEvidenceFor,diagnoseHigherEvidence,diagnoseLocalEvidence,ensureEvidenceState,evidenceFor,evidenceSummary} from "./rsi-evidence.js";

export const RVSI_SEIL_VERSION="v7-evidence-rsi-r3";
export const DEFAULT_RVSI_CONFIG=Object.freeze({
 enabled:true,warmupBatches:4,verifyEveryBatches:1,validationSimulations:16,
 evidenceCapA:768,evidenceCapPerCell:128,evidenceCapHigher:384,
 minSuccessEvidence:24,minFailureEvidence:24,minHigherSuccessEvidence:16,minHigherFailureEvidence:16,minNewEvidence:32,
 targetExamples:96,higherTargetExamples:48,targetEpochs:2,targetLearningRateScale:.55,minContrast:.01,
 minScoreGain:.001,maxRejectRegression:.05,maxDistanceRegression:1.0,ledgerCap:256,historyCap:64
});
const ZERO_HASH="0".repeat(64);
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function lineage(id){return{generation:0,id,promotions:0,rejections:0,lastAttemptSeq:0,history:[]};}

export function createRvsiState(overrides={}){
 return{version:RVSI_SEIL_VERSION,config:{...DEFAULT_RVSI_CONFIG,...overrides},
  A:lineage("A-g0"),
  B:{nextKind:"cell",nextCell:0,cells:Array.from({length:EGO_COUNT},(_,i)=>lineage("B"+i+"-g0")),higher:lineage("BH-g0")},
  ledger:{baseHash:ZERO_HASH,nextSeq:0,entries:[]},last:null,lastCycleBatch:null,cycles:0,totalPromotions:0,totalRejections:0,
  legacyRandomCycles:0};
}
export function ensureRvsiState(t){
 const old=t.rvsi;
 if(!old||old.version!==RVSI_SEIL_VERSION){
  const fresh=createRvsiState({enabled:old?.config?.enabled!==false});
  fresh.legacyRandomCycles=Math.max(0,Math.floor(Number(old?.cycles)||0));
  t.rvsi=fresh;
 }
 const r=t.rvsi,c=r.config={...DEFAULT_RVSI_CONFIG,...(r.config||{})};
 c.enabled=c.enabled!==false;c.warmupBatches=Math.max(0,Math.floor(finite(c.warmupBatches,4)));c.verifyEveryBatches=Math.max(1,Math.floor(finite(c.verifyEveryBatches,1)));
 c.validationSimulations=Math.max(2,Math.floor(finite(c.validationSimulations,16)));c.targetEpochs=Math.max(1,Math.min(8,Math.floor(finite(c.targetEpochs,2))));
 c.targetLearningRateScale=Math.max(.01,Math.min(4,finite(c.targetLearningRateScale,.55)));
 for(const k of["evidenceCapA","evidenceCapPerCell","evidenceCapHigher","minSuccessEvidence","minFailureEvidence","minHigherSuccessEvidence","minHigherFailureEvidence","minNewEvidence","targetExamples","higherTargetExamples","historyCap","ledgerCap"])c[k]=Math.max(1,Math.floor(finite(c[k],DEFAULT_RVSI_CONFIG[k])));
 ensureEvidenceState(t);return r;
}

function canonical(v){if(v===undefined)return"null";if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";}
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
export function sha256(message){
 const bytes=new TextEncoder().encode(String(message)),bitLen=BigInt(bytes.length)*8n,padded=Math.ceil((bytes.length+9)/64)*64,buf=new Uint8Array(padded);buf.set(bytes);buf[bytes.length]=0x80;
 const dv=new DataView(buf.buffer);dv.setUint32(padded-8,Number((bitLen>>32n)&0xffffffffn),false);dv.setUint32(padded-4,Number(bitLen&0xffffffffn),false);
 let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;const w=new Uint32Array(64);
 for(let off=0;off<padded;off+=64){for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4,false);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2],s0=(rotr(a,7)^rotr(a,18)^(a>>>3))>>>0,s1=(rotr(b,17)^rotr(b,19)^(b>>>10))>>>0;w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;for(let i=0;i<64;i++){const S1=(rotr(e,6)^rotr(e,11)^rotr(e,25))>>>0,ch=((e&f)^((~e)&g))>>>0,t1=(h+S1+ch+K[i]+w[i])>>>0,S0=(rotr(a,2)^rotr(a,13)^rotr(a,22))>>>0,maj=((a&b)^(a&c)^(b&c))>>>0,t2=(S0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;}
 return[h0,h1,h2,h3,h4,h5,h6,h7].map(x=>x.toString(16).padStart(8,"0")).join("");
}
function ledger(t,type,payload){
 const r=ensureRvsiState(t),l=r.ledger,prev=l.entries.length?l.entries.at(-1).hash:l.baseHash,entry={seq:l.nextSeq++,type,batch:t.batch,payload,prevHash:prev};
 entry.hash=sha256(canonical(entry));l.entries.push(entry);while(l.entries.length>r.config.ledgerCap){const d=l.entries.shift();l.baseHash=d.hash;}return entry;
}
export function verifyRvsiLedger(t){
 const r=ensureRvsiState(t),l=r.ledger;let prev=l.baseHash,last=null;
 for(const e of l.entries){if(last!==null&&e.seq!==last+1)return{ok:false,reason:"sequence"};if(e.prevHash!==prev)return{ok:false,reason:"prevHash"};const x={seq:e.seq,type:e.type,batch:e.batch,payload:e.payload,prevHash:e.prevHash};if(sha256(canonical(x))!==e.hash)return{ok:false,reason:"hash"};prev=e.hash;last=e.seq;}
 return{ok:true,entries:l.entries.length,head:prev};
}
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function specs(t,count,salt,forbiddenSeeds=[]){
 const base=mix32((t.batch+1)*104729+t.stage*1000003+salt),offset=(salt>>>0)%997,forbidden=new Set([...(t.lastTrainingEnvSeeds||[]),...forbiddenSeeds].map(x=>Number(x)>>>0));
 return Array.from({length:count},(_,i)=>{
  let envSeed=mix32(base+i*2654435761),guard=0;
  while(forbidden.has(envSeed)&&guard++<16)envSeed=mix32(envSeed+0x9e3779b9+guard);
  forbidden.add(envSeed);
  return{envId:i,envSeed,actionSeed:mix32(base^((i+1)*2246822519)^0x5f3759df),mapKind:mapKindForMode(t.config.mapMode||"stage",offset+i,t.stage)};
 });
}
function score(m){return 10*finite(m.success)+0.002*finite(m.totalReward)-0.7*finite(m.rejectRate)-0.08*finite(m.worstDistance)-0.02*finite(m.meanDistance);}
function decision(champ,cand,control,c){
 const gain=score(cand)-score(champ),controlGain=control?score(control)-score(champ):0,fail=[];
 if(finite(cand.rejectRate)>finite(champ.rejectRate)+c.maxRejectRegression)fail.push("rejectRate");
 if(finite(cand.worstDistance)>finite(champ.worstDistance)+c.maxDistanceRegression)fail.push("worstDistance");
 if(finite(cand.success)+.02<finite(champ.success))fail.push("success");
 return{promote:gain>c.minScoreGain&&!fail.length,gain,controlGain,mechanismAdvantage:gain-controlGain,fail,championScore:score(champ),candidateScore:score(cand),controlScore:control?score(control):null};
}
function pushHistory(line,event,cap){line.history.push(event);if(line.history.length>cap)line.history.splice(0,line.history.length-cap);}
function compactDiagnosis(d){return{code:d.code,target:d.target,component:d.component,hypothesis:d.hypothesis,confidence:d.confidence,contrast:d.contrast,counts:d.counts,stats:d.stats};}

export function trainLocalFromDiagnosis(model,diagnosis,baseCfg,rsiCfg,opt=createAdam(model)){
 const epochs=Math.max(1,rsiCfg.targetEpochs),lr=baseCfg.learningRate*rsiCfg.targetLearningRateScale,metrics=[];
 for(let e=0;e<epochs;e++){
  if(diagnosis.target==="actor_self"){
   const out=trainTargetedActionBatch(model,diagnosis.dataset,{backpropSelf:true});adamStep(model,out.grad,opt,lr,baseCfg.maxGradNorm);metrics.push(out.metrics);
  }else{
   const g=zeroLocalGrad(model),auxCfg={...baseCfg,rlEnabled:false};let n=0,loss=0;
   for(const rec of diagnosis.dataset){const out=trainLocalSequence(model,[rec],auxCfg);addLocalGrad(g,out.grad);loss+=out.metrics.loss;n++;}
   if(n){scaleGrad(g,1/n);adamStep(model,g,opt,lr,baseCfg.maxGradNorm);}metrics.push({loss:n?loss/n:0,count:n});
  }
 }
 return{epochs,examples:diagnosis.dataset.length,learningRate:lr,metrics};
}
export function trainHigherFromDiagnosis(model,diagnosis,baseCfg,rsiCfg,opt=createHigherAdam(model)){
 const epochs=Math.max(1,rsiCfg.targetEpochs),lr=baseCfg.learningRate*rsiCfg.targetLearningRateScale,metrics=[];
 for(let e=0;e<epochs;e++){
  const out=trainHigherSequence(model,diagnosis.dataset);higherAdamStep(model,out.grad,opt,lr,baseCfg.maxGradNorm);metrics.push({loss:out.loss,count:diagnosis.dataset.length});
 }
 return{epochs,examples:diagnosis.dataset.length,learningRate:lr,metrics};
}
function controlDiagnosis(d){return{...d,dataset:d.controlDataset};}

async function challengeLocal(t,evaluate,{scope,line,model,cell=null,salt}){
 const r=ensureRvsiState(t),c=r.config,records=evidenceFor(t,scope,cell),d=diagnoseLocalEvidence(model,records,c,{scope,lastAttemptSeq:line.lastAttemptSeq});
 if(!d.ready)return{ran:false,scope,cell,reason:d.reason,counts:d.counts};
 line.lastAttemptSeq=d.counts.latestSeq;
 const candidate=structuredClone(model),control=structuredClone(model),baseOpt=scope==="A"?t.groupAAdam:t.groupBAdam[cell],candidateOpt=structuredClone(baseOpt),controlOpt=structuredClone(baseOpt);
 const training=trainLocalFromDiagnosis(candidate,d,t.config,c,candidateOpt),controlTraining=trainLocalFromDiagnosis(control,controlDiagnosis(d),t.config,c,controlOpt),ss=specs(t,c.validationSimulations,salt,d.dataset.map(x=>x.envSeed));
 ledger(t,"diagnosis",{scope,cell,parent:line.id,diagnosis:compactDiagnosis(d)});
 ledger(t,"challenge_started",{scope,cell,parent:line.id,target:d.target,examples:d.dataset.length,control:"untargeted_same_compute",verificationSeeds:ss.map(x=>x.envSeed)});
 let champModels,candModels,controlModels;
 if(scope==="A"){
  champModels={sharedModel:t.groupA,privateModels:null,higherModel:null};
  candModels={sharedModel:candidate,privateModels:null,higherModel:null};
  controlModels={sharedModel:control,privateModels:null,higherModel:null};
 }else{
  const cb=t.groupB.slice(),xb=t.groupB.slice();cb[cell]=candidate;xb[cell]=control;
  champModels={sharedModel:null,privateModels:t.groupB,higherModel:t.higher};
  candModels={sharedModel:null,privateModels:cb,higherModel:t.higher};
  controlModels={sharedModel:null,privateModels:xb,higherModel:t.higher};
 }
 const championMetrics=await evaluate({group:scope==="A"?"A":"B",specs:ss,models:champModels});
 const candidateMetrics=await evaluate({group:scope==="A"?"A":"B",specs:ss,models:candModels});
 const controlMetrics=await evaluate({group:scope==="A"?"A":"B",specs:ss,models:controlModels});
 const verdict=decision(championMetrics,candidateMetrics,controlMetrics,c),event={scope,cell,diagnosis:compactDiagnosis(d),training,controlTraining,championMetrics,candidateMetrics,controlMetrics,...verdict};
 if(verdict.promote){
  if(scope==="A"){t.groupA=candidate;t.groupAAdam=candidateOpt;}else{t.groupB[cell]=candidate;t.groupBAdam[cell]=candidateOpt;}
  line.generation++;line.id=(scope==="A"?"A-g":"B"+cell+"-g")+line.generation+"-"+mix32(t.batch*4099+(cell??0)).toString(16);line.promotions++;r.totalPromotions++;clearEvidenceFor(t,scope,cell);
 }else{line.rejections++;r.totalRejections++;}
 pushHistory(line,{batch:t.batch,promoted:verdict.promote,diagnosis:compactDiagnosis(d),gain:verdict.gain,controlGain:verdict.controlGain,mechanismAdvantage:verdict.mechanismAdvantage},c.historyCap);
 ledger(t,verdict.promote?"promotion":"rejection",{scope,cell,id:line.id,diagnosis:d.code,...verdict});
 return{ran:true,promote:verdict.promote,...event};
}
async function challengeHigher(t,evaluate){
 const r=ensureRvsiState(t),c=r.config,line=r.B.higher,records=evidenceFor(t,"B-higher"),d=diagnoseHigherEvidence(t.higher,records,c,{lastAttemptSeq:line.lastAttemptSeq});
 if(!d.ready)return{ran:false,scope:"B-higher",reason:d.reason,counts:d.counts};
 line.lastAttemptSeq=d.counts.latestSeq;
 const candidate=structuredClone(t.higher),control=structuredClone(t.higher),candidateOpt=structuredClone(t.higherAdam),controlOpt=structuredClone(t.higherAdam),training=trainHigherFromDiagnosis(candidate,d,t.config,c,candidateOpt),controlTraining=trainHigherFromDiagnosis(control,controlDiagnosis(d),t.config,c,controlOpt),ss=specs(t,c.validationSimulations,0xB799,d.dataset.map(x=>x.envSeed));
 ledger(t,"diagnosis",{scope:"B-higher",parent:line.id,diagnosis:compactDiagnosis(d)});
 ledger(t,"challenge_started",{scope:"B-higher",parent:line.id,target:d.target,examples:d.dataset.length,control:"untargeted_same_compute",verificationSeeds:ss.map(x=>x.envSeed)});
 const championMetrics=await evaluate({group:"B",specs:ss,models:{sharedModel:null,privateModels:t.groupB,higherModel:t.higher}});
 const candidateMetrics=await evaluate({group:"B",specs:ss,models:{sharedModel:null,privateModels:t.groupB,higherModel:candidate}});
 const controlMetrics=await evaluate({group:"B",specs:ss,models:{sharedModel:null,privateModels:t.groupB,higherModel:control}});
 const verdict=decision(championMetrics,candidateMetrics,controlMetrics,c),event={scope:"B-higher",diagnosis:compactDiagnosis(d),training,controlTraining,championMetrics,candidateMetrics,controlMetrics,...verdict};
 if(verdict.promote){t.higher=candidate;t.higherAdam=candidateOpt;line.generation++;line.id="BH-g"+line.generation+"-"+mix32(t.batch*8191).toString(16);line.promotions++;r.totalPromotions++;clearEvidenceFor(t,"B-higher");}
 else{line.rejections++;r.totalRejections++;}
 pushHistory(line,{batch:t.batch,promoted:verdict.promote,diagnosis:compactDiagnosis(d),gain:verdict.gain,controlGain:verdict.controlGain,mechanismAdvantage:verdict.mechanismAdvantage},c.historyCap);
 ledger(t,verdict.promote?"promotion":"rejection",{scope:"B-higher",id:line.id,diagnosis:d.code,...verdict});
 return{ran:true,promote:verdict.promote,...event};
}
async function nextBChallenge(t,evaluate){
 const r=ensureRvsiState(t);
 if(r.B.nextKind==="higher"){
  const h=await challengeHigher(t,evaluate);
  if(h.ran){r.B.nextKind="cell";return h;}
 }
 for(let k=0;k<EGO_COUNT;k++){
  const i=(r.B.nextCell+k)%EGO_COUNT,line=r.B.cells[i],records=evidenceFor(t,"B-cell",i),d=diagnoseLocalEvidence(t.groupB[i],records,r.config,{scope:"B-cell",lastAttemptSeq:line.lastAttemptSeq});
  if(!d.ready)continue;
  r.B.nextCell=(i+1)%EGO_COUNT;r.B.nextKind="higher";
  return challengeLocal(t,evaluate,{scope:"B-cell",line,model:t.groupB[i],cell:i,salt:0xB711+i});
 }
 if(r.B.nextKind!=="higher"){
  const h=await challengeHigher(t,evaluate);
  if(h.ran){r.B.nextKind="cell";return h;}
 }
 return{ran:false,scope:"B",reason:"insufficient_evidence"};
}

export async function runRvsiCycle(t,evaluate){
 const r=ensureRvsiState(t),c=r.config,last=r.lastCycleBatch==null?null:Number(r.lastCycleBatch);
 if(!c.enabled||t.batch<c.warmupBatches||(last!=null&&t.batch-last<c.verifyEveryBatches))return{ran:false,promotions:0,events:[],summary:rvsiSummary(t)};
 const aRecords=evidenceFor(t,"A"),aDiag=diagnoseLocalEvidence(t.groupA,aRecords,c,{scope:"A",lastAttemptSeq:r.A.lastAttemptSeq});
 let a={ran:false,scope:"A",reason:aDiag.reason,counts:aDiag.counts};
 const before=r.totalPromotions,events=[];
 try{
  if(aDiag.ready)a=await challengeLocal(t,evaluate,{scope:"A",line:r.A,model:t.groupA,salt:0xA711});
  const b=await nextBChallenge(t,evaluate);
  if(!a.ran&&!b.ran)return{ran:false,promotions:0,events:[a,b],summary:rvsiSummary(t),reason:"insufficient_evidence"};
  r.lastCycleBatch=t.batch;r.cycles++;
  ledger(t,"cycle_completed",{cycle:r.cycles,batch:t.batch});
  if(a.ran)events.push(a);if(b.ran)events.push(b);
  r.last={batch:t.batch,cycle:r.cycles,events:structuredClone(events),error:null};
 }catch(e){r.last={batch:t.batch,cycle:r.cycles,events:structuredClone(events),error:e?.message||String(e)};ledger(t,"rvsi_error",{cycle:r.cycles,message:r.last.error});}
 return{ran:true,promotions:r.totalPromotions-before,events,summary:rvsiSummary(t),error:r.last?.error||null};
}
export function rvsiSummary(t){
 const r=ensureRvsiState(t),gens=r.B.cells.map(x=>x.generation),ev=evidenceSummary(t);
 return{version:r.version,enabled:r.config.enabled,cycles:r.cycles,lastCycleBatch:r.lastCycleBatch,nextCycleBatch:r.lastCycleBatch==null?Math.max(t.batch,r.config.warmupBatches):r.lastCycleBatch+r.config.verifyEveryBatches,
  A:{generation:r.A.generation,id:r.A.id,promotions:r.A.promotions,rejections:r.A.rejections,lastAttemptSeq:r.A.lastAttemptSeq,lastExperiment:r.A.history.at(-1)||null},
  B:{nextKind:r.B.nextKind,nextCell:r.B.nextCell,minGeneration:Math.min(...gens),maxGeneration:Math.max(...gens),promotions:r.B.cells.reduce((n,x)=>n+x.promotions,0),rejections:r.B.cells.reduce((n,x)=>n+x.rejections,0),lastExperiment:r.B.cells.map(x=>x.history.at(-1)).filter(Boolean).sort((a,b)=>b.batch-a.batch)[0]||null},
  HigherB:{generation:r.B.higher.generation,id:r.B.higher.id,promotions:r.B.higher.promotions,rejections:r.B.higher.rejections,lastExperiment:r.B.higher.history.at(-1)||null},
  evidence:ev,ledger:{entries:r.ledger.entries.length,head:r.ledger.entries.at(-1)?.hash||r.ledger.baseHash},last:r.last,totalPromotions:r.totalPromotions,totalRejections:r.totalRejections,legacyRandomCycles:r.legacyRandomCycles};
}
