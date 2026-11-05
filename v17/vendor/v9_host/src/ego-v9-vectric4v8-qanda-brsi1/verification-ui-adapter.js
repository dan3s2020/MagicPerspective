import {createConnectorAdapter} from "../v9-verification-ui-kit/adapter.js";
import {proofEnvelope} from "../v9-verification-ui-kit/contract.js";
import {CAUSAL_SCHEMA_VERSION} from "./causal-types.js";
import {causalSummary} from "./causal-runtime.js";
import {qandaSummary} from "./qanda-rsi.js";
import {QANDA_VERSION} from "./qanda-brsi-controller.js";
import {PREDICTIVE_LEDGER_VERSION} from "./predictive-causal-ledger.js";
import {PREDICTIVE_CAUSAL_HORIZON_VERSION,nativeHorizonIds} from "./predictive-causal-horizons.js";
import {allocationSnapshot,groupRuntimeSnapshot} from "./group-runtime.js";
import {runReferenceSameDishShadow,sameDishShadowPass} from "./same-dish-shadow-runner.js";

const refs=a=>(a||[]).filter(x=>typeof x==="string"&&x.length);
const latest=a=>Array.isArray(a)&&a.length?a[a.length-1]:null;
const causal=t=>t?.causal||{};
const answers=t=>causal(t).completed||[];
const answerFor=(t,c={})=>c.experience?answers(t).find(x=>x.experienceId===c.experience||x.recordHash===c.experience)||latest(answers(t)):latest(answers(t));
const ansRefs=a=>refs([a?.recordHash,a?.experienceId]);
const curves=a=>({coupled:a?.wholeUpdate?.coupledCausalCurve||[],natural:a?.wholeUpdate?.naturalCausalCurve||[]});
const env=(name,status,summary,data={},evidenceIds=[],problems=[])=>proofEnvelope(name,{status,summary,data,evidenceIds:refs(evidenceIds),problems});
const interactionId=x=>"interaction:"+[x?.experienceA||x?.experiences?.[0]||"?",x?.experienceB||x?.experiences?.[1]||"?",Number(x?.effect||0).toPrecision(8)].join("|");

const COMPLETION=[
 ["PC-01","Verbatim source material remains present and unchanged"],
 ["PC-02","Native Octopus horizon identifiers/status semantics are runtime-verifiable"],
 ["PC-03","Exact frozen-root restoration is proven"],
 ["PC-04","Predictions are committed before resolution"],
 ["PC-05","Every native prediction family is predicted or explicitly NOT_PREDICTED"],
 ["PC-06","Prediction-vs-actual errors persist with provenance"],
 ["PC-07","Recursive winner/contrast expansion exists without automatic promotion"],
 ["PC-08","Parent/root/sibling effects use matched controls"],
 ["PC-09","Native L future-learning horizons use matched ordinary learning"],
 ["PC-10","Complete RSI question set remains represented"],
 ["PC-11","Q&A target is structured rather than a single scalar"],
 ["PC-12","RSI controls provisional inheritance before permanent task-brain mutation"],
 ["PC-13","Oracle correction preserves measured ground truth"],
 ["PC-14","Replay and specialist inheritance effects are causally isolated"],
 ["PC-15","Interaction evidence participates in final recommendation"],
 ["PC-16","Independent champion/challenger/control gate is sole production promotion path"],
 ["PC-17","Source/docs/tests/telemetry agree"],
 ["PC-18","Reproducible end-to-end proof artifact exists"]
];
function completionRows(a){
  const vector=Boolean(a?.rsiPrediction?.causalMetricPredictions),interactionFinal=Boolean(a?.recommendation?.interactionDependencies);
  const pass=new Set();if(vector)pass.add("PC-11");if(interactionFinal)pass.add("PC-15");
  return COMPLETION.map(([id,description])=>({id,description,status:pass.has(id)?"PASS":"UNPROVEN",evidenceIds:pass.has(id)?ansRefs(a):[]}));
}
function selectedInteractions(t,a){const xs=causal(t).interactions||[];if(!a)return xs.slice(-64);return xs.filter(x=>x.experienceA===a.experienceId||x.experienceB===a.experienceId||(x.experiences||[]).includes(a.experienceId)).slice(-64);}
const nativeRows=n=>nativeHorizonIds({cellCount:n}).map(id=>({id,status:"UNPROVEN"}));
function identityRows(lastResult){
  const snap=lastResult?.snapshotB||lastResult?.snapshotA,v9=snap?.v9||{},shadow=runReferenceSameDishShadow(),shadowPass=sameDishShadowPass(shadow.metrics);
  const pass=new Set();if(v9.perspective)pass.add("ND-01");if(v9.cortical)pass.add("CS-01");if(shadowPass)pass.add("DISH-SHADOW-01");
  return[
    ["ID-01","causal self vs other individual"],["ID-02","same-type independent counterpart control"],["ID-03","randomized anonymous organism slots"],["ID-04","observer-truth identity/species isolation"],["ID-05","local counterpart sensing"],["ID-06","learned self-vs-same / self-vs-cross separation"],
    ["SP-01","relational learned species/type concept"],["SP-02","descendant/lineage comparison"],["SP-03","context-dependent comparison across organisms"],
    ["ND-01","latent ND model substrate"],["ND-02","true 1D viewer"],["ND-03","true 2D viewer"],["ND-04","direct 3D viewer"],["ND-05","arbitrary 4D-8D axes + slices"],
    ["CS-01","CorticalSound rich runtime data"],["CS-02","rich whole-organism sound lab UI"],["CS-03","per-cell sound UI"],["CS-04","coalition temporal sound UI"],["CS-05","comparative sound patterns"],
    ["AU-01","audible CorticalSound"],["AU-02","mute/unmute"],["AU-03","volume control"],["AU-04","audio synchronized to playback"],
    ["DISH-SHADOW-01","same-dish causal body shadow falsification lab"],["DISH-01","production multi-organism same-dish runtime"]
  ].map(([id,description])=>({id,description,status:pass.has(id)?"PASS":"UNPROVEN",evidenceIds:pass.has(id)?[id==="DISH-SHADOW-01"?"runtime:same-dish-shadow":"runtime:last-result"]:[]}));
}

