// V23 / MagicPerspective: live, read-only view of ACTUAL learned corpus
// transformations and the original Discoverer.shape state/action route.
// It does NOT replace the existing V17 Torus UI or mutate Brain/checkpoints.
const section=document.getElementById('cognitiveBox');
const evaluate=document.getElementById('cognitiveEvaluate');
if(section&&evaluate){
  const controls=document.createElement('div');
  controls.className='row';
  controls.style.cssText='margin:8px 0;gap:12px';
  const tempLabel=document.createElement('label');
  tempLabel.textContent='Noise/temperature în Discoverer.shape ';
  const temperature=document.createElement('input');
  temperature.id='cognitiveShapeTemp';temperature.type='range';
  temperature.min='0';temperature.max='2';temperature.step='0.05';temperature.value='0';
  const tempValue=document.createElement('strong');tempValue.textContent=' 0.00';
  temperature.addEventListener('input',()=>{tempValue.textContent=' '+Number(temperature.value).toFixed(2);});
  tempLabel.append(temperature,tempValue);
  const seedLabel=document.createElement('label');
  seedLabel.textContent='Seed reproducibil ';
  const seed=document.createElement('input');seed.id='cognitiveShapeSeed';
  seed.type='number';seed.min='0';seed.max='4294967295';seed.step='1';
  seed.value='74129';seed.style.width='110px';
  seedLabel.append(seed);controls.append(tempLabel,seedLabel);
  evaluate.parentElement.insertAdjacentElement('afterend',controls);

  const title=document.createElement('h3');
  title.textContent='Trasee și stări observate LIVE — graf cognitiv';
  const note=document.createElement('p');note.className='note';
  note.textContent='Sus: tranziții deduse din corpus în timp real. Jos: graful de stări/acțiuni realmente construit de Discoverer.shape înaintea primei acțiuni. Proiecție de vizualizare 2D, nu coordonate 4D învățate. Linia aurie este planul, nu o execuție fictivă.';
  const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;font:12px ui-monospace,monospace;color:#a4d7e8;overflow:auto';
  status.textContent='Aștept primul lot de observații reale din corpus.';
  const liveCanvas=document.createElement('canvas');
  liveCanvas.width=820;liveCanvas.height=280;
  liveCanvas.style.cssText='width:100%;background:#06111b;border:1px solid #2b5366;border-radius:8px';
  liveCanvas.setAttribute('aria-label','Tranziții învățate din corpus în timp real');
  const planCanvas=document.createElement('canvas');
  planCanvas.width=820;planCanvas.height=380;
  planCanvas.style.cssText=liveCanvas.style.cssText;
  planCanvas.setAttribute('aria-label','Forma exactă a traseului anticipat de motorul V17 în graful observat');
  const planStatus=document.createElement('pre');
  planStatus.style.cssText='white-space:pre-wrap;font:12px ui-monospace,monospace;color:#e6c56a';
  planStatus.textContent='Niciun traseu calculat. Evaluarea nu execută pași.';
  section.append(title,note,status,liveCanvas,planStatus,planCanvas);
  const state={live:null,plan:null,lastSeen:0,frame:0,tick:0,observedActions:0,lastAction:null};
  const copy=s=>String(s??'');
  const ctx=c=>c.getContext('2d');
  function clear(c,caption){
    const x=ctx(c);x.clearRect(0,0,c.width,c.height);
    x.fillStyle='#06111b';x.fillRect(0,0,c.width,c.height);
    x.fillStyle='#9bbccc';x.font='12px system-ui';x.fillText(caption,14,20);return x;
  }
  function edge(g,a,b,color,width=1,dashed=false){
    if(!a||!b)return;
    g.beginPath();g.setLineDash(dashed?[5,4]:[]);g.strokeStyle=color;g.lineWidth=width;
    g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.setLineDash([]);
  }
  function node(g,p,label,fill,major=false){
    g.beginPath();g.arc(p.x,p.y,major?7:3.5,0,Math.PI*2);
    g.fillStyle=fill;g.fill();
    if(major){g.fillStyle='#e6f3ff';g.font='11px ui-monospace,monospace';
      g.fillText(copy(label).slice(0,28),Math.min(760,p.x+9),Math.max(25,p.y-8));}
  }
  function paintLive(){
    const g=clear(liveCanvas,'REȚEA REALĂ DE REGULI: observații, ipoteze, confirmări și respingeri');
    const rules=state.live?.liveRuleEdges||[];
    if(!rules.length){g.fillStyle='#8ba5b8';g.fillText('Nu există încă tranziții deduse din corpus.',22,80);return;}
    const recent=rules.slice(-80), tokens=new Map();
    for(const r of recent){for(const t of [r.from,r.to])if(!tokens.has(t))tokens.set(t,tokens.size);}
    const labels=[...tokens.keys()],positions=new Map();
    labels.forEach((label,i)=>{
      const lane=i%6,layer=Math.floor(i/6),rows=Math.ceil(labels.length/6);
      positions.set(label,{x:55+(lane/5)*715,y:50+((layer+.5)/Math.max(rows,1))*205});
    });
    for(const r of recent){
      const from=positions.get(r.from),to=positions.get(r.to);
      edge(g,from,to,r.ambiguous?'#ff4d6d':r.accepted>0?'#3ddc84':'#517da1',
        Math.min(3,1+Math.log1p(r.observations||0)/3),r.accepted===0);
    }
    for(const [label,p]of positions)node(g,p,label,'#8dbed1',labels.length<23);
    g.fillStyle='#b5d3e4';g.fillText(`${rules.length} reguli în captura LIVE; verde = efect observat, albastru punctat = doar ipoteză, roșu = conflict`,14,270);
  }
  function projectedPositions(graph){
    const nodes=graph?.nodes||[],edges=graph?.edges||[],ids=new Map(nodes.map(n=>[n.id,n]));
    const depth=new Map(),queue=[graph.path?.[0]??nodes[0]?.id];depth.set(queue[0],0);
    for(let i=0;i<queue.length;i++)for(const e of edges)if(e.from===queue[i]&&!depth.has(e.to)){
      depth.set(e.to,depth.get(e.from)+1);queue.push(e.to);
    }
    for(const n of nodes)if(!depth.has(n.id))depth.set(n.id,-1);
    const groups=new Map();
    for(const n of nodes){const k=depth.get(n.id),arr=groups.get(k)||[];arr.push(n.id);groups.set(k,arr);}
    const levels=[...groups.keys()].sort((a,b)=>a-b),pos=new Map();
    for(let col=0;col<levels.length;col++){
      const members=groups.get(levels[col]);const x=38+(col+.5)*740/levels.length;
      members.forEach((id,row)=>pos.set(id,{x,y:47+(row+1)*290/(members.length+1)}));
    }
    return pos;
  }
  function paintPlan(){
    const g=clear(planCanvas,'FORMA SOLUȚIEI ÎNAINTE DE ACȚIUNE — ORIGINAL V17 Discoverer.shape');
    const graph=state.plan?.observedTopology;
    if(!graph){g.fillStyle='#8ba5b8';g.fillText('Selectează Evaluare pentru a vedea topologia trăită, nu o simulare.',22,80);return;}
    const pos=projectedPositions(graph),pids=new Set(graph.path||[]),step=Math.max(0,Math.min(state.frame,(graph.path?.length||1)-1));
    const selected=new Set((graph.path||[]).slice(0,step+1));
    for(const e of graph.edges||[])edge(g,pos.get(e.from),pos.get(e.to),e.verified?'#337c78':'#35506a',1,!e.verified);
    for(let i=1;i<(graph.path||[]).length;i++){
      const a=graph.path[i-1],b=graph.path[i];
      edge(g,pos.get(a),pos.get(b),'#f5b301',selected.has(b)?3:2,true);
    }
    for(const n of graph.nodes||[]){
      const p=pos.get(n.id);if(!p)continue;
      const c=n.start?'#ffffff':n.goal?'#3ddc84':pids.has(n.id)?'#f5b301':'#7f9caf';
      node(g,p,n.text,c,(n.start||n.goal||pids.has(n.id))&&(graph.nodes.length<95||n.start||n.goal));
    }
    const cursor=pos.get(graph.path?.[step]);
    if(cursor){g.beginPath();g.arc(cursor.x,cursor.y,11,0,Math.PI*2);g.strokeStyle='#ffae4c';g.lineWidth=2;g.stroke();}
    g.fillStyle='#bcd2e0';
    g.fillText(`Calcul real: ${graph.completeNodes} stări, ${graph.completeEdges} tranziții, ruta ${(graph.path||[]).length-1} pași`,14,357);
  }
  function animate(t){
    if(t-state.tick>420){
      state.tick=t;
      const path=state.plan?.observedTopology?.path||[];
      if(path.length>1)state.frame=(state.frame+1)%path.length;
      if(!document.hidden){paintLive();paintPlan();}
    }
    requestAnimationFrame(animate);
  }
  window.MPCognitiveGraph={
    evalOptions:()=>({temperature:Number(temperature.value),seed:Number(seed.value)}),
    updateLive:incoming=>{
      if(!incoming||!Array.isArray(incoming.liveRuleEdges))return;
      state.live=incoming;state.lastSeen=Date.now();
      status.textContent=`Observații corpus: ${incoming.documents} documente / ${incoming.observedSentences} propoziții
Reguli induse: ${incoming.inducedActionRules}; reguli afișate: ${incoming.liveRuleEdges.length}
Acțiuni fizic observate: ${incoming.realObservedActions}; confirmate: ${incoming.confirmedActions}
Eșecuri/reguli respinse: ${incoming.rejectedActions}. Fără date fabricate.`;
    },
    showPlan:result=>{
      if(!result?.observedTopology)return;
      state.plan=result;state.frame=0;
      const x=result.observedTopology;
      planStatus.textContent=`Motor: ${result.originalMethod||'NEVERIFICAT'} | rezultat: ${result.found?'rută candidată':'neatins'}
Calculată înainte de mișcare: ${x.goalBeforeFirstAction?'DA':'NEVERIFICAT'}; tranziții executate de evaluare: 0
Temperatură: ${result.noiseTemperature}; păstrate ${x.displayedNodes}/${x.completeNodes} noduri și ${x.displayedEdges}/${x.completeEdges} legături
${x.graphTruncated?'VIZUALIZARE TRUNCHIATĂ — graful complet rămâne în checkpoint.':'Topologie completă în captură.'}
${x.projection}
Datele provin din contraste/feedback; succesul semantic pe text lung nu este încă demonstrat.`;
    },
    record:entry=>{state.observedActions++;state.lastAction=entry;}
  };
  requestAnimationFrame(animate);
}
