// Measurements from original V17 backend only. No synthetic graph or quantum simulation.
const el=id=>document.getElementById(id), finite=x=>typeof x==="number"&&Number.isFinite(x);
const fmt=x=>finite(x)?x.toLocaleString("ro-RO",{maximumFractionDigits:3}):"—";
const pc=x=>finite(x)?(100*x).toFixed(1)+"%":"—";
const palette=["#52baff","#f4be57","#65d9aa","#c5a5fa","#ff849d"];
function canvas(id) {
 const e=el(id),g=e.getContext("2d"),w=e.width,h=e.height;
 g.fillStyle="#07111b";g.fillRect(0,0,w,h);g.lineWidth=1;g.strokeStyle="#22364a";
 for(let i=0;i<5;i++){let y=32+i*(h-55)/4;
   g.beginPath();g.moveTo(40,y);g.lineTo(w-12,y);g.stroke();}
 g.font="11px monospace";g.fillStyle="#9eb7cc";
 return {g,w,h,l:42,r:w-14,t:36,b:h-23};
}
function txt(g,s,x,y,color="#b6cbdc") {
 g.fillStyle=color;g.font="11px monospace";g.fillText(String(s).slice(0,76),x,y);
}
function plots(id,rows,series) {
 const a=canvas(id),{g,l,r,t,b}=a;
 if(!rows?.length){txt(g,"Nu există încă puncte reale în istoricul acestui graf.",l,90);return;}
 const x=i=>l+(r-l)*i/Math.max(1,rows.length-1);
 series.forEach((s,j)=>{
  const data=rows.map((v,i)=>({i,v:v[s.key]})).filter(x=>finite(x.v));
  if(!data.length)return;
  const minimum=Math.min(...data.map(x=>x.v));
  const maximum=Math.max(...data.map(x=>x.v));
  const lo=minimum===maximum?Math.min(0,minimum):minimum;
  const hi=maximum===minimum?minimum+1:maximum;
  const y=v=>b-(v-lo)/(hi-lo)*(b-t);
  g.strokeStyle=palette[j%5];g.lineWidth=2;g.beginPath();
  data.forEach((p,k)=>k?g.lineTo(x(p.i),y(p.v)):g.moveTo(x(p.i),y(p.v)));g.stroke();
  txt(g,s.label+": "+fmt(data.at(-1).v),12+(j%2)*Math.floor(a.w/2),12+Math.floor(j/2)*12,palette[j%5]);
 });
 txt(g,"−"+fmt((rows.at(-1).at-rows[0].at)/1000)+"s",l,a.h-5);
 txt(g,"acum",r-32,a.h-5);
}
function bars(id,rows){
 const a=canvas(id),{g,l,r,t,b}=a,arr=(rows||[]).slice(0,11);
 if(!arr.length){txt(g,"Fără măsurători în această categorie.",l,90);return;}
 const max=Math.max(1,...arr.map(x=>Math.abs(x.value)||0));
 const space=(b-t)/arr.length,width=Math.max(20,r-l-190);
 arr.forEach((p,i)=>{
  const y=t+i*space;
  txt(g,p.label,l,y+Math.max(11,space*.55));
  g.fillStyle=palette[i%5];g.fillRect(l+140,y+2,
    width*Math.abs(p.value||0)/max,Math.max(2,space-5));
  txt(g,fmt(p.value),r-48,y+Math.max(11,space*.55));
 });
}
function heatmap(id,rows) {
 const a=canvas(id),{g,l,r,t,b}=a;
 if(!rows?.length||rows.some(x=>!Array.isArray(x.v)||x.v.length!==32||!x.v.every(finite))){
  txt(g,"Aștept vectorii REALI 32D ai backendului PyTorch.",l,90);return;
 }
 const mag=Math.max(1e-5,...rows.flatMap(x=>x.v.map(Math.abs)));
 rows.forEach((row,i)=>{
  txt(g,row.name,6,t+32+i*55);
  row.v.forEach((v,j)=>{
   const x=l+j*(r-l)/32,w=(r-l)/32-1,alpha=.1+.85*Math.abs(v)/mag;
   g.fillStyle=v>=0?"rgba(93,219,177,"+alpha+")":"rgba(243,107,155,"+alpha+")";
   g.fillRect(x,t+15+i*55,w,40);
  });
 });
 for(let i=0;i<=32;i+=4)txt(g,i,l+i*(r-l)/32,b+15);
}
function spectrum(gs){
 const P=new Map(Array.isArray(gs?.U)?gs.U:[]),edges=gs?.edges||[];
 return Array.from({length:5},(_,k)=>{
  let re=0,im=0,weight=0,count=0;
  for(const e of edges){
   const a=e[0],b=e[1],w=e[3];
   if(typeof a!=="string"||typeof b!=="string"||!a.startsWith("s:")||
      !b.startsWith("s:")||!finite(w)||w<=0)continue;
   const x=P.get(+a.slice(2)),y=P.get(+b.slice(2));
   if(!Array.isArray(x)||!Array.isArray(y)||!finite(x[k])||!finite(y[k]))continue;
   const theta=2*Math.PI*(x[k]-y[k]);
   re+=w*Math.cos(theta);im+=w*Math.sin(theta);weight+=w;count++;
  }
  return {label:["X","Y","Z","W","V"][k],value:weight?Math.hypot(re,im)/weight:0,edges:count};
 });
}
function causalGraph(id,ops,composition){
 const a=canvas(id),{g,w,h}=a;
 const links=[];
 for(const op of (ops||[]).slice(0,16))for(const ex of (op.examples||[]))
  if(ex.from&&ex.to)links.push({from:ex.from,to:ex.to,chosen:false});
 for(const e of composition?.execution?.experience||[])
  links.push({from:e.before,to:e.after,chosen:true});
 const names=[...new Set(links.flatMap(e=>[e.from,e.to]))].slice(0,18);
 if(!names.length){txt(g,"Nu există încă perechi de stări observate.",42,90);return;}
 const coords=names.map((n,i)=>{
  const ang=2*Math.PI*i/names.length;
  return [w*.5+w*.31*Math.cos(ang),h*.52+h*.34*Math.sin(ang)];
 });
 for(const e of links){
  const i=names.indexOf(e.from),j=names.indexOf(e.to);
  if(i<0||j<0)continue;
  g.strokeStyle=e.chosen?"#f6c35e":"#427ea5";g.lineWidth=e.chosen?3:1.25;
  g.beginPath();g.moveTo(...coords[i]);g.lineTo(...coords[j]);g.stroke();
 }
 coords.forEach(([x,y],i)=>{
  g.fillStyle="#5cdbac";g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();
  txt(g,names[i].slice(0,24),Math.min(w-170,Math.max(5,x+6)),y-3);
 });
}
export class Observatory {
 constructor({getGraph}) {
  this.getGraph=getGraph;this.w=-1;this.history=[];this.at=0;
  this.summary=null;this.graph=null;this.telemetry=null;this.error=null;
  this.mode="activity";this.composition=null;
  for(const b of document.querySelectorAll("#obsNav [data-obs]")){
   b.onclick=()=>{
    this.mode=b.dataset.obs;
    for(const z of document.querySelectorAll("#obsNav button"))z.classList.toggle("on",b===z);
    this.render();
   };
  }
  el("obsExport").onclick=()=>{
   const blob=new Blob([JSON.stringify({graph:this.w,history:this.history,
     graphSnapshot:this.graph,summary:this.summary,composition:this.composition,
     telemetry:this.telemetry},null,2)],{type:"application/json"});
   const href=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=href;a.download="MagicPerspective-actual-"+this.w+".json";a.click();
   setTimeout(()=>URL.revokeObjectURL(href),3000);
  };
 }
 select(w) {
  if(this.w===w)return;
  this.w=w;this.history=[];this.at=0;this.summary=null;this.graph=null;
  this.telemetry=null;this.error=null;this.composition=null;
  this.render();
 }
 setComposition(result){this.composition=result;this.render();}
 since(){return this.at;}
 ingest({w,summary,graph,telemetry,error}){
  if(w!==this.w)return;
  if(summary)this.summary=summary;
  if(Array.isArray(graph?.nodes))this.graph=graph;
  if(telemetry?.points){
   if(telemetry.points.length&&telemetry.points[0].at<this.at){this.history=[];this.at=0;}
   for(const p of telemetry.points){if(p.at<=this.at)continue;this.history.push(p);this.at=p.at;}
   if(this.history.length>360)this.history.splice(0,this.history.length-360);
   this.telemetry=telemetry;
  }
  this.error=error||null;this.render();
 }
 render(){
  if(!document.querySelector("aside.side")?.classList.contains("obsOn"))return;
  const S=this.summary,G=this.graph,T=this.telemetry;
  const shared=G?.shared||T?.shared||{},trace=shared.training?.trace;
  const trans=G?.observedTransformations||T?.observedTransformations||{};
  const P=G?.constructedPaths||T?.constructedPaths||{};
  const noise=G?.endogenousNoise||T?.endogenousNoise||{},code=G?.selfcode||{};
  const age=finite(S?.snapshotAt)?((Date.now()-S.snapshotAt)/1000).toFixed(1)+"s":"—";
  el("obsHealth").textContent="Graf #"+this.w+" · "+(S?.status||"fără date")+
   " · ultimul snapshot "+age+(finite(S?.snapshotAt)&&Date.now()-S.snapshotAt>8000?
     " · ACTUALIZARE ÎNTÂRZIATĂ":"")+(this.error?" · "+this.error:"");
  el("obsMeta").textContent="Antrenare CUDA+CPU: "+fmt(S?.chars)+" caractere ·"+
   " evenimente reale trecute în graf: "+fmt(S?.lived)+
   " · "+fmt(S?.nodeCount)+" noduri, "+fmt(S?.edgeCount)+" legături"+
   (S?.batch?" · "+S.batch.phase+" "+fmt(S.batch.done)+"/"+fmt(S.batch.total):"");
  const stats=(...xs)=>{el("obsStats").replaceChildren(...xs.map(([name,value])=>{
   const div=document.createElement("div");div.className="obsmetric";
   const small=document.createElement("small"),bold=document.createElement("b");
   small.textContent=name;bold.textContent=value;div.append(small,bold);return div;
  }));};
  const heading=t=>el("obsTitle").textContent=t;
  const note=t=>el("obsCaveat").textContent=t;
  const detail=t=>el("obsDetails").textContent=t;
  el("obsCanvasAux").hidden=false;
  if(this.mode==="activity"){
   heading("Progres CPU + CUDA · valori reale");
   stats(["Caractere antrenate",fmt(S?.chars)],["Evenimente observate",fmt(S?.lived)],
    ["Actualizări PyTorch",fmt(shared.training?.step)],["VRAM raportată",fmt(this.history.at(-1)?.vramGB)+" GB"]);
   plots("obsCanvas",this.history,[{key:"chars",label:"caractere"},{key:"lived",label:"graful viu"},
    {key:"updates",label:"operații"},{key:"sharedStep",label:"32D updates"}]);
   plots("obsCanvasAux",this.history,[{key:"aligned",label:"aliniere"},
    {key:"sharedLoss",label:"loss PyTorch"},{key:"gpuTextAccuracy",label:"text CUDA"}]);
   detail("Ultima măsurătoare: "+JSON.stringify(this.history.at(-1)||null,null,2)+
     "\nGPU: "+JSON.stringify(S?.gpu||null,null,2).slice(0,3200));
   note("Axe normalizate INDEPENDENT pe fiecare curbă. CUDA poate procesa multe caractere fără a trece toate acele evenimente prin vizualizatorul Brain.live.");
  }else if(this.mode==="transforms"){
   const ops=trans.topOperators||[];
   heading("Transformări induse din diferențe observate");
   stats(["Perechi comparate",fmt(trans.comparedPairs)],["Diferențe de o editare",fmt(trans.oneChangePairs)],
    ["Operații învățate",fmt(trans.learnedOperators)],["Invariante",fmt(trans.learnedInvariantGroups)]);
   bars("obsCanvas",ops.map(x=>({label:(x.from||"∅")+"→"+(x.to||"∅"),value:x.observedSupport})));
   plots("obsCanvasAux",this.history,[{key:"updates",label:"operații"},{key:"comparisons",label:"comparații"}]);
   detail(ops.length?ops.map(x=>x.kind+" "+(x.from||"∅")+"→"+(x.to||"∅")+
     " · suport "+x.observedSupport+"\n"+(x.examples||[]).map(e=>"  "+e.from+" ⇒ "+e.to).join("\n")).join("\n\n"):
     "Încă nicio pereche cauzală observată.");
   note("Suportul și exemplele provin din observațiile organismului, nu din etichete gramaticale inventate.");
  }else if(this.mode==="paths"){
   heading("Căi observate și compuse: graful transformărilor");
   stats(["Perechi complete/incomplete",fmt(P.pairedWorlds)],["Acțiuni caracter",fmt(P.textPathActions)],
    ["Căi text încheiate",fmt(P.textCompletedPaths)],["Lungime prima formă",fmt(P.lastMaze?.firstShapeLength)]);
   causalGraph("obsCanvas",trans.topOperators||[],this.composition);
   const rows=(P.lastMaze?.trace||[]).map((x,i)=>({at:i,seen:x.sensedCells,moved:x.moved?1:0}));
   plots("obsCanvasAux",rows,[{key:"seen",label:"celule dezvăluite"},{key:"moved",label:"deplasare"}]);
   detail("Prima cale blind: "+JSON.stringify(P.lastMaze?.firstShape||null)+
    "\nRevizuiri: "+fmt(P.lastMaze?.routeRepairs)+
    "\nUltima cale text: "+JSON.stringify(P.lastText?.predicted||null)+
    "\nUltima compoziție din efecte reale: "+JSON.stringify(this.composition?.steps||[],null,2).slice(0,2500));
   note("Conexiunile sunt observate; dispunerea 2D este numai o proiecție grafică pentru lizibilitate, nu o hartă semantică hiperdimensională demonstrată.");
  }else if(this.mode==="latent"){
   heading("Toate cele 32 dimensiuni latente reale");
   stats(["Update PyTorch",fmt(shared.training?.step)],["Dispozitiv",shared.training?.device||"—"],
    ["Eroare înainte",fmt(shared.training?.preUpdatePredictionLoss)],["Baseline identitate",fmt(shared.training?.identityBaselineLoss)]);
   heatmap("obsCanvas",trace?[{name:"înainte",v:trace.before},{name:"prezis",v:trace.predicted},
    {name:"observat",v:trace.observed}]:[]);
   bars("obsCanvasAux",trace&&trace.predicted?.length===32&&trace.observed?.length===32?
    trace.predicted.map((v,i)=>({label:"dim "+i,value:Math.abs(v-trace.observed[i])}))
    .sort((a,b)=>b.value-a.value):[]);
   detail(trace?("Domeniu: "+trace.domain+" · acțiune: "+trace.action+
    "\nEroare de predicție: "+fmt(trace.predictedError)+
    "\nDelta prezis–observat: "+JSON.stringify(trace.predicted.map((v,i)=>+(v-trace.observed[i]).toFixed(5))))
    :"Nu există un vector numeric de la modelul CUDA; nu afișez vectori sintetici.");
   note("Vectori latenti PyTorch 32D dintr-un batch real. Nu sunt coordonatele torului 5D și nu demonstrează încă transfer universal.");
  }else if(this.mode==="noise"){
   heading("Agenția zgomotului · alegeri și recompense");
   stats(["Decizii",fmt(noise.decisions)],["Intervenții",fmt(noise.noiseChoices)],
    ["Fracție",pc(noise.noiseRate)],["Recompensă",fmt(noise.cumulativeReward)]);
   bars("obsCanvas",Object.entries(noise.bySite||{}).map(([label,value])=>({label,value})));
   plots("obsCanvasAux",this.history,[{key:"noiseDecisions",label:"decizii"}]);
   detail("Ultima intervenție reală:\n"+JSON.stringify(noise.last||null,null,2)+
    "\n\n"+(noise.recent||[]).map(x=>x.domain+" · "+x.site+"/"+x.strength+
      " · reward "+fmt(x.reward)).join("\n"));
   note("Zgomot selectat de politica organismului și evaluat din experiență. Nu este zgomot cuantic.");
  }else if(this.mode==="spectrum"){
   const rows=spectrum(G);
   heading("Faze pe T⁵ · coerență clasică a legăturilor");
   stats(["Dimensiuni geometrie",fmt(G?.U?.[0]?.[1]?.length)],
    ["Axe măsurabile",fmt(rows.filter(x=>x.edges>0).length)],
    ["Coerență maximă",rows.some(x=>x.edges)?fmt(Math.max(...rows.map(x=>x.value))):"—"],
    ["Qubiți reali","0"]);
   bars("obsCanvas",rows);
   const coordinates=(Array.isArray(G?.U)?G.U:[]).filter(x=>x[1]?.length>=2).slice(0,120)
    .map((x,i)=>({at:i,X:Math.cos(x[1][0]*2*Math.PI),Y:Math.sin(x[1][1]*2*Math.PI)}));
   plots("obsCanvasAux",coordinates,[{key:"X",label:"cos fază X"},{key:"Y",label:"sin fază Y"}]);
   detail("Ck = | Σ w_ab · exp(i·2π·(θa,k−θb,k)) | / Σw_ab\n"+
    rows.map(r=>r.label+": "+fmt(r.value)+" pe "+r.edges+" legături observate").join("\n"));
   note("Analiză MATEMATICĂ CLASICĂ a fazelor învățate. Nu simulăm un calculator cuantic, interferență de qubiți sau avantaje cuantice inexistente.");
  }else if(this.mode==="selfcode"){
   heading("Universul propriului cod · evaluări izolate");
   stats(["Pași sursă",fmt(code.ticks)],["Noduri sursă",fmt(code.graphNodes)],
    ["Probe executate",fmt(code.probes)],["Portaluri folosite",fmt(code.portals)]);
   bars("obsCanvas",[{label:"pași",value:code.ticks||0},{label:"probe",value:code.probes||0},
    {label:"portaluri",value:code.portals||0},{label:"buget",value:code.remainingPortalBudget||0}]);
   plots("obsCanvasAux",this.history,[{key:"chars",label:"caractere"},{key:"pairedWorlds",label:"labirinturi"}]);
   detail("Sursa originală neatinsă: "+String(code.originalUnchanged)+
    "\nLacăt: "+JSON.stringify(code.lock||null)+
    "\nUltima probă: "+JSON.stringify(code.lastProbe||null,null,2)+
    "\nEroare: "+String(code.error||"niciuna raportată"));
   note("Modificările de cod rulează pe copii sandbox; nu pretindem că organismul își poate rescrie deja codul de producție.");
  }
 }
}
