// V22 original V17 language shape: visualizes the REAL learned action graph.
// Canvas draws only server-returned frozen states/edges. It NEVER fabricates
// training samples, future answer strings, or actually executed actions.
(() => {
 "use strict";
 const canvas=document.getElementById("v22OriginalShapeCanvas");
 const caption=document.getElementById("v22OriginalShapeCaption");
 if(!canvas||!caption)return;
 const cx=canvas.getContext("2d");
 let topology=null,coords=[],lastFeedback=null,started=0;
 const color={bg:"#07131c",edge:"#28516b",visited:"#5b82a2",
   path:"#eaba42",goal:"#22d5a0",start:"#e7f4ff",failure:"#f37f88"};
 const finite=x=>Number.isFinite(Number(x))?Number(x):0;
 function layout(g,w,h){
   const n=g.nodes.length,depth=Array(n).fill(-1),q=[g.start];
   if(g.start>=0&&g.start<n)depth[g.start]=0;
   for(let head=0;head<q.length;head++){
     const i=q[head];
     for(const e of g.edges)if(e.from===i&&depth[e.to]<0){
       depth[e.to]=depth[i]+1;q.push(e.to);
     }
   }
   let max=Math.max(1,...depth);
   if(max>12){const scale=max/12;max=12;
     for(let i=0;i<n;i++)if(depth[i]>12)depth[i]=12;}
   const byDepth=new Map();
   for(let i=0;i<n;i++){
     const d=depth[i]>=0?depth[i]:max+1;
     if(!byDepth.has(d))byDepth.set(d,[]);
     byDepth.get(d).push(i);
   }
   const columns=Math.max(2,...byDepth.keys())+1;
   const p=Array(n);
   for(const [d,nodes] of byDepth){
     const x=34+(w-68)*d/columns;
     for(let k=0;k<nodes.length;k++){
       const i=nodes[k],vertical=(k+1)/(nodes.length+1);
       p[i]={x,y:36+(h-72)*vertical};
     }
   }
   return p;
 }
 function syncCanvas(){
   const rect=canvas.getBoundingClientRect(),scale=Math.max(1,Math.min(2,window.devicePixelRatio||1));
   const w=Math.max(320,Math.round(rect.width)),h=Math.max(220,Math.round(rect.height));
   if(canvas.width!==Math.round(w*scale)||canvas.height!==Math.round(h*scale)){
     canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
   }
   cx.setTransform(scale,0,0,scale,0,0);return {w,h};
 }
 function line(a,b,stroke,width=1){
   cx.strokeStyle=stroke;cx.lineWidth=width;cx.beginPath();
   cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
 }
 function frame(now){
   const {w,h}=syncCanvas();cx.fillStyle=color.bg;cx.fillRect(0,0,w,h);
   if(!topology?.nodes?.length){
     cx.fillStyle="#aec7d6";cx.font="14px ui-monospace,monospace";
     cx.fillText("Astept o evaluare REALA din harta cognitiva antrenata.",18,42);
     cx.fillText("Nu se afiseaza un graf de demonstratie.",18,66);
     requestAnimationFrame(frame);return;
   }
   coords=layout(topology,w,h);
   const route=Array.isArray(topology.predictedRoute)?topology.predictedRoute:[];
   const routes=new Set();
   for(let i=1;i<route.length;i++)routes.add(route[i-1]+":"+route[i]);
   for(const e of topology.edges){
     const a=coords[e.from],b=coords[e.to];if(!a||!b)continue;
     line(a,b,routes.has(e.from+":"+e.to)?color.path:color.edge,
       routes.has(e.from+":"+e.to)?2.7:0.75);
   }
   const showLabels=new Set([topology.start,...topology.goals,...route]);
   for(const node of topology.nodes){
     const pos=coords[node.id];if(!pos)continue;
     const field=Math.max(0,Math.min(1,finite(node.field))),r=node.onInitialPath?5:3;
     cx.beginPath();cx.arc(pos.x,pos.y,r+3.5*field,0,Math.PI*2);
     cx.fillStyle=node.goal?color.goal:node.id===topology.start?color.start:
       node.onInitialPath?color.path:color.visited;
     cx.fill();
     if(showLabels.has(node.id)&&node.id<topology.nodes.length){
       cx.fillStyle="#d5e9f2";cx.font="11px ui-monospace,monospace";
       const label=(node.label||"").slice(0,34);
       cx.fillText(label,pos.x+9,pos.y-7);
     }
   }
   // Animation travels only along the FROZEN PREDICTED route; it never
   // changes a trained state and is never scored as an actual action.
   if(route.length>1){
     const t=(now-started)/900,edge=Math.floor(t)% (route.length-1),fraction=t%1;
     const a=coords[route[edge]],b=coords[route[edge+1]];
     if(a&&b){
       const x=a.x+(b.x-a.x)*fraction,y=a.y+(b.y-a.y)*fraction;
       cx.beginPath();cx.arc(x,y,6,0,2*Math.PI);
       cx.fillStyle="#ffffff";cx.fill();
       cx.strokeStyle=color.path;cx.lineWidth=2;cx.stroke();
     }
   }
   if(lastFeedback){
     cx.fillStyle=lastFeedback.accepted?color.goal:color.failure;
     cx.font="12px ui-monospace,monospace";
     cx.fillText("ULTIMUL FEEDBACK OBSERVAT: "+(lastFeedback.accepted?"ACTIUNE ACCEPTATA":"ACTIUNE RESPINSA"),15,h-12);
   }
   requestAnimationFrame(frame);
 }
 window.addEventListener("v22-original-shape",ev=>{
   const r=ev.detail||{};topology=r.topology||null;started=performance.now();
   lastFeedback=null;
   if(!topology){
     caption.textContent="Nu exista topologie invatata pentru aceasta tinta. Nu este un raspuns gresit inventat.";
     return;
   }
   caption.textContent="V22 REAL: "+(r.directOriginalMethod||"UNVERIFIED")+
     " | "+topology.totalNodes+" stari invatate/generate, "+topology.sampledEdges+
     " muchii afisate, "+(topology.predictedRoute?.length||0)+
     " noduri in forma prezisa INAINTE de prima actiune. "+
     (r.found?"Traseu candidat descoperit.":"Traseu negasit.")+
     " | Proiectie 2D a topologiei N-D, NU reprezentare fizica 4D. "+
     "Animatia aurie NU executa actiuni. Feedbackul real este separat."+
     (topology.truncated?" ATENTIE: HARTA VIZUALA PARTIALA.":"");
 });
 window.addEventListener("v22-observed-action",ev=>{
   lastFeedback=ev.detail||null;
   // Actual learned world state changes only in the server, after independent
   // observed before/action/after feedback and saved checkpoint.
   caption.textContent+="\nFeedback real primit: "+(lastFeedback.accepted?"acceptat":"respins")+
     ". Re-evalueaza forma dupa ce organismul invata noua rezistenta.";
 });
 window.addEventListener("resize",()=>{coords=[];});
 requestAnimationFrame(frame);
})();
