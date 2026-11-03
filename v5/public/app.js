import {drawMap,drawChart} from './render.js';
const $=id=>document.getElementById(id);
let state=null,frame=null,frameIndex=0,follow=true,busy=false,autoTimer=null,playTimer=null;
const layers={cloud:true,initial:true,route:true,optimal:true,walked:true,truth:false};
const fmt=(x,d=3)=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(d);
const pct=x=>x===null||x===undefined?'—':Math.round(100*x)+'%';
const NAMES={'organ-online':'Organ antrenat · online','organ-frozen':'Organ antrenat · înghețat','organ-untrained':'Organ neantrenat','classic':'Fără organ · clasic'};
const KIND={maze:'LABIRINT 2D',braided:'LABIRINT CU BUCLE',graph:'REȚEA ABSTRACTĂ'};
async function api(name,body){const r=await fetch('/api/'+name,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const v=await r.json();if(!r.ok)throw Error(v.error||'HTTP '+r.status);return v;}
async function guard(fn){if(busy)return;busy=true;try{await fn();}catch(e){$('status').textContent='EROARE: '+e.message;console.error(e);}finally{busy=false;}}
function drawFrame(){if(!state||!frame)return;const e=state.episode;
  drawMap($('map'),e.spec,frame,layers,{initial:e.initial.route,evaluator:e.evaluator});
  const last=e.frames.length-1;$('scrub-label').textContent=`pas ${frameIndex} / ${last}`;
  $('f1-t').textContent=fmt(frame.f1,3);
  const seen=e.spec.kind==='graph'?'nodul curent și vecinii lui':'fereastra 3×3';
  $('frame-note').textContent=frameIndex===last?`Organismul vede doar ${seen} parcurse. „Traseul real” și „Harta reală” sunt doar pentru tine (evaluator) — nu intră în organism.`
    :`Vezi pasul ${frameIndex}: ce credea organismul atunci și traseul real din acel punct. Linia punctată rămâne predicția de la pasul 0.`;
  drawChart($('steps-chart'),[{values:e.frames.map(f=>f.f1),color:'#ffc078'},{values:e.frames.map(f=>f.bce),color:'rgba(255,170,70,.9)',dash:[5,4],max:Math.max(.8,...e.frames.map(f=>f.bce))}],
    {marks:e.frames.map((f,i)=>f.contradicted?i:-1).filter(i=>i>=0),cursor:frameIndex,xLabel:'pași →'});}
async function loadFrame(i){const e=state.episode;frameIndex=Math.max(0,Math.min(i,e.frames.length-1));$('scrub').value=frameIndex;frame=await api('frame?i='+frameIndex);drawFrame();}
function render(s){state=s;const e=s.episode,run=!!s.task?.running;
  $('kind').value=s.world.kind;$('size').value=String(s.world.size);$('mode').value=s.world.mode;$('world-tag').textContent=KIND[e.spec.kind];
  $('scrub').max=e.frames.length-1;
  const sum=e.summary,classic=s.testResult?.modes?.classic;
  const f0=$('f1-0');f0.textContent=fmt(e.initial.f1,3);$('bce-0').textContent=fmt(e.initial.bce,3);$('ece').textContent=fmt(e.initial.ece,3);
  $('resist').textContent=String(sum.resistance);$('effort').textContent=e.finished?`${fmt(e.effort,0)} / ${fmt(e.evaluator.optimalCost,0)}`:`${fmt(e.effort,0)} / …`;
  const j=$('journal');j.replaceChildren();
  if(!e.journal.length){const p=document.createElement('p');p.className='muted small';p.textContent='Pasul 0: forma întregii soluții e prezisă înainte de orice mișcare. Apasă „Un pas”.';j.append(p);}
  for(const ev of e.journal.slice().reverse()){const d=document.createElement('div');d.className='entry '+(ev.contradicted?'resist':ev.type==='goal'?'goal':'');
    const b=document.createElement('b');b.textContent=`#${ev.step} `+(ev.type==='goal'?'✓ Țintă atinsă':ev.contradicted?`⛔ Lumea a contrazis ${ev.contradicted} relați${ev.contradicted>1?'i':'e'} din formă`:'→ Mișcare');
    const t=document.createElement('div');t.textContent=`+${ev.revealed} relații văzute · surpriză ${ev.surprise===null?'—':fmt(ev.surprise,2)}${ev.learned?' · corectat online':''} · F1 nou ${fmt(ev.f1,2)}`;d.append(b,t);j.append(d);}
  for(const id of ['new','replay','step','auto','run','evaluate','train','reset','kind','size','mode'])$(id).disabled=run||((id==='step'||id==='auto'||id==='run')&&e.finished);
  $('cancel').disabled=!run;
  $('status').textContent=run?`Antrenare ${s.task.done}/${s.task.total}…`:e.finished?`✓ Țintă atinsă în ${e.steps} pași · efort ${fmt(e.effort,0)} (optim ${fmt(e.evaluator.optimalCost,0)}) · ${NAMES[s.world.mode]}`:`Pas ${e.steps} · ${NAMES[s.world.mode]} · ${e.route.edges.length} relații în forma prezisă`;
  $('health').textContent=`● local · creier cu ${s.model.episodes} episoade`;
  if(s.task){$('progress').style.width=100*s.task.done/Math.max(1,s.task.total)+'%';
    $('train-status').textContent=(run?'Antrenare':'Antrenare încheiată')+` · ${s.task.done}/${s.task.total} episoade`+(s.task.selected?' · '+s.task.selected:'')+(s.task.error?' · EROARE '+s.task.error:'');
    const h=s.task.history||[];drawChart($('train-chart'),[{values:h.map(x=>x.f1_0),color:'#ffc078'},{values:h.map(x=>x.classic.f1_0),color:'#ffc078',dash:[5,4]},{values:h.map(x=>x.meanF1),color:'rgba(255,170,70,.9)'},{values:h.map(x=>x.classic.meanF1),color:'rgba(255,170,70,.9)',dash:[2,4]}],{labels:['Curba apare în timpul antrenării'],xLabel:'episoade →'});}
  else drawChart($('train-chart'),[],{labels:['Curba de validare apare în timpul antrenării'],xLabel:'episoade →'});
  renderTest(s.testResult);
  if(follow)frameIndex=e.frames.length-1;}
function renderTest(t){const body=$('test-body'),fam=$('family-body');body.replaceChildren();fam.replaceChildren();if(!t){$('test-status').textContent='Încă niciun test orb. Patru organisme pe exact aceleași lumi nevăzute, aceeași fereastră 3×3, fără profesor.';return;}
  const cols=[['success',pct,1],['f1_0',x=>fmt(x,3),1],['bce_0',x=>fmt(x,3),-1],['valid_0',pct,1],['meanF1',x=>fmt(x,3),1],['ece_0',x=>fmt(x,3),-1],['efficiency',x=>fmt(x,3),1],['resistance',x=>fmt(x,1),-1]];
  const best=Object.fromEntries(cols.map(([k,,dir])=>[k,dir>0?Math.max(...Object.values(t.modes).map(m=>m[k]??-1)):Math.min(...Object.values(t.modes).map(m=>m[k]??9))]));
  for(const [mode,m] of Object.entries(t.modes)){const tr=document.createElement('tr');if(mode.startsWith('organ-')&&mode!=='organ-untrained')tr.className='organ';
    const n=document.createElement('td');n.textContent=NAMES[mode];tr.append(n);
    for(const [k,f] of cols){const td=document.createElement('td');td.textContent=f(m[k]);if(m[k]===best[k])td.className='best';tr.append(td);}body.append(tr);}
  for(const mode of Object.keys(t.modes)){const tr=document.createElement('tr'),n=document.createElement('td');n.textContent=NAMES[mode];tr.append(n);
    for(const f of ['maze','braided','graph']){const td=document.createElement('td');td.textContent=fmt(t.families?.[f]?.[mode]?.f1_0,3);tr.append(td);}fam.append(tr);}
  const o=t.modes['organ-frozen'],c=t.modes.classic;
  const verdict=[o.f1_0>c.f1_0?'formă la pasul 0 mai bună':'formă la pasul 0 NU mai bună',o.bce_0<c.bce_0?'nor mai precis':'nor NU mai precis',o.meanF1>c.meanF1?'corecție pe parcurs mai bună':'corecție pe parcurs NU mai bună',(o.efficiency??0)>=(c.efficiency??0)?'navigare cel puțin la fel de eficientă':'navigare mai puțin eficientă'];
  $('test-status').textContent=`${t.count} lumi nevăzute ${t.size}×${t.size} (sămânța ${t.seed}). Organ antrenat vs. fără organ: ${verdict.join(' · ')}. Verde = cel mai bun pe coloană.`;}
async function refresh(){const s=await api('state');render(s);await loadFrame(follow?s.episode.frames.length-1:frameIndex);}
async function apply(s){render(s);follow=true;await loadFrame(s.episode.frames.length-1);}
function stopAuto(){if(autoTimer){clearInterval(autoTimer);autoTimer=null;}$('auto').textContent='▶ Automat';}
function stopPlay(){if(playTimer){clearInterval(playTimer);playTimer=null;}$('play').textContent='▶';}
const worldInput=()=>({kind:$('kind').value,size:Number($('size').value),mode:$('mode').value});
$('new').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('new',worldInput()));});
$('replay').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('replay',{mode:$('mode').value}));});
$('mode').onchange=()=>$('replay').click();
$('kind').onchange=$('size').onchange=()=>$('new').click();
$('step').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('step',{}));});
$('run').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('run',{}));});
$('auto').onclick=()=>{if(autoTimer){stopAuto();return;}stopPlay();$('auto').textContent='■ Pauză';
  autoTimer=setInterval(()=>{if(busy)return;guard(async()=>{const s=await api('step',{});await apply(s);if(s.episode.finished)stopAuto();}).catch(stopAuto);},280);};
