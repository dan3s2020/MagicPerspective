// World C1/C2 (messages 38, 55): procedural 2D maze, several valid routes, 3×3 local window, 4 actions.
// The full map belongs to the world and to the evaluator only.
export class RNG{constructor(s=1){this.s=(s>>>0)||1;}next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}int(n){return Math.floor(this.next()*n);}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}}
export const ACTIONS=[[0,-1],[1,0],[0,1],[-1,0]];   // up, right, down, left
export function makeMaze(seed,n=7,{braid=.3}={}){
  if(!Number.isInteger(n)||n<5||n%2!==1)throw Error('odd size >= 5');
  const r=new RNG(seed),wall=new Uint8Array(n*n).fill(1),st=[n+1];wall[n+1]=0;
  while(st.length){const i=st.at(-1),x=i%n,y=(i/n)|0;let moved=false;
    for(const [dx,dy] of r.shuffle(ACTIONS.slice())){const X=x+2*dx,Y=y+2*dy;if(X<1||Y<1||X>n-2||Y>n-2||!wall[Y*n+X])continue;wall[(y+dy)*n+x+dx]=0;wall[Y*n+X]=0;st.push(Y*n+X);moved=true;break;}
    if(!moved)st.pop();}
  // several valid routes (message 38: a valid route must not be penalised for differing from the teacher's)
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=y*n+x;if(wall[i]&&r.next()<braid&&((!wall[i-1]&&!wall[i+1])||(!wall[i-n]&&!wall[i+n])))wall[i]=0;}
  const floor=[...wall.keys()].filter(i=>!wall[i]);let start,goal,tries=0;
  do{start=floor[r.int(floor.length)];goal=floor[r.int(floor.length)];tries++;}while((bfs(n,wall,start)[goal]<n||start===goal)&&tries<200);
  return {seed,n,wall,start,goal};}
export function bfs(n,wall,from){const d=new Int32Array(n*n).fill(1e9),q=[from];d[from]=0;
  for(let k=0;k<q.length;k++){const i=q[k],x=i%n,y=(i/n)|0;for(const [dx,dy] of ACTIONS){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=n||Y>=n)continue;const j=Y*n+X;if(wall[j]||d[j]<1e9)continue;d[j]=d[i]+1;q.push(j);}}return d;}
// Teacher (message 38: BFS/A*): every cell lying on SOME shortest route — all valid optimal routes, not one.
export function teacherShape(w,from){const a=bfs(w.n,w.wall,from),b=bfs(w.n,w.wall,w.goal),D=a[w.goal],y=new Float32Array(w.n*w.n);
  for(let i=0;i<y.length;i++)if(!w.wall[i]&&a[i]+b[i]===D)y[i]=1;return {y,length:D};}
// What the organism receives (message 38 table): local 3×3, whether its own action moved it (proprioception),
// and the goal's position relative to itself. Never the map.
export function observe(w,pos){const n=w.n,x=pos%n,y=(pos/n)|0,patch=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;patch.push(X<0||Y<0||X>=n||Y>=n?1:w.wall[Y*n+X]);}
  return {patch,goalRel:[(w.goal%n)-x,((w.goal/n)|0)-y]};}
export function step(w,pos,a){const n=w.n,x=pos%n,y=(pos/n)|0,[dx,dy]=ACTIONS[a],X=x+dx,Y=y+dy;
  if(X<0||Y<0||X>=n||Y>=n||w.wall[Y*n+X])return {pos,moved:false};return {pos:Y*n+X,moved:true};}
// C3 (message 38.5): 2D worlds with changing rules — some doors open and close by themselves, independently of the organism.
export function makeDynamicMaze(seed,n=9){const w=makeMaze(seed,n),r=new RNG(seed^0xd00d);w.dynamic=true;w.rng=r;w.doors=[];
  for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=y*n+x;if((x%2)!==(y%2))w.doors.push(i);}return w;}
export function tick(w,pos){if(!w.dynamic||w.rng.next()>.35)return null;const r=w.rng,i=w.doors[r.int(w.doors.length)];if(i===pos||i===w.goal)return null;
  w.wall[i]^=1;if(bfs(w.n,w.wall,pos)[w.goal]>=1e9){w.wall[i]^=1;return null;}return i;}
