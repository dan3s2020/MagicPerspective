// V27 - UI-ONLY. No POST, no learner writes, no change of model state.
// Original app.js, text-hypermaze-live.js and veil-aether-live.js keep
// their original event handlers, replay, training, evaluators and benchmarks.
import {originalMetrics} from "./v27-native-metrics.mjs";
const $=id=>document.getElementById(id);
const set=(id,v)=>{const e=$(id);if(e)e.textContent=String(v??"—")};
let activeWorker=new URLSearchParams(location.search).get("w")??null;
const stamps=[];
let lastWorker=null;
function update(raw){
  const kpi=originalMetrics(raw,activeWorker),M=kpi.measured,L=kpi.labels;
  set("v27Aligned",L.aligned);set("v27Legacy",L.legacy);
  set("v27Together",L.together);
  set("v27MazeShape",L.mazeShape);set("v27MazeSolved",L.mazeSolved);
  set("v27MazeN",M.mazeTestN==null?"test.shape · fără N raportat":
    "test.shape · "+L.mazeN+" labirinte native");
  set("v27MazeRatio","pași/optim "+L.mazeRatio+" · test.solved");
  set("v27TransSolved",L.transSolved);
  set("v27TransError","predicții cauzale greșite "+L.transFailedRate);
  set("v27Progress",L.progress);set("v27ProgressSub",L.progressSub);
  set("v27Loss",L.loss);set("v27LossBaseline","baseline identitate "+L.baseline);
  set("v27TextN",M.textTestN==null?"test.aligned · text nevăzut":
    "test.aligned · "+M.textTestN+" caractere nevăzute");
  set("v27World",raw.world??"Lume neidentificată");
  set("v27Worker","GRAF NATIV #"+String(kpi.worker??"—")+" · "+kpi.status);
  const stamp=new Date().toLocaleTimeString("ro-RO");
  set("v27Update","Actualizat "+stamp);
  const runtime=$("v27Status");if(runtime){
    runtime.textContent="DATE NATIVE · CONECTAT";
    runtime.classList.add("ok");runtime.classList.remove("fail");
  }
  // IMPORTANT: do not compare worker numbers or experiment tasks across
  // different worker arms without recording exact underlying raw provenance.
  lastWorker=kpi.worker;
  return kpi;
}
function error(e){
  const el=$("v27Status");
  if(el){el.textContent="DATE NATIVE INDISPONIBILE";el.classList.add("fail");el.classList.remove("ok")}
  set("v27Update",String(e?.message||e).slice(0,180));
}
let pending=false;
async function poll(){
  if(pending||document.hidden)return;
  pending=true;
  try{
    const r=await fetch("/graphs",{cache:"no-store"});
    if(!r.ok)throw Error("HTTP "+r.status+" /graphs");
    const body=await r.json();
    if(!Array.isArray(body.graphs))throw Error("Nu este API-ul original V17 /graphs");
    // When the ORIGINAL selector changes, show the exact same native worker.
    const w=new URLSearchParams(location.search).get("w");
    const originalSelection=document.querySelector("#liveList .lgc.on")?.dataset.w;
    activeWorker=w!==null?w:(originalSelection??null);
    update(body);
  }catch(e){error(e)}
  finally{pending=false}
}
const targets={
 v27Dashboard:()=>window.scrollTo({top:0,behavior:"smooth"}),
 v27OriginalViewer:()=>document.querySelector(".app>.graph"),
 v27OriginalControls:()=>$("v27OriginalControls"),
 v27Results:()=>{
   // This invokes the ORIGINAL app.js tab handler and original /eval endpoint.
   $("tabEval")?.click();
   return $("v27OriginalControls");
 },
 v27Sources:()=>$("textMazeBox")
};
for(const btn of document.querySelectorAll(".v27-nav button")){
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".v27-nav button").forEach(b=>
      b.classList.toggle("v27-nav-active",b===btn));
    const target=targets[btn.dataset.target]?.();
    if(target instanceof Element)target.scrollIntoView({behavior:"smooth",block:"start"});
  });
}
// No new Start/Stop/Save buttons are implemented here: the original
// controls inside #livePanel and #evalPane are literally the old ones,
// retain original event handlers and call exact original endpoints.
await poll();
setInterval(poll,1500);
