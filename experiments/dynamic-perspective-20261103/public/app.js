'use strict';
// Training-first viewer: every playback frame is returned by /api/train/live from a real completed episode.
const $=id=>document.getElementById(id);
const fmt=(n,k=2)=>Number.isFinite(Number(n))&&n!==null?Number(n).toFixed(k):'—';
const comma=n=>Number(n||0).toLocaleString('ro-RO');
let state=null,pending=0,activeTrace=null,frameNo=0,queuedTrace=null,play=true,manualFrame=null,selectedNode=null,lastLiveRequest=0;
let lastReceived=0,liveBusy=false,receivedAt=0,receivedCount=0,previousDisplayCount=null,previousDisplayTime=null;
const api=async(route,payload)=>{const post=payload!==undefined;const res=await fetch('/api/'+route,{method:post?'POST':'GET',headers:post?{'Content-Type':'application/json'}:{},body:post?JSON.stringify(payload):undefined,cache:'no-store'});const x=await res.json();if(!res.ok)throw Error(x.error||`HTTP ${res.status}`);return x;};
function controls(){const t=state?.trainer?.status;
 for(const id of ['start','pause','resume','stop','new','round','step','navigate','intervene','save','test'])$(id).disabled=pending>0;
 $('start').disabled=pending>0||t==='running';$('resume').disabled=pending>0||t==='running';$('pause').disabled=pending>0||t!=='running';$('stop').disabled=pending>0||t==='stopped';
 if(state?.session?.solved){$('step').disabled=true;$('navigate').disabled=true;}
}
async function act(route,payload){pending++;controls();try{const s=await api(route,payload);showState(s);return s;}
 catch(error){$('save-info').textContent='Eroare: '+error.message;$('save-info').style.color='#ffb5a6';throw error;}
 finally{pending--;controls();}}
