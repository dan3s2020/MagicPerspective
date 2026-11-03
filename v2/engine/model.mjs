import {RNG,neighbors,COSTS} from './world.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sigmoid=z=>z>=0?1/(1+Math.exp(-Math.min(z,30))):Math.exp(Math.max(z,-30))/(1+Math.exp(Math.max(z,-30)));
const L=28,H=32;
// Shared neural encoder per candidate state. The learned 32-D perspective embedding
// is conditioned on the entire accumulated *observed* map, not hidden truth.
export function features(belief,n,start,goal,index){
 const sx=start%n,sy=Math.floor(start/n),gx=goal%n,gy=Math.floor(goal/n),px=index%n,py=Math.floor(index/n),d=n-1;
 const dx=gx-sx,dy=gy-sy,dd=dx*dx+dy*dy+1e-6;
 const p=clamp(((px-sx)*dx+(py-sy)*dy)/dd,0,1);
 const per=Math.abs((px-sx)*dy-(py-sy)*dx)/(Math.sqrt(dd)*n);
 const wi=belief.walls[index],ma=belief.material[index];
 let known=0,wall=0,terrain=0,visits=0;
 for(const j of neighbors(index,n)){if(belief.walls[j]!==-1)known++;if(belief.walls[j]===1)wall++;if(belief.material[j]>=0)terrain+=belief.material[j];visits+=belief.visits[j]||0}
 let seen=0,materialSum=0;
 for(let j=0;j<belief.walls.length;j++){if(belief.walls[j]>=0){seen++;materialSum+=Math.max(0,belief.material[j]);}}
 return [
 (px-sx)/d,(py-sy)/d,(gx-px)/d,(gy-py)/d,(gx-sx)/d,(gy-sy)/d,
 Math.abs(gx-px)/d+Math.abs(gy-py)/d,Math.abs(px-sx)/d+Math.abs(py-sy)/d,p,per,
 wi===-1?1:0,wi===0?1:0,wi===1?1:0,ma===0?1:0,ma===1?1:0,ma===2?1:0,
 Math.min(1,(belief.visits[index]||0)/4),known/4,wall/4,terrain/8,Math.min(1,visits/12),
 seen/(n*n),seen?materialSum/(2*seen):0,index===start?1:0,index===goal?1:0,
 (px-(n-1)/2)/n,(py-(n-1)/2)/n,1
 ];
}
export class PerspectiveNet{
 constructor(seed=17){const rng=new RNG(seed);this.w1=new Float64Array(L*H);this.b1=new Float64Array(H);this.w2=new Float64Array(H);this.b2=0;
  for(let i=0;i<this.w1.length;i++)this.w1[i]=(rng.next()*2-1)*Math.sqrt(6/(L+H));
  for(let i=0;i<H;i++)this.w2[i]=(rng.next()*2-1)*Math.sqrt(6/(H+1));
  this.updates=0;this.episodes=0;
 }
 forward(x){const h=new Float64Array(H);let y=this.b2;
  for(let k=0;k<H;k++){let v=this.b1[k];for(let j=0;j<L;j++)v+=this.w1[k*L+j]*x[j];h[k]=Math.tanh(v);y+=h[k]*this.w2[k]}return {h,p:sigmoid(y)};
 }
 predict(belief,n,start,goal){return Array.from({length:n*n},(_,i)=>this.forward(features(belief,n,start,goal,i)).p)}
 train(belief,n,start,goal,target,rng,lr=.008,sampleSize=0){
  const indices=rng.shuffle(Array.from({length:n*n},(_,i)=>i));
  const take=sampleSize?Math.min(sampleSize,indices.length):indices.length;
  let loss=0;
  for(let t=0;t<take;t++){
   const i=indices[t],y=target[i],x=features(belief,n,start,goal,i),{h,p}=this.forward(x);
   const err=(p-y); // true unweighted Bernoulli likelihood
   const old=Float64Array.from(this.w2);
   for(let k=0;k<H;k++){
    const d=err*old[k]*(1-h[k]*h[k]);
    for(let j=0;j<L;j++)this.w1[k*L+j]-=lr*d*x[j];
    this.b1[k]-=lr*d;this.w2[k]-=lr*err*h[k];
   }
   this.b2-=lr*err;
   loss+=-(y*Math.log(p+1e-9)+(1-y)*Math.log(1-p+1e-9));this.updates++;
  }
  return loss/take;
 }
 snapshot(){return {schema:2,input:L,hidden:H,w1:Array.from(this.w1),b1:Array.from(this.b1),w2:Array.from(this.w2),b2:this.b2,updates:this.updates,episodes:this.episodes}}
 static restore(x){if(!x||x.schema!==2||x.input!==L||x.hidden!==H||x.w1?.length!==L*H||x.b1?.length!==H||x.w2?.length!==H)throw Error('Bad shape checkpoint');
  const m=new PerspectiveNet();for(const key of ['w1','b1','w2']){if(!x[key].every(Number.isFinite))throw Error('Invalid weights');m[key]=Float64Array.from(x[key])}
  if(!Number.isFinite(x.b2))throw Error('Invalid bias');m.b2=x.b2;m.updates=x.updates||0;m.episodes=x.episodes||0;return m;
 }
}
// Distinct causal organ: predicts action effort from observed destination material.
// Online SGD after the real intervention, persists between worlds.
export class CausalModel{
 constructor(){this.w=new Float64Array([1.0,1.0,.1,-.1]);this.lr=.045;this.samples=0;this.errorSum=0;}
 inputs(material){return [1,material===1?1:0,material===2?1:0,material===-1?1:0]}
 predict(material){const x=this.inputs(material);return Math.max(.3,x.reduce((v,q,i)=>v+q*this.w[i],0))}
 learn(material,effort){const x=this.inputs(material),p=this.predict(material),e=p-effort;for(let j=0;j<x.length;j++)this.w[j]-=this.lr*e*x[j];this.samples++;this.errorSum+=Math.abs(e);return {expected:p,actual:effort,error:Math.abs(e)};}
 snapshot(){return {schema:1,w:Array.from(this.w),samples:this.samples,errorSum:this.errorSum}}
 static restore(x){if(x?.schema!==1||x.w?.length!==4||!x.w.every(Number.isFinite))throw Error('Invalid dynamics checkpoint');const c=new CausalModel();c.w=Float64Array.from(x.w);c.samples=x.samples;c.errorSum=x.errorSum;return c}
}
export function shapeBCE(prob,truth){let s=0,tp=0,fp=0,fn=0;for(let i=0;i<truth.length;i++){
 const p=clamp(prob[i],1e-7,1-1e-7),y=truth[i];s-=y*Math.log(p)+(1-y)*Math.log(1-p);
 if(p>=.35&&y)tp++;else if(p>=.35)fp++;else if(y)fn++;
 }return {bce:s/truth.length,iou:tp/(tp+fp+fn||1),recall:tp/(tp+fn||1)};
}
export function geometricBaseline(n,start,goal,belief){const sx=start%n,sy=Math.floor(start/n),gx=goal%n,gy=Math.floor(goal/n),dx=gx-sx,dy=gy-sy,den=dx*dx+dy*dy+1e-6;
 return Array.from({length:n*n},(_,i)=>{if(belief.walls[i]===1)return .005;const x=i%n-sx,y=Math.floor(i/n)-sy;
 const t=((x*dx+y*dy)/den),dist=Math.abs(x*dy-y*dx)/Math.sqrt(den);
 return clamp(.025+.65*Math.exp(-dist*.85)*((t>=0&&t<=1)?1:.13),.005,.9)});
}
export function routeFromBelief(belief,n,start,goal,prob,causal,mode='shape'){
 const N=n*n,dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),seen=new Uint8Array(N);dist[start]=0;
 for(let k=0;k<N;k++){
  let i=-1,best=Infinity;for(let j=0;j<N;j++)if(!seen[j]&&dist[j]<best){i=j;best=dist[j]}
  if(i<0||i===goal)break;seen[i]=1;
  for(const j of neighbors(i,n)){
   if(belief.walls[j]===1)continue;
   const predictedCost=mode==='neutral'?1:causal.predict(belief.material[j]);
   const shapeCost=mode==='shape'?.7*(-Math.log(Math.max(.03,prob[j]))):0;
   const unknown=belief.walls[j]<0?.12:0;
   const repeat=Math.min(5,belief.visits[j]||0)*.12;
   const score=dist[i]+predictedCost+shapeCost+unknown+repeat;
   if(score<dist[j]){dist[j]=score;prev[j]=i}
  }
 }
 if(!Number.isFinite(dist[goal]))return [];
 const route=[goal];let k=goal;while(k!==start){k=prev[k];if(k<0)return [];route.push(k);if(route.length>N)return [];}return route.reverse();
}
