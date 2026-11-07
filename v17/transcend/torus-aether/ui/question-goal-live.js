// V24 additive native V17 question-goal observatory.
// ONLY server-provided learned transitions and exact original Discoverer plans.
// Never synthesizes semantic coordinates, hidden targets or path outcomes.
const ui=id=>document.getElementById(id);
const canvas=ui("questionGoalCanvas"),ctx=canvas.getContext("2d");
const S={plan:null,frame:0,playing:false,lastTick:0,selected:0,lastSample:null,training:null};
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const pct=x=>finite(x)?(100*x).toFixed(2)+"%":"—";
const fmt=x=>finite(x)?x.toLocaleString("ro-RO"):"—";
const selected=()=>Math.max(0,Math.trunc(Number(ui("questionGoalWorker").value)||0));
const colors={gold:"#ffc66a",executed:"#65cdf5",goal:"#74f0a5",blocked:"#ff799a",other:"#7c8bba"};
for(const [id,def] of [["questionGoalX",0],["questionGoalY",2]]){
 const el=ui(id);for(let i=0;i<5;i++){
  const o=document.createElement("option");o.value=String(i);o.textContent="Axa "+(i+1);el.append(o);
 }el.value=String(def);
}
function clear(message){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 ctx.fillStyle="#d5dfe9";ctx.font="17px Georgia";ctx.fillText(message,24,45);
}
function coordOf(hop){const p=hop?.geometry5;return Array.isArray(p)&&p.length===5&&p.every(finite)?p:null;}
function coords(hops){
 const values=[new Array(5).fill(.5)];
 for(const h of hops)values.push(coordOf(h)||values.at(-1));
 return values;
}
function draw(){
 const plan=S.plan,full=plan?.initialFullRoute||[];
 if(!plan?.ready||!full.length){clear("Nu există încă o cale cu țintă învățată și muchii verificabile.");return;}
 const w=canvas.width,h=canvas.height,ax=+ui("questionGoalX").value,ay=+ui("questionGoalY").value;
 ctx.clearRect(0,0,w,h);
 const bottom=h-30,top=32,left=42,right=w-22,span=right-left;
 ctx.fillStyle="#96acc1";ctx.font="12px Consolas";
 ctx.fillText("FORMA GLOBALĂ / ÎNAINTE DE MIȘCARE",left,21);
 ctx.fillText("EXECUȚIE: RELUARE DIN MUCHII ÎNVĂȚATE (NU FEEDBACK EXTERN)",left,h*.55);
 const pos=coords(full),actual=S.plan.movement?.frames||[];
 const p=(i,row,coordinate)=>{
  const c=coordinate||pos[Math.min(i,pos.length-1)];
  const angleX=2*Math.PI*c[ax],angleY=2*Math.PI*c[ay];
  return {x:left+span*Math.min(1,Math.max(0,i/Math.max(1,full.length))),
    y:row+Math.sin(angleX)*37+Math.cos(angleY)*18};
 };
 const start=h*.27,execution=h*.76;
 ctx.strokeStyle="#253e56";ctx.lineWidth=1;
 for(let j=0;j<5;j++){const y=top+(bottom-top)*j/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}
 ctx.strokeStyle=colors.gold;ctx.lineWidth=2.6;ctx.beginPath();
 for(let i=0;i<pos.length;i++){
  const point=p(i,start,pos[i]);if(!i)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
 }ctx.stroke();
 ctx.fillStyle=colors.goal;const target=p(pos.length-1,start,pos.at(-1));
 ctx.beginPath();ctx.arc(target.x,target.y,6,0,Math.PI*2);ctx.fill();
 if(actual.length){
  ctx.strokeStyle=colors.executed;ctx.lineWidth=2.8;ctx.beginPath();
  for(let i=0;i<=Math.min(S.frame,actual.length-1);i++){
   const point=p(i,execution,pos[i]);
   if(!i)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
  }
  ctx.stroke();const cursor=p(Math.min(S.frame,pos.length-1),execution,pos[Math.min(S.frame,pos.length-1)]);
  ctx.fillStyle=colors.executed;ctx.beginPath();ctx.arc(cursor.x,cursor.y,6,0,Math.PI*2);ctx.fill();
 }
 const frame=actual[Math.min(S.frame,actual.length-1)]||{};
 ctx.fillStyle="#d7eafa";ctx.font="12px Consolas";
 ctx.fillText("Pas "+S.frame+" / "+Math.max(0,actual.length-1)+" · "+
  String(frame.action||"înainte de prima mișcare").slice(0,72),left,h-10);
}
function show(){
 const frames=S.plan?.movement?.frames||[];
 const max=Math.max(0,frames.length-1);S.frame=Math.min(max,Math.max(0,S.frame));
 ui("questionGoalScrub").max=String(max);
 ui("questionGoalScrub").value=String(S.frame);
 ui("questionGoalFrame").textContent=S.frame+" / "+max;
 const current=frames[S.frame];
 if(S.plan?.ready){
  const p=S.plan,training=p.training||{};
  ui("questionGoalMetrics").textContent=[
   "MODEL: "+p.source||"V24 EXACT Discoverer.shape",
   "METODĂ ORIGINALĂ: "+p.originalOperator,
   "Formă întreagă înainte de acțiune: "+p.predictedBeforeFirstMovement,
   "Răspuns de referință furnizat: "+p.referenceAnswerProvided,
   "Țintă prezisă din întrebare: "+JSON.stringify(p.predictedGoal?.tokens),
   "Scor țintă 32D: "+p.predictedGoal?.distance32+
    " · scor geometric 5D: "+(p.predictedGoal?.distance5??"NEDISPONIBIL"),
   "DIMENSIUNI ACTIVE: "+p.dimensions+
    " · geografie 5D învățată "+(p.geometryActive?"DA":"NU"),
   "Pași prezis: "+p.plannedSteps+" · muchii observate folosite: "+p.observedEdgesUsed,
   "Stări finale: "+p.predictedTargets?.length+" candidate testate",
   "Memorie de tranziții: "+fmt(training.observedMapEdges)+
    " active / "+fmt(training.compactedMapEdges)+" eliminate de buget",
   "Răspuns PREZIS înainte de prima acțiune:\n"+p.predictedText,
   "Pasul curent: "+S.frame+
    "\n"+(current?JSON.stringify(current):"Înainte de prima mișcare"),
   "LIMITĂ: traseul este verificat prin muchii observate, NU prin oracle semantic."
  ].join("\n");
 }else{
  ui("questionGoalMetrics").textContent=S.plan?
    "NU S-A GĂSIT CALEA: "+String(S.plan.reason)+"\n"+
    JSON.stringify(S.plan.predictedTargets||[],null,2):
    "Aștept date reale din modelul V24.";
 }
 draw();
}
async function request(url,method="GET",body=null){
 const res=await fetch(url,{method,headers:body?{"content-type":"application/json"}:{},
  body:body?JSON.stringify(body):null,cache:"no-store"});
 if(!res.ok)throw Error("HTTP "+res.status+" pentru "+url);
 const json=await res.json();if(json.error)throw Error(json.error);
 return json;
}
ui("questionGoalNoise").oninput=()=>ui("questionGoalNoiseOut").textContent=ui("questionGoalNoise").value;
ui("questionGoalPlan").onclick=async()=>{
 const button=ui("questionGoalPlan");button.disabled=true;
 ui("questionGoalMetrics").textContent="Cer traseul ORIGINAL Discoverer.shape din întrebarea furnizată...";
 try{
  const q=ui("questionGoalQuestion").value.trim();
  if(!q)throw Error("Introdu o întrebare completă, fără răspuns.");
  const data=await request("/question-goal-plan","POST",{
   w:selected(),question:q,
   maxNodes:Math.max(100,Math.min(4000,Number(ui("questionGoalNodes").value)||1500)),
   temperature:Number(ui("questionGoalNoise").value)||0
  });
  S.plan=data;S.frame=0;S.playing=!!data.ready;S.lastTick=0;show();
 }catch(err){S.plan=null;ui("questionGoalMetrics").textContent="Eroare: "+err.message;draw();}
 finally{button.disabled=false;}
};
ui("questionGoalHeldTest").onclick=async()=>{
 const b=ui("questionGoalHeldTest");b.disabled=true;
 ui("questionGoalHeldResults").textContent="Scor înghețat pe întrebările rezervate — răspunsurile nu intră în worker...";
 try{
  const n=Math.max(1,Math.min(16,Math.trunc(Number(ui("questionGoalHeldN").value)||4)));
  const r=await request("/question-goal-heldout?w="+selected()+"&count="+n+
   "&maxNodes="+(Number(ui("questionGoalNodes").value)||1500),"POST");
  ui("questionGoalHeldResults").textContent=[
   "SURSĂ: "+r.source,"Antrenare în evaluare: NU",
   "Răspuns de referință în planificator: NU",
   "Exerciții: "+r.total+" · traseu găsit: "+r.found+
    " · RĂSPUNS COMPLET EXACT: "+r.exact+" / "+r.total+
    " ("+fmt(r.exactPercent)+"%)",
   "Caractere/tokenuri la poziția corectă: "+pct(r.positionMean),
   "100% pe orice text nevăzut demonstrat: NU",
   ...r.results.map(e=>"#"+e.index+" · "+(e.exact?"EXACT":"GREȘIT")+
    " · output "+e.generatedChars+"/"+e.answerChars+
    " · traseu "+e.steps+" · "+(e.error||e.predictedPreview))
  ].join("\n");
 }catch(e){ui("questionGoalHeldResults").textContent="Eroare: "+e.message;}
 finally{b.disabled=false;}
};
ui("questionGoalPrev").onclick=()=>{S.playing=false;S.frame--;show();};
ui("questionGoalNext").onclick=()=>{S.playing=false;S.frame++;show();};
ui("questionGoalPlay").onclick=()=>{S.playing=!S.playing;S.lastTick=0;
 ui("questionGoalPlay").textContent=S.playing?"⏸ Replay":"▶ Replay";};
