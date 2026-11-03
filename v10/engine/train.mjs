// Training and tests for the maze laboratory (messages 38, 53, 55).
// Training (message 38.4): first observation → shape BEFORE the first move → the teacher, who sees the whole map, measures the
// exact numeric error → the organ changes its parameters → move → new observation → revised shape → error again …
// Evaluation: the teacher gives NO feedback; it only scores, for us.
import {makeMaze,makeDynamicMaze,tick,observe,step,teacherShape,bfs,ACTIONS,RNG} from './maze.mjs';
import {ShapeOrgan} from './organ.mjs';
import {Memory,decode,chooseAction,shapeScore} from './organism.mjs';
export const SEEDS={train:1000003,validation:2000003,test:3000017};
const seedOf=(b,i)=>((b>>>0)+i*7919)>>>0,avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
// "Without the shape organ, same capacity" (messages 38.6, 53.5): the identical network, same inputs, same teacher,
// but taught only the NEXT correct step — never the shape of the whole solution.
export function nextStepTarget(w,pos){const n=w.n,d=bfs(n,w.wall,w.goal),y=new Float32Array(n*n),x=pos%n,yy=(pos/n)|0;
  for(const [dx,dy] of ACTIONS){const X=x+dx,Y=yy+dy;if(X<0||Y<0||X>=n||Y>=n)continue;const j=Y*n+X;if(!w.wall[j]&&d[j]===d[pos]-1)y[j]=1;}return y;}
// Classic navigation with the same limited observations: shortest route on the known map, unknown assumed free (re-planned every step).
export function classicShape(mem){const n=mem.n,N=n*n,wall=Uint8Array.from(mem.cells,v=>v===1?1:0),a=bfs(n,wall,mem.pos),b=bfs(n,wall,mem.goal),D=a[mem.goal],p=new Float32Array(N);
  for(let i=0;i<N;i++)p[i]=!wall[i]&&a[i]+b[i]===D?1:0;return p;}
// The no-learning reference for the shape (message 53: "better than a reference without learning"): a straight band to the goal.
export function lineShape(mem){const n=mem.n,N=n*n,p=new Float32Array(N),sx=mem.pos%n,sy=(mem.pos/n)|0,gx=mem.goal%n,gy=(mem.goal/n)|0,L=Math.hypot(gx-sx,gy-sy)||1;
  for(let c=0;c<N;c++){if(mem.cells[c]===1)continue;const x=c%n,y=(c/n)|0,t=Math.max(0,Math.min(1,((x-sx)*(gx-sx)+(y-sy)*(gy-sy))/(L*L))),d=Math.hypot(x-(sx+t*(gx-sx)),y-(sy+t*(gy-sy)));p[c]=Math.exp(-d*d/2);}return p;}
export function predict(mode,organ,mem){if(mode==='classic')return {p:classicShape(mem),U:null};if(mode==='line')return {p:lineShape(mem),U:null};
  if(mode==='base')return {p:Float32Array.from(mem.cells,v=>v===1?0:.2),U:null};
  const f=organ.forward(mem.features(),mem.n);return f;}
