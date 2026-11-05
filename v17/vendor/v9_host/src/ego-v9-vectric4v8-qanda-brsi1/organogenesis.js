import {dirsForWorld,key,occupiedMap,worldDimension} from "./world.js";

const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function phaseDiff(a,b){let d=Math.abs(a-b)%TAU;if(d>Math.PI)d=TAU-d;return d;}
function dominant(cell){
  if(!cell?.real?.length)return{band:0,phase:0,amp:0};
  let band=0,amp=-1;for(let i=0;i<cell.real.length;i++){const m=Math.hypot(cell.real[i]||0,cell.imag[i]||0);if(m>amp){amp=m;band=i;}}
  return{band,phase:Math.atan2(cell.imag[band]||0,cell.real[band]||0),amp:Math.max(0,amp)};
}
function jaccard(a,b){const A=new Set(a),B=new Set(b);let inter=0;for(const x of A)if(B.has(x))inter++;return inter/Math.max(1,A.size+B.size-inter);}
function chooseRole(cells,world,cortical,echo){
  let motor=0,sensory=0,coord=0;
  for(const i of cells){
    const r=world.egoRuntime?.[i],c=cortical?.cells?.[i],e=echo?.last?.[i];
    motor+=Math.abs(r?.lastGlobalDx||0)+Math.abs(r?.lastGlobalDy||0)+Math.abs(r?.lastGlobalDz||0);
    sensory+=Number(e?.energy)||0;
    coord+=Math.max(0,Number(c?.boost)||0)+.5*Math.max(0,Number(c?.need)||0)+.25*Math.max(0,Number(c?.have)||0);
  }
  const n=Math.max(1,cells.length);motor/=n;sensory/=n;coord/=n;
  const m=Math.max(motor,sensory,coord);
  if(m<.08)return"latent";
  if(m===sensory&&sensory>motor*1.2)return"sensory";
  if(m===coord&&coord>motor*1.2)return"coordination";
  if(m===motor&&motor>sensory*1.2)return"motor";
  return"mixed";
}
function physicalEdges(world){
  const occ=occupiedMap(world.cubes),out=[];
  for(let i=0;i<world.cubes.length;i++){
    const p=world.cubes[i];
    for(const[dx,dy,dz]of dirsForWorld(world)){
      const j=occ.get(key(p.x+dx,p.y+dy,(p.z||0)+dz));if(j===undefined||j<=i)continue;out.push([i,j]);
    }
  }
  return out;
}
export function createOrganSystem(){return{version:1,nextId:1,organs:[],edges:[],updates:0,history:[]};}
export function updateOrgans(sys,world,cortical,echo,specialistIds=[],spatial=null){
  const sig=world.cubes.map((_,i)=>dominant(cortical?.cells?.[i])),edges=[];
  for(const[i,j]of physicalEdges(world)){
    const a=sig[i],b=sig[j],sameBand=a.band===b.band?1:0,phase=1-clamp(phaseDiff(a.phase,b.phase)/Math.PI,0,1),spec=(specialistIds[i]??-1)===(specialistIds[j]??-2)?1:0;
    const ca=cortical?.cells?.[i],cb=cortical?.cells?.[j],needHave=1-clamp(Math.abs((ca?.need||0)-(cb?.have||0))*.5+Math.abs((cb?.need||0)-(ca?.have||0))*.5,0,1);
    const score=.30+.30*sameBand*phase+.20*spec+.20*needHave;
    if(score>=.48)edges.push({a:i,b:j,score,band:sameBand?a.band:null,phaseCoherence:phase});
  }
  const adj=Array.from({length:world.cubes.length},()=>[]);
  for(const e of edges){adj[e.a].push(e.b);adj[e.b].push(e.a);}
  const seen=new Set(),groups=[];
  for(let i=0;i<world.cubes.length;i++){
    if(seen.has(i))continue;const g=[],q=[i];seen.add(i);
    for(let h=0;h<q.length;h++){const a=q[h];g.push(a);for(const b of adj[a])if(!seen.has(b)){seen.add(b);q.push(b);}}
    groups.push(g);
  }
  const previous=sys.organs||[],usedPrev=new Set(),organs=[];
  for(const cells of groups){
    let best=null,bestJ=0;for(const p of previous){if(usedPrev.has(p.id))continue;const j=jaccard(cells,p.cells||[]);if(j>bestJ){bestJ=j;best=p;}}
    const id=bestJ>=.34&&best?(usedPrev.add(best.id),best.id):sys.nextId++,bands=new Map();let coh=0,cohN=0;
    for(const i of cells){const q=sig[i];bands.set(q.band,(bands.get(q.band)||0)+q.amp);}
    for(const e of edges)if(cells.includes(e.a)&&cells.includes(e.b)){coh+=e.phaseCoherence;cohN++;}
    const dominantBand=[...bands.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??0;
    let cx=0,cy=0,cz=0,known=0;for(const i of cells){const p=spatial?.poses?.[i];if(p){cx+=p.x;cy+=p.y;cz+=p.z;known++;}}
    organs.push({id,cells:[...cells],size:cells.length,role:chooseRole(cells,world,cortical,echo),dominantBand,phaseCoherence:cohN?coh/cohN:0,internalCenter:known?{x:cx/known,y:cy/known,z:cz/known}:null,specialists:[...new Set(cells.map(i=>specialistIds[i]??0))]});
  }
  sys.organs=organs;sys.edges=edges;sys.updates++;
  sys.history.push({step:world.globalStep,count:organs.length,sizes:organs.map(o=>o.size),roles:organs.map(o=>o.role)});if(sys.history.length>128)sys.history.shift();
  return organs;
}
export function organForCell(sys,index){return sys?.organs?.find(o=>o.cells.includes(index))||null;}
export function organSnapshot(sys){return{version:sys.version,updates:sys.updates,organs:(sys.organs||[]).map(o=>({...o,cells:[...o.cells],specialists:[...o.specialists],internalCenter:o.internalCenter?{...o.internalCenter}:null})),edges:(sys.edges||[]).map(e=>({...e})),history:(sys.history||[]).slice(-32).map(x=>structuredClone(x))};}
