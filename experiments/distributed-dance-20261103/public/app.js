const $=id=>document.getElementById(id);
let state=null,frameIndex=-1,selectedNode=0,polling=false,replayTimer=null,redrawToken=0,busy=false;
const pretty=n=>Number.isFinite(n)?n.toLocaleString('ro-RO'):'—';
const fmt=n=>typeof n==='number'?n.toFixed(3):'—';
const names={real:'Mesaje reale',off:'Fără mesaje',shuffled:'Mesaje amestecate',untrained:'Neantrenat'};
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
async function api(path,body){const res=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const r=await res.json();if(!res.ok)throw Error(r.error||'Request failed');return r;}
async function act(path,body){if(busy)return;busy=true;try{const value=await api(path,body??{});apply(value);return value;}catch(e){toast('Eroare: '+e.message);}finally{busy=false;}}
function apply(s){state=s;const t=s.trainer,m=s.model,c=s.session;
 $('statusText').textContent={running:'TRAINING ∞',paused:'PAUZĂ',stopped:'OPRIT',idle:'GATA'}[t.status]||t.status;
 $('statusDot').className='dot '+t.status;
 $('trainBadge').textContent={running:'RUNNING ∞',paused:'PAUSED · SAVED',stopped:'STOPPED',idle:'IDLE'}[t.status]||t.status;
 $('episodes').textContent=pretty(t.episodes);$('modelLoss').textContent=fmt(t.loss);
 $('bestCost').textContent=fmt(m.bestValidationCost);$('lastSave').textContent=t.lastSaved?new Date(t.lastSaved).toLocaleTimeString('ro-RO'):'Nesalvat';
 $('trainStart').disabled=t.status==='running';$('trainPause').disabled=t.status!=='running';$('trainResume').disabled=t.status==='running'||t.episodes===0;
 $('trainStop').disabled=t.status==='stopped'||t.status==='idle';
 $('trainMessage').textContent=t.notes||'Trainingul este independent de browser.';
 $('trainN').value=String(t.n);$('saveEvery').value=String(t.saveEvery);$('throttle').value=String(t.throttleMs);
 $('worldInfo').textContent=c.info.n+' NODURI · '+c.info.kind.toUpperCase();
 $('rounds').textContent=pretty(c.round);$('connected').textContent=c.shape.connected?'DA':'ÎNCĂ NU';
 $('effort').textContent=c.effort.toFixed(1);$('coherence').textContent=(100*c.coherence).toFixed(1)+'%';$('solved').textContent=c.solved?'✓ DA':'NU';
 $('worldKind').value=c.info.kind;$('worldN').value=String(c.info.n);
 $('frameSlider').max=Math.max(0,c.history.length-1);
 if(frameIndex<0||frameIndex>=c.history.length-1){frameIndex=-1;$('frameSlider').value=c.history.length-1;}else $('frameSlider').value=frameIndex;
 $('frameText').textContent=frameIndex<0?'LIVE':'CADRU '+frameIndex+' / '+(c.history.length-1);
 updateNode();plot();drawBoth();renderTest(s.lastTest);
}
function updateNode(){if(!state)return;const c=state.session,n=c.nodes[selectedNode]||c.nodes[0];selectedNode=n.id;
 const value=n.value===null?'necunoscut':n.value.toFixed(2),known=n.links.map(e=>e.to).join(', ');
 $('nodeDetail').textContent=`Nod ${n.id} · ${n.links.length} legături locale · mesaj valoare ${value} · fază ${n.phase.toFixed(2)} rad · vecini: ${known||'niciunul'}. Următoarea legătură propusă: ${n.parent<0?'neidentificată':n.parent}.`;
}
function getFrame(){if(!state)return null;const h=state.session.history;return frameIndex<0?h.at(-1):h[Math.min(frameIndex,h.length-1)];}
function canvasContext(id){const el=$(id),w=el.clientWidth||340,dpr=Math.min(2,window.devicePixelRatio||1);
 if(el.width!==Math.round(w*dpr)||el.height!==Math.round(w*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(w*dpr);}
 const ctx=el.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,w);return {el,ctx,w};}
