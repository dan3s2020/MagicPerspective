import {RNG, shortestPath, observe, blankBelief, makeMaze, pathMask} from './maze.js';

// World-independent feature contract. No full maze, oracle path, or hidden wall input.
export const INPUTS=20, HIDDEN=24;
const sigmoid=x=>x<-20?0.000000002:x>20?0.999999998:1/(1+Math.exp(-x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function features(belief,n,start,goal,pos,visits=undefined){
  const sx=start%n,sy=Math.floor(start/n),gx=goal%n,gy=Math.floor(goal/n),
    px=pos%n,py=Math.floor(pos/n),den=n-1;
  const dx=gx-sx,dy=gy-sy,length2=dx*dx+dy*dy+1e-6;
  const raw=((px-sx)*dx+(py-sy)*dy)/length2,proj=clamp(raw,0,1);
  const perp=Math.abs((px-sx)*dy-(py-sy)*dx)/(Math.sqrt(length2)*n);
  const adjacent=[pos-n,pos+1,pos+n,pos-1].map((j,k)=>k===0&&py===0||k===1&&px===n-1||k===2&&py===n-1||k===3&&px===0?-2:belief[j]);
  const knownCount=belief.reduce((a,b)=>a+(b!==-1?1:0),0);
  return [
    (px-sx)/den,(py-sy)/den,(gx-px)/den,(gy-py)/den,
    (gx-sx)/den,(gy-sy)/den,
    Math.abs(px-sx)/den+Math.abs(py-sy)/den,
    Math.abs(gx-px)/den+Math.abs(gy-py)/den,
    proj,perp,belief[pos]===1?1:0,belief[pos]===0?1:0,belief[pos]===-1?1:0,
    ...adjacent.map(v=>v===1?1:0),
    knownCount/(n*n),
    visits?clamp(visits[pos]/3,0,1):0,
    1
  ];
}
export class ShapeNet{
  constructor(seed=17){
    const rng=new RNG(seed);this.w1=new Float64Array(INPUTS*HIDDEN);
    this.b1=new Float64Array(HIDDEN);this.w2=new Float64Array(HIDDEN);this.b2=0;
    for(let i=0;i<this.w1.length;i++)this.w1[i]=(rng.next()*2-1)*Math.sqrt(6/(INPUTS+HIDDEN));
    for(let i=0;i<this.w2.length;i++)this.w2[i]=(rng.next()*2-1)*Math.sqrt(6/(HIDDEN+1));
    this.steps=0;this.trainedEpisodes=0;
  }
  forward(x){
    const h=new Float64Array(HIDDEN);let o=this.b2;
    for(let k=0;k<HIDDEN;k++){
      let a=this.b1[k];for(let j=0;j<INPUTS;j++)a+=this.w1[k*INPUTS+j]*x[j];
      h[k]=Math.tanh(a);o+=h[k]*this.w2[k];
    }
    return {h,p:sigmoid(o)};
  }
  predict(belief,n,start,goal,visits){
    const result=new Array(n*n);
    for(let i=0;i<result.length;i++)result[i]=this.forward(features(belief,n,start,goal,i,visits)).p;
    return result;
  }
  // Binary cross-entropy gradient on the full PATH SHAPE, not a next-action label.
  update(x,target,learningRate=0.011){
    const {h,p}=this.forward(x),err=p-target;
    const oldW2=Float64Array.from(this.w2);
    for(let k=0;k<HIDDEN;k++){
      const dh=err*oldW2[k]*(1-h[k]*h[k]);
      for(let j=0;j<INPUTS;j++)this.w1[k*INPUTS+j]-=learningRate*dh*x[j];
      this.b1[k]-=learningRate*dh;
      this.w2[k]-=learningRate*err*h[k];
    }
    this.b2-=learningRate*err;this.steps++;
    return -(target*Math.log(p+1e-9)+(1-target)*Math.log(1-p+1e-9));
  }
  trainSample(world,belief,goal,position,teacher,rate,rng,subsample=1){
    const order=rng.shuffle(Array.from({length:world.n*world.n},(_,i)=>i));
    let loss=0,count=0;
    for(let k=0;k<order.length;k+=subsample){const i=order[k];
      const y=teacher[i];loss+=this.update(features(belief,world.n,position,goal,i),y,rate);count++;
    }
    return loss/count;
  }
  serialize(){return {schema:1,inputs:INPUTS,hidden:HIDDEN,w1:Array.from(this.w1),b1:Array.from(this.b1),w2:Array.from(this.w2),b2:this.b2,steps:this.steps,trainedEpisodes:this.trainedEpisodes};}
  static restore(o){if(o?.schema!==1||o.inputs!==INPUTS||o.hidden!==HIDDEN||o.w1?.length!==INPUTS*HIDDEN||o.w2?.length!==HIDDEN||o.b1?.length!==HIDDEN)throw Error('Incompatible saved weights');
    const m=new ShapeNet();for(const k of ['w1','w2','b1']){if(!o[k].every(Number.isFinite))throw Error('Non-finite model weights');m[k]=Float64Array.from(o[k]);}
    if(!Number.isFinite(o.b2))throw Error('Invalid bias');m.b2=o.b2;m.steps=o.steps||0;m.trainedEpisodes=o.trainedEpisodes||0;return m;
  }
}
export function trainingSnapshots(world,seed){
  const rng=new RNG(seed),teacher=pathMask(shortestPath(world.cells,world.n,world.start,world.goal),world.n);
  const result=[],belief=blankBelief(world.n),route=[world.start],visited=new Set(route);
  observe(world,belief,world.start);result.push({belief:belief.slice(),position:world.start,teacher});
  // Deliberately non-oracle exploration. Label may see global map; features never do.
  for(let step=0;step<Math.min(world.n*3,32);step++){
    const current=route[route.length-1];const opts=[];
    const x=current%world.n,y=Math.floor(current/world.n);
    for(const q of [current-world.n,current+1,current+world.n,current-1]){
      if(q<0||q>=world.n*world.n||Math.abs(q%world.n-x)+Math.abs(Math.floor(q/world.n)-y)!==1||world.cells[q]===1)continue;
      opts.push(q);
    }
    if(!opts.length)break;
    const unseen=opts.filter(q=>!visited.has(q));const next=(unseen.length?unseen:opts)[rng.int((unseen.length?unseen:opts).length)];
    route.push(next);visited.add(next);observe(world,belief,next);
    if(step===2||step===6||step===14||step===26)result.push({belief:belief.slice(),position:next,teacher});
  }
  return result;
}
export function baseline(belief,n,start,goal){const out=[];
  for(let i=0;i<n*n;i++){const f=features(belief,n,start,goal,i);out.push(belief[i]===1?0.01:clamp(0.015+0.75*Math.exp(-f[9]*n*0.9)*((f[8]>=0&&f[8]<=1)?1:0.2),0.01,0.95));}
  return out;
}
export function score(prob,truth){let loss=0,tp=0,fp=0,fn=0;
  for(let i=0;i<prob.length;i++){const p=clamp(prob[i],1e-7,1-1e-7),y=truth[i];loss+=-(y*Math.log(p)+(1-y)*Math.log(1-p));const pred=p>=.42;if(pred&&y)tp++;else if(pred)fp++;else if(y)fn++;}
  return {bce:loss/prob.length,iou:tp/(tp+fp+fn||1)};
}
export function evaluateModel(model,{seed=880000,count=36,n=11}={}){
  let bce=0,base=0,iou=0,iouBase=0;
  for(let k=0;k<count;k++){
    const w=makeMaze(seed+k*1301,n),belief=blankBelief(n);observe(w,belief,w.start);
    const teacher=pathMask(shortestPath(w.cells,n,w.start,w.goal),n);
    const a=score(model.predict(belief,n,w.start,w.goal),teacher);
    const b=score(baseline(belief,n,w.start,w.goal),teacher);
    bce+=a.bce;base+=b.bce;iou+=a.iou;iouBase+=b.iou;
  }
  return {count,seed,modelBCE:+(bce/count).toFixed(5),baselineBCE:+(base/count).toFixed(5),modelIoU:+(iou/count).toFixed(5),baselineIoU:+(iouBase/count).toFixed(5),improved:bce<base};
}
