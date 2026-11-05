import { DEFAULT_CONFIG, STAGES, mapKindForMode } from "./config.js";
import { WorkerPool } from "./worker-pool.js";
import { createTrainer, evaluateAblations, evaluateAllMapsReadiness, evaluateHeldout, evaluateModuleAblations, processOracleBackground, setTrainerConfig, trainOneGroupBatch } from "./trainer.js";
import { clearTrainerState, loadFrozenRsiState, loadPretrainedState, loadTrainerState, saveFrozenRsiState, savePretrainedState, saveTrainerState } from "./persistence.js";
import { TelemetryClient } from "./telemetry.js";
import { ReplayStore } from "./replay.js";
import { drawBeliefDifference, drawCorticalMonitor, drawHistory, drawPerspectiveProjection, drawPreviewFrame, previewFrameState, drawSameDishBodyBelief, drawSameDishObserverTruth, drawSpatialBelief, drawWorld, summarizeTrace } from "./render.js";
import { LatestCompletedBatchPlayback } from "./playback-policy.js";
import {causalSummary,shouldCaptureOracleBatch,recoverOracleCaptureReservation} from "./causal-runtime.js";
import {qandaSummary} from "./qanda-rsi.js";
import {PRETRAIN_READINESS,RSI_SOURCE_MODES,applyReadinessResult,ensureWorkflowState,pretrainMapMode,simulationCountForSlider,sliderIndexForSimulationCount} from "./workflow.js";
import {activeGroupNames,allocationSnapshot,allGroupsDisabled,ensureGroupRuntime,groupIsEnabled,groupRuntimeSnapshot,markGroupQuiescing,minGroupBatch,recoverGroupRuntimeAfterRestore,requestGroupEnabled,resetGroupMapCursors} from "./group-runtime.js";
import {mountV9VerificationCockpit} from "../v9-verification-ui-kit/component.js";
import {createV9VerificationUiAdapter} from "./verification-ui-adapter.js";
import {applyExperimentalProfile,EXPERIMENTAL_PROFILES,inferExperimentalProfile} from "./experimental-features.js";
import {createFrozenRsiRoot,restoreFrozenRsiRoot,validateFrozenRsiRoot} from "./rsi-freeze.js";
import {CorticalAudioMixer} from "./cortical-audio.js";
import {audioMixGroups} from "./observer-audio.js";
import {architectureShapeSummary,trainerArchitectureCompatible} from "./trainer-compatibility.js";
import {makeWorld} from "./world.js";
import {formatIdentityAmbiguityPair} from "./ui-metrics.js";
import {mountBackendObservatoryPopup} from "../modules/backend-observatory-popup/popup.js";
import {createV9BackendObservatoryAdapter} from "../modules/backend-observatory-popup/adapters/ego-v9-vectric4v8-qanda-brsi1.js";
import {mountRsiInheritanceGatePopup} from "../modules/rsi-inheritance-gate/popup.js";
import {createV9RsiInheritanceGate} from "../modules/rsi-inheritance-gate/adapters/ego-v9-vectric4v8-qanda-brsi1.js";
import {runReferenceSameDishShadow,sameDishShadowPass} from "./same-dish-shadow-runner.js";

const bootBridge=window.__octopusBoot=window.__octopusBoot||{controllerLoaded:false,ready:false,error:null,phase:"html"};
bootBridge.controllerLoaded=true;bootBridge.phase="controller-module-loaded";
const $=id=>document.getElementById(id);
const ui={
  start1:$("start1Btn"),start2:$("start2Btn"),pause:$("pauseBtn"),freezeRsi:$("freezeRsiBtn"),frozenRsiBadge:$("frozenRsiBadge"),sourceMode:$("sourceModeBtn"),reset:$("resetBtn"),capture:$("captureBtn"),exactRender:$("exactRenderBtn"),backendObservatory:$("backendObservatoryBtn"),inheritanceGate:$("inheritanceGateBtn"),groupAToggle:$("groupAToggleBtn"),groupBToggle:$("groupBToggleBtn"),groupAllocation:$("groupAllocationBadge"),
  morphologyMode:$("morphologyMode"),adaptiveKMode:$("adaptiveKMode"),cSpecialization:$("cSpecialization"),experimentalProfile:$("experimentalProfile"),adaptiveBudgetEnabled:$("adaptiveBudgetEnabled"),energyEnabled:$("energyEnabled"),corticalSoundEnabled:$("corticalSoundEnabled"),semanticSoundModule:$("semanticSoundModule"),semanticSoundMode:$("semanticSoundMode"),semanticSoundStatus:$("semanticSoundStatus"),echoEnabled:$("echoEnabled"),spatialCortexEnabled:$("spatialCortexEnabled"),worldModelEnabled:$("worldModelEnabled"),perspectiveEnabled:$("perspectiveEnabled"),organogenesisEnabled:$("organogenesisEnabled"),metaControllerEnabled:$("metaControllerEnabled"),moduleRsiCases:$("moduleRsiCases"),moduleRsiBtn:$("moduleRsiBtn"),moduleRsiInspector:$("moduleRsiInspector"),minCells:$("minCells"),maxCells:$("maxCells"),minK:$("minK"),maxK:$("maxK"),computeBudget:$("computeBudget"),energyBase:$("energyBase"),energyReward:$("energyReward"),beliefGroup:$("beliefGroup"),d4:$("d4Slice"),d5:$("d5Slice"),d4Value:$("d4SliceValue"),d5Value:$("d5SliceValue"),
  simSlider:$("simSlider"),simSliderValue:$("simSliderValue"),readiness:$("mReadiness"),
  curriculum:$("curriculumMode"),mapMode:$("mapMode"),pretrainAutoCurriculum:$("pretrainAutoCurriculum"),horizonMode:$("horizonMode"),carrotStart:$("carrotStart"),carrotStep:$("carrotStep"),carrotMax:$("carrotMax"),aSims:$("groupASims"),bSims:$("groupBSims"),microbatch:$("optimizerMicrobatch"),swarmMin:$("swarmMin"),swarmMax:$("swarmMax"),
  threads:$("threadCount"),nativeMultiGpuEnabled:$("nativeMultiGpuEnabled"),nativeMultiGpuRequired:$("nativeMultiGpuRequired"),nativeGpuTarget:$("nativeGpuTarget"),gpuEnabled:$("gpuEnabled"),gpuRequired:$("gpuRequired"),gpuTarget:$("gpuTarget"),gpuBufferMb:$("gpuBufferMb"),oracleThreads:$("oracleThreadCount"),steps:$("stepsPerEgo"),hz:$("egoHz"),maxActions:$("maxActions"),oracleEnvs:$("oracleEnvCount"),playbackRate:$("playbackRate"),playbackRateValue:$("playbackRateValue"),audioMix:$("audioMixMode"),audioAToggle:$("audioAToggleBtn"),audioBToggle:$("audioBToggleBtn"),audioAVolume:$("audioAVolume"),audioBVolume:$("audioBVolume"),audioAStatus:$("audioAStatus"),audioBStatus:$("audioBStatus"),
  trainerState:$("trainerState"),batch:$("mBatch"),progressMetric:$("mProgress"),stage:$("mStage"),aReturn:$("mAReturn"),bReturn:$("mBReturn"),
  aSuccess:$("mASuccess"),bSuccess:$("mBSuccess"),workers:$("mWorkers"),gpuMetric:$("mGpu"),version:$("mVersion"),rvsiA:$("mRvsiA"),rvsiB:$("mRvsiB"),rvsiH:$("mRvsiH"),rvsiLedger:$("mRvsiLedger"),brsiG:$("mBrsiG"),inheritanceGateMetric:$("mInheritanceGate"),
  mainCanvas:$("mainCanvas"),groupBCanvas:$("groupBCanvas"),historyCanvas:$("historyCanvas"),mentalCanvas:$("mentalCanvas"),corticalCanvas:$("corticalCanvas"),perspectiveCanvas:$("perspectiveCanvas"),differenceCanvas:$("differenceCanvas"),sameDishBeliefCanvas:$("sameDishBeliefCanvas"),sameDishTruthCanvas:$("sameDishTruthCanvas"),sameDishInspector:$("sameDishInspector"),
  stageList:$("stageList"),log:$("log"),inspector:$("inspector"),inspectEgo:$("inspectEgo"),rsiInspector:$("rsiInspector"),
  simulationInspector:$("simulationInspector"),simInspectGroup:$("simInspectGroup"),simInspectOutcome:$("simInspectOutcome"),simInspectPage:$("simInspectPage"),
  nMetric:$("mN"),kMetric:$("mK"),computeMetric:$("mCompute"),energyMetric:$("mEnergy"),perspectiveMetric:$("mPerspective"),carrotMetric:$("mCarrot"),birthMetric:$("mBirths"),retireMetric:$("mRetirements"),fusionMetric:$("mFusions"),specialistMetric:$("mSpecialists"),organMetric:$("mOrgans"),dormantMetric:$("mDormant"),sporeMetric:$("mSporeRebuilds"),morphTimeline:$("morphTimeline"),mapErrorMetric:$("mMapError"),identityMetric:$("mIdentity"),sameDishMetric:$("mSameDishShadow"),oracleWorkers:$("mOracleWorkers"),backendInspector:$("backendInspector")
};

let trainer=null,pool=null,oraclePool=null,replayStore=null,running=false,groupBusy={A:false,B:false},groupProgress={A:null,B:null},maintenanceBusy=false,moduleRsiBusy=false,drainForCheckpoint=false,pendingPretrainFreeze=false,pendingManualFreeze=false,pauseCheckpointPending=false,oracleBusy=false,pendingPoolRebuild=false,pendingOraclePoolRebuild=false,oracleEpoch=0,lastResult=null,latestGroupResults={A:null,B:null},pretrainedAvailable=false,frozenRsiAvailable=false,frozenRsiHash=null,moduleRsiLast=null,manualCaptureRequest=null,heartbeatTimer=null,lastHeartbeatTick=0;
let verificationCockpit=null,backendObservatoryPopup=null,inheritanceGate=null,inheritanceGatePopup=null,buildInfo={gitSha:"unknown",buildToken:null},runtimeUiTimer=null,resourceTuneTimer=null,resourceTuneBusy=false,lastResourceStatus=null,lastGpuProbe=null,criticalControlsBound=false,bootError=null,sameDishShadowDiagnostic=null;
const playback={A:{selector:new LatestCompletedBatchPlayback(),current:null,elapsedSeconds:0,lastMs:0,finished:true},B:{selector:new LatestCompletedBatchPlayback(),current:null,elapsedSeconds:0,lastMs:0,finished:true}};
const telemetry=new TelemetryClient();
const corticalAudio=new CorticalAudioMixer(["A","B"]);
const trainingBusy=()=>Boolean(groupBusy.A||groupBusy.B);
const bothGroupsEnabled=()=>trainer?activeGroupNames(trainer).length===2:false;
function resetLatestGroupResults(){latestGroupResults={A:null,B:null};lastResult=null;}
function bootMessage(){
  if(bootError)return"BOOT ERROR · "+(bootError?.message||String(bootError));
  return trainer?"Trainer ready.":"Trainer is still booting…";
}
function criticalAction(fn){
  return(...args)=>{
    if(bootError){log(bootMessage());return;}
    if(!trainer){log("BOOTING · control received; trainer initialization has not finished yet.");return;}
    try{return fn(...args);}catch(e){log("CONTROL ERROR · "+(e?.stack||e));}
  };
}
function bindCriticalControls(){
  if(criticalControlsBound)return;criticalControlsBound=true;
  if(ui.start1)ui.start1.onclick=criticalAction(()=>{void startPretrain();});
  if(ui.start2)ui.start2.onclick=criticalAction(()=>{void startRsi();});
  if(ui.pause)ui.pause.onclick=criticalAction(()=>{void pauseTraining();});
  if(ui.reset)ui.reset.onclick=criticalAction(()=>{if(trainingBusy()||maintenanceBusy){log("Reset blocked until current atomic work finishes.");return;}if(confirm("Reset current A/B learned models, optimizer state, and curriculum history? The saved pretrained checkpoint is preserved."))void reset();});
  if(ui.groupAToggle)ui.groupAToggle.onclick=criticalAction(()=>toggleTrainingGroup("A"));
  if(ui.groupBToggle)ui.groupBToggle.onclick=criticalAction(()=>toggleTrainingGroup("B"));
  if(ui.sourceMode)ui.sourceMode.onclick=criticalAction(()=>{if(running||trainingBusy())return;const w=workflow(),modes=frozenRsiAvailable?[RSI_SOURCE_MODES.PRETRAIN,RSI_SOURCE_MODES.FAST,RSI_SOURCE_MODES.FROZEN]:[RSI_SOURCE_MODES.PRETRAIN,RSI_SOURCE_MODES.FAST],i=modes.indexOf(w.sourceMode);w.sourceMode=modes[(i+1+modes.length)%modes.length];syncControls();updateMetrics();log("RSI source mode → "+sourceModeLabel().replace("RSI source · ",""));});
  if(ui.trainerState)ui.trainerState.textContent="booting · controls armed";
}
function showBootFailure(error){
  bootError=error instanceof Error?error:new Error(String(error));running=false;bootBridge.error=bootError?.stack||String(bootError);bootBridge.ready=false;bootBridge.phase="boot-error";
  if(ui.trainerState){ui.trainerState.textContent="BOOT ERROR";ui.trainerState.style.color="#ff7f91";}
  const msg=bootError?.stack||String(bootError);log("BOOT FATAL · "+msg);
  let banner=document.getElementById("bootFatalBanner");
  if(!banner){banner=document.createElement("div");banner.id="bootFatalBanner";banner.style.cssText="position:sticky;top:0;z-index:999998;background:#5b111c;color:#fff;border:1px solid #ff7f91;padding:10px 12px;font:12px/1.4 ui-monospace,Consolas,monospace;white-space:pre-wrap";document.body.prepend(banner);}
  banner.textContent="V9 BOOT ERROR — controls remain responsive for diagnostics\n"+msg;
}
function scheduleVerificationCockpit(adapter){
  const host=$("verificationHost");if(!host)return;
  host.textContent="Verification cockpit ready for manual refresh · automatic heavy refresh disabled during boot/training.";
  const run=()=>{try{verificationCockpit=mountV9VerificationCockpit({target:host,adapter,refreshMs:5000,initialRefresh:false,autoRefresh:false});}catch(e){host.textContent="Verification cockpit failed safely: "+(e?.message||e);log("Verification cockpit isolated failure · "+(e?.stack||e));}};
  if(typeof requestIdleCallback==="function")requestIdleCallback(run,{timeout:2000});else setTimeout(run,250);
}
function mergeLatestGroupResult(group,result){
  latestGroupResults[group]=result;
  const a=latestGroupResults.A,b=latestGroupResults.B;
  lastResult={
    row:result.row,
    snapshotA:a?.snapshotA??lastResult?.snapshotA??null,snapshotB:b?.snapshotB??lastResult?.snapshotB??null,
    traceA:a?.traceA??lastResult?.traceA??[],traceB:b?.traceB??lastResult?.traceB??[],
    simulationSummaries:[...(a?.simulationSummaries||[]),...(b?.simulationSummaries||[])]
  };
  return lastResult;
}
function syncGroupControls(){
  if(!trainer)return;const r=groupRuntimeSnapshot(trainer),alloc=allocationSnapshot(trainer,pool?.snapshot?.()||null);
  for(const [g,el] of [["A",ui.groupAToggle],["B",ui.groupBToggle]])if(el){const q=r.groups[g],a=alloc.perGroup[g];el.textContent=`${g} · ${String(q.status).toUpperCase()} · b${q.batch}`;el.dataset.enabled=q.targetEnabled?"true":"false";el.title=`policy ${q.policyVersion} · in-flight ${q.inFlight} · worker share ${Math.round((a?.workerShare||0)*100)}% · completed ${q.completed}`;}
  if(ui.groupAllocation){const a=alloc.perGroup.A,b=alloc.perGroup.B;ui.groupAllocation.textContent=`allocation · A ${Math.round((a.workerShare||0)*100)}% · B ${Math.round((b.workerShare||0)*100)}% · workers ${alloc.workers}`;}
}

