'use strict';
import {drawAbstract,graphFacts} from './graph-render.js';
const $=id=>document.getElementById(id);
const number=(v,d=2)=>Number.isFinite(Number(v))&&v!==null?Number(v).toFixed(d):'—';
const comma=v=>Number(v||0).toLocaleString('ro-RO');
const COLORS={mint:'#71dcc8',amber:'#f8c17b',blue:'#7abfff',purple:'#baa3fc',red:'#f094a7',muted:'#a8bdd3'};
let S=null,archive=[],busy=false,polling=false,frames=[],frameNo=0,framePlaying=true,
 lastPreviewStamp=null,animation=0,revision=-1,lastFile=null;
let displayed=null,displaySource=null,traceCursor=0,traceQueue=[],traceDropped=0,
 tracePolling=false;
async function api(route,payload){
 const isPost=payload!==undefined;
 const response=await fetch('/api/'+route,{method:isPost?'POST':'GET',
  headers:isPost?{'Content-Type':'application/json'}:{},
  body:isPost?JSON.stringify(payload):undefined,cache:'no-store'});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||'HTTP '+response.status);
 return result;
}
function status(t,ok=true){$('connection').textContent=t;$('connection').style.color=ok?COLORS.mint:COLORS.red;}
function setBusy(value){busy=value;controls()}
function controls(){
 const running=S?.run?.status==='running';
 for(const id of ['load','create','save','import','test','start','resume','pause','stop','export']){
  const b=$(id);if(b)b.disabled=busy;
 }
 $('start').disabled=busy||running||!S?.trainable;
 $('resume').disabled=busy||running||!S?.trainable;
 $('pause').disabled=busy||!running;
 $('stop').disabled=busy||!running;
 for(const id of ['load','create','import','test'])$(id).disabled=busy||running;
 $('save').disabled=busy||running||!S?.trainable;
}
async function action(route,payload,label){
 if(busy)return;setBusy(true);status(label+'…');
 try{
  const result=await api(route,payload);
  if(result?.run||result?.model!==undefined)apply(result);
  if(['brains/select','brains/new','brains/save','brains/import'].includes(route))await loadLibrary();
  status('● Motor local activ');
  return result;
 }catch(e){status('Eroare: '+e.message,false);$('saved-status').textContent=e.message;return null}
 finally{setBusy(false)}
}
async function loadLibrary(){
 const data=await api('brains');
 archive=data.brains||[];
 const dropdown=$('brain-list'),old=dropdown.value;
 dropdown.replaceChildren();
 const current=document.createElement('option');current.value='';current.textContent='Alege un checkpoint salvat';
 dropdown.appendChild(current);
 for(const item of archive){
  const o=document.createElement('option');o.value=item.id;
  o.textContent=item.label+' · '+item.kind+' · '+(item.episodes||0)+' ep. '+(item.trainable?'':'(arhivă, doar inspecție)');
  dropdown.appendChild(o);
 }
 if(archive.some(x=>x.id===old))dropdown.value=old;
 else if(archive.some(x=>x.id===S?.selected))dropdown.value=S.selected;
}
function selectedDomains(){
 const result=[];for(const d of ['maze','network','text'])if($('d-'+d).checked)result.push(d);
 if(!result.length)throw Error('Selectează cel puțin un domeniu.');
 return result;
}
const config=()=>{
 const domains=selectedDomains();
 return {episodes:Number($('episodes').value),unlimited:Number($('episodes').value)===0,
  domains,size:Number($('size').value),
  autosaveEvery:Number($('autosave').value),
  previewEvery:Number($('preview-every').value),delayMs:Number($('delay').value)};
};
$('start').onclick=async()=>{try{const c=config();await action('start',{...c,resetRun:true},'Pornire training')}
 catch(e){status(e.message,false)}};
$('resume').onclick=async()=>{try{await action('resume',{...config(),resetRun:false},'Continuare training')}
 catch(e){status(e.message,false)}};
