// V18 real-world language maze viewer. ONLY backend observations, no generated
// training events, no sample path invented by the browser. 2D canvas coordinates
// are a deterministic visual projection, NOT learned physical 4D/5D coordinates.
const $=id=>document.getElementById(id);
const sidebar=document.querySelector("aside.side");
let currentGraph=0,result=null,step=0,timer=null,busy=false;
const count=n=>Number.isFinite(n)?Math.round(n).toLocaleString("ro-RO"):"—";
function selectedGraph(){
 const n=Number($("langGraph").value);
 return Number.isSafeInteger(n)&&n>=0?n:0;
}
function stop(){
 if(timer!==null){clearInterval(timer);timer=null;}
 $("langPlay").textContent="▶ Replay caractere";
}
function switchTab(){
 sidebar.classList.remove("evalOn","psOn","metricsOn","transferOn");
 sidebar.classList.add("langOn");
 for(const b of sidebar.querySelectorAll(".tabs button"))b.classList.remove("on");
 $("tabLang").classList.add("on");
}
$("tabLang").addEventListener("click",switchTab);
for(const b of sidebar.querySelectorAll(".tabs button")){
 if(b.id==="tabLang")continue;
 b.addEventListener("click",()=>{sidebar.classList.remove("langOn");$("tabLang").classList.remove("on");},{capture:true});
}
document.addEventListener("click",e=>{
 const card=e.target.closest?.("#liveList .lgc");
 if(card?.dataset.w){currentGraph=+card.dataset.w;$("langGraph").value=currentGraph;}
},{capture:true});
$("langGraph").addEventListener("change",()=>currentGraph=selectedGraph());
function projection(r,w,h){
 const g=r.graph,n=g.nodes.length;
 const onRoute=new Map(r.pathNodes.map((id,i)=>[id,i]));
 const len=Math.max(1,r.pathNodes.length-1);
 const coordinates=Array(n);
 for(let i=0;i<n;i++){
  const k=onRoute.get(i);
  if(k!==undefined){
   // The same actual solution shape bent into a readable nested spiral.
   // Its positions are purely visual; order is exactly the original route.
   const t=k/len;
   const theta=(t*6.5-1)*Math.PI;
   const radius=12+t*Math.min(w,h)*.41;
   coordinates[i]={x:w*.5+radius*Math.cos(theta),y:h*.5+radius*Math.sin(theta)};
  }else{
   const angle=i*2.399963229728653;
   const radius=Math.min(w,h)*(.14+.35*((i*19%97)/97));
   coordinates[i]={x:w*.5+radius*Math.cos(angle),y:h*.5+radius*Math.sin(angle)};
  }
 }
 return coordinates;
}
function drawGraph(){
 const canvas=$("langGlobal"),ctx=canvas.getContext("2d");
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle="#050e18";ctx.fillRect(0,0,w,h);
 if(!result?.graph)return;
 const G=result.graph,coords=projection(result,w,h),current=result.pathNodes[Math.min(step,result.pathNodes.length-1)];
 const onRoute=new Map(result.pathNodes.map((id,i)=>[id,i]));
 const route=new Set(result.pathNodes.slice(0,step+1));
 const wanted=new Set(result.pathNodes);
 // Sample only DRAW operations when worlds are very dense. Actual JSON remains unchanged.
 const limit=G.edges.length>6000?6000:G.edges.length;
 for(let index=0;index<limit;index++){
  const e=G.edges[index],a=coords[e.from],b=coords[e.to];
  if(!a||!b)continue;
  const fromIndex=onRoute.get(e.from);
  const inPath=fromIndex!==undefined&&onRoute.get(e.to)===fromIndex+1;
  ctx.strokeStyle=inPath?(route.has(e.to)?"rgba(91,238,194,.96)":"rgba(91,238,194,.5)"):"rgba(82,113,139,.25)";
  ctx.lineWidth=inPath?2.8:1;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(let i=0;i<G.nodes.length&&i<6000;i++){
  const p=coords[i],node=G.nodes[i],on=wanted.has(i);
  const currentNode=i===current;
  const radius=currentNode?9:on?3.5:2.5;
  ctx.fillStyle=currentNode?"#ffcf80":node.kind===2?"#ff6f9d":on?"#55dec2":"#35516a";
  ctx.beginPath();ctx.arc(p.x,p.y,radius,0,2*Math.PI);ctx.fill();
  if(currentNode){ctx.strokeStyle="#fff4dc";ctx.lineWidth=2;ctx.stroke();}
 }
 ctx.fillStyle="#9bb2c6";ctx.font="13px system-ui";
 ctx.fillText("Noduri observate: "+count(G.nodes.length)+" · conexiuni: "+count(G.edges.length),12,21);
 if(G.edges.length>limit||G.nodes.length>6000)ctx.fillText("Proiecție eșantionată pentru randare; traseul complet rămâne în backend",12,h-12);
}
function drawLocal(){
 const canvas=$("langLocal"),ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
 ctx.fillStyle="#06121d";ctx.fillRect(0,0,w,h);
 if(!result?.graph)return;
 const nodes=result.pathNodes,node=nodes[Math.min(step,nodes.length-1)];
 const outgoing=result.graph.edges.filter(e=>e.from===node).slice(0,12);
 ctx.fillStyle="#ffca78";ctx.beginPath();ctx.arc(64,h/2,22,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#0b2235";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("EU",64,h/2+4);
 for(let i=0;i<outgoing.length;i++){
  const edge=outgoing[i],x=236,y=20+i*(Math.min(27,(h-32)/Math.max(1,outgoing.length)));
  ctx.strokeStyle="#62cab1";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(86,h/2);ctx.lineTo(x-17,y+8);ctx.stroke();
  ctx.fillStyle="#31526a";ctx.beginPath();ctx.arc(x,y+8,15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d4f2ec";ctx.font="11px ui-monospace,monospace";ctx.textAlign="center";
  ctx.fillText(edge.character===" "?"␣":String(edge.character).slice(0,2),x,y+12);
 }
 ctx.textAlign="left";ctx.fillStyle="#8fb0c2";ctx.font="11px system-ui";
 ctx.fillText("Stare locală #"+node,12,14);
 if(!outgoing.length)ctx.fillText("Țintă finală observată",125,h/2);
}
function render(){
 if(!result)return;
 const path=result.trace,done=Math.min(step,path.length);
 $("langStep").max=String(path.length);$("langStep").value=String(done);
 $("langStepInfo").textContent=done+" / "+result.steps;
 $("langDone").textContent=count(done);
 $("langCandidates").textContent=count(result.candidates);
 $("langShapeLength").textContent=count(result.steps);
 $("langTarget").textContent=result.solvedKnownGoal?"ÎNVĂȚATĂ": "NECUNOSCUT";
 $("langOutput").textContent=done?path[done-1].prefix:"[înainte de primul caracter — forma globală deja anticipată]";
 const tr=done?path[done-1]:null;
 $("langAction").textContent=tr?
  "Pas "+tr.step+" · corp #"+tr.source+" → #"+tr.target+"\nCaracter traversat: "+
   JSON.stringify(tr.character)+"\nCâmp atracție: "+tr.potentialBefore.toFixed(5)+" → "+tr.potentialAfter.toFixed(5)+
   "\nLungime cale rămasă: "+tr.localRemaining+
   (tr.successorAfter===null||tr.successorAfter===undefined?"":"\nOcupare viitoare (dovezi corpus): "+
     Number(tr.successorBefore).toFixed(5)+" → "+Number(tr.successorAfter).toFixed(5))+
   "\nTransformare executată: "+tr.transformation+
   "\nPolitica corpului: "+tr.policy+
   "\nOpțiuni locale observate: "+tr.localChoices+
   "\nCaracterul anticipat global: "+JSON.stringify(tr.predictedCharacter)+
   "\nDecizia locală coincide cu forma globală: "+(tr.agreesWithGlobal?"DA":"NU"):
  "Forma globală de "+result.steps+" tranziții există înaintea primei acțiuni.\nFără răspuns-țintă ascuns oferit evaluatorului.";
 drawGraph();drawLocal();
}
$("langStep").addEventListener("input",()=>{
 stop();step=Number($("langStep").value)||0;render();
});
$("langPlay").addEventListener("click",()=>{
 if(timer!==null){stop();return;}
 if(!result||!result.trace.length)return;
 if(step>=result.trace.length)step=0;
 $("langPlay").textContent="⏸ Oprește replay";
 timer=setInterval(()=>{step++;render();if(step>=result.trace.length)stop();},230);
});
$("langResetView").addEventListener("click",()=>{stop();step=0;render();});
$("langPlan").addEventListener("click",async()=>{
 if(busy)return;
 busy=true;stop();$("langPlan").disabled=true;
 $("langStatus").textContent="Construiesc lumea numai din căile deja observate ale creierului selectat...";
 try{
  const request={w:selectedGraph(),prompt:$("langPrompt").value,mode:$("langMode").value};
  if(!request.prompt.trim())throw Error("Introdu inputul înainte de propagare.");
  const res=await fetch("/language-maze/plan",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(request),cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const r=await res.json();
  if(r.error)throw Error(r.error);
  if(r.protocol!=="ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS")throw Error("Backend-ul nu este lumea V18.");
  result=r;step=0;
  $("langRows").textContent=count(r.trainingMemory?.rowsObserved);
  $("langObserved").textContent=count(r.trainingMemory?.characterTransitionsObserved);
  $("langStatus").textContent=r.abstained?
   "NECUNOSCUT: lumea absorbită încă nu conține o cale susținută de experiențe pentru acest input.":
   "Forma propagată ÎNAINTE de acțiune: "+count(r.steps)+" portaluri-caractere, "+
   count(r.candidates)+" soluții învățate candidate. Departajări successor (global/local): "+
   count(r.successor?.globalTieBreaks??0)+"/"+count(r.successor?.localTieBreaks??0)+
   ". Corectitudinea la inputul nou rămâne de verificat.";
  $("langEvidence").textContent=JSON.stringify({
   protocol:r.protocol,source:r.backend||"V18 saved world",goalStatus:r.validity,
   noAnswerOracle:true,priorObservedExamples:r.trainingMemory,
   actualNodes:r.graph.nodes.length,actualEdges:r.graph.edges.length,
   actualGoals:r.graph.goals.length,learnedPaths:r.candidates,
   firstAttraction:r.field[0],graphTruncated:r.graph.hitLimit,
   bodyPolicy:r.bodyPolicy,localAgreementRate:r.localAgreementRate,
   propagation:r.propagation,successor:r.successor,
   localSteps:r.locallyExecutedSteps,bodyBlocked:r.localBlockedSteps,
   caveats:r.limitations
  },null,2);
  render();
 }catch(e){$("langStatus").textContent="Eroare REALĂ: "+e.message;}
 finally{busy=false;$("langPlan").disabled=false;}
});
$("langCompare").addEventListener("click",async()=>{
 const button=$("langCompare");button.disabled=true;
 $("langCompareReport").textContent="Evaluez checkpoint-ul salvat pe întrebări Q/A nevăzute, fără antrenare...";
 try{
  const response=await fetch("/language-maze/compare?w="+selectedGraph()+"&count=8",{
   method:"POST",cache:"no-store"
  });
  const r=await response.json();
  if(r.error)throw Error(r.error);
  const percent=v=>v===null||v===undefined?"—":(100*v).toFixed(2)+"%";
  const lines=[
   "FROZEN / OpenThoughts held-out: "+r.heldoutRows+" Q/A · "+r.trainingRowsSeen+" observații antrenare",
   "Răspuns exact V17 original: "+percent(r.original.exactRate),
   "Răspuns exact + successor: "+percent(r.hybrid.exactRate),
   "Delta răspuns exact: "+percent(r.exactDelta),
   "Caractere V17 original: "+percent(r.original.accuracy),
   "Caractere + successor: "+percent(r.hybrid.accuracy),
   "Delta caractere: "+percent(r.characterDelta),
   "Referința intră în planificator: NU · Model actualizat: NU",
   "",
   ...r.hybrid.cases.map((h,i)=>{
    const b=r.original.cases[i];
    return "#"+(i+1)+" "+(h.equal?"CORECT":"GREȘIT")+
      " (original "+(b.equal?"CORECT":"GREȘIT")+") · "+
      String(h.prompt).slice(0,110)+"\n"+
      "Așteptat: "+String(h.expected).slice(0,130)+"\n"+
      "V17: "+String(b.actual).slice(0,130)+"\n"+
      "Hibrid: "+String(h.actual).slice(0,130);
   })
  ];
  $("langCompareReport").textContent=lines.join("\n");
 }catch(e){$("langCompareReport").textContent="Evaluarea reală a eșuat: "+e.message;}
 finally{button.disabled=false;}
});
let lastPoll=0,activePoll=false;
async function poll(){
 if(activePoll||document.hidden||!sidebar.classList.contains("langOn"))return;
 activePoll=true;
 try{
  const res=await fetch("/telemetry?w="+selectedGraph(),{cache:"no-store"});
  if(!res.ok)return;const data=await res.json(),stat=data.telemetry?.languageMaze;
  if(stat){$("langRows").textContent=count(stat.rowsObserved);$("langObserved").textContent=count(stat.characterTransitionsObserved);}
  lastPoll=Date.now();
 }catch{}finally{activePoll=false;}
}
setInterval(poll,2000);
