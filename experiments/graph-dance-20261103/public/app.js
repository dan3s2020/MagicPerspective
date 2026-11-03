const $=id=>document.getElementById(id);
let state=null,auto=null,busy=false,replayIndex=-1,selectedNode=0,lastPaint=0,lastTrainingPreview=null;
const fmt=(x,d=3)=>Number.isFinite(x)?Number(x).toFixed(d):'—';
async function get(){const r=await fetch('/api/state',{cache:'no-store'}),body=await r.json();if(!r.ok)throw Error(body.error||r.status);return body;}
async function post(endpoint,data={}){const r=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),result=await r.json();if(!r.ok)throw Error(result.error||r.status);return result;}
async function guard(action){if(busy)return;busy=true;try{await action();}catch(e){$('status').textContent='Eroare: '+e.message;console.error(e);}finally{busy=false;}}
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;
function setup(canvas){const side=620,dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(side*dpr);
 if(canvas.width!==w||canvas.height!==w){canvas.width=w;canvas.height=w;}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,side,side);ctx.fillStyle='#0e172a';ctx.fillRect(0,0,side,side);return {ctx,side};}
function loc(info,id,side=620,t=0,phase=0,animate=false){const p=info.positions[id],stretch=side*.87,pad=side*.065;
 const wiggle=animate?Math.sin(t*.0018+phase)*2.5:0;
 return {x:pad+p.x*stretch+wiggle,y:pad+p.y*stretch+Math.cos(t*.0015+phase)* (animate?2.5:0)};
}
function curve(ctx,pts,style='#ffc27b',width=4,dash=[]){if(!pts||pts.length<2)return;
 ctx.strokeStyle=style;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);}
