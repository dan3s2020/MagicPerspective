import {DEFAULT_CONFIG} from "./config.js";
import {WorkerPool} from "./worker-pool.js";
import {createTrainer,setTrainerConfig,trainOneGroupBatch} from "./trainer.js";
import {drawPreviewFrame,drawWorld} from "./render.js";
import {makeWorld} from "./world.js";
import {clearNamedTrainerState,loadNamedTrainerState,saveNamedTrainerState} from "./persistence.js";
import {createExpertRunControl,expertIds,expertRuntimeConfig,normalizeExpertLabControls,planLineageSimulationBudget,PRINCIPAL_EXPERT_MAPS} from "./principal-expert-lab-runtime.js";
import {encodePortableState,PRINCIPAL_EXPERT_PORTABLE_SCHEMA} from "./principal-expert-portable.js";

const $=id=>document.getElementById(id);
const ui={
  start:$("startBtn"),pause:$("pauseBtn"),stop:$("stopBtn"),reset:$("resetBtn"),status:$("status"),persist:$("persist"),
  aSims:$("aSims"),bSims:$("bSims"),stepBudget:$("stepBudget"),microbatch:$("microbatch"),workers:$("workers"),cells:$("cells"),
  aEnabled:$("aEnabled"),bEnabled:$("bEnabled"),expertsA:$("expertsA"),expertsB:$("expertsB"),
  workerState:$("workerState"),cpuState:$("cpuState"),gpuState:$("gpuState"),queueState:$("queueState"),log:$("log")
};
const META_KEY="principal-expert-lab:meta:v3";
const BASE_KEY="principal-expert-lab:base:v3";
const SCHEMA="octopus-principal-continuous-expert-lab-v3";
const ids=expertIds();
const experts=new Map();
const runControl=createExpertRunControl("idle");
let pool=null,pendingWorkerShrink=null,resourceStatus=null,booted=false,baseTrainerRoot=null,freezeExportBusy=false,freezeExported=false,resourceTuneBusy=false,resourceTuneTimer=null,runtimeUiTimer=null,gpuProbeDone=false,quiescentSaveBusy=false;

