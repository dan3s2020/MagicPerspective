import {EGO_COUNT,mapKindForMode} from "./config.js";
import {resolveExactV5RouteIdentity,routeKindForMapKind} from "./v5-procedural-maps.js";
import {diagnoseHigherEvidence,diagnoseLocalEvidence,buildHigherIntervention,buildLocalIntervention,evidenceFor,evidenceSummary,summarizeHigherEvidence,summarizeLocalEvidence,clearEvidenceFor,ensureEvidenceState} from "./rsi-evidence.js";
import {trainLocalFromDiagnosis,trainHigherFromDiagnosis,sha256} from "./rvsi-seil.js";
import {BRSI_ACTIONS,STRENGTHS,actionSpec,brsiFeatures,chooseBrsiAction,createBrsiAdam,createBrsiController,evaluateBrsiExamples,teacherActionIndex,trainBrsiExamples} from "./brsi-controller.js";

export const BRSI_VERSION="v7-brsi1-r1";
export const DEFAULT_BRSI_CONFIG=Object.freeze({
 enabled:true,warmupBatches:4,decisionEveryBatches:1,validationSimulations:16,
 evidenceCapA:768,evidenceCapPerCell:128,evidenceCapHigher:384,
 minSuccessEvidence:24,minFailureEvidence:24,minHigherSuccessEvidence:16,minHigherFailureEvidence:16,minNewEvidence:32,
 targetExamples:96,higherTargetExamples:48,minContrast:.01,
 minScoreGain:.001,maxRejectRegression:.05,maxDistanceRegression:1,
 teacherExampleCap:2048,outcomeExampleCap:1024,bootstrapMinExamples:96,bootstrapHeldoutMin:16,bootstrapAccuracy:.78,bootstrapInterveneHeldoutMin:4,bootstrapInterveneAccuracy:.65,gBootstrapTrainEveryExamples:72,
 gLearningRate:.002,gEpochs:8,gMinLossGain:.002,gAccuracyRegression:.03,gTrainEveryExperiments:6,
 neuralMinConfidence:.34,explorationRate:.08,ledgerCap:256,historyCap:64
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const mix32=x=>{x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;};
function line(id){return{generation:0,id,promotions:0,rejections:0,lastAttemptSeq:0,history:[]};}
export function createBrsiState(overrides={}){
 return{version:BRSI_VERSION,config:{...DEFAULT_BRSI_CONFIG,...overrides},
  A:line("A-g0"),B:{cells:Array.from({length:EGO_COUNT},(_,i)=>line("B"+i+"-g0")),higher:line("BH-g0")},
  G:{generation:0,id:"G-g0",mode:"teacher",promotions:0,rejections:0,teacherExamples:[],outcomeExamples:[],exampleSeq:0,teacherSeen:0,experiments:0,lastTrainExperiment:0,lastTrainTeacherSeen:0,history:[],lastDecision:null,lastTrain:null},
  ledger:{baseHash:"0".repeat(64),nextSeq:0,entries:[]},cycles:0,lastCycleBatch:null,last:null,totalPromotions:0,totalRejections:0};
}
export function ensureBrsiState(t){
 if(!t.brsi||t.brsi.version!==BRSI_VERSION)t.brsi=createBrsiState({enabled:t.brsi?.config?.enabled!==false});
 const r=t.brsi,c=r.config={...DEFAULT_BRSI_CONFIG,...(r.config||{})};
 c.enabled=c.enabled!==false;
 for(const k of["warmupBatches","decisionEveryBatches","validationSimulations","evidenceCapA","evidenceCapPerCell","evidenceCapHigher","minSuccessEvidence","minFailureEvidence","minHigherSuccessEvidence","minHigherFailureEvidence","minNewEvidence","targetExamples","higherTargetExamples","teacherExampleCap","outcomeExampleCap","bootstrapMinExamples","bootstrapHeldoutMin","bootstrapInterveneHeldoutMin","gEpochs","gTrainEveryExperiments","gBootstrapTrainEveryExamples","ledgerCap","historyCap"])c[k]=Math.max(1,Math.floor(finite(c[k],DEFAULT_BRSI_CONFIG[k])));
 for(const k of["minContrast","minScoreGain","maxRejectRegression","maxDistanceRegression","bootstrapAccuracy","bootstrapInterveneAccuracy","gLearningRate","gMinLossGain","gAccuracyRegression","neuralMinConfidence","explorationRate"])c[k]=finite(c[k],DEFAULT_BRSI_CONFIG[k]);
 if(!t.brsiController)t.brsiController=createBrsiController();
 if(!t.brsiAdam)t.brsiAdam=createBrsiAdam(t.brsiController);
 ensureEvidenceState(t);return r;
}
function canonical(v){if(v===undefined)return"null";if(v===null||typeof v!=="object")return JSON.stringify(v);if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";}
function ledger(t,type,payload){
 const r=ensureBrsiState(t),l=r.ledger,prev=l.entries.length?l.entries.at(-1).hash:l.baseHash,e={seq:l.nextSeq++,type,batch:t.batch,payload,prevHash:prev};
 e.hash=sha256(canonical(e));l.entries.push(e);while(l.entries.length>r.config.ledgerCap){const d=l.entries.shift();l.baseHash=d.hash;}return e;
}
export function verifyBrsiLedger(t){
 const r=ensureBrsiState(t),l=r.ledger;let prev=l.baseHash,last=null;
 for(const e of l.entries){if(last!==null&&e.seq!==last+1)return{ok:false,reason:"sequence"};if(e.prevHash!==prev)return{ok:false,reason:"prevHash"};const x={seq:e.seq,type:e.type,batch:e.batch,payload:e.payload,prevHash:e.prevHash};if(sha256(canonical(x))!==e.hash)return{ok:false,reason:"hash"};prev=e.hash;last=e.seq;}
 return{ok:true,entries:l.entries.length,head:prev};
}
function score(m){return 10*finite(m.success)+.002*finite(m.totalReward)-.7*finite(m.rejectRate)-.08*finite(m.worstDistance)-.02*finite(m.meanDistance);}
function verdict(champ,cand,control,c){
 const gain=score(cand)-score(champ),controlGain=score(control)-score(champ),fail=[];
 if(finite(cand.rejectRate)>finite(champ.rejectRate)+c.maxRejectRegression)fail.push("rejectRate");
 if(finite(cand.worstDistance)>finite(champ.worstDistance)+c.maxDistanceRegression)fail.push("worstDistance");
 if(finite(cand.success)+.02<finite(champ.success))fail.push("success");
 const promote=gain>c.minScoreGain&&!fail.length;
 const mechanismAdvantage=gain-controlGain;
 return{promote,gain,controlGain,mechanismAdvantage,metaReward:mechanismAdvantage+.2*gain-(fail.length*.5),fail,championScore:score(champ),candidateScore:score(cand),controlScore:score(control)};
}
function mapGeometryKey(mapKind,envSeed,stage){
 if(routeKindForMapKind(mapKind)){
  const id=resolveExactV5RouteIdentity(mapKind,envSeed);
  return "v5:"+id.stage+":"+id.seed;
 }
 return "v1:"+String(mapKind)+":"+(Number(envSeed)>>>0);
}
function specs(t,count,salt,forbiddenItems=[]){
 const base=mix32((t.batch+1)*104729+t.stage*1000003+salt),offset=(salt>>>0)%997,forbiddenSeeds=new Set(),forbiddenGeometry=new Set();
 const addForbidden=x=>{
  if(x&&typeof x==="object"){
   const seed=Number(x.envSeed)>>>0,mapKind=x.mapKind||null;forbiddenSeeds.add(seed);
   if(mapKind)forbiddenGeometry.add(mapGeometryKey(mapKind,seed,x.stage??t.stage));
  }else forbiddenSeeds.add(Number(x)>>>0);
 };
 for(const x of (t.lastTrainingEnvSpecs?.length?t.lastTrainingEnvSpecs:(t.lastTrainingEnvSeeds||[])))addForbidden(x);
 for(const x of forbiddenItems)addForbidden(x);
 return Array.from({length:count},(_,i)=>{
  const mapKind=mapKindForMode(t.config.mapMode||"stage",offset+i,t.stage);let envSeed=mix32(base+i*2654435761),guard=0,key=mapGeometryKey(mapKind,envSeed,t.stage);
  while((forbiddenSeeds.has(envSeed)||forbiddenGeometry.has(key))&&guard++<128){envSeed=mix32(envSeed+0x9e3779b9+guard);key=mapGeometryKey(mapKind,envSeed,t.stage);}
  if(forbiddenSeeds.has(envSeed)||forbiddenGeometry.has(key))throw new Error("unable to allocate fresh verification map");
  forbiddenSeeds.add(envSeed);forbiddenGeometry.add(key);
  return{envId:i,envSeed,actionSeed:mix32(base^((i+1)*2246822519)^0xB251),mapKind};
 });
}
function histPush(a,x,cap){a.push(x);if(a.length>cap)a.splice(0,a.length-cap);}
function metaPush(g,key,x,cap){x.seq=++g.exampleSeq;g[key].push(x);if(g[key].length>cap)g[key].splice(0,g[key].length-cap);}
function contextLocal(t,scope,cell=null){
 const r=ensureBrsiState(t),lineage=scope==="A"?r.A:r.B.cells[cell],model=scope==="A"?t.groupA:t.groupB[cell],records=evidenceFor(t,scope,cell);
 const summary=summarizeLocalEvidence(model,records,r.config,{lastAttemptSeq:lineage.lastAttemptSeq});
 const teacher=diagnoseLocalEvidence(model,records,r.config,{scope,lastAttemptSeq:lineage.lastAttemptSeq});
 const features=brsiFeatures({summary,scope,lineage,batch:t.batch,recentHistory:lineage.history});
 return{scope,cell,lineage,model,records,summary,teacher,features,teacherAction:teacherActionIndex(teacher,scope)};
}
function contextHigher(t){
 const r=ensureBrsiState(t),lineage=r.B.higher,records=evidenceFor(t,"B-higher"),summary=summarizeHigherEvidence(t.higher,records,r.config,{lastAttemptSeq:lineage.lastAttemptSeq});
 const teacher=diagnoseHigherEvidence(t.higher,records,r.config,{lastAttemptSeq:lineage.lastAttemptSeq});
 const features=brsiFeatures({summary,scope:"B-higher",lineage,batch:t.batch,recentHistory:lineage.history});
 return{scope:"B-higher",cell:null,lineage,model:t.higher,records,summary,teacher,features,teacherAction:teacherActionIndex(teacher,"B-higher")};
}
function allContexts(t){
 const x=[contextLocal(t,"A")];for(let i=0;i<EGO_COUNT;i++)x.push(contextLocal(t,"B-cell",i));x.push(contextHigher(t));return x;
}
function collectTeacherExamples(t,contexts){
 const r=ensureBrsiState(t),g=r.G,c=r.config;
 for(const x of contexts){
  const target=x.summary.ready?x.teacherAction:0,wait=target===0;
  const scopeSalt=x.scope==="A"?11:x.scope==="B-higher"?29:(x.cell??0)*7+3;
  if(wait&&mix32((t.batch+1)*131+scopeSalt)%4!==0)continue;
  metaPush(g,"teacherExamples",{kind:"teacher",features:Float64Array.from(x.features),scope:x.scope,targetAction:target,teacherAction:target,weight:wait?.5:1,batch:t.batch},c.teacherExampleCap);g.teacherSeen++;
 }
}
function teacherPriority(x){
 if(!x.summary.ready||x.teacherAction===0)return-Infinity;
 const contrast=Math.abs(finite(x.teacher?.contrast)),confidence=finite(x.teacher?.confidence,.5);
 return confidence*(.1+contrast)+(x.scope==="A"?.005:0);
}
function chooseTeacher(contexts){return contexts.slice().sort((a,b)=>teacherPriority(b)-teacherPriority(a))[0]||null;}
function explorationIndex(t,ctx,pred,c){
 if(!(c.explorationRate>0)||ctx.scope==="B-higher"&&pred.mask.filter(Boolean).length<=2)return null;
 const q=(mix32((t.batch+1)*7919+(ctx.cell??31)*104729)%10000)/10000;if(q>=c.explorationRate)return null;
 const valid=pred.mask.map((v,i)=>v&&i!==0?i:null).filter(Number.isInteger);if(!valid.length)return null;
 return valid[mix32((t.batch+17)*65537+(ctx.cell??7))%valid.length];
}
function chooseNeural(t,contexts){
 const r=ensureBrsiState(t),c=r.config,candidates=[];
 for(const x of contexts){
  const base=chooseBrsiAction(t.brsiController,x.features,x.scope,{minConfidence:c.neuralMinConfidence});
  const ex=explorationIndex(t,x,base,c),p=ex==null?base:chooseBrsiAction(t.brsiController,x.features,x.scope,{minConfidence:0,exploreIndex:ex});
  if(!x.summary.ready||p.action===0)continue;
  const margin=p.probs[p.action]-p.waitProb;
  candidates.push({ctx:x,pred:p,margin,explored:ex!=null});
 }
 candidates.sort((a,b)=>b.margin-a.margin||b.pred.confidence-a.pred.confidence);
 return candidates[0]||null;
}
function strengthDiagnosis(d,spec){
 const strength=STRENGTHS[spec.strength],n=Math.max(8,Math.ceil(d.dataset.length*strength.exampleFraction));
 return{diagnosis:{...d,dataset:d.dataset.slice(0,n),controlDataset:d.controlDataset.slice(0,n)},strength};
}
function interventionFor(t,ctx,actionIndex){
 const spec=actionSpec(actionIndex),r=ensureBrsiState(t);
 if(spec.intervention==="wait")return{ready:false,reason:"wait",spec};
 const d=ctx.scope==="B-higher"?buildHigherIntervention(t.higher,ctx.records,r.config,{lastAttemptSeq:ctx.lineage.lastAttemptSeq}):buildLocalIntervention(ctx.model,ctx.records,spec.intervention,r.config,{scope:ctx.scope,lastAttemptSeq:ctx.lineage.lastAttemptSeq});
 if(!d.ready)return{ready:false,reason:d.reason,spec};
 const x=strengthDiagnosis(d,spec);return{ready:true,spec,...x};
}
async function runIntervention(t,evaluate,ctx,actionIndex,source){
 const r=ensureBrsiState(t),c=r.config,g=r.G,prep=interventionFor(t,ctx,actionIndex);
 if(!prep.ready)return{ran:false,reason:prep.reason,scope:ctx.scope,cell:ctx.cell,actionIndex};
 const {diagnosis:d,strength,spec}=prep;ctx.lineage.lastAttemptSeq=d.counts.latestSeq;
 let candidate,control,candidateOpt,controlOpt,training,controlTraining,champModels,candModels,ctrlModels;
 if(ctx.scope==="A"||ctx.scope==="B-cell"){
  candidate=structuredClone(ctx.model);control=structuredClone(ctx.model);
  const baseOpt=ctx.scope==="A"?t.groupAAdam:t.groupBAdam[ctx.cell];candidateOpt=structuredClone(baseOpt);controlOpt=structuredClone(baseOpt);
  const rc={...c,targetEpochs:strength.epochs,targetLearningRateScale:strength.lrScale};
  training=trainLocalFromDiagnosis(candidate,d,t.config,rc,candidateOpt);controlTraining=trainLocalFromDiagnosis(control,{...d,dataset:d.controlDataset},t.config,rc,controlOpt);
  if(ctx.scope==="A"){champModels={sharedModel:t.groupA,privateModels:null,higherModel:null};candModels={sharedModel:candidate,privateModels:null,higherModel:null};ctrlModels={sharedModel:control,privateModels:null,higherModel:null};}
  else{const cb=t.groupB.slice(),xb=t.groupB.slice();cb[ctx.cell]=candidate;xb[ctx.cell]=control;champModels={sharedModel:null,privateModels:t.groupB,higherModel:t.higher};candModels={sharedModel:null,privateModels:cb,higherModel:t.higher};ctrlModels={sharedModel:null,privateModels:xb,higherModel:t.higher};}
 }else{
  candidate=structuredClone(t.higher);control=structuredClone(t.higher);candidateOpt=structuredClone(t.higherAdam);controlOpt=structuredClone(t.higherAdam);
  const rc={...c,targetEpochs:strength.epochs,targetLearningRateScale:strength.lrScale};
  training=trainHigherFromDiagnosis(candidate,d,t.config,rc,candidateOpt);controlTraining=trainHigherFromDiagnosis(control,{...d,dataset:d.controlDataset},t.config,rc,controlOpt);
  champModels={sharedModel:null,privateModels:t.groupB,higherModel:t.higher};candModels={sharedModel:null,privateModels:t.groupB,higherModel:candidate};ctrlModels={sharedModel:null,privateModels:t.groupB,higherModel:control};
 }
 const ss=specs(t,c.validationSimulations,0xB251+(ctx.cell??29)*131,d.dataset);
 ledger(t,"brsi_intervention_started",{source,scope:ctx.scope,cell:ctx.cell,G:g.id,action:spec.id,component:d.component,examples:d.dataset.length,strength:spec.strength,verificationSeeds:ss.map(x=>x.envSeed)});
 const group=ctx.scope==="A"?"A":"B";
 const championMetrics=await evaluate({group,specs:ss,models:champModels}),candidateMetrics=await evaluate({group,specs:ss,models:candModels}),controlMetrics=await evaluate({group,specs:ss,models:ctrlModels});
 const v=verdict(championMetrics,candidateMetrics,controlMetrics,c);
 if(v.promote){
  if(ctx.scope==="A"){t.groupA=candidate;t.groupAAdam=candidateOpt;}else if(ctx.scope==="B-cell"){t.groupB[ctx.cell]=candidate;t.groupBAdam[ctx.cell]=candidateOpt;}else{t.higher=candidate;t.higherAdam=candidateOpt;}
  ctx.lineage.generation++;ctx.lineage.id=(ctx.scope==="A"?"A-g":ctx.scope==="B-cell"?"B"+ctx.cell+"-g":"BH-g")+ctx.lineage.generation+"-"+mix32(t.batch*4099+(ctx.cell??37)).toString(16);ctx.lineage.promotions++;r.totalPromotions++;clearEvidenceFor(t,ctx.scope,ctx.cell);
 }else{ctx.lineage.rejections++;r.totalRejections++;}
 const event={ran:true,source,scope:ctx.scope,cell:ctx.cell,G:g.id,actionIndex,action:spec.id,intervention:spec.intervention,strength:spec.strength,component:d.component,hypothesis:d.hypothesis,training,controlTraining,championMetrics,candidateMetrics,controlMetrics,...v,promoted:v.promote};
 histPush(ctx.lineage.history,{batch:t.batch,promoted:v.promote,action:spec.id,gain:v.gain,controlGain:v.controlGain,mechanismAdvantage:v.mechanismAdvantage},c.historyCap);
 ledger(t,v.promote?"target_promotion":"target_rejection",{scope:ctx.scope,cell:ctx.cell,G:g.id,action:spec.id,...v});
 g.experiments++;
 const positive=v.promote&&v.metaReward>0&&v.mechanismAdvantage>0,targetAction=positive?actionIndex:0,weight=clamp(1+Math.abs(v.metaReward)*2,.5,8);
 metaPush(g,"outcomeExamples",{kind:"outcome",features:Float64Array.from(ctx.features),scope:ctx.scope,targetAction,chosenAction:actionIndex,teacherAction:ctx.teacherAction,metaReward:v.metaReward,promoted:v.promote,weight,batch:t.batch},c.outcomeExampleCap);
 return event;
}
function metaDataset(r){
 const g=r.G,teacherScale=g.mode==="teacher"?1:.3;
 return[...g.teacherExamples.map(x=>({...x,weight:(x.weight||1)*teacherScale})),...g.outcomeExamples];
}
function splitMeta(examples){
 const train=[],held=[];for(const x of examples){((x.seq||0)%5===0?held:train).push(x);}return{train,held};
}
function teacherHeldout(g){return g.teacherExamples.filter(x=>(x.seq||0)%5===0);}
export function maybeImproveG(t,force=false){
 const r=ensureBrsiState(t),g=r.G,c=r.config,teacherReady=g.teacherExamples.length>=c.bootstrapMinExamples,teacherDue=teacherReady&&(g.lastTrain==null||g.teacherSeen-g.lastTrainTeacherSeen>=c.gBootstrapTrainEveryExamples),outcomeDue=g.experiments-g.lastTrainExperiment>=c.gTrainEveryExperiments;
 if(!force&&g.mode==="teacher"&&!teacherDue)return{ran:false,reason:"collecting_teacher_meta_experience"};
 if(!force&&g.mode==="neural"&&!outcomeDue)return{ran:false,reason:"collecting_real_meta_outcomes"};
 const ds=splitMeta(metaDataset(r));if(ds.train.length<16||ds.held.length<c.bootstrapHeldoutMin)return{ran:false,reason:"insufficient_meta_holdout",train:ds.train.length,heldout:ds.held.length};
 const champion=structuredClone(t.brsiController),candidate=structuredClone(t.brsiController),candidateOpt=structuredClone(t.brsiAdam);
 const before=evaluateBrsiExamples(champion,ds.held),training=trainBrsiExamples(candidate,ds.train,candidateOpt,{learningRate:c.gLearningRate,epochs:c.gEpochs}),after=evaluateBrsiExamples(candidate,ds.held);
 const teacherBefore=evaluateBrsiExamples(champion,teacherHeldout(g)),teacherAfter=evaluateBrsiExamples(candidate,teacherHeldout(g));
 const lossGain=before.loss-after.loss,accuracyRegression=before.accuracy-after.accuracy,teacherRegression=teacherBefore.accuracy-teacherAfter.accuracy,
   interveneRegression=teacherBefore.interveneAccuracy-teacherAfter.interveneAccuracy;
 const promote=lossGain>c.gMinLossGain&&accuracyRegression<=c.gAccuracyRegression&&teacherRegression<=c.gAccuracyRegression&&interveneRegression<=c.gAccuracyRegression;
 if(promote){t.brsiController=candidate;t.brsiAdam=candidateOpt;g.generation++;g.id="G-g"+g.generation+"-"+mix32(t.batch*12289+g.experiments).toString(16);g.promotions++;}
 else g.rejections++;
 g.lastTrainExperiment=g.experiments;g.lastTrainTeacherSeen=g.teacherSeen;
 const activeEval=evaluateBrsiExamples(promote?t.brsiController:champion,teacherHeldout(g));
 if(g.mode==="teacher"&&g.teacherExamples.length>=c.bootstrapMinExamples&&activeEval.count>=c.bootstrapHeldoutMin&&activeEval.accuracy>=c.bootstrapAccuracy&&activeEval.interveneCount>=c.bootstrapInterveneHeldoutMin&&activeEval.interveneAccuracy>=c.bootstrapInterveneAccuracy)g.mode="neural";
 const event={ran:true,promote,before,after,teacherBefore,teacherAfter,training,lossGain,interveneRegression,mode:g.mode,G:g.id,generation:g.generation};
 histPush(g.history,{batch:t.batch,promoted:promote,lossGain,beforeLoss:before.loss,afterLoss:after.loss,accuracy:after.accuracy,mode:g.mode},c.historyCap);g.lastTrain=event;
 ledger(t,promote?"G_promotion":"G_rejection",{G:g.id,generation:g.generation,lossGain,before,after,teacherBefore,teacherAfter,mode:g.mode});
 return event;
}
export async function runBrsiCycle(t,evaluate){
 const r=ensureBrsiState(t),c=r.config,g=r.G;
 const contexts=allContexts(t);collectTeacherExamples(t,contexts);
 const gTrainBefore=maybeImproveG(t,false);
 const last=r.lastCycleBatch==null?null:Number(r.lastCycleBatch);
 if(!c.enabled||t.batch<c.warmupBatches||(last!=null&&t.batch-last<c.decisionEveryBatches))return{ran:false,promotions:0,events:[],gTrain:gTrainBefore,summary:brsiSummary(t)};
 let selected=null,source=g.mode;
 if(g.mode==="teacher"){
  const ctx=chooseTeacher(contexts);if(ctx&&ctx.summary.ready&&ctx.teacherAction!==0)selected={ctx,actionIndex:ctx.teacherAction,pred:null,explored:false};
 }else selected=chooseNeural(t,contexts);
 if(!selected){r.last={batch:t.batch,decision:"WAIT",source:g.mode};return{ran:false,promotions:0,events:[],gTrain:gTrainBefore,summary:brsiSummary(t),reason:"G_WAIT"};}
 g.lastDecision={batch:t.batch,source,scope:selected.ctx.scope,cell:selected.ctx.cell,action:actionSpec(selected.actionIndex).id,confidence:selected.pred?.confidence??1,waitProb:selected.pred?.waitProb??0,explored:Boolean(selected.explored)};
 ledger(t,"G_decision",g.lastDecision);
 const before=r.totalPromotions,event=await runIntervention(t,evaluate,selected.ctx,selected.actionIndex,source);
 r.lastCycleBatch=t.batch;r.cycles++;
 const gTrainAfter=maybeImproveG(t,false);
 r.last={batch:t.batch,source,event,gTrain:gTrainAfter.ran?gTrainAfter:gTrainBefore};
 return{ran:event.ran,promotions:r.totalPromotions-before,events:event.ran?[event]:[],gTrain:gTrainAfter.ran?gTrainAfter:gTrainBefore,summary:brsiSummary(t)};
}
export function brsiSummary(t){
 const r=ensureBrsiState(t),g=r.G,gens=r.B.cells.map(x=>x.generation),ev=evidenceSummary(t),held=teacherHeldout(g),gEval=held.length?evaluateBrsiExamples(t.brsiController,held):{count:0,loss:0,accuracy:0};
 return{version:r.version,enabled:r.config.enabled,cycles:r.cycles,lastCycleBatch:r.lastCycleBatch,totalPromotions:r.totalPromotions,totalRejections:r.totalRejections,
  A:{generation:r.A.generation,id:r.A.id,promotions:r.A.promotions,rejections:r.A.rejections,lastExperiment:r.A.history.at(-1)||null},
  B:{minGeneration:Math.min(...gens),maxGeneration:Math.max(...gens),promotions:r.B.cells.reduce((n,x)=>n+x.promotions,0),rejections:r.B.cells.reduce((n,x)=>n+x.rejections,0),lastExperiment:r.B.cells.flatMap(x=>x.history.slice(-1)).sort((a,b)=>b.batch-a.batch)[0]||null},
  HigherB:{generation:r.B.higher.generation,id:r.B.higher.id,promotions:r.B.higher.promotions,rejections:r.B.higher.rejections,lastExperiment:r.B.higher.history.at(-1)||null},
  G:{generation:g.generation,id:g.id,mode:g.mode,promotions:g.promotions,rejections:g.rejections,teacherExamples:g.teacherExamples.length,outcomeExamples:g.outcomeExamples.length,experiments:g.experiments,teacherHeldout:gEval,lastDecision:g.lastDecision,lastTrain:g.lastTrain},
  evidence:ev,ledger:{entries:r.ledger.entries.length,head:r.ledger.entries.at(-1)?.hash||r.ledger.baseHash},last:r.last};
}
