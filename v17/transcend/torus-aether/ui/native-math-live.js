// Additive ORIGINAL V17 Brain numerical-action hypermaze observatory.
// Displays ONLY real source state/edge/path/field data from /native-math-eval.
// This is NOT a second Brain, not a next-character or demo generator, and the
// horizontal animation is a replay of PREACTION PREDICTION, never fake execution.
const host=document.getElementById("cognitiveBox");
if(host){
 const section=document.createElement("section");
 section.id="nativeMathLive";
 section.style.cssText="margin:20px 0;padding:14px;border:1px solid #396c73;border-radius:10px;background:#081523";
 const h=document.createElement("h3");
 h.textContent="LABIRINT TEXTUAL NATIV — acțiuni observate → forma completă a soluției";
 const disclaimer=document.createElement("p");
 disclaimer.className="note";
 disclaimer.textContent="Același Brain V17 și același Discoverer.shape. Învață DOAR din perechi reale înainte/după (nu din răspunsuri ascunse). Calculul formei este înghețat înaintea primei acțiuni. Graful și animația arată traseul PREZIS, nu acțiuni fizice pretins executate. Momentan: operatori numerici din exemple observate, nu înțelegere nelimitată a textului.";
 const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px";
 const panel=(title)=>{const p=document.createElement("div");p.style.cssText="padding:10px;border:1px solid #26485a;border-radius:8px";const b=document.createElement("h4");b.textContent=title;p.append(b);grid.append(p);return p;};
 const addInput=(parent,title,{type="text",rows=2,value="",placeholder=""}={})=>{
   const label=document.createElement("label");label.style.cssText="display:block;margin:6px 0;font-size:12px";label.textContent=title;
   const inp=rows>1?document.createElement("textarea"):document.createElement("input");
   if(rows>1)inp.rows=rows;else inp.type=type;
   inp.value=value;inp.placeholder=placeholder;
   inp.style.cssText="display:block;width:100%;min-width:0;box-sizing:border-box;margin-top:4px;background:#07121c;color:#e4eef7;border:1px solid #42657c;padding:8px";
   parent.append(label);label.append(inp);return inp;
 };
 const observed=panel("1. Experiență reală: efect înainte / după");
 const before=addInput(observed,"Stare observată înainte",{placeholder:"O propoziție matematică pe care lumea o arată efectiv."});
 const after=addInput(observed,"Stare observată după",{placeholder:"Noua propoziție OBSERVATĂ, nu inventată."});
 const learn=document.createElement("button");learn.textContent="Înregistrează experiența în Brain (checkpoint original)";
 observed.append(learn);
 const learnStatus=document.createElement("pre");learnStatus.style.cssText="white-space:pre-wrap;font-size:12px";learnStatus.textContent="0 experiențe introduse aici.";observed.append(learnStatus);
 const examiner=panel("2. Lume textuală completă + țintă parțială");
 const documentText=addInput(examiner,"Text complet (inclusiv context lung)",{rows:7,placeholder:"Text nevăzut cu exact o structură pe care a învățat să o transforme."});
 const goals=document.createElement("div");goals.style.cssText="display:flex;gap:8px";
 const g0=addInput(goals,"Ținta axei independente 0",{type:"number",rows:1,value:"7"});
 const g1=addInput(goals,"Ținta axei independente 1",{type:"number",rows:1,value:"8"});
 examiner.append(goals);
 const evalBtn=document.createElement("button");evalBtn.textContent="Prezice TOT traseul înainte de prima acțiune";examiner.append(evalBtn);
 const status=document.createElement("pre");status.style.cssText="white-space:pre-wrap;overflow:auto;font-size:12px;line-height:1.5";status.textContent="Niciun traseu calculat.";examiner.append(status);
 const canvas=document.createElement("canvas");canvas.width=960;canvas.height=350;
 canvas.style.cssText="display:block;width:100%;background:#050e19;border:1px solid #29435d;border-radius:8px";
 canvas.setAttribute("aria-label","Traseul exact original Discoverer.shape în topologia învățată; noduri, muchii și valori ale câmpului");
 const timeline=document.createElement("pre");timeline.style.cssText="font:12px ui-monospace,monospace;overflow:auto;white-space:pre-wrap";
 timeline.textContent="Aici apare fiecare pas prezis, în ordine; executarea fizică este separată.";
 const fullLabel=document.createElement("h4");fullLabel.textContent="Răspunsul COMPLET prezis înainte de emitere";
 const answer=document.createElement("textarea");answer.readOnly=true;answer.rows=8;answer.style.cssText="display:block;width:100%;box-sizing:border-box;background:#07121c;color:#e4eef7;border:1px solid #395c78";
 section.append(h,disclaimer,grid,canvas,timeline,fullLabel,answer);host.append(section);
 let active=0,plan=null,frame=0,phase=0,last=0;
 const send=async(uri,payload)=>{
   const r=await fetch(uri,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
   if(!r.ok)throw Error("HTTP "+r.status);
   const x=await r.json();if(x.error)throw Error(x.error);return x;
 };
 window.MPNativeMath={
   setActiveGraph:w=>{active=Number.isInteger(w)?w:active;},
   showFrozenResult:x=>{plan=x;frame=0;phase=0;last=0;draw();}
 };
 learn.onclick=async()=>{
   learn.disabled=true;learnStatus.textContent="Trimit doar observații reale în singurul Brain V17...";
   try{
     const r=await send("/native-math-observe",{w:active,before:before.value,after:after.value});
     learnStatus.textContent="Brain #"+active+" | observații reale "+r.report.observedPairs+
       " | reguli "+r.report.learnedWorldGrammars+" | checkpoint "+r.savedMB?.toFixed(3)+" MB";
   }catch(e){learnStatus.textContent="Acțiune neconfirmată / eroare: "+e.message;}finally{learn.disabled=false;}
 };
 evalBtn.onclick=async()=>{
   evalBtn.disabled=true;status.textContent="Calculez forma completă în graful ÎNVĂȚAT, fără să emit caractere...";
   try{
     const opts=window.MPCognitiveGraph?.evalOptions?.()||{};
     const r=await send("/native-math-eval",{w:active,document:documentText.value,
       goals:[{index:0,value:Number(g0.value)},{index:2,value:Number(g1.value)}],
       seed:opts.seed??4105,temperature:opts.temperature??0});
     window.MPNativeMath.showFrozenResult(r);
     status.textContent=
       "Brain #"+active+" | "+(r.found?"FORMA DESCOPERITĂ":"NU A GĂSIT CALE")+
       "\nMOTOR: "+r.originalMethod+" | atracție originală: "+r.planningLaw+
       "\nProiect: "+(r.inputTokens??0)+" tokenuri, "+r.plannedSteps+" acțiuni PRE-EMISIE"+
       "\nLume: "+r.observedTopology.completeNodes+" stări, "+r.observedTopology.completeEdges+" legături"+
       "\nAxe independente învățate: "+JSON.stringify(r.axes)+"; dependentă: "+r.dependent+
       "\nCâmpul în punctul inițial: "+r.stateFieldAtStart+
       "\nRăspuns-țintă dezvăluit înainte de test? "+r.heldoutReferenceAnswerProvided+
       "\nTranzițiile din stări noi sunt IPOTEZE; nu sunt declarate fizic executate."+
       (r.reason?"\nMotiv: "+r.reason:"");
     answer.value=r.completeAnswer||"";
     timeline.textContent=(r.plannedPath||[]).map((step,i)=>
       (i+1)+": "+step.from+" → "+step.to+" [acțiune "+step.action+
       "] stare PREZISĂ: "+step.after+" / verificată în lume? "+
       (step.verified?"DA":"NU, ipoteză")).join("\n");
   }catch(e){plan=null;status.textContent="EVALUARE BLOCATĂ: "+e.message;answer.value="";timeline.textContent="";draw();}
   finally{evalBtn.disabled=false;}
 };
 function draw(){
   const ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
   ctx.fillStyle="#050e19";ctx.fillRect(0,0,W,H);
   ctx.font="12px ui-monospace,monospace";ctx.fillStyle="#98acc6";
   ctx.fillText("LUMEA OBSERVATĂ, PROIECȚIE TOPOLOGICĂ 2D | AUR = SOLUȚIE ÎNAINTEA PRIMEI ACȚIUNI",14,19);
   const graph=plan?.observedTopology,nodes=graph?.nodes||[],edges=graph?.edges||[];
   if(!nodes.length){ctx.fillText("Nicio topologie nativă observată încă.",20,90);return;}
   const ids=new Set(nodes.map(x=>x.id)),positions=new Map();
   const route=graph.path||[],routeOrder=new Map(route.map((id,i)=>[id,i]));
   const center=Math.max(1,route.length-1);
   for(const n of nodes){
     const k=routeOrder.get(n.id);
     if(k!==undefined){positions.set(n.id,{x:45+k*(W-90)/center,y:138});}
   }
   const extras=nodes.filter(x=>!positions.has(x.id));
   extras.forEach((n,i)=>{
     const row=Math.floor(i/14),col=i%14;
     positions.set(n.id,{x:35+col*66,y:235+(row%2)*53});
   });
   for(const e of edges){
     const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
     ctx.strokeStyle=e.verified?"#2b9b83":"#2b465c";ctx.lineWidth=1;ctx.stroke();
   }
   for(let i=1;i<route.length;i++){
     const a=positions.get(route[i-1]),b=positions.get(route[i]);if(!a||!b)continue;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
     ctx.strokeStyle="#f5b301";ctx.lineWidth=3;ctx.stroke();
   }
   for(const n of nodes){
     const p=positions.get(n.id);if(!p)continue;
     ctx.beginPath();ctx.arc(p.x,p.y,n.start||n.goal?7:3.5,0,7);
     ctx.fillStyle=n.goal?"#37d897":n.start?"#f5f6ff":n.planned?"#f5b301":"#58849f";ctx.fill();
     if(n.start||n.goal||routeOrder.has(n.id)&&route.length<24){
       ctx.fillStyle="#e6e8ec";ctx.font="10px ui-monospace,monospace";
       ctx.fillText(String(n.label||"").slice(0,25),Math.max(10,Math.min(W-150,p.x-15)),p.y-13);
     }
   }
   if(route.length){
     const marker=positions.get(route[Math.min(frame,route.length-1)]);
     if(marker){ctx.beginPath();ctx.arc(marker.x,marker.y,12,0,7);
       ctx.strokeStyle="#f75e5e";ctx.lineWidth=2;ctx.stroke();}
   }
   ctx.fillStyle="#9dbbce";ctx.fillText(
     graph.completeNodes+" noduri · "+graph.completeEdges+
     " transformări; linia este PREDICȚIE, nu execuție; "+
     (graph.graphTruncated?"captură UI limitată":"captură completă"),15,H-11);
 }
 function animate(t){
   const len=plan?.observedTopology?.path?.length||0;
   if(t-last>470){last=t;if(len>1)frame=(frame+1)%len;draw();}
   requestAnimationFrame(animate);
 }
 requestAnimationFrame(animate);
}
