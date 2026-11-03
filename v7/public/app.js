import {drawTerrain,drawCurve} from './draw.js';
const $=id=>document.getElementById(id);
let S=null,busy=false,auto=null,play=null,view='imag',idx=0,follow=true,tab='relief';
let previewIndex=0,lastPreviewId=null;
const cache={key:null,first:{}};const frames={organ:null,classic:null};
const pct=x=>x==null?'—':Math.round(x*100)+'%',times=x=>x==null?'—':x.toFixed(2).replace('.',',')+'×';
async function api(p,b){const r=await fetch('/api/'+p,{method:b===undefined?'GET':'POST',headers:b===undefined?{}:{'Content-Type':'application/json'},body:b===undefined?undefined:JSON.stringify(b)});
  const v=await r.json();if(!r.ok)throw Error(v.error||'Eroare '+r.status);return v;}
async function guard(fn){if(busy)return;busy=true;try{await fn();}catch(e){$('health').textContent=e.message;}finally{busy=false;}}
const lastIndex=()=>Math.max(S.organ.frames.length,S.classic.frames.length)-1;
async function loadFrames(){const key=S.cfg.seed+'|'+S.cfg.kind+'|'+S.cfg.size;
  if(cache.key!==key){cache.key=key;cache.first.organ=(await api('frame?side=organ&i=0')).route;cache.first.classic=(await api('frame?side=classic&i=0')).route;}
  [frames.organ,frames.classic]=await Promise.all([api('frame?side=organ&i='+idx),api('frame?side=classic&i='+idx)]);draw();}
function draw(){if(!S)return;
  const live=S.task?.running?S.task.preview:null;
  if(live?.organFrames?.length){
    if(lastPreviewId!==live.id){lastPreviewId=live.id;previewIndex=0;}
    const i=previewIndex%live.organFrames.length;
    const j=Math.min(previewIndex,live.classicFrames.length-1);
    drawTerrain($('map-organ'),live.world,live.organFrames[i],{view,first:live.organFrames[0].route});
    drawTerrain($('map-classic'),live.world,live.classicFrames[j],{view,classic:true,first:live.classicFrames[0].route});
    $('scrub-out').textContent='antrenament · pas '+live.organFrames[i].step;
    $('hint').textContent='REPLAY episod real: '+(live.kind==='maze'?'Labirint':'Relief')+
      ' · observații, trasee și corecții, nu o animație inventată.';
    return;
  }
  if(!frames.organ)return;
  drawTerrain($('map-organ'),S.world,frames.organ,{view,first:cache.first.organ});
  drawTerrain($('map-classic'),S.world,frames.classic,{view,classic:true,first:cache.first.classic});
  $('scrub-out').textContent='pasul '+idx;
  $('hint').textContent=view==='imag'?'Sub ceața hașurată: harta pe care și-o imaginează fiecare. Fără organ, necunoscutul e doar media a ce a văzut.':'Sub ceața hașurată: terenul real, văzut de tine de sus. Niciun organism nu-l vede.';}
function nums(){const o=S.organ.summary,c=S.classic.summary;
  const set=(id,txt,win)=>{$(id).textContent=txt;$(id).classList.toggle('win',!!win);};
  set('o-match',pct(o.match0),o.match0>c.match0);set('c-match',pct(c.match0),c.match0>o.match0);
  set('o-surp',String(o.surprises),o.surprises<c.surprises);set('c-surp',String(c.surprises),c.surprises<o.surprises);
  const both=o.ratio!=null&&c.ratio!=null;
  set('o-cost',o.ratio!=null?times(o.ratio):'…',both&&o.ratio<c.ratio);set('c-cost',c.ratio!=null?times(c.ratio):'…',both&&c.ratio<o.ratio);}
