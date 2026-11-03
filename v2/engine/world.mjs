// The environment owns hidden truth; no learner API exposes the hidden maze.
export class RNG {
  constructor(seed=1){this.s=(seed>>>0)||1}
  next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296}
  int(n){return Math.floor(this.next()*n)}
  shuffle(items){for(let i=items.length-1;i>0;i--){const j=this.int(i+1);[items[i],items[j]]=[items[j],items[i]];}return items}
}
export function neighbors(index,n){const x=index%n,y=Math.floor(index/n);const a=[];if(y>0)a.push(index-n);if(x<n-1)a.push(index+1);if(y<n-1)a.push(index+n);if(x>0)a.push(index-1);return a}
export const COSTS=[1,1.8,3.4];
export function makeWorld(seed=1,n=11,family='branched'){
 if(!Number.isInteger(n)||n<7||n>21||n%2!==1)throw Error('World size must be odd 7..21');
 if(!['branched','braided','rooms'].includes(family))throw Error('Invalid family');
 const rng=new RNG(seed),walls=Array(n*n).fill(1),stack=[n+1];walls[n+1]=0;
 while(stack.length){const i=stack[stack.length-1],x=i%n,y=Math.floor(i/n);let advanced=false;
  for(const [dx,dy] of rng.shuffle([[2,0],[-2,0],[0,2],[0,-2]])){
   const xx=x+dx,yy=y+dy;if(xx<=0||yy<=0||xx>=n-1||yy>=n-1||walls[yy*n+xx]!==1)continue;
   walls[(y+dy/2)*n+x+dx/2]=0;walls[yy*n+xx]=0;stack.push(yy*n+xx);advanced=true;break;
  }
  if(!advanced)stack.pop();
 }
 const loopRate=family==='braided'?.39:family==='rooms'?.23:.055;
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
  const i=y*n+x;if(walls[i]===1 && rng.next()<loopRate &&
  ((walls[i-1]===0&&walls[i+1]===0)||(walls[i-n]===0&&walls[i+n]===0)))walls[i]=0;
 }
 if(family==='rooms')for(let k=0;k<Math.max(2,Math.floor(n/3));k++){
  const x=1+rng.int(n-3),y=1+rng.int(n-3);for(let j=y;j<=Math.min(y+1,n-2);j++)for(let i=x;i<=Math.min(x+1,n-2);i++)walls[j*n+i]=0;
 }
 const material=walls.map(w=>w?0:(rng.next()<.18?2:rng.next()<.38?1:0));
 const floors=walls.map((v,i)=>v?null:i).filter(v=>v!==null);
 const start=floors[rng.int(floors.length)];
 const lengths=new Array(n*n).fill(Infinity);lengths[start]=0;const queue=[start];
 for(let h=0;h<queue.length;h++){const x=queue[h];for(const j of neighbors(x,n))if(!walls[j]&&!Number.isFinite(lengths[j])){lengths[j]=lengths[x]+1;queue.push(j)}}
 const candidates=floors.slice().sort((a,b)=>lengths[b]-lengths[a]);const goal=candidates[rng.int(Math.min(candidates.length,5))];
 return {seed,n,family,walls,material,start,goal};
}
export function shortestPath(world,from=world.start,to=world.goal){
 const {n,walls,material}=world,N=n*n,dist=Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),seen=new Uint8Array(N);dist[from]=0;
 for(let z=0;z<N;z++){
  let i=-1,best=Infinity;for(let j=0;j<N;j++)if(!seen[j]&&dist[j]<best){i=j;best=dist[j]}
  if(i<0||i===to)break;seen[i]=1;
  for(const j of neighbors(i,n)){if(walls[j])continue;const d=dist[i]+COSTS[material[j]];if(d<dist[j]){dist[j]=d;prev[j]=i}}
 }
 if(!Number.isFinite(dist[to]))return {path:[],cost:Infinity};
 const path=[to];let k=to;while(k!==from){k=prev[k];if(k<0)return {path:[],cost:Infinity};path.push(k)}return {path:path.reverse(),cost:dist[to]};
}
export function observe(world,position,belief){
 const {n}=world,x=position%n,y=Math.floor(position/n),changed=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const xx=x+dx,yy=y+dy;if(xx<0||xx>=n||yy<0||yy>=n)continue;
  const j=yy*n+xx,value=world.walls[j]?1:0,mat=value?0:world.material[j];
  if(belief.walls[j]!==value||belief.material[j]!==mat)changed.push(j);
  belief.walls[j]=value;belief.material[j]=mat;
 }
 return changed;
}
export function blankBelief(n){return {walls:Array(n*n).fill(-1),material:Array(n*n).fill(-1),visits:Array(n*n).fill(0)}}
export function execute(world,position,next){
 if(!neighbors(position,world.n).includes(next))return {type:'invalid',position,effort:0};
 if(world.walls[next])return {type:'blocked',position,effort:0};
 return {type:'moved',position:next,effort:COSTS[world.material[next]]};
}
export function mask(path,n){const out=new Array(n*n).fill(0);for(const i of path)out[i]=1;return out}
