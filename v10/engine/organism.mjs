// The organism (messages 36–38, 49, 55):
//   E — memory: places every local 3×3 slice into its own internal map, using only its own actions and whether they moved it
//       (proprioception). This is how it "learns to see itself from above" from slices (message 37).
//   F — the shape organ (organ.mjs).
//   D — decoder: the anticipated line (follows the probability field from itself towards the goal), the probability cloud,
//       and the points + connections (message 38.3).
//   Action — imagines the consequence of each of its 4 actions before choosing (message 49), using the predicted shape.
//   Resistance — what it expected vs what the world showed (message 48, 49).
import {ACTIONS,observe,step,teacherShape} from './maze.mjs';
import {FEAT} from './organ.mjs';
export class Memory{
  constructor(n,start,goalRel){this.n=n;this.cells=new Int8Array(n*n).fill(-1);this.pos=start;this.visits=new Uint16Array(n*n);
    const x=start%n,y=(start/n)|0;this.goal=(y+goalRel[1])*n+x+goalRel[0];}
  // E: o_t placed at the position the organism believes it is in (path integration from its own moves).
  // A10 (message 49, operational self): its own action can only move IT; a remembered place that now looks different was changed by the world.
  absorb(o){const n=this.n,x=this.pos%n,y=(this.pos/n)|0,news=[],external=[];let k=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy,v=o.patch[k++];if(X<0||Y<0||X>=n||Y>=n)continue;const i=Y*n+X;if(this.cells[i]===-1)news.push(i);else if(this.cells[i]!==v)external.push(i);this.cells[i]=v;}
    this.visits[this.pos]++;this.external=(this.external||0)+external.length;return {news,external};}
  moveBy(a,moved){if(!moved)return;const n=this.n,[dx,dy]=ACTIONS[a];this.pos+=dy*n+dx;}
  features(){const n=this.n,N=n*n,x=new Float32Array(N*FEAT),sx=this.pos%n,sy=(this.pos/n)|0,gx=this.goal%n,gy=(this.goal/n)|0;
    for(let c=0;c<N;c++){const cx=c%n,cy=(c/n)|0,v=this.cells[c],o=c*FEAT;
      x[o]=v===0?1:0;x[o+1]=v===1?1:0;x[o+2]=v===-1?1:0;x[o+3]=c===this.pos?1:0;x[o+4]=c===this.goal?1:0;
      x[o+5]=(gx-cx)/n;x[o+6]=(gy-cy)/n;x[o+7]=(sx-cx)/n;x[o+8]=(sy-cy)/n;
      // coordinate representation (message 55.3): position relative to itself, also as parity — the rhythm of the places it has seen
      x[o+9]=Math.cos(Math.PI*(cx-sx));x[o+10]=Math.cos(Math.PI*(cy-sy));}
    return x;}}
// D: (Γ̂, U) → anticipated line + cloud + points/connections. The line follows the learned field; nothing here knows the map.
export function decode(mem,p){const n=mem.n,line=[mem.pos],on=new Set(line);let at=mem.pos;
  for(let t=0;t<n*n&&at!==mem.goal;t++){const x=at%n,y=(at/n)|0;let best=-1,bv=-1;
    for(const [dx,dy] of ACTIONS){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=n||Y>=n)continue;const j=Y*n+X;if(mem.cells[j]===1||on.has(j))continue;if(p[j]>bv){bv=p[j];best=j;}}
    if(best<0)break;line.push(best);on.add(best);at=best;}
  const points=[];for(let c=0;c<n*n;c++)if(p[c]>=.5&&mem.cells[c]!==1)points.push(c);
  const links=[];const P=new Set(points);for(const c of points){if(c%n<n-1&&P.has(c+1))links.push([c,c+1]);if(P.has(c+n))links.push([c,c+n]);}
  return {line,reached:at===mem.goal,points,links};}
// Imagination before acting (message 49): consequence of each action, valued by the predicted shape.
export function chooseAction(mem,p,rng=null,explore=0){const n=mem.n,x=mem.pos%n,y=(mem.pos/n)|0,opts=[];
  ACTIONS.forEach(([dx,dy],a)=>{const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=n||Y>=n)return;const j=Y*n+X;const willMove=mem.cells[j]!==1;
    opts.push({a,to:j,willMove,value:willMove?p[j]-.15*Math.min(mem.visits[j],4):-1});});
  if(rng&&rng.next()<explore){const ok=opts.filter(o=>o.willMove);return ok[rng.int(ok.length)]??opts[0];}
  return opts.sort((u,v)=>v.value-u.value)[0];}
// Metrics on a shape against the teacher (evaluation only). The error is measured over the same cells the teacher scores at
// training: every cell the organism does not know to be a wall (an unseen wall is a cell the shape must not pass through).
export function shapeScore(w,mem,p,line){const t=teacherShape(w,mem.pos),N=w.n*w.n;let bce=0,c=0;
  for(let i=0;i<N;i++){if(mem.cells[i]===1)continue;const q=Math.min(.98,Math.max(.02,p[i]));bce+=-(t.y[i]*Math.log(q)+(1-t.y[i])*Math.log(1-q));c++;}
  const onOpt=line.slice(1).filter(i=>t.y[i]).length,valid=line.at(-1)===w.goal&&line.every(i=>!w.wall[i]);
  // precision of the line on SOME optimal route, recall against the optimal length (several valid routes are not penalised)
  const prec=line.length>1?onOpt/(line.length-1):0,rec=t.length?Math.min(1,onOpt/t.length):1;
  return {bce:bce/c,f1:prec+rec?2*prec*rec/(prec+rec):0,valid,lineLen:line.length-1,optimal:t.length,target:t.y};}
export {observe,step};