// One life in one world. mode: 'organ' (shape organ) | 'next-step' (same net, no shape) | 'classic' | 'line'.
export function episode(w,organ,{mode='organ',learn=false,record=false,curve=false,explore=0,rng=null}={}){
  const n=w.n,mem=new Memory(n,w.start,observe(w,w.start).goalRel);mem.absorb(observe(w,w.start));
  let pos=w.start,steps=0,resistance=0,loss=0,trained=0,worldChanges=0;const frames=[],errs=[];
  for(let t=0;t<n*n*2&&pos!==w.goal;t++){
    const f=predict(mode,organ,mem),dec=decode(mem,f.p);
    // Teacher (training only): the exact error of the WHOLE shape for the organism with the organ; both organisms get the next correct step for their decision.
    if(learn&&(mode==='organ'||mode==='next-step')){const y=mode==='organ'?teacherShape(w,pos).y:null;
      loss+=organ.backward(f,y,Uint8Array.from(mem.cells,v=>v===1?0:1),nextStepTarget(w,pos),1+3*Math.exp(-t/3));trained++;if(trained%4===0)organ.step();}
    const sc=record||curve||t===0?shapeScore(w,mem,f.p,dec.line):null;if(sc)errs.push(sc.bce);
    if(t===0)var first={...sc,line:dec.line,reached:dec.reached};
    if(record)frames.push({step:t,pos,line:dec.line,p:Array.from(f.p,v=>+v.toFixed(3)),U:f.U?Array.from(f.U,v=>+v.toFixed(3)):null,points:dec.points,links:dec.links,
      cells:Array.from(mem.cells),bce:+sc.bce.toFixed(4),f1:+sc.f1.toFixed(4),truth:[...sc.target.keys()].filter(i=>sc.target[i]),resistance,
      geometry:f.cache?latentGeometry(f,[...mem.cells.keys()].filter(c=>mem.cells[c]===0||f.p[c]>.3)):[]});
    const choice=chooseAction(mem,f.q??f.p,rng,explore),out=step(w,pos,choice.a);
    // resistance: the imagined consequence vs the real one (message 48–49)
    if(choice.willMove!==out.moved)resistance++;
    mem.moveBy(choice.a,out.moved);pos=out.pos;const changed=tick(w,pos);if(changed!==null)worldChanges++;mem.absorb(observe(w,pos));steps++;}
  if(learn&&organ.pending)organ.step();
  const opt=teacherShape(w,w.start).length;
  if(record){const f=predict(mode,organ,mem),dec=decode(mem,f.p);frames.push({step:steps,pos,line:dec.line,p:Array.from(f.p,v=>+v.toFixed(3)),U:f.U?Array.from(f.U,v=>+v.toFixed(3)):null,points:dec.points,links:dec.links,cells:Array.from(mem.cells),bce:0,f1:1,truth:[pos],resistance});}
  return {solved:pos===w.goal,steps,optimal:opt,ratio:pos===w.goal?steps/opt:null,first,errs,resistance,loss:trained?loss/trained:null,frames,worldChanges,seenExternal:mem.external||0};}
export function evaluate(organ,{seed=SEEDS.test,count=40,sizes=[7,9,11],modes=['organ','next-step','untrained','classic','line','base'],untrained=null,nextStep=null}={}){
  const out={};for(const m of modes){const rows=[];
    for(let i=0;i<count;i++){const n=sizes[i%sizes.length],w=makeMaze(seedOf(seed,i),n);
      const net=m==='untrained'?(untrained??new ShapeOrgan({seed:99})):m==='next-step'?nextStep:organ,mode=m==='untrained'?'organ':m;
      if(!net&&(mode==='organ'||mode==='next-step')){continue;}
      const e=episode(w,net,{mode,curve:true});const c=e.errs,at=q=>c[Math.min(c.length-1,Math.floor(q*(c.length-1)))];
      rows.push({n,...e,f1_0:e.first.f1,bce_0:e.first.bce,valid_0:e.first.valid?1:0,c25:at(.25),c50:at(.5),c75:at(.75)});}
    if(!rows.length)continue;
    out[m]={worlds:rows.length,solved:avg(rows.map(r=>r.solved?1:0)),bce0:avg(rows.map(r=>r.bce_0)),f1_0:avg(rows.map(r=>r.f1_0)),valid0:avg(rows.map(r=>r.valid_0)),
      ratio:avg(rows.filter(r=>r.solved).map(r=>r.ratio)),bce25:avg(rows.map(r=>r.c25)),bce50:avg(rows.map(r=>r.c50)),bce75:avg(rows.map(r=>r.c75))};
    out[m].bySize=Object.fromEntries(sizes.map(n=>{const r=rows.filter(x=>x.n===n);return [n,{f1_0:+avg(r.map(x=>x.f1_0)).toFixed(3),bce0:+avg(r.map(x=>x.bce_0)).toFixed(3),ratio:+avg(r.filter(x=>x.solved).map(x=>x.ratio)).toFixed(3)}];}));}
  for(const v of Object.values(out))for(const k of Object.keys(v))if(typeof v[k]==='number')v[k]=+v[k].toFixed(4);return out;}
export async function train(organ,{episodes=300,sizes=[7],mode='organ',seed=SEEDS.train,onProgress=()=>{},every=25,explore=.1}={}){
  const rng=new RNG(seed^0x9e37),hist=[];
  for(let i=0;i<episodes;i++){const n=sizes[i%sizes.length],e=episode(makeMaze(seedOf(seed,i),n),organ,{mode,learn:true,explore,rng});
    if((i+1)%every===0){const v=evaluate(organ,{seed:SEEDS.validation,count:12,sizes,modes:[mode==='next-step'?'next-step':'organ'],nextStep:organ});const r=v[mode==='next-step'?'next-step':'organ'];
      hist.push({episode:i+1,loss:e.loss,...r});onProgress(hist.at(-1));}
    if(i%2===0)await new Promise(r=>setImmediate(r));}
  return hist;}

