const $=id=>document.getElementById(id);
let S=null,F=[],idx=0,first=null,auto=null,play=null,busy=false;
const pct=x=>x==null?'—':Math.round(x*100)+'%',fx=(x,d=2)=>x==null||!Number.isFinite(+x)?'—':(+x).toFixed(d).replace('.',',');
const C={ink:'#1b2a41',floor:'#f4f7f8',wall:'#3a4458',fog:'#d3dbe1',route:'#e8a81b',truth:'rgba(11,122,117,.55)',walk:'#1f3a93',bad:'#d62828'};
async function api(p,b){const r=await fetch('/api/'+p,{method:b===undefined?'GET':'POST',headers:b===undefined?{}:{'Content-Type':'application/json'},body:b===undefined?undefined:JSON.stringify(b)});const v=await r.json();if(!r.ok)throw Error(v.error||r.status);return v;}
async function guard(fn){if(busy)return;busy=true;try{await fn();}catch(e){$('health').textContent=e.message;}finally{busy=false;}}
function ctx(c,ratio=1){const w=c.clientWidth||400,h=Math.round(w*ratio),d=Math.min(3,devicePixelRatio||1);c.width=w*d;c.height=h*d;const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);g.lineCap='round';g.lineJoin='round';return {g,w,h};}
function line(g,pts,color,width,dash){if(!pts||pts.length<2)return;g.beginPath();pts.forEach((p,k)=>k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash||[]);g.stroke();g.setLineDash([]);}
function dot(g,p,r,fill,stroke){g.beginPath();g.arc(p.x,p.y,r,0,7);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
const walkedTo=i=>F.slice(0,i+1).map(f=>f.pos);
// ── maze ──
function drawMaze(c,W,f,{mind=false,firstLine=null,useU=false}={}){const {g,w}=ctx(c),n=W.n,s=w/n,xy=i=>({x:(i%n+.5)*s,y:(((i/n)|0)+.5)*s});
  for(let i=0;i<n*n;i++){const x=(i%n)*s,y=((i/n)|0)*s;let fill=W.wall[i]?C.wall:C.floor;
    if(mind){const v=f.cells[i];fill=v===1?C.wall:v===0?C.floor:C.fog;}g.fillStyle=fill;g.fillRect(x,y,s+.5,s+.5);
    if(mind&&f.cells[i]!==1){const a=useU&&f.U?f.U[i]:f.p[i];if(a>.04){g.fillStyle=useU?`rgba(90,104,124,${Math.min(.8,a)})`:`rgba(232,168,27,${Math.min(.85,a*.85)})`;g.fillRect(x+s*.12,y+s*.12,s*.76,s*.76);}}}
  if(mind){g.save();g.beginPath();for(let i=0;i<n*n;i++)if(f.cells[i]===-1)g.rect((i%n)*s,((i/n)|0)*s,s+.5,s+.5);g.clip();g.strokeStyle='rgba(27,42,65,.18)';g.beginPath();for(let d=-w;d<w;d+=6){g.moveTo(d,0);g.lineTo(d+w,w);}g.stroke();g.restore();}
  if(!mind)for(const i of f.truth)g.fillStyle=C.truth,g.fillRect((i%n)*s+s*.3,((i/n)|0)*s+s*.3,s*.4,s*.4);
  line(g,walkedTo(idx).map(xy),C.walk,Math.max(2,s*.16));
  if(mind){if(firstLine)line(g,firstLine.map(xy),'#8a6a12',Math.max(1.4,s*.08),[s*.3,s*.25]);line(g,f.line.map(xy),C.route,Math.max(2.5,s*.2));}
  const st=xy(W.start);g.strokeStyle=C.ink;g.lineWidth=2;g.beginPath();g.arc(st.x,st.y,s*.3,0,7);g.stroke();
  dot(g,xy(W.goal),s*.36,'#0b7a75');dot(g,xy(f.pos),s*.3,C.walk,'#fff');}
// ── graph of states / constraints ──
function layout(W){const N=W.N;if(W.kind==='graph')return i=>({a:i/N*2*Math.PI});
  const pop=i=>{let c=0,x=i;while(x){c+=x&1;x>>=1;}return c;},cols=Array.from({length:W.v+1},()=>[]);for(let i=0;i<N;i++)cols[pop(i)].push(i);
  const pos=new Map();cols.forEach((col,k)=>col.forEach((i,r)=>pos.set(i,{x:.05+.9*k/W.v,y:col.length===1?.5:.04+.92*r/(col.length-1)})));return i=>pos.get(i);}
function drawGraph(c,W,f,{mind=false,firstLine=null,useU=false}={}){const {g,w}=ctx(c),L=layout(W),N=W.N,R=w*.42,P=i=>{const l=L(i);return l.a!==undefined?{x:w/2+R*Math.cos(l.a),y:w/2+R*Math.sin(l.a)}:{x:l.x*w,y:l.y*w};};
  g.fillStyle='#eef2f4';g.fillRect(0,0,w,w);const r=Math.max(2.5,Math.min(7,w/Math.sqrt(N)/3.2));
  if(mind){g.strokeStyle='rgba(27,42,65,.18)';g.lineWidth=1;for(let i=0;i<N;i++)for(const j of f.nb[i]||[])if(j>i){const a=P(i),b=P(j);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}}
  if(!mind)for(const i of f.truth){const p=P(i);dot(g,p,r*1.9,C.truth);}
  line(g,walkedTo(idx).map(P),C.walk,2.5);
  if(mind){if(firstLine)line(g,firstLine.map(P),'#8a6a12',1.4,[5,4]);line(g,f.line.map(P),C.route,3.5);}
  for(let i=0;i<N;i++){const p=P(i);let fill='#fff';
    if(mind){const st=f.status[i];if(!f.reach[i])fill='#e3e8ec';else if(st===0)fill=C.bad;else{const a=f.p[i];fill=`rgba(232,168,27,${.12+.85*Math.min(1,a)})`;}}
    else if(W.kind==='graph')fill=W.forbid[i]?C.bad:'#fff';else{const v=W.viol[i];fill=v===0?'#0b7a75':`hsl(210,20%,${92-Math.min(60,v*9)}%)`;}
    dot(g,p,r,fill,'rgba(27,42,65,.6)');}
  for(const goal of W.goals)dot(g,P(goal),r*1.4,'#0b7a75','#fff');dot(g,P(f.pos),r*1.35,C.walk,'#fff');}
function draw(){if(!S||!F.length)return;const f=F[idx],W=S.world,opt={firstLine:first?.line,useU:$('show-u').checked};
  const fn=W.kind==='maze'?drawMaze:drawGraph;fn($('truth'),W,f);fn($('mind'),W,f,{...opt,mind:true});
  $('scrub-out').textContent='pasul '+f.step;$('bce-now').textContent=fx(f.bce);curve();geo(f);}
function geo(f){const {g,w,h}=ctx($('geo'),1/1.6);g.fillStyle='#fff';g.fillRect(0,0,w,h);const G=f.geometry||[];
  if(G.length<3){g.fillStyle='#4d5d73';g.font='13px "Source Sans 3",system-ui';g.fillText(S.world.kind==='maze'?'Apare pentru organismele cu organ.':'Disponibilă în labirint.',16,h/2);return;}
  const xs=G.map(p=>p.x),ys=G.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),P=new Map(G.map(p=>[p.c,{x:16+(p.x-x0)/(x1-x0||1)*(w-32),y:16+(p.y-y0)/(y1-y0||1)*(h-32)}]));
  line(g,f.line.filter(c=>P.has(c)).map(c=>P.get(c)),C.route,2.5);
  for(const p of G){const q=P.get(p.c);dot(g,q,4,`rgba(232,168,27,${.15+.85*f.p[p.c]})`,'rgba(27,42,65,.35)');}
  if(P.has(f.pos))dot(g,P.get(f.pos),6,C.walk,'#fff');const goal=S.world.goal;if(P.has(goal))dot(g,P.get(goal),6,'#0b7a75','#fff');}