function drawWorld(canvas,ep,frame,truth,time){const {ctx,side}=setup(canvas),info=ep.info,
 phase=frame.phase||ep.phase,positions=id=>loc(info,id,side,time,phase[id]||0,!truth),known=new Map(frame.known||ep.known);
 // Only the evaluator pane reads hidden edge truth.
 if(truth){for(const e of ep.evaluator.edges){const a=positions(e.a),b=positions(e.b);
  curve(ctx,[a,b],e.open?'rgba(91,203,166,.35)':'rgba(190,104,129,.19)',e.open?2.4:1,e.open?[]:[2,6]);}
  curve(ctx,ep.evaluator.oracle.map(positions),'#72e5a2',6);
 }else{
  if(replayIndex<0||replayIndex===ep.history.length-1)for(const e of ep.hypotheses){
   curve(ctx,[positions(e.a),positions(e.b)],`rgba(185,139,242,${Math.min(.45,e.p*.45)})`,.8,[2,5]);}
  for(const [k,v] of known){const [a,b]=k.split(':').map(Number);
   if(v===-2)continue;curve(ctx,[positions(a),positions(b)],v===1?'rgba(99,232,197,.48)':'rgba(231,117,141,.37)',v===1?2.5:1.5,v===1?[]:[4,5]);}
  curve(ctx,ep.initial.nodes.map(positions),'rgba(183,145,242,.43)',2,[6,7]);
  curve(ctx,(frame.route||ep.current.nodes).map(positions),'#ffc078',4,[9,6]);
  curve(ctx,(frame.walked||[]).map(positions),'rgba(115,187,255,.75)',3);
 }
 for(let i=0;i<info.n;i++){
  const p=positions(i),angle=phase[i]||0;
  const radius=truth?5.6:(frame.walked?.includes(i)?7.5:6.4);
  if(!truth){ctx.beginPath();ctx.arc(p.x,p.y,12+2*Math.sin(time*.005+angle),angle,angle+Math.PI*1.7);
   ctx.strokeStyle=`hsla(${Math.round((angle+Math.PI)*180/Math.PI)%360},78%,72%,.68)`;ctx.lineWidth=2;ctx.stroke();}
  ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
  ctx.fillStyle=truth?'#869ab6':known.size&&frame.walked?.includes(i)?'#87c5ff':`hsl(${Math.round((angle+Math.PI)*180/Math.PI)%360} 70% 72%)`;
  ctx.fill();if(i===selectedNode){ctx.beginPath();ctx.arc(p.x,p.y,17,0,Math.PI*2);ctx.strokeStyle='#f9f3fd';ctx.lineWidth=1.8;ctx.stroke();}
  if(i===info.start||i===info.goal){ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fillStyle=i===info.start?'#90c5ff':'#71eac0';ctx.fill();ctx.fillStyle='#102032';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 11px system-ui';ctx.fillText(i===info.start?'S':'G',p.x,p.y);}
 }
 ctx.fillStyle='#b6c1d9';ctx.font='800 12px system-ui';ctx.fillText(truth?'REAL NETWORK · EVALUATOR':'BELIEF + SYNCHRONIZED NODES',17,17);
}
function drawTimeline(ep){const canvas=$('timeline'),ctx=canvas.getContext('2d'),width=770,height=260,dpr=Math.min(2,window.devicePixelRatio||1);
 if(canvas.width!==width*dpr||canvas.height!==height*dpr){canvas.width=width*dpr;canvas.height=height*dpr;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0e172a';ctx.fillRect(0,0,width,height);
 ctx.strokeStyle='#41506f';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,24);ctx.lineTo(48,height-28);ctx.lineTo(width-22,height-28);ctx.stroke();
 const frames=ep.history;if(!frames.length)return;
 const coords=(key)=>frames.map((f,i)=>({x:48+(width-72)*(frames.length===1?0:i/(frames.length-1)),y:height-28-(height-60)*Math.max(0,Math.min(1,(f[key]+(key==='localCoherence'?1:0))/(key==='localCoherence'?2:1)))}));
 curve(ctx,coords('localCoherence'),'#68e2c5',3);curve(ctx,coords('f1'),'#b596f2',3);
 ctx.font='12px system-ui';ctx.fillStyle='#68e2c5';ctx.fillText('Coerența locală',60,21);ctx.fillStyle='#b596f2';ctx.fillText('Forma F1',230,21);
 const i=replayIndex<0?frames.length-1:Math.min(replayIndex,frames.length-1),x=48+(width-72)*(frames.length===1?0:i/(frames.length-1));
 ctx.strokeStyle='#ffc078';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(x,30);ctx.lineTo(x,height-28);ctx.stroke();ctx.setLineDash([]);
}
function selectedFrame(ep){return ep.history[Math.max(0,replayIndex<0?ep.history.length-1:Math.min(replayIndex,ep.history.length-1))];}
function showNode(ep,frame){const i=Math.min(selectedNode,ep.info.n-1),status=new Map(frame.known),links=[];
 for(let j=0;j<ep.info.n;j++)if(j!==i){const st=status.get(key(i,j));if(st===undefined)continue;if(st===-2)continue;
  links.push(j+' '+(st===1?'✓ validă':'✕ blocată'));}
 $('node-details').innerHTML=`<b>Nod ${i}</b> · Fază ${fmt(frame.phase[i],2)} rad · Semnal ${fmt(frame.signal[i],2)}<div>Legături confirmate: ${links.length?links.join(' · '):'Niciuna descoperită'}</div>`;
}
function resultTable(r){if(!r)return '<p>Nu există încă evaluare. Apasă Blind test.</p>';
 const names={'dance-online':'Dans + online','dance-frozen':'Dans + frozen','no-dance':'Fără dans','untrained':'Neantrenat'};
 const cells=Object.entries(r.modes).map(([k,v])=>`<tr><td>${names[k]||k}</td><td>${(100*v.success).toFixed(1)}%</td><td>${fmt(v.penalizedCost,2)}</td><td>${fmt(v.initialF1,3)}</td><td>${fmt(v.coherence,3)}</td></tr>`).join('');
 return `<p>Test pe ${r.count} lumi nevăzute · BCE conexiuni: ${fmt(r.linkBCE.balanced,4)} · Costul include penalitate pentru eșec.</p><table><thead><tr><th>Organism</th><th>Succes</th><th>Cost penalizat ↓</th><th>F1 inițial ↑</th><th>Coerență</th></tr></thead><tbody>${cells}</tbody></table>`;
}
function display(s,redraw=true){
 const previous=state?.progress?.running;
 state=s;const ep=s.episode,p=s.progress;
 if(p?.running&&p.previewSeed!==null&&p.previewSeed!==undefined&&p.previewSeed!==lastTrainingPreview){
   lastTrainingPreview=p.previewSeed;replayIndex=0;
 }else if(previous&&!p?.running){lastTrainingPreview=null;replayIndex=-1;}
 const frame=selectedFrame(ep);
 $('connection').textContent='● LOCAL · :3040';$('metric-episodes').textContent=p?.unlimited?(s.model.episodes+' + '+p.done+' în curs'):s.model.episodes;
 $('metric-sync').textContent=fmt(frame.localCoherence,3);$('metric-known').textContent=frame.known.length;
 $('metric-shape').textContent=(frame.route.length-1)+' · '+(ep.current.verified?'confirmat':'ipotetic');
 $('results').innerHTML=resultTable(s.assessment);
 $('family').value=s.options.family;$('nodes').value=String(s.options.n);$('dance').value=s.options.dance?'yes':'no';$('online').value=s.options.online?'yes':'no';
 const taskBusy=!!p?.running;for(const id of ['new','step','auto','run','train','test','family','nodes','dance','online','episodes'])$(id).disabled=taskBusy;
 $('stop').disabled=!taskBusy;$('step').disabled=taskBusy||ep.solved;
 if(p){$('progress').style.width=p.unlimited?'100%':(100*p.done/Math.max(1,p.total))+'%';
  $('status').textContent=p.running?(p.unlimited?'∞ Antrenare continuă · '+p.done+' lumi · cea mai recentă '+(p.preview?.info?.family||'lume'):'Antrenare reală: '+p.done+'/'+p.total+' episoade · BCE bun '+fmt(p.best,4)):p.error?'Eroare training: '+p.error:(p.selected||'Training finalizat');}
 else {$('status').textContent=s.notice||(ep.solved?'Obiectiv atins!':`Pas ${ep.steps} · efort ${fmt(ep.effort,1)} · ipoteză actualizată`);$('progress').style.width='0%';}
 $('auto').textContent=auto?'■ Pauză':'▶ Auto explorare';
 $('replay').max=String(ep.history.length-1);$('replay').value=String(replayIndex<0?ep.history.length-1:Math.min(replayIndex,ep.history.length-1));
 $('frame-label').textContent=replayIndex<0?'LIVE':'PAS '+frame.step;
 $('replay-note').textContent=`Pas ${frame.step} · formă F1 ${fmt(frame.f1)} · sincronizare ${fmt(frame.localCoherence)} · cost ${fmt(frame.effort,1)}`;
 $('journal').innerHTML=ep.journal.length?ep.journal.slice(-20).reverse().map(x=>`<div><b>#${x.step} ${x.type==='goal'?'✓ Obiectiv':x.type==='moved'?'→ Mișcare':'✕ Rezistență'}</b> · ${x.from} → ${x.to} · ${x.newAssociations} relații · surpriză ${fmt(x.surprise,3)} · coerență ${fmt(x.synchrony,3)}</div>`).join(''):'Nicio acțiune încă.';
 if(redraw)paint(performance.now());
}
function paint(time){if(!state)return;const ep=state.episode,frame=selectedFrame(ep);
 drawWorld($('truth'),ep,frame,true,time);drawWorld($('brain'),ep,frame,false,time);drawTimeline(ep);showNode(ep,frame);
}
function animate(t){if(t-lastPaint>65){paint(t);lastPaint=t;}requestAnimationFrame(animate);}
function pause(){if(auto){clearInterval(auto);auto=null;}$('auto').textContent='▶ Auto explorare';}
async function next(){const r=await post('step');display(r);if(r.episode.solved)pause();}
$('new').onclick=()=>guard(async()=>{pause();replayIndex=-1;selectedNode=0;
 display(await post('new',{family:$('family').value,n:Number($('nodes').value),dance:$('dance').value==='yes',online:$('online').value==='yes'}));});
$('step').onclick=()=>guard(async()=>{replayIndex=-1;await next();});
$('run').onclick=()=>guard(async()=>{pause();replayIndex=-1;display(await post('run',{steps:600}));});
$('auto').onclick=()=>{if(auto){pause();return;}if(!state||state.progress?.running||state.episode.solved)return;
 auto=setInterval(()=>guard(async()=>{replayIndex=-1;await next();}),420);$('auto').textContent='■ Pauză';};
$('train').onclick=()=>guard(async()=>{pause();await post('train',{episodes:Number($('episodes').value),n:Number($('nodes').value)});const r=await get();display(r);});
$('stop').onclick=()=>guard(async()=>{await post('stop');$('status').textContent='Oprire solicitată…';});
$('test').onclick=()=>guard(async()=>{pause();$('status').textContent='Blind evaluation rulează pe 12 lumi noi…';const r=await post('test',{count:12,n:Number($('nodes').value)});display(r);});
$('replay').oninput=()=>{replayIndex=Number($('replay').value);paint(performance.now());$('frame-label').textContent='PAS '+selectedFrame(state.episode).step;};
$('first').onclick=()=>{replayIndex=0;display(state);};$('latest').onclick=()=>{replayIndex=-1;display(state);};
for(const id of ['brain','truth'])$(id).addEventListener('click',ev=>{if(!state)return;const canvas=$(id),rect=canvas.getBoundingClientRect();
 const side=620,x=(ev.clientX-rect.left)*side/rect.width,y=(ev.clientY-rect.top)*side/rect.height,info=state.episode.info;
 let best=Infinity;for(let i=0;i<info.n;i++){const p=loc(info,i),d=Math.hypot(p.x-x,p.y-y);if(d<best){best=d;selectedNode=i;}}
 paint(performance.now());});
let prevRunning=false;
setInterval(async()=>{if(busy)return;try{const s=await get();if(s.progress?.running||prevRunning){if(s.progress?.running!==prevRunning)replayIndex=-1;display(s);}
 prevRunning=!!s.progress?.running;}catch(e){$('connection').textContent='Connection error';}},1100);
get().then(s=>{display(s);requestAnimationFrame(animate);}).catch(e=>{$('status').textContent='Server inaccesibil: '+e.message;});

// Replay REAL graph worlds encountered by training, on the original animated network canvas.
setInterval(()=>{if(!state?.progress?.running||!state.progress.preview||busy||replayIndex<0)return;
 if(replayIndex<state.episode.history.length-1){replayIndex++;paint(performance.now());}
},130);
