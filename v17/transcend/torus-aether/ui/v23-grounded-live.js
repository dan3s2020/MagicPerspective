// V24: purely observational UI attached to ORIGINAL V17 page.
// This script never synthesizes a graph, answer or physical action.
// A colored line visualizes a frozen candidate route, NOT execution.
const $ = id => document.getElementById(id);
const els = ["v23LabBox","v23Kind","v23Learn","v23LearnOut","v23Evidence","v23Document","v23Question",
  "v23Noise","v23Seed","v23Plan","v23PlanOut","v23PathCanvas","v23Prev","v23Next",
  "v23Play","v23Pause","v23Scrub","v23ScrubLabel","v23PageOut"];
const missing=els.filter(id=>!$(id));
if(missing.length)throw Error("V23 observatory markup missing: "+missing.join(","));
let frozen=null, page=[],cursor=0,offset=0,animation=null;
const count = n => Number(n||0).toLocaleString("ro-RO");
const selectedBrain = () => {
  const selected=document.querySelector(".lgc.on[data-w]");
  return selected?Number(selected.dataset.w):0;
};
async function post(command,payload={}){
  const req={w:selectedBrain(),kind:$("v23Kind").value,command,...payload};
  const res=await fetch("/v23-lab",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(req)});
  const data=await res.json();
  if(!res.ok||data.error)throw Error(data.error||"V23 native service HTTP "+res.status);
  return data;
}
function stop(){
  if(animation!==null){clearInterval(animation);animation=null;}
  $("v23Play").disabled=false;
}
function setOut(id,message){$(id).textContent=String(message);}
function render(){
  const cv=$("v23PathCanvas"),g=cv.getContext("2d"),W=cv.width,H=cv.height;
  if(!g)return;
  g.clearRect(0,0,W,H);
  g.fillStyle="#07101b";g.fillRect(0,0,W,H);
  g.font="14px ui-monospace, monospace";
  if(!frozen?.found||!page.length){
    g.fillStyle="#b6cce1";g.fillText("Niciun traseu REAL produs de Discoverer.shape()",20,30);
    return;
  }
  const y=142,n=page.length,maxShown=Math.min(64,n);
  const begin=Math.max(0,Math.min(n-maxShown,cursor-Math.floor(maxShown/2)));
  const xstep=(W-70)/Math.max(1,maxShown-1);
  const x=i=>35+(i-begin)*xstep;
  g.strokeStyle="#b5a874";g.lineWidth=3;g.beginPath();
  for(let i=begin;i<begin+maxShown;i++){
    if(i===begin)g.moveTo(x(i),y);else g.lineTo(x(i),y);
  }
  g.stroke();
  // Every node is a real computed path step; this is a 2D PROJECTION
  // of temporal order, NOT an invented physical fourth/fifth dimension.
  for(let i=begin;i<begin+maxShown;i++){
    const e=page[i],focus=i===cursor;
    g.beginPath();g.arc(x(i),y,focus?9:4,0,Math.PI*2);
    g.fillStyle=focus?"#74eff7":"#ebd898";g.fill();
    if(focus||i%Math.max(1,Math.floor(maxShown/9))===0){
      g.fillStyle="#c0d9f3";g.font="11px ui-monospace,monospace";
      g.fillText("#"+count(e.index),Math.max(5,x(i)-18),y+26);
    }
  }
  const L=frozen.levels||[];
  const depth=Math.max(0,...L.map(a=>a.depth||0));
  for(let k=0;k<=Math.min(depth,12);k++){
    const rows=L.filter(a=>a.depth===k);
    const v=rows.filter(a=>Number.isFinite(a.fieldAtStart)&&a.fieldAtStart>0);
    g.fillStyle=["#ffc977","#80b0fa","#87dbb0","#b9a8ff"][k%4];
    g.font="12px ui-monospace,monospace";
    const avg=v.length?v.reduce((a,b)=>a+Math.log10(b.fieldAtStart),0)/v.length:null;
    g.fillText("Scara "+k+" • "+count(rows.length)+" campuri calculate • "+(avg===null?"fara camp":"medie log10(Vstart) "+avg.toFixed(2)),20,27+k*19);
  }
  const e=page[cursor];
  g.font="13px ui-monospace,monospace";g.fillStyle="#daebff";
  g.fillText("Forma prezisa INAINTE de miscare | pas "+count(e.index+1)+"/"+count(frozen.path.total),20,H-52);
  g.fillText("Actiune: "+String(e.action).slice(0,130),20,H-30);
  $("v23Scrub").max=String(Math.max(0,n-1));
  $("v23Scrub").value=String(cursor);
  $("v23ScrubLabel").textContent=count(e.index+1)+" / "+count(frozen.path.total);
  $("v23PageOut").textContent="FROZEN PLAN (nu este fizica executata)\n"+
    "Pas global: "+count(e.index)+
    "\nActiune observata/inferata: "+e.action+
    "\nStare din plan: "+String(e.from)+" -> "+String(e.to)+
    "\nSursa in document: "+String(e.sourceIndex??"n/a")+
    "\nRegula numerica: "+JSON.stringify(e.rule)+
    "\nActual: NEEXECUTAT; nu exista feedback fizic pentru acest test"+
    "\nHASH traseu complet: "+frozen.sha256;
}
async function turnPage(start){
  if(!frozen?.found)return;
  stop();
  const data=await post("page",{planId:frozen.planId,offset:start,limit:100});
  if(!data.found)throw Error(data.reason||"Frozen plan cache unavailable");
  page=data.path.steps;offset=data.path.offset;cursor=0;
  render();
}
$("v23Learn").onclick=async()=>{
  const b=$("v23Learn");stop();b.disabled=true;
  setOut("v23LearnOut","Conectez observatii explicite la Brain-ul nativ...");
  try{
    const observations=JSON.parse($("v23Evidence").value);
    if(!Array.isArray(observations)||!observations.length)throw Error("Introdu o lista JSON cu observatii reale");
    const d=await post("train",{observations});
    frozen=null;page=[];render();
    setOut("v23LearnOut",JSON.stringify(d,null,2));
  }catch(e){setOut("v23LearnOut","EROARE: "+e.message)}
  finally{b.disabled=false}
};
$("v23Plan").onclick=async()=>{
 const b=$("v23Plan");stop();b.disabled=true;setOut("v23PlanOut","Planificare inghetata cu algoritmul ORIGINAL...");
 try{
  const d=await post("plan",{document:$("v23Document").value,question:$("v23Question").value,
   seed:Number($("v23Seed").value),temperature:Number($("v23Noise").value),offset:0,limit:100});
  if(!d.found){frozen=null;page=[];setOut("v23PlanOut","FARA TRASEU: "+d.reason);render();return}
  frozen=d;page=d.path.steps;offset=0;cursor=0;
  setOut("v23PlanOut","ORIGINAL: "+d.originalMethod+
    "\nPLAN COMPLET INAINTE DE MISCARE: "+count(d.path.total)+" actiuni, "+count(d.originalShapeCalls)+" campuri originale"+
    "\nRaspuns calculat din actiuni: "+String(d.answer)+
    "\nRaspuns furnizat in tinta: "+String(d.goal?.answerProvided)+
    "\nDOVEZI: "+JSON.stringify(d.statistics)+
    "\nMAX NODURI/CAMP: "+String(d.maxLocalNodes)+
    "\nSHA256: "+d.sha256+
    "\nATENTIE: Nu este inca rezultatul verificat al unei executii reale, nici un test OpenThoughts.");
  render();
 }catch(e){frozen=null;page=[];setOut("v23PlanOut","EROARE: "+e.message);render()}
 finally{b.disabled=false}
};
$("v23Prev").onclick=()=>{turnPage(Math.max(0,offset-100)).catch(e=>setOut("v23PageOut","EROARE: "+e.message))};
$("v23Next").onclick=()=>{if(frozen?.path?.total>offset+page.length)turnPage(offset+page.length).catch(e=>setOut("v23PageOut","EROARE: "+e.message))};
$("v23Scrub").oninput=()=>{cursor=Number($("v23Scrub").value)||0;render()};
$("v23Play").onclick=()=>{
 if(!frozen?.found||!page.length)return;stop();
 $("v23Play").disabled=true;
 animation=setInterval(()=>{
   if(cursor+1>=page.length){stop();return}
   cursor++;render();
 },160);
};
$("v23Pause").onclick=stop;
$("v23Kind").onchange=()=>{stop();frozen=null;page=[];render()};
render();


document.addEventListener("mp-v25-strict-frozen-path",e=>{
  const data=e.detail;
  if(!data?.found||!data.strictClosedWorld||!data.path?.steps)return;
  stop();frozen=data;page=data.path.steps;offset=data.path.offset||0;cursor=0;
  setOut("v23PlanOut","V25 STRICT VERIFIED OBSERVATION COVERAGE | ORIGINAL Discoverer.shape "+
    "\nTraseu înghețat: "+count(data.path.total)+" pași"+
    "\nRăspuns (nesupus ca țintă): "+String(data.answer)+
    "\nUnknown relevant sentences: "+String(data.audit?.unknown?.length||0)+
    "\nSHA256: "+data.sha256+
    "\nAtenție: câmpul arată un traseu PROPUS, nu pași fizici executați.");
  render();
});