function now(){return new Date().toISOString();}
function log(message){
  const line=document.createElement("div");line.textContent="["+new Date().toLocaleTimeString()+"] "+message;ui.log.appendChild(line);
  while(ui.log.childNodes.length>220)ui.log.removeChild(ui.log.firstChild);
  ui.log.scrollTop=ui.log.scrollHeight;
}
function readControls(){
  return normalizeExpertLabControls({
    aSimulations:ui.aSims.value,bSimulations:ui.bSims.value,stepBudget:ui.stepBudget.value,
    optimizerMicrobatch:ui.microbatch.value,workerThreads:ui.workers.value,cells:ui.cells.value,
    aEnabled:ui.aEnabled.checked,bEnabled:ui.bEnabled.checked
  });
}
function writeControls(c){
  const q=normalizeExpertLabControls(c);
  ui.aSims.value=q.aSimulations;ui.bSims.value=q.bSimulations;ui.stepBudget.value=q.stepBudget;
  ui.microbatch.value=q.optimizerMicrobatch;ui.workers.value=q.workerThreads;ui.cells.value=q.cells;
  ui.aEnabled.checked=q.aEnabled;ui.bEnabled.checked=q.bEnabled;
}
function expertKey(id){return "state:"+id;}
function humanMap(map){return String(map).replace("v1-","");}
function statusClass(status){
  if(status==="running")return"pill ok";
  if(status==="pause_requested"||status==="stop_requested")return"pill warn";
  if(status==="failed")return"pill bad";
  return"pill";
}
function updateTopStatus(){
  ui.status.textContent=runControl.status.toUpperCase();
  ui.status.className=statusClass(runControl.status);
  ui.start.disabled=!booted||runControl.status==="running"||runControl.status==="pause_requested"||runControl.status==="stop_requested"||runControl.status==="stopped"||runControl.status==="failed";
  ui.pause.disabled=runControl.status!=="running";
  ui.stop.disabled=runControl.status==="stopped"||runControl.status==="stop_requested"||runControl.status==="failed";
}
function createCard(expert){
  const root=expert.lineage==="A"?ui.expertsA:ui.expertsB;
  const el=document.createElement("article");el.className="expert";el.dataset.id=expert.id;
  el.innerHTML='<h3>'+expert.lineage+' · '+humanMap(expert.map)+'</h3>'+
    '<canvas width="672" height="416"></canvas>'+
    '<div class="meta kv">'+
      '<span>state</span><span data-k="state">READY</span>'+
      '<span>batch</span><span data-k="batch">0</span>'+
      '<span>assigned sims</span><span data-k="sims">—</span>'+
      '<span>simulations done</span><span data-k="simDone">0</span>'+
      '<span>microbatch</span><span data-k="micro">—</span>'+
      '<span>step budget</span><span data-k="steps">—</span>'+
      '<span>success</span><span data-k="success">—</span>'+
      '<span>return</span><span data-k="return">—</span>'+
      '<span>policy version</span><span data-k="policy">—</span>'+
      '<span>saved</span><span data-k="saved">—</span>'+
    '</div><div class="sim-lanes" data-k="lanes"></div><details><summary>latest simulation summaries</summary><pre data-k="summaries">waiting</pre></details>';
  root.appendChild(el);expert.el=el;expert.canvas=el.querySelector("canvas");expert.fields=Object.fromEntries([...el.querySelectorAll("[data-k]")].map(x=>[x.dataset.k,x]));
  expert.liveLanes=new Map();
}
function updateCard(expert){
  if(!expert.el)return;
  expert.el.classList.toggle("busy",expert.busy);
  expert.el.classList.toggle("failed",Boolean(expert.error));
  const c=readControls(),m=expert.metrics||{};
  expert.fields.state.textContent=expert.error?"FAILED":expert.busy?"TRAINING":runControl.mayLaunch(expert.lineage,c)?"READY":"IDLE";
  expert.fields.batch.textContent=String(expert.batch||0);
  expert.fields.sims.textContent=expert.busy?String(expert.activeSimulations||0):"—";
  expert.fields.simDone.textContent=String(expert.totalSimulations||0);
  expert.fields.micro.textContent=String(c.optimizerMicrobatch);
  expert.fields.steps.textContent=String(c.stepBudget);
  expert.fields.success.textContent=Number.isFinite(Number(m.success))?(Number(m.success)*100).toFixed(1)+"%":"—";
  expert.fields.return.textContent=Number.isFinite(Number(m.totalReward))?Number(m.totalReward).toFixed(2):"—";
  expert.fields.policy.textContent=String(expert.policyVersion??"—");
  expert.fields.saved.textContent=expert.savedAt?new Date(expert.savedAt).toLocaleTimeString():"—";
  const rows=(expert.simulationSummaries||[]).slice(0,40).map(x=>({
    envId:x.envId,success:x.success,actions:x.actions,totalReward:x.totalReward,progress:x.progressRatio,mapKind:x.mapKind
  }));
  expert.fields.summaries.textContent=rows.length?JSON.stringify(rows,null,2):"waiting";
}
function configureExpert(expert,assignedSimulations=null){
  const c=readControls(),n=Math.max(1,Math.floor(Number(assignedSimulations)||(expert.lineage==="A"?c.aSimulations:c.bSimulations)));
  const scoped={...c,aSimulations:expert.lineage==="A"?n:c.aSimulations,bSimulations:expert.lineage==="B"?n:c.bSimulations};
  const patch=expertRuntimeConfig(expert.trainer.config,expert.lineage,expert.map,scoped,expert.id);
  patch.automaticTraceEnabled=false;
  patch.liveSimulationObserver=true;
  patch.liveObserverEverySteps=25;
  setTrainerConfig(expert.trainer,patch);
  if(expert.trainer.causal?.config)expert.trainer.causal.config.enabled=false;
  expert.trainer.forceCapture=false;
}
function freshPopulation(){
  const c=readControls();
  const baseConfig=expertRuntimeConfig({...DEFAULT_CONFIG,gpuEnabled:true,nativeMultiGpuEnabled:true}, "A","v1-wide",c,"BASE");
  const root=createTrainer(baseConfig);baseTrainerRoot=structuredClone(root);
  const out=[];
  for(const def of ids){
    const trainer=structuredClone(root);
    setTrainerConfig(trainer,expertRuntimeConfig(trainer.config,def.lineage,def.map,c,def.id));
    if(trainer.causal?.config)trainer.causal.config.enabled=false;
    out.push({...def,trainer,busy:false,activeSimulations:0,batch:0,totalSimulations:0,metrics:null,policyVersion:trainer.policyVersion||1,preview:null,previewStarted:0,simulationSummaries:[],savedAt:null,error:null,progress:null,initialRenderedBatch:null});
  }
  return out;
}
async function saveMeta(extra={}){
  const meta={schema:SCHEMA,savedAt:now(),controls:readControls(),runtime:runControl.snapshot(),experts:[...experts.values()].map(e=>({id:e.id,lineage:e.lineage,map:e.map,batch:e.batch,totalSimulations:e.totalSimulations||0,savedAt:e.savedAt,error:e.error||null})),...extra};
  await saveNamedTrainerState(META_KEY,meta);
  ui.persist.textContent="checkpoint: "+new Date(meta.savedAt).toLocaleTimeString();
  return meta;
}
async function saveExpert(expert){
  const payload={schema:SCHEMA,id:expert.id,lineage:expert.lineage,map:expert.map,savedAt:now(),batch:expert.batch,totalSimulations:expert.totalSimulations||0,trainer:expert.trainer};
  await saveNamedTrainerState(expertKey(expert.id),payload);
  expert.savedAt=payload.savedAt;
}
async function saveBaseRoot(){
  if(!baseTrainerRoot)return false;
  await saveNamedTrainerState(BASE_KEY,{schema:SCHEMA,id:"BASE",savedAt:now(),trainer:baseTrainerRoot});
  return true;
}
async function postFreeze(path,payload){
  const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const body=await response.json().catch(()=>({}));
  if(!response.ok||body?.ok===false)throw new Error(body?.error||("freeze export HTTP "+response.status));
  return body;
}
async function exportFrozenPopulation(){
  if(freezeExportBusy||freezeExported)return;
  if([...experts.values()].some(e=>e.busy))throw new Error("cannot export while expert work is in flight");
  freezeExportBusy=true;
  try{
    await saveBaseRoot();
    for(const expert of experts.values())await saveExpert(expert);
    const controls=readControls();
    await postFreeze("/principal/expert-freeze/reset",{schema:PRINCIPAL_EXPERT_PORTABLE_SCHEMA,labSchema:SCHEMA,controls,expectedExpertIds:ids.map(x=>x.id),createdAt:now()});
    await postFreeze("/principal/expert-freeze/state?id=BASE",{
      schema:PRINCIPAL_EXPERT_PORTABLE_SCHEMA,id:"BASE",kind:"base",trainer:encodePortableState(baseTrainerRoot)
    });
    for(const expert of experts.values()){
      await postFreeze("/principal/expert-freeze/state?id="+encodeURIComponent(expert.id),{
        schema:PRINCIPAL_EXPERT_PORTABLE_SCHEMA,id:expert.id,kind:"expert",lineage:expert.lineage,map:expert.map,
        batch:expert.batch,totalSimulations:expert.totalSimulations||0,trainer:encodePortableState(expert.trainer)
      });
    }
    const manifest=await postFreeze("/principal/expert-freeze/commit",{
      schema:PRINCIPAL_EXPERT_PORTABLE_SCHEMA,labSchema:SCHEMA,controls,
      experts:[...experts.values()].map(e=>({id:e.id,lineage:e.lineage,map:e.map,batch:e.batch,totalSimulations:e.totalSimulations||0,policyVersion:e.policyVersion}))
    });
    freezeExported=true;ui.persist.textContent="fusion export: READY";
    log("FUSION EXPORT READY · all 12 exact trainer states + common base persisted to server · "+String(manifest.path||""));
  }finally{freezeExportBusy=false;}
}

