const $=id=>document.getElementById(id);
let state=null,polling=null,inFlight=false;
const percent=n=>(100*n).toFixed(1)+'%';
async function api(route,args){
 const res=await fetch('/api/'+route,{method:args===undefined?'GET':'POST',
  headers:args===undefined?{}:{'Content-Type':'application/json'},
  body:args===undefined?undefined:JSON.stringify(args)});
 const data=await res.json();if(!res.ok)throw Error(data.error||'HTTP '+res.status);return data;
}
function status(t,good=true){$('status').textContent=t;$('status').style.color=good?'#6fe2c4':'#ff9ba8'}
function resizeCanvas(){
 const c=$('learning'),d=Math.min(2,window.devicePixelRatio||1),w=800,h=295;
 c.width=w*d;c.height=h*d;const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
 g.fillStyle='#0b1527';g.fillRect(0,0,w,h);return {g,w,h};
}
function chart(history){
 const {g,w,h}=resizeCanvas(),left=57,right=w-20,top=26,bottom=h-37;
 g.lineWidth=1;g.strokeStyle='#273852';g.fillStyle='#9cb0c8';g.font='12px system-ui';
 for(let v=0;v<=1.0001;v+=.25){
  const y=bottom-v*(bottom-top);g.beginPath();g.moveTo(left,y);g.lineTo(right,y);g.stroke();g.fillText(Math.round(v*100)+'%',11,y+4);
 }
 const curves=[['validationExact','#70e1c2'],['untrainedExact','#edb979'],['nearestExact','#a9b0ff'],['validationPlan','#fb8ad2']];
 const vals=history||[];
 if(!vals.length){g.fillText('Aici apare progresul real după antrenament.',left+20,145);return}
 const maxEp=Math.max(1,vals.at(-1).episode),X=i=>left+i/maxEp*(right-left),Y=v=>bottom-Math.max(0,Math.min(1,v))*(bottom-top);
 for(const [name,color] of curves){
  g.strokeStyle=color;g.lineWidth=2.5;g.beginPath();
  vals.forEach((v,i)=>i?g.lineTo(X(v.episode),Y(v[name])):g.moveTo(X(v.episode),Y(v[name])));
  g.stroke();
 }
 let x=left;
 for(const [name,color] of [['Precizie','#70e1c2'],['Neantrenat','#edb979'],['Probă apropiată','#a9b0ff'],['Succes plan','#fb8ad2']]){
  g.fillStyle=color;g.fillRect(x,5,10,10);g.fillStyle='#bccae1';g.fillText(name,x+15,14);x+=name==='Probă apropiată'?170:135;
 }
 g.fillStyle='#9cb0c8';g.fillText('Episoade '+maxEp,left,bottom+22);
}
function renderTraining(s){
 $('episodes-trained').textContent=s.model.episodes.toLocaleString('ro-RO');
 $('samples').textContent=s.model.samples.toLocaleString('ro-RO');
 $('updates').textContent=s.model.steps.toLocaleString('ro-RO');
 $('quality').textContent=s.model.bestQuality===null?'—':s.model.bestQuality.toFixed(3);
 const t=s.training,done=t?.done||0,total=t?.total||1,progress=t?Math.round(done/total*100):0;
 $('progress-inner').style.width=progress+'%';
 $('progress').setAttribute('aria-valuenow',progress);
 $('phase').textContent=t?.running?'Învață în timp real':t?.error?'Eroare':t?.completed?'Finalizat':'Pregătit';
 $('progress-label').textContent=t?
   (done+'/'+total+' episoade · loss: '+(t.latest?.loss??'—')+
    ' · precizie validare: '+(t.latest?percent(t.latest.validationExact):'—')+
    ' · plan reușit: '+(t.latest?percent(t.latest.validationPlan):'—')):
   'Niciun antrenament activ. Testele se fac pe lumi distincte.';
 chart(t?.history||[]);
 for(const id of ['train','evaluate','new','reset','plan'])$(id).disabled=!!t?.running||inFlight;
 $('cancel').disabled=!t?.running;
}
function makeNode(tag,cls,text){
 const el=document.createElement(tag);el.className=cls;el.textContent=text;return el;
}
function renderScene(s){
 const v=s.scene;
 $('goal').textContent=v.text;
 $('states').replaceChildren();
 for(const [title,num] of [['Start — roșu',v.start[0]],['Start — albastru',v.start[1]],
  ['Țintă — roșu',v.goal[0]],['Țintă — albastru',v.goal[1]]]){
  const box=makeNode('div','state-box',''),small=makeNode('small','',title),
   strong=makeNode('strong','',String(num));
  box.append(small,strong);$('states').append(box);
 }
 $('probes').replaceChildren();
 for(const item of v.probes) $('probes').append(makeNode('div','probe',
  item.tool+': ['+item.from.join(', ')+'] → ['+item.to.join(', ')+']'));
 $('predictions').replaceChildren();
 for(const [tool,p] of Object.entries(v.predicted)){
  const el=makeNode('div','prediction','');
  el.append(makeNode('div','',tool.toUpperCase()),makeNode('strong','',
   ' ['+v.start.join(', ')+'] → ['+p.state.join(', ')+']'),
   makeNode('div','', 'Probabilitate: roșu '+percent(p.confidence[0])+
    ', albastru '+percent(p.confidence[1])));
  $('predictions').append(el);
 }
 $('teacher').textContent=JSON.stringify(v.teacherOnly,null,2);
 const d=v.demonstration,el=$('plan-result');
 if(!d){el.className='message';el.textContent='Nicio încercare de planificare. Apasă „Propune și verifică planul”.'}
 else{
  el.className='message '+(d.success?'ok':'fail');
  el.textContent=(d.success?'OBIECTIV ATINS':'OBIECTIV NEATINS')+
   ' · Plan: '+(d.actions.length?d.actions.join(' → '):'(fără plan)')+
   ' · Stare obținută: ['+d.actual.join(', ')+']'+
   ' · Stare cerută: ['+d.goal.join(', ')+']';
 }
}
function renderEvaluation(data){
 const root=$('results');root.replaceChildren();
 if(!data){root.append(makeNode('p','note','Apasă „Test orb” pentru comparație.'));return}
 const titles={'learned':'Rețea antrenată','untrained':'Aceeași arhitectură, neantrenată',
  'nearest-probe':'Control: copia ultimei probe apropiate'};
 for(const [mode,record] of Object.entries(data.modes)){
  const card=makeNode('div','result','');
  card.append(makeNode('h3','',titles[mode]),
   makeNode('strong','',percent(record.exactTransition)),
   makeNode('p','','Tranziții exacte (starea completă)'),
   makeNode('strong','',percent(record.planningSuccess)),
   makeNode('p','','Obiective în mai mulți pași: '+record.solved+'/'+record.attempted),
   makeNode('p','','Componente corecte: '+percent(record.componentAccuracy)),
   makeNode('p','','Fără plan: '+record.noPlan+' · Acțiuni executate mediu: '+record.meanExecutedActions));
  root.append(card);
 }
}
function render(s){
 state=s;renderTraining(s);renderScene(s);renderEvaluation(s.evaluation);
 if(s.training?.error)status('Eroare: '+s.training.error,false);
 else status('● Motor local activ');
}
async function press(route,args,label){
 if(inFlight||state?.training?.running)return;
 inFlight=true;status(label+'…');
 try{
  if(route==='train'){
   await api('train',args);state=await api('state');render(state);startPoll();
  }else{render(await api(route,args));}
 }catch(e){status('Eroare: '+e.message,false)}
 finally{inFlight=false;if(state)renderTraining(state)}
}
function stopPoll(){if(polling){clearInterval(polling);polling=null}}
async function poll(){
 if(!state?.training?.running){stopPoll();return}
 try{
  const newer=await api('state');render(newer);
  if(!newer.training?.running){stopPoll();render(await api('state'))}
 }catch(e){stopPoll();status('Conexiunea de progres a eșuat: '+e.message,false)}
}
function startPoll(){stopPoll();polling=setInterval(poll,650);void poll()}
$('train').onclick=()=>press('train',{episodes:Number($('episodes').value)},'Pornire antrenament');
$('evaluate').onclick=()=>press('evaluate',{worlds:30},'Testare pe lumi noi');
$('new').onclick=()=>press('new',{},'Generare lume');
$('plan').onclick=()=>press('plan',{},'Planificare și verificare');
$('cancel').onclick=async()=>{try{await api('cancel',{});status('Oprire solicitată')}catch(e){status(e.message,false)}};
$('reset').onclick=async()=>{
 if(prompt('Tastează RESET V6 pentru a șterge DOAR checkpointul V6')!=='RESET V6')return;
 await press('reset',{confirm:'RESET V6'},'Resetare V6');
};
window.addEventListener('resize',()=>chart(state?.training?.history||[]));
api('state').then(s=>{render(s);if(s.training?.running)startPoll()})
 .catch(e=>status('Nu se poate conecta: '+e.message,false));
