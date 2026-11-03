const $=id=>document.getElementById(id);let state=null,automatic=false,autoTimer=null,poller=null,busy=false;
async function api(name,data){const response=await fetch('/api/'+name,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const json=await response.json();if(!response.ok)throw Error(json.error||response.statusText);return json}
const fmt=(x,p=4)=>x===undefined||x===null?'—':Number(x).toFixed(p);
function draw(id,e,isTeacher){const canvas=$(id),ctx=canvas.getContext('2d'),N=e.n,width=560,dpr=Math.max(1,window.devicePixelRatio||1);
 if(canvas.width!==Math.round(width*dpr)){canvas.width=Math.round(width*dpr);canvas.height=canvas.width}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101625';ctx.fillRect(0,0,width,width);
 const margin=12,size=(width-margin*2)/N,truth=isTeacher?e.truth:e.belief.walls;
 for(let i=0;i<N*N;i++){
  const x=margin+i%N*size,y=margin+Math.floor(i/N)*size,w=size-1.5;
  ctx.fillStyle=truth[i]===1?'#5b6680':truth[i]===0?'#26413f':'#1a2540';ctx.fillRect(x,y,w,w);
  if(!isTeacher&&truth[i]!==1){let p=e.prob[i];ctx.fillStyle=`rgba(${Math.round(108+p*135)},${Math.round(96+p*57)},${Math.round(205-p*105)},${.09+.65*p})`;ctx.fillRect(x,y,w,w)}
  if(isTeacher&&truth[i]===0&&e.material[i]===2){ctx.fillStyle='rgba(237,170,103,.19)';ctx.fillRect(x,y,w,w)}
  if(!isTeacher&&truth[i]===-1){ctx.fillStyle='rgba(231,235,255,.15)';ctx.textAlign='center';ctx.font=`${Math.max(7,size*.23)}px system-ui`;ctx.fillText('?',x+w/2,y+w*.64)}
 }
 const route=isTeacher?e.teacher:e.route;if(route?.length){ctx.strokeStyle=isTeacher?'#68ecc1':'#ffc578';ctx.lineWidth=Math.max(2,size*.115);ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(isTeacher?[]:[size*.32,size*.2]);ctx.beginPath();
  route.forEach((i,j)=>{const x=margin+(i%N+.48)*size,y=margin+(Math.floor(i/N)+.48)*size;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();ctx.setLineDash([])}
 function mark(i,color,label){const x=margin+(i%N+.48)*size,y=margin+(Math.floor(i/N)+.48)*size,r=Math.max(5,size*.26);ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#101625';ctx.lineWidth=1.6;ctx.stroke();ctx.fillStyle='#101625';ctx.font=`800 ${Math.max(9,size*.3)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y)}
 mark(e.goal,'#75e5bc','G');mark(e.position,'#8bbdff','S');
 if(!isTeacher){const x=margin+(e.position%N-.52)*size,y=margin+(Math.floor(e.position/N)-.52)*size;
  ctx.strokeStyle='#ecf0ff';ctx.setLineDash([3,4]);ctx.strokeRect(x,y,size*3,size*3);ctx.setLineDash([])}
}
function graph(history){const c=$('training-chart'),dpr=Math.max(1,window.devicePixelRatio||1),width=500,height=190;
 c.width=width*dpr;c.height=height*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#0e1728';g.fillRect(0,0,width,height);
 if(!history?.length){g.fillStyle='#8c9db9';g.font='14px system-ui';g.fillText('Learning curve appears here after training begins',20,95);return}
 let max=Math.max(...history.map(x=>Math.max(x.heldoutBCE,x.baselineBCE)),.1),min=Math.max(0,Math.min(...history.map(x=>x.heldoutBCE,x.baselineBCE))-.05);if(max-min<.05)max=min+.05;
 function line(key,color){g.beginPath();g.strokeStyle=color;g.lineWidth=2.5;
  history.forEach((p,i)=>{const x=20+(i/Math.max(1,history.length-1))*(width-40),y=height-20-(p[key]-min)/(max-min)*(height-40);if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke()}
 line('heldoutBCE','#ae93f0');line('baselineBCE','#67dec0');g.font='12px system-ui';g.fillStyle='#ae93f0';g.fillText('neural',20,15);g.fillStyle='#67dec0';g.fillText('geometric',90,15);
}
function render(s){state=s;const e=s.episode;
 draw('truth',e,true);draw('belief',e,false);
 $('trained').textContent=s.model.episodes.toLocaleString();
 $('anchored-bce').textContent=fmt(e.anchoredMetrics?.bce);$('online-updates').textContent=s.model.neuralOnlineUpdates.toLocaleString();
 $('wall-samples').textContent=s.model.wallSamples.toLocaleString();$('neural-shift').textContent=fmt(e.history.at(-1)?.neuralCorrection,6);$('initial-bce').textContent=fmt(e.initial.bce);$('current-bce').textContent=fmt(e.metrics.bce);
 $('effort').textContent=fmt(e.effort,1)+' / '+e.resistance;
 $('causal-samples').textContent=s.model.causalSamples.toLocaleString();$('causal-error').textContent=fmt(s.model.averageCausalError);
 $('causal-weights').textContent=[0,1,2].map(i=>{const w=s.model.causalWeights;return fmt(w[0]+(i===1?w[1]:i===2?w[2]:0),2)}).join(' / ');
 $('action-status').textContent=e.finished?'Goal reached ✓':e.steps===0?'Initial prediction frozen before action':`Step ${e.steps} • actual effort ${fmt(e.effort,2)} • hypothesis updated`;
 $('step').disabled=s.task?.running||e.finished;$('new').disabled=s.task?.running;$('evaluate').disabled=s.task?.running;$('evaluate-control').disabled=s.task?.running;$('auto').disabled=s.task?.running||e.finished;$('train').disabled=s.task?.running;
 $('cancel').disabled=!s.task?.running;
 const t=s.task;if(t){$('train-status').textContent=`${t.running?'Training':'Training finished'} · ${t.done}/${t.total} episodes · latest loss ${fmt(t.loss)}${t.error?' · ERROR '+t.error:''}`;
  $('progress-bar').style.width=((t.done/t.total)*100)+'%';graph(t.history);}
 const v=s.evalResult;if(v){$('model-bce').textContent=fmt(v.neuralBCE);$('baseline-bce').textContent=fmt(v.geometricBCE);
  $('model-iou').textContent=fmt(v.neuralIoU);$('baseline-iou').textContent=fmt(v.geometricIoU);
  const shape=v.navigation?.shape,geo=v.navigation?.geometric;
  $('online-vs-frozen').textContent=shape&&v.navigation?.frozenShape?`Online ${fmt(shape.averageCost,1)} / Frozen ${fmt(v.navigation.frozenShape.averageCost,1)} effort`:'Not tested';
  $('navigation').textContent=shape&&geo?`${Math.round(shape.success*100)}% vs ${Math.round(geo.success*100)}% success · cost ${fmt(shape.averageCost,1)} vs ${fmt(geo.averageCost,1)}`:'Not tested';
  $('verdict').textContent=v.improved?'Lower neural BCE; navigation must be checked separately':'No improvement over geometric BCE';
  $('verdict').style.color=v.improved?'#75e5bc':'#ffb0a5';}
 const journal=$('journal');journal.replaceChildren();if(!e.history.length){const item=document.createElement('p');item.className='muted';item.textContent='Prediction exists; no movement yet.';journal.appendChild(item)}
 for(const ev of [...e.history].reverse()){const div=document.createElement('div');div.className='event '+ev.type;
 const label=document.createElement('span');label.textContent=`#${ev.step} ${ev.type==='goal'?'✓ Goal':ev.type==='blocked'?'⛔ Blocked':'→ Moved'}`;
 const detail=document.createElement('small');detail.textContent=`expected ${fmt(ev.expected,2)} · actual ${fmt(ev.actual,2)} · mismatch ${fmt(ev.worldMismatch,2)} · +${ev.newCells} cells · neural Δ ${fmt(ev.neuralCorrection,6)}`;
 div.append(label,detail);journal.appendChild(div);}
}
function stopAuto(){automatic=false;if(autoTimer){clearInterval(autoTimer);autoTimer=null}$('auto').textContent='▶ Auto explore'}
async function guard(fn){if(busy)return;busy=true;try{await fn()}catch(e){$('connection').textContent='Error: '+e.message;console.error(e)}finally{busy=false}}
async function refresh(){const s=await api('state');render(s);$('connection').textContent='● Local engine online';return s}
$('new').onclick=()=>guard(async()=>{stopAuto();render(await api('new',{n:Number($('size').value),family:$('family').value,online:$('online').value==='true'}))});
$('step').onclick=()=>guard(async()=>{stopAuto();render(await api('step',{}))});
$('auto').onclick=()=>{if(automatic){stopAuto();return}automatic=true;$('auto').textContent='■ Pause';autoTimer=setInterval(()=>guard(async()=>{
 const r=await api('step',{});render(r);if(r.episode.finished||r.action.event==='no-route')stopAuto();}),150)};
$('train').onclick=()=>guard(async()=>{stopAuto();await api('train',{episodes:Number($('episodes').value),n:Number($('size').value)});await refresh()});
$('cancel').onclick=()=>guard(async()=>{await api('cancel',{});$('train-status').textContent+=' · Stop requested'});
async function runBlindEvaluation(){
 if(state?.task?.running)return;
 await guard(async()=>{
  const mainButton=$('evaluate'),cardButton=$('evaluate-control'),note=$('evaluation-status');
  mainButton.disabled=true;cardButton.disabled=true;
  note.textContent='Running blind evaluation on 36 unseen worlds. The phone may take a while to calculate the comparison…';
  $('verdict').textContent='Evaluation running…';
  try{
   // Ensure the status becomes visible before the evaluation request begins.
   await new Promise(resolve=>requestAnimationFrame(resolve));
   const r=await api('evaluate',{n:Number($('size').value),count:36});
   render(r);
   note.textContent='Blind evaluation complete. The results below compare the active brain with the controls.';
  }catch(e){
   note.textContent='Blind evaluation failed: '+e.message;
   throw e;
  }finally{
   mainButton.disabled=!!state?.task?.running;
   cardButton.disabled=!!state?.task?.running;
  }
 });
}
$('evaluate').onclick=runBlindEvaluation;
$('evaluate-control').onclick=runBlindEvaluation;
$('reset').onclick=()=>guard(async()=>{if(confirm('Reset learned model and permanently remove saved V2 checkpoint?')){stopAuto();render(await api('reset',{}))}});
$('belief').addEventListener('click',event=>guard(async()=>{if(!state||state.task?.running||state.episode.finished)return;
 const canvas=$('belief'),rect=canvas.getBoundingClientRect(),X=(event.clientX-rect.left)/rect.width*560,Y=(event.clientY-rect.top)/rect.height*560,n=state.episode.n,side=536/n;
 const x=Math.floor((X-12)/side),y=Math.floor((Y-12)/side);if(x<0||x>=n||y<0||y>=n)return;
 const r=await api('step',{next:y*n+x});render(r)}));
window.addEventListener('resize',()=>{if(state)render(state)});
refresh().catch(e=>{$('connection').textContent='Connection failed: '+e.message});
poller=setInterval(()=>{if(state?.task?.running&&!busy)refresh().catch(console.error)},600);
