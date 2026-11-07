// Dedicated original-V17 layer inside the independent TinyStories Aether UI.
// Do not touch the already working fast-CUDA visualizer or its controls.
// All values come from the real native worker's original Brain snapshot.
const $=id=>document.getElementById(id);
const fmt=x=>Number.isFinite(x)?Intl.NumberFormat("ro-RO",{maximumFractionDigits:1}).format(x):"—";
const pct=x=>Number.isFinite(x)?Number(x).toFixed(2)+"%":"—";
const col={cyan:"#82d6ec",gold:"#f2cb87",rose:"#f688a1",green:"#69e3c3",purple:"#bd97f6",muted:"#8da3bc"};
const label=(ctx,text,x,y,color=col.muted,size=12)=>{ctx.fillStyle=color;ctx.font=size+"px Segoe UI";ctx.fillText(text,x,y);};
const canvas=()=>{
 const c=$("nativeGraph"),ratio=Math.min(devicePixelRatio||1,2),
  w=Math.max(180,c.clientWidth),h=Math.max(120,c.clientHeight);
 if(c.width!==Math.floor(w*ratio)||c.height!==Math.floor(h*ratio)){
  c.width=Math.floor(w*ratio);c.height=Math.floor(h*ratio);
 }
 const ctx=c.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,w,h);return {ctx,w,h};
};
let native=null,lastResponse=null,busy=false;
function graph(){
 const {ctx,w,h}=canvas(),g=native?.graph;
 if(!g?.nodes?.length){
  ctx.textAlign="center";
  label(ctx,"Graful original V17 se formează din experiență…",w/2,h/2,col.gold,15);
  ctx.textAlign="left";return;
 }
 const u=new Map((g.U||[]).map(x=>[String(x[0]),x[1]]));
 const nodes=g.nodes.slice(0,480),edges=(g.edges||[]).slice(0,1400),placed=new Map();
 const hash=str=>[...str].reduce((v,ch)=>(Math.imul(v^ch.charCodeAt(0),16777619)>>>0),2166136261);
 const R=Math.min(w*.34,h*.35),cx=w/2,cy=h/2;
 for(const [id,type] of nodes){
  let x,y;
  if(type==="sym"&&id.startsWith("s:")){
   const phases=u.get(id.slice(2));
   if(phases?.length>=5){
    const a=2*Math.PI*phases[0],b=2*Math.PI*phases[1],c=2*Math.PI*phases[2];
    x=cx+R*(Math.cos(a)+.22*Math.cos(c));
    y=cy+R*(Math.sin(b)+.18*Math.sin(c));
   }
  }
  if(x===undefined||y===undefined){
   const hval=hash(id),angle=2*Math.PI*(hval%100000)/100000;
   const radius=R*(.4+((hval>>>17)%100)/175);
   x=cx+radius*Math.cos(angle);y=cy+radius*Math.sin(angle);
  }
  placed.set(id,{x,y,type});
 }
 for(const [from,to,kind,weight] of edges){
  const a=placed.get(from),b=placed.get(to);
  if(!a||!b)continue;
  ctx.strokeStyle=kind==="miss"?col.rose+"78":kind==="align"?col.green+"62":
   kind==="moves"?col.gold+"77":"#7896bf50";
  ctx.lineWidth=Math.min(1.8,.4+(Number(weight)||0)/16);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(const [id,p] of placed){
  ctx.fillStyle=p.type==="sym"?col.cyan:p.type==="self"?col.gold:
   p.type==="C"?col.purple:"#8eaacf";
  ctx.beginPath();ctx.arc(p.x,p.y,p.type==="sym"?3.2:2.2,0,Math.PI*2);ctx.fill();
 }
 label(ctx,"5D: proiecția coordonatelor învățate · noduri reale",15,19,col.gold,11);
 label(ctx,fmt(g.nodes.length)+" noduri / "+fmt(g.edges?.length)+" muchii măsurate",
  15,h-12,col.muted,11);
}
function paint(s){
 native=s.native||{};
 const n=native,m=n.mazes||{},c=n.transformations||{},
  t=n.text||{},sc=n.selfCode||{};
 $("nativePct").textContent=pct(n.percent??0);
 $("nativeFill").style.width=Math.min(100,Math.max(0,n.percent||0))+"%";
 $("nativeProgress").textContent=(Number(n.bytesRead||0)/1e6).toFixed(2)+
  " / "+(Number(s.datasetSize||0)/1e6).toFixed(2)+" MB · "+
  fmt(n.stories||0)+" povești V17";
 $("nativeStatus").textContent="V17: "+(n.status||"așteptare")+
  (n.error?" · "+String(n.error).slice(0,90):"");
 const lag=Math.max(0,(s.stories||0)-(n.stories||0));
 const age=n.lastUpdate?Math.round((Date.now()-n.lastUpdate)/1000):null;
 $("nativeLag").textContent="CUDA rapid: "+fmt(s.stories||0)+
  " povești · V17 original: "+fmt(n.stories||0)+
  " · decalaj: "+fmt(lag)+(age!=null?" · mesaj nativ acum "+age+" secunde":"")+
  ". Cele două fluxuri învață independent; V17 simbolic rulează CPU, nu încetinește cu așteptări CUDA.";
 $("mazeWorlds").textContent=fmt(m.played);
 $("transformWorlds").textContent=fmt(c.played);
 $("perspectiveStates").textContent=fmt(t.contextualStates);
 $("constructedPairs").textContent=fmt(t.constructedTextPairs);
 $("graphNodes").textContent=fmt(t.graphNodes);
 $("selfCodeTicks").textContent=fmt(sc.ticks);
 const rows=[
  "Limbaj: "+fmt(t.observedStories)+" povești · "+fmt(t.contextualStates)+" stări context",
  "Graful original: "+fmt(t.graphNodes)+" noduri · "+fmt(t.graphEdges)+" legături 5D",
  "Expunere simbolică: "+fmt(t.sampledGraphBytes)+" octeți, la 1 din "+
   fmt(n.nativeTextSymbolEvery)+" povești (maxim "+fmt(n.nativeTextBytesPerSelectedStory)+" octeți). "+
   "Această eșantionare este explicită, nu o antrenare integrală V17 pe fiecare octet.",
  "Căi învățate: "+fmt(t.constructedTextPairs)+" · editări observate: "+
   fmt(t.observedTransformations),
  "Maze: "+fmt(m.played)+" trăite, "+fmt(m.solved)+" rezolvate · "+
   fmt(m.perspectiveEpisodes)+" episoade perspective",
  "Căi pereche maze: "+fmt(m.constructedPaired),
  "Transformări: "+fmt(c.played)+" trăite, "+fmt(c.solved)+
   " rezolvate · "+fmt(c.discoveredCausalRules)+" reguli cauzale",
  "Noise original: "+fmt(n.noise?.decisions)+" decizii · self-code: "+
   fmt(sc.ticks)+" pași (evaluator de cod dezactivat)",
  "Checkpoint V17: "+(n.lastSavedRows!=null?
   fmt(n.lastSavedRows)+" povești originale salvate":"încă nu"),
  "Acoperire: CUDA 100% din octeții povestirilor consumate; V17 vede conținutul "+
   "povestirilor ajunse la el, dar simbolurile C/A sunt eșantionate."
 ];
 $("nativeWorldInfo").textContent=rows.join("\n");
 const P=t.lastNativePrediction||{};
 $("nativePredicted").textContent=P.predicted??(P.error?
  "Eroare: "+P.error:"Aștept primul traseu calculat înainte de continuarea observată…");
 $("nativeActual").textContent=P.actualNext||"—";
 const E=n.exam||{};
 $("scoreLanguage").textContent=s.heldout?.accuracy!=null?
  (100*s.heldout.accuracy).toFixed(1)+"%":"—";
 $("scoreMaze").textContent=E.mazes?.solvedRate!=null?
  (100*E.mazes.solvedRate).toFixed(1)+"%":"—";
 $("scoreConstructed").textContent=E.constructed?.solvedRate!=null?
  (100*E.constructed.solvedRate).toFixed(1)+"%":"—";
 $("scoreTransform").textContent=E.transforms?.solvedRate!=null?
  (100*E.transforms.solvedRate).toFixed(1)+"%":"—";
 $("intelligenceDetails").textContent=E.frozen?
  "Teste V17 fără actualizare a politicii: maze "+fmt(E.mazes?.count)+
  " · construcție de căi "+fmt(E.constructed?.count)+
  " · transformări "+fmt(E.transforms?.count)+
  " · seeduri nevăzute. Data: "+E.time+
  ". Scoruri distincte, fără un IQ universal.":
  "Nu există încă evaluări independente native. Apasă «Testează toate lumile V17 nevăzute». "+
  "Precizia limbajului este măsurată pe fișierul separat TinyStories-valid.txt.";
 document.documentElement.dataset.nativeV17Learned=String(n.stories||0);
 graph();
}
async function command(endpoint){
 try{
  const r=await fetch(endpoint,{method:"POST",cache:"no-store"});
  const data=await r.json();
  if(!r.ok||data.error)throw Error(data.error||"HTTP "+r.status);
  $("nativeStatus").textContent="V17: cererea "+endpoint+" acceptată; verifică rezultatul live";
  void refresh();
 }catch(e){$("nativeStatus").textContent="V17: "+e.message;}
}
$("nativeStart").onclick=()=>command("/api/native-start");
$("nativeTest").onclick=()=>command("/api/native-test");
$("nativeGraphRefresh").onclick=()=>command("/api/native-graph");
async function refresh(){
 if(busy)return;
 busy=true;
 try{
  const response=await fetch("/api/status",{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  lastResponse=data;paint(data);
 }catch(e){$("nativeStatus").textContent="V17 native: "+e.message;}
 finally{busy=false;}
}
async function loop(){await refresh();setTimeout(loop,950);}
window.addEventListener("resize",graph);
loop();