function render(s){S=s;const run=!!s.task?.running,done=s.organ.finished&&s.classic.finished;
  $('kind').value=s.cfg.kind;$('size').value=String(s.cfg.size);$('left').value=s.cfg.left;$('left').querySelector('[value=v6]').disabled=!s.v6;
  $('left-title').textContent=s.cfg.left==='v6'?'Creierul tău V6':'Creierul V7';$('left-sub').textContent=s.cfg.left==='v6'?`${s.v6.episodes} terenuri trăite, un singur organ pentru toate lumile`:'își imaginează harta din orizont, cu specialiști pe tipuri de lumi';
  $('scrub').max=lastIndex();if(follow){idx=lastIndex();$('scrub').value=idx;}
  nums();
  for(const id of ['new','step','auto','run','evaluate','train','reset','kind','size','left'])$(id).disabled=run||((id==='step'||id==='run'||id==='auto')&&done);
  $('cancel').disabled=!run;
  $('health').textContent=run?(s.task.unlimited?'∞ antrenează · '+s.task.done+' episoade':'antrenează '+s.task.done+'/'+s.task.total):'creier: '+s.brain.episodes+' terenuri trăite';
  if(s.task){$('progress').style.width=s.task.unlimited?'100%':100*s.task.done/s.task.total+'%';
    $('progress').classList.toggle('unlimited',!!s.task.unlimited&&run);
    $('train-status').textContent=run?(s.task.unlimited?'∞ Episoade reale: '+s.task.done+' · '+(s.task.preview?.kind||'pregătire')+' · '+(s.task.selected||'învățare în curs'):'A trăit '+s.task.done+' din '+s.task.total+' terenuri.'):s.task.error?'Eroare: '+s.task.error:`Gata: ${s.task.done} terenuri. ${s.task.selected||''}`;drawCurve($('curve'),s.task.history);}
  else drawCurve($('curve'),[]);
  bars();}
function bars(){const t=S.test,box=$('bars');box.replaceChildren();
  if(!t){$('verdict').textContent='Niciun test încă. Antrenează, apoi rulează testul.';return;}
  const k=t.kinds[tab];if(!k){$('verdict').textContent='Testul nu conține acest tip de teren.';return;}
  const o=k.organ,c=k.classic;
  $('verdict').textContent=tab==='relief'
    ?`Pe ${o.worlds} terenuri noi cu relief, creierul V7 ghicește ${pct(o.match0)} din drum înainte de primul pas (fără organ: ${pct(c.match0)}), are ${o.surprises.toFixed(1).replace('.',',')} surprize în loc de ${c.surprises.toFixed(1).replace('.',',')} și plătește ${times(o.ratio)} față de minim (fără organ ${times(c.ratio)}).`
    :`În labirint orizontul nu dă indicii: organul ghicește ${pct(o.match0)} față de ${pct(c.match0)} și plătește ${times(o.ratio)} față de ${times(c.ratio)}. Aici nu are ce învăța.`;
  const rows=[['organ','Creierul V7','#c2185b'],...(k['v6-brain']?[['v6-brain','Creierul tău V6','#1f3a93']]:[]),['organ-untrained','Organ neantrenat','#d98aa8'],['classic','Fără organ','#7c8a99']];
  const metrics=[['match0','Drum ghicit la pasul 0','cât din drumul real e în linia ghicită înainte de mișcare · mai mult e mai bine',pct,v=>v],
    ['surprises','Surprize pe drum','de câte ori lumea a arătat altceva decât își imaginase pe drumul ales · mai puțin e mai bine',v=>v.toFixed(1).replace('.',','),v=>v],
    ['ratio','Cost plătit față de minim','1,00× ar fi drumul perfect · mai puțin e mai bine',times,v=>v-1]];
  for(const [key,title,desc,fmt,scale] of metrics){const m=document.createElement('div');m.className='metric';
    const h=document.createElement('h4');h.textContent=title;const p=document.createElement('p');p.textContent=desc;m.append(h,p);
    const max=Math.max(...rows.map(([r])=>scale(k[r]?.[key]??0)),1e-6);
    for(const [r,name,color] of rows){const v=k[r]?.[key];const row=document.createElement('div');row.className='brow';
      const nm=document.createElement('span');nm.textContent=name;const tr=document.createElement('div');tr.className='track';const fl=document.createElement('div');fl.className='fill';
      fl.style.width=(v==null?0:100*scale(v)/max)+'%';fl.style.background=color;tr.append(fl);const b=document.createElement('b');b.textContent=v==null?'—':fmt(v);row.append(nm,tr,b);m.append(row);}
    box.append(m);}}
