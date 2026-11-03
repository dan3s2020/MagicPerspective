// The same organism in worlds that are not mazes (messages 49, 53, 55). Same F (the very same weights), different perspective:
// here the internal map is a graph of states built by IMAGINATION — the organism learns each action's rule from the consequences it
// has seen ("if I do action a in state s, what changes?", message 53) and rolls those rules forward to picture states it never saw.
// Message 55.3: "a representation by coordinates is useful in one world, a representation by connections in another".
import {actionsOf,next,observeW,teacherOn} from './worlds.mjs';
import {FEAT} from './organ.mjs';
const FAM=[(c,m)=>x=>(x+c)%m,(c,m)=>x=>((x-c)%m+m)%m,(c,m)=>x=>(x*c)%m,(c,m)=>x=>(x^c)%m];
export class RuleLearner{ // A8: learns the transformation rules from consequences (hypotheses eliminated by evidence)
  constructor(A,m){this.m=m;this.hyp=Array.from({length:A},()=>{const h=[];for(let f=0;f<4;f++)for(let c=1;c<m;c++)h.push([f,c]);return h;});this.seen=Array.from({length:A},()=>0);}
  observe(s,a,t){const m=this.m;this.hyp[a]=this.hyp[a].filter(([f,c])=>FAM[f](c,m)(s)===t);this.seen[a]++;}
  predict(s,a){const h=this.hyp[a];if(!this.seen[a]||!h.length)return null;const [f,c]=h[0];return FAM[f](c,this.m)(s);}
  certainty(a){return this.seen[a]?1/Math.max(1,this.hyp[a].length):0;}}
export class GraphMind{
  constructor(w){this.w=w;this.A=actionsOf(w);this.N=w.N;this.rules=new RuleLearner(this.A,w.N);this.status=new Int8Array(w.N).fill(-1);
    this.viol=new Int16Array(w.N).fill(-1);this.visits=new Uint16Array(w.N);this.pos=w.start;this.goalKnown=w.kind==='graph'?w.goals[0]:-1;}
  absorb(o){const news=[];this.status[o.state]=1;this.visits[o.state]++;if(this.w.kind==='sat'){this.viol[o.state]=o.viol;if(o.viol===0)this.goalKnown=o.state;}
    o.acts.forEach((x,a)=>{this.rules.observe(o.state,a,x.to);if(this.status[x.to]===-1)news.push(x.to);if(this.status[x.to]!==1)this.status[x.to]=x.ok?1:0;
      if(this.w.kind==='sat'){this.viol[x.to]=x.viol;if(x.viol===0&&this.goalKnown<0)this.goalKnown=x.to;}});return news;}
  // Imagination: the states reachable from here by the learned rules (never the true graph).
  imagine(){const N=this.N,nb=Array.from({length:N},()=>new Set()),seen=new Uint8Array(N),q=[this.pos];seen[this.pos]=1;
    for(let k=0;k<q.length;k++){const s=q[k];if(this.status[s]===0)continue;for(let a=0;a<this.A;a++){const t=this.rules.predict(s,a);if(t===null||t===s)continue;nb[s].add(t);nb[t].add(s);if(!seen[t]){seen[t]=1;q.push(t);}}}
    return {nb:nb.map(x=>[...x]),reach:seen,K:14};}
  features(g){const N=this.N,x=new Float32Array(N*FEAT),w=this.w,m=N;
    for(let c=0;c<N;c++){const o=c*FEAT,st=this.status[c];if(!g.reach[c]){x[o+2]=1;continue;}
      x[o]=st===1?1:0;x[o+1]=st===0?1:0;x[o+2]=st===-1?1:0;x[o+3]=c===this.pos?1:0;x[o+4]=c===this.goalKnown?1:0;
      if(w.kind==='graph'){x[o+5]=(this.goalKnown-c)/m;x[o+6]=Math.abs(this.goalKnown-c)/m;x[o+7]=(this.pos-c)/m;}
      else{const k=this.viol[c];x[o+5]=k>=0?k/w.clauses.length:0;x[o+6]=k>=0?1:0;let h=c^this.pos,b=0;while(h){b+=h&1;h>>=1;}x[o+7]=b/w.v;}}
    return x;}}
export function decodeG(mind,g,p){const line=[mind.pos],on=new Set(line);let at=mind.pos;const goalSet=new Set(mind.w.kind==='sat'?[]:[mind.goalKnown]);
  for(let t=0;t<mind.N&&!goalSet.has(at)&&!(mind.w.kind==='sat'&&mind.viol[at]===0);t++){let best=-1,bv=-1;for(const j of g.nb[at]){if(mind.status[j]===0||on.has(j))continue;if(p[j]>bv){bv=p[j];best=j;}}
    if(best<0)break;line.push(best);on.add(best);at=best;}return line;}
// Imagination of each action's consequence before choosing (message 49).
export function chooseG(mind,p,rng=null,explore=0){const opts=[];for(let a=0;a<mind.A;a++){const t=mind.rules.predict(mind.pos,a);
    opts.push({a,to:t,value:t===null||mind.status[t]===0||t===mind.pos?-1:p[t]-.15*Math.min(mind.visits[t],4)});}
  if(rng&&rng.next()<explore){const ok=opts.filter(o=>o.value>-1);return ok[rng.int(ok.length)]??opts[0];}
  return opts.sort((u,v)=>v.value-u.value)[0];}
export function isGoal(w,s){return w.goals.includes(s);}
export {observeW,next,teacherOn};