function curve(ctx,nodes,layout,color,width,dash=[]){if(!nodes||nodes.length<2)return;ctx.beginPath();nodes.forEach((id,i)=>{const p=layout[id];i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function drawGraph(id,truth,now){const {ctx,w}=canvasContext(id);const c=state.session,info=c.info,frame=getFrame()||c.history.at(-1),pad=w*.085;
 const coords=info.positions.map(p=>({x:pad+p.x*(w-2*pad),y:pad+p.y*(w-2*pad)}));
 ctx.fillStyle='#0a1425';ctx.fillRect(0,0,w,w);
 ctx.strokeStyle='rgba(85,107,151,.12)';ctx.lineWidth=1;
 for(let r=1;r<5;r++){ctx.beginPath();ctx.arc(w/2,w/2,r*w*.115,0,Math.PI*2);ctx.stroke();}
 const edges=truth?c.evaluator.edges:c.nodes.flatMap(n=>n.links.filter(l=>l.to>n.id).map(l=>({a:n.id,b:l.to,cost:l.sensor})));
 for(const e of edges){const p=coords[e.a],q=coords[e.b];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=truth?'rgba(86,180,154,.33)':'rgba(96,162,214,.3)';ctx.lineWidth=truth?1.5:1.7;ctx.stroke();}
 const selected=truth?c.evaluator.oracle:(frame?.shape||c.shape.nodes);
 curve(ctx,selected,coords,truth?'#62dba4':'#ffc17a',Math.max(3,w*.012));
 if(!truth&&frame?.walked?.length)curve(ctx,frame.walked,coords,'rgba(178,152,240,.65)',Math.max(1.5,w*.005),[4,5]);
 for(let i=0;i<info.n;i++){const p=coords[i],phase=frame?.phase?.[i]??c.nodes[i].phase,value=frame?.value?.[i];
  const radius=Math.max(3.5,Math.min(7,w*.011));
  if(!truth){const ring=radius+3+2*Math.sin((now/600)+phase);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(radius,ring),0,Math.PI*2);
    ctx.strokeStyle=`hsla(${(phase*180/Math.PI+215+360)%360},78%,74%,.7)`;ctx.lineWidth=1.7;ctx.stroke();}
  ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
  ctx.fillStyle=value===null&&!truth?'#64758f':'#9eb3d0';ctx.fill();
  if(i===selectedNode){ctx.beginPath();ctx.arc(p.x,p.y,radius+7,0,Math.PI*2);ctx.strokeStyle='#e6d5ff';ctx.lineWidth=1.5;ctx.stroke();}
 }
 const current=frame?.current??c.current;
 for(const [node,label,color] of [[info.start,'S','#83b8ff'],[info.goal,'G','#5bdfa6'],[current,'●','#e5adf4']]){
  const p=coords[node];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(7,w*.022),0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  ctx.font=`800 ${Math.max(10,w*.029)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#0a1625';ctx.fillText(label,p.x,p.y);}
 ctx.fillStyle='#a3b5d4';ctx.textAlign='left';ctx.textBaseline='top';ctx.font=`800 ${Math.max(10,w*.025)}px system-ui`;
 ctx.fillText(truth?'EVALUATOR · GLOBAL':'COLECTIV · DISTRIBUIT',14,13);
 // Keep the coordinates available for exact touch hit testing.
 $(id)._positions=coords;
}
function drawBoth(ts=0){if(!state)return;drawGraph('truthGraph',true,ts);drawGraph('danceGraph',false,ts);}
let animating=true,lastDraw=0;function animate(ts){if(animating&&state&&document.visibilityState!=='hidden'&&ts-lastDraw>65){lastDraw=ts;drawBoth(ts);}requestAnimationFrame(animate);}requestAnimationFrame(animate);
function nodeClick(id,ev){if(!state)return;const canvas=$(id),r=canvas.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*canvas.clientWidth,y=(ev.clientY-r.top)/r.height*canvas.clientHeight;
 let nearest=-1,dist=Infinity;canvas._positions?.forEach((p,i)=>{const d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;nearest=i;}});
 if(nearest>=0){selectedNode=nearest;updateNode();drawBoth();}}
$('truthGraph').addEventListener('click',ev=>nodeClick('truthGraph',ev));$('danceGraph').addEventListener('click',ev=>nodeClick('danceGraph',ev));
function plot(){const element=$('trainChart'),W=element.clientWidth||400,H=element.clientHeight||150,dpr=Math.min(2,window.devicePixelRatio||1);
 if(element.width!==Math.round(W*dpr)||element.height!==Math.round(H*dpr)){element.width=Math.round(W*dpr);element.height=Math.round(H*dpr);}
 const ctx=element.getContext('2d'),w=W;ctx.setTransform(dpr,0,0,dpr,0,0);
 const h=state?.trainer.history||[],pad=25;
 ctx.fillStyle='#0e182b';ctx.fillRect(0,0,w,H);ctx.strokeStyle='#2f4161';ctx.beginPath();ctx.moveTo(pad,12);ctx.lineTo(pad,H-18);ctx.lineTo(w-10,H-18);ctx.stroke();
 if(h.length<2){ctx.fillStyle='#8fa3c3';ctx.font='12px system-ui';ctx.fillText('Datele apar în timpul antrenării...',pad+10,H/2);return;}
 const min=Math.min(...h.map(x=>x.loss)),max=Math.max(...h.map(x=>x.loss));ctx.beginPath();h.forEach((p,i)=>{const x=pad+i/(h.length-1)*(w-pad-15),y=12+(1-(p.loss-min)/(Math.max(.001,max-min)))*(H-32);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
 const gradient=ctx.createLinearGradient(0,0,w,0);gradient.addColorStop(0,'#b99bed');gradient.addColorStop(1,'#66ddc6');ctx.strokeStyle=gradient;ctx.lineWidth=2.7;ctx.stroke();
 $('chartLabel').textContent='Ep. '+pretty(h.at(-1).episode)+' · '+h.at(-1).loss.toFixed(4);
}
function renderTest(test){const rows=$('testRows');if(!test)return;
 rows.replaceChildren();for(const [k,v] of Object.entries(test.modes)){
  const tr=document.createElement('tr');for(const t of [names[k]||k,(v.success*100).toFixed(1)+'%',v.cost.toFixed(2),v.f1.toFixed(3)]){const td=document.createElement('td');td.textContent=t;tr.append(td);}rows.append(tr);}
 $('testStatus').textContent=`${test.count} rețele nevăzute · ${test.n} noduri · aceeași distribuție pentru patru moduri. Orice eșec este penalizat.`;
}
$('trainStart').onclick=()=>act('train/start',{n:+$('trainN').value,throttleMs:+$('throttle').value,saveEvery:+$('saveEvery').value});
$('trainResume').onclick=()=>act('train/resume',{n:+$('trainN').value,throttleMs:+$('throttle').value,saveEvery:+$('saveEvery').value});
$('trainPause').onclick=()=>act('train/pause',{});
$('trainStop').onclick=()=>act('train/stop',{});
$('saveNow').onclick=async()=>{await act('save',{});toast('Checkpoint salvat pe disc.');};
$('newWorld').onclick=()=>act('new',{kind:$('worldKind').value,n:+$('worldN').value});
$('roundOne').onclick=()=>act('round',{rounds:1});$('roundMany').onclick=()=>act('round',{rounds:12});$('moveOne').onclick=()=>act('step',{});
$('runSession').onclick=()=>act('run',{maxMoves:500});
$('blindTest').onclick=async()=>{if(busy)return;$('testStatus').textContent='Testul orb rulează pe server; te rog urmărește rezultatele...';
 await act('test',{count:+$('testCount').value,n:+$('trainN').value});};
$('frameSlider').addEventListener('input',ev=>{frameIndex=Number(ev.target.value);$('frameText').textContent='CADRU '+frameIndex;drawBoth();});
$('firstFrame').onclick=()=>{if(!state)return;frameIndex=0;$('frameSlider').value=0;drawBoth();};
$('liveFrame').onclick=()=>{frameIndex=-1;drawBoth();};
$('playReplay').onclick=()=>{if(replayTimer){clearInterval(replayTimer);replayTimer=null;$('playReplay').textContent='▶ Redă';return;}
 frameIndex=0;replayTimer=setInterval(()=>{if(!state){clearInterval(replayTimer);return;}
  frameIndex++;if(frameIndex>=state.session.history.length){frameIndex=-1;clearInterval(replayTimer);replayTimer=null;$('playReplay').textContent='▶ Redă';}
  else {$('frameSlider').value=frameIndex;drawBoth();}},180);$('playReplay').textContent='Ⅱ Pauză replay';};
async function refresh(){if(polling||busy)return;polling=true;try{apply(await api('state'));}catch(e){$('statusText').textContent='SERVER OFFLINE';toast('Conexiune întreruptă: '+e.message);}finally{polling=false;}}
refresh();setInterval(refresh,1800);
