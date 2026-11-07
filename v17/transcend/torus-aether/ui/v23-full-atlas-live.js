// V23 actual append-only atlas: all records accessible through cursor pagination.
// No fabricated nodes or answer; visual projection is clearly a WINDOW of the full file.
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("v23AtlasBox"))return;
 const worker=$("v23AtlasWorker"),kind=$("v23AtlasKind"),status=$("v23AtlasStatus"),
   comparison=$("v23AtlasComparison"),choice=$("v23AtlasRecord"),
   raw=$("v23AtlasRaw"),offset=$("v23AtlasNodeOffset"),
   canvas=$("v23AtlasCanvas"),ctx=canvas.getContext("2d"),exporter=$("v23AtlasExport");
 let history=[],current=null,position=0,loading=false;
 const readable=v=>typeof v==="string"?v:JSON.stringify(v);
 const trunc=(v,n=60)=>String(v??"").slice(0,n);
 const label=e=>e.type+" "+(e.world||"")+" "+(e.found===true?"ROUTE FOUND":e.found===false?"NO ROUTE":"")+" "+(e.reason||e.action||"");
 const classify=e=>{
   if(e.type==="planning-attempt")return e.found?"success":"failure";
   if(e.type==="observed-action")return e.accepted?"confirmed":"wall";
   if(e.type==="rule-evidence")return "hypothesis";
   if(e.type==="observed-external-transition")return e.ambiguous?"ambiguous":"observed";
   return "other";
 };
 function compare(){
   const grouped={};
   for(const e of current?.rows||[])grouped[classify(e)]=(grouped[classify(e)]||0)+1;
   const failures=(current?.rows||[]).filter(x=>x.type==="planning-attempt"&&!x.found),missing=new Map();
   for(const e of failures){
     for(const reason of e.diagnostics?.excludedByDesign||[])
       missing.set(reason,(missing.get(reason)||0)+1);
     for(const token of e.diagnostics?.goalTokensNeverGenerated||[]){
       const k="MISSING_GOAL_TOKEN: "+token;missing.set(k,(missing.get(k)||0)+1);
     }
   }
   comparison.textContent="PE PAGINA SELECTATA (nu intregul dataset):\n"+
     Object.entries(grouped).map(([k,v])=>k+": "+v).join("\n")+
     "\n\nCE NU A GASIT / CE I-A INTERZIS DESIGNUL:\n"+
     ([...missing].map(([reason,count])=>reason+" x "+count).join("\n")||
       "Niciun esec pe aceasta pagina. Nu inseamna 100% acuratete.")+
     "\n\nFiltreaza 'Cai incercate...' si parcurge TOATE paginile pentru comparatie.";
 }
 function renderGraph(e){
   const rect=canvas.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1),
     width=Math.max(320,Math.round(rect.width)),height=Math.max(260,Math.round(rect.height));
   canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
   ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle="#06121c";ctx.fillRect(0,0,width,height);
   const graph=e?.fullAtlas,states=graph?.states||[],allEdges=graph?.neighbors||[];
   if(!states.length){
     ctx.font="14px ui-monospace,monospace";ctx.fillStyle="#c7dfed";
     ctx.fillText(e?.type==="rule-evidence"?
       "OBSERVED TRANSFORM "+trunc(e.from,15)+" -> "+trunc(e.to,15):
       "Selecteaza o incercare de navigare cu graf real",16,40);
     ctx.fillText("Detaliile INTEGRALE ale evenimentului sunt sub graf.",16,65);return;
   }
   const start=Math.max(0,Math.min(states.length-1,Number(offset.value)||0));
   const count=Math.min(180,states.length-start),points=new Map();
   const cols=Math.max(5,Math.floor(width/125)),rows=Math.ceil(count/cols);
   for(let i=0;i<count;i++){
     const index=start+i,row=Math.floor(i/cols),col=i%cols;
     points.set(index,{x:38+(width-76)*(col+.4)/cols,
                       y:38+(height-76)*(row+.4)/Math.max(1,rows)});
   }
   const planned=new Set((e.fullPredictedPath||[]).map(h=>h.from+":"+h.to));
   const totalEdges=allEdges.reduce((sum,arr)=>sum+arr.length,0);
   let visibleEdges=0;
   for(const [from,a]of points){
     for(const edge of allEdges[from]||[]){
       const b=points.get(edge.to);if(!b)continue;
       const onPath=planned.has(from+":"+edge.to);
       ctx.strokeStyle=onPath?"#f5cf6d":edge.verified?"#4bd6aa":edge.hypothesis?"#6472e0":"#3c667e";
       ctx.lineWidth=onPath?2.5:1;ctx.beginPath();ctx.moveTo(a.x,a.y);
       ctx.lineTo(b.x,b.y);ctx.stroke();visibleEdges++;
     }
   }
   const goals=new Set(graph.targets||[]);
   for(const [id,p]of points){
     ctx.fillStyle=goals.has(id)?"#4be6b6":id===0?"#fff":"#e4b86e";
     ctx.beginPath();ctx.arc(p.x,p.y,goals.has(id)?6:3.5,0,Math.PI*2);ctx.fill();
     ctx.fillStyle="#e4eff8";ctx.font="10px ui-monospace,monospace";
     const words=Array.isArray(states[id])?states[id].join(" "):readable(states[id]);
     ctx.fillText(id+" "+trunc(words,24),p.x+7,p.y-8);
   }
   ctx.fillStyle="#b9d9e8";ctx.font="12px ui-monospace,monospace";
   ctx.fillText("NODURI REALE "+start+"-"+(start+count-1)+" / "+states.length+
     " | MUCHII complete "+totalEdges+" | fereastra "+visibleEdges,14,height-9);
 }
 function select(){
   const e=current?.rows?.[Number(choice.value)||0]||null;
   if(!e){raw.textContent="Niciun eveniment disponibil.";renderGraph(null);return;}
   raw.textContent=JSON.stringify(e,null,2);
   offset.max=Math.max(0,(e.fullAtlas?.states?.length||1)-1);
   renderGraph(e);
 }
 function showPage(page,cursor){
   current=page;position=cursor;const rows=page.rows||[];
   choice.innerHTML="";
   for(let i=0;i<rows.length;i++){
     const o=document.createElement("option");o.value=String(i);
     o.textContent=(i+1)+". "+trunc(label(rows[i]),125);choice.append(o);
   }
   exporter.href="/atlas-export?w="+encodeURIComponent(worker.value);
   status.textContent="ATLAS REAL: "+(page.totalBytes||0).toLocaleString("ro-RO")+
     " bytes pe disc; cursor "+position+" -> "+page.nextCursor+
     "; evenimente vizibile "+rows.length+
     (page.end?"; ULTIMA PAGINA momentan.":"; URMEAZA ALTE PAGINI.")+
     "\nJURNAL APPEND-ONLY; NOILE OBSERVATII NU SUNT LIMITATE DE RAM."+
     "\nDatele compactate inainte de instalarea V23 nu sunt recuperate automat.";
   $("v23AtlasPrev").disabled=!history.length;
   $("v23AtlasNext").disabled=page.end;
   compare();select();
 }
 async function read(cursor=0,back=false){
   if(loading)return;loading=true;$("v23AtlasLoad").disabled=true;
   status.textContent="Citesc jurnalul ORIGINAL de pe disc...";
   try{
     const response=await fetch("/atlas?w="+encodeURIComponent(worker.value)+
       "&cursor="+encodeURIComponent(cursor)+"&limit=40&kind="+encodeURIComponent(kind.value),{cache:"no-store"});
     const result=await response.json();if(result.error)throw Error(result.error);
     if(!back&&current)history.push(position);
     showPage(result,cursor);
   }catch(e){status.textContent="ATLAS ERROR: "+e.message;}
   finally{loading=false;$("v23AtlasLoad").disabled=false;}
 }
 $("v23AtlasLoad").onclick=()=>{history=[];current=null;read(0);};
 $("v23AtlasNext").onclick=()=>{if(current&&!current.end)read(current.nextCursor);};
 $("v23AtlasPrev").onclick=()=>{if(history.length)read(history.pop(),true);};
 kind.onchange=()=>{history=[];current=null;read(0);};
 worker.onchange=()=>{history=[];current=null;read(0);};
 choice.onchange=select;offset.onchange=select;
 exporter.onclick=()=>{exporter.href="/atlas-export?w="+encodeURIComponent(worker.value);};
 window.addEventListener("resize",select);
})();