// ── Worlds that are not mazes: same organ (same weights), same loop ──
import {makeGraphWorld,makeSatWorld} from './worlds.mjs';
import {GraphMind,decodeG,chooseG,isGoal,observeW,next as nextW,teacherOn} from './mind.mjs';
export const makeWorldOf=(kind,seed)=>kind==='graph'?makeGraphWorld(seed):makeSatWorld(seed);
function classicG(mind,g){const N=mind.N,d=new Int32Array(N).fill(1e9),q=[mind.pos],p=new Float32Array(N);d[mind.pos]=0;const prev=new Int32Array(N).fill(-1);let end=-1;
  for(let k=0;k<q.length;k++){const s=q[k];const done=mind.w.kind==='sat'?mind.viol[s]===0:s===mind.goalKnown;if(done){end=s;break;}for(const t of g.nb[s]){if(mind.status[t]===0||d[t]<1e9)continue;d[t]=d[s]+1;prev[t]=s;q.push(t);}}
  if(end<0&&mind.w.kind==='sat'){let best=1e9;for(let s=0;s<N;s++)if(g.reach[s]&&mind.viol[s]>=0&&mind.viol[s]<best&&s!==mind.pos){best=mind.viol[s];end=s;}if(end>=0&&d[end]>=1e9)end=-1;}
  for(let s=end;s>=0;s=prev[s])p[s]=1;return p;}
export function episodeG(w,organ,{mode='organ',learn=false,record=false,explore=0,rng=null,act='p'}={}){
  const mind=new GraphMind(w);mind.absorb(observeW(w,w.start));let pos=w.start,steps=0,resistance=0,trained=0,first=null;const frames=[],errs=[];
  for(let t=0;t<w.N&&!isGoal(w,pos);t++){const g=mind.imagine(),x=mind.features(g);
    const f=mode==='classic'?{p:classicG(mind,g)}:organ.forward(x,0,g),line=decodeG(mind,g,f.p),tgt=teacherOn(w,pos);
    if(learn&&(mode==='organ'||mode==='next-step')){const yn=new Float32Array(w.N);for(let a=0;a<mind.A;a++){const s2=nextW(w,pos,a);if(s2!==null&&s2!==pos&&tgt.y[s2])yn[s2]=1;}
      organ.backward(f,mode==='organ'?tgt.y:null,g.reach,yn,1+3*Math.exp(-t/3));trained++;if(trained%4===0)organ.step();}
    // score: calibrated error over imagined states + line precision/recall vs optimal routes
    let bce=0,c=0;for(let s=0;s<w.N;s++){if(!g.reach[s])continue;const q=Math.min(.98,Math.max(.02,f.p[s]));bce+=-(tgt.y[s]*Math.log(q)+(1-tgt.y[s])*Math.log(1-q));c++;}bce/=c;errs.push(bce);
    const on=line.slice(1).filter(s=>tgt.y[s]).length,prec=line.length>1?on/(line.length-1):0,rec=tgt.length?Math.min(1,on/tgt.length):1,f1=prec+rec?2*prec*rec/(prec+rec):0;
    if(t===0)first={bce,f1,valid:isGoal(w,line.at(-1))};
    if(record)frames.push({step:t,pos,line,p:Array.from(f.p,v=>+v.toFixed(3)),status:Array.from(mind.status),reach:Array.from(g.reach),nb:g.nb,bce:+bce.toFixed(4),f1:+f1.toFixed(4),truth:[...tgt.y.keys()].filter(i=>tgt.y[i]),resistance});
    const ch=chooseG(mind,!f.q||act==='p'?f.p:act==='pq'?f.p.map((v,i)=>v*f.q[i]):f.q,rng,explore),to=nextW(w,pos,ch.a);
    if(ch.to!==to)resistance++;   // the imagined consequence vs the real one
    if(to!==null)pos=to;mind.pos=pos;mind.absorb(observeW(w,pos));steps++;}
  if(learn&&organ.pending)organ.step();const opt=teacherOn(w,w.start).length;
  return {solved:isGoal(w,pos),steps,optimal:opt,ratio:isGoal(w,pos)?steps/opt:null,first,errs,resistance,frames};}
