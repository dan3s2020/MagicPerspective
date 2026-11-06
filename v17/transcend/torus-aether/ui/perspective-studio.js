// Additive V17 research tabs: ALL displayed points come from real HTTP backend reports
// or frozen /eval results. Native app.js owns the original graph/training/evaluation UI.
// No fabricated coordinates, animations, results or backend device statuses.
const $=id=>document.getElementById(id);
const side=document.querySelector('aside.side');
let currentGraph=0,exam=null,caseIndex=0,stepIndex=0,replayTimer=null;
const history=new Map();
const pct=v=>Number.isFinite(v)?(100*v).toFixed(1)+'%':'—';
const value=(v,d=2)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
const count=v=>Number.isFinite(v)?Math.trunc(v).toLocaleString('ro-RO'):'—';
const num=(v,def=0)=>Number.isFinite(Number(v))?Number(v):def;
function activate(mode){
 side.classList.remove('evalOn','psOn','metricsOn','transferOn');
 for(const b of side.querySelectorAll('.tabs button'))b.classList.remove('on');
 const id={ps:'tabPS',metrics:'tabMetrics',transfer:'tabTransfer',train:'tabTrain',eval:'tabEval'}[mode];
 if(id)$(id).classList.add('on');
 if(mode==='ps')side.classList.add('psOn');
 else if(mode==='metrics')side.classList.add('metricsOn');
 else if(mode==='transfer')side.classList.add('transferOn');
}
for(const [id,mode]of [['tabPS','ps'],['tabMetrics','metrics'],['tabTransfer','transfer']]){
 $(id).addEventListener('click',()=>activate(mode));
}
for(const id of ['tabTrain','tabEval'])$(id).addEventListener('click',()=>{
 side.classList.remove('psOn','metricsOn','transferOn');
 for(const b of ['tabPS','tabMetrics','tabTransfer'])$(b).classList.remove('on');
},{capture:true});
// Follow an original V17 graph selection without editing app.js's working native picker.
document.addEventListener('click',event=>{
 const card=event.target.closest?.('#liveList .lgc');
 if(!card||!card.dataset.w)return;
 currentGraph=Number(card.dataset.w);$('psGraph').value=currentGraph;fetchLive();
},{capture:true});
$('psGraph').addEventListener('change',()=>{
 currentGraph=Math.max(0,Math.trunc(num($('psGraph').value)));
 fetchLive();
});
function drawCell(g,n,x,y,scale,color,pad=1){
 g.fillStyle=color;g.fillRect(x*scale+pad,y*scale+pad,Math.max(1,scale-2*pad),Math.max(1,scale-2*pad));
}
function drawGlobal(c,frame){
 const canvas=$('psGlobal'),g=canvas.getContext('2d'),n=c.n,w=canvas.width,h=canvas.height,s=Math.min(w,h)/n;
 g.fillStyle='#07121e';g.fillRect(0,0,w,h);
 for(let i=0;i<n*n;i++){
  const tile=c.initial[i],col=tile===1?'#33475d':tile===2?'#cfb35f':'#102a3b';
  drawCell(g,n,i%n,Math.floor(i/n),s,col);
 }
 const line=(cells,color,width,dashed=false)=>{
  if(!cells||cells.length<2)return;g.beginPath();g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dashed?[7,4]:[]);
  cells.forEach((p,i)=>{const x=(p%n+.5)*s,y=(Math.floor(p/n)+.5)*s;i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();g.setLineDash([]);
 };
 line(c.firstPath,'#56ddd0',Math.max(2,s*.16),true);
 line(c.path?.slice(0,(frame?.step||0)+1),'#f1f5fc',Math.max(2,s*.14));
 const actual=frame?.truePosition??c.start,estimated=frame?.estimatedPosition??c.start;
 for(const [p,color,dx] of [[estimated,'#75aaff',-.13],[actual,'#f0a85b',.13]]){
  if(!Number.isInteger(p))continue;
  g.beginPath();g.arc((p%n+.5+dx)*s,(Math.floor(p/n)+.5)*s,Math.max(3,s*.22),0,2*Math.PI);
  g.fillStyle=color;g.fill();g.strokeStyle='#07121e';g.lineWidth=1.5;g.stroke();
 }
}
function initialPatch(c){
 const out=[],p=c.start,n=c.n;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=p%n+dx,y=Math.floor(p/n)+dy;
  out.push(x<0||x>=n||y<0||y>=n?-1:c.initial[y*n+x]);
 }
 return out;
}
function drawLocal(c,frame){
 const canvas=$('psLocal'),g=canvas.getContext('2d'),patch=frame?.localPatch||initialPatch(c),s=canvas.width/3;
 g.fillStyle='#030b13';g.fillRect(0,0,canvas.width,canvas.height);
 const colors={'-1':'#030b13',0:'#102a3b',1:'#384a61',2:'#d3b269',3:'#80c3ff'};
 patch.forEach((k,i)=>drawCell(g,3,i%3,Math.floor(i/3),s,colors[k]||'#ff6a79',3));
 g.strokeStyle='#f3f7ff';g.lineWidth=2;g.strokeRect(s+4,s+4,s-8,s-8);
 g.fillStyle='#cbd8e5';g.textAlign='center';g.font='14px system-ui';g.fillText('EU / corp',canvas.width/2,canvas.height/2+5);
}
function stopReplay(){
 if(replayTimer!==null){clearInterval(replayTimer);replayTimer=null;}
 $('psPlay').textContent='▶ Replay';
}
function renderCase(){
 if(!exam?.cases?.length)return;
 const c=exam.cases[caseIndex];if(!c)return;
 const trace=c.trace||[],n=Math.min(stepIndex,trace.length),frame=n>0?trace[n-1]:null;
 $('psStep').max=String(trace.length);$('psStep').value=String(n);
 $('psStepLabel').textContent='Pas '+n+' / '+trace.length;
 drawGlobal(c,frame);drawLocal(c,frame);
 const lines=[
  'PROVENIENȚĂ: V17 Brain înghețat, labirint V17 nevăzut, acțiuni fizice reale.',
  'Global: 1 observație completă la început; ulterior numai 3×3 egocentric.',
  'V17 original: '+(c.baseline.solved?'REUȘIT':'NEREUȘIT')+' · '+c.baseline.steps+'/'+c.baseline.optimal+' pași · prima formă '+pct(c.baseline.first),
  'Corpul local cu transformare învățată: '+(c.solved?'REUȘIT':'NEREUȘIT')+' · '+c.steps+'/'+c.optimal+' pași; surplus '+(c.extraSteps??'nedisponibil'),
  'Control cu potrivire locală FIXĂ: '+(c.fixedLocalizer?.solved?'REUȘIT':'NEREUȘIT')+' · '+(c.fixedLocalizer?.steps??'—')+' pași · poziționare '+pct(c.fixedLocalizer?.poseAccuracy),
  'Forma memorată: '+(c.initialShape?.length||0)+' direcții; localizare '+pct(c.poseAccuracy),
  'Vedere după primul pas: '+(c.locality?.afterFirstFullMapRead?'HARTA COMPLETĂ (eroare)':'NUMAI LOCAL'),
  'Starea corpului la pasul '+n+': '+(frame?'observație 3×3, ieșire '+frame.output+', '+frame.how:'harta văzută inițial, fără mișcare'),
  frame?'Poziția estimată '+frame.estimatedPosition+' · poziția REALĂ '+frame.truePosition+' (doar evaluator) · potrivire senzori '+pct(frame.match):'',
  frame?'Deplasare '+(frame.moved?'realizată':'blocată')+' · localizare ambiguă '+(frame.ambiguity?'DA':'nu'):'',
  'Concluzie: '+(c.solved?(c.extraSteps<=0?'fără mișcări în plus față de optim':'traseu rezolvat, dar cu mișcări suplimentare'):'nu a demonstrat un traseu complet în această lume'),
  'Atenție: nu este un model rotativ al corpului și nu demonstrează transfer text→labirint.'
 ];
 $('psExplanation').textContent=lines.filter(Boolean).join('\n');
 const actions=$('psActions');actions.replaceChildren();
 for(const a of trace.slice(Math.max(0,n-13),n)){
  const el=document.createElement('div');el.textContent='pas '+a.step+' · out '+a.output+' · '+a.how+' · eu cred '+a.estimatedPosition+' / real '+a.truePosition+' · '+(a.moved?'mutat':'blocat')+' · potrivire '+pct(a.match);actions.append(el);
 }
}
function showCase(i){
 stopReplay();caseIndex=i;stepIndex=0;
 $('psCase').value=String(i);
 renderCase();
}
$('psCase').addEventListener('change',()=>showCase(Math.trunc(num($('psCase').value))));
$('psStep').addEventListener('input',()=>{stopReplay();stepIndex=Math.trunc(num($('psStep').value));renderCase();});
$('psPlay').addEventListener('click',()=>{
 if(replayTimer!==null){stopReplay();return;}
 if(!exam?.cases?.length)return;
 const n=exam.cases[caseIndex].trace?.length||0;
 if(stepIndex>=n)stepIndex=0;
 $('psPlay').textContent='⏸ Pauză';
 replayTimer=setInterval(()=>{
  stepIndex++;renderCase();
  if(stepIndex>=n)stopReplay();
 },360);
});
$('psCompare').addEventListener('click',async()=>{
 const btn=$('psCompare'),sizes=$('psSizes').value.split(',').map(v=>Number(v.trim())).filter(Number.isFinite);
 if(!sizes.length||sizes.length>10||sizes.some(n=>n<5||n>31||n%2!==1)){
  $('psStatus').textContent='Dimensiuni invalide: alege cel mult 10 numere impare între 5 și 31.';return;
 }
 btn.disabled=true;stopReplay();$('psStatus').textContent='Se salvează creierul selectat și se evaluează o copie înghețată...';
 try{
  const r=await fetch('/eval',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({w:currentGraph,kind:'perspective',opts:{sizes,per:Math.trunc(num($('psPer').value,2)),seed:Math.trunc(num($('psSeed').value,9173)),maxTrace:250}})});
  if(!r.ok)throw Error('HTTP '+r.status);
  const result=await r.json();if(result.error)throw Error(result.error);
  if(!result.cases||!result.summary)throw Error('Evaluator returned no perspective evidence');
  exam=result;const z=result.summary;
  $('psBaseWin').textContent=z.native.solved+'/'+z.native.count;
  $('psBodyWin').textContent=z.body.solved+'/'+z.body.count;
  $('psFixedWin').textContent=z.fixedLocalizer.solved+'/'+z.fixedLocalizer.count;
  $('psExtra').textContent=value(z.native.meanExtraStepsSolved,1)+' / '+value(z.body.meanExtraStepsSolved,1);
  $('psPose').textContent=pct(z.poseAccuracy);
  $('psLeaks').textContent=count(z.totalGlobalReads)+' inițiale; 0 actualizări complete';
  $('psKnown').textContent=count(z.bodyTraining.known)+' / 8';
  $('psAlignUpdates').textContent=count(z.bodyTraining.localizer?.updates);
  $('psCase').replaceChildren();
  result.cases.forEach((m,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent='#'+i+' · '+m.n+'×'+m.n+' · '+(m.solved?'rezolvat':'nerezolvat');$('psCase').append(o);});
  $('psStatus').textContent='Evaluare înghețată · '+result.cases.length+' lumi nevăzute · '+result.protocol+' · seed '+result.controls.seed+'.';
  showCase(0);
 }catch(e){$('psStatus').textContent='Eroare de evaluare: '+e.message;}
 finally{btn.disabled=false;}
});
function plot(id,rows,series,{fixedMax=null,label=''}={}){
 const cv=$(id),g=cv.getContext('2d'),W=cv.width,H=cv.height;
 g.fillStyle='#03101a';g.fillRect(0,0,W,H);
 g.strokeStyle='#294052';g.lineWidth=1;
 for(let k=0;k<=4;k++){const y=12+(H-31)*k/4;g.beginPath();g.moveTo(32,y);g.lineTo(W-9,y);g.stroke();}
 const vals=rows.flatMap(r=>series.map(s=>r[s.key]).filter(Number.isFinite));
 if(vals.length<2){g.fillStyle='#8ea8bf';g.font='13px system-ui';g.fillText('Aștept cel puțin două măsurători DISTINCTE din backend',44,40);return;}
 const ymax=fixedMax??Math.max(1e-6,...vals)*1.15;
 g.fillStyle='#c1d7e5';g.font='12px system-ui';g.fillText(label,12,H-7);
 for(const s of series){
  const n=rows.length;if(n<2)continue;
  let active=false;g.beginPath();g.strokeStyle=s.color;g.lineWidth=2;
  rows.forEach((row,i)=>{
   const v=row[s.key];if(!Number.isFinite(v)){active=false;return;}
   const x=34+(W-48)*i/(n-1),y=H-23-(H-35)*Math.max(0,v)/ymax;
   if(!active){g.moveTo(x,y);active=true;}else g.lineTo(x,y);
  });g.stroke();
 }
}
function addRecord(w,g){
 if(!g||!g.nodes)return;
 const h=history.get(w)||[],stamp=[g.chars,g.maze?.played,g.transform?.played,g.shared?.training?.step].join(':');
 if(h.at(-1)?.stamp===stamp)return;
 const pt={stamp,text:g.test?.aligned??null,maze:g.maze?.test?.solved??null,
  transform:g.transform?.test?.solved??null,loss:g.shared?.training?.preUpdatePredictionLoss??null,
  persistence:g.shared?.training?.identityBaselineLoss??null};
 // Holding prior value after each graph snapshot could fabricate a metric point.
 // A NEW evaluation is recorded only when its source-specific reported status CHANGES.
 const prev=h.at(-1);for(const field of ['text','maze','transform','loss','persistence'])
  if(prev&&pt[field]===prev[field])pt[field]=null;
 h.push(pt);if(h.length>160)h.shift();history.set(w,h);
}
function renderMetrics(g){
 const state=history.get(currentGraph)||[],p=g?.bodyPerspective??{},gpu=g?.gpu??{},shared=g?.shared??{};
 $('mChars').textContent=count(g?.chars??g?.lived);
 $('mMazes').textContent=count(g?.maze?.played);
 $('mTrans').textContent=count(g?.transform?.played);
 $('mMotor').textContent=count(p.known)+' / 8';
 $('mBodyObs').textContent=count(p.observed);
 $('mLocRate').textContent=pct(p.localizer?.trainingTop1Rate);
 $('mLocWeights').textContent=p.localizer?'9 weighturi ale corespondenței dintre vecinătatea memorată și observația egocentrică: '+p.localizer.weights.map(v=>value(v,3)).join(', ')+'\nPrior mișcare: '+value(p.localizer.priorWeight,4)+'\nActualizări SGD/perceptron: '+count(p.localizer.updates)+'\nObservații de antrenare: '+count(p.localizer.samples)+'\nRata top-1 ÎN ANTRENARE: '+pct(p.localizer.trainingTop1Rate)+'\nAceastă rată nu este un scor de generalizare. Evaluarea înghețată pe hărți noi se face în tabul Perspectivă.':'Nu există încă date de învățare locală.';
 $('mGpu').textContent=gpu.error?'EROARE':gpu.info?.device||gpu.info?.name||gpu.settings?.device||'Fără raport GPU';
 plot('mAccuracyCv',state,[
  {key:'text',color:'#4ed6be'}, {key:'maze',color:'#f4b565'}, {key:'transform',color:'#be9ef5'}],{fixedMax:1,label:'Fracție corectă / rezolvată (0–100%)'});
 plot('mLossCv',state,[{key:'loss',color:'#4ed6be'},{key:'persistence',color:'#abbaca'}],{label:'Eroare MSE · mai mic este mai bine'});
 const box=$('mActions');box.replaceChildren();
 for(const a of p.actions||[]){const e=document.createElement('div');e.textContent='Ieșire '+a.output+': '+(a.delta?'deplasare ('+a.delta.join(',')+')':'efect încă necunoscut')+' · '+a.samples+' mișcări observate';box.append(e);}
 $('mRaw').textContent=JSON.stringify({graph:currentGraph,brain:{chars:g?.chars,exercises:g?.exercises,maze:g?.maze?.test,
  transform:g?.transform?.test},bodyPerspective:p,shared:{...shared,training:shared.training},
  cuda:gpu,rawSnapshotTime:new Date().toISOString()},null,2);
}
function renderTransfer(g){
 const S=g?.shared||{},T=S.training||{},GPU=g?.gpu||{},stat=S.domains||{};
 $('trObs').textContent=count(S.totalObserved);
 $('trSteps').textContent=count(T.step);
 $('trDomains').textContent=[stat.text??0,stat.maze??0,stat.transform??0].join(' / ');
 $('trDevice').textContent=T.device||GPU.info?.device||GPU.settings?.device||'—';
 $('trReasons').textContent=[
  'One shared real V17 Brain + a shared PyTorch 32D transition model.',
  'Training data: '+JSON.stringify(S.domains||{})+' observed transitions.',
  'Before-update next-state MSE: '+value(T.preUpdatePredictionLoss,6),
  'Simple unchanged-state baseline: '+value(T.identityBaselineLoss,6),
  'Latest training loss: '+value(T.trainingObjective,6),
  'Noise applied only during learning: '+value(T.noiseUsed,5),
  'Comparison: '+(Number.isFinite(T.preUpdatePredictionLoss)&&Number.isFinite(T.identityBaselineLoss)?
    (T.preUpdatePredictionLoss<T.identityBaselineLoss?'learned predictor lower than identity baseline IN TRAINING':'learned predictor not better than identity baseline IN TRAINING'):'insufficient measurements'),
  'WARNING: no proof of new cross-world semantic transfer, path planning, or unseen language competence.',
  S.error?'Backend error: '+S.error:'Backend shared head: '+(T.step?'trained':'not yet trained')
 ].join('\n');
}
$('trEval').addEventListener('click',async()=>{
 $('trEval').disabled=true;$('trStatus').textContent='Evaluare înghețată în backend V17, nu modifică modelul...';
 try{
  const r=await fetch('/shared-eval?w='+currentGraph+'&seed=74129',{method:'POST'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(data.error)throw Error(data.error);
  $('trStatus').textContent='Evaluare terminată · model neschimbat · surse: '+JSON.stringify(data.counts||{})+'.';
  $('trEvidence').textContent=JSON.stringify(data,null,2);
 }catch(e){$('trStatus').textContent='Nu există încă suficiente date sau evaluatorul a eșuat: '+e.message;}
 finally{$('trEval').disabled=false;}
});
let polling=false;
async function fetchLive(){
 if(polling)return;polling=true;
 try{
  const r=await fetch('/graph?w='+currentGraph,{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const state=await r.json();if(!state.nodes)throw Error('Graph #'+currentGraph+' not available or not started');
  addRecord(currentGraph,state);renderMetrics(state);renderTransfer(state);
 }catch(e){
  $('mRaw').textContent='Backend unavailable: '+e.message;
  $('trStatus').textContent='Aștept backend real: '+e.message;
 }finally{polling=false;}
}
fetchLive();setInterval(fetchLive,1700);
