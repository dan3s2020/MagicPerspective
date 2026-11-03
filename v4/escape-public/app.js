// UI displays teacher data separately. All predictions come from independent learner outputs.
const $=id=>document.getElementById(id);
let state=null,busy=false;
const pct=v=>(100*v).toFixed(1)+'%';
const nice=v=>v===null||v===undefined?'?':String(v);
async function api(name,payload){
 const response=await fetch('/api/'+name,{method:payload===undefined?'GET':'POST',
  headers:payload===undefined?{}:{'Content-Type':'application/json'},
  body:payload===undefined?undefined:JSON.stringify(payload)});
 const data=await response.json();if(!response.ok)throw Error(data.error||response.statusText);return data;
}
async function run(action,label='Working'){
 if(busy)return;busy=true;$('status').textContent=label+'…';
 document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{state=await action();render(state);$('status').textContent='● Local experimental engine online'}
 catch(e){$('status').textContent='Error: '+e.message;console.error(e)}
 finally{busy=false;if(state)render(state)}
}
function canvas(id,width=640,height=365){
 const c=$(id),dpr=Math.min(2,window.devicePixelRatio||1);
 c.width=width*dpr;c.height=height*dpr;
 const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#0b1528';g.fillRect(0,0,width,height);
 return {g,width,height};
}
function label(g,t,x,y,color='#c4d5ed',size=15){
 g.fillStyle=color;g.font='600 '+size+'px system-ui';g.fillText(t,x,y);
}
function line(g,pts,fill,stroke){
 g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
 g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=2;g.stroke();
}
function drawSolid(dims){
 const {g}=canvas('truth');const [x,y,z]=dims;
 const s=20,point=(a,b,c)=>[300+(a-c)*s,282-b*s*1.15-(a+c)*s*.48];
 const p=(a,b,c)=>point(a,b,c);
 line(g,[p(0,0,0),p(x,0,0),p(x,y,0),p(0,y,0)],'#477cb0','#86bfff');
 line(g,[p(0,0,0),p(0,0,z),p(0,y,z),p(0,y,0)],'#3c5089','#a5a9ff');
 line(g,[p(0,y,0),p(x,y,0),p(x,y,z),p(0,y,z)],'#76b7c5','#bdf1f5');
 label(g,'EVALUATOR-ONLY 3D MODEL',25,35,'#ffcf8e',16);
 label(g,'Internal factors: '+dims.join(' × '),25,65);
 label(g,'Nothing from this teacher view is passed to the learner.',25,340,'#9fb1cb',12);
}
function drawProjections(projection){
 const {g}=canvas('views',640,365),colors=['#82d9f0','#b7a6ff','#ffca89'];
 const all=projection.proposed;
 label(g,'DASHED = INFERRED • SOLID = MEASURED',20,27,'#bed0e8',13);
 all.forEach((pred,row)=>{
  const y=65+row*98,view=pred.view;
  const seen=projection.observed.find(o=>o.view===view);
  const pair=seen?seen.pair:pred.pair;
  const isInferred=!seen&&pair.every(n=>n!==null);
  const w=pair[0]===null?80:Math.max(15,pair[0]*15),h=pair[1]===null?32:Math.max(15,pair[1]*7);
  label(g,view.toUpperCase(),22,y+15,colors[row],16);
  label(g,seen?'MEASURED':isInferred?'INFERRED':'UNKNOWN',150,y+15,
   seen?'#79dfbc':isInferred?'#ffcb85':'#9cafc8',12);
  g.save();g.strokeStyle=colors[row];g.lineWidth=2.5;g.setLineDash(seen?[]:[8,6]);
  g.strokeRect(360,y-19,w,h);g.restore();
  label(g,pair.map(n=>n===null?'?':n).join(' × '),540,y+20,colors[row],16);
 });
}
function drawNumberLab(rules){
 const {g}=canvas('rule-canvas',640,230);const y=130,x0=45,step=53;
 for(let i=0;i<11;i++){
  const x=x0+i*step;
  g.fillStyle=i===rules.state?'#91dbfe':'#647e9f';g.beginPath();g.arc(x,y,i===rules.state?14:6,0,Math.PI*2);g.fill();
  label(g,String(i),x-5,y+35,'#c8d6ee',12);
 }
 for(const [i,action] of ['amber','violet'].entries()){
  const p=rules.predictions[action],x=x0+rules.state*step,target=x0+p.value*step;
  const h=28+i*35;
  g.beginPath();g.moveTo(x,y-14);g.quadraticCurveTo((x+target)/2,h,target,y-11);
  g.strokeStyle=i===0?'#ffca79':'#b7a6ff';g.lineWidth=3;g.stroke();
  label(g,action+': '+rules.state+' → '+p.value+' ('+p.law+')',25,29+i*25,i===0?'#ffca79':'#b7a6ff',13);
 }
 label(g,'Current state: '+rules.state,20,216,'#e9f0ff',15);
}
function eventList(node,items,format){
 node.replaceChildren();
 if(!items?.length){const el=document.createElement('div');el.className='event';el.textContent='No interventions yet.';node.appendChild(el);return}
 for(const data of items.slice().reverse()){
  const el=document.createElement('div');el.className='event'+(data.accurate===false||data.matched===false?' bad':'');
  el.textContent=format(data);node.appendChild(el);
 }
}
function renderProjection(p){
 drawSolid(p.teacher);drawProjections(p);
 $('perspective-summary').textContent='Complete observed scenes: '+p.learned.scenes+
  ' · discovered latent groups: '+p.learned.latentGroups.length+
  ' · supported correspondences: '+p.learned.links.length+
  ' · next most informative view: '+(p.next?.view||'none');
 const root=$('latent');root.replaceChildren();
 for(const group of p.learned.latentGroups){
  const el=document.createElement('div');el.className='cluster';el.textContent=group.join(' ↔ ');root.appendChild(el);
 }
 eventList($('view-events'),p.events,e=>'View '+e.view+': predicted ['+e.predicted.map(nice).join(',')+
   '] | observed ['+e.actual.join(',')+'] | '+(e.accurate?'correct':'updated'));
 for(const view of ['front','side','top'])$(view).disabled=busy||p.observed.some(x=>x.view===view);
 $('suggest').disabled=busy||!p.next;
}
function renderRule(r){
 drawNumberLab(r);
 $('rule-summary').textContent='Hidden-rule candidate search · '+Object.entries(r.learned.samples)
  .map(([action,n])=>action+': '+n+' observations, best '+r.predictions[action].law+
  ', '+r.predictions[action].alternatives+' consistent laws').join(' · ')+
  ' · representation-class switches: '+r.learned.creations;
 $('rule-truth').textContent=JSON.stringify(r.teacher,null,2);
 $('target').value=String(r.goal);
 $('rule-plan').textContent=r.plan?(r.plan.found?
  'Hypothetical action sequence: '+(r.plan.actions.length?r.plan.actions.join(' → '):'already at target'):
  'No plan within the horizon; gather evidence.'):'Plan not requested.';
 eventList($('rule-events'),r.events,e=>'#'+e.step+' '+e.action+': '+e.from+' → '+e.to+
  ', predicted '+e.expected+' ('+e.model+') '+(e.matched?'✓':'✗'));
}
function renderChemistry(c){
 const el=$('chem-result');
 if(!c){el.textContent='Choose a molecular inventory and request a transformation.';return}
 if(!c.possible){
  el.textContent='Not reachable: '+c.reason+'. Atomic deficits: '+
   Object.entries(c.deficits).filter(([,n])=>n>0).map(([k,v])=>k+'='+v).join(', ')+
   '. No matter is created from intention alone.';
 }else{
  el.textContent='Balanced path found: '+(c.steps.length?c.steps.map(s=>s.name).join(' → '):'already in inventory')+
    '. Final inventory: '+JSON.stringify(c.final)+'. Idealized chemistry; this does not produce wine.';
 }
 el.className='metrics-text '+(c.possible?'positive':'negative');
}
function renderEvaluation(e){
 const root=$('eval-results');root.replaceChildren();
 if(!e){root.textContent='No blind evaluation yet.';return}
 const cards=[
  ['Hidden 3D projection','Exact reconstructed view',pct(e.projection.exactRate),'2D independent prior: '+pct(e.projection.independent2DAccuracy)],
  ['Unseen projected dimensions','Correct component predictions',pct(e.projection.accuracy),'Coverage: '+pct(e.projection.coverage)],
  ['Causal transformations','Held-out numeric states',pct(e.rules.heldOutAccuracy),'Fixed-addition baseline: '+pct(e.rules.fixedAdditionAccuracy)],
  ['Discovered rule classes','Non-additive selected rules',String(e.rules.alternativePerspectives)+' / '+e.rules.models,
   'States tested: '+e.rules.total]
 ];
 for(const [title,description,value,detail] of cards){
  const block=document.createElement('div');block.className='result';
  const top=document.createElement('div');top.textContent=title;
  const strong=document.createElement('strong');strong.textContent=value;
  const mid=document.createElement('div');mid.textContent=description;
  const small=document.createElement('p');small.textContent=detail;
  block.append(top,strong,mid,small);root.appendChild(block);
 }
}
function render(s){
 state=s;
 renderProjection(s.projection);renderRule(s.rules);renderChemistry(s.chemistry);renderEvaluation(s.evaluation);
 renderButtons();
}
function renderButtons(){for(const b of document.querySelectorAll('button'))if(b.id!=='front'&&b.id!=='side'&&b.id!=='top'&&b.id!=='suggest')b.disabled=busy}
for(const view of ['front','side','top'])$(view).onclick=()=>run(()=>api('view',{view}),'Observing '+view);
$('suggest').onclick=()=>run(()=>api('view',{view:state.projection.next?.view}),'Choosing viewpoint');
$('train').onclick=()=>run(()=>api('train',{scenes:Number($('scenes').value)}),'Training perspectives');
$('evaluate').onclick=()=>run(()=>api('evaluate',{count:60,ruleWorlds:40}),'Testing unseen worlds');
$('new').onclick=()=>run(()=>api('new',{}),'Creating independent worlds');
$('amber').onclick=()=>run(()=>api('rule',{action:'amber'}),'Applying amber');
$('violet').onclick=()=>run(()=>api('rule',{action:'violet'}),'Applying violet');
$('auto-rule').onclick=()=>run(()=>api('rule',{action:state.rules.next.action}),'Selecting information');
$('plan').onclick=()=>run(()=>api('plan-rule',{goal:Number($('target').value)}),'Planning transformations');
$('chem-plan').onclick=()=>run(()=>api('chemistry',{inventory:{
 water:Number($('water').value),glucose:Number($('glucose').value),oxygen:Number($('oxygen').value)
},goal:'ethanol',amount:1}),'Checking atom conservation');
$('reset').onclick=async()=>{
 if(prompt('Type RESET ESCAPE to delete this lab checkpoint only')!=='RESET ESCAPE')return;
 await run(()=>api('reset',{confirm:'RESET ESCAPE'}),'Resetting this lab');
};
for(let i=0;i<=10;i++){const opt=document.createElement('option');opt.value=String(i);opt.textContent=String(i);$('target').appendChild(opt)}
window.addEventListener('resize',()=>{if(state&&!busy){drawSolid(state.projection.teacher);drawProjections(state.projection);drawNumberLab(state.rules)}});
api('state').then(s=>{render(s);$('status').textContent='● Local experimental engine online'}).catch(e=>{$('status').textContent='Connection failed: '+e.message});
