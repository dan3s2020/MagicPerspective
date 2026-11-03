const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
let state=null,viewIndex=null,pending=0,pollTimer=null,selectedNode=null;
async function request(route,data){const isPost=!!data;const res=await fetch('/api/'+route,{method:isPost?'POST':'GET',headers:isPost?{'Content-Type':'application/json'}:{},body:isPost?JSON.stringify(data):undefined,cache:'no-store'});
 let json;try{json=await res.json();}catch{throw Error('Invalid server response');}
 if(!res.ok)throw Error(json.error||'HTTP '+res.status);return json;}
async function action(route,data){pending++;toggleBusy();try{const res=await request(route,data);render(res);return res;}
 catch(e){$('movement').textContent='Eroare: '+e.message;$('train-notice').textContent='Eroare: '+e.message;throw e;}
 finally{pending--;toggleBusy();}}
function toggleBusy(){for(const id of ['new','round','step','navigate','intervene','start','pause','resume','stop','save','test'])$(id).disabled=pending>0;}
function trace(ctx,coords,arr,color,width=4,dashed=false){if(!arr||arr.length<2)return;ctx.beginPath();
 arr.forEach((idx,i)=>{const p=coords[idx];if(!p)return;const x=25+p.x*590,y=25+p.y*590;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.setLineDash(dashed?[8,7]:[]);ctx.stroke();ctx.setLineDash([]);}
function graph(id,s,truth,frame){const canvas=$(id),ctx=canvas.getContext('2d');const size=640;
 ctx.clearRect(0,0,size,size);const bg=ctx.createLinearGradient(0,0,640,640);bg.addColorStop(0,'#0c182b');bg.addColorStop(1,'#141e35');ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
 const {positions,start,goal}=s.info;
 for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(320,320,i*68,0,Math.PI*2);ctx.strokeStyle='rgba(115,135,178,.10)';ctx.lineWidth=1;ctx.stroke();}
 const segments=truth?s.evaluator.links:s.nodes.flatMap(n=>n.links.filter(l=>l.to>n.id).map(l=>({a:n.id,b:l.to,open:l.open,cost:l.sensor})));
 for(const e of segments){const a=positions[e.a],b=positions[e.b];ctx.beginPath();ctx.moveTo(25+a.x*590,25+a.y*590);ctx.lineTo(25+b.x*590,25+b.y*590);
  ctx.strokeStyle=!e.open?'rgba(159,103,127,.13)':truth?(e.cost>12?'rgba(237,155,125,.38)':'rgba(103,188,201,.27)'):'rgba(135,144,229,.26)';
  ctx.lineWidth=e.open?1.8:.8;ctx.setLineDash(e.open?[]:[4,6]);ctx.stroke();ctx.setLineDash([]);
 }
 if(truth)trace(ctx,positions,s.evaluator.oracle,'#69e8b3',5);
 else trace(ctx,positions,frame?.shape||s.shape.nodes,'#ffc580',4,true);
 if(!truth)trace(ctx,positions,frame?.walked||s.walked,'rgba(110,224,213,.65)',2);
 const current=frame?.current??s.position;
 for(let i=0;i<s.info.n;i++){
  const p=positions[i],x=25+p.x*590,y=25+p.y*590;
  const phase=(frame?.phase?.[i]??s.nodes[i].phase)??0;
  const val=frame?.values?.[i]??s.nodes[i].value;
  const hue=180+(phase+Math.PI)*39;
  ctx.beginPath();ctx.arc(x,y,truth?5:7,0,Math.PI*2);
  ctx.fillStyle=truth?'#b8cae9':Number.isFinite(val)?`hsl(${hue} 68% 69%)`:'#465570';ctx.fill();
  if(!truth){ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.strokeStyle=`hsla(${hue} 80% 76% / .5)`;ctx.lineWidth=2;ctx.stroke();}
  if(!truth&&selectedNode===i){ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.strokeStyle='#ffc581';ctx.lineWidth=3;ctx.stroke();}
  if(i===start||i===goal||i===current){ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);
   ctx.fillStyle=i===goal?'#69e9bb':i===current?'#9ec5ff':'#bcaafd';ctx.fill();ctx.strokeStyle='#142238';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#132035';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i===goal?'G':i===current?'S':'A',x,y+.5);
  }
 }
 ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='800 14px system-ui';ctx.fillStyle='#b5c4e7';
 ctx.fillText(truth?'WORLD TRUTH · EVALUATOR':'LEARNER · LOCAL MESSAGES',18,24);
}
function chart(id,values,keys,colors){const canvas=$(id),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#0f1a30';ctx.fillRect(0,0,w,h);
 const x0=50,x1=w-23,y0=28,y1=h-35;ctx.strokeStyle='#34415d';ctx.lineWidth=1;
 for(let t=0;t<=4;t++){const y=y1-(y1-y0)*t/4;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();}
 if(values.length<2){ctx.fillStyle='#8f9cb9';ctx.font='20px system-ui';ctx.fillText('Date insuficiente pentru grafic',x0,65);return;}
 const low=0,high=Math.max(1,...values.flatMap(x=>keys.map(k=>Number(x[k])||0)))*1.1;
 for(let n=0;n<keys.length;n++){
  ctx.beginPath();values.forEach((v,i)=>{const x=x0+(x1-x0)*i/(values.length-1),y=y1-(y1-y0)*((Number(v[keys[n]])||0)-low)/(high-low);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle=colors[n];ctx.lineWidth=3;ctx.stroke();}
 ctx.fillStyle='#9eabc7';ctx.font='16px system-ui';ctx.fillText('0',15,y1);ctx.fillText(fmt(high,1),9,y0+6);
 keys.forEach((k,i)=>{ctx.fillStyle=colors[i];ctx.fillText(k,x0+i*220,18);});
}
function inspect(s){const panel=$('node-info');if(selectedNode===null||!s.nodes[selectedNode]){
 panel.textContent='Apasă un nod pentru a-i vedea conexiunile locale și estimarea către obiectiv.';return;}
 const n=s.nodes[selectedNode];panel.replaceChildren();
 const heading=document.createElement('b');heading.textContent=`Nod ${n.id} · potențial ${fmt(n.value)} · fază ${fmt(n.phase)} rad`;panel.append(heading);
 const p=document.createElement('p');p.textContent=`${n.links.length} legături locale · ${n.links.filter(e=>e.open).length} utilizabile · mesaj părinte ${n.parent<0?'necunoscut':n.parent}.`;panel.append(p);
 const links=document.createElement('div');links.className='local-links';
 for(const l of n.links){const span=document.createElement('span');span.textContent=`${n.id} → ${l.to} · ${l.open?'deschis':'blocat'} · sensor ${fmt(l.sensor)}`;links.append(span);}panel.append(links);
}
function drawEvents(s){const list=s.events.slice(-12).reverse();$('events').innerHTML='';
 if(!list.length){$('events').textContent='Încă nu există evenimente fizice.';return;}
 for(const e of list){const p=document.createElement('div');p.className='event';
  p.textContent=`#${e.step} ${e.type==='goal'?'✓ Obiectiv':e.type==='blocked'?'✕ Blocaj':'→ Deplasare'} · ${e.from} → ${e.to} · cost ${fmt(e.cost)} · surpriză ${fmt(e.surprise)} · ${e.changed||0} schimbări`; $('events').appendChild(p);}
}
function showTest(test){if(!test){$('test-rows').innerHTML='<tr><td colspan="4">Nicio evaluare finalizată</td></tr>';return;}
 const labels={learned:'Regula învățată',bellman:'Bellman fix',off:'Fără mesaje',shuffled:'Mesaje amestecate',untrained:'Neantrenat'};
 $('test-rows').innerHTML='';for(const [key,value] of Object.entries(test.modes)){
  const row=document.createElement('tr');for(const cell of [labels[key],fmt(value.success*100,1)+'%',fmt(value.cost),fmt(value.firstF1,3)]){
   const td=document.createElement('td');td.textContent=cell;row.append(td);} $('test-rows').appendChild(row);
 }
 $('test-status').textContent=`${test.count} lumi noi · ${test.n} noduri · graf dinamic · eșecuri penalizate. Niciun avantaj nu este presupus.`;
}
function render(s){state=s;const t=s.trainer,m=s.model,e=s.session;
 $('status').textContent=t.status==='running'?'TRAINING ∞':t.status==='paused'?'PAUZĂ':'OPRIT';
 $('status').parentElement.className='live '+t.status;
 $('training-tag').textContent=t.status==='running'?'TRAINING ∞':t.status==='paused'?'PAUZĂ':'OPRIT';
 $('led').title=t.status;
 $('episodes').textContent=t.episodes.toLocaleString('ro-RO');$('rule-updates').textContent=m.ruleUpdates.toLocaleString('ro-RO');
 $('cost-mae').textContent=fmt(m.costMAE,3);$('rule-mae').textContent=fmt(m.messageMAE,3);
 $('train-notice').textContent=`${t.notes} · autosave ${t.saveEvery} episoade · ultimul save ${t.savedAt||'încă nu'} `;
 $('progress-fill').style.width=t.status==='running'?'100%':t.status==='paused'?'58%':'0%';
 $('world-type').textContent=e.info.family.toUpperCase();$('rounds').textContent=e.round.toLocaleString('ro-RO');
 $('connected').textContent=e.shape.connected?'DA':'NU';$('effort').textContent=fmt(e.effort,1)+' / '+e.steps;
 $('changes').textContent=e.changes.toLocaleString('ro-RO');$('surprise').textContent=fmt(e.surprise,2);$('solved').textContent=e.solved?'✓ DA':'ÎNCĂ NU';
 $('movement').textContent=e.solved?'Obiectiv atins. Poți genera o lume nouă.':`Poziția ${e.position} / obiectiv ${e.info.goal} · ${e.info.family} · ${e.steps} pași executați.`;
 $('step').disabled=e.solved||pending>0;$('navigate').disabled=e.solved||pending>0;
 $('weights').textContent=`Message attention [${m.parameters.score.map(x=>fmt(x,3)).join(', ')}] · gate [${m.parameters.gate.map(x=>fmt(x,3)).join(', ')}] · τ ${fmt(m.parameters.temperature,3)} · bias ${fmt(m.parameters.bias,3)} · sensor [${m.parameters.cost.map(x=>fmt(x,3)).join(', ')}]`;
 $('start').disabled=t.status==='running'||pending>0;$('resume').disabled=t.status==='running'||pending>0;
 $('pause').disabled=t.status!=='running'||pending>0;$('stop').disabled=t.status==='stopped'||pending>0;
 $('family').value=e.info.family;$('nodes').value=String(e.info.n);$('autosave').value=String(t.saveEvery);$('throttle').value=String(t.throttleMs);
 const frames=e.frames||[],last=frames.length-1;let index=viewIndex===null?last:Math.min(viewIndex,last);
 $('replay').max=Math.max(0,last);$('replay').value=Math.max(0,index);$('replay-label').textContent=viewIndex===null?'LIVE':`PAS ${index}/${last}`;
 const currentFrame=frames[index]||null;$('frame-caption').textContent=currentFrame?`Tur ${currentFrame.round} · pas ${currentFrame.step} · cost ${fmt(currentFrame.effort)} · formă ${currentFrame.connected?'conectată':'incompletă'}`:'—';
 graph('truth',e,true,currentFrame);graph('learner',e,false,currentFrame);
 chart('timeline',frames,['effort','changes'],['#b3a1fb','#6be4d0']);
 chart('learning',t.history,['costMAE','ruleMAE'],['#6be4d0','#b4a1f7']);
 drawEvents(e);inspect(e);showTest(s.lastTest);
}
async function refresh(){if(pending)return;try{const s=await request('state');render(s);}catch(e){$('status').textContent='OFFLINE';$('movement').textContent=e.message;}}
const inputConfig=()=>({n:Number($('nodes').value),saveEvery:Number($('autosave').value),throttleMs:Number($('throttle').value)});
$('new').onclick=()=>{viewIndex=null;void action('new',{n:Number($('nodes').value),family:$('family').value});};
$('round').onclick=()=>{viewIndex=null;void action('round',{rounds:1});};
$('step').onclick=()=>{viewIndex=null;void action('step',{});};
$('navigate').onclick=()=>{viewIndex=null;void action('navigate',{});};
$('intervene').onclick=()=>{viewIndex=null;void action('intervene',{});};
$('start').onclick=()=>void action('train/start',inputConfig());
$('pause').onclick=()=>void action('train/pause',{});
$('resume').onclick=()=>void action('train/resume',inputConfig());
$('stop').onclick=()=>void action('train/stop',{});
$('save').onclick=()=>void action('save',{});
$('export').onclick=()=>{window.location.href='/api/export';};
$('test').onclick=async()=>{const button=$('test');$('test-status').textContent='Test orb în curs: comparăm aceleași lumi în cinci variante…';button.disabled=true;
 try{await action('test',{count:Number($('test-count').value),n:Number($('nodes').value)});}catch(e){$('test-status').textContent='Test eșuat: '+e.message;}finally{button.disabled=false;}};
$('learner').addEventListener('click',event=>{
 if(!state)return;const rect=$('learner').getBoundingClientRect();const x=(event.clientX-rect.left)*640/rect.width,y=(event.clientY-rect.top)*640/rect.height;
 let best=-1,distance=Infinity;state.session.info.positions.forEach((p,i)=>{const d=Math.hypot((25+p.x*590)-x,(25+p.y*590)-y);
 if(d<distance){distance=d;best=i;}});
 if(distance<25){selectedNode=best;render(state);}
});
$('replay').oninput=()=>{viewIndex=Number($('replay').value);if(state)render(state);};
$('first').onclick=()=>{viewIndex=0;if(state)render(state);};
$('live').onclick=()=>{viewIndex=null;if(state)render(state);};
window.addEventListener('resize',()=>{if(state)render(state)});
window.addEventListener('focus',()=>{void refresh()});
refresh();pollTimer=setInterval(refresh,1800);