function curve(){const {g,w,h}=ctx($('curve'),.38),c=S.run.curve,L=36,R=w-10,T=10,B=h-22;g.fillStyle='#fff';g.fillRect(0,0,w,h);if(!c.length)return;
  const mx=Math.max(.5,...c.map(x=>x.bce)),X=i=>L+(c.length<2?0:i/(c.length-1))*(R-L),Y=v=>B-v/mx*(B-T);
  g.fillStyle='#4d5d73';g.font='12px "Source Sans 3",system-ui';g.fillText(fx(mx,1),4,T+8);g.fillText('0',20,B);g.fillText('pași →',L,h-5);
  g.beginPath();c.forEach((p,i)=>i?g.lineTo(X(i),Y(p.bce)):g.moveTo(X(i),Y(p.bce)));g.strokeStyle=C.route;g.lineWidth=2.5;g.stroke();
  g.strokeStyle='rgba(27,42,65,.5)';g.lineWidth=1;g.beginPath();g.moveTo(X(idx),T);g.lineTo(X(idx),B);g.stroke();}
async function loadRun(){F=[];const n=S.run.frames;for(let i=0;i<n;i++)F.push(await api('frame?i='+i));first=F[0];idx=0;$('scrub').max=n-1;$('scrub').value=0;
  $('f1-0').textContent=pct(first.f1);if(S.world.dynamic)$('health').textContent=`lumea a schimbat ${S.run.worldChanges} uși singură; organismul a observat ${S.run.seenExternal} schimbări pe care nu el le-a făcut`;$('ratio').textContent=S.run.solved?fx(S.run.ratio)+'×':'nerezolvat';draw();}
