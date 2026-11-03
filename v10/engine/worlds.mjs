// Worlds C4 and C5 (messages 49, 53, 55): not mazes. Same loop: observation → perspective → anticipated shape → action → consequence → correction.
//   'graph'  — a world of states with OTHER transformation rules: states 0..m-1, 4 hidden operators (x+a, x−a, x·b, x xor c, mod m),
//              some states are forbidden (constraints). The organism must discover the operators from the consequences of its actions.
//   'sat'    — a world of logical constraints: find a valid configuration of v variables (a small 3-SAT with a planted solution);
//              actions flip one variable; the world shows how many constraints are violated here and one flip away.
import {RNG} from './maze.mjs';
const OPS=[(c,m)=>({name:`+${c}`,f:x=>(x+c)%m}),(c,m)=>({name:`−${c}`,f:x=>((x-c)%m+m)%m}),(c,m)=>({name:`×${c}`,f:x=>(x*c)%m}),(c,m)=>({name:`xor ${c}`,f:x=>(x^c)%m})];
export function makeGraphWorld(seed,m=48){const r=new RNG(seed);
  for(let t=0;t<100;t++){const ops=[0,1,2,3].map(k=>OPS[k](k===2?2+r.int(3):1+r.int(7),m)),forbid=new Uint8Array(m);for(let i=0;i<m;i++)if(r.next()<.15)forbid[i]=1;
    const start=r.int(m),goal=r.int(m);if(forbid[start]||forbid[goal]||start===goal)continue;
    const w={kind:'graph',seed,m,N:m,ops,forbid,start,goals:[goal]};const d=distTo(w,start);if(d[goal]>=3&&d[goal]<1e9)return w;}
  throw Error('graph world generator failed');}
export function makeSatWorld(seed,v=7){const r=new RNG(seed),N=1<<v,sol=r.int(N),clauses=[];
  while(clauses.length<Math.round(4*v)){const vars=r.shuffle([...Array(v).keys()]).slice(0,3),signs=vars.map(()=>r.next()<.5);
    if(vars.some((x,k)=>(((sol>>x)&1)===1)===signs[k]))clauses.push({vars,signs});}
  const viol=new Uint8Array(N);for(let s=0;s<N;s++)viol[s]=clauses.filter(c=>!c.vars.some((x,k)=>(((s>>x)&1)===1)===c.signs[k])).length;
  const goals=[...Array(N).keys()].filter(s=>!viol[s]);let start;do{start=r.int(N);}while(viol[start]===0||minDist(v,start,goals)<3);
  return {kind:'sat',seed,v,N,clauses,viol,start,goals};}
const minDist=(v,s,goals)=>Math.min(...goals.map(g=>{let x=s^g,c=0;while(x){c+=x&1;x>>=1;}return c;}));
export function actionsOf(w){return w.kind==='graph'?4:w.v;}
export function next(w,s,a){if(w.kind==='graph'){const t=w.ops[a].f(s);return w.forbid[t]?null:t;}return s^(1<<a);}
export function distTo(w,from){const d=new Int32Array(w.N).fill(1e9),q=[from];d[from]=0;
  for(let k=0;k<q.length;k++){const s=q[k];for(let a=0;a<actionsOf(w);a++){const t=next(w,s,a);if(t===null||d[t]<1e9)continue;d[t]=d[s]+1;q.push(t);}}return d;}
// Teacher (evaluation and training only): every state lying on SOME shortest route from `from` to any goal.
export function teacherOn(w,from){const d=distTo(w,from),best=Math.min(...w.goals.map(g=>d[g])),ends=w.goals.filter(g=>d[g]===best),y=new Float32Array(w.N);
  // backwards: states s with d[s]+dist(s→end)=best
  for(let s=0;s<w.N;s++){if(d[s]>best)continue;const ds=distTo(w,s);if(ends.some(g=>d[s]+ds[g]===best))y[s]=1;}return {y,length:best};}
// What the organism receives at state s: its own state, for each action the state it leads to and whether entering is allowed,
// and a relation to the goal (graph: the goal's value; sat: violated constraints here and one flip away).
export function observeW(w,s){if(w.kind==='graph')return {state:s,acts:w.ops.map(o=>{const t=o.f(s);return {to:t,ok:!w.forbid[t]};}),goal:w.goals[0]};
  return {state:s,viol:w.viol[s],acts:[...Array(w.v).keys()].map(a=>{const t=s^(1<<a);return {to:t,ok:true,viol:w.viol[t]};}),clauses:w.clauses.length};}
