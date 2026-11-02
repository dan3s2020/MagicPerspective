const $=id=>document.getElementById(id);let snapshot=null,auto=false,timer=null,poll=null,lastLoss=null;
const fmt=v=>v===undefined||v===null?'—':Number(v).toFixed(4);
async function api(route,body){const res=await fetch('/api/'+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error||res.statusText);return data;}
function status(message,bad=false){$('status').innerHTML=`<span class="dot" style="${bad?'background:#f89c9c;box-shadow:0 0 12px #f89c9c':''}"></span> ${message}`;}
async function execute(route,body){try{return await api(route,body);}catch(e){status(e.message,true);console.error(e);throw e;}}
function draw(canvasId,ep,omniscient){
 const canvas=$(canvasId),ctx=canvas.getContext('2d'),n=ep.n;
 const dpr=Math.max(1,window.devicePixelRatio||1),width=560;
 if(canvas.width!==Math.round(width*dpr)){canvas.width=Math.round(width*dpr);canvas.height=canvas.width;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,width);
 const margin=13,side=(width-margin*2)/n;ctx.fillStyle='#0e1422';ctx.fillRect(0,0,width,width);
 const pathSet=new Set(omniscient?ep.teacher:ep.route);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=y*n+x,v=omniscient?ep.teacherTruth[i]:ep.belief[i];
   const a=margin+x*side,b=margin+y*side,sz=side-1.7;
   ctx.fillStyle=v===1?'#42506a':v===0?'#253e47':'#182035';
   ctx.fillRect(a,b,sz,sz);
   if(!omniscient&&v!==1){
     const p=ep.prob[i];
     const alpha=.07+.57*Math.max(0,Math.min(1,p));
     ctx.fillStyle=`rgba(${Math.round(130+p*115)},${Math.round(94+p*65)},${Math.round(218-p*85)},${alpha})`;
     ctx.fillRect(a,b,sz,sz);
   }
   if(!omniscient&&v===-1){ctx.fillStyle='#8c9bb9';ctx.globalAlpha=.19;ctx.font=`${Math.max(8,side*.23)}px system-ui`;ctx.textAlign='center';ctx.fillText('?',a+sz/2,b+sz*.63);ctx.globalAlpha=1;}
 }
 const route=omniscient?ep.teacher:ep.route;
 if(route.length){ctx.beginPath();ctx.lineWidth=Math.max(2,side*.115);ctx.lineJoin='round';ctx.lineCap='round';
   ctx.strokeStyle=omniscient?'#68e7b6':'#ffc774';
   if(!omniscient)ctx.setLineDash([side*.35,side*.23]);
   for(let k=0;k<route.length;k++){const i=route[k],x=margin+(i%n+.48)*side,y=margin+(Math.floor(i/n)+.48)*side;
     if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }ctx.stroke();ctx.setLineDash([]);
 }
 function marker(i,color,letter){const x=margin+(i%n+.48)*side,y=margin+(Math.floor(i/n)+.48)*side,r=Math.max(5,side*.27);
   ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#101626';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#11182a';ctx.font=`800 ${Math.max(9,side*.35)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(letter,x,y+.4);
 }
 marker(ep.goal,'#65e8b8','G');marker(ep.position,'#78baff','S');
 if(!omniscient){const x=margin+(ep.position%n+.48)*side,y=margin+(Math.floor(ep.position/n)+.48)*side;
   ctx.strokeStyle='#b6d8ff';ctx.setLineDash([3,4]);ctx.lineWidth=1.5;ctx.strokeRect(x-side*1.5,y-side*1.5,side*3,side*3);ctx.setLineDash([]);
 }
}
function render(s){snapshot=s;const e=s.episode;
 draw('truth',e,true);draw('belief',e,false);
 $('trained').textContent=s.model.trainedEpisodes.toLocaleString();$('bce').textContent=fmt(e.metrics.bce);
 $('observed').textContent=e.belief.filter(x=>x!==-1).length+' / '+e.belief.length;
 $('steps').textContent=e.steps+' / '+e.collisions;
 $('progress').textContent=e.finished?'Goal reached ✓':e.steps===0?'Before first action · frozen prediction':`Attempt ${e.steps} · hypothesis revised`;
 const ev=s.evaluation;$('eval-neural').textContent=ev?fmt(ev.modelBCE):'Not tested';$('eval-baseline').textContent=ev?fmt(ev.baselineBCE):'Not tested';
 $('eval-verdict').textContent=ev?(ev.improved?'Neural model improves BCE':'Not better than baseline'):'Awaiting evidence';
 $('eval-verdict').style.color=ev?(ev.improved?'#78e5b6':'#ffba81'):'#cbd5e7';
 const t=s.training;if(t){$('trainbar').style.width=`${(t.done/t.total)*100}%`;lastLoss=t.loss;
  $('traintext').textContent=(t.running?'Training':'Training complete')+` · ${t.done} / ${t.total} episodes · last loss ${fmt(t.loss)}`;
 }else if(s.lastTraining){$('traintext').textContent=`Before: ${fmt(s.lastTraining.before.modelBCE)} → after: ${fmt(s.lastTraining.after?.modelBCE)} (unseen shapes)`;}
 $('train').disabled=!!t?.running;$('evaluate').disabled=!!t?.running;$('reset').disabled=!!t?.running;$('new').disabled=!!t?.running;
 $('step').disabled=!!t?.running||e.finished;$('run').disabled=!!t?.running||e.finished;
 const journal=$('journal');journal.replaceChildren();
 if(!e.history.length){const div=document.createElement('div');div.className='empty';div.textContent='No action has been taken. A shape prediction already exists.';journal.appendChild(div);}
 else for(const h of [...e.history].reverse()){const el=document.createElement('div');el.className='event '+h.event;
   const a=document.createElement('span');a.textContent=`#${h.step} ${h.event==='resistance'?'⛔ World resisted':h.event==='goal'?'✓ Goal reached':'→ Movement observed'}`;
   const b=document.createElement('small');b.textContent=`Shape p ${fmt(h.prediction)} · ${h.changed} new tiles`;el.append(a,b);journal.appendChild(el);}
}
async function refresh(){const s=await execute('state');render(s);if(s.training?.running){if(!poll)poll=setInterval(async()=>{try{const t=await api('state');render(t);if(!t.training?.running){clearInterval(poll);poll=null;status('Evaluation available');}}catch(e){clearInterval(poll);poll=null;status(e.message,true);}},500);}else if(poll){clearInterval(poll);poll=null;}}
$('new').onclick=async()=>{stopAuto();render(await execute('new',{n:Number($('size').value)}));};
$('step').onclick=async()=>{stopAuto();const result=await execute('step',{});render(result);};
function stopAuto(){auto=false;if(timer){clearInterval(timer);timer=null;}$('run').textContent='▶ Auto explore';}
$('run').onclick=()=>{if(auto){stopAuto();return;}auto=true;$('run').textContent='■ Pause';
 timer=setInterval(async()=>{if(!auto||!snapshot||snapshot.episode.finished){stopAuto();return;}try{const r=await api('step',{});render(r);if(r.episode.finished||r.action.event==='no-route')stopAuto();}catch(e){stopAuto();status(e.message,true);}},190);
};
$('train').onclick=async()=>{stopAuto();const r=await execute('train',{episodes:Number($('episodes').value)});status('Learning shape distributions…');await refresh();};
$('evaluate').onclick=async()=>{const s=await execute('evaluate',{});render(s);status('Held-out evaluation complete');};
$('reset').onclick=async()=>{if(!confirm('Erase learned neural parameters and reset to random initialization?'))return;stopAuto();render(await execute('reset-model',{}));status('Brain reset');};
$('belief').addEventListener('click',async event=>{if(!snapshot||snapshot.training?.running||snapshot.episode.finished)return;
 const r=$('belief').getBoundingClientRect(),x=(event.clientX-r.left)/r.width*560,y=(event.clientY-r.top)/r.height*560,n=snapshot.episode.n,side=534/n;
 const tx=Math.floor((x-13)/side),ty=Math.floor((y-13)/side);
 if(tx<0||ty<0||tx>=n||ty>=n)return;
 try{render(await execute('step',{next:ty*n+tx}));}catch(e){/* bounded input is intentional */}
});
window.addEventListener('resize',()=>{if(snapshot)render(snapshot);});
refresh().catch(e=>status(e.message,true));