async function loadPopulation(){
  const meta=await loadNamedTrainerState(META_KEY).catch(()=>null);
  if(meta?.schema===SCHEMA&&meta.controls)writeControls(meta.controls);
  const baseSaved=await loadNamedTrainerState(BASE_KEY).catch(()=>null);
  const saved=await Promise.all(ids.map(d=>loadNamedTrainerState(expertKey(d.id)).catch(()=>null)));
  const present=saved.filter(x=>x?.schema===SCHEMA).length;
  if(present!==0&&present!==ids.length)throw new Error("Partial expert checkpoint detected ("+present+"/"+ids.length+"). RESET FRESH is required; mixed roots are forbidden.");
  if(present===ids.length){
    if(baseSaved?.schema!==SCHEMA||!baseSaved?.trainer)throw new Error("12 expert checkpoints exist but the exact common base checkpoint is missing. RESET FRESH is required.");
    baseTrainerRoot=baseSaved.trainer;
    const out=saved.map((p,i)=>({...ids[i],trainer:p.trainer,busy:false,activeSimulations:0,batch:Number(p.batch)||0,totalSimulations:Math.max(0,Math.floor(Number(p.totalSimulations)||0)),metrics:null,policyVersion:p.trainer?.policyVersion||1,preview:null,previewStarted:0,simulationSummaries:[],savedAt:p.savedAt||null,error:null,progress:null,initialRenderedBatch:null}));
    log("Restored all 12 expert trainers + exact common base from IndexedDB. Training remains paused until START / RESUME.");
    return out;
  }
  log("No expert checkpoint found. Created one exact common V9 root and cloned it into 12 independent experts.");
  return freshPopulation();
}
async function clearPopulation(){
  for(const def of ids)await clearNamedTrainerState(expertKey(def.id)).catch(()=>{});
  await clearNamedTrainerState(META_KEY).catch(()=>{});
  await clearNamedTrainerState(BASE_KEY).catch(()=>{});
}
function ensurePool(){
  const c=readControls(),demand=Math.max(1,(c.aEnabled?c.aSimulations:0)+(c.bEnabled?c.bSimulations:0)),target=Math.max(1,Math.min(c.workerThreads,demand));
  if(!pool){pool=new WorkerPool(target,handleWorkerEvent,"principal-expert-lab");log("Canonical V9 WorkerPool started with "+pool.count+" workers for lineage demand "+demand+".");return;}
  if(target===pool.targetCount)return;
  const actual=pool.resize(target);
  pendingWorkerShrink=actual>target?target:null;
  log("WorkerPool target "+target+" for lineage demand "+demand+" · actual "+actual+(actual>target?" while busy workers retire opportunistically":"")+".");
}
function applyPendingPoolResize(){
  if(pendingWorkerShrink==null||!pool)return;
  const target=pendingWorkerShrink,actual=pool.resize(target);
  if(actual<=target){pendingWorkerShrink=null;log("WorkerPool shrink target reached: "+actual+".");}
}
function previewExpertId(event){
  const map=event?.preview?.mapKind||event?.preview?.stage?.mapKind||null;
  if(!map)return null;
  const id=String(event.group||"")+":"+String(map);
  return experts.has(id)?id:null;
}
function ensureSimulationLane(expert,envId){
  const key=String(envId);
  if(expert.liveLanes?.has(key))return expert.liveLanes.get(key);
  if(!expert.fields?.lanes)return null;
  const el=document.createElement("div");el.className="sim-lane";
  el.innerHTML='<div class="sim-lane-head"><strong>sim '+(Number(envId)+1)+'</strong><span data-s="state">QUEUED</span></div><canvas width="336" height="208"></canvas><div class="sim-lane-meta" data-s="meta">waiting for worker</div>';
  expert.fields.lanes.appendChild(el);
  const lane={el,canvas:el.querySelector("canvas"),state:el.querySelector('[data-s="state"]'),meta:el.querySelector('[data-s="meta"]'),geometryKey:null,world:null};
  expert.liveLanes?.set(key,lane);return lane;
}
function clearSimulationLanes(expert,count){
  if(expert.fields?.lanes)expert.fields.lanes.textContent="";
  expert.liveLanes=new Map();
  for(let i=0;i<count;i++)ensureSimulationLane(expert,i);
}
function drawLiveSimulation(expert,event){
  const lane=ensureSimulationLane(expert,event.envId);if(!lane)return;
  lane.state.textContent=(event.phase||"ROLLOUT")+" · W"+String(event.worker??"—");
  lane.meta.textContent="step "+String(event.globalStep??0)+"/"+String(event.actionBudget??readControls().stepBudget)+" · action "+String(event.actionName||"—")+" · ego "+String(event.activeEgo??"—")+" · N "+String(event.morphology?.n??event.cubes?.length??"—")+" · K "+String(event.currentK??"—")+" · compute "+String(event.computeSpent??"—")+"/"+String(event.computeBudget??"—")+" · entropy "+Number(event.entropy||0).toFixed(3)+(event.success?" · SUCCESS":"");
  if(!event.cubes?.length)return;
  try{
    const gkey=[event.envSeed,event.mapKind,event.swarmSize,event.actionBudget].join(":");
    if(lane.geometryKey!==gkey){
      lane.world=makeWorld(expert.trainer.stage||0,event.envSeed,event.actionBudget||readControls().stepBudget,event.mapKind||expert.map,event.swarmSize||readControls().cells,2);
      lane.geometryKey=gkey;
    }
    drawWorld(lane.canvas,{...lane.world,cubes:event.cubes,globalStep:event.globalStep||0,simTime:event.simTime||0,success:Boolean(event.success)},true);
  }catch{}
}
function handleWorkerEvent(event){
  if(event?.type==="preview"){
    const id=previewExpertId(event),expert=id?experts.get(id):null;
    if(expert){expert.preview=event.preview;expert.previewStarted=performance.now();expert.lastRenderedFrame=-1;expert.previewIdentity={envId:event.envId,batch:event.batchNumber,policyVersion:event.policyVersion};}
    return;
  }
  if(event?.type==="live-sim"){
    const id=String(event.group||"")+":"+String(event.mapKind||""),expert=experts.get(id);
    if(expert)drawLiveSimulation(expert,event);
    return;
  }
  if(event?.type==="worker-error"){log("WORKER ERROR · "+(event.message||"unknown"));return;}
}
function lineageEnabled(lineage){
  const c=readControls();return lineage==="A"?c.aEnabled:c.bEnabled;
}
function renderInitialExpertState(expert){
  const specs=expert.trainer?.lastTrainingEnvSpecsByGroup?.[expert.lineage]||[],spec=specs[0];
  if(!spec||!expert.canvas)return;
  const batch=(expert.batch||0)+1;
  if(expert.initialRenderedBatch===batch)return;
  try{
    const world=makeWorld(expert.trainer.stage||0,spec.envSeed,readControls().stepBudget,spec.mapKind||expert.map,spec.swarmSize||readControls().cells,2);
    drawWorld(expert.canvas,world,true);
    expert.initialRenderedBatch=batch;
  }catch{}
}
async function runGroupBatch(expert,simCount){
  if(expert.busy||!runControl.mayLaunch(expert.lineage,readControls()))return;
  const assigned=Math.max(1,Math.floor(Number(simCount)||1));
  expert.busy=true;expert.activeSimulations=assigned;expert.error=null;configureExpert(expert,assigned);clearSimulationLanes(expert,assigned);updateCard(expert);
  const requested=readControls();
  log(expert.id+" · batch "+(expert.batch+1)+" start · assigned sims "+assigned+" / lineage budget "+(expert.lineage==="A"?requested.aSimulations:requested.bSimulations)+" · steps "+requested.stepBudget);
  try{
    const result=await trainOneGroupBatch(
      pool,expert.trainer,expert.lineage,
      progress=>{expert.progress=progress;renderInitialExpertState(expert);updateCard(expert);},
      [],null,
      ()=>runControl.shouldContinue(expert.lineage,readControls())
    );
    if(!result?.skipped){
      expert.batch=Number(result.row?.groupBatch)||expert.batch+1;
      expert.metrics=expert.lineage==="A"?result.row?.A:result.row?.B;
      expert.totalSimulations=(expert.totalSimulations||0)+Math.max(0,Math.floor(Number(expert.metrics?.envs)||0));
      expert.policyVersion=result.row?.groupPolicyVersionEnd??result.row?.policyVersionEnd??expert.trainer.policyVersion;
      expert.simulationSummaries=result.simulationSummaries||[];
      log(expert.id+" · batch "+expert.batch+" complete · sims total "+expert.totalSimulations+" · success "+((Number(expert.metrics?.success)||0)*100).toFixed(1)+"%");
    }else{
      log(expert.id+" · quiesced · "+String(result.reason||"no new work"));
    }
  }catch(error){
    expert.error=error?.message||String(error);runControl.fail();log("FATAL "+expert.id+" · "+(error?.stack||error));await saveExpert(expert).catch(()=>{});
  }finally{
    expert.busy=false;expert.activeSimulations=0;expert.progress=null;updateCard(expert);
    settleRunState();
    if(runControl.mayLaunch(expert.lineage,readControls()))setTimeout(()=>kickLineage(expert.lineage),0);
  }
}
function kickLineage(lineage){
  const controls=readControls();
  if(!runControl.mayLaunch(lineage,controls))return;
  const budget=lineage==="A"?controls.aSimulations:controls.bSimulations;
  const plan=planLineageSimulationBudget(experts.values(),lineage,budget);
  for(const item of plan){
    const expert=experts.get(item.id);
    if(expert&&!expert.busy)void runGroupBatch(expert,item.simulations);
  }
}
function kickGroupLoops(){
  if(runControl.status!=="running")return;
  ensurePool();
  kickLineage("A");
  kickLineage("B");
}
async function saveAllExperts(){
  await saveBaseRoot();
  for(const expert of experts.values())await saveExpert(expert);
  await saveMeta({quiescent:true});
}
function settleRunState(){
  const anyBusy=[...experts.values()].some(e=>e.busy);
  if(anyBusy)return;
  applyPendingPoolResize();
  if((runControl.status==="pause_requested"||runControl.status==="stop_requested")&&!quiescentSaveBusy){
    const requested=runControl.status;runControl.noteQuiescent();updateTopStatus();quiescentSaveBusy=true;
    if(requested==="pause_requested"){
      void saveAllExperts().then(()=>log("PAUSED · all 12 expert states checkpointed at a quiescent boundary.")).catch(error=>{runControl.fail();updateTopStatus();log("PAUSE CHECKPOINT FAILED · "+(error?.stack||error));}).finally(()=>{quiescentSaveBusy=false;});
    }else{
      log("STOPPED · all 12 expert states quiescent; exporting exact states for PRINCIPAL fusion.");
      void exportFrozenPopulation().catch(error=>{runControl.fail();updateTopStatus();log("FUSION EXPORT FAILED · "+(error?.stack||error));}).finally(()=>{quiescentSaveBusy=false;});
    }
  }
}
async function start(){
  if(!booted)return;
  ensurePool();
  if(!gpuProbeDone){
    const ok=await probeTrainingGpu();
    if(!ok)return;
    gpuProbeDone=true;
  }
  if(runControl.start()){updateTopStatus();await saveMeta();log("RUNNING · V12 simulation-budget semantics restored · A/B controls are lineage-wide in-flight budgets distributed fairly across persistent experts.");kickGroupLoops();}
}
function pause(){
  if(runControl.requestPause()){updateTopStatus();log("PAUSE REQUESTED · no new batches; active experts stop at the next atomic microbatch boundary.");settleRunState();}
}
function stop(){
  if(runControl.requestStop()){updateTopStatus();log("STOP REQUESTED · no new batches; active experts quiesce, then the complete population is frozen in IndexedDB.");settleRunState();}
}
async function resetFresh(){
  if([...experts.values()].some(e=>e.busy)){log("RESET blocked while expert work is in flight. Pause/Stop first.");return;}
  if(!confirm("Delete the saved 12-expert population and create a fresh common root?"))return;
  if(pool){pool.destroy();pool=null;}freezeExported=false;freezeExportBusy=false;
  await clearPopulation();location.reload();
}
function onConfigChange(event){
  const c=readControls();writeControls(c);
  if([ui.workers,ui.aSims,ui.bSims,ui.aEnabled,ui.bEnabled].includes(event?.target))ensurePool();
  void saveMeta({configChangedAt:now()});
  if(event?.target===ui.aEnabled||event?.target===ui.bEnabled){
    log("Active lineage change · A="+c.aEnabled+" B="+c.bEnabled+" · takes effect at atomic microbatch boundary.");
    if(runControl.status==="running")kickGroupLoops();
  }else log("Runtime config changed · next clean expert batch uses A="+c.aSimulations+" B="+c.bSimulations+" steps="+c.stepBudget+".");
}
function resourceWorkerCap(){
  const hc=navigator.hardwareConcurrency||8,config=[...experts.values()][0]?.trainer?.config||DEFAULT_CONFIG;
  const over=Math.max(1,Math.min(3,Number(config.workerOversubscription)||2)),controls=readControls();
  const demand=(controls.aEnabled?controls.aSimulations:0)+(controls.bEnabled?controls.bSimulations:0);
  return Math.max(1,Math.min(64,Math.ceil(hc*over),Math.max(1,demand)));
}
async function pollResourceStatus(){
  try{
    const r=await fetch("/compute/resource/status",{cache:"no-store"});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const s=await r.json();if(s?.ok){resourceStatus=s;return s;}
  }catch(error){if(!resourceStatus)log("Resource telemetry unavailable · "+(error?.message||error));}
  return null;
}
async function autoTuneResources(){
  const config=[...experts.values()][0]?.trainer?.config;
  if(resourceTuneBusy||!config||!pool||config.autoResourceScaling===false)return;
  resourceTuneBusy=true;
  try{
    const s=await pollResourceStatus();if(!s)return;
    const cpu=Math.max(0,Math.min(1,(Number(s.cpuPercent)||0)/100)),ram=Math.max(0,Math.min(1,(Number(s.memoryPercent)||0)/100));
    const target=Math.max(.25,Math.min(.95,Number(config.cpuTargetUtilization)||.82)),high=Math.max(target+.03,Math.min(.99,Number(config.cpuHighUtilization)||.94)),ceiling=Math.max(.6,Math.min(.98,Number(config.ramCeilingUtilization)||.90));
    const cap=resourceWorkerCap(),current=pool.count;let desired=Math.min(current,cap);
    if(current>cap)desired=cap;
    else if(ram>=ceiling&&current>1)desired=Math.max(1,current-Math.max(1,Math.ceil(current*.2)));
    else if(cpu<target-.08&&current<cap)desired=Math.min(cap,current+Math.max(1,Math.ceil((cap-current)*.35)));
    else if(cpu>high&&current>1)desired=Math.max(1,current-1);
    if(desired!==current){
      ui.workers.value=String(desired);
      for(const expert of experts.values())setTrainerConfig(expert.trainer,{workerThreadCount:desired});
      const actual=pool.resize(desired);
      pendingWorkerShrink=actual>desired?desired:null;
      log("AUTO SCALE · target "+current+"→"+desired+" · actual "+actual+" · CPU "+Math.round(cpu*100)+"% · RAM "+Math.round(ram*100)+"%");
    }
  }finally{resourceTuneBusy=false;}
}
async function probeTrainingGpu(){
  const sample=[...experts.values()].find(e=>e.lineage==="A")||[...experts.values()][0],config=sample?.trainer?.config;
  if(!config?.gpuEnabled){log("GPU backend disabled by canonical V9 config; CPU fallback active.");return true;}
  if(!pool?.count)return false;
  const nativeRequired=config.nativeMultiGpuEnabled!==false&&config.nativeMultiGpuRequired===true;
  const probeConfig={gpuEnabled:true,gpuTargetUtilization:config.gpuTargetUtilization,gpuRequired:false,nativeMultiGpuEnabled:config.nativeMultiGpuEnabled!==false,nativeMultiGpuRequired:nativeRequired,nativeGpuMinDevices:Math.max(1,Number(config.nativeGpuMinDevices)||1),nativeGpuTargetUtilization:Number(config.nativeGpuTargetUtilization)||.75,nativeGpuVerify:true};
  const nativeShared=probeConfig.nativeMultiGpuEnabled!==false;
  const jobs=nativeShared
    ?[pool.submit({type:"gpu-probe",group:"GPU-PROBE",probeIndex:0,config:probeConfig,model:sample.trainer.groupA})]
    :Array.from({length:pool.count},(_,i)=>pool.submit({type:"gpu-probe",group:"GPU-PROBE",probeIndex:i,config:probeConfig}));
  const settled=await Promise.allSettled(jobs),rows=settled.map(x=>x.status==="fulfilled"?x.value?.gpu:null).filter(Boolean);
  const nativeOk=nativeShared&&rows.some(x=>x.available&&x.verified!==false),ready=nativeOk?pool.count:rows.filter(x=>x.available).length;
  const reasons=[...new Set([...rows.map(x=>x.reason).filter(Boolean),...settled.filter(x=>x.status==="rejected").map(x=>x.reason?.message||String(x.reason))])];
  const devices=[...new Set(rows.flatMap(x=>(x.devices||[]).map(d=>d.name||d.device||d.vendor).filter(Boolean)))];
  const target=nativeShared?(Number(config.nativeGpuTargetUtilization)||.75):(Number(config.gpuTargetUtilization)||.75);
  log((nativeShared?"NATIVE MULTI-GPU":"WebGPU")+" preflight · "+ready+"/"+pool.count+" workers ready · target "+Math.round(target*100)+"%"+(devices.length?" · "+devices.join(" + "):"")+(reasons.length?" · "+reasons.join(" | "):""));
  if(!ready&&nativeRequired)return false;
  if(!ready&&config.gpuRequired===true)return false;
  return true;
}
async function pollResources(){
  try{
    const r=await fetch("/compute/resource/status",{cache:"no-store"});if(r.ok)resourceStatus=await r.json();
    if(resourceStatus?.ok){
      ui.cpuState.textContent="CPU "+Number(resourceStatus.cpuPercent||0).toFixed(0)+"% · RAM "+Number(resourceStatus.memoryPercent||0).toFixed(0)+"%";
      const gpu=resourceStatus.nativeGpu,devs=Array.isArray(gpu?.devices)?gpu.devices:[];
      ui.gpuState.textContent=gpu?.ok?"GPU OpenCL · "+devs.map(d=>d.name).join(" + "):"GPU unavailable";
      ui.gpuState.className=gpu?.ok?"pill ok":"pill bad";
    }
  }catch{ui.cpuState.textContent="CPU telemetry unavailable";}
  setTimeout(pollResources,1500);
}
function updatePoolUi(){
  if(!pool){ui.workerState.textContent="workers: 0";ui.queueState.textContent="queue: 0";return;}
  const s=pool.snapshot(),a=s.workers.filter(w=>w.busy&&w.group==="A").length,b=s.workers.filter(w=>w.busy&&w.group==="B").length;
  ui.workerState.textContent="workers "+s.busy+"/"+s.count+" busy · A "+a+" · B "+b;
  ui.queueState.textContent="queue "+s.queued+" · pending "+s.pending;
}
function animate(nowMs){
  for(const expert of experts.values()){
    const p=expert.preview,canvas=expert.canvas;
    if(p?.frames?.length&&canvas){
      const fps=Math.max(1,Number(p.fps)||30),elapsed=Math.max(0,(nowMs-(expert.previewStarted||nowMs))/1000),frame=Math.min(p.frames.length-1,Math.floor(elapsed*fps));
      if(frame!==expert.lastRenderedFrame){
        try{drawPreviewFrame(canvas,p,frame,true);expert.lastRenderedFrame=frame;}catch(e){expert.error=expert.error||("render: "+e.message);}
      }
    }
  }
  requestAnimationFrame(animate);
}
async function boot(){
  writeControls(normalizeExpertLabControls({workerThreads:Math.max(1,navigator.hardwareConcurrency||8)}));
  const loaded=await loadPopulation();
  for(const e of loaded){experts.set(e.id,e);createCard(e);configureExpert(e);updateCard(e);}
  await saveBaseRoot();
  ensurePool();booted=true;updateTopStatus();await saveMeta({bootedAt:now()});
  ui.persist.textContent="checkpoint: ready";
  log("Expert Lab ready · canonical V9 WorkerPool/GPU/physics/renderer · 12 persistent experts · A/B controls are total lineage simulation budgets, not per-map multipliers.");
  pollResources();void autoTuneResources();
  resourceTuneTimer=setInterval(()=>{void autoTuneResources();},Math.max(1000,Number(DEFAULT_CONFIG.resourceTuneMs)||3000));
  runtimeUiTimer=setInterval(()=>{updatePoolUi();for(const e of experts.values())updateCard(e);},1000);
  requestAnimationFrame(animate);
}

ui.start.onclick=()=>void start();
ui.pause.onclick=pause;
ui.stop.onclick=stop;
ui.reset.onclick=()=>void resetFresh();
for(const el of [ui.aSims,ui.bSims,ui.stepBudget,ui.microbatch,ui.workers,ui.cells,ui.aEnabled,ui.bEnabled])el.addEventListener("change",onConfigChange);
window.addEventListener("pagehide",()=>{if(resourceTuneTimer)clearInterval(resourceTuneTimer);if(runtimeUiTimer)clearInterval(runtimeUiTimer);try{pool?.destroy();}catch{}},{once:true});

boot().catch(error=>{runControl.fail();updateTopStatus();log("BOOT FATAL · "+(error?.stack||error));ui.status.textContent="BOOT FAILED";ui.status.className="pill bad";});