function log(msg){
  const d=document.createElement("div");d.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;ui.log.appendChild(d);
  while(ui.log.childNodes.length>160)ui.log.removeChild(ui.log.firstChild);ui.log.scrollTop=ui.log.scrollHeight;
}
function refreshSameDishShadowDiagnostic(){
  try{
    const r=runReferenceSameDishShadow();
    sameDishShadowDiagnostic={pass:sameDishShadowPass(r.metrics),metrics:r.metrics,snapshots:r.snapshots,truthStages:r.truthStages,calibration:r.calibration,recovery:r.recovery};
  }catch(error){
    sameDishShadowDiagnostic={pass:false,error:error?.message||String(error),metrics:null};
  }
  return sameDishShadowDiagnostic;
}
function playbackRate(){return Math.max(.01,Math.min(8,Number(ui.playbackRate?.value)||1));}
function previewDuration(p){return p?.frames?.length?Math.max(0,Number.isFinite(Number(p.durationSeconds))?Number(p.durationSeconds):(p.frames.length-1)/Math.max(1,Number(p.fps)||30)):0;}
function playbackCanvas(group){return group==="A"?ui.mainCanvas:ui.groupBCanvas;}
function audioOwner(group,item){return item?`${group}:b${item.batchNumber}:s${item.simulationId}:pv${item.policyVersion??"?"}`:null;}
function audioMixAllows(group){return audioMixGroups(ui.audioMix?.value||"AB").includes(group);}
function updateAudioControls(){
  for(const group of ["A","B"]){
    const s=corticalAudio.state(group),btn=group==="A"?ui.audioAToggle:ui.audioBToggle,vol=group==="A"?ui.audioAVolume:ui.audioBVolume,status=group==="A"?ui.audioAStatus:ui.audioBStatus;
    if(btn&&s){btn.textContent=group+" audio · "+(s.muted?"MUTED":"ON");btn.dataset.enabled=s.muted?"false":"true";}
    if(vol&&s&&document.activeElement!==vol)vol.value=String(s.volume);
    if(status&&s)status.textContent=group+" · "+(s.owner||"waiting")+(s.muted?" · muted":"");
  }
}
async function enableAudioFromGesture(){try{await corticalAudio.ensureStarted();updateAudioControls();}catch(e){log("Audio unavailable: "+e.message);}}
function toggleAudio(group){
  const s=corticalAudio.state(group);if(!s)return;void enableAudioFromGesture();corticalAudio.setMuted(group,!s.muted);updateAudioControls();
}
function overlayPlayback(group,item){
  const canvas=playbackCanvas(group);if(!canvas||!item)return;const ctx=canvas.getContext("2d"),snap=playback[group].selector.snapshot(),map=String(item.preview?.mapKind||"unknown"),text=group+" · MAP "+map+" · N "+(item.preview?.cellCount||"?")+" · sim "+(Number(item.simulationId||0)+1)+" · batch "+item.batchNumber+" · "+snap.selectionReason;
  ctx.save();ctx.font="12px system-ui";ctx.textBaseline="top";const tw=ctx.measureText(text).width+12,y=Math.max(4,canvas.height-26);ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(6,y,tw,20);ctx.fillStyle="#e6eef8";ctx.fillText(text,12,y+4);ctx.restore();
}
function renderPlayback(group,item,elapsed){
  const p=item?.preview;if(!p?.frames?.length)return false;const frame=Math.min(p.frames.length-1,elapsed*Math.max(.1,Number(p.fps)||30)),state=previewFrameState(p,frame),ok=drawPreviewFrame(playbackCanvas(group),p,frame,true);
  if(ok)overlayPlayback(group,item);
  if(audioMixAllows(group))corticalAudio.update(group,audioOwner(group,item),state?.src?.corticalAudio||null);else corticalAudio.stopGroup(group);
  updateAudioControls();
  return ok;
}
function startPlayback(group,item,now=performance.now()){corticalAudio.stopGroup(group);const p=playback[group];p.current=item;p.elapsedSeconds=0;p.lastMs=now;p.finished=false;}
function enqueuePreview(e){
  const group=e.group;if(!(group in playback)||!e.preview?.frames?.length)return;const item={batchNumber:Number(e.batchNumber)||0,simulationId:Number(e.envId)||0,policyVersion:e.policyVersion,preview:e.preview,done:true};
  const start=playback[group].selector.complete(item);if(start)startPlayback(group,start);
}
function handleWorkerEvent(e){if(e?.type==="preview"){enqueuePreview(e);return;}if(e?.type==="progress"){refreshLiveRuntimePanels();return;}log(`worker ${e?.worker??"?"}: ${e?.message||e?.type||"event"}`);void telemetry.runtimeEvent(e?.type||"worker_event",{pool:e?.pool||null,worker:e?.worker??null,taskId:e?.taskId??null,group:e?.group??null,envId:e?.envId??null,message:e?.message||null,poolSnapshot:e?.poolSnapshot||null});}
function resetPlayback(){corticalAudio.stopAll();for(const p of Object.values(playback)){p.selector.reset();p.current=null;p.elapsedSeconds=0;p.lastMs=0;p.finished=true;}updateAudioControls();}
function renderIdleMaps(){
  if(!trainer||running||trainingBusy())return false;
  const mode=trainer.config?.mapMode||"v1-wide",mapKind=mapKindForMode(mode,0,trainer.stage||0),dim=String(mapKind).startsWith("3d-")?3:2;
  const minN=Math.max(2,Math.floor(Number(trainer.config?.swarmSizeMin)||4)),maxN=Math.max(minN,Math.floor(Number(trainer.config?.swarmSizeMax)||32)),n=Math.max(minN,Math.min(maxN,16));
  try{
    const world=makeWorld(trainer.stage||0,0x5a17c9e3,Math.max(16,Math.floor(Number(trainer.config?.maxGlobalActions)||1024)),mapKind,n,dim);
    for(const [group,canvas] of [["A",ui.mainCanvas],["B",ui.groupBCanvas]]){
      drawWorld(canvas,world,true);
      const ctx=canvas?.getContext?.("2d");if(!ctx)continue;
      const label=`IDLE MAP PREVIEW · ${group} · ${mapKind} · N ${n}`;
      ctx.save();ctx.font="12px system-ui";ctx.textBaseline="top";const w=ctx.measureText(label).width+12;ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(6,44,w,20);ctx.fillStyle="#e6eef8";ctx.fillText(label,12,48);ctx.restore();
    }
    return true;
  }catch(e){
    log("Idle map preview failed: "+(e?.message||e));return false;
  }
}
function previewLoop(now){
  requestAnimationFrame(previewLoop);
  for(const group of ["A","B"]){const p=playback[group],item=p.current;if(!item?.preview?.frames?.length||p.finished)continue;const dt=p.lastMs?Math.max(0,Math.min(.05,(now-p.lastMs)/1000)):0;p.lastMs=now;p.elapsedSeconds+=dt*playbackRate();const duration=previewDuration(item.preview);if(p.elapsedSeconds>duration)p.elapsedSeconds=duration;renderPlayback(group,item,p.elapsedSeconds);if(p.elapsedSeconds+1e-9>=duration){renderPlayback(group,item,duration);p.finished=true;corticalAudio.stopGroup(group);const next=p.selector.finishCurrent();if(next)startPlayback(group,next,now);}}
}
function num(el,fallback,min=1){const n=Number(el.value);return Number.isFinite(n)?Math.max(min,Math.floor(n)):fallback;}
function workflow(){return ensureWorkflowState(trainer);}
function selectedSimulationCount(){return simulationCountForSlider(ui.simSlider?.value??sliderIndexForSimulationCount(ui.aSims?.value||10));}
function syncSimulationSliderFromInputs(){
  if(!ui.simSlider)return;
  const a=Math.max(1,Math.floor(Number(ui.aSims?.value)||1)),b=Math.max(1,Math.floor(Number(ui.bSims?.value)||1)),n=Math.max(1,Math.round((a+b)/2));
  ui.simSlider.value=String(sliderIndexForSimulationCount(n));
  if(ui.simSliderValue)ui.simSliderValue.textContent=a===b?String(a):(a+" / "+b);
}
function applySimulationSlider(){
  const n=selectedSimulationCount();
  ui.aSims.value=String(n);ui.bSims.value=String(n);
  if(ui.simSliderValue)ui.simSliderValue.textContent=String(n);
  if(trainer)setTrainerConfig(trainer,readConfig());
}
function readinessText(){
  const w=workflow(),r=w.lastReadiness;
  if(w.ready)return "READY";
  if(!r)return "not checked";
  return w.readinessStreak+"/"+PRETRAIN_READINESS.checksRequired+" · min "+Math.round((r.minSuccess||0)*100)+"%";
}
function sourceModeLabel(){
  const m=workflow().sourceMode;
  if(m===RSI_SOURCE_MODES.PRETRAIN)return "RSI source · PRETRAINED BRAIN";
  if(m===RSI_SOURCE_MODES.FROZEN)return "RSI source · FROZEN H0";
  return "RSI source · DIRECT LOW-SIM";
}
function savedPretrainTrainer(bundle){return bundle?.trainer??bundle??null;}
function hasRsiWork(){
  const c=trainer?.causal,q=qandaSummary(trainer);
  return Boolean(c?.queue?.length||Object.keys(c?.captures||{}).length||c?.completed?.length||c?.interactions?.length||(q?.records||0)>0||(q?.generation||0)>0);
}

const GROUP_SELECTION_KEY="octopus-v9-vectric4v8-active-groups";
function persistGroupSelection(){
  try{localStorage.setItem(GROUP_SELECTION_KEY,JSON.stringify(activeGroupNames(trainer)));}catch(_){}
}
function restoreGroupSelection(){
  try{
    const raw=localStorage.getItem(GROUP_SELECTION_KEY);if(!raw)return;
    const selected=new Set(JSON.parse(raw));for(const g of ["A","B"]){const wanted=selected.has(g);if(groupIsEnabled(trainer,g)!==wanted)requestGroupEnabled(trainer,g,wanted,Date.now(),"reload_restore");}
  }catch(_){}
}