ui("questionGoalScrub").oninput=e=>{S.playing=false;S.frame=Number(e.target.value);show();};
for(const id of ["questionGoalX","questionGoalY"])ui(id).onchange=draw;
const mark=async()=>{
 try{
  const g=await request("/graph?w="+selected());
  const status=g?.questionGoal;
  ui("questionGoalBox").hidden=!status&&!g?.worlds?.includes("cognitivemap");
  if(!status){
   ui("questionGoalStatus").textContent="Lumea cognitivemap + Q/A încă neactivată";
   return;
  }
  S.training=status;
  ui("questionGoalStatus").textContent=
   "LIVE · "+fmt(status.rows)+" exerciții Q/A · "+
   fmt(status.observedActions)+" acțiuni observate · "+
   fmt(status.observedChars)+" caractere integrate · "+
   fmt(status.compactedMapEdges)+" muchii eliminate de buget · "+
   (status.declaredAxes?.geometric5D?"5D+32D+T":"32D+T, 5D încă indisponibil");
  if(status.last?.sourceRow!==undefined&&status.last?.sourceRow!==S.lastSample){
   S.lastSample=status.last.sourceRow;
   // Show actual PRE-INGEST training-row prediction independently of the
   // manually requested frozen plan. Never overwrite user-selected route.
   ui("questionGoalMetrics").dataset.liveRow=String(S.lastSample);
   if(!S.plan)ui("questionGoalMetrics").textContent=
    "LIVE Q/A înainte de învățarea acestui rând #"+S.lastSample+
    "\nFormă prezisă: "+status.last.guessed+
    "\nExact după comparația cu răspunsul observat: "+status.last.exactMatch+
    "\nPași: "+status.last.steps+
    "\nMetoda: "+status.last.originalMethod;
  }
 }catch(err){ui("questionGoalStatus").textContent="Conectare V24: "+err.message;}
};
ui("questionGoalWorker").onchange=()=>{S.plan=null;S.lastSample=null;S.frame=0;mark();draw();};
function animate(time){
 const frames=S.plan?.movement?.frames||[];
 if(S.playing&&frames.length&&time-S.lastTick>Number(ui("questionGoalSpeed").value)){
  S.lastTick=time;if(S.frame<frames.length-1){S.frame++;show();}else S.playing=false;
 }
 requestAnimationFrame(animate);
}
clear("Aștept lumea reală V24 cu obiectiv învățat.");
setInterval(mark,2500);mark();requestAnimationFrame(animate);