function background(ctx,size){ctx.clearRect(0,0,size,size);ctx.fillStyle='#081423';ctx.fillRect(0,0,size,size);for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(size/2,size/2,i*size*.102,0,Math.PI*2);ctx.strokeStyle='#283858';ctx.lineWidth=1;ctx.stroke();}}
function line(ctx,pos,arr,color,width=3,dash=[]){if(!Array.isArray(arr)||arr.length<2)return;ctx.beginPath();let ok=false;arr.forEach((n,i)=>{const p=pos[n];if(!p)return;const x=30+p.x*640,y=30+p.y*640;if(!ok){ctx.moveTo(x,y);ok=true;}else ctx.lineTo(x,y);});if(!ok)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);}
function graph(canvas,info,links,frame,{mode='train',oracle=null}={}){
 if(!info||!Array.isArray(info.positions))return;
 const ctx=canvas.getContext('2d'),size=700;canvas.width=700;canvas.height=700;background(ctx,size);
 const pos=info.positions;
 for(const link of links||[]){if(link.open===false)continue;const a=pos[link.a],b=pos[link.b];if(!a||!b)continue;
 ctx.beginPath();ctx.moveTo(30+a.x*640,30+a.y*640);ctx.lineTo(30+b.x*640,30+b.y*640);ctx.strokeStyle=mode==='train'?'rgba(104,140,186,.27)':'rgba(112,165,192,.35)';ctx.lineWidth=1.5;ctx.stroke();}
 if(oracle?.length>1)line(ctx,pos,oracle,'#57d8ae',3,[5,8]);
 if(frame?.shape?.length>1)line(ctx,pos,frame.shape,'#ffba70',5,[12,8]);
 if(frame?.walked?.length>1)line(ctx,pos,frame.walked,'#81b9ff',4);
 const current=frame?.current??info.start;
 pos.forEach((p,i)=>{const x=30+p.x*640,y=30+p.y*640;
 const v=frame?.values?.[i],intensity=Number.isFinite(v)?Math.min(1,1/(1+Math.abs(v)/20)):.1;
 ctx.beginPath();ctx.arc(x,y,mode==='train'?6:5,0,Math.PI*2);ctx.fillStyle=mode==='train'?`rgba(184,161,247,${.28+intensity*.72})`:'#9baccc';ctx.fill();});
 for(const [id,letter,color] of [[info.start,'S','#93c3ff'],[info.goal,'G','#64e0b3'],[current,'●','#ffd190']]){
 const p=pos[id];if(!p)continue;const x=30+p.x*640,y=30+p.y*640;
 ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#092035';ctx.lineWidth=2;ctx.stroke();ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#172540';ctx.fillText(letter,x,y);}
}
function emptyTraining(){
 for(const id of ['train-canvas','teacher-canvas']){
  const ctx=$(id).getContext('2d');background(ctx,700);ctx.fillStyle='#b5c2dc';ctx.textAlign='center';
  ctx.font='600 20px system-ui';ctx.fillText('Apasă START ∞',350,325);
  ctx.font='14px system-ui';ctx.fillText('Aici apar numai episoade de training reale',350,355);
 }
}
function chooseLive(incoming){
 if(!Array.isArray(incoming)||!incoming.length)return;
 const newest=incoming.at(-1);lastReceived=Math.max(lastReceived,newest.episode);
 if(!activeTrace){activeTrace=newest;frameNo=0;showTrainingFrame();return;}
 if(newest.episode>activeTrace.episode)queuedTrace=newest;
}
function truthFrame(){if(!activeTrace)return null;return (activeTrace.frames||[])[Math.min(frameNo,(activeTrace.frames||[]).length-1)]||null;}
function countChangedEdges(a,b){
 if(!a?.length||!b?.length)return 0;
 const edges=list=>new Set(list.slice(1).map((node,i)=>[Math.min(node,list[i]),Math.max(node,list[i])].join(':')));
 const x=edges(a),y=edges(b);let changed=0;
 for(const item of x)if(!y.has(item))changed++;
 for(const item of y)if(!x.has(item))changed++;
 return changed;
}
function showTrainingFrame(){
 if(!activeTrace){emptyTraining();return;}
 const frames=activeTrace.frames||[],f=truthFrame(),prior=frames[Math.max(0,frameNo-1)]||null;
 // The organism rendering uses ONLY locally reconstructed edges. Ground truth remains
 // confined to the evaluator canvas; no hidden edge is used to draw the organism.
 graph($('train-canvas'),activeTrace.info,f?.links||[],f,{mode:'train'});
 graph($('teacher-canvas'),activeTrace.info,f?.truthLinks||activeTrace.initialTruth.links,
  {shape:f?.oracle||activeTrace.initialTruth.optimal,walked:f?.walked||[],current:f?.current??activeTrace.info.start},
  {mode:'session',oracle:f?.oracle||activeTrace.initialTruth.optimal});
 $('episode-title').textContent=`EPISOD REAL #${comma(activeTrace.episode)} · ${activeTrace.family.toUpperCase()} · seed ${activeTrace.seed}`;
 $('episode-detail').textContent=f?`Pas ${f.step} · tur mesaje ${f.round} · ${f.connected?'traseu conectat':'traseu incomplet'}`:'—';
 $('frame-indicator').textContent=`${frameNo+1} / ${frames.length}`;
 $('hypothesis-state').textContent=f?.connected?'RUTĂ CONECTATĂ':'IPOTEZĂ INCOMPLETĂ';
 $('train-f1').textContent=fmt(activeTrace.initialF1,3);$('train-cost').textContent=fmt(activeTrace.outcome.cost,1);
 $('train-steps').textContent=`${activeTrace.outcome.steps} pași · ${activeTrace.outcome.changes} schimbări`;
 $('train-outcome').textContent=activeTrace.outcome.solved?'✓ OBIECTIV ATINS':'✕ OBIECTIV NEREALIZAT';
 $('train-after-f1').textContent=fmt(activeTrace.afterTrainingF1,3);
 $('train-delta').textContent=`${fmt(activeTrace.weightShift,4)} / ${activeTrace.costUpdatesInEpisode+activeTrace.ruleUpdatesInEpisode}`;
 $('live-state').textContent=`EPISOD #${comma(activeTrace.episode)} · REPLAY`;
 const step=f?.step??0,delta=countChangedEdges(prior?.shape,f?.shape),newWorld=(f?.changes||0)-(prior?.changes||0);
 $('step-action').textContent=step===0?'Înainte de mișcare: nodurile anticipează forma traseului.':
   `Pas ${step}: ${prior?.current??activeTrace.info.start} → ${f?.current}. Cost acumulat: ${fmt(f?.effort,1)}.`;
 $('step-discovery').textContent=f?.type==='message'?`Turul ${f.round} de comunicare a actualizat potențialele nodurilor.`:
   newWorld>0?`S-au schimbat ${newWorld} observații la conexiuni; rețeaua s-a reorientat.`:
   'A observat consecința acțiunii și costul traversării.';
 $('step-correction').textContent=`Forma ipotetică: ${f?.shape?.length||0} noduri; ${delta} legături diferă față de cadrul anterior. După episod: Δponderi ${fmt(activeTrace.weightShift,4)}.`;
 $('live-scrub').max=String(Math.max(0,frames.length-1));$('live-scrub').value=String(Math.min(frameNo,frames.length-1));
 $('replay-caption').textContent=queuedTrace?`În coadă: episodul #${queuedTrace.episode}`:`Episodul ${activeTrace.episode}, cadru ${frameNo+1}/${frames.length}`;
}
let replayTick=0,frameIdle=0;
setInterval(()=>{
 if(!play||!activeTrace)return;
 const speed=Number($('replay-speed').value)||1;
 if(++replayTick%Math.max(1,Math.round(8/speed))!==0)return;
 const count=activeTrace.frames?.length||1;
 if(frameNo<count-1){frameNo++;frameIdle=0;}
 else if(++frameIdle>=2){
  if(queuedTrace&&queuedTrace.episode>activeTrace.episode){activeTrace=queuedTrace;queuedTrace=null;frameNo=0;}
  else frameNo=0;
  frameIdle=0;
 }
 showTrainingFrame();
},90);
function plot(canvas,data,{baseline=null,key='heldoutMAE',label='MAE pe lumi nevăzute'}={}){
 const ctx=canvas.getContext('2d'),w=1000,h=290;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b1729';ctx.fillRect(0,0,w,h);
 ctx.font='16px system-ui';ctx.fillStyle='#bcc9e3';ctx.fillText(label,25,27);
 if(!data?.length){ctx.fillStyle='#9faece';ctx.font='20px system-ui';ctx.fillText('Graficul apare după primele 5 episoade',25,148);return;}
 const vals=data.map(v=>v[key]).filter(Number.isFinite);if(!vals.length)return;
 const max=Math.max(...vals,baseline||0)*1.1||1,min=Math.min(0,...vals,baseline||0),start=50,end=w-25,top=52,bottom=h-42;
 ctx.strokeStyle='#293956';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(start,top);ctx.lineTo(start,bottom);ctx.lineTo(end,bottom);ctx.stroke();
 if(Number.isFinite(baseline)){const y=bottom-(baseline-min)/(max-min)*(bottom-top);ctx.strokeStyle='#f5ad8e';ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(end,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f4b898';ctx.font='13px system-ui';ctx.fillText('neantrenat '+fmt(baseline,2),start+8,y-8);}
 ctx.strokeStyle='#67dec5';ctx.lineWidth=4;ctx.beginPath();let drawn=0;data.forEach((d,i)=>{const val=d[key];if(!Number.isFinite(val))return;const x=start+i*(end-start)/Math.max(1,data.length-1),y=bottom-(val-min)/(max-min)*(bottom-top);if(drawn++===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
 ctx.fillStyle='#b0c1db';ctx.font='13px system-ui';ctx.fillText('0',start,bottom+20);ctx.fillText(`${data.at(-1).episode} episoade`,end-140,bottom+20);
}
function showLearning(s){const d=s.diagnostics||{},t=s.trainer,m=s.model;
 $('episodes').textContent=comma(t.episodes);$('updates').textContent=`${comma(m.costUpdates)} / ${comma(m.ruleUpdates)}`;
 $('base-mae').textContent=fmt(d.baselineCostMAE,3);$('now-mae').textContent=fmt(d.heldoutCostMAE,3);
 $('gain').textContent=d.reductionPct===null||d.reductionPct===undefined?'—':`${d.reductionPct>=0?'+':''}${fmt(d.reductionPct,1)}%`;
 const good=Number(d.reductionPct)>0;
 $('gain-verdict').className='verdict '+(good?'positive':'negative');
 $('gain-verdict').textContent=d.reductionPct===null?'Nu există încă evaluare independentă.':
  good?`Predicția costurilor pe același set nevăzut este cu ${fmt(d.reductionPct,1)}% mai bună decât modelul neantrenat. Acest lucru NU înseamnă automat navigare mai bună.`:
  `Modelul actual nu depășește modelul neantrenat la MAE pe setul fix (${fmt(d.reductionPct,1)}%).`;
 $('validation').textContent=Number.isFinite(d.learnedCost)?`${fmt(d.learnedCost,1)} / ${fmt(d.bellmanCost,1)}`:'—';
 $('base-shape').textContent=fmt(d.baselineShapeF1,3);
 $('now-shape').textContent=fmt(d.learnedF1,3);
 $('shape-delta').textContent=Number.isFinite(d.shapeDelta)?`${d.shapeDelta>=0?'+':''}${fmt(100*d.shapeDelta,1)} pp`:'—';
 $('validation-note').textContent=Number.isFinite(d.learnedCost)?
  `După episodul ${d.validatedAt}: cost antrenat ${fmt(d.learnedCost,2)} versus Bellman ${fmt(d.bellmanCost,2)} (mai mic este mai bine). F1 inițial ${fmt(d.learnedF1,3)} vs ${fmt(d.bellmanF1,3)}. Set de validare separat.`:
  'Prima validare independentă a navigării apare după aproximativ 20 de episoade.';
 plot($('learning-chart'),t.history,{baseline:d.baselineCostMAE});
}
function drawSession(s){const e=s.session;if(!e)return;
 const f=e.frames?.[manualFrame===null?e.frames.length-1:Math.min(manualFrame,e.frames.length-1)];
 const info=e.info,original=e.evaluator.links;
 graph($('truth'),info,original,{shape:e.evaluator.oracle,walked:e.walked,current:e.position},{mode:'session',oracle:e.evaluator.oracle});
 const links=e.nodes.flatMap(n=>n.links.filter(l=>l.to>n.id).map(l=>({a:n.id,b:l.to,open:l.open})));
 graph($('learner'),info,links,{...(f||{}),shape:f?.shape||e.shape.nodes,walked:f?.walked||e.walked,current:f?.current??e.position},{mode:'session'});
 $('connected').textContent=e.shape.connected?'DA':'NU';$('effort').textContent=`${fmt(e.effort,1)} / ${e.steps}`;$('solved').textContent=e.solved?'✓ DA':'ÎNCĂ NU';
 $('movement').textContent=`${info.family} · nod ${e.position} spre ${info.goal} · ${e.changes} modificări detectate`;
 $('replay').max=Math.max(0,(e.frames?.length||1)-1);$('replay').value=manualFrame===null?$('replay').max:Math.min(manualFrame,Number($('replay').max));
 $('frame-caption').textContent=f?`Tur ${f.round}, pas ${f.step}, cost ${fmt(f.effort)}, formă ${f.connected?'conectată':'incompletă'}`:'—';
 const ev=$('events');ev.replaceChildren();for(const record of (e.events||[]).slice(-12).reverse()){const p=document.createElement('div');p.textContent=`#${record.step||0} ${record.type}: ${record.from??'?'} → ${record.to??'?'} · ${record.changed??0} schimbări`;ev.append(p);}
 if(selectedNode!==null){const node=e.nodes[selectedNode];$('node-info').textContent=node?`Nod ${selectedNode}: ${node.links.length} vecini locali, valoare ${fmt(node.value,2)}, fază ${fmt(node.phase,2)} rad.`:'Alege un nod.';}
}
function showTest(test){if(!test)return;const labels={learned:'Regulă învățată',bellman:'Bellman fix',off:'Fără mesaje',shuffled:'Mesaje amestecate',untrained:'Neantrenat'};
 $('test-rows').replaceChildren();for(const [kind,v] of Object.entries(test.modes)){const tr=document.createElement('tr');for(const val of [labels[kind]||kind,fmt(v.success*100,1)+'%',fmt(v.cost,2),fmt(v.firstF1,3)]){const td=document.createElement('td');td.textContent=val;tr.append(td);} $('test-rows').append(tr);}
 $('test-status').textContent=`${test.count} rețele nevăzute · ${test.n} noduri · eșecuri penalizate · comparație între 5 moduri.`;
}
function showState(s){const firstLoad=state===null;state=s;const t=s.trainer,m=s.model;
 $('episodes-live').textContent=comma(t.episodes);
 const now=Date.now();if(previousDisplayTime!==null&&now>previousDisplayTime+900&&t.status==='running'){
  const rate=Math.max(0,Math.round((t.episodes-previousDisplayCount)*60000/(now-previousDisplayTime)));
  $('training-rate').textContent=String(rate);
 }
 if(previousDisplayTime===null||now>previousDisplayTime+1400){previousDisplayTime=now;previousDisplayCount=t.episodes;}
 const improvement=s.diagnostics?.reductionPct;
 $('learning-state').textContent=t.episodes===0?'NEANTRENAT':Number(improvement)>0?'MAE ↓':'NECONFIRMAT';
 $('online-dot').parentElement.className='server-flag online';
 $('status').textContent=t.status==='running'?'TRAINING ∞':t.status==='paused'?'PAUZĂ':'OPRIT';$('status').className='status '+t.status;
 $('save-info').textContent=`${t.notes} · autosave la ${t.saveEvery} episoade · salvat: ${t.savedAt||'încă nu'}`;
 if(firstLoad){$('nodes').value=String(t.n);$('autosave').value=String(t.saveEvery);$('throttle').value=String(t.throttleMs);}
 $('weights').textContent=JSON.stringify(m.parameters,null,2);
 showLearning(s);drawSession(s);showTest(s.lastTest);controls();}
async function updateState(){if(pending)return;try{showState(await api('state'));}catch(err){$('status').textContent='SERVER OFFLINE';$('online-dot').parentElement.className='server-flag offline';$('save-info').textContent=err.message;}}
async function updateLive(){
 if(liveBusy||Date.now()-lastLiveRequest<350)return;lastLiveRequest=Date.now();liveBusy=true;
 try{const response=await api('train/live?since='+lastReceived+'&limit=12');
  chooseLive(response.traces);
  if(!activeTrace&&response.episodes===0){$('live-state').textContent='APASĂ START ∞';emptyTraining();}
  else if(!activeTrace&&response.episodes>0){$('live-state').textContent='TRAINING RELUAT · AȘTEPTĂM PRIMUL EPISOD';}
 }catch(err){$('live-state').textContent='REPLAY INDISPONIBIL';}
 finally{liveBusy=false;}
}
function config(){return {n:Number($('nodes').value),saveEvery:Number($('autosave').value),throttleMs:Number($('throttle').value)};}
$('start').onclick=()=>void act('train/start',config());$('resume').onclick=()=>void act('train/resume',config());$('pause').onclick=()=>void act('train/pause',{});$('stop').onclick=()=>void act('train/stop',{});$('save').onclick=()=>void act('save',{});$('export').onclick=()=>{location.href='/api/export';};
$('new').onclick=()=>{manualFrame=null;void act('new',{family:$('family').value,n:Number($('nodes').value)});};
$('round').onclick=()=>{manualFrame=null;void act('round',{rounds:1});};$('step').onclick=()=>{manualFrame=null;void act('step',{});};$('intervene').onclick=()=>{manualFrame=null;void act('intervene',{});};$('navigate').onclick=()=>{manualFrame=null;void act('navigate',{});};
$('replay-pause').onclick=()=>{play=!play;$('replay-pause').textContent=play?'Ⅱ REPLAY':'▶ REPLAY';};
$('replay-back').onclick=()=>{frameNo=0;showTrainingFrame();};
$('replay-next').onclick=()=>{if(queuedTrace){activeTrace=queuedTrace;queuedTrace=null;}frameNo=0;play=true;showTrainingFrame();};
$('live-scrub').oninput=()=>{frameNo=Number($('live-scrub').value);play=false;$('replay-pause').textContent='▶ REPLAY';showTrainingFrame();};
$('test').onclick=async()=>{$('test-status').textContent='TEST ORB ÎN CURS: verificăm cinci controale...';try{await act('test',{count:Number($('test-count').value),n:Number($('nodes').value)});}catch(e){$('test-status').textContent='Eroare test: '+e.message;}};
$('replay').oninput=()=>{manualFrame=Number($('replay').value);if(state)drawSession(state);};$('first').onclick=()=>{manualFrame=0;if(state)drawSession(state);};$('live').onclick=()=>{manualFrame=null;if(state)drawSession(state);};
$('learner').onclick=event=>{if(!state?.session)return;const box=$('learner').getBoundingClientRect(),x=(event.clientX-box.left)*700/box.width,y=(event.clientY-box.top)*700/box.height;let best=null,distance=Infinity;state.session.info.positions.forEach((p,i)=>{const d=Math.hypot(30+p.x*640-x,30+p.y*640-y);if(d<distance){best=i;distance=d;}});if(distance<25){selectedNode=best;drawSession(state);}};
emptyTraining();void updateState();void updateLive();setInterval(updateState,1650);setInterval(updateLive,850);