$('pause').onclick=()=>action('pause',{},'Se salvează și se oprește după episodul actual');
$('stop').onclick=()=>action('stop',{},'Oprire cu salvare');
$('load').onclick=()=>{const id=$('brain-list').value;if(id)action('brains/select',{id},'Se încarcă checkpointul')};
$('create').onclick=()=>{
 if(!confirm('Creier nou? Creierul activ este păstrat local; folosește Salvează pentru un checkpoint cu nume.'))return;
 action('brains/new',{kind:$('new-kind').value},'Creier nou');
};
$('save').onclick=async()=>{
 const initial=(S?.kind||'Creier')+'-'+(S?.model?.episodes||0)+'-ep';
 const label=prompt('Numele checkpointului nou:',initial);
 if(label!==null&&label.trim())await action('brains/save',{label},'Salvare creier');
};
$('export').onclick=async()=>{
 try{
  const data=await api('export'),file=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download='MagicPerspective-'+(S?.kind||'brain')+'-'+(S?.model?.episodes||0)+'.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
 }catch(e){status(e.message,false)}
};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{
 const f=$('file').files?.[0];if(!f)return;
 if(f.size>12*1024*1024){status('Fișierul depășește 12 MB.',false);return}
 const content=await f.text();
 const result=await action('brains/import',{content,label:f.name.replace(/\.json$/i,'')},'Import checkpoint');
 if(result?.id)await action('brains/select',{id:result.id},'Activare creier importat');
 $('file').value='';
};
$('probe').onclick=async()=>{
 const result=await action('probe',{domain:$('probe-domain').value,size:Number($('size').value),
  seed:Math.floor(150000+Date.now()%700000)},'Se execută problema cu un creier copiat');
 if(result?.preview){showDisplayed(result.preview,result.previewOrigin||'inspecție fără antrenare');}
};
$('test').onclick=async()=>{
 try{await action('test',{count:12,size:Number($('size').value),domains:selectedDomains()},'Test orb pe lumi noi')}
 catch(e){status(e.message,false)}
};
$('replay-toggle').onclick=()=>{
 framePlaying=!framePlaying;$('replay-toggle').textContent=framePlaying?'Ⅱ PAUZĂ REPLAY':'▶ CONTINUĂ REPLAY';
};
$('replay-start').onclick=()=>{frameNo=0;framePlaying=true;$('replay-toggle').textContent='Ⅱ PAUZĂ REPLAY';drawAll()};
$('replay').oninput=()=>{frameNo=Number($('replay').value);framePlaying=false;
 $('replay-toggle').textContent='▶ CONTINUĂ REPLAY';drawAll()};
