// V43 UI adds REAL one-organism puppet telemetry to the unchanged native V42
// browser script. The original Start Training button remains the SAME control.
const el=id=>document.getElementById(id);
const set=(id,v)=>{const a=el(id);if(a)a.textContent=v==null?"—":String(v)};
const fmt=v=>Number.isFinite(Number(v))?Number(v).toLocaleString():"—";
const pct=v=>v==null||!Number.isFinite(Number(v))?"—":(100*Number(v)).toFixed(2)+"%";
const delta=v=>v==null||!Number.isFinite(Number(v))?"—":(v>=0?"+":"")+(100*Number(v)).toFixed(2)+" pp";
const node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n};
const model={items:new Map(),ids:[],older:null,current:null,history:[],busy:false,visible:true};
async function get(url){const r=await fetch(url,{cache:"no-store"});const j=await r.json();if(!r.ok||j.error)throw Error(j.error||r.statusText);return j;}
function counts(r){return r?fmt(r.correct)+" correct / "+fmt(r.wrong)+" wrong · "+pct(r.accuracy):"not measured";}
function reason(r){
 const p1=r.player1||{},p2=r.player2||{},d=r.diagnosis||{};
 return [
   "This is ONE native V42 Brain, two internal movement spaces.",
   "Original V42 initial route: "+counts(p1.before?.score),
   "Qwen-puppet frozen physical route: "+counts(p2.score),
   "Original V42 after observation: "+counts(p1.after?.score),
   "Change: "+delta(p1.deltaAccuracy),
   "Puppet physical actions: "+fmt(p2.actions),
   "Reused original native shape routes: "+fmt(p2.cachedOriginalRoutes),
   "Original routes found: "+fmt(p2.uniqueOriginalRoutes),
   "Missing first text character before: "+(d.firstUnreachedIndexBefore??"none"),
   "Missing first text character after: "+(d.firstUnreachedIndexAfter??"none"),
   "Original Brain experience: "+(d.transferStatus||"unknown"),
   p1.transferError?"Transfer error: "+p1.transferError:"",
   d.note||"A training-world demonstration is not independent unseen accuracy."
 ].filter(Boolean).join("\n");
}
function detail(r){
 const tr=node("tr",undefined,"v43-expansion");
 const cell=node("td");cell.colSpan=9;
 const grid=node("div",undefined,"v43-details");
 const sections=[
   ["ENTIRE INPUT",r.input],
   ["ENTIRE EXERCISE REFERENCE",r.exerciseReference],
   ["PLAYER 1 ORIGINAL BEFORE · COMPLETE TEXT",r.player1?.before?.text],
   ["PLAYER 2 · TEXT FROM QWEN PHYSICAL MOVEMENTS",r.player2?.output],
   ["PLAYER 1 ORIGINAL AFTER · COMPLETE TEXT",r.player1?.after?.text],
   ["PER-EXERCISE DIAGNOSIS",reason(r)],
   ["ORIGINAL PLAYER 1 BEFORE · SOLUTION-SHAPE PATH",JSON.stringify(r.player1?.before?.route||[],null,2)],
   ["ORIGINAL PLAYER 1 AFTER · SOLUTION-SHAPE PATH",JSON.stringify(r.player1?.after?.route||[],null,2)],
   ["FULL FROZEN QWEN-PUPPET MOVEMENTS",JSON.stringify(r.player2?.allMovements||[],null,2)],
   ["CHARACTER MISMATCH POSITIONS · PLAYER 1 BEFORE",JSON.stringify(r.player1?.before?.score?.mismatches||[],null,2)],
   ["CHARACTER MISMATCH POSITIONS · PLAYER 1 AFTER",JSON.stringify(r.player1?.after?.score?.mismatches||[],null,2)],
   ["CHARACTER MISMATCH POSITIONS · QWEN-PUPPET",JSON.stringify(r.player2?.score?.mismatches||[],null,2)]
 ];
 for(const [header,content] of sections){
   const block=node("div"),title=node("h4",header),pre=node("pre",content??"—");
   block.append(title,pre);grid.append(block);
 }
 cell.append(grid);tr.append(cell);return tr;
}
function render(){
 const fragment=document.createDocumentFragment();
 for(const id of model.ids){
   const r=model.items.get(id);if(!r)continue;
   const tr=node("tr");
   const values=[
     "#"+r.id+(r.sourceRow==null?"":" · row "+r.sourceRow),
     pct(r.player1?.before?.score?.accuracy),
     pct(r.player2?.score?.accuracy),
     pct(r.player1?.after?.score?.accuracy),
     fmt(r.player1?.before?.score?.correct)+" / "+fmt(r.player1?.before?.score?.wrong),
     fmt(r.player2?.score?.correct)+" / "+fmt(r.player2?.score?.wrong),
     fmt(r.player1?.after?.score?.correct)+" / "+fmt(r.player1?.after?.score?.wrong),
     delta(r.player1?.deltaAccuracy)
   ];
   for(const value of values)tr.append(node("td",value));
   const control=node("td"),button=node("button","Inspect","tiny-btn");
   button.type="button";button.setAttribute("aria-expanded","false");
   button.addEventListener("click",()=>{
     const expanded=button.getAttribute("aria-expanded")==="true";
     if(expanded){if(tr.nextSibling?.classList.contains("v43-expansion"))tr.nextSibling.remove();}
     else tr.after(detail(r));
     button.setAttribute("aria-expanded",String(!expanded));
     button.textContent=expanded?"Inspect":"Close";
   });
   control.append(button);tr.append(control);fragment.append(tr);
 }
 el("v43Rows").replaceChildren(fragment);
 el("v43Older").disabled=model.busy||model.older===null;
 set("v43JournalCount",fmt(model.ids.length)+" full exercise records loaded; older records available in original journal.");
}
function showLatest(r){
 if(!r)return;
 set("v43CurrentId","#"+fmt(r.id)+(r.sourceRow==null?"":" · source "+fmt(r.sourceRow)));
 set("v43CurrentBefore",pct(r.player1?.before?.score?.accuracy));
 set("v43CurrentQwen",pct(r.player2?.score?.accuracy));
 set("v43CurrentAfter",pct(r.player1?.after?.score?.accuracy));
 set("v43BeforeCount",counts(r.player1?.before?.score));
 set("v43QwenCount",counts(r.player2?.score)+" · "+fmt(r.player2?.actions)+" movements");
 set("v43AfterCount",counts(r.player1?.after?.score)+" · "+delta(r.player1?.deltaAccuracy));
 for(const [id,value] of [
   ["v43Question",r.input],["v43Reference",r.exerciseReference],
   ["v43TextBefore",r.player1?.before?.text],["v43TextPuppet",r.player2?.output],
   ["v43TextAfter",r.player1?.after?.text],["v43Diagnosis",reason(r)]
 ])set(id,value);
}
function merge(items){
 for(const item of items||[])if(item&&Number.isSafeInteger(item.id))model.items.set(item.id,item);
 model.ids=[...model.items.keys()].sort((a,b)=>b-a);
 if(model.ids.length){const first=model.items.get(model.ids[0]);if(model.current!==first.id){model.current=first.id;showLatest(first);}}
 render();
}
async function recent(){
 const report=await get("/api/v43-exercises?limit=25");
 merge(report.items);
 if(model.older===null&&model.ids.length)
   model.older=Math.min(...model.ids);
}
async function older(){
 if(model.busy||model.older===null)return;
 model.busy=true;el("v43Older").disabled=true;
 try{
   const report=await get("/api/v43-exercises?limit=25&before="+model.older);
   merge(report.items);
   model.older=(report.items?.length??0)===25?report.olderCursor:null;
 }catch(e){set("v43JournalCount","Journal error: "+e.message);}
 finally{model.busy=false;render();}
}
el("v43Older").addEventListener("click",older);
function graph(visible){
 model.visible=visible;
 document.body.classList.toggle("v43-universe-hidden",!visible);
 el("v43ToggleGraph").textContent=visible?"Hide universe graph":"Show universe graph";
 el("v43ToggleGraph").setAttribute("aria-expanded",String(visible));
 el("v43OriginalUniverse").hidden=!visible;
 try{localStorage.setItem("magic-v43-universe-graph",visible?"visible":"hidden")}catch{}
 requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")));
}
el("v43ToggleGraph").addEventListener("click",()=>graph(!model.visible));
try{model.visible=localStorage.getItem("magic-v43-universe-graph")!=="hidden"}catch{}
graph(model.visible);
function chart(id,rows,series,speed=false){
 const canvas=el(id);if(!canvas)return;
 const width=Math.max(250,canvas.getBoundingClientRect().width),height=220,ratio=devicePixelRatio||1;
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
 const margin={l:45,r:22,t:12,b:25},cw=width-margin.l-margin.r,ch=height-margin.t-margin.b;
 ctx.font="10px system-ui";ctx.fillStyle="#94b3cc";ctx.textAlign="right";
 for(let k=0;k<=4;k++){
   const y=margin.t+ch*k/4;
   ctx.strokeStyle="#294258";ctx.beginPath();ctx.moveTo(margin.l,y);ctx.lineTo(width-margin.r,y);ctx.stroke();
   if(!speed)ctx.fillText((100-25*k)+"%",margin.l-7,y+3);
 }
 if(!rows.length){ctx.textAlign="center";ctx.fillText("Waiting for REAL completed exercises",width/2,height/2);return;}
 const data=rows.slice(-240);
 for(const s of series){
   const values=data.map((v,i)=>s.read(v,i,data));
   const top=speed?Math.max(1,...values.filter(Number.isFinite)):1;
   ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.lineJoin="round";
   ctx.beginPath();let active=false;
   for(let i=0;i<values.length;i++){
     if(!Number.isFinite(values[i])){active=false;continue;}
     const x=margin.l+cw*(data.length===1?.5:i/(data.length-1));
     const y=margin.t+ch*(1-Math.min(1,Math.max(0,values[i]/top)));
     if(!active)ctx.moveTo(x,y);else ctx.lineTo(x,y);active=true;
   }
   ctx.stroke();
 }
 ctx.textAlign="left";ctx.fillStyle="#9dbccf";ctx.fillText("#"+data[0].id,margin.l,height-5);
 ctx.textAlign="right";ctx.fillText("#"+data.at(-1).id,width-margin.r,height-5);
}
function drawCharts(){
 chart("v43AccuracyChart",model.history,[
   {color:"#eba6c5",read:r=>r.before},
   {color:"#81c7f4",read:r=>r.player2},
   {color:"#7ee8ba",read:r=>r.after}
 ]);
 chart("v43SpeedChart",model.history,[
   {color:"#f2d18c",read:(r,i,a)=>i?1/Math.max(.001,(Date.parse(r.at)-Date.parse(a[i-1].at))/1000):NaN},
   {color:"#7ee8ba",read:(r,i,a)=>i?Number(r.characters||0)/Math.max(.001,(Date.parse(r.at)-Date.parse(a[i-1].at))/1000):NaN}
 ],true);
}
window.addEventListener("resize",drawCharts);
let inFlight=false,lastCompleted=-1;
async function refresh(){
 if(inFlight)return;inFlight=true;
 try{
   const data=await get("/api/v43-status");
   const w=data.worker||{},d=data.dataset||{};
   set("v43Phase",(data.phase||"ready").toUpperCase());
   set("v43Percent",d.v43Percent==null?"—":Number(d.v43Percent).toFixed(2)+"%");
   set("v43Dataset",fmt(d.completedTrainingRows)+" / "+fmt(d.assignedTrainingRows)+" original dataset exercises · "+fmt(d.v43Completed)+" newly fused V43");
   set("v43Completed",fmt(d.v43Completed));
   set("v43Speed",Number.isFinite(Number(w.completedExercisesPerSecond))?Number(w.completedExercisesPerSecond).toFixed(2):"—");
   set("v43CharSpeed",Number.isFinite(Number(w.completedCharactersPerSecond))?Number(w.completedCharactersPerSecond).toFixed(1):"—");
   const current=w.lastExercise;
   if(current){
     set("v43BeforePct",pct(current.player1?.before?.score?.accuracy));
     set("v43QwenPct",pct(current.player2?.score?.accuracy));
     set("v43AfterPct",pct(current.player1?.after?.score?.accuracy));
     if(model.current===null)showLatest(current);
   }
   model.history=Array.isArray(w.history)?w.history:[];
   drawCharts();
   if(Number(w.completed)>0&&(Number(w.completed)!==lastCompleted||!model.ids.length)){
     await recent();lastCompleted=Number(w.completed);
   }
 }catch(e){set("v43Phase","LIVE V43 unavailable: "+e.message);}
 finally{inFlight=false;}
}
refresh();setInterval(refresh,1700);
