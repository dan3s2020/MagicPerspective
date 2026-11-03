// V6 worlds. The hidden truth (heights, walls, costs) lives only here.
// The organism receives: its position, the goal position, a 3x3 window of exact terrain,
// and a coarse HORIZON: in 8 directions, the highest relief seen near / mid / far (like a sailor seeing mountains, not the map).
export class RNG{constructor(seed=1){this.s=(seed>>>0)||1;}
  next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}
  int(n){return Math.floor(this.next()*n);}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}}
export const WALL=.82;
// 16 compass directions (angle, unit step); rays are sampled continuously and rounded to cells.
export const DIRS=Array.from({length:16},(_,k)=>[Math.cos(k*Math.PI/8),Math.sin(k*Math.PI/8)]);
export const BANDS=[[2,3],[4,6],[7,99]];
export const KINDS=['relief','maze','braided'];
export const costOf=h=>h>WALL?Infinity:1+8*h;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export function neighbors(n,i){const x=i%n,y=(i/n)|0,out=[];if(x>0)out.push(i-1);if(x<n-1)out.push(i+1);if(y>0)out.push(i-n);if(y<n-1)out.push(i+n);return out;}
// Exact shortest path on a height map (cost to ENTER a cell). Used by the evaluator on the true map
// and by the organism on its OWN imagined map.
export function shortest(n,heights,from,to,costFn=costOf){const N=n*n,d=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);
  d[from]=0;const heap=[[0,from]];
  const push=(k,v)=>{heap.push([k,v]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=k)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let c=2*i+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=heap[i][0])break;[heap[c],heap[i]]=[heap[i],heap[c]];i=c;}}return top;};
  while(heap.length){const [k,u]=pop();if(done[u])continue;done[u]=1;if(u===to)break;
    for(const v of neighbors(n,u)){const c=costFn(heights[v],v);if(!Number.isFinite(c))continue;if(k+c<d[v]){d[v]=k+c;prev[v]=u;push(d[v],v);}}}
  if(!Number.isFinite(d[to]))return {cells:[],cost:Infinity};
  const cells=[to];let a=to;while(a!==from){a=prev[a];cells.push(a);}return {cells:cells.reverse(),cost:d[to]};}
function maze(rng,n){const h=new Float64Array(n*n).fill(1),stack=[n+1];h[n+1]=0;
  while(stack.length){const i=stack.at(-1),x=i%n,y=(i/n)|0;let carved=false;
    for(const [dx,dy] of rng.shuffle([[2,0],[-2,0],[0,2],[0,-2]])){const xx=x+dx,yy=y+dy;if(xx<=0||yy<=0||xx>=n-1||yy>=n-1||h[yy*n+xx]===0)continue;
      h[(y+dy/2)*n+x+dx/2]=0;h[yy*n+xx]=0;stack.push(yy*n+xx);carved=true;break;}
    if(!carved)stack.pop();}
  return h;}
function relief(rng,n){const h=new Float64Array(n*n),hills=Array.from({length:4+rng.int(4)},()=>({x:rng.next()*n,y:rng.next()*n,r:n*(.1+.17*rng.next()),a:.55+.6*rng.next()}));
  for(let i=0;i<n*n;i++){const x=i%n,y=(i/n)|0;let v=.04*rng.next();for(const m of hills)v+=m.a*Math.exp(-((x-m.x)**2+(y-m.y)**2)/(2*m.r*m.r));h[i]=clip(v,0,1);}
  return h;}
export function makeWorld(seed=1,kind='relief',n=15){
  if(!KINDS.includes(kind))throw Error('Unknown world kind');if(!Number.isInteger(n)||n<7||n>25||n%2!==1)throw Error('Size must be odd 7..25');
  const rng=new RNG(seed);let h,start,goal;
  for(let attempt=0;attempt<50;attempt++){
    if(kind==='maze'||kind==='braided'){h=maze(rng,n);
      // braided: a perfect maze with some walls knocked out between corridors → loops and alternative routes
      if(kind==='braided')for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=y*n+x;if(h[i]===1&&rng.next()<.3&&((h[i-1]===0&&h[i+1]===0)||(h[i-n]===0&&h[i+n]===0)))h[i]=0;}const floor=[...h.keys()].filter(i=>h[i]===0);start=floor[rng.int(floor.length)];
      const all=new Float64Array(n*n).fill(Infinity);{const q=[start];all[start]=0;for(let k=0;k<q.length;k++)for(const v of neighbors(n,q[k]))if(h[v]===0&&all[v]===Infinity){all[v]=all[q[k]]+1;q.push(v);}}
      goal=floor.reduce((b,i)=>all[i]>all[b]&&Number.isFinite(all[i])?i:b,start);}
    else{h=relief(rng,n);const vertical=rng.next()<.5,flip=rng.next()<.5,side=k=>{const t=1+rng.int(n-2),e=k?n-1:0;return vertical?e*n+t:t*n+e;};
      start=side(flip?1:0);goal=side(flip?0:1);h[start]=Math.min(h[start],.3);h[goal]=Math.min(h[goal],.3);}
    if(start!==goal&&Number.isFinite(shortest(n,h,start,goal).cost))break;
  }
  return {seed,kind,n,h,start,goal};}
export const truthRoute=(w,from=w.start)=>shortest(w.n,w.h,from,w.goal);
export function windowOf(n,p){const x=p%n,y=(p/n)|0,out=[];for(let yy=Math.max(0,y-1);yy<=Math.min(n-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(n-1,x+1);xx++)out.push(yy*n+xx);return out;}
// Horizon: for each of 8 directions and 3 distance bands, the highest relief along the ray. No positions, only "how high, which way, roughly how far".
export function horizon(w,p){const n=w.n,x0=p%n,y0=(p/n)|0,out=[];
  for(const [dx,dy] of DIRS)for(const [a,b] of BANDS){let m=0,seen=0;for(let k=a;k<=b;k++){const x=Math.round(x0+dx*k),y=Math.round(y0+dy*k);if(x<0||y<0||x>=n||y>=n)break;m=Math.max(m,w.h[y*n+x]);seen++;}out.push(seen?m:-1);}
  return out;}
export function sense(w,p){return {position:p,window:windowOf(w.n,p).map(i=>({i,h:w.h[i]})),horizon:horizon(w,p)};}