function showDisplayed(preview,source){
 if(!preview?.meta?.abstract)return;
 displayed=preview;displaySource=source;frames=preview.frames||[];frameNo=0;
 lastPreviewStamp=preview.meta.seed+'-'+preview.outcome.steps+'-'+preview.meta.kind;
 $('replay').max=String(Math.max(0,frames.length-1));
 $('episode-id').textContent=preview.meta.domain.toUpperCase()+' · seed '+preview.meta.seed;
 $('world-desc').textContent=(preview.meta.text?preview.meta.text+' · ':'')+
  'CREIER '+preview.meta.kind.toUpperCase()+' · '+source+' · '+
  (preview.outcome.solved?'ȚINTĂ ATINSĂ':'ȚINTĂ NEATINSĂ')+
  ' · '+preview.outcome.steps+' acțiuni, cost '+number(preview.outcome.cost,2);
}
function apply(s){
 const previousSelection=S?.selected;
 S=s;
 if(previousSelection&&previousSelection!==s.selected){
  displayed=null;traceQueue=[];traceCursor=0;traceDropped=0;frames=[];
 }
 if(!s)return;
 const run=s.run||{},m=s.model||{},t=s.timing||{},out=s.last?.outcome||{};
 const isRunning=run.status==='running';
 $('phase').textContent=isRunning?'LIVE '+(run.unlimited?'∞':'TRAINING'):run.status?.toUpperCase()||'—';
 $('brain-status').textContent=s.kind+' · '+(s.trainable?'TRAINABLE':'READ ONLY');
 $('current-brain').textContent='Selectat: '+s.selected+' · '+(m.architecture||'Arhitectură de arhivă');
 $('saved-status').textContent=s.notes||'';
 $('metric-episodes').textContent=comma(m.episodes);
 $('metric-updates').textContent=comma(m.updates);
 $('metric-samples').textContent=comma(m.samples);
 $('metric-rate').textContent=number(t.episodesPerSecond,2);
 $('metric-ms').textContent=number(t.millisecondsPerEpisode,1);
 $('metric-solved').textContent=out.solved===undefined?'—':(out.solved?'✓ ATINS':'✗ NEATINS');
 $('metric-loss').textContent=number(out.loss,4);
 $('metric-delta').textContent=number(s.last?.weightDelta,5);
 $('architecture').textContent=m.architecture||'ARCHIVĂ';
 $('training-status').textContent='Status: '+run.status+' · '+comma(run.done)+' episoade în sesiune'+
  (run.unlimited?' · fără limită de episoade':' / '+comma(run.target))+
  ' · ultimul checkpoint '+(run.savedAt||'încă nu există')+
  (run.error?' · EROARE: '+run.error:'')+
  (Number.isFinite(s.bestFitness)?' · cel mai bun scor validat '+number(s.bestFitness,3):'');
 const progress=run.unlimited?100:run.target?Math.min(100,run.done/run.target*100):0;
 $('bar-inner').style.width=progress+'%';
 $('bar-inner').classList.toggle('infinite',isRunning&&!!run.unlimited);
 $('bar').setAttribute('aria-valuenow',Math.round(progress));
 const preview=s.preview;
 if(preview&&!displayed)showDisplayed(preview,s.previewOrigin||'episod real');
 // A state poll must never restart an episode replay; new training traces arrive
 // through the independently sequenced /api/traces channel.
 if(!preview&&!s.trainable){displayed=null;frames=[];}
 drawLearning();drawFunction();drawTest();controls();
}
function canvas(id){
 const c=$(id),w=c.width,h=c.height,g=c.getContext('2d');
 g.clearRect(0,0,w,h);g.fillStyle='#091629';g.fillRect(0,0,w,h);
 return {g,w,h};
}
const xy=(pos,i,w=650)=>{const p=pos?.[i]||{x:.5,y:.5};return {x:28+p.x*(w-56),y:28+p.y*(w-56)}};
function text(g,txt,x,y,color=COLORS.muted,size=13){
 g.fillStyle=color;g.font='600 '+size+'px system-ui';g.fillText(txt,x,y);
}
function stroke(g,points,pos,color,width=3,dash=[]){
 if(!Array.isArray(points)||points.length<2)return;
 g.beginPath();let first=true;
 for(const i of points){const p=xy(pos,i);if(first){g.moveTo(p.x,p.y);first=false}else g.lineTo(p.x,p.y)}
 g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash);g.stroke();g.setLineDash([]);
}
function edge(g,pos,a,b,color,width=1){
 const x=xy(pos,a),y=xy(pos,b);
 g.beginPath();g.moveTo(x.x,x.y);g.lineTo(y.x,y.y);
 g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
const parseKnown=frame=>{
 const out=[];if(Array.isArray(frame.learnedEdges))for(const e of frame.learnedEdges)out.push(e);
 if(Array.isArray(frame.known)&&frame.known.length&&Array.isArray(frame.known[0])){
  for(const item of frame.known){const k=String(item[0]),z=item[1];
   const pair=k.split(':').map(Number);
   if(z===1&&pair.length===2&&pair.every(Number.isFinite))out.push({a:pair[0],b:pair[1]});
  }
 }
 return out;
};
function drawWorld(id,truth=false){
 drawAbstract($(id),displayed?.meta||null,frames[Math.min(frameNo,frames.length-1)]||null,
  {truth,animation});
}
function drawGraphFacts(){
 const p=displayed,frame=frames[Math.min(frameNo,frames.length-1)]||null,
  facts=graphFacts(p?.meta,frame);
 if(!facts){
  for(const id of ['graph-domain','graph-prediction','graph-actual','graph-solution'])$(id).textContent='—';
  $('candidate-list').textContent='În așteptarea unui graf de stări real.';
  $('graph-explanation').textContent='Apasă INSPECTEAZĂ sau START ∞ pentru o problemă executată efectiv.';
  return;
 }
 $('graph-domain').textContent=facts.domain;
 $('graph-prediction').textContent=facts.prediction;
 $('graph-actual').textContent=facts.execution;
 $('graph-solution').textContent=facts.solution;
 $('graph-explanation').textContent='Plan: '+facts.source+' · SOLUȚIE EXACTĂ (evaluator numai): '+
  facts.reference+' · predicțiile nu citesc acest traseu.';
 const root=$('candidate-list');root.replaceChildren();
 if(!facts.candidates.length){
  const cell=document.createElement('div');cell.className='decision';cell.textContent=
   'Modelul n-a furnizat candidați pentru cadrul curent. Vezi traseul nativ sau rezultatul.';
  root.append(cell);
 }
 for(const [i,c] of facts.candidates.slice(0,8).entries()){
  const el=document.createElement('div');el.className='decision'+(i===0?' best':'');
  el.textContent=(i===0?'★ ':'')+c.action+' · Q='+c.score+
   ' · '+c.from+' → '+c.to+(c.known?'':' (destinație necunoscută)');
  root.append(el);
 }
 $('trace-indicator').textContent='Cadre reale: '+frames.length+' · sursă: '+displaySource+
  ' · procesate: '+comma(S?.run?.done)+' episoade · coadă replay: '+traceQueue.length+
  ' · episoade ratate la transfer: '+traceDropped+
  ' (când motorul rulează mai repede decât telefonul).';
}

function plotLine(id,series,labels,min=0,max=1){
 const {g,w,h}=canvas(id),left=54,right=w-20,top=35,bottom=h-38;
 for(let k=0;k<=4;k++){
  const y=top+k*(bottom-top)/4;g.strokeStyle='#263955';g.beginPath();
  g.moveTo(left,y);g.lineTo(right,y);g.stroke();
  text(g,number(max-k*(max-min)/4,2),6,y+4,'#9fb0d0',11);
 }
 const xAt=i=>left+i*(right-left)/Math.max(1,(series[0]?.values.length||1)-1);
 for(const entry of series){
  if(!entry.values?.length)continue;
  g.beginPath();let moved=false;
  entry.values.forEach((v,i)=>{if(!Number.isFinite(v))return;
   const x=xAt(i),y=bottom-(v-min)/Math.max(.00001,max-min)*(bottom-top);
   if(!moved){g.moveTo(x,y);moved=true}else g.lineTo(x,y)});
  g.strokeStyle=entry.color;g.lineWidth=3;g.stroke();
 }
 let x=left;
 for(const entry of series){text(g,entry.name,x,19,entry.color,11);x+=Math.min(230,60+entry.name.length*7)}
 if(labels)text(g,labels,left,bottom+25,'#c1d0e7',12);
}
function drawFunction(){
 const data=S?.functionCurve||[];
 plotLine('function-canvas',[{name:'f(x) · ieșirea parametrilor',color:COLORS.mint,
  values:data.map(v=>v.y)}],'Scanează parametrul x în intervalul definit de adaptor',0,1);
}
function drawLearning(){
 const history=(S?.history||[]).slice(-130);
 const success=history.map(x=>x.success??0),loss=history.map(x=>x.loss);
 const nonempty=loss.filter(Number.isFinite),maxLoss=Math.max(1,...nonempty);
 plotLine('learning-canvas',[
  {name:'Succes recent (0–1)',color:COLORS.mint,values:success},
  {name:'Loss normalizat (separat de succes)',color:COLORS.amber,
   values:loss.map(v=>Number.isFinite(v)?v/maxLoss:null)},
  {name:'Timp / episod normalizat',color:COLORS.purple,
   values:history.map(x=>Math.min(1,(x.millisecondsPerEpisode||0)/Math.max(1,...history.map(z=>z.millisecondsPerEpisode||0))))}
 ],'Istoric măsurat · '+history.length+' puncte',0,1);
}
function drawBrain(){
 const {g,w,h}=canvas('neural-canvas');
 const weights=S?.model?.weights;
 if(!weights){text(g,'Arhiva selectată nu expune o rețea antrenabilă.',22,80);return}
 const input=weights.W1||[],middle=weights.b1||[],output=weights.W2||[];
 const n1=Math.min(12,Math.max(3,Math.floor(input.length/Math.max(1,middle.length))||input.length)),
  n2=Math.min(18,Math.max(1,middle.length||Math.min(9,input.length))),
  n3=Math.min(8,Math.max(1,weights.b2?.length||1));
 const levels=[n1,n2,n3],Xs=[110,370,630];
 const yFor=(len,i)=>40+(i+.5)*(h-80)/len;
 const highlight=frames[Math.min(frameNo,frames.length-1)]?.activation||[];
 for(let l=0;l<2;l++){
  const countA=levels[l],countB=levels[l+1];
  for(let i=0;i<countA;i++)for(let j=0;j<countB;j++){
   if((i+j)%Math.max(1,Math.floor(countA*countB/130))!==0)continue;
   const index=l===0?j*n1+i:j*n2+i,v=(l===0?input:output)[index]||0;
   const alpha=Math.min(.74,Math.abs(v)*2+.06);
   g.beginPath();g.moveTo(Xs[l],yFor(countA,i));g.lineTo(Xs[l+1],yFor(countB,j));
   g.strokeStyle=v>=0?'rgba(113,220,200,'+alpha+')':'rgba(240,148,167,'+alpha+')';
   g.lineWidth=Math.min(2,Math.max(.45,Math.abs(v)*1.5));g.stroke();
  }
 }
 for(let l=0;l<3;l++)for(let i=0;i<levels[l];i++){
  const intensity=l===1&&highlight.length?Math.abs(highlight[i]||0):.25+
   Math.abs((l===1?middle[i]:l===2?weights.b2?.[i]:input[i])||0)*.4;
  const rad=3.5+Math.min(4,intensity*4),x=Xs[l],y=yFor(levels[l],i);
  g.beginPath();g.arc(x,y,rad+1*Math.sin(animation/3+i*.3),0,2*Math.PI);
  g.fillStyle=l===1?'rgba(186,163,252,'+(.3+Math.min(.7,intensity*.6))+')':
   l===2?COLORS.mint:COLORS.blue;g.fill();
 }
 text(g,'Intrări',56,23,COLORS.blue);text(g,'Strat / parametri',300,23,COLORS.purple);
 text(g,'Ieșiri',599,23,COLORS.mint);
 $('activation-note').textContent=highlight.length?'Nodurile centrale folosesc activările reale ale ultimei acțiuni.':
  'Sunt desenate ponderi reale. Acest adaptor nu furnizează activări pe fiecare decizie.';
}
function drawTest(){
 const root=$('test-results');root.replaceChildren();
 if(!S?.lastTest){
  const p=document.createElement('p');p.className='fine';
  p.textContent='Apasă TEST ORB: aceleași lumi pentru modelul antrenat și cel neantrenat.';root.append(p);return;
 }
 for(const [domain,r] of Object.entries(S.lastTest.domains||{})){
  const box=document.createElement('div');box.className='test-item';
  const h=document.createElement('b');h.textContent=domain.toUpperCase();
  const a=document.createElement('strong');
  a.textContent=r.metric==='costMAE'?number(r.meanCost,3)+' MAE':number(100*r.success,1)+'%';
  const s=document.createElement('small');
  s.textContent=r.metric==='costMAE'?'Eroare neantrenat '+number(r.baselineCost,3)+
   ' · mai mic este mai bun':
   (r.metric==='exactTransition'?'Tranziții exacte: ':'Obiective: ')+
   'antrenat '+r.solved+'/'+r.count+' · neantrenat '+r.baselineSolved+'/'+r.count;
  const c=document.createElement('small');
  c.textContent=r.metric==='costMAE'?'Evaluare pe conexiuni cu costuri nevăzute':
   'Cost/eroare '+r.meanCost+' vs '+r.baselineCost;
  box.append(h,a,s,c);root.append(box);
 }
}
function drawAll(){
 if(!S)return;
 drawWorld('learner-canvas',false);drawWorld('truth-canvas',true);
 drawGraphFacts();drawBrain();
 $('replay').value=String(frameNo);
 $('frame-number').textContent=(frames.length?frameNo+1:0)+' / '+frames.length;
 const f=frames[frameNo]||{},out=S.preview?.outcome||{};
 $('frame-info').textContent='Acțiune '+(f.step??'—')+' · nod '+(f.current??f.position??'—')+
  ' · cost '+number(f.cost??f.effort,1)+' · '+(out.solved?'obiectiv atins':'fără succes încă');
}
async function refresh(){
 if(polling)return;polling=true;
 try{
  const s=await api('state'),isChanged=revision!==s.revision||S?.run?.status!==s.run?.status;
  if(isChanged){revision=s.revision;apply(s);}else{
   S=s;const m=s.timing||{};
   $('metric-rate').textContent=number(m.episodesPerSecond,2);
   $('metric-ms').textContent=number(m.millisecondsPerEpisode,1);
  }
  status(s.run.status==='running'?'● TRAINING LIVE':'● Motor local activ');
 }catch(e){status('Conexiune pierdută: '+e.message,false)}
 finally{polling=false}
}
setInterval(()=>{if(!S||document.hidden)return;animation++;
 if(framePlaying&&frames.length){frameNo=(frameNo+1)%frames.length}
 drawAll();},220);
setInterval(refresh,950);
setInterval(()=>{if(S&&!busy&&document.visibilityState==='visible')loadLibrary().catch(()=>{});},15000);
(async()=>{
 try{await refresh();await loadLibrary();drawAll();}
 catch(e){status('Conexiune eșuată: '+e.message,false)}
})();