function render(s){S=s;const run=!!s.task?.running;$('kind').value=s.cfg.kind;$('size').value=String(s.cfg.size);$('who').value=s.cfg.who;
  $('health').textContent=run?`antrenează · ${s.task.phase||''}`:`viață: ${s.life.maze} labirinturi, ${s.life.graph} grafuri, ${s.life.sat} constrângeri`;
  for(const id of ['new','step','auto','end','train','test','kind','size','who','gal'])$(id).disabled=run;$('cancel').disabled=!run;
  if(s.task){$('progress').style.width=100*s.task.done/s.task.total+'%';$('train-status').textContent=run?`Antrenare: ${s.task.phase}`:s.task.error?'Eroare: '+s.task.error:'Antrenare încheiată; testele au rulat.';}
  learnCurve();tests();}
function learnCurve(){const {g,w,h}=ctx($('learn'),.38),H=S.history,L=36,R=w-10,T=10,B=h-22;g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#4d5d73';g.font='12px "Source Sans 3",system-ui';
  for(const v of [0,.5,1]){const y=B-v*(B-T);g.fillText(pct(v),2,y+4);g.strokeStyle='#e3e9ec';g.beginPath();g.moveTo(L,y);g.lineTo(R,y);g.stroke();}
  if(!H.length){g.fillText('Curba apare după antrenare.',L+10,(T+B)/2);return;}
  const X=i=>L+(H.length<2?0:i/(H.length-1))*(R-L),col={maze:'#e8a81b',graph:'#1f3a93',sat:'#0b7a75'};
  H.forEach((p,i)=>dot(g,{x:X(i),y:B-Math.min(1,p.f1_0||0)*(B-T)},2.6,col[p.kind]));}