async function refresh(){render(await api('state'));await loadFrames();}
async function apply(s){follow=true;render(s);await loadFrames();}
function stopAuto(){clearInterval(auto);auto=null;$('auto').textContent='Pornește';}
function stopPlay(){clearInterval(play);play=null;$('play').textContent='▶';}
$('new').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('new',{kind:$('kind').value,size:Number($('size').value),left:$('left').value}));});
$('left').onchange=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('new',{left:$('left').value,same:true}));});
$('kind').onchange=$('size').onchange=()=>$('new').click();
$('step').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('step',{}));});
$('run').onclick=()=>guard(async()=>{stopAuto();stopPlay();await apply(await api('run',{}));});
$('auto').onclick=()=>{if(auto){stopAuto();return;}stopPlay();$('auto').textContent='Pauză';
  auto=setInterval(()=>{if(busy)return;guard(async()=>{const s=await api('step',{});await apply(s);if(s.organ.finished&&s.classic.finished)stopAuto();});},300);};
$('scrub').oninput=()=>{stopPlay();idx=Number($('scrub').value);follow=idx===lastIndex();guard(loadFrames);};
$('play').onclick=()=>{if(play){stopPlay();return;}stopAuto();follow=false;idx=0;$('play').textContent='❚❚';
  play=setInterval(()=>{if(busy)return;$('scrub').value=idx;guard(loadFrames);idx++;if(idx>lastIndex()){stopPlay();follow=true;}},320);};
for(const [id,v] of [['v-imag','imag'],['v-real','real']])$(id).onclick=()=>{view=v;for(const b of ['v-imag','v-real']){$(b).classList.toggle('on',b===id);$(b).setAttribute('aria-pressed',String(b===id));}draw();};
for(const [id,v] of [['t-relief','relief'],['t-maze','maze']])$(id).onclick=()=>{tab=v;for(const b of ['t-relief','t-maze']){$(b).classList.toggle('on',b===id);$(b).setAttribute('aria-pressed',String(b===id));}bars();};
$('train').onclick=()=>guard(async()=>{stopAuto();stopPlay();await api('train',{episodes:Number($('episodes').value),size:Number($('size').value)});render(await api('state'));draw();});
$('cancel').onclick=()=>guard(async()=>{await api('cancel',{});});
$('evaluate').onclick=()=>guard(async()=>{stopAuto();$('verdict').textContent='Rulez 40 de terenuri noi pentru fiecare organism…';await new Promise(r=>setTimeout(r,30));render(await api('evaluate',{count:40,size:Number($('size').value)}));dispatchEvent(new Event('brain-changed'));});
$('reset').onclick=()=>guard(async()=>{if(!confirm('Ștergi doar creierul V6? Versiunile anterioare rămân.'))return;await apply(await api('reset',{}));dispatchEvent(new Event('brain-changed'));});
let wasRunning=false;
setInterval(()=>{if(!S||busy)return;const r=!!S.task?.running;if(r||wasRunning)guard(async()=>{const s=await api('state');wasRunning=!!s.task?.running;if(!wasRunning&&r){lastPreviewId=null;await apply(s);dispatchEvent(new Event('brain-changed'));}else{render(s);if(r)draw();}});},900);
addEventListener('resize',()=>{draw();if(S?.task)drawCurve($('curve'),S.task.history);});
refresh().catch(e=>{$('health').textContent='Nu găsesc serverul: '+e.message;});

// Replays the most recently completed real training episode on the original two map canvases.
setInterval(()=>{if(!S?.task?.running||!S.task.preview||busy)return;previewIndex++;draw();},185);
