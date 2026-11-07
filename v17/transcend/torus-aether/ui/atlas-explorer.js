// Read-only atlas viewer for native V17 / V23; no simulated data and no training mutations.
const el=id=>document.getElementById(id),canvas=el("v30AtlasCanvas");
if(canvas){
const ctx=canvas.getContext("2d"),entries=[];let cursor=0,end=false,chosen=null,scale=1,panX=0,panY=0,seen=new Set(),drag=null;
const worker=()=>Math.max(0,Math.trunc(Number(el("v30AtlasWorker").value)||0));
const state=s=>Array.isArray(s)?s.join(" "):String(s);
const filterRows=()=>entries.map((event,i)=>({event,i})).filter(({event:e})=>{
 const f=el("v30AtlasResult").value;
 return !f||(f==="found"&&e.type==="planning-attempt"&&e.found)||
 (f==="missing"&&e.type==="planning-attempt"&&!e.found)||
 (f==="blocked"&&(e.accepted===false||e.diagnostics?.excludedByDesign?.length))||
 (f==="evidence"&&e.type==="rule-evidence")||
 (f==="chars"&&e.type==="answer-evaluation"&&!e.answerExact);
});
function describe(){
const attempts=entries.filter(e=>e.type==="planning-attempt"),ok=attempts.filter(e=>e.found).length;
el("v30AtlasStats").textContent="Încărcate "+entries.length+" înregistrări; trasee "+ok+"/"+attempts.length+
 "; încercări eșuate "+(attempts.length-ok)+". Numai paginile încărcate sunt contabilizate; exportul conține TOATE evenimentele.";
}
function list(){
const area=el("v30AtlasList"),frag=document.createDocumentFragment();area.replaceChildren();
for(const {event:e,i} of filterRows()){
 const b=document.createElement("button");b.type="button";
 b.style.cssText="display:block;width:100%;text-align:left;margin:3px 0;white-space:normal;font:12px ui-monospace,monospace";
 b.style.borderColor=e.type==="planning-attempt"?(e.found?"#368b76":"#bb5a6a"):"#426178";
 b.textContent="#"+(i+1)+" "+e.type+" "+(e.type==="planning-attempt"?(e.found?"PATH":"NO PATH"):"OBSERVED")+
 " · "+(e.fullAtlas?.states?.length||0)+" states · "+(e.date||"");
 b.onclick=()=>select(e);frag.appendChild(b);
}
area.appendChild(frag);if(!area.childNodes.length)area.textContent="Nu există evenimente pentru acest filtru și paginile încărcate.";
describe();
}
function predicted(e){
if(e?.type==="answer-evaluation")return e.predictedAnswer??null;
if(e?.type!=="planning-attempt"||!e.found)return null;
const a=e.fullAtlas?.states||[],p=e.fullPredictedPath||[],i=p.length?p.at(-1).to:0;
return a[i]===undefined?null:state(a[i]);
}
function compare(){
const p=predicted(chosen),ref=el("v30AtlasReference").value,out=el("v30AtlasChars");
if(!ref){out.textContent="Introdu referința după predicție; comparația se face LOCAL în browser, fără trimiterea răspunsului la organism.";return;}
if(p===null){out.textContent="Nu există un răspuns întreg prezis pentru acest eveniment.";return;}
const a=Array.from(p),b=Array.from(ref),n=Math.max(a.length,b.length),errors=[];let right=0;
for(let i=0;i<n;i++){if(a[i]===b[i])right++;else errors.push({index:i,guess:a[i]??"∅",truth:b[i]??"∅"});}
out.textContent="RĂSPUNS ÎNTREG EXACT: "+(p===ref)+" · caractere "+right+"/"+n+"\n"+
 "Prima diferență: "+(errors[0]?.index??"niciuna")+"\n"+
 errors.map(x=>x.index+": ghicit "+JSON.stringify(x.guess)+" / corect "+JSON.stringify(x.truth)).join("\n");
}
function geometry(states,neighbors){
const n=states.length,d=new Int32Array(n).fill(-1),q=n?[0]:[];if(n)d[0]=0;
for(let k=0;k<q.length;k++)for(const e of neighbors[q[k]]||[])
 if(e.to>=0&&e.to<n&&d[e.to]<0){d[e.to]=d[q[k]]+1;q.push(e.to);}
const layers=new Map();for(let i=0;i<n;i++){const v=d[i];if(!layers.has(v))layers.set(v,[]);layers.get(v).push(i);}
const max=Math.max(1,...d),xy=new Array(n);
for(const [level,ids] of layers)for(let j=0;j<ids.length;j++)
 xy[ids[j]]=[(level<0?.97:.05+.88*level/max)*canvas.width,(.06+.87*(j+1)/(ids.length+1))*canvas.height];
return xy;
}
function draw(){
ctx.fillStyle="#06131f";ctx.fillRect(0,0,canvas.width,canvas.height);
if(!chosen?.fullAtlas?.states?.length){
 ctx.fillStyle="#b9cddd";ctx.fillText("Selectează un eveniment de planificare real din jurnal.",20,38);return;
}
const {states=[],neighbors=[],targets=[]}=chosen.fullAtlas,p=chosen.fullPredictedPath||[],xy=geometry(states,neighbors);
const route=new Set(p.map(x=>x.from+":"+x.to+":"+x.action)),goals=new Set(targets);
ctx.save();ctx.translate(panX,panY);ctx.scale(scale,scale);
let count=0;
for(let i=0;i<neighbors.length;i++)for(const e of neighbors[i]||[]){
 const a=xy[i],b=xy[e.to];if(!a||!b)continue;
 const on=route.has(i+":"+e.to+":"+e.action);
 ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
 ctx.strokeStyle=on?"#f0c251":e.crossWorld?"#aa84db":e.verified?"#27c99e":"#8ca9c0";
 ctx.globalAlpha=on?1:.23;ctx.lineWidth=on?2.7:.7;ctx.stroke();count++;
}
ctx.globalAlpha=1;
for(let i=0;i<xy.length;i++){const [x,y]=xy[i];ctx.beginPath();ctx.arc(x,y,i===0||goals.has(i)?4.4:1.6,0,Math.PI*2);
ctx.fillStyle=i===0?"#72b7fd":goals.has(i)?"#6ce8aa":"#b5c7d5";ctx.fill();}
ctx.restore();ctx.font="12px monospace";ctx.fillStyle="#e8f2fc";
ctx.fillText("2D proiecție a distanței în graf (NU axe 4D învățate)",10,19);
ctx.fillText(states.length+" stări, "+count+" muchii; auriu=traseu, mov=transfer ipotetic",10,canvas.height-10);
}
function select(e){
chosen=e;scale=1;panX=panY=0;el("v30AtlasZoom").value="1";
const graph=e.fullAtlas||{},states=graph.states||[],edges=graph.neighbors||[],p=e.fullPredictedPath||[];
if(e.type==="answer-evaluation")el("v30AtlasReference").value=e.expectedAnswer??"";
const lines=[
"EVENIMENT: "+e.type+"; success="+e.found+"; time="+e.date,
"Metoda originală: "+(e.originalMethod||"indisponibil")+"; evaluare înghețată="+!!e.frozen,
"Stări="+states.length+"; muchii="+edges.reduce((s,x)=>s+(x?.length||0),0)+"; ținte="+(graph.targets?.length||0),
"CAUZA EȘECULUI: "+(e.reason||e.diagnostics?.failureReason||"neînregistrată"),
"PERETE OBSERVAT: "+(e.accepted===false)+"; acțiune: "+(e.action||"—"),
"SURSĂ PREDICȚIE: "+(e.source||"nu este măsurată")+", controlată de Discoverer="+(e.causallyDrivenByDiscovererPath??"not measured"),
"PRIMA EROARE CARACTER: "+(e.firstMismatch??"niciuna")+", răspuns întreg exact: "+(e.answerExact??"not scored"),
"BLOCAJ ÎNTRE MOTOARE: "+(e.blockedByDesign||"not observed"),
"LIMITĂ IMPUSĂ DE DESIGN: "+(e.diagnostics?.excludedByDesign||[]).join("; "),
"DATE DIAGNOSTICE: "+JSON.stringify(e.diagnostics||null),
"PAS CU PAS · traseu prezis înainte de prima acțiune:"
];
if(!p.length)lines.push("NU EXISTĂ O CALE PREZISĂ");
else p.forEach((h,i)=>lines.push((i+1)+". "+h.from+" → "+h.to+" : "+h.action+
 " ["+(h.verified?"verified":"unverified hypothesis")+"]"));
el("v30AtlasDetail").textContent=lines.join("\n");
el("v30AtlasPredicted").textContent=predicted(e)??"NO FULL PRE-ACTION ANSWER";
compare();draw();
}
async function load(reset=false){
if(reset){entries.length=0;seen=new Set();cursor=0;end=false;chosen=null;el("v30AtlasReference").value="";draw();}
if(end){el("v30AtlasStatus").textContent="Sfârșitul jurnalului încărcat. Reîncarcă pentru noi evenimente.";return;}
if(seen.has(cursor)){el("v30AtlasStatus").textContent="EROARE: cursor repetat; nu ignor evenimente.";return;}
const here=cursor;seen.add(here);
const url="/atlas?w="+worker()+"&cursor="+here+"&limit=50&kind="+encodeURIComponent(el("v30AtlasKind").value);
el("v30AtlasStatus").textContent="Citesc evenimente de pe discul workerului...";
try{
const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
const d=await r.json();if(d.error)throw Error(d.error);
if(!Array.isArray(d.rows)||!Number.isSafeInteger(d.nextCursor))throw Error("Invalid atlas response");
entries.push(...d.rows);cursor=d.nextCursor;end=!!d.end;
el("v30AtlasStatus").textContent="Fișier "+d.totalBytes+" bytes · cursor "+cursor+(end?" · până la capăt":" · mai există pagini");
el("v30AtlasExport").href="/atlas-export?w="+worker();list();if(!chosen&&entries.length)select(entries.at(-1));
}catch(err){seen.delete(here);el("v30AtlasStatus").textContent="EROARE: "+err.message;}
}
el("v30AtlasLoad").onclick=()=>load();
el("v30AtlasReload").onclick=()=>load(true);
el("v30AtlasKind").onchange=()=>load(true);
el("v30AtlasWorker").onchange=()=>load(true);
el("v30AtlasResult").onchange=list;
el("v30AtlasReference").oninput=compare;
el("v30AtlasZoom").oninput=e=>{scale=Number(e.target.value);draw();};
canvas.addEventListener("wheel",e=>{e.preventDefault();scale=Math.min(4,Math.max(.35,scale*(e.deltaY>0?.91:1.09)));el("v30AtlasZoom").value=scale;draw();},{passive:false});
canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,px:panX,py:panY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!drag)return;const r=canvas.getBoundingClientRect();panX=drag.px+(e.clientX-drag.x)*canvas.width/r.width;panY=drag.py+(e.clientY-drag.y)*canvas.height/r.height;draw();});
canvas.addEventListener("pointerup",()=>drag=null);canvas.addEventListener("pointercancel",()=>drag=null);
draw();
// Explicit opt-in for real native browser integration testing; default UI unchanged.
if(new URLSearchParams(location.search).get("atlasAutoLoad")==="1")load();
}