const NAMES={base:'Probabilitate constantă (nu știe nimic)',organ:'Cu organul formei','next-step':'Fără organul formei (aceeași rețea)',untrained:'Organ neantrenat',classic:'Navigare clasică',line:'Linie dreaptă spre țintă'};
function tests(){const t=S.tests.at(-1),box=$('tables'),vb=$('verdicts');box.replaceChildren();vb.replaceChildren();if(!t){vb.textContent='Niciun test încă.';return;}
  const add=(ok,txt)=>{const d=document.createElement('div');d.className=ok?'ok':'no';d.textContent=(ok?'✓ ':'✗ ')+txt;vb.append(d);};
  const m=t.maze,o=m.organ,ns=m['next-step'],ln=m.line,un=m.untrained,cl=m.classic;
  const bs=m.base;add(o.bce0<un.bce0&&o.bce0<ln.bce0&&(!bs||o.bce0<bs.bce0),`D1 · Forma înainte de prima mișcare, pe labirinturi noi: eroare ${fx(o.bce0)} față de ${fx(ln.bce0)} (linie dreaptă), ${fx(un.bce0)} (neantrenat)${bs?` și ${fx(bs.bce0)} (probabilitate constantă)`:''}; F1 ${pct(o.f1_0)} față de ${pct(ln.f1_0)}.`);
  add(o.ratio<=ns.ratio&&o.ratio<=cl.ratio,`D2 · Navigare: pași/optim ${fx(o.ratio)}× față de ${fx(ns.ratio)}× fără organul formei și ${fx(cl.ratio)}× navigare clasică.`);
  add(o.bce50<o.bce0,`D3 · Corecție prin rezistență: eroarea formei scade de la ${fx(o.bce0)} la pasul 0 la ${fx(o.bce50)} la jumătatea drumului.`);
  const big=t.mazeBig;if(big)add(big.organ.bce0<big.line.bce0,`D4 · Generalizare la labirinturi 13×13 (mai mari decât la antrenare): eroare ${fx(big.organ.bce0)} față de ${fx(big.line.bce0)} (linie dreaptă), pași ${fx(big.organ.ratio)}× față de ${fx(big.classic.ratio)}× clasic.`);
  if(t.dynamic)add(t.dynamic.organ.solved>=.9,`Lume cu reguli schimbătoare (uși care se mișcă singure): rezolvate ${pct(t.dynamic.organ.solved)}, pași ${fx(t.dynamic.organ.ratio)}× față de ${fx(t.dynamic.classic.ratio)}× clasic; a recunoscut ${fx(t.dynamic.organ.seenExternal,1)} schimbări făcute de lume, nu de el.`);
  for(const [k,name] of [['graph','graful de stări'],['sat','constrângeri logice']]){const r=t[k];add(r.organ.bce0<r.untrained.bce0&&r.organ.ratio<=r.classic.ratio,`Pe ${name}: eroare la pasul 0 ${fx(r.organ.bce0)} (neantrenat ${fx(r.untrained.bce0)}), pași ${fx(r.organ.ratio)}× față de ${fx(r.classic.ratio)}× clasic și ${fx(r['next-step']?.ratio)}× fără organul formei; rezolvate ${pct(r.organ.solved)}.`);}
  for(const [k,title] of [['maze','Labirinturi 7, 9, 11'],['graph','Graf de stări'],['sat','Constrângeri logice']]){const tb=document.createElement('table');tb.className='tests';
    tb.innerHTML=`<caption style="text-align:left;font-weight:700;padding:8px 0">${title}</caption><thead><tr><th>Organism</th><th>Eroare formă pas 0</th><th>F1 pas 0</th><th>Eroare la jumătate</th><th>Pași / optim</th><th>Rezolvate</th></tr></thead>`;
    const body=document.createElement('tbody');for(const [mode,r] of Object.entries(t[k])){const tr=document.createElement('tr');for(const v of [NAMES[mode]??mode,fx(r.bce0),pct(r.f1_0),fx(r.bce50),fx(r.ratio)+'×',pct(r.solved)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);}
    tb.append(body);box.append(tb);}}
async function refresh(){render(await api('state'));await loadRun();}
async function apply(s){render(s);await loadRun();}
function stop(){clearInterval(auto);auto=null;$('auto').textContent='Pornește';clearInterval(play);play=null;$('play').textContent='▶';}
const go=i=>{idx=Math.max(0,Math.min(F.length-1,i));$('scrub').value=idx;draw();};
$('new').onclick=()=>guard(async()=>{stop();await apply(await api('new',{kind:$('kind').value,size:Number($('size').value),who:$('who').value}));});
$('kind').onchange=$('size').onchange=()=>$('new').click();$('who').onchange=()=>guard(async()=>{stop();await apply(await api('new',{who:$('who').value,same:true}));});
$('step').onclick=()=>{stop();go(idx+1);};$('end').onclick=()=>{stop();go(F.length-1);};
$('auto').onclick=()=>{if(auto){stop();return;}$('auto').textContent='Pauză';auto=setInterval(()=>{if(idx>=F.length-1)return stop();go(idx+1);},280);};
$('play').onclick=()=>{if(play){stop();return;}go(0);$('play').textContent='❚❚';play=setInterval(()=>{if(idx>=F.length-1)return stop();go(idx+1);},280);};
$('scrub').oninput=()=>{stop();go(Number($('scrub').value));};$('show-u').onchange=draw;
$('train').onclick=()=>guard(async()=>{await api('train',{plan:$('plan').value,episodes:Number($('episodes').value)});render(await api('state'));});
$('cancel').onclick=()=>guard(async()=>{await api('cancel',{});});
$('test').onclick=()=>guard(async()=>{$('verdicts').textContent='Rulez testele pe lumi noi…';render(await api('test',{}));});
$('gal').onclick=()=>guard(async()=>{const gs=await api('gallery'),box=$('gallery');box.replaceChildren();for(const G of gs){const c=document.createElement('canvas');box.append(c);
  const save=idx,saveF=F;F=[G.frame];idx=0;drawMaze(c,{n:G.n,wall:G.wall,start:G.start,goal:G.goal},G.frame,{mind:true});const g=c.getContext('2d'),n=G.n,s=c.clientWidth/n;
  g.fillStyle=C.truth;for(const i of G.frame.truth)g.fillRect((i%n)*s+s*.36,((i/n)|0)*s+s*.36,s*.28,s*.28);F=saveF;idx=save;}});
let was=false;setInterval(()=>{if(!S||busy)return;const r=!!S.task?.running;if(r||was)guard(async()=>{const s=await api('state');was=!!s.task?.running;if(!was&&r)await apply(s);else render(s);});},1500);
addEventListener('resize',()=>{draw();if(S){learnCurve();}});
refresh().catch(e=>$('health').textContent='Nu găsesc serverul: '+e.message);
