import {makeMaze,blankBelief,observe,neighbors,shortestPath,pathMask} from './maze.js';
import {baseline,score} from './model.js';

// A decoded hypothesis may cross *unknown* cells, never known walls.
// The actual environment validates all moves independently.
export function decodeRoute(prob,belief,n,start,goal,visits){
  const size=n*n,cost=new Float64Array(size).fill(Infinity),parent=new Int32Array(size).fill(-1),done=new Uint8Array(size);
  cost[start]=0;
  for(let count=0;count<size;count++){
    let i=-1,best=Infinity;
    for(let k=0;k<size;k++)if(!done[k]&&cost[k]<best){best=cost[k];i=k;}
    if(i<0||i===goal)break;done[i]=1;
    for(const j of neighbors(i,n)){
      if(done[j]||belief[j]===1)continue;
      const confidence=Math.max(.03,prob[j]);
      const next=cost[i]+1+0.6*(-Math.log(confidence))+(belief[j]===-1?.06:0)+(visits?Math.min(visits[j],5)*.17:0);
      if(next<cost[j]){cost[j]=next;parent[j]=i;}
    }
  }
  if(!Number.isFinite(cost[goal]))return [];
  const out=[goal];let node=goal;
  while(node!==start){node=parent[node];if(node<0)return [];out.push(node);if(out.length>size)return [];}
  return out.reverse();
}
export class Episode{
  constructor(seed,model,n=11){this.world=makeMaze(seed,n);this.model=model;this.position=this.world.start;
    this.belief=blankBelief(n);this.visits=new Array(n*n).fill(0);this.visits[this.position]=1;
    this.steps=0;this.collisions=0;this.history=[];this.finished=false;
    observe(this.world,this.belief,this.position);this.refresh();
  }
  refresh(){const {n,goal}=this.world;
    this.prob=this.model.predict(this.belief,n,this.position,goal,this.visits);
    this.route=decodeRoute(this.prob,this.belief,n,this.position,goal,this.visits);
    this.teacher=shortestPath(this.world.cells,n,this.position,goal);
    this.metrics=score(this.prob,pathMask(this.teacher,n));
    const b=baseline(this.belief,n,this.position,goal);
    this.baselineMetrics=score(b,pathMask(this.teacher,n));
  }
  move(next){
    if(this.finished)return {event:'finished'};
    const {cells,n,goal}=this.world;
    if(!neighbors(this.position,n).includes(next))return {event:'invalid',reason:'Non-adjacent movement'};
    const from=this.position,prediction=this.prob[next];let event;
    if(cells[next]===1){this.collisions++;event='resistance';this.belief[next]=1;}
    else{this.position=next;this.visits[next]++;event='moved';}
    const changed=observe(this.world,this.belief,this.position);
    this.steps++;if(this.position===goal){this.finished=true;event='goal';}
    this.history.push({step:this.steps,from,to:next,event,prediction,changed});
    if(this.history.length>120)this.history.shift();
    this.refresh();return {event,prediction,changed};
  }
  step(){if(this.finished)return {event:'finished'};
    const next=this.route[1];if(next===undefined)return {event:'no-route'};
    return this.move(next);
  }
  payload(){const w=this.world;
    return {seed:w.seed,n:w.n,start:w.start,goal:w.goal,position:this.position,
      belief:this.belief,visits:this.visits,prob:this.prob,route:this.route,
      teacher:this.teacher,steps:this.steps,collisions:this.collisions,finished:this.finished,
      metrics:{...this.metrics,baselineBCE:this.baselineMetrics.bce},history:this.history.slice(-18),
      // Visibility boundary: teacherTruth is intended ONLY for the human observer UI.
      // The learner never consumes world.cells or teacher in features, policy or gradients at inference.
      teacherTruth:w.cells};
  }
}
