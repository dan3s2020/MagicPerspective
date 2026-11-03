// V6: dependency-free neural causal transition model (two 7-way softmax heads).
// Loss is computed on ACTUAL intervention outcomes, without teacher laws or optimal paths.
import {RNG,BASE,INPUTS,features} from './world.mjs';
const H=64,OUT=BASE*2,clip=(x,a,b)=>Math.min(b,Math.max(a,x));
const parameters=['w1','b1','w2','b2'];
const argmax=x=>x.indexOf(Math.max(...x));
const softmax=x=>{const m=Math.max(...x),ex=x.map(v=>Math.exp(v-m)),s=ex.reduce((a,b)=>a+b,0);return ex.map(v=>v/s)};
export class CausalNet{
 constructor(seed=17,{lr=.005}={}){
  const rng=new RNG(seed);
  this.seed=seed;this.lr=lr;this.inputs=INPUTS;this.hidden=H;this.outputs=OUT;
  this.w1=Float64Array.from({length:H*INPUTS},()=>(rng.next()*2-1)*Math.sqrt(2/INPUTS));
  this.b1=new Float64Array(H);
  this.w2=Float64Array.from({length:OUT*H},()=>(rng.next()*2-1)*Math.sqrt(2/H));
  this.b2=new Float64Array(OUT);
  this.m=this.zeros();this.v=this.zeros();this.steps=0;this.samples=0;this.episodes=0;
 }
 zeros(){return {w1:new Float64Array(H*INPUTS),b1:new Float64Array(H),
   w2:new Float64Array(OUT*H),b2:new Float64Array(OUT)}}
 forward(input){
  if(!Array.isArray(input)||input.length!==INPUTS||!input.every(Number.isFinite))throw Error('Invalid neural input');
  const h=new Float64Array(H);
  for(let k=0;k<H;k++){let z=this.b1[k];for(let i=0;i<INPUTS;i++)z+=this.w1[k*INPUTS+i]*input[i];h[k]=Math.tanh(z);}
  const logits=new Array(OUT);
  for(let j=0;j<OUT;j++){let z=this.b2[j];for(let k=0;k<H;k++)z+=this.w2[j*H+k]*h[k];logits[j]=z;}
  return {h,p:[softmax(logits.slice(0,BASE)),softmax(logits.slice(BASE))]};
 }
 predict(state,tool,context){
  const {p}=this.forward(features(state,tool,context));
  return {state:p.map(argmax),confidence:p.map(a=>Math.max(...a)),distribution:p};
 }
 trainBatch(batch){
  if(!Array.isArray(batch)||!batch.length)throw Error('Empty batch');
  const g=this.zeros();let loss=0;
  for(const sample of batch){
   const {input,target}=sample;
   if(!Array.isArray(target)||target.length!==2||!target.every(n=>Number.isInteger(n)&&n>=0&&n<BASE))throw Error('Invalid training labels');
   const {h,p}=this.forward(input);
   for(let part=0;part<2;part++){
    loss-=Math.log(clip(p[part][target[part]],1e-9,1));
    for(let k=0;k<BASE;k++){
     const j=part*BASE+k,d=(p[part][k]-(k===target[part]?1:0))/batch.length;
     g.b2[j]+=d;
     for(let i=0;i<H;i++)g.w2[j*H+i]+=d*h[i];
    }
   }
   for(let i=0;i<H;i++){
    let dz=0;
    for(let j=0;j<OUT;j++){
     const part=Math.floor(j/BASE),k=j%BASE;
     const d=(p[part][k]-(k===target[part]?1:0))/batch.length;
     dz+=d*this.w2[j*H+i];
    }
    dz*=1-h[i]*h[i];g.b1[i]+=dz;
    for(let j=0;j<INPUTS;j++)g.w1[i*INPUTS+j]+=dz*input[j];
   }
  }
  this.steps++;this.samples+=batch.length;
  const b1=.9,b2=.999,c1=1-Math.pow(b1,this.steps),c2=1-Math.pow(b2,this.steps);
  for(const name of parameters){const p=this[name],m=this.m[name],v=this.v[name],grad=g[name];
   for(let i=0;i<p.length;i++){
    let d=clip(grad[i],-3,3);
    m[i]=b1*m[i]+(1-b1)*d;v[i]=b2*v[i]+(1-b2)*d*d;
    p[i]-=this.lr*(m[i]/c1)/(Math.sqrt(v[i]/c2)+1e-8);
   }
  }
  return loss/(2*batch.length);
 }
 snapshot(){return {schema:6,seed:this.seed,lr:this.lr,inputs:INPUTS,hidden:H,outputs:OUT,
  steps:this.steps,samples:this.samples,episodes:this.episodes,
  ...Object.fromEntries(parameters.map(k=>[k,Array.from(this[k])])),
  m:Object.fromEntries(parameters.map(k=>[k,Array.from(this.m[k])])),
  v:Object.fromEntries(parameters.map(k=>[k,Array.from(this.v[k])]))};
 }
 static restore(s){
  if(s?.schema!==6||s.inputs!==INPUTS||s.hidden!==H||s.outputs!==OUT)throw Error('Incompatible V6 model');
  const n=new CausalNet(s.seed,{lr:s.lr});
  for(const key of parameters){
   if(!Array.isArray(s[key])||s[key].length!==n[key].length||!s[key].every(Number.isFinite))throw Error('Corrupt model weights');
   n[key]=Float64Array.from(s[key]);
   for(const state of ['m','v']){
    const src=s[state]?.[key];
    if(!Array.isArray(src)||src.length!==n[key].length||!src.every(Number.isFinite))throw Error('Corrupt optimizer state');
    n[state][key]=Float64Array.from(src);
   }
  }
  if(![s.steps,s.samples,s.episodes].every(x=>Number.isInteger(x)&&x>=0))throw Error('Corrupt training counters');
  n.steps=s.steps;n.samples=s.samples;n.episodes=s.episodes;return n;
 }
}
