import {adjacency} from './world.mjs';
// Two learned hypotheses about unknown link reliability. The gate adapts from observed contradictions.
const clip=(v,min,max)=>Math.max(min,Math.min(max,v));
export class Perspective {
  constructor(){this.loss=[.66,.66];this.count=0;this.snapshots=[];}
  get weights(){const q=this.loss.map(v=>Math.exp(-3*v)),z=q[0]+q[1];return q.map(v=>v/z);}
  // Structural frame: unknown links are more likely within well-connected regions.
  reliability(spec,belief,edge){const links=spec.links;const degree=Array(spec.nodes).fill(0),open=Array(spec.nodes).fill(0);
    for(const e of links){degree[e.a]++;degree[e.b]++;if(belief.status[e.id]===1){open[e.a]++;open[e.b]++;}}
    const a=edge.a,b=edge.b;
    const geometric=.66;const topo=clip(.35+.25*(degree[a]+degree[b])/12+.32*(open[a]+open[b])/(degree[a]+degree[b]+1),.12,.93);
    return [geometric,topo];
  }
  learn(observedProbabilities,target){const prev=this.weights;
    for(let i=0;i<2;i++){const p=clip(observedProbabilities[i],.001,.999),loss=-(target*Math.log(p)+(1-target)*Math.log(1-p));
      this.loss[i]=this.count===0?loss:.975*this.loss[i]+.025*loss;}
    this.count++;this.snapshots.push({count:this.count,weights:this.weights.map(x=>+x.toFixed(4)),loss:this.loss.map(x=>+x.toFixed(4))});if(this.snapshots.length>45)this.snapshots.shift();
    return {before:prev,after:this.weights};
  }
  // A relational slice: two alternatives for how an action changes the world.
  frames(spec,belief){const known=belief.status.filter(x=>x!==-1).length,pass=belief.status.filter(x=>x===1).length;
    const graph=adjacency(spec.nodes,spec.links.filter(e=>belief.status[e.id]===1));
    const groups=Array(spec.nodes).fill(-1);let id=0;for(let i=0;i<spec.nodes;i++){if(groups[i]!==-1)continue;const queue=[i];groups[i]=id;
      for(let k=0;k<queue.length;k++)for(const link of graph[queue[k]])if(groups[link.to]===-1){groups[link.to]=id;queue.push(link.to)}id++;}
    return {slices:belief.observed.filter(Boolean).length,knownLinks:known,passableLinks:pass,components:id,weights:this.weights,loss:this.loss.slice(),recent:this.snapshots.slice(-12)};
  }
  snapshot(){return {loss:this.loss.slice(),count:this.count,snapshots:this.snapshots.slice(-45)};}
  static restore(v){const p=new Perspective();if(!v)return p;if(v.loss?.length!==2||!v.loss.every(Number.isFinite))throw Error('Invalid perspective checkpoint');p.loss=v.loss.slice();p.count=v.count||0;p.snapshots=v.snapshots||[];return p;}
}