function readConfig(){
  const a=Math.max(2,num(ui.swarmMin,4,2)),b=Math.max(2,num(ui.swarmMax,32,2)),minCells=Math.max(2,num(ui.minCells,2,2)),maxCells=Math.max(minCells,num(ui.maxCells,64,2)),minK=Math.max(1,num(ui.minK,1,1)),maxK=Math.max(minK,num(ui.maxK,8,1));
  return {
    groupASimulationCount:num(ui.aSims,4000),
    groupBSimulationCount:num(ui.bSims,4000),
    optimizerMicrobatchSize:ui.microbatch?num(ui.microbatch,32):32,
    workerThreadCount:num(ui.threads,4),
    resourceSchedulerVersion:1,
    autoResourceScaling:trainer?.config?.autoResourceScaling!==false,
    cpuTargetUtilization:Math.max(.25,Math.min(.95,Number(trainer?.config?.cpuTargetUtilization)||.82)),
    cpuHighUtilization:Math.max(.5,Math.min(.99,Number(trainer?.config?.cpuHighUtilization)||.94)),
    ramCeilingUtilization:Math.max(.6,Math.min(.98,Number(trainer?.config?.ramCeilingUtilization)||.90)),
    workerOversubscription:Math.max(1,Math.min(3,Number(trainer?.config?.workerOversubscription)||2)),
    resourceTuneMs:Math.max(1000,Math.floor(Number(trainer?.config?.resourceTuneMs)||3000)),
    gpuEnabled:ui.gpuEnabled?.checked!==false,
    gpuRequired:ui.gpuRequired?.checked===true,
    gpuStrictConfigVersion:1,
    gpuTargetUtilization:Math.max(.05,Math.min(1,(Number(ui.gpuTarget?.value)||75)/100)),
    gpuMaxBufferMB:Math.max(8,Math.min(128,Math.floor(Number(ui.gpuBufferMb?.value)||32))),
    nativeGpuConfigVersion:2,
    nativeMultiGpuEnabled:ui.nativeMultiGpuEnabled?.checked!==false,
    nativeMultiGpuRequired:ui.nativeMultiGpuRequired?.checked===true,
    nativeGpuMinDevices:2,
    nativeGpuTargetUtilization:Math.max(.05,Math.min(1,(Number(ui.nativeGpuTarget?.value)||75)/100)),
    nativeGpuVerify:true,
    nativeGpuResidentBuffers:trainer?.config?.nativeGpuResidentBuffers!==false,
    nativeGpuVramTargetFraction:Number(trainer?.config?.nativeGpuVramTargetFraction)||.35,
    nativeGpuVramMaxMB:Math.max(128,Math.floor(Number(trainer?.config?.nativeGpuVramMaxMB)||1536)),
    nativeSharedGpuBufferMaxMB:Math.max(64,Math.floor(Number(trainer?.config?.nativeSharedGpuBufferMaxMB)||256)),
    oracleWorkerThreadCount:ui.oracleThreads?num(ui.oracleThreads,2):Math.max(1,Math.floor((navigator.hardwareConcurrency||8)/4)),
    stepsPerEgoTurn:num(ui.steps,1),
    initialK:num(ui.steps,1),
    egoDecisionHz:Math.max(.1,Number(ui.hz.value)||30),
    maxGlobalActions:num(ui.maxActions,1024),
    mapMode:ui.mapMode?.value||"all-v9",
    pretrainAutoCurriculum:ui.pretrainAutoCurriculum?.checked===true,
    horizonCurriculumMode:ui.horizonMode?.value||trainer?.config?.horizonCurriculumMode||"moving-carrot",
    carrotStartActions:Math.max(16,Math.floor(Number(ui.carrotStart?.value)||100)),
    carrotMinActions:Math.max(16,Math.floor(Number(ui.carrotStart?.value)||100)),
    carrotStepActions:Math.max(1,Math.floor(Number(ui.carrotStep?.value)||50)),
    carrotMaxActions:Math.max(16,Math.floor(Number(ui.carrotMax?.value)||1024)),
    scalableSwarm:true,
    swarmSizeMin:Math.min(a,b),
    swarmSizeMax:Math.max(a,b),
    swarmSizeEvalMultiplier:trainer?.config?.swarmSizeEvalMultiplier||2,
    experimentalProfile:ui.experimentalProfile?.value||trainer?.config?.experimentalProfile||EXPERIMENTAL_PROFILES.CUSTOM,
    mapAdaptiveActionBudget:ui.adaptiveBudgetEnabled?.checked!==false,
    energyEnabled:ui.energyEnabled?.checked!==false,
    corticalSoundEnabled:ui.corticalSoundEnabled?.checked!==false,
    semanticSoundModule:ui.semanticSoundModule?.value||trainer?.config?.semanticSoundModule||"semantic-sound-cortex-v1",
    semanticSoundMode:ui.semanticSoundMode?.value||trainer?.config?.semanticSoundMode||"shadow",
    echoEnabled:ui.echoEnabled?.checked!==false,
    spatialCortexEnabled:ui.spatialCortexEnabled?.checked!==false,
    worldModelEnabled:ui.worldModelEnabled?.checked!==false,
    perspectiveEnabled:ui.perspectiveEnabled?.checked!==false,
    organogenesisEnabled:ui.organogenesisEnabled?.checked!==false,
    metaControllerEnabled:ui.metaControllerEnabled?.checked!==false,
    morphologyMode:ui.morphologyMode?.value||"active",
    adaptiveKMode:ui.adaptiveKMode?.value||"active",
    cSpecializationEnabled:(ui.cSpecialization?.value||"on")!=="off",
    lifecycleMinCells:minCells,
    lifecycleMaxCells:maxCells,
    minK,maxK,
    computeBudgetAtN16:num(ui.computeBudget,4096,64),
    energyBaseAtN16:ui.energyBase?Math.max(1,Number(ui.energyBase.value)||180):(trainer?.config?.energyBaseAtN16||180),
    energyRewardScale:ui.energyReward?Math.max(0,Number(ui.energyReward.value)||.15):(trainer?.config?.energyRewardScale||.15),
    hiddenTruthSensors:false,
    exactMoveRendering:trainer?.config?.exactMoveRendering!==false
  };
}
function readCausalConfig(){
  return{oracleEnvironmentsPerWorker:Math.max(0,Math.floor(Number(ui.oracleEnvs?.value??1)||0))};
}
function syncControls(){
  const c=trainer.config;ensureWorkflowState(trainer);
  ui.aSims.value=c.groupASimulationCount;ui.bSims.value=c.groupBSimulationCount;if(ui.microbatch)ui.microbatch.value=c.optimizerMicrobatchSize??32;ui.threads.value=c.workerThreadCount;if(ui.nativeMultiGpuEnabled)ui.nativeMultiGpuEnabled.checked=c.nativeMultiGpuEnabled!==false;if(ui.nativeMultiGpuRequired)ui.nativeMultiGpuRequired.checked=c.nativeMultiGpuRequired===true;if(ui.nativeGpuTarget)ui.nativeGpuTarget.value=String(Math.round((c.nativeGpuTargetUtilization??.75)*100));if(ui.gpuEnabled)ui.gpuEnabled.checked=c.gpuEnabled!==false;if(ui.gpuRequired)ui.gpuRequired.checked=c.gpuRequired!==false;if(ui.gpuTarget)ui.gpuTarget.value=String(Math.round((c.gpuTargetUtilization??.75)*100));if(ui.gpuBufferMb)ui.gpuBufferMb.value=String(c.gpuMaxBufferMB??32);if(ui.oracleThreads)ui.oracleThreads.value=c.oracleWorkerThreadCount??2;
  if(ui.swarmMin)ui.swarmMin.value=c.swarmSizeMin??4;if(ui.swarmMax)ui.swarmMax.value=c.swarmSizeMax??32;
  if(ui.experimentalProfile)ui.experimentalProfile.value=inferExperimentalProfile(c);
  if(ui.adaptiveBudgetEnabled)ui.adaptiveBudgetEnabled.checked=c.mapAdaptiveActionBudget!==false;
  if(ui.energyEnabled)ui.energyEnabled.checked=c.energyEnabled!==false;
  if(ui.corticalSoundEnabled)ui.corticalSoundEnabled.checked=c.corticalSoundEnabled!==false;
  if(ui.semanticSoundModule)ui.semanticSoundModule.value=c.semanticSoundModule||"semantic-sound-cortex-v1";if(ui.semanticSoundMode)ui.semanticSoundMode.value=c.semanticSoundMode||"shadow";if(ui.semanticSoundStatus)ui.semanticSoundStatus.textContent="SSC · "+(c.semanticSoundMode||"shadow");
  if(ui.echoEnabled)ui.echoEnabled.checked=c.echoEnabled!==false;
  if(ui.spatialCortexEnabled)ui.spatialCortexEnabled.checked=c.spatialCortexEnabled!==false;
  if(ui.worldModelEnabled)ui.worldModelEnabled.checked=c.worldModelEnabled!==false;
  if(ui.perspectiveEnabled)ui.perspectiveEnabled.checked=c.perspectiveEnabled!==false;
  if(ui.organogenesisEnabled)ui.organogenesisEnabled.checked=c.organogenesisEnabled!==false;
  if(ui.metaControllerEnabled)ui.metaControllerEnabled.checked=c.metaControllerEnabled!==false;
  if(ui.morphologyMode)ui.morphologyMode.value=c.morphologyMode||"active";if(ui.adaptiveKMode)ui.adaptiveKMode.value=c.adaptiveKMode||"active";if(ui.cSpecialization)ui.cSpecialization.value=c.cSpecializationEnabled===false?"off":"on";
  if(ui.minCells)ui.minCells.value=c.lifecycleMinCells??2;if(ui.maxCells)ui.maxCells.value=c.lifecycleMaxCells??64;if(ui.minK)ui.minK.value=c.minK??1;if(ui.maxK)ui.maxK.value=c.maxK??8;if(ui.computeBudget)ui.computeBudget.value=c.computeBudgetAtN16??4096;if(ui.energyBase)ui.energyBase.value=c.energyBaseAtN16??180;if(ui.energyReward)ui.energyReward.value=c.energyRewardScale??.15;
  ui.steps.value=c.stepsPerEgoTurn;ui.hz.value=c.egoDecisionHz;ui.maxActions.value=c.maxGlobalActions;
  ui.curriculum.value=String(trainer.stage);if(ui.mapMode)ui.mapMode.value=c.mapMode||"stage";if(ui.pretrainAutoCurriculum)ui.pretrainAutoCurriculum.checked=c.pretrainAutoCurriculum===true;if(ui.horizonMode)ui.horizonMode.value=c.horizonCurriculumMode||"moving-carrot";if(ui.carrotStart)ui.carrotStart.value=String(c.carrotStartActions??100);if(ui.carrotStep)ui.carrotStep.value=String(c.carrotStepActions??50);if(ui.carrotMax)ui.carrotMax.value=String(c.carrotMaxActions??1024);if(ui.oracleEnvs)ui.oracleEnvs.value=trainer.causal?.config?.oracleEnvironmentsPerWorker??1;
  syncSimulationSliderFromInputs();
  if(ui.sourceMode)ui.sourceMode.textContent=sourceModeLabel();
  const strictSourceLock=Boolean(inheritanceGate?.isEnforcing());
  for(const el of [ui.maxActions,ui.horizonMode,ui.carrotStart,ui.carrotStep,ui.carrotMax,ui.adaptiveBudgetEnabled,ui.computeBudget,ui.oracleEnvs].filter(Boolean))el.disabled=strictSourceLock;
  if(strictSourceLock&&ui.oracleEnvs)ui.oracleEnvs.value="0";
  if(ui.frozenRsiBadge)ui.frozenRsiBadge.textContent=frozenRsiAvailable?("H0 · "+String(frozenRsiHash||"?").slice(0,12)):"H0 · none";
  updateAudioControls();
  if(ui.exactRender)ui.exactRender.textContent="Exact move render · "+(c.exactMoveRendering!==false?"ON":"OFF");
  if(ui.readiness)ui.readiness.textContent=readinessText();
  syncGroupControls();
}
function rebuildPool(){
  const hc=navigator.hardwareConcurrency||8,over=Math.max(1,Math.min(3,Number(trainer?.config?.workerOversubscription)||2)),maxWorkers=Math.max(1,Math.min(64,Math.ceil(hc*over))),n=Math.max(1,Math.min(num(ui.threads,Math.max(1,hc)),maxWorkers));ui.threads.value=n;setTrainerConfig(trainer,{workerThreadCount:n});
  if(pool){try{pool.resize(n);}catch(e){log("training pool resize deferred: "+e.message);pendingPoolRebuild=true;return;}}else pool=new WorkerPool(n,handleWorkerEvent,"training");
}
function rebuildOraclePool(){
  if(oraclePool)oraclePool.destroy();
  const hc=navigator.hardwareConcurrency||8;
  const fallback=Math.max(1,Math.min(2,Math.floor(hc/4)||1));
  const n=Math.max(1,Math.min(ui.oracleThreads?num(ui.oracleThreads,fallback):fallback,Math.max(1,hc)));
  if(ui.oracleThreads)ui.oracleThreads.value=n;
  setTrainerConfig(trainer,{oracleWorkerThreadCount:n});
  oraclePool=new WorkerPool(n,handleWorkerEvent,"oracle");
}
function rebuildAllPools(){rebuildPool();rebuildOraclePool();}
function resourceWorkerCap(){
  const hc=navigator.hardwareConcurrency||8,over=Math.max(1,Math.min(3,Number(trainer?.config?.workerOversubscription)||2)),active=trainer?activeGroupNames(trainer):["A","B"];
  const demand=Math.max(1,active.reduce((s,g)=>s+Math.max(1,Math.floor(g==="A"?Number(trainer?.config?.groupASimulationCount)||1:Number(trainer?.config?.groupBSimulationCount)||1)),0));
  return Math.max(1,Math.min(64,Math.ceil(hc*over),demand));
}
async function pollResourceStatus(){
  try{const r=await fetch("/compute/resource/status",{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const s=await r.json();if(s?.ok){lastResourceStatus=s;return s;}}catch(e){if(!lastResourceStatus)log("Resource telemetry unavailable · "+(e?.message||e));}
  return null;
}
async function autoTuneResources(){
  if(resourceTuneBusy||!trainer||!pool||trainer.config.autoResourceScaling===false)return;
  resourceTuneBusy=true;
  try{
    const s=await pollResourceStatus();if(!s)return;
    const cpu=Math.max(0,Math.min(1,(Number(s.cpuPercent)||0)/100)),ram=Math.max(0,Math.min(1,(Number(s.memoryPercent)||0)/100)),target=Math.max(.25,Math.min(.95,Number(trainer.config.cpuTargetUtilization)||.82)),high=Math.max(target+.03,Math.min(.99,Number(trainer.config.cpuHighUtilization)||.94)),ceiling=Math.max(.6,Math.min(.98,Number(trainer.config.ramCeilingUtilization)||.90)),cap=resourceWorkerCap(),current=pool.count;
    let desired=current;
    if(ram>=ceiling&&current>1)desired=Math.max(1,current-Math.max(1,Math.ceil(current*.2)));
    else if(cpu<target-.08&&current<cap)desired=Math.min(cap,current+Math.max(1,Math.ceil((cap-current)*.35)));
    else if(cpu>high&&current>1)desired=Math.max(1,current-1);
    if(desired!==current){
      setTrainerConfig(trainer,{workerThreadCount:desired});if(ui.threads)ui.threads.value=String(desired);
      if(desired>current){try{pool.resize(desired);log("AUTO SCALE · workers "+current+"→"+desired+" · CPU "+Math.round(cpu*100)+"% · RAM "+Math.round(ram*100)+"%");}catch(e){pendingPoolRebuild=true;}}
      else if(trainingBusy()){pendingPoolRebuild=true;}else rebuildPool();
    }
  }finally{resourceTuneBusy=false;}
}

async function probeTrainingGpu(){
  if(!trainer?.config?.gpuEnabled){lastGpuProbe={enabled:false,ready:0,total:pool?.count||0,reasons:["disabled"]};return true;}
  const nativeRequired=trainer.config.nativeMultiGpuEnabled!==false&&trainer.config.nativeMultiGpuRequired===true;
  if(!pool?.count){lastGpuProbe={enabled:true,ready:0,total:0,reasons:["training worker pool unavailable"]};return !(nativeRequired||trainer.config.gpuRequired===true);}
  const probeConfig={gpuEnabled:true,gpuTargetUtilization:trainer.config.gpuTargetUtilization,gpuRequired:false,nativeMultiGpuEnabled:trainer.config.nativeMultiGpuEnabled!==false,nativeMultiGpuRequired:nativeRequired,nativeGpuMinDevices:Math.max(1,Number(trainer.config.nativeGpuMinDevices)||2),nativeGpuTargetUtilization:Number(trainer.config.nativeGpuTargetUtilization)||.75,nativeGpuVerify:true};
  const nativeShared=probeConfig.nativeMultiGpuEnabled!==false,jobs=nativeShared
    ?[pool.submit({type:"gpu-probe",group:"GPU-PROBE",probeIndex:0,config:probeConfig,model:trainer.groupA})]
    :Array.from({length:pool.count},(_,i)=>pool.submit({type:"gpu-probe",group:"GPU-PROBE",probeIndex:i,config:probeConfig}));
  const settled=await Promise.allSettled(jobs),rows=settled.map(x=>x.status==="fulfilled"?x.value?.gpu:null).filter(Boolean),nativeOk=nativeShared&&rows.some(x=>x.available&&x.verified!==false),ready=nativeOk?pool.count:rows.filter(x=>x.available).length,reasons=[...new Set([...rows.map(x=>x.reason).filter(Boolean),...settled.filter(x=>x.status==="rejected").map(x=>x.reason?.message||String(x.reason))])],adapters=[...new Set(rows.map(x=>x.adapter?.description||x.adapter?.device||x.adapter?.vendor).filter(Boolean))],devices=[...new Set(rows.flatMap(x=>(x.devices||[]).map(d=>d.name||d.device||d.vendor).filter(Boolean)))];
  const target=trainer.config.nativeMultiGpuEnabled!==false?(Number(trainer.config.nativeGpuTargetUtilization)||.75):(Number(trainer.config.gpuTargetUtilization)||.75);
  lastGpuProbe={enabled:true,ready,total:pool.count,reasons,adapters,devices,target,native:trainer.config.nativeMultiGpuEnabled!==false};
  if(nativeOk)trainer.config.nativeGpuVerify=false;
  log((lastGpuProbe.native?"NATIVE MULTI-GPU":"WebGPU")+" preflight · "+ready+"/"+pool.count+" workers ready · target "+Math.round(target*100)+"% per GPU"+(devices.length?" · devices "+devices.join(" + "):(adapters.length?" · "+adapters.join(", "):""))+(nativeOk?" · full-gradient parity PASS on both GPUs":"")+(reasons.length?" · "+reasons.join(" | "):""));
  if(!ready&&nativeRequired){log("START blocked · native dual-GPU mode requires "+Math.max(1,Number(trainer.config.nativeGpuMinDevices)||2)+" hardware GPU devices.");return false;}
  if(!ready&&trainer.config.gpuRequired===true){log("START blocked · strict GPU fallback mode is ON and no hardware GPU backend is available.");return false;}
  if(!ready)log("GPU backend unavailable · CPU fallback remains enabled.");
  return true;
}

function renderStages(){
  ui.stageList.textContent="";
  STAGES.forEach((s,i)=>{
    const r=document.createElement("div");r.className="stage-row"+(i===trainer.stage?" active":"")+(i<trainer.stage?" done":"");
    const n=document.createElement("div");n.className="num";n.textContent=i<trainer.stage?"✓":String(i+1);
    const name=document.createElement("div");name.textContent=s.name;
    const rule=document.createElement("div");rule.textContent=i===5?"randomized":`>${Math.round(s.pass*100)}%`;
    r.append(n,name,rule);ui.stageList.appendChild(r);
  });
}
function fmt(x,n=2){return Number.isFinite(Number(x))?Number(x).toFixed(n):"—";}
async function kickOracle(){
  if(oracleBusy||!oraclePool||!trainer?.causal?.config?.enabled||!trainer.causal.queue?.length)return;
  const target=trainer,epoch=oracleEpoch;oracleBusy=true;updateMetrics();
  try{
    const out=await processOracleBackground(oraclePool,target,Math.max(1,oraclePool.count));
    if(target!==trainer||epoch!==oracleEpoch)return;
    for(const ev of out.events||[])log(ev?.error?"ORACLE ERROR · "+ev.error.message:"ORACLE BG · "+(ev.experienceId||"?")+" · "+(ev.classification||"")+" · "+(ev.recommendation?.status||""));
    const gp=inheritanceGate?.ingestOracleEvents(out.events||[])||null;
    if(inheritanceGate?.isFaulted()){
      running=false;trainer.causal.config.enabled=false;log("STRICT RSI GATE stopped training fail-closed · "+(inheritanceGate.snapshot(trainer).last?.message||"oracle fault"));
    }else if(gp?.ready){
      const commit=inheritanceGate.finalize(trainer);
      log("STRICT RSI CANONICAL COMMIT · "+commit.group+" · accepted "+commit.accepted+" / rejected "+commit.rejected+" · Q&A verified "+commit.qandaControlled+" · oracle teacher "+commit.oracleTeacherControlled+" · policy "+commit.finalPolicyVersion);
      const committedRow=trainer.history.at(-1)||null;
      if(committedRow)void telemetry.batch(trainer,{group:commit.group,row:committedRow,traceA:[],traceB:[]});
      void telemetry.runtimeEvent("rsi_canonical_commit",{captureId:commit.captureId,group:commit.group,batch:trainer.batch,policyVersion:trainer.policyVersion,accepted:commit.accepted,rejected:commit.rejected,qandaControlled:commit.qandaControlled,oracleTeacherControlled:commit.oracleTeacherControlled,coverage:commit.coverage});
      await persist();updateMetrics();await maybeRunMaintenance();
    }else if(out.ran&&!inheritanceGate?.hasPending())await persist();
  }catch(e){
    if(target===trainer&&epoch===oracleEpoch){
      log("ORACLE BG FATAL: "+(e?.stack||e));
      if(inheritanceGate?.isEnforcing()){inheritanceGate.fault(e,{stage:"oracle_background"});running=false;trainer.causal.config.enabled=false;}
    }
  }finally{
    if(target===trainer&&epoch===oracleEpoch){
      oracleBusy=false;updateMetrics();
      if(trainer.causal?.config?.enabled&&trainer.causal.queue?.length)setTimeout(kickOracle,0);
      else if(running&&!inheritanceGate?.hasPending())kickGroupLoops();
      await finalizeQuiescentWork();
    }
  }
}

function updateRsiInspector(){
  if(!ui.rsiInspector||!trainer)return;
  const cs=causalSummary(trainer),qs=qandaSummary(trainer),last=cs.last||{};
  const lines=[
    "V9 causal learning oracle "+(cs.enabled?"ON":"OFF"),
    "Queue: "+cs.queue+" · active captures "+cs.captures+" · completed answers "+cs.completed+" · interactions "+cs.interactions,
    "Retention battery: "+String(cs.retentionBattery||"").slice(0,12),
    "Generalization battery: "+String(cs.generalizationBattery||"").slice(0,12),
    "",
    "Q&A RSI: "+qs.id+" · generation "+qs.generation+" · records "+qs.records,
    "Held-out: n="+(qs.heldout?.count||0)+" · loss "+fmt(qs.heldout?.loss,4)+" · decision accuracy "+Math.round((qs.heldout?.accuracy||0)*100)+"%",
    "Promotions/rejections: "+qs.promotions+"/"+qs.rejections
  ];
  if(inheritanceGate?.isEnforcing()){
    const gs=inheritanceGate.snapshot(trainer),p=gs.pending;
    lines.push("","STRICT INHERITANCE GATE: "+gs.phase+(p?(" · "+p.resolved+"/"+p.expected+" oracle decisions · "+p.captureId):" · canonical brain clear"));
    lines.push("Canonical updates wait for oracle completion · Q&A controls inheritance only when its proposal is independently verified; otherwise oracle teacher is used.");
    lines.push("Frozen/live maxGlobalActions: "+String(gs.source.maxGlobalActions??"—")+" / "+String(gs.runtime?.actionBudget?.maxGlobalActions??"—")+" · carrot "+String(gs.runtime?.actionBudget?.horizonAtN16??"—"));
  }
  if(last.experienceId){
    lines.push("","Last oracle experience: "+last.experienceId);
    lines.push("Classification: "+last.classification);
    lines.push("Inheritance: "+(last.recommendation?.status||"—")+" · α "+fmt(last.recommendation?.alpha,3));
    if(last.prediction&&last.measured){
      lines.push("Q&A predicted: "+last.prediction.status+" · α "+fmt(last.prediction.alpha,3)+" · controller "+(last.prediction.controllerId||"—"));
      lines.push("Oracle measured: "+last.measured.status+" · α "+fmt(last.measured.alpha,3)+" · retention "+(last.measured.retentionFeasible?"PASS":"FAIL"));
      const rr=last.residuals||{},cr=rr.causalResiduals||[];
      lines.push("Residuals: α "+fmt(rr.alpha,4)+" · status "+(rr.statusMatch?"MATCH":"MISS")+" · causal max |e| "+fmt(cr.length?Math.max(...cr.map(x=>Math.abs(Number(x)||0))):0,4));
      const comps=Object.entries(rr.componentResiduals||{}).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,3);
      if(comps.length)lines.push("Top component residuals: "+comps.map(([k,v])=>k+" "+fmt(v,3)).join(" · "));
    }
    if(last.edge)lines.push("Interaction: "+last.edge.label+" · "+fmt(last.edge.effect,4));
  }else if(last.error)lines.push("","Last oracle error: "+last.error.message);
  if(qs.lastTrain){
    lines.push("","Last Q&A challenger: "+(qs.lastTrain.promote?"PROMOTED":"rejected")+" · held-out loss gain "+fmt(qs.lastTrain.lossGain,4));
    if(qs.lastTrain.recursive)lines.push("Recursive downstream gate: "+(qs.lastTrain.recursive.pass?"PASS":"FAIL")+" · target-learner advantage "+fmt(qs.lastTrain.recursive.downstream?.advantage,4));
  }
  ui.rsiInspector.textContent=lines.join("\n");
}
function refreshLiveRuntimePanels(){
  if(!trainer)return;
  const w=workflow(),phase=w.phase==="pretrain"?"PRETRAIN":(w.phase==="rsi"?"RSI LIVE":(w.phase==="frozen-rsi"?"FROZEN H0 RSI":(w.phase==="direct-rsi"?"DIRECT RSI":(w.ready?"READY":"PAUSED"))));
  const busyGroups=["A","B"].filter(g=>groupBusy[g]);
  const progressText=["A","B"].map(g=>{
    const p=groupProgress[g],total=g==="A"?trainer.config.groupASimulationCount:trainer.config.groupBSimulationCount;
    return p?(g+" "+(p.offset??0)+"→"+(p.end??"?")+"/"+total):(g+" idle");
  }).join(" · ");
  if(ui.progressMetric)ui.progressMetric.textContent=progressText;
  const runtimeLabel=running?(busyGroups.length?phase+" · training "+busyGroups.join("+"):(allGroupsDisabled(trainer)?phase+" · QUIESCENT":phase+" · queued")):phase;
  const gateSnap=inheritanceGate?.isEnforcing()?inheritanceGate.snapshot(trainer):null,gateTag=gateSnap?.pending?(" · GATE "+gateSnap.pending.resolved+"/"+gateSnap.pending.expected):(gateSnap?.enforcing?" · GATE READY":"");
  if(ui.trainerState)ui.trainerState.textContent=runtimeLabel+(oracleBusy?" · ORACLE BG":"")+gateTag;
  if(ui.backendInspector){
    const tp=pool?.snapshot?.()||null,op=oraclePool?.snapshot?.()||null,cs2=causalSummary(trainer),gr=groupRuntimeSnapshot(trainer),gpuRow=lastResult?.row?.gpu||trainer.history.at(-1)?.gpu||null;
    const liveTasks=tp?.workers?.filter(x=>x.busy).map(x=>{const q=x.progress;return "w"+x.id+":"+(x.group||"?")+" "+(q?(q.done+"/"+q.total+" env · "):"")+Math.round(x.runMs||0)+"ms";}).join(" · ")||"idle";
    ui.backendInspector.textContent=[
      "TRAIN pool: "+(tp?tp.busy+"/"+tp.count+" busy · queue "+tp.queued+" · pending "+tp.pending+" · max live "+Math.round(Math.max(0,...tp.workers.map(x=>x.runMs||0)))+"ms · done "+(tp.stats.completed||0)+" · avg "+Math.round((tp.stats.totalRunMs||0)/Math.max(1,tp.stats.completed||0))+"ms":"—"),
      "Live tasks: "+liveTasks,
      "Batch work: "+progressText,
      "GPU train: "+(gpuRow?.active?((gpuRow.adapters?.join(", ")||"GPU")+" · verified "+gpuRow.verified+"/"+gpuRow.workers+" · records "+gpuRow.records+" · dispatches "+gpuRow.dispatches+" · offload "+Math.round((gpuRow.actualShare||0)*100)+"% · device target "+Math.round((gpuRow.targetUtilization||trainer.config.nativeGpuTargetUtilization||.75)*100)+"% · queue "+Math.round(gpuRow.queueWaitMs||0)+"ms"):(trainer.config.gpuEnabled===false?"OFF":((gpuRow?.reasons?.[0]||lastGpuProbe?.reasons?.[0])?("GPU unavailable · "+(gpuRow?.reasons?.[0]||lastGpuProbe.reasons[0])):((trainer.config.nativeMultiGpuRequired===true||trainer.config.gpuRequired===true)?"STRICT · waiting":"warming / CPU fallback")))),
      "GPU devices: "+(gpuRow?.devices?.length?gpuRow.devices.map(d=>{const mb=(Number(d.residentBytes)||0)/1048576,gm=(Number(d.globalMem)||0)/1048576,mem=d.hostUnifiedMemory?("shared staging "+mb.toFixed(0)+"MB"):("VRAM "+mb.toFixed(0)+"/"+gm.toFixed(0)+"MB");return d.name+" · duty "+Math.round((d.duty||0)*100)+"%/"+Math.round((d.targetDuty||gpuRow.targetUtilization||.75)*100)+"% · "+mem+" · q "+Math.round(d.queueWaitMs||0)+"ms · records "+(d.records||0);}).join(" | "):(lastGpuProbe?.devices?.length?lastGpuProbe.devices.join(" + "):"waiting")),
      "ORACLE pool: "+(op?op.busy+"/"+op.count+" busy · queue "+op.queued+" · pending "+op.pending+" · max live "+Math.round(Math.max(0,...op.workers.map(x=>x.runMs||0)))+"ms":"—"),
      "Oracle runtime: "+(oracleBusy?"RUNNING":"idle")+" · causal queue "+cs2.queue+" · captures "+cs2.captures,
      "Groups: A "+gr.groups.A.status+" b"+gr.groups.A.batch+" pv"+gr.groups.A.policyVersion+" in-flight "+gr.groups.A.inFlight+" · B "+gr.groups.B.status+" b"+gr.groups.B.batch+" pv"+gr.groups.B.policyVersion+" in-flight "+gr.groups.B.inFlight,
      "Scheduler: "+gr.scheduler.policy+" · active ["+gr.activeGroups.join(",")+"]",
      "Policy version "+trainer.policyVersion+" · Q&A "+(qandaSummary(trainer).id||"QG-g0")
    ].join("\n");
  }
}
function updateMetrics(row=null){
  ui.batch.textContent=String(trainer.batch);ui.stage.textContent=STAGES[trainer.stage].name;
  const r=row||trainer.history.at(-1);
  ui.aReturn.textContent=r?fmt(r.A.totalReward,1):"—";ui.bReturn.textContent=r?fmt(r.B.totalReward,1):"—";
  ui.aSuccess.textContent=r?`${Math.round(r.A.success*100)}%`:"—";ui.bSuccess.textContent=r?`${Math.round(r.B.success*100)}%`:"—";
  ui.workers.textContent=pool?String(pool.count):"—";const gpuRow=r?.gpu||trainer.history.at(-1)?.gpu||null;if(ui.gpuMetric){const adapter=gpuRow?.adapters?.[0]||lastGpuProbe?.adapters?.[0]||"GPU",reason=gpuRow?.reasons?.[0]||lastGpuProbe?.reasons?.[0]||"",duties=gpuRow?.devices?.length?gpuRow.devices.map(d=>Math.round((d.duty||0)*100)+"%").join("+"):"",resident=gpuRow?.devices?.length?gpuRow.devices.map(d=>(Number(d.residentBytes)||0)/1048576):[];ui.gpuMetric.textContent=trainer.config.gpuEnabled===false?"OFF":(gpuRow?.active?("ON · "+Math.round((gpuRow.actualShare||0)*100)+"% offload · "+(duties?duties+" duty · ":"")+(resident.length?"resident "+resident.map(x=>x.toFixed(0)+"MB").join("+")+" · ":"")+adapter):(reason?("GPU · "+reason):((trainer.config.nativeMultiGpuRequired===true||trainer.config.gpuRequired===true)?"STRICT · warming":"warming / CPU")));}if(ui.oracleWorkers)ui.oracleWorkers.textContent=oraclePool?String(oraclePool.count)+(oracleBusy?" · busy":""):"—";ui.version.textContent=String(trainer.policyVersion);
  const cs=causalSummary(trainer),qs=qandaSummary(trainer);
  if(ui.rvsiA)ui.rvsiA.textContent="queue "+cs.queue;
  if(ui.rvsiB)ui.rvsiB.textContent="answers "+cs.completed;
  if(ui.rvsiH)ui.rvsiH.textContent="interactions "+cs.interactions;
  if(ui.rvsiLedger)ui.rvsiLedger.textContent=(cs.enabled?"ON":"OFF")+" · captures "+cs.captures+" · errors "+cs.errors;
  if(ui.brsiG)ui.brsiG.textContent=qs.id+" · H "+Math.round((qs.heldout?.accuracy||0)*100)+"%";
  if(ui.inheritanceGateMetric){
    const gs=inheritanceGate?.snapshot(trainer);
    ui.inheritanceGateMetric.textContent=!gs?.enforcing?"OFF":(gs.phase==="FAULT"?"FAULT":(gs.pending?("WAIT "+gs.pending.resolved+"/"+gs.pending.expected):"STRICT · READY"));
  }
  if(ui.semanticSoundStatus){const sr=r||trainer.history.at(-1);ui.semanticSoundStatus.textContent="SSC · "+(trainer.config.semanticSoundMode||"off")+(sr?.semanticSoundEpisodes?(" · ep "+sr.semanticSoundEpisodes):"");}
  if(ui.sameDishMetric){
    const d=sameDishShadowDiagnostic||refreshSameDishShadowDiagnostic(),m=d?.metrics;
    ui.sameDishMetric.textContent=d?.error?("ERROR · "+d.error):(d?.pass?("PASS · S "+Math.round((m?.selfOnSelf||0)*100)+"% · T "+Math.round((m?.toolOnTool||0)*100)+"% · O "+Math.round((m?.otherOnOther||0)*100)+"%"):"UNPROVEN");
  }
  const w=workflow(),phase=w.phase==="pretrain"?"PRETRAIN":(w.phase==="rsi"?"RSI LIVE":(w.phase==="frozen-rsi"?"FROZEN H0 RSI":(w.phase==="direct-rsi"?"DIRECT RSI":(w.ready?"READY":"PAUSED"))));
  const gr=groupRuntimeSnapshot(trainer),busyGroups=["A","B"].filter(g=>groupBusy[g]),runtimeLabel=running?(busyGroups.length?phase+" · training "+busyGroups.join("+"):(allGroupsDisabled(trainer)?phase+" · QUIESCENT":phase+" · queued")):phase;
  const gateSnap=inheritanceGate?.isEnforcing()?inheritanceGate.snapshot(trainer):null,gateTag=gateSnap?.pending?(" · GATE "+gateSnap.pending.resolved+"/"+gateSnap.pending.expected):(gateSnap?.enforcing?" · GATE READY":"");
  ui.trainerState.textContent=runtimeLabel+(oracleBusy?" · ORACLE BG":"")+gateTag;
  if(ui.readiness)ui.readiness.textContent=readinessText();
  if(ui.sourceMode){ui.sourceMode.textContent=sourceModeLabel();ui.sourceMode.disabled=running||trainingBusy()||Boolean(inheritanceGate?.isEnforcing());}
  if(ui.start1)ui.start1.disabled=running||trainingBusy();
  if(ui.start2)ui.start2.disabled=running||trainingBusy()||(w.sourceMode===RSI_SOURCE_MODES.PRETRAIN&&!w.ready&&!pretrainedAvailable)||(w.sourceMode===RSI_SOURCE_MODES.FROZEN&&!frozenRsiAvailable);
  if(ui.pause)ui.pause.disabled=!running;
  if(ui.freezeRsi)ui.freezeRsi.disabled=moduleRsiBusy||Boolean(inheritanceGate?.hasPending());
  if(ui.groupAToggle)ui.groupAToggle.disabled=Boolean(inheritanceGate?.hasPending());
  if(ui.groupBToggle)ui.groupBToggle.disabled=Boolean(inheritanceGate?.hasPending());
  if(ui.moduleRsiBtn){ui.moduleRsiBtn.disabled=running||trainingBusy()||oracleBusy||moduleRsiBusy||!frozenRsiAvailable;ui.moduleRsiBtn.textContent=moduleRsiBusy?"H0 MODULE RSI · RUNNING…":"RUN H0 MODULE RSI";}
  if(ui.mapMode)ui.mapMode.disabled=running&&w.phase==="pretrain"&&trainer.config.pretrainAutoCurriculum===true;
  if(ui.curriculum)ui.curriculum.disabled=running&&w.phase==="pretrain";
  if(ui.backendInspector){
    const tp=pool?.snapshot?.()||null,op=oraclePool?.snapshot?.()||null,cs2=causalSummary(trainer);
    ui.backendInspector.textContent=[
      "TRAIN pool: "+(tp?tp.busy+"/"+tp.count+" busy · queue "+tp.queued+" · pending "+tp.pending+" · max live "+Math.round(Math.max(0,...tp.workers.map(x=>x.runMs||0)))+"ms · done "+(tp.stats.completed||0)+" · avg "+Math.round((tp.stats.totalRunMs||0)/Math.max(1,tp.stats.completed||0))+"ms":"—"),
      "ORACLE pool: "+(op?op.busy+"/"+op.count+" busy · queue "+op.queued+" · pending "+op.pending+" · max live "+Math.round(Math.max(0,...op.workers.map(x=>x.runMs||0)))+"ms":"—"),
      "Oracle runtime: "+(oracleBusy?"RUNNING":"idle")+" · causal queue "+cs2.queue+" · captures "+cs2.captures,
      "Groups: A "+gr.groups.A.status+" b"+gr.groups.A.batch+" pv"+gr.groups.A.policyVersion+" in-flight "+gr.groups.A.inFlight+" · B "+gr.groups.B.status+" b"+gr.groups.B.batch+" pv"+gr.groups.B.policyVersion+" in-flight "+gr.groups.B.inFlight,
      "Scheduler: "+gr.scheduler.policy+" · no global barrier "+gr.scheduler.noGlobalBarrier+" · active ["+gr.activeGroups.join(",")+"] · allocation A/B "+Math.round((allocationSnapshot(trainer,tp).perGroup.A.workerShare||0)*100)+"/"+Math.round((allocationSnapshot(trainer,tp).perGroup.B.workerShare||0)*100)+"%",
      "HOST: "+(lastResourceStatus?.ok?("CPU "+Math.round(Number(lastResourceStatus.cpuPercent)||0)+"% · RAM "+Math.round(Number(lastResourceStatus.memoryPercent)||0)+"% · workers "+(pool?.count||0)+"/"+resourceWorkerCap()+" · auto "+(trainer.config.autoResourceScaling===false?"OFF":"ON")):"resource telemetry warming"),
      "LR brain "+fmt(trainer.config.learningRate,6)+" · LR meta "+fmt(trainer.config.metaLearningRate,6)+" · LR Q&A "+fmt(trainer.qanda?.config?.learningRate,6),
      "Policy version "+trainer.policyVersion+" · Q&A "+(qandaSummary(trainer).id||"QG-g0")
    ].join("\n");
  }
  renderStages();drawHistory(ui.historyCanvas,trainer.history);updateRsiInspector();updateWorldModelPanels();refreshLiveRuntimePanels();
}
function syncInspectorOptions(count){
  const n=Math.max(0,Math.floor(Number(count)||0)),selected=Math.max(0,Number(ui.inspectEgo?.value)||0);
  if(!ui.inspectEgo)return;
  if(ui.inspectEgo.options.length===n)return;
  ui.inspectEgo.textContent="";
  for(let i=0;i<n;i++){const o=document.createElement("option");o.value=String(i);o.textContent=`EGO ${i}`;ui.inspectEgo.appendChild(o);}
  if(n)ui.inspectEgo.value=String(Math.min(selected,n-1));
}
function showDisabledCanvas(canvas,label){
  if(!canvas)return;const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#070a0e";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText(label+" · OFF",16,28);
}
function updateWorldModelPanels(){
  const which=ui.beliefGroup?.value||"B",snap=which==="A"?lastResult?.snapshotA:lastResult?.snapshotB,v9=snap?.v9,fg=v9?.featureGates||{};
  if(v9?.spatial&&ui.mentalCanvas)drawSpatialBelief(ui.mentalCanvas,v9.spatial,{});else showDisabledCanvas(ui.mentalCanvas,"SPATIAL BELIEF");
  if(v9?.cortical&&ui.corticalCanvas)drawCorticalMonitor(ui.corticalCanvas,v9.cortical);else showDisabledCanvas(ui.corticalCanvas,"CORTICAL SOUND");
  if(v9?.perspective&&ui.perspectiveCanvas)drawPerspectiveProjection(ui.perspectiveCanvas,v9.perspective,{d4:Number(ui.d4?.value)||0,d5:Number(ui.d5?.value)||0,tolerance:.35});else showDisabledCanvas(ui.perspectiveCanvas,"PERSPECTIVE");
  if(v9?.spatial&&ui.differenceCanvas){const cmp=drawBeliefDifference(ui.differenceCanvas,snap,v9.spatial);if(ui.mapErrorMetric)ui.mapErrorMetric.textContent=cmp.count?Number(cmp.brier).toFixed(3):"—";}else{showDisabledCanvas(ui.differenceCanvas,"BELIEF vs TRUTH");if(ui.mapErrorMetric)ui.mapErrorMetric.textContent="OFF";}
  if(ui.identityMetric)ui.identityMetric.textContent=formatIdentityAmbiguityPair(lastResult);
  if(ui.sameDishBeliefCanvas||ui.sameDishTruthCanvas||ui.sameDishInspector){
    const d=sameDishShadowDiagnostic||refreshSameDishShadowDiagnostic(),snap=d?.snapshots?.final,truth=d?.truthStages?.final||[];
    if(ui.sameDishBeliefCanvas&&snap)drawSameDishBodyBelief(ui.sameDishBeliefCanvas,snap);else if(ui.sameDishBeliefCanvas)showDisabledCanvas(ui.sameDishBeliefCanvas,"SAME-DISH BODY BELIEF");
    if(ui.sameDishTruthCanvas&&truth.length)drawSameDishObserverTruth(ui.sameDishTruthCanvas,truth);else if(ui.sameDishTruthCanvas)showDisabledCanvas(ui.sameDishTruthCanvas,"SAME-DISH HIDDEN TRUTH");
    if(ui.sameDishInspector){
      if(d?.error)ui.sameDishInspector.textContent="SHADOW ERROR · "+d.error;
      else if(snap){
        const rows=(truth||[]).filter(x=>x.visible!==false).map(x=>{
          const p=x.probability||{},best=Object.entries(p).sort((a,b)=>b[1]-a[1])[0]||["?",0],cp=x.causalPrediction?.last;
          return `track ${String(x.track).padStart(2," ")} · rel ${x.rel.x},${x.rel.y},${x.rel.z||0} · belief ${best[0]} ${Math.round(best[1]*100)}% · u ${Number(x.uncertainty||0).toFixed(2)} · truth ${x.observerTruth} · predErr ${cp?Number(cp.actionError||0).toFixed(2):"—"}`;
        });
        ui.sameDishInspector.textContent=[
          "SHADOW ONLY · no policy/Higher/reward effect · "+(d.pass?"reference thresholds PASS":"reference thresholds UNPROVEN"),
          "self-on-self "+Number(d.metrics?.selfOnSelf||0).toFixed(3)+" · self-on-tool "+Number(d.metrics?.selfOnTool||0).toFixed(3)+" · tool-on-tool "+Number(d.metrics?.toolOnTool||0).toFixed(3)+" · other-on-other "+Number(d.metrics?.otherOnOther||0).toFixed(3),
          "calibration · self P/R "+Number(d.calibration?.selfPrecision||0).toFixed(3)+"/"+Number(d.calibration?.selfRecall||0).toFixed(3)+" · false-self "+Number(d.calibration?.selfFalsePositiveRate||0).toFixed(3)+" · Brier "+Number(d.calibration?.multiclassBrier||0).toFixed(3)+" · ECE "+Number(d.calibration?.expectedCalibrationError||0).toFixed(3),
          "ambiguity→resolution · Δself "+Number(d.recovery?.selfProbabilityGain||0).toFixed(3)+" · uncertainty drop "+Number(d.recovery?.uncertaintyDrop||0).toFixed(3),
          "",...rows
        ].join("\n");
      }
    }
  }
  const m=(which==="A"?lastResult?.row?.A:lastResult?.row?.B)||{},life=v9?.lifecycle||{};
  if(ui.nMetric)ui.nMetric.textContent=Number.isFinite(m.meanN)?Number(m.meanN).toFixed(1):(snap?.cubes?.length??"—");
  if(ui.kMetric)ui.kMetric.textContent=Number.isFinite(m.finalK)?Number(m.finalK).toFixed(2):(v9?.currentK??"—");
  if(ui.computeMetric)ui.computeMetric.textContent=Number.isFinite(m.computeSpent)?Math.round(m.computeSpent)+"/"+Math.round(m.computeBudget||0):(v9?Math.round(v9.computeSpent||0)+"/"+Math.round(v9.computeBudget||0):"—");
  if(ui.energyMetric){const e=v9?.energy;ui.energyMetric.textContent=fg.energy===false?"OFF":(Number.isFinite(m.energySpent)?Math.round(m.energySpent)+"/"+Math.round(m.energyCapacity||0)+(m.energyDebt>0?" · debt "+Math.round(m.energyDebt):""):(e?Math.round(e.spent||0)+"/"+Math.round(e.capacity||0)+(e.debt>0?" · debt "+Math.round(e.debt):""):"—"));}
  if(ui.perspectiveMetric)ui.perspectiveMetric.textContent=fg.perspective===false?"OFF":(v9?.perspective?("D "+Number(v9.perspective.activeD||0).toFixed(2)+" · eff "+Number(v9.perspective.effectiveD||0).toFixed(2)):"—");
  if(ui.carrotMetric){const f=trainer?.curriculumFrontier;ui.carrotMetric.textContent=f?(String(f.mode)+" · "+Math.round(f.horizonAtN16||trainer.config.maxGlobalActions)+" · g"+(f.generation||0)):"—";}
  if(ui.birthMetric)ui.birthMetric.textContent=life.births??Math.round(m.births||0);
  if(ui.retireMetric)ui.retireMetric.textContent=life.retirements??Math.round(m.retirements||0);
  if(ui.fusionMetric)ui.fusionMetric.textContent=life.fusions??Math.round(m.fusions||0);
  if(ui.specialistMetric){const sp=v9?.specialization;ui.specialistMetric.textContent=fg.specialization===false?"OFF":(sp?sp.archive.length+" · mut "+(sp.mutations||0):"—");}
  if(ui.organMetric){const og=v9?.organs;ui.organMetric.textContent=fg.organogenesis===false?"OFF":(og?String(og.organs?.length||0):"—");}
  if(ui.dormantMetric)ui.dormantMetric.textContent=life.dormant??"—";
  if(ui.sporeMetric)ui.sporeMetric.textContent=life.sporeReconstructions!=null?(life.sporeReconstructions+" / fail "+(life.sporeReconstructionFailures||0)):"—";
  if(ui.morphTimeline){
    const rows=[];
    for(const e of (life.events||[]).slice(-24))rows.push(`[${String(e.step??"?").padStart(5," ")}] ${e.type}${e.uid!=null?" uid="+e.uid:""}${e.parent!=null?" parent="+e.parent:""}${e.from!=null?" "+e.from+"→"+e.to:""}`);
    for(const e of (v9?.events||[]).slice(-16))if(String(e.type||"").startsWith("WOULD_")||e.type==="META")rows.push(`[${String(e.step??"?").padStart(5," ")}] ${e.type}${e.action?" "+e.action:""} · N ${e.n??"?"} · K ${e.k??"?"} · D ${fmt(e.d,2)}`);
    for(const o of (v9?.organs?.organs||[]).slice(0,12))rows.push(`ORGAN #${o.id} · ${o.role} · cells [${(o.cells||[]).join(",")}] · band ${o.dominantBand} · phase coh ${fmt(o.phaseCoherence,2)}`);
    ui.morphTimeline.textContent=rows.length?rows.slice(-40).join("\n"):"No morphology / compute events yet.";
  }
}
function updateSimulationInspector(){
  if(!ui.simulationInspector)return;
  const rows=lastResult?.simulationSummaries||[];
  if(!rows.length){ui.simulationInspector.textContent="No completed simulation summaries yet.";return;}
  const g=ui.simInspectGroup?.value||"ALL",o=ui.simInspectOutcome?.value||"ALL";
  const filtered=rows.filter(r=>(g==="ALL"||r.group===g)&&(o==="ALL"||(o==="SUCCESS"&&r.success)||(o==="FAIL"&&!r.success)));
  const pageSize=100,pages=Math.max(1,Math.ceil(filtered.length/pageSize)),page=Math.max(1,Math.min(pages,Math.floor(Number(ui.simInspectPage?.value)||1)));
  if(ui.simInspectPage){ui.simInspectPage.max=String(pages);ui.simInspectPage.value=String(page);}
  const start=(page-1)*pageSize,view=filtered.slice(start,start+pageSize),wins=filtered.filter(r=>r.success).length;
  const lines=[`latest batch · shown ${filtered.length}/${rows.length} · success ${wins} · failed ${filtered.length-wins} · page ${page}/${pages}`,
    "grp env    map              D  N0→N  K      success return   actions/budget  scale  energy         end            compute       pD/effD  births/deaths/fuse"];
  for(const r of view)lines.push(
    String(r.group).padEnd(3)+" "+String(r.envId).padEnd(6)+" "+String(r.mapKind).slice(0,16).padEnd(16)+" "+String(r.physicalDimensions).padEnd(2)+" "+
    (String(r.swarmStart)+"→"+String(r.finalN)).padEnd(6)+" "+Number(r.meanK||0).toFixed(2).padEnd(6)+" "+(r.success?"YES":"no ").padEnd(7)+" "+
    Number(r.totalReward||0).toFixed(2).padStart(9)+" "+(Math.round(r.actions||0)+"/"+Math.round(r.actionBudget||0)).padStart(14)+" "+
    ("x"+Number(r.budgetScale||1).toFixed(2)).padStart(6)+" "+(Math.round(r.energySpent||0)+"/"+Math.round(r.energyCapacity||0)+(r.energyDebt>0?("+"+Math.round(r.energyDebt)):"")).padStart(14)+" "+String(r.termination||"—").slice(0,14).padEnd(14)+" "+
    (Math.round(r.computeSpent||0)+"/"+Math.round(r.computeBudget||0)).padStart(11)+" "+
    (Number(r.perspectiveD||0).toFixed(2)+"/"+Number(r.effectiveD||0).toFixed(2)).padStart(9)+" "+
    (Math.round(r.births||0)+"/"+Math.round(r.retirements||0)+"/"+Math.round(r.fusions||0)).padStart(8)
  );
  ui.simulationInspector.textContent=lines.join("\n");
}
function updateInspector(){
  if(!lastResult){ui.inspector.textContent="No interrogation trace captured yet.";return;}
  const cellCount=Math.max(lastResult.snapshotA?.cubes?.length||0,lastResult.snapshotB?.cubes?.length||0,1);
  syncInspectorOptions(cellCount);
  const ego=Math.max(0,Math.min(cellCount-1,Number(ui.inspectEgo.value)||0));
  const A=summarizeTrace(lastResult.traceA,ego),B=summarizeTrace(lastResult.traceB,ego);
  const line=(name,r)=>r?[
    `${name} · cell ${r.cellUid??ego} · C-lineage ${r.specialistId??0} · action ${r.action} · conf ${fmt(r.confidence,3)} · accepted ${r.accepted}`,
    `actual ${r.actual?.dx??0},${r.actual?.dy??0},${r.actual?.dz??0} · N ${r.n??"?"} · K ${r.k??"?"} · D ${fmt(r.perspectiveD,2)}`,
    `reward ${fmt(r.localReward?.total,3)} · V ${fmt(r.value,3)} · spatial uncertainty ${fmt(r.spatial?.uncertainty,3)} · cortical coherence ${fmt(r.cortical?.coherence,3)}`,
    `reason ${r.reason||"—"}`
  ].join("\n"):`${name}: no captured decision for EGO ${ego}`;
  ui.inspector.textContent=line("GROUP A",A)+"\n\n"+line("GROUP B",B);
}
async function persist(){const started=performance.now();void telemetry.runtimeEvent("checkpoint_begin",{batch:trainer?.batch,policyVersion:trainer?.policyVersion});try{const safeState=structuredClone(trainer);await saveTrainerState(safeState);void telemetry.runtimeEvent("checkpoint_end",{batch:trainer?.batch,policyVersion:trainer?.policyVersion,durationMs:performance.now()-started});}catch(e){log("checkpoint failed: "+e.message);void telemetry.runtimeEvent("checkpoint_error",{batch:trainer?.batch,policyVersion:trainer?.policyVersion,durationMs:performance.now()-started,errorMessage:e?.message||String(e)});}}
function debugSnapshot(){return{running,busy:trainingBusy(),groupBusy:{...groupBusy},maintenanceBusy,moduleRsiBusy,drainForCheckpoint,oracleBusy,batch:trainer?.batch??null,stage:trainer?.stage??null,policyVersion:trainer?.policyVersion??null,workflow:trainer?structuredClone(workflow()):null,groupRuntime:trainer?groupRuntimeSnapshot(trainer):null,workerRuntime:pool?.snapshot?.()||null,oracleWorkerRuntime:oraclePool?.snapshot?.()||null,causal:trainer?causalSummary(trainer):null,inheritanceGate:inheritanceGate?.snapshot(trainer)||null,manualCapture:manualCaptureRequest?{...manualCaptureRequest}:null};}
function renderModuleRsi(result){
  moduleRsiLast=result;if(!ui.moduleRsiInspector)return;
  if(!result?.rows?.length){ui.moduleRsiInspector.textContent="No module-RSI result.";return;}
  const f=(x,n=3)=>Number.isFinite(Number(x))?Number(x).toFixed(n):"—",lines=[
    `H0 MODULE RSI · matched ON−OFF · cases ${result.cases} · H0 batch ${result.batch} · pv ${result.policyVersion}`,
    "Positive Δsuccess/Δreturn means enabling the module helped this frozen brain acutely. This is immediate causal dependence, not yet a long-horizon learning claim.",
    "",
    "module                 A Δsucc   A Δreturn  A Δactions A Δcompute | B Δsucc   B Δreturn  B Δactions B Δcompute"
  ];
  for(const r of result.rows){
    const one=g=>r.groups?.[g]?.metrics||{},a=one("A"),b=one("B"),eff=r.onEffective?.[r.id]!==false?"":" [dependency blocked]";
    lines.push((r.id+eff).padEnd(22)+" "+f(a.success?.mean,3).padStart(7)+" "+f(a.totalReward?.mean,2).padStart(10)+" "+f(a.actions?.mean,1).padStart(10)+" "+f(a.computeSpent?.mean,1).padStart(10)+" | "+f(b.success?.mean,3).padStart(7)+" "+f(b.totalReward?.mean,2).padStart(10)+" "+f(b.actions?.mean,1).padStart(10)+" "+f(b.computeSpent?.mean,1).padStart(10));
  }
  ui.moduleRsiInspector.textContent=lines.join("\n");
}
async function runFrozenModuleRsi(){
  if(running||trainingBusy()||oracleBusy||moduleRsiBusy)return;
  const bundle=await loadFrozenRsiState().catch(()=>null),check=validateFrozenRsiRoot(bundle);
  if(!check.ok){frozenRsiAvailable=false;frozenRsiHash=null;syncControls();updateMetrics();log("H0 MODULE RSI blocked · frozen root missing/invalid ("+check.reason+").");return;}
  moduleRsiBusy=true;updateMetrics();if(ui.moduleRsiInspector)ui.moduleRsiInspector.textContent="Running matched H0 module interventions…";
  try{
    const root=restoreFrozenRsiRoot(bundle),cases=Math.max(1,Math.min(32,Math.floor(Number(ui.moduleRsiCases?.value)||2)));
    const result=await evaluateModuleAblations(pool,root.trainer,{cases,groups:["A","B"]});
    result.rootHash=root.rootHash;renderModuleRsi(result);
    void telemetry.post("module_rsi",{rootHash:root.rootHash,batch:result.batch,policyVersion:result.policyVersion,cases:result.cases,specs:result.specs,rows:result.rows.map(r=>({id:r.id,onEffective:r.onEffective,offEffective:r.offEffective,groups:r.groups}))});
    log("H0 MODULE RSI complete · "+result.rows.length+" module interventions · matched ON/OFF from root "+root.rootHash.slice(0,12)+".");
  }catch(e){log("H0 MODULE RSI ERROR: "+(e?.stack||e));if(ui.moduleRsiInspector)ui.moduleRsiInspector.textContent="ERROR · "+(e?.message||e);}
  finally{moduleRsiBusy=false;updateMetrics();}
}
async function saveManualFrozenRsiRoot(){
  if(oracleBusy||trainingBusy())return false;
  const replaySnapshot=replayStore?await replayStore.snapshot():null,bundle=createFrozenRsiRoot({trainer,replaySnapshot});
  await saveFrozenRsiState(bundle);
  frozenRsiAvailable=true;frozenRsiHash=bundle.rootHash;
  const w=workflow();w.sourceMode=RSI_SOURCE_MODES.FROZEN;
  await persist();
  log(`FROZEN H0 SAVED · batch ${bundle.batch} · policy ${bundle.policyVersion} · root ${bundle.rootHash.slice(0,12)} · maxGlobalActions ${bundle.trainer.config.maxGlobalActions} · carrot ${bundle.trainer.config.carrotStartActions}→${bundle.trainer.config.carrotMaxActions} · immutable source ready for RSI.`);
  syncControls();updateMetrics();return true;
}
async function freezeCurrentForRsi(){
  if(!trainer)return;
  if(inheritanceGate?.hasPending()){log("FREEZE H0 blocked · strict RSI inheritance candidate is still waiting for oracle resolution.");return;}
  if(inheritanceGate?.isEnforcing())inheritanceGate.disarm();
  setTrainerConfig(trainer,{...readConfig(),rsiInheritanceGateStrict:false});Object.assign(trainer.causal.config,readCausalConfig());
  running=false;trainer.causal.config.enabled=false;pendingManualFreeze=true;pauseCheckpointPending=false;
  updateMetrics();log("FREEZE H0 requested · visible UI config synchronized first; stopping new training/oracle work and waiting for atomic in-flight work to quiesce.");
  await finalizeQuiescentWork();
}
async function finalizeQuiescentWork(){
  if(trainingBusy()||inheritanceGate?.hasPending())return;
  if(pendingPoolRebuild){pendingPoolRebuild=false;rebuildPool();if(pendingPoolRebuild)return;}
  if(pendingOraclePoolRebuild&&!oracleBusy){pendingOraclePoolRebuild=false;rebuildOraclePool();}
  if(pendingManualFreeze){
    if(oracleBusy||maintenanceBusy)return;
    pendingManualFreeze=false;drainForCheckpoint=false;
    await saveManualFrozenRsiRoot();return;
  }
  if(pendingPretrainFreeze){
    pendingPretrainFreeze=false;drainForCheckpoint=false;
    const state=workflow();state.phase="ready";trainer.causal.config.enabled=false;
    const replaySnapshot=replayStore?await replayStore.snapshot():null;
    await savePretrainedState({schemaVersion:1,kind:"v9-vectric4v8-pretrained-target",trainer:structuredClone(trainer),replaySnapshot});pretrainedAvailable=true;
    await persist();log("PRETRAINED BRAIN READY · all active group work drained at atomic boundaries · frozen reusable brain + optimizer + replay checkpoint saved · press START 2 for RSI live.");
    updateMetrics();return;
  }
  if(drainForCheckpoint){
    await persist();drainForCheckpoint=false;
    if(running)kickGroupLoops();
  }else if(pauseCheckpointPending){
    pauseCheckpointPending=false;await persist();log("Paused at an atomic group boundary; checkpoint saved.");
  }
}
async function maybeRunMaintenance(){
  if(maintenanceBusy||!running||!bothGroupsEnabled()||inheritanceGate?.hasPending())return;
  const rt=ensureGroupRuntime(trainer),m=rt.maintenance,minBatch=minGroupBatch(trainer),w=workflow();
  let kind=null;
  if(w.phase==="pretrain"&&trainer.config.pretrainAutoCurriculum===true&&minBatch-m.lastReadinessMinBatch>=PRETRAIN_READINESS.checkEveryBatches){kind="readiness";m.lastReadinessMinBatch=minBatch;}
  else if(w.phase!=="pretrain"&&minBatch-m.lastHeldoutMinBatch>=5){kind="heldout";m.lastHeldoutMinBatch=minBatch;}
  const diagEvery=Math.max(1,trainer.config.diagnosticEveryBatches||20);
  if(!kind&&w.phase!=="pretrain"&&minBatch-m.lastDiagnosticMinBatch>=diagEvery){kind="diagnostic";m.lastDiagnosticMinBatch=minBatch;}
  if(!kind)return;
  maintenanceBusy=true;
  try{
    if(kind==="readiness"){
      const report=await evaluateAllMapsReadiness(pool,trainer,PRETRAIN_READINESS.casesPerMap),phaseBefore=workflow().dimensionPhase,state=applyReadinessResult(trainer,report);
      const failed=report.perMap.filter(x=>!x.pass).map(x=>x.mapKind+"@N"+x.swarmSize+" "+Math.round(x.A*100)+"/"+Math.round(x.B*100)+"%").join(", ");
      log(`PRETRAIN ${phaseBefore.toUpperCase()} readiness ${state.readinessStreak}/${PRETRAIN_READINESS.checksRequired} · mean ${Math.round(report.meanSuccess*100)}% · min ${Math.round(report.minSuccess*100)}%${failed?" · waiting: "+failed:" · PHASE PASS"}`);
      if(state.lastTransition&&state.lastTransition.to!=="ready"){const nextMode=pretrainMapMode(state);setTrainerConfig(trainer,{mapMode:nextMode});trainer.mapEpisodeCursor=0;resetGroupMapCursors(trainer,0);log(`DIMENSION CURRICULUM · ${state.lastTransition.from.toUpperCase()} → ${String(state.lastTransition.to).toUpperCase()} · map mode ${nextMode}`);}
      if(state.ready){running=false;drainForCheckpoint=true;pendingPretrainFreeze=true;trainer.causal.config.enabled=false;log("PRETRAIN readiness complete · draining in-flight A/B microbatches before the reusable checkpoint.");}
      else drainForCheckpoint=true;
    }else if(kind==="heldout"){
      const ev=await evaluateHeldout(pool,trainer,8);log(`heldout · A ${Math.round(ev.A.success*100)}% · B ${Math.round(ev.B.success*100)}%${ev.advanced?" · STAGE ADVANCED":""}`);
      if(ev.advanced)await telemetry.post("stage_complete",{batch:trainer.batch,stage:trainer.stage-1,nextStage:trainer.stage,evaluation:ev});drainForCheckpoint=true;
    }else{
      const d=await evaluateAblations(pool,trainer,trainer.config.diagnosticEnvCount||4),a0=d.A.normal,b0=d.B.normal;
      log(`ablation · A normal ${Math.round(a0.success*100)}% / zero ${Math.round(d.A.self_zero.success*100)}% / reset ${Math.round(d.A.self_reset.success*100)}% · B normal ${Math.round(b0.success*100)}% / zero ${Math.round(d.B.self_zero.success*100)}% / H-off ${Math.round(d.B.higher_off.success*100)}%`);
      await telemetry.post("diagnostics",{batch:trainer.batch,stage:trainer.stage,policyVersion:trainer.policyVersion,diagnostics:d});drainForCheckpoint=true;
    }
  }finally{maintenanceBusy=false;}
}
function kickGroupLoops(){
  if(!running||drainForCheckpoint||inheritanceGate?.hasPending())return;
  const active=inheritanceGate?.isEnforcing()?inheritanceGate.orderGroups(activeGroupNames(trainer)):activeGroupNames(trainer);
  if(!active.length){updateMetrics();return;}
  for(const g of active)if(!groupBusy[g])setTimeout(()=>runGroupBatch(g),0);
}
async function runGroupBatch(group){
  if(!running||drainForCheckpoint||groupBusy[group]||!groupIsEnabled(trainer,group))return;
  const gateStrict=workflow().phase!=="pretrain"&&Boolean(inheritanceGate?.isEnforcing());
  if(gateStrict&&!inheritanceGate.tryReserve(group))return;
  groupBusy[group]=true;
  let liveConfig=readConfig();if(workflow().phase==="pretrain"&&liveConfig.pretrainAutoCurriculum===true)liveConfig.mapMode=pretrainMapMode(workflow());
  if(gateStrict)liveConfig=inheritanceGate.enforceTrainingConfig(liveConfig);
  setTrainerConfig(trainer,liveConfig);
  const causalCfg=gateStrict?inheritanceGate.enforceCausalConfig(readCausalConfig()):readCausalConfig();
  Object.assign(trainer.causal.config,causalCfg);updateMetrics();
  try{
    const gr=ensureGroupRuntime(trainer).groups[group];let replayBatch=[],oracleReplaySnapshot=null;
    try{
      if(!gateStrict&&replayStore)replayBatch=await replayStore.sample(trainer.config.replayBatchSize,((gr.batch+1)*2654435761)^(group==="A"?0xA11CE:0xB00B5));
      if(replayStore&&shouldCaptureOracleBatch(trainer))oracleReplaySnapshot=await replayStore.snapshot();
    }catch(e){log(group+" replay sample/snapshot failed: "+e.message);}
    if(gateStrict){replayBatch=[];inheritanceGate.beginCandidate(trainer,group);}
    const result=await trainOneGroupBatch(pool,trainer,group,p=>{groupProgress[group]=p;refreshLiveRuntimePanels();},replayBatch,oracleReplaySnapshot,()=>running&&!drainForCheckpoint&&groupIsEnabled(trainer,group));
    const runtimeAfter=result.groupRuntime||groupRuntimeSnapshot(trainer),groupAfter=runtimeAfter.groups?.[group];
    if(groupAfter?.status==="disabled"){const ps=pool?.snapshot?.()||null;persistGroupSelection();void telemetry.runtimeEvent("group_quiesced",{group,batch:groupAfter.batch,policyVersion:groupAfter.policyVersion,activeGroups:runtimeAfter.activeGroups,groupRuntime:runtimeAfter,allocation:allocationSnapshot(trainer,ps),poolSnapshot:ps});}
    if(result.skipped){if(gateStrict)inheritanceGate.releaseReservation(trainer,"group batch skipped");return;}
    if(gateStrict){
      const reg=inheritanceGate.registerCandidate(trainer,{group,captureEvent:result.captureEvent,result});
      log("STRICT RSI CANDIDATE · "+group+" · "+reg.captureId+" · "+reg.expected+" oracle decisions required before canonical commit · speculative update rolled back.");
    }else{
      try{if(replayStore&&result.replaySamples?.length)await replayStore.addMany(result.replaySamples);}catch(e){log(group+" replay persist failed: "+e.message);}
    }
    mergeLatestGroupResult(group,result);
    const snap=group==="A"?result.snapshotA:result.snapshotB;if(snap&&!playback[group].current)drawWorld(playbackCanvas(group),snap,true);
    syncInspectorOptions(Math.max(lastResult?.snapshotA?.cubes?.length||0,lastResult?.snapshotB?.cubes?.length||0));updateMetrics(result.row);updateSimulationInspector();updateInspector();
    if(manualCaptureRequest&&result.manualCaptureDelivered){const trace=group==="A"?result.traceA:result.traceB;if(trace?.length)void telemetry.interrogation({group,batch:result.row?.batch??trainer.batch,policyVersion:result.row?.policyVersionEnd??trainer.policyVersion,targetEgo:manualCaptureRequest.targetEgo,trigger:"manual",requestId:manualCaptureRequest.requestId,records:trace});log("Manual interrogation persisted · "+manualCaptureRequest.requestId+" · group "+group);manualCaptureRequest=null;}
    const m=group==="A"?result.row.A:result.row.B;log(`group ${group} candidate batch ${result.row.groupBatch} · return ${fmt(m.totalReward,1)} success ${Math.round(m.success*100)}% · grad ${fmt(group==="A"?result.row.gradA:result.row.gradB,3)}${group==="B"?" · H "+fmt(result.row.gradH,3):""}${gateStrict?" · WAITING ORACLE BEFORE INHERITANCE":" · replay "+(group==="A"?result.row.replayUsedA:result.row.replayUsedB)}`);
    if(gateStrict){
      void telemetry.runtimeEvent("rsi_candidate_speculative",{captureId:result.captureEvent?.captureId||null,group,batchCandidate:result.row?.batch??null,groupBatchCandidate:result.row?.groupBatch??null,canonicalBatch:trainer.batch,canonicalPolicyVersion:trainer.policyVersion,success:m.success,totalReward:m.totalReward,gate:inheritanceGate.snapshot(trainer)});
    }else void telemetry.batch(trainer,result);
    kickOracle();if(!gateStrict)await maybeRunMaintenance();
  }catch(e){
    if(gateStrict&&inheritanceGate?.phase==="COLLECTING")inheritanceGate.releaseReservation(trainer,"candidate failure");
    running=false;drainForCheckpoint=false;log("FATAL "+group+": "+(e?.stack||e));await telemetry.post("fatal",{group,batch:trainer?.batch,stage:trainer?.stage,error:e?.stack||String(e)});
  }finally{
    groupBusy[group]=false;groupProgress[group]=null;updateMetrics();
    await finalizeQuiescentWork();
    if(running&&!drainForCheckpoint&&groupIsEnabled(trainer,group)&&!inheritanceGate?.hasPending())kickGroupLoops();
  }
}
async function pauseTraining(){
  if(!running&&!trainingBusy())return;running=false;pauseCheckpointPending=true;updateMetrics();log("Pause requested · in-flight group microbatches will finish atomically; no new work will launch.");await finalizeQuiescentWork();
}
function toggleTrainingGroup(group){
  if(inheritanceGate?.hasPending()){log("Group selection blocked · strict RSI candidate is unresolved.");return;}
  const beforeEnabled=groupIsEnabled(trainer,group),beforePool=pool?.snapshot?.()||null,ev=requestGroupEnabled(trainer,group,!beforeEnabled,Date.now(),"user");
  persistGroupSelection();syncGroupControls();updateMetrics();
  void telemetry.runtimeEvent("group_selection_change",{...ev,activeGroups:activeGroupNames(trainer),groupRuntime:groupRuntimeSnapshot(trainer),allocation:allocationSnapshot(trainer,beforePool),poolSnapshot:beforePool});
  log(`Group ${group} → ${ev.enabled?"ENABLED":ev.after.status.toUpperCase()}${ev.after.status==="stop_requested"?" · stop requested; current atomic microbatch may finish":""}`);
  if(!ev.enabled&&groupBusy[group])queueMicrotask(()=>{const q=markGroupQuiescing(trainer,group);if(q){syncGroupControls();updateMetrics();void telemetry.runtimeEvent("group_quiescing",{...q,groupRuntime:groupRuntimeSnapshot(trainer),allocation:allocationSnapshot(trainer,pool?.snapshot?.()||null)});}});
  if(running&&ev.enabled)kickGroupLoops();
}

async function reset(){
  if(trainingBusy()||maintenanceBusy){log("Reset blocked until current atomic training/maintenance work is quiescent.");return;}
  running=false;drainForCheckpoint=false;pendingPretrainFreeze=false;pendingManualFreeze=false;pauseCheckpointPending=false;
  inheritanceGate?.resetRuntime("trainer reset");
  const mode=trainer?workflow().sourceMode:RSI_SOURCE_MODES.PRETRAIN;
  await clearTrainerState().catch(()=>{});
  if(replayStore)await replayStore.clear().catch(()=>{});
  oracleEpoch++;trainer=createTrainer(readConfig());Object.assign(trainer.causal.config,readCausalConfig());trainer.causal.config.enabled=false;trainer.stage=Math.max(0,Math.min(STAGES.length-1,Number(ui.curriculum.value)||0));
  ensureWorkflowState(trainer).sourceMode=mode;
  replayStore=new ReplayStore(trainer.config.replayCapacity);
  ensureGroupRuntime(trainer);restoreGroupSelection();rebuildAllPools();resetPlayback();resetLatestGroupResults();syncControls();updateMetrics();updateInspector();log("Fresh current V9 A/B created. Saved pretrained checkpoint, if any, was preserved.");
}
async function startPretrain(){
  if(!trainer){log(bootMessage());return;}
  void enableAudioFromGesture();
  if(trainingBusy()||running)return;
  if(inheritanceGate?.hasPending()){log("START 1 blocked · strict RSI candidate must resolve or be cleared by Reset first.");return;}
  if(inheritanceGate?.isEnforcing())inheritanceGate.disarm();
  let w=workflow(),continuing=w.phase==="pretrain";
  if(w.phase==="rsi"||w.phase==="frozen-rsi"||w.phase==="direct-rsi"||hasRsiWork()){
    const requested=readConfig(),cfg={...requested,mapMode:requested.pretrainAutoCurriculum===true?"all":requested.mapMode};
    trainer=createTrainer(cfg);Object.assign(trainer.causal.config,readCausalConfig());trainer.causal.config.enabled=false;
    replayStore=new ReplayStore(trainer.config.replayCapacity);await replayStore.clear().catch(()=>{});
    ensureGroupRuntime(trainer);restoreGroupSelection();rebuildAllPools();resetPlayback();resetLatestGroupResults();w=workflow();continuing=false;
  }
  w.sourceMode=RSI_SOURCE_MODES.PRETRAIN;w.phase="pretrain";
  if(!continuing){w.ready=false;w.readinessStreak=0;w.readinessChecks=0;w.lastReadiness=null;w.dimensionPhase="2d";w.lastTransition=null;}
  const requested=readConfig(),phaseMode=requested.pretrainAutoCurriculum===true?pretrainMapMode(w):requested.mapMode;setTrainerConfig(trainer,{...requested,mapMode:phaseMode});
  trainer.mapEpisodeCursor=0;resetGroupMapCursors(trainer,0);trainer.causal.config.enabled=false;
  syncControls();updateMetrics();if(!(await probeTrainingGpu())){running=false;updateMetrics();return;}running=true;updateMetrics();log(requested.pretrainAutoCurriculum===true?(continuing?`START 1 · resumed automatic brain-only pretraining · ${w.dimensionPhase.toUpperCase()} phase.`:`START 1 · automatic 2D → 3D transfer → mixed pretraining · causal oracle/Q&A disabled.`):`START 1 · MANUAL brain-only training on ${phaseMode} · no forced readiness sweep · freeze H0 whenever you choose.`);kickGroupLoops();
}
async function startRsi(){
  if(!trainer){log(bootMessage());return;}
  void enableAudioFromGesture();
  if(trainingBusy()||running)return;
  if(inheritanceGate?.hasPending()){log("START 2 blocked · strict RSI gate has an unresolved/faulted candidate. Reset current A+B to recover from the last canonical checkpoint.");return;}
  const requestedMode=workflow().sourceMode,cfg=readConfig();
  if(requestedMode===RSI_SOURCE_MODES.FROZEN&&workflow().phase!=="frozen-rsi"){
    const bundle=await loadFrozenRsiState().catch(()=>null),check=validateFrozenRsiRoot(bundle);
    if(!check.ok){frozenRsiAvailable=false;frozenRsiHash=null;log("START 2 blocked · frozen H0 missing or invalid ("+check.reason+").");syncControls();updateMetrics();return;}
    const restored=restoreFrozenRsiRoot(bundle);trainer=restored.trainer;frozenRsiAvailable=true;frozenRsiHash=restored.rootHash;
    replayStore=new ReplayStore(trainer.config.replayCapacity);if(restored.replaySnapshot)await replayStore.restore(restored.replaySnapshot);
    ensureGroupRuntime(trainer);recoverGroupRuntimeAfterRestore(trainer);recoverOracleCaptureReservation(trainer);restoreGroupSelection();rebuildAllPools();resetPlayback();resetLatestGroupResults();
    const w=workflow();w.sourceMode=RSI_SOURCE_MODES.FROZEN;w.phase="frozen-rsi";
    log("FROZEN H0 restored exactly · root "+restored.rootHash.slice(0,12)+" · maxGlobalActions "+trainer.config.maxGlobalActions+" · carrot "+trainer.config.carrotStartActions+"→"+trainer.config.carrotMaxActions+" · active RSI state is a mutable clone; stored H0 remains immutable.");
  }else if(requestedMode===RSI_SOURCE_MODES.PRETRAIN&&workflow().phase!=="rsi"){
    if(!workflow().ready){
      const saved=await loadPretrainedState().catch(()=>null),savedTrainer=savedPretrainTrainer(saved);
      if(!(savedTrainer?.schemaVersion===100&&savedTrainer?.version==="v9-vectric4v8-qanda-brsi1"&&ensureWorkflowState(savedTrainer).ready)){
        log("START 2 blocked · no ready pretrained checkpoint. START 1 must pass 2D, then 3D transfer, then mixed readiness.");
        updateMetrics();return;
      }
      trainer=savedTrainer;replayStore=new ReplayStore(trainer.config.replayCapacity);
      if(saved?.replaySnapshot)await replayStore.restore(saved.replaySnapshot);
      ensureGroupRuntime(trainer);recoverGroupRuntimeAfterRestore(trainer);recoverOracleCaptureReservation(trainer);restoreGroupSelection();rebuildAllPools();resetPlayback();resetLatestGroupResults();
    }
    const w=workflow();w.sourceMode=RSI_SOURCE_MODES.PRETRAIN;w.phase="rsi";
  }else if(requestedMode===RSI_SOURCE_MODES.FAST&&workflow().phase!=="direct-rsi"){
    trainer=createTrainer({...cfg,mapMode:"all-v9"});
    const w=workflow();w.sourceMode=RSI_SOURCE_MODES.FAST;w.phase="direct-rsi";
    replayStore=new ReplayStore(trainer.config.replayCapacity);await replayStore.clear().catch(()=>{});
    ensureGroupRuntime(trainer);restoreGroupSelection();rebuildAllPools();resetPlayback();resetLatestGroupResults();
  }
  let activationConfig=workflow().sourceMode===RSI_SOURCE_MODES.FROZEN?{...trainer.config}:{...cfg,mapMode:trainer.config.mapMode||"all-v9"};
  if(!inheritanceGate)inheritanceGate=createV9RsiInheritanceGate({log});
  if(inheritanceGate.isEnforcing()){
    const armedSource=inheritanceGate.snapshot(trainer).source?.mode;
    if(armedSource&&armedSource!==workflow().sourceMode){log("START 2 blocked · existing strict RSI gate is pinned to source "+armedSource+". Reset or START 1 before changing RSI source.");return;}
    activationConfig=inheritanceGate.enforceTrainingConfig(activationConfig);
  }
  setTrainerConfig(trainer,activationConfig);
  if(!inheritanceGate.isEnforcing())inheritanceGate.arm({sourceMode:workflow().sourceMode,sourceRootHash:workflow().sourceMode===RSI_SOURCE_MODES.FROZEN?frozenRsiHash:null,sourceConfig:structuredClone(trainer.config)});
  setTrainerConfig(trainer,inheritanceGate.enforceTrainingConfig({...trainer.config}));
  Object.assign(trainer.causal.config,inheritanceGate.enforceCausalConfig(readCausalConfig()),{enabled:true});
  syncControls();updateMetrics();if(!(await probeTrainingGpu())){running=false;updateMetrics();return;}running=true;updateMetrics();
  log((workflow().sourceMode===RSI_SOURCE_MODES.PRETRAIN?"START 2 · RSI LIVE from trained brain checkpoint.":(workflow().sourceMode===RSI_SOURCE_MODES.FROZEN?"START 2 · RSI LIVE from immutable frozen H0 clone.":"START 2 · DIRECT LOW-SIM RSI from fresh brain."))+" · STRICT INHERITANCE GATE ARMED: each candidate batch is rolled back until all oracle decisions resolve.");
  kickOracle();kickGroupLoops();
}
async function init(){
  bindCriticalControls();bootBridge.phase="initializing";
  const hc=navigator.hardwareConcurrency||8;
  let loaded=null;try{loaded=await loadTrainerState();}catch(e){log("No compatible checkpoint: "+e.message);}
  const compatibleLoaded=trainerArchitectureCompatible(loaded);if(loaded&&!compatibleLoaded)log("Checkpoint neural shape mismatch · ignored safely · "+JSON.stringify(architectureShapeSummary(loaded)));
  trainer=compatibleLoaded?loaded:createTrainer(applyExperimentalProfile({...DEFAULT_CONFIG,workerThreadCount:Math.max(1,hc),groupASimulationCount:10,groupBSimulationCount:10},EXPERIMENTAL_PROFILES.FULL));
  if(!trainer.config)trainer=createTrainer();
  // Strict inheritance is reconstructed by the attachable gate on START 2.
  // Never let a persisted trainer silently behave as gated while the gate itself is disarmed after reload.
  trainer.config.rsiInheritanceGateStrict=false;
  if(Number(trainer.config.gpuStrictConfigVersion)!==1){trainer.config.gpuRequired=false;trainer.config.gpuStrictConfigVersion=1;log("GPU config migrated · old mandatory-WebGPU flag changed to explicit fallback strictness.");}
  if(Number(trainer.config.nativeGpuConfigVersion)!==2){
    Object.assign(trainer.config,{nativeGpuConfigVersion:2,nativeMultiGpuEnabled:true,nativeMultiGpuRequired:true,nativeGpuMinDevices:2,nativeGpuTargetUtilization:.75,nativeGpuVerify:true,nativeGpuResidentBuffers:true,nativeGpuVramTargetFraction:.35,nativeGpuVramMaxMB:1536,nativeSharedGpuBufferMaxMB:256,gpuEnabled:true});
    log("GPU config migrated · dual-GPU load balancing + persistent VRAM staging enabled.");
  }
  if(Number(trainer.config.resourceSchedulerVersion)!==1)Object.assign(trainer.config,{resourceSchedulerVersion:1,autoResourceScaling:true,cpuTargetUtilization:.82,cpuHighUtilization:.94,ramCeilingUtilization:.90,workerOversubscription:2,resourceTuneMs:3000});
  if(trainer.config.autoResourceScaling!==false)trainer.config.workerThreadCount=Math.max(Number(trainer.config.workerThreadCount)||1,navigator.hardwareConcurrency||8);
  ensureWorkflowState(trainer);ensureGroupRuntime(trainer);recoverGroupRuntimeAfterRestore(trainer);recoverOracleCaptureReservation(trainer);if(!compatibleLoaded)restoreGroupSelection();
  const savedPretrain=await loadPretrainedState().catch(()=>null),savedPretrainState=savedPretrainTrainer(savedPretrain);
  pretrainedAvailable=Boolean(trainerArchitectureCompatible(savedPretrainState)&&ensureWorkflowState(savedPretrainState).ready);
  const savedFrozen=await loadFrozenRsiState().catch(()=>null),frozenCheck=validateFrozenRsiRoot(savedFrozen);
  frozenRsiAvailable=Boolean(frozenCheck.ok);frozenRsiHash=frozenCheck.ok?frozenCheck.rootHash:null;
  replayStore=new ReplayStore(trainer.config.replayCapacity);
  inheritanceGate=createV9RsiInheritanceGate({log});
  syncInspectorOptions(trainer.config.swarmSizeMax||16);
  refreshSameDishShadowDiagnostic();
  syncControls();rebuildAllPools();updateMetrics();updateInspector();renderIdleMaps();
  if(sameDishShadowDiagnostic?.metrics)log("Same-dish causal body SHADOW · "+(sameDishShadowDiagnostic.pass?"PASS":"UNPROVEN")+" · "+JSON.stringify(sameDishShadowDiagnostic.metrics));
  const verificationAdapter=createV9VerificationUiAdapter({
    getTrainer:()=>trainer,
    getTrainingPool:()=>pool,
    getOraclePool:()=>oraclePool,
    getReplayStore:()=>replayStore,
    getLastResult:()=>lastResult,
    getRuntime:()=>({running,groupBusy:{...groupBusy},maintenanceBusy,drainForCheckpoint,oracleBusy}),
    getBuildInfo:()=>({...buildInfo,telemetrySession:telemetry.sessionId}),
    getWorkflow:()=>trainer?structuredClone(workflow()):null
  });
  scheduleVerificationCockpit(verificationAdapter);
  if(ui.backendObservatory){
    const backendObservatoryAdapter=createV9BackendObservatoryAdapter({
      getTrainer:()=>trainer,
      getTrainingPool:()=>pool,
      getOraclePool:()=>oraclePool,
      getReplayStore:()=>replayStore,
      getLastResult:()=>lastResult,
      getRuntime:()=>({running,groupBusy:{...groupBusy},groupProgress:structuredClone(groupProgress),maintenanceBusy,moduleRsiBusy,drainForCheckpoint,oracleBusy,pendingPoolRebuild,pendingOraclePoolRebuild,bootError:bootError?.message||null}),
      getBuildInfo:()=>({...buildInfo,telemetrySession:telemetry.sessionId}),
      getWorkflow:()=>trainer?structuredClone(workflow()):null,
      getResourceStatus:()=>lastResourceStatus?structuredClone(lastResourceStatus):null,
      getVerificationAdapter:()=>verificationAdapter
    });
    backendObservatoryPopup=mountBackendObservatoryPopup({button:ui.backendObservatory,adapter:backendObservatoryAdapter,refreshMs:1000});
  }
  if(ui.inheritanceGate)inheritanceGatePopup=mountRsiInheritanceGatePopup({button:ui.inheritanceGate,gate:inheritanceGate,trainerProvider:()=>trainer});
  ui.start1.onclick=()=>{void startPretrain();};
  ui.start2.onclick=()=>{void startRsi();};
  ui.pause.onclick=()=>{void pauseTraining();};
  if(ui.freezeRsi)ui.freezeRsi.onclick=()=>{void freezeCurrentForRsi();};
  if(ui.moduleRsiBtn)ui.moduleRsiBtn.onclick=()=>{void runFrozenModuleRsi();};
  ui.sourceMode.onclick=()=>{if(running||trainingBusy()||inheritanceGate?.isEnforcing())return;const w=workflow(),modes=frozenRsiAvailable?[RSI_SOURCE_MODES.PRETRAIN,RSI_SOURCE_MODES.FAST,RSI_SOURCE_MODES.FROZEN]:[RSI_SOURCE_MODES.PRETRAIN,RSI_SOURCE_MODES.FAST],i=modes.indexOf(w.sourceMode);w.sourceMode=modes[(i+1+modes.length)%modes.length];syncControls();updateMetrics();log("RSI source mode → "+sourceModeLabel().replace("RSI source · ",""));};
  if(ui.audioMix)ui.audioMix.onchange=()=>{for(const g of ["A","B"])if(!audioMixAllows(g))corticalAudio.stopGroup(g);updateAudioControls();};
  if(ui.audioAToggle)ui.audioAToggle.onclick=()=>toggleAudio("A");if(ui.audioBToggle)ui.audioBToggle.onclick=()=>toggleAudio("B");
  if(ui.audioAVolume)ui.audioAVolume.oninput=()=>{corticalAudio.setVolume("A",ui.audioAVolume.value);updateAudioControls();};
  if(ui.audioBVolume)ui.audioBVolume.oninput=()=>{corticalAudio.setVolume("B",ui.audioBVolume.value);updateAudioControls();};
  ui.reset.onclick=()=>{if(trainingBusy()||maintenanceBusy){log("Reset blocked until current atomic work finishes.");return;}if(confirm("Reset current A/B learned models, optimizer state, curriculum history, and any pending RSI gate candidate? The saved pretrained/frozen checkpoints are preserved."))void reset();};
  ui.capture.onclick=()=>{trainer.forceCapture=true;manualCaptureRequest={requestId:"manual-"+Date.now(),targetEgo:Math.max(0,Number(ui.inspectEgo?.value)||0),armedBatch:trainer.batch+1};log("Manual interrogation capture armed for the next active group microbatch.");};
  ui.exactRender.onclick=()=>{
    const enabled=trainer.config.exactMoveRendering===false;
    setTrainerConfig(trainer,{exactMoveRendering:enabled});
    syncControls();updateMetrics();
    log("Exact move rendering → "+(enabled?"ON · every global transition, discrete legal states only":"OFF · legacy sampled/interpolated playback"));
  };
  if(ui.groupAToggle)ui.groupAToggle.onclick=()=>toggleTrainingGroup("A");if(ui.groupBToggle)ui.groupBToggle.onclick=()=>toggleTrainingGroup("B");
  ui.inspectEgo.onchange=updateInspector;
  for(const el of [ui.simInspectGroup,ui.simInspectOutcome,ui.simInspectPage].filter(Boolean))el.onchange=updateSimulationInspector;
  if(ui.beliefGroup)ui.beliefGroup.onchange=updateWorldModelPanels;
  for(const el of [ui.d4,ui.d5].filter(Boolean))el.oninput=()=>{if(ui.d4Value)ui.d4Value.textContent=Number(ui.d4.value).toFixed(2);if(ui.d5Value)ui.d5Value.textContent=Number(ui.d5.value).toFixed(2);updateWorldModelPanels();};
  if(ui.playbackRate){ui.playbackRateValue.textContent=(playbackRate()<.1?playbackRate().toFixed(2):playbackRate().toFixed(2).replace(/0+$/,"").replace(/\.$/,""))+"×";ui.playbackRate.oninput=()=>{ui.playbackRateValue.textContent=(playbackRate()<.1?playbackRate().toFixed(2):playbackRate().toFixed(2).replace(/0+$/,"").replace(/\.$/,""))+"×";};}
  requestAnimationFrame(previewLoop);
  if(runtimeUiTimer)clearInterval(runtimeUiTimer);runtimeUiTimer=setInterval(refreshLiveRuntimePanels,1000);
  if(resourceTuneTimer)clearInterval(resourceTuneTimer);void autoTuneResources();resourceTuneTimer=setInterval(()=>{void autoTuneResources();},Math.max(1000,Number(trainer.config.resourceTuneMs)||3000));
  if(ui.experimentalProfile)ui.experimentalProfile.onchange=()=>{
    if(running||trainingBusy()){syncControls();log("Module profile change blocked during active training · Pause first for a clean intervention boundary.");return;}
    const profile=ui.experimentalProfile.value;
    let next=applyExperimentalProfile({...trainer.config,...readConfig()},profile);
    if(inheritanceGate?.isEnforcing())next=inheritanceGate.enforceTrainingConfig(next);
    setTrainerConfig(trainer,next);syncControls();updateMetrics();
    log("Experimental module profile → "+profile+(inheritanceGate?.isEnforcing()?" · frozen RSI action-budget fields remained locked":""));
  };
  ui.curriculum.onchange=()=>{trainer.stage=Math.max(0,Math.min(STAGES.length-1,Number(ui.curriculum.value)||0));trainer.evalStreak=0;updateMetrics();renderIdleMaps();};
  if(ui.mapMode)ui.mapMode.onchange=()=>{const autoWas=ui.pretrainAutoCurriculum?.checked===true;if(ui.pretrainAutoCurriculum)ui.pretrainAutoCurriculum.checked=false;setTrainerConfig(trainer,{mapMode:ui.mapMode.value,pretrainAutoCurriculum:false});trainer.mapEpisodeCursor=0;resetGroupMapCursors(trainer,0);trainer.evalStreak=0;syncControls();renderIdleMaps();log("Map mode → "+ui.mapMode.options[ui.mapMode.selectedIndex].text+(autoWas?" · automatic curriculum OFF so manual selection stays fixed":""));};
  const scientificControls=[ui.morphologyMode,ui.adaptiveKMode,ui.cSpecialization,ui.adaptiveBudgetEnabled,ui.energyEnabled,ui.corticalSoundEnabled,ui.semanticSoundModule,ui.semanticSoundMode,ui.echoEnabled,ui.spatialCortexEnabled,ui.worldModelEnabled,ui.perspectiveEnabled,ui.organogenesisEnabled,ui.metaControllerEnabled].filter(Boolean);
  const gpuControls=[ui.nativeMultiGpuEnabled,ui.nativeMultiGpuRequired,ui.nativeGpuTarget,ui.gpuEnabled,ui.gpuRequired,ui.gpuTarget,ui.gpuBufferMb].filter(Boolean);
  const horizonControls=[ui.horizonMode,ui.carrotStart,ui.carrotStep,ui.carrotMax].filter(Boolean);
  const sourceLockedControls=new Set([ui.maxActions,ui.adaptiveBudgetEnabled,ui.computeBudget,...horizonControls].filter(Boolean));
  const cleanBoundaryControls=new Set([...scientificControls,...gpuControls,...horizonControls,ui.pretrainAutoCurriculum,ui.maxActions,ui.computeBudget].filter(Boolean));
  for(const el of [ui.aSims,ui.bSims,ui.microbatch,ui.swarmMin,ui.swarmMax,ui.steps,ui.hz,ui.maxActions,ui.pretrainAutoCurriculum,ui.minCells,ui.maxCells,ui.minK,ui.maxK,ui.computeBudget,ui.energyBase,ui.energyReward,...gpuControls,...horizonControls,...scientificControls].filter(Boolean))el.onchange=()=>{
    if(inheritanceGate?.isEnforcing()&&sourceLockedControls.has(el)){syncControls();log("STRICT RSI source lock · action/compute horizon fields are pinned to the H0/source checkpoint until the gate is disarmed.");return;}
    if(cleanBoundaryControls.has(el)&&(running||trainingBusy())){syncControls();log("Scientific module/curriculum change blocked during active training · Pause first so the intervention starts at a clean atomic boundary.");return;}
    if(scientificControls.includes(el)&&ui.experimentalProfile)ui.experimentalProfile.value=EXPERIMENTAL_PROFILES.CUSTOM;
    let next={...readConfig(),experimentalProfile:scientificControls.includes(el)?EXPERIMENTAL_PROFILES.CUSTOM:(trainer.config.experimentalProfile||EXPERIMENTAL_PROFILES.CUSTOM)};
    if(inheritanceGate?.isEnforcing())next=inheritanceGate.enforceTrainingConfig(next);
    setTrainerConfig(trainer,next);syncInspectorOptions(trainer.config.swarmSizeMax||16);syncControls();
  };
  if(ui.simSlider)ui.simSlider.oninput=()=>{applySimulationSlider();syncControls();};
  if(ui.oracleEnvs)ui.oracleEnvs.onchange=()=>{
    const requested=readCausalConfig(),effective=inheritanceGate?.isEnforcing()?inheritanceGate.enforceCausalConfig(requested):requested;
    Object.assign(trainer.causal.config,effective);
    if(inheritanceGate?.isEnforcing()&&ui.oracleEnvs)ui.oracleEnvs.value="0";
    syncControls();
    log(inheritanceGate?.isEnforcing()?"Oracle capture breadth locked by STRICT RSI gate → ALL environments.":"Oracle capture breadth → "+(trainer.causal.config.oracleEnvironmentsPerWorker===0?"ALL environments":trainer.causal.config.oracleEnvironmentsPerWorker+" env(s) per worker"));
  };
  ui.threads.onchange=()=>{setTrainerConfig(trainer,readConfig());if(trainingBusy())pendingPoolRebuild=true;else rebuildPool();};
  if(ui.oracleThreads)ui.oracleThreads.onchange=()=>{setTrainerConfig(trainer,readConfig());if(oracleBusy)pendingOraclePoolRebuild=true;else rebuildOraclePool();};
  log(compatibleLoaded?"Loaded V9 MAX checkpoint.":(loaded?"Incompatible older checkpoint ignored safely; created fresh FULL V9 MAX models.":"Created fresh FULL V9 MAX models."));
  log("V9_VECTRIC4V8_Q&A_BRSI1 = V8 causal Q&A RSI + adaptive morphology/N/K + CorticalSound + echo + spatial world model + 2D/3D + ND perspectives + hot-selectable no-barrier A/B runtime.");
  try{
    const s=await fetch("/telemetry/status").then(r=>r.ok?r.json():null);
    if(s?.ok){
      buildInfo={gitSha:s.gitSha||"unknown",buildToken:s.buildToken||null};
      log("Bounded research telemetry enabled.");
      void telemetry.sessionStart({build:{gitSha:s.gitSha||"unknown",buildToken:s.buildToken||null},config:structuredClone(trainer.config),activeGroups:activeGroupNames(trainer),groupRuntime:groupRuntimeSnapshot(trainer),workers:{training:pool?.count||0,oracle:oraclePool?.count||0},namespaces:{trainer:"octopus-ego-ai-v9-vectric4v8-qanda-brsi1",replay:"octopus-ego-replay-v9-vectric4v8-qanda-brsi1",telemetryOutbox:"octopus-ego-telemetry-outbox-v9-vectric4v8-qanda-brsi1"},sampling:{interrogationBefore:32,interrogationAfter:32}});
      lastHeartbeatTick=performance.now();heartbeatTimer=setInterval(()=>{const now=performance.now(),lag=Math.max(0,now-lastHeartbeatTick-5000);lastHeartbeatTick=now;void telemetry.heartbeat(debugSnapshot(),lag);},5000);
      window.addEventListener("pagehide",()=>{if(heartbeatTimer)clearInterval(heartbeatTimer);if(runtimeUiTimer)clearInterval(runtimeUiTimer);if(resourceTuneTimer)clearInterval(resourceTuneTimer);if(!telemetry.sendCleanShutdownBeacon("pagehide"))void telemetry.cleanShutdown("pagehide");},{once:true});
    }
  }catch(_){log("Telemetry server unavailable; training remains functional.");}
  running=false;updateMetrics();bootBridge.ready=true;bootBridge.phase="ready";const bootBanner=document.getElementById("bootWatchdogBanner");if(bootBanner)bootBanner.remove();
  log("Trainer is paused by design. Use START 1 for brain-only pretraining or toggle DIRECT LOW-SIM and use START 2 for the comparison path.");
}
window.addEventListener("error",e=>{if(!bootError&&(!trainer||ui.trainerState?.textContent==="booting"))showBootFailure(e.error||new Error(e.message||"browser error"));});
window.addEventListener("unhandledrejection",e=>{const err=e.reason instanceof Error?e.reason:new Error(String(e.reason));log("UNHANDLED REJECTION · "+(err.stack||err));});
bindCriticalControls();
init().catch(showBootFailure);