$('scrub').oninput=()=>{stopPlay();follow=Number($('scrub').value)===state.episode.frames.length-1;guard(()=>loadFrame(Number($('scrub').value)));};
$('play').onclick=()=>{if(playTimer){stopPlay();return;}stopAuto();follow=false;$('play').textContent='❚❚';let i=frameIndex>=state.episode.frames.length-1?0:frameIndex;
  playTimer=setInterval(()=>{if(busy)return;guard(()=>loadFrame(i));i++;if(i>state.episode.frames.length-1){stopPlay();follow=true;}},350);};
for(const chip of document.querySelectorAll('.chip'))chip.onclick=()=>{const k=chip.dataset.layer;layers[k]=!layers[k];chip.classList.toggle('on',layers[k]);chip.setAttribute('aria-pressed',String(layers[k]));drawFrame();};
$('train').onclick=()=>guard(async()=>{stopAuto();stopPlay();await api('train',{episodes:Number($('episodes').value),size:Number($('size').value)});await refresh();});
$('cancel').onclick=()=>guard(async()=>{await api('cancel',{});$('train-status').textContent='Oprire cerută. Creierul curent rămâne salvat.';});
$('evaluate').onclick=()=>guard(async()=>{stopAuto();$('test-status').textContent='Rulez testul orb pe 30 de lumi nevăzute…';await new Promise(r=>requestAnimationFrame(r));render(await api('evaluate',{count:30,size:Number($('size').value)}));});
$('reset').onclick=()=>guard(async()=>{if(!confirm('Resetez DOAR creierul V5? V1–V4 nu sunt atinse.'))return;stopAuto();await apply(await api('reset',{}));});
window.addEventListener('resize',()=>{if(state){drawFrame();render(state);}});
setInterval(()=>{if(state?.task?.running&&!busy)guard(refresh);},800);
refresh().catch(e=>{$('health').textContent='Conexiune eșuată: '+e.message;});
