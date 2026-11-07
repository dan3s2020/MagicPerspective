// ONE-BRAIN observatory: no secondary worker, controls or training loop.
// Draws ONLY evidence actually emitted from the single CUDA FastText model.
// This replaces the unwanted native-ui.js independent-worker frontend.
const $=id=>document.getElementById(id);
const format=n=>Number.isFinite(n)?Intl.NumberFormat("ro-RO",{maximumFractionDigits:1}).format(n):"—";
const percent=n=>Number.isFinite(n)?(n*100).toFixed(2)+"%":"—";
const color={cyan:"#82d6ec",gold:"#f2cb87",rose:"#f688a1",
  violet:"#bd97f6",green:"#69e3c3",muted:"#9bb2c8"};
let status=null,loading=false,requestingPlan=false,lastPlanIndex=-1,lastPlan=null;
const label=(ctx,text,x,y,ink=color.muted,size=11)=>{
 ctx.fillStyle=ink;ctx.font=size+"px Segoe UI";ctx.fillText(text,x,y);
};
function geometry(){
 const el=$("unifiedGraph"),ratio=Math.min(devicePixelRatio||1,2),
  w=Math.max(180,el.clientWidth),h=Math.max(120,el.clientHeight);
 if(el.width!==Math.round(w*ratio)||el.height!==Math.round(h*ratio)){
  el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);
 }
 const ctx=el.getContext("2d");ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.clearRect(0,0,w,h);
 const g=status?.unified?.graph;
 if(!g?.edges?.length){
  ctx.textAlign="center";label(ctx,"Torusul 5D se va forma din experiențele aceleiași rețele CUDA…",
   w/2,h/2,color.gold,13);ctx.textAlign="left";return;
 }
 const coords=g.coordinates5D||{},R=Math.min(w*.31,h*.36),points=new Map();
 for(const [id,phases] of Object.entries(coords)){
  if(phases.length<5)continue;
  // Genuine learned coordinates in a five-torus, projected in 2D using
  // 3 of the 5 original angles. NOT invented node locations.
  const a=phases.map(v=>2*Math.PI*v);
  const x=w/2+R*(Math.cos(a[0])+.24*Math.cos(a[2])+.1*Math.cos(a[4]));
  const y=h/2+R*(Math.sin(a[1])+.22*Math.sin(a[3])+.1*Math.sin(a[4]));
  points.set(Number(id),{x,y});
 }
 let drawn=0;
 for(const [from,to,weight] of g.edges){
  const a=points.get(from),b=points.get(to);
  if(!a||!b)continue;
  ctx.strokeStyle="rgba(112,197,221,"+Math.min(.55,.07+weight/700).toFixed(2)+")";
  ctx.lineWidth=Math.min(2,.3+weight/180);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  drawn++;
 }
 for(const [id,p] of points){
  const isSpace=id===32,isEnd=id===46||id===33;
  ctx.fillStyle=isEnd?color.gold:isSpace?color.violet:color.cyan;
  ctx.beginPath();ctx.arc(p.x,p.y,isSpace?4.5:2.8,0,Math.PI*2);ctx.fill();
 }
 label(ctx,"Coordonate reale, învățate în 5D · proiecție 2D",14,20,color.gold,11);
 label(ctx,format(points.size)+" simboluri cu coordonate · "+format(drawn)+
  " legături învățate",14,h-12,color.muted,11);
}
function paint(s){
 status=s;
 const u=s.unified||{},w=u.worlds||{},g=u.graph||{};
 $("mazeWorlds").textContent=format(w.mazeWorldsTrained||0);
 $("transformWorlds").textContent=format(w.mazeTeacherStepsLearned||0);
 $("perspectiveStates").textContent=(u.perspectives||[]).join(" / ")||"—";
 $("constructedPairs").textContent=format(u.bytes||0);
 $("graphNodes").textContent=format(g.learnedNodes||0);
 $("selfCodeTicks").textContent=format(u.updates||0);
 const items=[
  "Același checkpoint TinyStories: "+(s.model?.pretrainedTinyStoriesRetained?"model deja învățat":"model nou")+
  " · epoca "+(s.epoch||1),
  "Câmpurile GPU în același antrenor: "+(u.models||[]).join(", "),
  "Actualizări multi-perspectivă: "+format(u.updates||0)+
   " · octeți observați în noile câmpuri: "+format(u.bytes||0),
  "Maze fizice originale: "+format(w.mazeWorldsTrained||0)+
   " lumi · "+format(w.mazeTeacherStepsLearned||0)+" decizii cu efect învățate",
  "Torus: "+(u.dimension||5)+" axe circulare · "+
   format(g.learnedNodes||0)+" simboluri în graful observat",
  "Acest model NU rulează un al doilea worker V17. Totul este actualizat "+
   "în apelurile reale către antrenorul CUDA.",
  "Limită explicită: câmpurile GPU adaptează perspective, cauzalitate locală "+
   "și lume labirint; nu pretind identitate matematică cu întregul V17 JS."
 ];
 $("unifiedWorldInfo").textContent=items.join("\n");
 const h=s.heldout||{},x=h.unified||{},world=x.worlds||{};
 $("scoreLanguage").textContent=percent(h.accuracy);
 $("scoreConstructed").textContent=percent(x.accuracy);
 $("scoreMaze").textContent=percent(world.accuracy);
 $("scoreTransform").textContent=percent(world.effectAccuracy);
 $("intelligenceDetails").textContent=x.frozen?
  "Teste reale înghețate: "+format(h.stories)+" povești din TinyStories-valid · "+
  format(world.actualUnseenSeeds)+" labirinturi cu seeduri nevăzute · "+
  format(world.effectTrials)+" efecte fizice de acțiune nevăzute. "+
  "Scorurile măsoară sarcini diferite; niciunul nu este «IQ» și 100% "+
  "predicție pe povești noi nu e necesar sau garantat.":
  "Apasă butonul existent «Testează povești nevăzute» pentru scorurile "+
  "celor două perspective text și pentru policy/action-effect pe labirinturi nevăzute.";
 $("nativeActual").textContent=(s.preview?.preUpdate?.actual||"").slice(0,140)||
  "Aștept fragmentul real din TinyStories…";
 $("nativePredicted").textContent=lastPlan?.predicted||
  "Traseul va apărea după primele tranziții învățate.";
 document.documentElement.dataset.unifiedGpuTraining=String(u.updates||0);
 document.documentElement.dataset.singleBrain="true";
 geometry();
}
async function planIfChanged(data){
 const ix=data.preview?.index;
 if(ix===undefined||ix===null||ix===lastPlanIndex||requestingPlan||
    !(data.unified?.bytes>0))return;
 lastPlanIndex=ix;requestingPlan=true;
 try{
  const start=(data.preview?.preUpdate?.actual||"").slice(0,90);
  if(!start)return;
  const res=await fetch("/api/plan?start="+encodeURIComponent(start),
   {method:"POST",cache:"no-store"});
  if(!res.ok)return;
  const p=await res.json();
  if(p.frozen){lastPlan=p;$("nativePredicted").textContent=p.predicted||"—";}
 }catch{}finally{requestingPlan=false;}
}
async function refresh(){
 if(loading)return;
 loading=true;
 try{
  const res=await fetch("/api/status",{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const data=await res.json();
  paint(data);
  void planIfChanged(data);
 }catch(e){
  $("unifiedWorldInfo").textContent="Aștept statusul real al modelului: "+e.message;
 }finally{loading=false;}
}
async function cycle(){await refresh();setTimeout(cycle,900);}
window.addEventListener("resize",geometry);
cycle();
