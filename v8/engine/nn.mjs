// Small dependency-free MLP (one tanh hidden layer, sigmoid output) trained with Adam.
// Used for both learned organs of V5. Deterministic for a given seed.
import {RNG} from './world.mjs';
const sigmoid=x=>x>=0?1/(1+Math.exp(-Math.min(x,30))):Math.exp(Math.max(x,-30))/(1+Math.exp(Math.max(x,-30)));
export class MLP{
  constructor(inputs,hidden,seed=1,{lr=.003}={}){
    const rng=new RNG(seed);this.I=inputs;this.H=hidden;this.lr=lr;this.t=0;this.updates=0;
    this.W1=new Float64Array(inputs*hidden).map(()=>(rng.next()*2-1)*Math.sqrt(1.5/inputs));
    this.b1=new Float64Array(hidden);
    this.W2=new Float64Array(hidden).map(()=>(rng.next()*2-1)*Math.sqrt(1/hidden));
    this.b2=new Float64Array(1);
    this.m=this.zeros();this.v=this.zeros();
  }
  zeros(){return {W1:new Float64Array(this.I*this.H),b1:new Float64Array(this.H),W2:new Float64Array(this.H),b2:new Float64Array(1)};}
  hiddenOf(x){if(x.length!==this.I)throw Error(`MLP expects ${this.I} inputs, got ${x.length}`);
    const h=new Float64Array(this.H);for(let k=0;k<this.H;k++){let z=this.b1[k];const o=k*this.I;for(let j=0;j<this.I;j++)z+=this.W1[o+j]*x[j];h[k]=Math.tanh(z);}return h;}
  forward(x){const h=this.hiddenOf(x);let z=this.b2[0];for(let k=0;k<this.H;k++)z+=this.W2[k]*h[k];return sigmoid(z);}
  // One Adam step on a weighted binary cross-entropy over a batch of {x,y,w}. Returns mean loss before the step.
  trainBatch(batch){
    if(!batch.length)return 0;const g=this.zeros();let loss=0,wsum=0;
    for(const {x,y,w=1} of batch){
      if(!(y>=0&&y<=1))throw Error('Target must be in [0,1]');
      const h=this.hiddenOf(x);let z=this.b2[0];for(let k=0;k<this.H;k++)z+=this.W2[k]*h[k];
      const p=sigmoid(z),pc=Math.min(1-1e-6,Math.max(1e-6,p));loss+=-w*(y*Math.log(pc)+(1-y)*Math.log(1-pc));wsum+=w;
      const d=w*(p-y);g.b2[0]+=d;
      for(let k=0;k<this.H;k++){g.W2[k]+=d*h[k];const dh=d*this.W2[k]*(1-h[k]*h[k]);g.b1[k]+=dh;const o=k*this.I;for(let j=0;j<this.I;j++)g.W1[o+j]+=dh*x[j];}
    }
    this.t++;const b1=.9,b2=.999,eps=1e-8,c1=1-b1**this.t,c2=1-b2**this.t;
    for(const key of ['W1','b1','W2','b2']){const P=this[key],G=g[key],M=this.m[key],V=this.v[key];
      for(let i=0;i<P.length;i++){const gi=G[i]/wsum;M[i]=b1*M[i]+(1-b1)*gi;V[i]=b2*V[i]+(1-b2)*gi*gi;P[i]-=this.lr*(M[i]/c1)/(Math.sqrt(V[i]/c2)+eps);}}
    this.updates++;return loss/wsum;
  }
  snapshot(){return {I:this.I,H:this.H,lr:this.lr,t:this.t,updates:this.updates,W1:Array.from(this.W1),b1:Array.from(this.b1),W2:Array.from(this.W2),b2:Array.from(this.b2),
    m:Object.fromEntries(Object.entries(this.m).map(([k,v])=>[k,Array.from(v)])),v:Object.fromEntries(Object.entries(this.v).map(([k,v])=>[k,Array.from(v)]))};}
  static restore(s){if(!s||!Number.isInteger(s.I)||!Number.isInteger(s.H))throw Error('Invalid MLP snapshot');
    const n=new MLP(s.I,s.H,1,{lr:s.lr});if(s.W1?.length!==s.I*s.H||s.W2?.length!==s.H)throw Error('MLP snapshot shape mismatch');
    n.W1=Float64Array.from(s.W1);n.b1=Float64Array.from(s.b1);n.W2=Float64Array.from(s.W2);n.b2=Float64Array.from(s.b2);n.t=s.t||0;n.updates=s.updates||0;
    if(s.m&&s.v)for(const k of ['W1','b1','W2','b2']){n.m[k]=Float64Array.from(s.m[k]);n.v[k]=Float64Array.from(s.v[k]);}
    return n;}
}
