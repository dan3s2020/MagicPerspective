// NO synthetic frames or graph nodes. Each rendered point is verified by the
// local experience journal; the tesseract cage remains a static orientation aid.
import {createTesseractViewer} from './viewer.mjs';
const $=id=>document.getElementById(id);
const viewer=createTesseractViewer($('tesseract'));
let cursor=0,topologySeq=-1,pending=[],playing=true,busy=false,skipped=0;
let series=[],lastStatus=null,lastFrame=null;
const count=n=>Number(n||0).toLocaleString('ro-RO');
const fixed=(n,d=3)=>Number(n||0).toFixed(d);
function status(s){
 lastStatus=s;
 for(const [id,value] of Object.entries({
  nodes:s.total_nodes,edges:s.total_edges,problems:s.unique_problems,
  experiences:s.observed_actions,learning:s.learned_steps,
  cross:s.cross_domain_edges,ratio:fixed(s.edges_per_node,2),
  density:fixed(s.directed_density*100,5)+'%'
 }))$(id).textContent=typeof value==='string'?value:count(value);
 $('connection').textContent=s.observed_actions>0?
  'DATE REALE · '+count(s.observed_actions)+' ACȚIUNI':'AȘTEPT EVENIMENTE DE LA MOTOR';
 $('warning').textContent=s.observed_actions>0?
  'Ultimul graf conține doar conexiuni confirmate de motor. '+
  'Densitatea matematică poate crește sau scădea; totalul muchiilor nu este fabricat. '+
  'Replay omis pe ecran: '+skipped+' episoade (antrenarea nu este oprită).':
  'Niciun eveniment real primit. Nu desenez noduri și nu simulez învățare.';
}
function drawHistory(){
 const canvas=$('chart'),ctx=canvas.getContext('2d'),
  r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(230,Math.round(r.width||500)),h=Math.max(160,Math.round(r.height||240));
 canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#08182a';ctx.fillRect(0,0,w,h);
 if(!series.length){
  ctx.font='12px system-ui';ctx.fillStyle='#b2c4d6';
  ctx.fillText('Nicio experiență reală înregistrată.',12,h/2);
  return;
 }
 const max=Math.max(1,...series.map(x=>Math.max(x.stats.total_nodes,x.stats.total_edges)));
 ctx.strokeStyle='#314e68';ctx.lineWidth=1;
 for(let i=1;i<=4;i++){const y=h-30-i*(h-50)/4;
  ctx.beginPath();ctx.moveTo(34,y);ctx.lineTo(w-10,y);ctx.stroke();}
 const path=(key,color)=>{
  ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.beginPath();
  for(let i=0;i<series.length;i++){
   const x=34+(series.length===1?0:i/(series.length-1))*(w-47);
   const y=h-30-series[i].stats[key]/max*(h-56);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
 };
 path('total_nodes','#81e3d5');path('total_edges','#f8c27e');
 ctx.fillStyle='#a5bad6';ctx.font='11px system-ui';
 ctx.fillText('0',12,h-25);
 ctx.fillText(String(max),5,22);
 ctx.fillText('Experiența '+series.at(-1).sequence,Math.max(34,w-155),h-8);
}
function showFrame(item){
 lastFrame=item;
 viewer.setFrame(item.frame);
 const f=item.frame,g=item.growth;
 $('events').textContent=
  'EVENIMENT #'+item.sequence+' · '+(f.domain||'?')+
  '\nPROBLEMĂ '+(f.problem_id||'?')+
  '\nNODURI NOI +'+g.nodes.length+': '+g.nodes.slice(0,12).join(', ')+
  '\nMUCHII NOI +'+g.edges.length+': '+
  g.edges.slice(0,12).map(x=>x.from+' → '+x.to+' ['+x.kind+']').join(' · ')+
  '\nPONDERI: '+(f.model_update?
   '||Δ||='+fixed(f.model_update.weight_delta,7)+
    ' / ||∇||='+fixed(f.model_update.gradient_norm,7):
   'actualizare neuronală necomunicată de motor')+
  '\nRECOMPENSĂ: '+(f.reward??'neraportată')+
  '\nPREDICȚII: '+f.predictedEdges.length+
  ' (afișate separat, NEADĂUGATE în conexiunile confirmate)'+
  '\nCOADĂ REPLAY: '+pending.length+' / OMITERE: '+skipped;
}
function queueReal(items){
 for(const item of items){
  if(!item?.frame||!Number.isInteger(item.sequence))continue;
  if(pending.some(x=>x.sequence===item.sequence))continue;
  pending.push(item);
 }
 pending.sort((a,b)=>a.sequence-b.sequence);
 if(pending.length>120){skipped+=pending.length-120;pending=pending.slice(-120);}
}
async function json(url,options){
 const r=await fetch(url,{cache:'no-store',...options});
 const o=await r.json();if(!r.ok)throw Error(o.error||'HTTP '+r.status);
 return o;
}
async function poll(){
 if(busy||document.hidden)return;
 busy=true;
 try{
  const [graph,history]=await Promise.all([
   json('/api/graph?maxNodes=1500&maxEdges=6000'),
   json('/api/history')
  ]);
  const s=history.stats;status(s);
  series=history.history||[];drawHistory();
  if(s.sequence!==topologySeq){
   topologySeq=s.sequence;
   if(graph.nodes.length)viewer.setGraph(graph);
  }
  for(let attempts=0;attempts<5;attempts++){
   const feed=await json('/api/events?after='+cursor);
   if(feed.dropped>0)skipped+=feed.dropped;
   if(!feed.events.length)break;
   for(const item of feed.events)if(item.sequence>cursor){
    cursor=item.sequence;queueReal([item]);
   }
   if(!feed.has_more)break;
  }
 }catch(e){
  $('connection').textContent='EROARE CONEXIUNE';
  $('warning').textContent='Sursa datelor reale nu poate fi verificată: '+e.message;
 }finally{busy=false;}
}
$('follow').onclick=()=>{playing=false;$('follow').textContent='Ⅱ REPLAY OPRIT';};
$('restore').onclick=()=>{playing=true;$('follow').textContent='Ⅱ PAUZĂ REPLAY';};
$('snapshot').onclick=async()=>{
 try{
  await json('/api/checkpoint',{method:'POST'});
  $('warning').textContent='Graful real și istoricul au fost salvate persistent; checkpointurile V7 nu au fost modificate.';
 }catch(e){$('warning').textContent='EROARE SALVARE: '+e.message;}
};
setInterval(()=>{
 if(playing&&pending.length){
  showFrame(pending.shift());
 }
},430);
setInterval(poll,880);
new ResizeObserver(drawHistory).observe($('chart'));
void poll();