export function createV9VerificationUiAdapter({getTrainer,getTrainingPool=()=>null,getOraclePool=()=>null,getReplayStore=()=>null,getLastResult=()=>null,getRuntime=()=>({}),getBuildInfo=()=>({}),getWorkflow=()=>null}={}){
  if(typeof getTrainer!=="function")throw new Error("getTrainer is required");
  const connectors={
    getProvenance:async()=>{
      const t=getTrainer(),b=getBuildInfo()||{},data={gitSha:b.gitSha||"unknown",version:t?.version||"unknown",trainerSchema:t?.schemaVersion??null,causalSchema:CAUSAL_SCHEMA_VERSION,activeBranch:"v9_vectric4v8_q&a_brsi1",configHash:b.configHash||"runtime",buildToken:b.buildToken||"unknown",qandaVersion:QANDA_VERSION,predictiveLedgerVersion:PREDICTIVE_LEDGER_VERSION,nativeHorizonVersion:PREDICTIVE_CAUSAL_HORIZON_VERSION,telemetrySession:b.telemetrySession||"unknown",activeGroups:t?groupRuntimeSnapshot(t).activeGroups:[]};
      const ok=data.version!=="unknown"&&data.trainerSchema!=null;return env("provenance",ok?"PASS":"UNPROVEN","Runtime build/version identity used by every proof panel.",data,ok?["runtime:provenance"]:[]);
    },
    getCompletionMatrix:async ctx=>{const a=answerFor(getTrainer(),ctx),rows=completionRows(a);return env("completionMatrix",rows.every(x=>x.status==="PASS")?"PASS":"UNPROVEN","Completion state comes from explicit evidence only.",{rows},rows.flatMap(x=>x.evidenceIds));},
    getH0Freeze:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("h0Freeze","UNPROVEN","Pre-checkpoint identity exists, but exact world/RNG/scheduler/recurrent/open-transition restore proof is not yet available.",{root:{rootSnapshotId:a?.preCheckpointHash||null,rootHash:a?.preCheckpointHash||null,experienceId:a?.experienceId||null,exactState:null,restoreDiff:null}},ansRefs(a),["Exact H0 snapshot/restore backend remains completion-blocking."]);},
    getInterventionManifest:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("interventionManifest","UNPROVEN","Measured components/alpha exist, but the complete finite recursive InterventionManifest is not persisted.",{interventions:a?[{id:a.experienceId,changeSignature:a.changeSignature,alpha:a.magnitude?.selectedAlpha,componentMask:a.recommendation?.componentMask,componentBetas:a.recommendation?.componentBetas,scope:a.scope?.recommendedScope}]:[]},ansRefs(a));},
    getBranchGraph:async()=>env("branchGraph","UNPROVEN","Required recursive root→WAIT/interventions→winner/contrast→children DAG is not implemented.",{nodes:[],edges:[]},[],["Existing oracle experiments are not the required recursive branch graph."]),
    getBranchSimulations:async()=>env("branchSimulations","UNPROVEN","Counterfactual branch playback streams are not persisted as separate branches.",{streams:[]}),
    getHorizonMatrix:async ctx=>{const t=getTrainer(),a=answerFor(t,ctx),last=getLastResult(),n=Math.max(2,last?.snapshotA?.cubes?.length||last?.snapshotB?.cubes?.length||16);return env("horizonMatrix","UNPROVEN","Native horizon definitions exist, but complete per-experiment native records are not persisted.",{records:nativeRows(n),coverage:{expected:nativeHorizonIds({cellCount:n}).length,resolved:0,legacyFutureLearning:a?curves(a):null}},ansRefs(a));},
    getPredictionVsActual:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("predictionVsActual","UNPROVEN","Pre-oracle Q&A prediction/residuals exist, but immutable native PredictionRecord→ResolutionRecord persistence is incomplete.",{prediction:a?.rsiPrediction||null,actual:a?{recommendation:a.recommendation,wholeUpdate:a.wholeUpdate}:null,errors:a?.rsiResiduals||null},ansRefs(a));},
    getConsequenceVector:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("consequenceVector","UNPROVEN","Structured causal metric predictions exist on the legacy future-learning schedule; the complete native consequence lattice is unfinished.",{predictions:a?.rsiPrediction?.causalMetricPredictions||null,measured:a?curves(a):null},ansRefs(a));},
    getCausalEffects:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("causalEffects","UNPROVEN","Coupled/natural effects exist; recursive parent/root/sibling effects are not complete.",{comparisons:a?{wholeUpdate:a.wholeUpdate,recommendation:a.recommendation}:{}},ansRefs(a));},
    getComponentsMagnitudeScope:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("componentsMagnitudeScope",a?"PASS":"UNPROVEN","Component classification, magnitude search and scope evidence for the selected OracleAnswer.",{components:a?.components||null,magnitude:a?.magnitude||null,scope:a?.scope||null},ansRefs(a));},
    getInteractions:async ctx=>{const t=getTrainer(),a=answerFor(t,ctx),rows=selectedInteractions(t,a),unresolved=a?.interactions?.unresolvedGroups||[],pass=rows.length>0&&unresolved.length===0;return env("interactions",pass?"PASS":(rows.length?"UNPROVEN":"PENDING"),rows.length?"Measured pair/triple interaction evidence is available.":"No resolved interaction for the selection.",{records:rows,unresolved},pass?rows.map(interactionId):[]);},
    getLongHorizon:async ctx=>{const a=answerFor(getTrainer(),ctx);return env("longHorizon","UNPROVEN","Retention/generalization/plasticity exist, but exact native L+1/L+4/L+16/L+64 descendants are incomplete.",{retention:a?.retention||null,generalization:a?.generalization||null,futureLearning:{plasticity:a?.plasticity||null,curve:a?.wholeUpdate?.naturalCausalCurve||[]}},ansRefs(a));},
    getReplayInheritance:async()=>{let stats=null;try{stats=await getReplayStore()?.stats?.();}catch(_){}return env("replayInheritance","UNPROVEN","Replay is operational, but current-experience memory ON/OFF causal inheritance is not isolated.",{replay:{stats,causalIsolation:false}},stats?["runtime:replay"]:[],["Operational replay is not causal replay-inheritance proof."]);},
    getSpecialistInheritance:async()=>{const sp=getLastResult()?.snapshotB?.v9?.specialization||getLastResult()?.snapshotA?.v9?.specialization||null;return env("specialistInheritance","UNPROVEN","Specialist runtime exists, but actionBias/bandBias adaptation is not an isolated causal inheritance branch.",{specialists:{runtime:sp,causalIsolation:false}},sp?["runtime:specialists"]:[]);},
    getQanda:async ctx=>{const t=getTrainer(),a=answerFor(t,ctx),cs=causalSummary(t),qs=qandaSummary(t),prediction=a?.rsiPrediction||cs.last?.prediction||null,measured=a?{recommendation:a.recommendation,components:a.components,magnitude:a.magnitude,scope:a.scope,retention:a.retention,generalization:a.generalization,plasticity:a.plasticity,interactions:a.interactions}:cs.last?.measured||null,residuals=a?.rsiResiduals||cs.last?.residuals||null;return env("qanda",prediction&&measured?"UNPROVEN":"PENDING","Prediction→measured→residual wiring exists; trivial-baseline and complete native-target proof remain missing.",{prediction,measured,residuals,controller:qs},ansRefs(a));},
    getLiveInheritance:async()=>env("liveInheritance","UNPROVEN","RSI does not yet gate the task-brain update before ordinary Adam commits it.",{decisions:[]},[],["This connector intentionally blocks any live-RSI inheritance claim."]),
    getPromotionGate:async()=>env("promotionGate","UNPROVEN","Q&A-controller promotion is not the required production task-brain champion/challenger/control gate.",{champion:null,challenger:null,control:null,verdict:"UNPROVEN"},[],["Production promotion gate is not implemented."]),
    getComputeCoverage:async ctx=>{const t=getTrainer(),a=answerFor(t,ctx),cs=causalSummary(t),gr=groupRuntimeSnapshot(t),tp=getTrainingPool()?.snapshot?.()||null,op=getOraclePool()?.snapshot?.()||null;let replay=null;try{replay=await getReplayStore()?.stats?.();}catch(_){}return env("computeCoverage","UNPROVEN","Worker/runtime counters are real; recursive-node and native-horizon coverage are incomplete.",{counters:{causal:cs,groups:gr,allocation:allocationSnapshot(t,tp),trainingPool:tp,oraclePool:op,replay,runtime:getRuntime()},coverage:{native:"UNPROVEN",legacyFutureLearning:a?curves(a):null}},["runtime:pools","runtime:groups"]);},
    getEvidenceLedger:async()=>{const t=getTrainer(),aa=answers(t),ii=causal(t).interactions||[],records=[...aa.slice(-128).map(x=>({type:"oracle_answer",id:x.recordHash||x.experienceId,experienceId:x.experienceId,recordHash:x.recordHash,root:x.preCheckpointHash})),...ii.slice(-128).map(x=>({type:"interaction",id:interactionId(x),experienceA:x.experienceA,experienceB:x.experienceB,effect:x.effect}))];return env("evidenceLedger","UNPROVEN","Oracle records are inspectable, but the immutable predictive branch ledger is not authoritative yet.",{records,integrity:{recordHashes:aa.every(x=>Boolean(x.recordHash)),predictiveLedgerAuthoritative:false}},records.slice(-4).map(x=>x.id));},
    getRuntimeTests:async()=>env("runtimeTests","UNPROVEN","Test-file presence is not execution evidence. An executed proof manifest must feed this connector.",{tests:[{id:"T-HORIZON",description:"predictive-causal-horizons.test.js",status:"UNPROVEN",evidenceIds:[]},{id:"T-LEDGER",description:"predictive-causal-ledger.test.js",status:"UNPROVEN",evidenceIds:[]},{id:"T-OUTCOME",description:"predictive-causal-outcome.test.js",status:"UNPROVEN",evidenceIds:[]},{id:"T-UIKIT",description:"requirements-ui-kit.test.js",status:"UNPROVEN",evidenceIds:[]}]}),
    getSensoryDiscovery:async()=>{const last=getLastResult(),snap=last?.snapshotB||last?.snapshotA,v9=snap?.v9||{},trace=last?.traceB?.length?last.traceB:last?.traceA||[],has=Boolean(v9.spatial||v9.worldModel||trace.length);return env("sensoryDiscovery",has?"PASS":"UNPROVEN","Observer inspection of local observations, spatial belief and learned world model without policy truth leakage.",{observations:{traceCount:trace.length,last:latest(trace)||null},belief:{spatial:v9.spatial||null,worldModel:v9.worldModel||null,echo:v9.echo||null}},has?["runtime:last-result"]:[]);},
    getCurriculumFrontier:async()=>{const t=getTrainer(),curriculum={stage:t?.stage??null,mapMode:t?.config?.mapMode||null,workflow:getWorkflow?.()||null,swarmMin:t?.config?.swarmSizeMin,swarmMax:t?.config?.swarmSizeMax,physicalDimensions:t?.config?.physicalDimensions};return env("curriculumFrontier",t?"PASS":"UNPROVEN","Current curriculum/workflow frontier and scale/dimension configuration.",{curriculum},t?["runtime:curriculum"]:[]);},
    getVersionDivergence:async()=>{const t=getTrainer(),expected={trainerVersion:"v9-vectric4v8-qanda-brsi1",trainerSchema:100,causalSchema:CAUSAL_SCHEMA_VERSION,qandaVersion:QANDA_VERSION,predictiveLedgerVersion:PREDICTIVE_LEDGER_VERSION,nativeHorizonVersion:PREDICTIVE_CAUSAL_HORIZON_VERSION},actual={trainerVersion:t?.version,trainerSchema:t?.schemaVersion,causalSchema:CAUSAL_SCHEMA_VERSION,qandaVersion:t?.qandaController?.version||QANDA_VERSION,predictiveLedgerVersion:PREDICTIVE_LEDGER_VERSION,nativeHorizonVersion:PREDICTIVE_CAUSAL_HORIZON_VERSION},differences=Object.keys(expected).filter(k=>expected[k]!==actual[k]).map(k=>({field:k,expected:expected[k],actual:actual[k]}));return env("versionDivergence",differences.length?"FAIL":"PASS",differences.length?"Runtime/schema divergence detected.":"Runtime versions match the V9 adapter.",{expected,actual,differences},["runtime:version"]);},
    getIdentitySpeciesNdCorticalAudio:async()=>{const rows=identityRows(getLastResult()),all=rows.every(x=>x.status==="PASS");return env("identitySpeciesNdCorticalAudio",all?"PASS":"UNPROVEN","Completion-blocking Identity / Species / ND / CorticalSound / Audio verification matrix.",{rows},rows.filter(x=>x.status==="PASS").flatMap(x=>x.evidenceIds));}
  };

  const getEvidence=async id=>{
    const t=getTrainer(),aa=answers(t),cc=causal(t);
    if(id==="runtime:provenance")return{...getBuildInfo(),trainerVersion:t?.version,trainerSchema:t?.schemaVersion,qandaVersion:t?.qandaController?.version||QANDA_VERSION};
    if(id==="runtime:pools")return{training:getTrainingPool()?.snapshot?.()||null,oracle:getOraclePool()?.snapshot?.()||null};
    if(id==="runtime:groups")return groupRuntimeSnapshot(t);
    if(id==="runtime:replay")return await getReplayStore()?.stats?.();
    if(id==="runtime:specialists")return getLastResult()?.snapshotB?.v9?.specialization||getLastResult()?.snapshotA?.v9?.specialization||null;
    if(id==="runtime:last-result")return getLastResult();
    if(id==="runtime:curriculum")return{trainer:{stage:t?.stage,config:t?.config},workflow:getWorkflow?.()||null};
    if(id==="runtime:version")return connectors.getVersionDivergence({});
    if(id==="runtime:same-dish-shadow"){
      const r=runReferenceSameDishShadow();
      return{version:1,mode:"shadow",pass:sameDishShadowPass(r.metrics),metrics:r.metrics,calibration:r.calibration,recovery:r.recovery,finalBelief:r.truthStages.final};
    }
    const a=aa.find(x=>x.recordHash===id||x.experienceId===id||x.preCheckpointHash===id);if(a)return a;const q=(cc.interactions||[]).find(x=>interactionId(x)===id);if(q)return q;const qs=qandaSummary(t);if(id===qs.id)return qs;return{error:"EVIDENCE_NOT_FOUND",id};
  };
  const listEntities=async kind=>{
    const t=getTrainer(),aa=answers(t);
    if(kind==="experience")return aa.slice(-128).reverse().map(x=>({id:x.experienceId,label:x.experienceId+" · "+(x.wholeUpdate?.classification||"")}));
    if(kind==="root")return[...new Set(aa.map(x=>x.preCheckpointHash).filter(Boolean))].slice(-128).reverse().map(id=>({id,label:String(id).slice(0,18)}));
    if(kind==="prediction")return aa.filter(x=>x.rsiPrediction).slice(-128).reverse().map(x=>({id:x.recordHash||x.experienceId,label:(x.rsiPrediction?.controllerId||"Q&A")+" · "+x.experienceId}));
    return[];
  };
  return createConnectorAdapter({identity:{adapterId:"v9-vectric4v8-qanda-brsi1-verification-adapter-1",backendVersion:getTrainer()?.version||"v9-vectric4v8-qanda-brsi1"},connectors,getEvidence,listEntities});
}
