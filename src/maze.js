// MagicPerspective: environment truth never enters the organism's feature builder.
export class RNG {
  constructor(seed = 1) { this.state = (seed >>> 0) || 1; }
  next() { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 4294967296; }
  int(n) { return Math.floor(this.next() * n); }
  shuffle(a) { for(let i = a.length-1; i>0; i--){const j=this.int(i+1); [a[i],a[j]]=[a[j],a[i]];} return a; }
}
export const neighbors = (i,n) => {
  const x=i%n,y=Math.floor(i/n), a=[];
  if(y>0) a.push(i-n);
  if(x<n-1) a.push(i+1);
  if(y<n-1) a.push(i+n);
  if(x>0) a.push(i-1);
  return a;
};
export function shortestPath(cells,n,start,goal) {
  const parent = new Int32Array(n*n).fill(-1), queue = new Int32Array(n*n);
  let h=0,t=0; queue[t++]=start; parent[start]=start;
  while(h<t){const i=queue[h++]; if(i===goal)break;
    for(const j of neighbors(i,n)){if(cells[j]!==1&&parent[j]===-1){parent[j]=i;queue[t++]=j;}}
  }
  if(parent[goal]===-1)return [];
  const path=[];let k=goal;while(k!==start){path.push(k); k=parent[k];}path.push(start); return path.reverse();
}
function farthest(cells,n,seed){
  const dist=new Int32Array(n*n).fill(-1),q=[seed];dist[seed]=0;let best=seed;
  for(let h=0;h<q.length;h++){const i=q[h];if(dist[i]>dist[best])best=i;
    for(const j of neighbors(i,n)) if(cells[j]===0&&dist[j]<0){dist[j]=dist[i]+1;q.push(j);}}
  return {best,distance:dist[best]};
}
export function makeMaze(seed=1, n=11) {
  if(n<7||n>21||n%2!==1)throw Error('Maze width must be an odd number between 7 and 21.');
  const rng=new RNG(seed),cells=new Array(n*n).fill(1),stack=[n+1];cells[n+1]=0;
  while(stack.length){const i=stack[stack.length-1],x=i%n,y=Math.floor(i/n);
    const dirs=rng.shuffle([[2,0],[-2,0],[0,2],[0,-2]]);
    let moved=false;
    for(const [dx,dy] of dirs){const xx=x+dx,yy=y+dy;
      if(xx<=0||xx>=n-1||yy<=0||yy>=n-1)continue;
      const j=yy*n+xx;if(cells[j]!==1)continue;
      cells[(y+dy/2)*n+x+dx/2]=0;cells[j]=0;stack.push(j);moved=true;break;
    }
    if(!moved)stack.pop();
  }
  // Add loops to avoid learning a single DFS topology.
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
    const i=y*n+x;if(cells[i]===1&&rng.next() < 0.13 &&
      ((cells[i-1]===0&&cells[i+1]===0)||(cells[i-n]===0&&cells[i+n]===0))) cells[i]=0;
  }
  const floors=[];for(let i=0;i<cells.length;i++)if(cells[i]===0)floors.push(i);
  let start=floors[rng.int(floors.length)],goal=start;
  // Vary start and goal; keep them sufficiently far apart.
  for(let attempt=0;attempt<8;attempt++){
    start=floors[rng.int(floors.length)];goal=farthest(cells,n,start).best;
    if(shortestPath(cells,n,start,goal).length>=n)break;
  }
  return {seed,n,cells,start,goal};
}
export function blankBelief(n){return new Array(n*n).fill(-1);}
export function observe(world,belief,position,radius=1){
  const {n,cells}=world,x=position%n,y=Math.floor(position/n);let changed=0;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const xx=x+dx,yy=y+dy;if(xx<0||xx>=n||yy<0||yy>=n)continue;
    const i=yy*n+xx;if(belief[i]!==cells[i]){changed++;belief[i]=cells[i];}
  }
  return changed;
}
export function revealAt(world,steps=[]){const b=blankBelief(world.n);for(const pos of steps)observe(world,b,pos);return b;}
export function pathMask(path,n){const a=new Array(n*n).fill(0);for(const p of path)a[p]=1;return a;}
