const $=id=>document.getElementById(id);
let state=null,busy=false,automatic=false,autoTimer=null,lastTaskDone=null;
const fmt=(x,d=3)=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':Number(x).toFixed(d);
async function api(name,body){const r=await fetch('/api/'+name,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error||`HTTP ${r.status}`);return v;}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
async function guard(fn){if(busy)return;busy=true;try{await fn();}catch(err){$('status').textContent='ERROR: '+err.message;console.error(err);}finally{busy=false;}}
function canvasContext(id,width=580,height=580){const canvas=$(id),dpr=Math.min(3,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#0e1728';c.fillRect(0,0,width,height);return c;}
function drawWorld(id,e,truth){const c=canvasContext(id),spec=e.spec,positions=spec.layout,n=spec.nodes,unknown=e.belief.status;
 const xy=i=>({x:28+positions[i].x*524,y:28+positions[i].y*524});
 c.lineCap='round';c.lineJoin='round';
 for(const link of spec.links){const a=xy(link.a),b=xy(link.b);let k=truth?e.teacher.truth[link.id].open?1:0:unknown[link.id];
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineWidth=truth?3:k===-1?1.4:3.3;
  c.strokeStyle=k===1?'#4d796c':k===0?'#394258':'#35415c';c.setLineDash(k===-1?[3,6]:[]);c.stroke();}
 c.setLineDash([]);
 function path(nodes,color,width,dashed){if(nodes?.length<2)return;c.beginPath();nodes.forEach((i,j)=>{const v=xy(i);if(j===0)c.moveTo(v.x,v.y);else c.lineTo(v.x,v.y)});c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dashed?[10,7]:[]);c.stroke();c.setLineDash([]);}
 if(truth){path(e.teacher.path,'#6fe8b7',5,false);}else{
  for(const a of e.plan.alternatives)path(a.nodes,'rgba(222,140,240,.4)',3,true);
  path(e.plan.nodes,'#ffc17b',5,true);
 }
 const radius=n>150?3.5:n>80?5:n>40?7:9;
 for(let i=0;i<n;i++){const p=xy(i);c.beginPath();c.arc(p.x,p.y,radius,0,2*Math.PI);c.fillStyle=i===e.position?'#94bfff':i===spec.goal?'#77e5bc':e.belief.observed[i]?'#8696b8':'#394767';c.fill();}
 for(const [i,label,color] of [[e.position,'S','#93c2ff'],[spec.goal,'G','#78ecc1']]){
  const p=xy(i);c.beginPath();c.arc(p.x,p.y,Math.max(10,radius+4),0,2*Math.PI);c.fillStyle=color;c.fill();c.strokeStyle='#101525';c.lineWidth=2;c.stroke();c.fillStyle='#0b1423';c.textAlign='center';c.textBaseline='middle';c.font='bold 12px system-ui';c.fillText(label,p.x,p.y+1);
 }
}
function plot(history){const c=canvasContext('chart',580,220);const axes={left:42,right:553,top:25,bottom:188};c.strokeStyle='#43516e';c.lineWidth=1;c.beginPath();c.moveTo(axes.left,axes.top);c.lineTo(axes.left,axes.bottom);c.lineTo(axes.right,axes.bottom);c.stroke();
 if(!history?.length){c.font='15px system-ui';c.fillStyle='#9eacc7';c.fillText('Validation history appears after training',70,113);return;}
 const values=history.flatMap(x=>[x.heldoutF1,x.neutralF1]).filter(Number.isFinite);
 const min=Math.max(0,Math.min(...values)-.04),max=Math.min(1,Math.max(...values)+.06);
 function line(key,color){c.beginPath();c.strokeStyle=color;c.lineWidth=2.6;history.forEach((p,i)=>{const x=axes.left+(i/Math.max(1,history.length-1))*(axes.right-axes.left),y=axes.bottom-(p[key]-min)/(max-min||1)*(axes.bottom-axes.top);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});c.stroke();}
 line('heldoutF1','#b69ff8');line('neutralF1','#69e3bc');c.font='12px system-ui';c.fillStyle='#b69ff8';c.fillText('Learned F1',axes.left,17);c.fillStyle='#69e3bc';c.fillText('Neutral F1',axes.left+105,17);c.fillStyle='#8d9cb8';c.fillText('0',15,axes.bottom);c.fillText(history.at(-1).episode+' episodes',440,209);
}
function render(s){state=s;const e=s.episode,p=e.perspective;
 drawWorld('truth',e,true);drawWorld('dream',e,false);
 $('trained').textContent=s.model.episodes.toLocaleString();$('first-f1').textContent=fmt(e.initial.metrics.f1,3);$('current-f1').textContent=fmt(e.current.f1,3);
 $('effort').textContent=fmt(e.effort,1)+' / '+e.blocked;$('updates').textContent=s.model.updates.toLocaleString();$('comparisons').textContent=s.model.perspectiveComparisons.toLocaleString();
 $('geom-value').textContent=fmt(p.weights[0]*100,1)+'%';$('rel-value').textContent=fmt(p.weights[1]*100,1)+'%';$('geom-bar').style.width=p.weights[0]*100+'%';$('rel-bar').style.width=p.weights[1]*100+'%';
 $('slices').textContent=p.slices;$('known').textContent=p.knownLinks+' / '+e.spec.links.length;$('components').textContent=p.components;
 $('hypothesis').textContent=e.plan.source+' · '+e.plan.edges.length+' imagined transitions · '+fmt(e.plan.confidence,2)+' predicted passability. The public action scaffold is not hidden.';
 $('predicted-steps').textContent=e.plan.edges.length;$('alternatives').textContent=e.plan.alternatives.length;$('confidence').textContent=fmt(e.plan.confidence,2);
 const journal=$('journal');journal.replaceChildren();if(!e.history.length){const p=document.createElement('p');p.className='muted';p.textContent='Step 0: imagined shape exists. No movement has happened yet.';journal.appendChild(p);}
 for(const ev of e.history.slice().reverse().slice(0,9)){const entry=document.createElement('div');entry.className='entry '+ev.type;
  const name=document.createElement('b');name.textContent=`#${ev.step} ${ev.type==='goal'?'✓ Goal':ev.type==='blocked'?'⛔ Resisted':'→ Experienced'}`;
  const detail=document.createElement('div');detail.textContent=`expected ${fmt(ev.expected,2)} / actual ${fmt(ev.realCost,2)} · mismatch ${fmt(ev.disagreement,3)} · +${ev.newEvidence} relations · neural Δ ${fmt(ev.neuralDelta,5)}`;
  entry.append(name,detail);journal.appendChild(entry);}
 const running=!!s.task?.running;
 for(const id of ['new','step','auto','evaluate','run-test','train'])$(id).disabled=running||((id==='step'||id==='auto')&&e.finished);
 $('cancel').disabled=!running;
 $('status').textContent=running?`Training active: ${s.task.done}/${s.task.total} episodes`:e.finished?'Goal reached ✓':`Step ${e.steps} · ${e.plan.source} · ${e.plan.edges.length} forecast edges`;
 if(s.task){$('progress').style.width=(100*s.task.done/Math.max(s.task.total,1))+'%';
  $('training-status').textContent=(running?'Training':'Training stopped')+' · '+s.task.done+'/'+s.task.total+(s.task.selected?' · '+s.task.selected:'')+(s.task.error?' · ERROR '+s.task.error:'');
  plot(s.task.history);
 }
 if(s.testResult){for(const [source,prefix] of [['learned-online','on'],['learned-frozen','frozen'],['neutral','neutral']]){
  const v=s.testResult.modes[source];$(`${prefix}-success`).textContent=fmt(100*v.success,1)+'%';$(`${prefix}-f1`).textContent=fmt(v.firstShapeF1,3);
  $(`${prefix}-cost`).textContent=fmt(v.meanCost,2);$(`${prefix}-beam`).textContent=fmt(100*v.beamRate,0)+'%';}
  const a=s.testResult.modes['learned-online'],b=s.testResult.modes['learned-frozen'],n=s.testResult.modes.neutral;
  $('test-status').textContent=`${s.testResult.count} unseen worlds · Same seeds · online cost ${fmt(a.meanCost,2)} / frozen ${fmt(b.meanCost,2)} / neutral ${fmt(n.meanCost,2)}. ${a.meanCost!==null&&n.meanCost!==null&&a.meanCost<n.meanCost?'Lower online effort on this sample; replication required.':'No proven navigation superiority from this sample.'}`;
 }
}
async function refresh(){const s=await api('state');render(s);$('health').textContent='● Local engine online';return s;}
function stopAuto(){automatic=false;if(autoTimer){clearInterval(autoTimer);autoTimer=null;}$('auto').textContent='▶ Auto explore';}
$('new').onclick=()=>guard(async()=>{stopAuto();render(await api('new',{kind:$('kind').value,size:Number($('size').value),online:$('online').value==='true'}));});
$('step').onclick=()=>guard(async()=>{stopAuto();render(await api('step',{}));});
$('auto').onclick=()=>{if(automatic){stopAuto();return;}automatic=true;$('auto').textContent='■ Pause';autoTimer=setInterval(()=>{if(busy)return;guard(async()=>{const s=await api('step',{});render(s);if(s.episode.finished||s.event?.type==='invalid')stopAuto();});},260);};
$('train').onclick=()=>guard(async()=>{stopAuto();await api('train',{episodes:Number($('episodes').value),size:Number($('size').value)});await refresh();});
$('cancel').onclick=()=>guard(async()=>{await api('cancel',{});$('training-status').textContent='Stop requested. Current weights are safe.';});
async function blind(){await guard(async()=>{stopAuto();$('test-status').textContent='Evaluating paired unseen worlds…';await nextFrame();const s=await api('evaluate',{count:12,size:Number($('size').value)});render(s);});}
$('evaluate').onclick=blind;$('run-test').onclick=blind;
$('reset').onclick=()=>guard(async()=>{if(confirm('Reset ONLY MagicPerspective V4 weights? V1–V3 are not touched.')){stopAuto();render(await api('reset',{}));$('test-status').textContent='V4 brain reset.';}});
window.addEventListener('resize',()=>{if(state)render(state);});
refresh().catch(e=>{$('health').textContent='Connection failed: '+e.message;});
setInterval(()=>{if(state?.task?.running&&!busy)refresh().catch(console.error);},750);