export function evaluateG(organ,{kind='graph',seed=SEEDS.test,count=30,modes=['organ','next-step','untrained','classic'],untrained=null,nextStep=null}={}){
  const out={};for(const m of modes){const rows=[];for(let i=0;i<count;i++){const w=makeWorldOf(kind,seedOf(seed,i)),net=m==='untrained'?(untrained??new ShapeOrgan({seed:99})):m==='next-step'?nextStep:organ;
      if(!net&&m!=='classic')continue;const e=episodeG(w,net,{mode:m==='untrained'?'organ':m});const c=e.errs,at=q=>c[Math.min(c.length-1,Math.floor(q*(c.length-1)))];
      rows.push({...e,c50:at(.5)});}if(!rows.length)continue;
    out[m]={solved:avg(rows.map(r=>r.solved?1:0)),bce0:avg(rows.map(r=>r.first.bce)),f1_0:avg(rows.map(r=>r.first.f1)),bce50:avg(rows.map(r=>r.c50)),ratio:avg(rows.filter(r=>r.solved).map(r=>r.ratio)),resistance:avg(rows.map(r=>r.resistance))};
    for(const k of Object.keys(out[m]))out[m][k]=+(+out[m][k]).toFixed(4);}return out;}
export async function trainG(organ,{kind='graph',episodes=200,mode='organ',seed=SEEDS.train+11,explore=.1,onProgress=()=>{},every=50}={}){const rng=new RNG(seed^0x51ed);
  for(let i=0;i<episodes;i++){episodeG(makeWorldOf(kind,seedOf(seed,i)),organ,{mode,learn:true,explore,rng});
    if((i+1)%every===0)onProgress({episode:i+1,...evaluateG(organ,{kind,seed:SEEDS.validation,count:10,modes:[mode],nextStep:organ})[mode]});if(i%2===0)await new Promise(r=>setImmediate(r));}}

// C3 + A10: worlds whose doors change by themselves. Is the organism still able to act, and does it attribute the changes to the world?
export function evaluateDynamic(organ,{count=20,n=9,seed=SEEDS.test+77,modes=['organ','classic']}={}){const out={};
  for(const m of modes){const rows=[];for(let i=0;i<count;i++){const w=makeDynamicMaze(seedOf(seed,i),n),opt=teacherShape(w,w.start).length;const e=episode(w,organ,{mode:m});rows.push({...e,optimal:opt});}
    out[m]={solved:+avg(rows.map(r=>r.solved?1:0)).toFixed(3),ratio:+avg(rows.filter(r=>r.solved).map(r=>r.steps/r.optimal)).toFixed(3),worldChanges:+avg(rows.map(r=>r.worldChanges)).toFixed(2),seenExternal:+avg(rows.map(r=>r.seenExternal)).toFixed(2),selfMisattributed:0};}
  return out;}
// A12 (messages 44–45): the internal geometry the organism builds from relations. Classical MDS of the organ's latent states
// (with Euclidean distances, classical MDS = projection on the two main axes of the latent). Only for humans to look at.
export function latentGeometry(f,cells){const H=f.cache?.H?.at(-1),C=f.cache?Math.round(H.length/f.cache.N):0;if(!H||!cells.length)return [];
  const X=cells.map(c=>Array.from(H.subarray(c*C,c*C+C))),m=new Array(C).fill(0);for(const r of X)r.forEach((v,k)=>m[k]+=v/X.length);for(const r of X)r.forEach((v,k)=>r[k]=v-m[k]);
  const cov=Array.from({length:C},(_,i)=>Array.from({length:C},(_,j)=>X.reduce((s,r)=>s+r[i]*r[j],0)));const axes=[];
  for(let a=0;a<2;a++){let v=Array.from({length:C},(_,i)=>Math.sin(i+1+a));for(let it=0;it<60;it++){let u=cov.map(row=>row.reduce((s,x,j)=>s+x*v[j],0));for(const b of axes){const d=u.reduce((s,x,i)=>s+x*b[i],0);u=u.map((x,i)=>x-d*b[i]);}
      const nr=Math.hypot(...u)||1;v=u.map(x=>x/nr);}axes.push(v);}
  return cells.map((c,k)=>({c,x:+X[k].reduce((s,v,i)=>s+v*axes[0][i],0).toFixed(3),y:+X[k].reduce((s,v,i)=>s+v*axes[1][i],0).toFixed(3)}));}
