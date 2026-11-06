// Original MagicPerspective V17 UI plugin: an inspectable 5D projection of
// evidence-bearing text trajectories, NOT a demo scene or artificial maze.
import {fromFrozenEvaluation,fromNativeChat,fromLiveTraining} from './text-journey5d.mjs';
const TAU=2*Math.PI;
const COLORS={plan:'#f6c45a',actual:'#51b5ff',online:'#f7974e',error:'#ff6179',replan:'#52e6d7',macro:'#ca94ff',alternate:'#c88795'};
const human = n=>n===32?'␣':n===10?'⏎':n===9?'⇥':n==null?'—':n<32||n>126?'·':String.fromCharCode(n);
function rotate5(u,rot,center){
 if(!u||u.length<5||u.some(x=>!Number.isFinite(x)))return null;
 const a=u.map((x,i)=>(((x-center[i]+1.5)%1)-.5));
 const pairs=[[0,1,rot],[0,2,rot*.47],[1,3,rot*.29],[2,4,rot*.41],[3,4,rot*.22]];
 for(const [i,j,angle] of pairs){const c=Math.cos(angle),s=Math.sin(angle),x=a[i],y=a[j];a[i]=x*c-y*s;a[j]=x*s+y*c;}
 return a;
}
export function mountTextMaze5D(parent,{title='Traseul textului în 5D'}={}){
 if(!parent)throw Error('Missing original V17 viewer container');
 parent.innerHTML=`<section class="textMaze5d" style="border:1px solid #315777;border-radius:12px;padding:12px;background:#060c14;color:#c4dbea;margin:12px 0">
 <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center"><b class="hmTitle"></b><button type="button" data-hm="fullscreen">⛶ Tot ecranul</button></div>
 <p data-hm="note" style="font-size:12px;color:#abc4d5;line-height:1.5"></p>
 <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0">
 <button type="button" data-hm="prev">◀ Pas</button><button type="button" data-hm="play">▶ Rulează</button><button type="button" data-hm="next">Pas ▶</button>
 <label style="font-size:12px">viteză <input type="range" min="30" max="900" step="10" value="170" data-hm="speed" style="width:100px"></label>
 <span data-hm="at" style="font:12px ui-monospace,monospace">—</span></div>
 <input data-hm="step" type="range" value="0" min="0" max="1" step="1" style="width:100%" aria-label="Pasul cursorului"/>
 <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0;font-size:12px">
 <label>rotire 5D <input type="range" data-hm="rot" value=".25" min="-3.14" max="3.14" step=".04" style="width:105px"></label>
 <label>zoom <input type="range" data-hm="zoom" value="1" min=".4" max="4" step=".05" style="width:92px"></label>
 <label>secțiune W/V <input type="range" data-hm="slice" value="1" min=".08" max="1" step=".02" style="width:95px"></label>
 <label><input type="checkbox" data-hm="spin"> rotește</label>
 <button type="button" data-hm="home">Centrează</button></div>
 <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;padding:4px 0;line-height:1.7">
 <span style="color:${COLORS.plan}">━━ forma prezisă DINAINTE</span>
 <span style="color:${COLORS.actual}">━━ parcurs observat / emis</span>
 <span style="color:${COLORS.online}">·· predicție din poziția actuală</span>
 <span style="color:${COLORS.error}">● diferență / eroare</span>
 <span style="color:${COLORS.replan}">╌ forme recalculate</span>
 <span style="color:${COLORS.macro}">━━ transformări învățate</span>
 </div>
 <canvas data-hm="canvas" width="850" height="460" style="width:100%;height:410px;display:block;background:#03070e;border:1px solid #284258;border-radius:9px;touch-action:none" aria-label="Proiecția 5D a traseului real"></canvas>
 <p data-hm="status" style="font:12px ui-monospace,monospace;color:#9dcadf"></p>
 <pre data-hm="details" style="max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.55 ui-monospace,monospace;background:#0b1724;border:1px solid #1b3b56;border-radius:8px;padding:9px"></pre>
 </section>`;
 const root=parent.querySelector('.textMaze5d');root.querySelector('.hmTitle').textContent=title;
 const el=k=>root.querySelector(`[data-hm="${k}"]`),canvas=el('canvas'),ctx=canvas.getContext('2d');
 let J=null,step=0,playing=false,clock=0,rot=.25,zoom=1,slice=1,offsetX=0,offsetY=0;
 let hold=null,hitPts=[],lastProjection=null;
 const setStatus=s=>el('status').textContent=s;
 function project(u,width,height){
   const r=rotate5(u,rot,[.5,.5,.5,.5,.5]);if(!r)return null;
   const thickness=Number(el('slice').value);
   const visible=thickness>=.999||(Math.abs(r[3])<=thickness/2 && Math.abs(r[4])<=thickness/2);
   const perspective=1/(1+Math.max(-.7,Math.min(.7,r[2]*.8+r[3]*.35+r[4]*.2)));
   const scale=Math.min(width,height)*.87*zoom;
   return {x:width/2+(r[0]*.75+r[2]*.26+r[4]*.12)*scale*perspective+offsetX,
     y:height/2+(r[1]*.75+r[3]*.25-r[4]*.1)*scale*perspective+offsetY,
     visible,depth:r[2]+r[3]+r[4]};
 }
 function drawPath(points,color,{dash=[],until=Infinity,width=1.8,alpha=.9,kind='path'}={}){
  if(!points?.length)return;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.setLineDash(dash);
  ctx.beginPath();let started=false,prior=null;let counter=0;
  for(const p of points){if(p.i>=until)break;
   const pt=p.valid?project(p.u,canvas.clientWidth,canvas.clientHeight):null;
   if(!pt?.visible){started=false;prior=null;continue;}
   if(!started){ctx.moveTo(pt.x,pt.y);started=true;}else{
     // Large torus seams are actual jumps in the 2D projection: don't invent a connecting shortcut.
     if(prior && Math.hypot(pt.x-prior.x,pt.y-prior.y)>Math.min(canvas.clientWidth,canvas.clientHeight)*.58)ctx.moveTo(pt.x,pt.y);
     else ctx.lineTo(pt.x,pt.y);
   }
   prior=pt;
   if((counter++%8===0)||p.i===step-1)hitPts.push({x:pt.x,y:pt.y,i:p.i,kind,code:p.code});
  }
  ctx.stroke();ctx.restore();
 }
 function drawConnector(A,B,color,dashed=false,width=1.8){
   if(!A||!B)return;const a=project(A,canvas.clientWidth,canvas.clientHeight),b=project(B,canvas.clientWidth,canvas.clientHeight);
   if(!a?.visible||!b?.visible)return;
   ctx.save();ctx.globalAlpha=.76;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[4,5]:[]);
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
 }
 function dot(u,color,r=5,outline='#ffffff'){
   const p=project(u,canvas.clientWidth,canvas.clientHeight);if(!p?.visible)return;
   ctx.save();ctx.fillStyle=color;ctx.strokeStyle=outline;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();ctx.stroke();ctx.restore();
 }
 function render(){
  const W=canvas.clientWidth,H=canvas.clientHeight;if(W<40||H<40)return;
  const dpr=Math.min(2,devicePixelRatio||1),w=Math.max(1,Math.round(W*dpr)),h=Math.max(1,Math.round(H*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);hitPts=[];
  ctx.fillStyle='#03070e';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#102538';ctx.lineWidth=1;
  for(let x=40;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=25;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  if(!J){ctx.fillStyle='#9fc6df';ctx.font='13px system-ui';ctx.fillText('Aștept trasee reale: evaluează text nevăzut sau generează în chat.',18,34);return;}
  if(J.mode==='frozen-evaluation'||J.mode==='live-training'){
    drawPath(J.plan,COLORS.plan,{dash:[6,4],alpha:.64,width:2.2,kind:'plan'});
    drawPath(J.actual,COLORS.actual,{until:step,alpha:.9,width:2.5,kind:'observed'});
    // Draw only the latest relevant online guesses, not invented free-running moves.
    const span=Math.max(1,Math.floor(J.answerLength/210));
    for(const x of J.online){
      if(x.i>=step)break;
      if(x.i%span===0||x.i===step-1)if(x.valid)drawConnector(x.from,x.to,x.i===step-1?COLORS.error:COLORS.online,true,1.0);
    }
    for(const i of J.errorIndices){if(i>=step)break; if(i===step-1||i%span===0){const p=J.stateAt(i+1);if(p?.valid)dot(p.u,COLORS.error,3,'#510f1a');}}
    for(const r of J.replans){if(r.at>step)continue;
      drawPath(r.points,COLORS.replan,{dash:[3,5],alpha:r.at===step-1?.95:.5,width:1.8,kind:'replan'});
      dot(J.stateAt(r.at)?.u,COLORS.replan,4,'#23686a');
    }
  }else{
    drawPath(J.actual,COLORS.actual,{until:step,width:2.6,kind:'emitted'});
    for(const r of J.macro||[]){if(r.start.valid&&r.end.valid)drawConnector(r.start.u,r.end.u,COLORS.macro,false,3);}
    for(const r of J.alternatives||[]){if(r.start.valid&&r.end.valid)drawConnector(r.start.u,r.end.u,COLORS.alternate,true,2);}
  }
  const current=J.stateAt?.(step);if(current?.valid)dot(current.u,'#ffffff',6,COLORS.actual);
  ctx.fillStyle='#a9c5df';ctx.font='12px ui-monospace,monospace';
  ctx.fillText('V17 · 5D torus · X/Y + Z/W/V rotite · timp = pasul cursorului',12,20);
  if(J.knownGeometry===0){ctx.fillStyle='#ffb65c';ctx.fillText('Fără coordonate geometrice V17 în checkpoint — nu inventez harta.',12,40);}
  el('at').textContent=step+' / '+J.answerLength;
  lastProjection={W,H};
 }
 function detail(){
  if(!J){el('details').textContent='Nicio experiență evaluată sau generată.';setStatus('Aștept date reale din V17.');return;}
  const i=Math.max(0,step-1),has=step>0,code=has?J.observed[i]:null;
  if(J.mode==='frozen-evaluation'||J.mode==='live-training'){
    const online=has?J.guessed[i]:null,before=has?J.shape[i]:null,
      delta=has?(online===code?'CORECT':'EROARE'):'—';
    const applicable=J.replans.filter(x=>x.at<=i);
    el('details').textContent=
      'PERSPECTIVA DE SUS · forma calculată ÎNAINTE de răspuns\n'+
      '  lungimea formei: '+J.shape.length+' caractere; primul loc diferit: '+(J.firstDeparture<0?'niciunul':J.firstDeparture)+'\n'+
      '  caracterul din forma inițială la pasul '+i+': '+(before==null?'—':human(before))+'\n\n'+
      'PERSPECTIVA CURSORULUI · predicție cu prefixul real\n'+
      '  pas: '+step+' / '+J.answerLength+'\n'+
      '  prezis: '+(has?human(online):'—')+' · observat: '+(has?human(code):'—')+' · rezultat: '+delta+'\n'+
      '  erori observate până aici: '+J.errorIndices.filter(x=>x<step).length+'\n'+
      '  recalculări după prefix real: '+applicable.map(x=>'pas '+x.at+' ⇒ '+JSON.stringify(x.predicted.slice(0,32))).join(' | ')+'\n\n'+
      'OBSERVAT până aici: '+JSON.stringify(String.fromCharCode(...J.observed.slice(Math.max(0,step-75),step)))+'\n'+
      'FORMA la același pas: '+JSON.stringify(String.fromCharCode(...J.shape.slice(Math.max(0,step-75),step)))+'\n\n'+
      (J.mode==='live-training' ? 'LIVE: simboluri trăite în antrenare · '+J.aligned+' predicții AligningGraph CPU · '+J.replay+' predicții C/A în replay CUDA. Nu este o cale globală prezisă înainte.' : 'EVALUARE: traseul albastru este referința observată (teacher forcing), NU execuția unui agent autonom.');
    setStatus('Coordonate învățate pentru '+J.knownGeometry+' simboluri · '+J.errorIndices.length+' erori la evaluarea online · '+J.replans.length+' recalculări înghețate (câteva puncte selectate).');
  }else{
    const action=J.steps?.[i],macro=J.macro||[];
    el('details').textContent=
      'MOTOR CARE A SCRIS TEXTUL: '+J.driver+'\n'+
      '  pas emis: '+step+' / '+J.answerLength+' · caracter: '+(has?human(code):'—')+'\n'+
      '  obiectiv învățat: '+JSON.stringify(J.goal||'nedisponibil')+'\n'+
      '  subprobleme necesare: '+(action?.subproblems??'neînregistrate')+'\n'+
      '  predicție/execuție: '+(action?human(action.predicted?.charCodeAt(0))+' / '+human(action.executed?.charCodeAt(0)):'fără trasare explicită')+'\n'+
      '  transformări susținute de dovezi: '+macro.length+'\n'+
      macro.slice(0,14).map((x,j)=>(j+1)+'. '+x.from+' → '+x.to+' (slot '+x.slot+', dovezi '+x.evidence+')').join('\n')+'\n'+
      '  a doua cale verificată: '+(J.alternatives.length?J.alternatives.length+' transformări':'nu a fost observată')+'\n\n'+
      J.note;
    setStatus('Antrenarea V17 și traseul emis: date reale · '+J.knownGeometry+' poziții de simbol V17 disponibile.');
  }
 }
 const sync=()=>{el('step').max=String(J?.answerLength||1);el('step').value=String(step);render();detail();};
 const setStep=x=>{step=Math.max(0,Math.min(J?.answerLength||0,Math.floor(Number(x)||0)));sync();};
 function loadEvaluation(ex,space){J=fromFrozenEvaluation(ex,space);playing=false;el('play').textContent='▶ Rulează';step=0;el('note').textContent=J.note;sync();}
 function loadChat(reply,space,prompt){J=fromNativeChat(reply,space,prompt);playing=false;el('play').textContent='▶ Rulează';step=0;el('note').textContent=J.note;sync();}
 function loadTraining(steps,space,{follow=true}={}){J=fromLiveTraining(steps,space);el('note').textContent=J.note;if(follow){step=J.answerLength;playing=false;el('play').textContent='▶ Rulează';}else step=Math.min(step,J.answerLength);sync();}
 el('step').addEventListener('input',()=>setStep(el('step').value));
 el('prev').onclick=()=>setStep(step-1);el('next').onclick=()=>setStep(step+1);
 el('play').onclick=()=>{if(!J)return;playing=!playing;el('play').textContent=playing?'⏸ Pauză':'▶ Rulează';if(playing&&step>=J.answerLength)setStep(0);};
 for(const k of ['rot','zoom','slice'])el(k).addEventListener('input',()=>{rot=+el('rot').value;zoom=+el('zoom').value;slice=+el('slice').value;render();});
 el('home').onclick=()=>{offsetX=offsetY=0;rot=.25;zoom=1;slice=1;el('rot').value=String(rot);el('zoom').value=String(zoom);el('slice').value=String(slice);render();};
 el('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else root.requestFullscreen?.();};
 canvas.addEventListener('pointerdown',e=>{hold={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointerup',()=>hold=null);canvas.addEventListener('pointercancel',()=>hold=null);
 canvas.addEventListener('pointermove',e=>{if(hold){offsetX=hold.ox+e.clientX-hold.x;offsetY=hold.oy+e.clientY-hold.y;render();return;}
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const hit=hitPts.find(p=>Math.hypot(p.x-x,p.y-y)<8);
  canvas.title=hit?hit.kind+' · pas '+hit.i+' · '+human(hit.code):'Trage pentru deplasarea camerei';
 });
 let frameLast=0;
 function animate(ts){
   if(!root.isConnected)return;
   if(playing&&J&&ts-frameLast>=+el('speed').value){frameLast=ts;setStep(step+1);
     if(step>=J.answerLength){playing=false;el('play').textContent='▶ Rulează';}}
   if(el('spin').checked&&J){rot+=.006;el('rot').value=String(((rot+Math.PI)%TAU)-Math.PI);render();}
   requestAnimationFrame(animate);
 }
 requestAnimationFrame(animate);
 window.addEventListener('resize',render);
 render();detail();
 return {loadEvaluation,loadChat,loadTraining,setStep,getJourney:()=>J,render};
}
