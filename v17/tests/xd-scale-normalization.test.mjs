// Standalone xD diagnostic; DOES NOT modify production Geometry.learn.
// Hypothesis: the original dot-of-circles grows as sqrt(D) and saturates logistic
// gates, so native Geometry.learn does not scale smoothly with dimensionality.
// Compare native vs a controlled dimension-normalized operator on separate held-out
// source. Alternative learning rule is a test, not a verified universal law.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
const TWO_PI=2*Math.PI,wrap=x=>x-Math.floor(x),short=x=>x-Math.round(x);
const sigmoid=x=>x>40?1:x< -40?0:1/(1+Math.exp(-x));
const text=Array.from(fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
 .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000),x=>x.charCodeAt(0));
const cut=35000,valEnd=41000,symbols=[...new Set(text.slice(0,cut))];
class NormalizedGeometry extends Geometry {
 constructor({scaling,...opts}={}) {super(opts);this.scaling=scaling;}
 learn(x,y) {
   const {D,lr}=this,alpha=this.scaling(D);
   for(const s of [x,y])if(!this.U.has(s)){this.U.set(s,this.vec());this.V.set(s,this.vec());this.B.set(s,0);}
   this.seen.push(y);if(this.seen.length>20000)this.seen.splice(0,10000);
   const upd=(u,v,label)=>{
     let sum=0;for(let i=0;i<D;i++)sum+=Math.cos(TWO_PI*(u[i]-v[i]));
     const error=lr*(label-sigmoid(alpha*sum+this.B.get(y)));
     // Differentiate normalized logit wrt all angular parameters, but
     // leave the original scalar B(y) updated at its usual learning rate.
     this.B.set(y,this.B.get(y)+error);
     const g=alpha*error;
     for(let i=0;i<D;i++){
       const sn=Math.sin(TWO_PI*(u[i]-v[i]));
       u[i]=wrap(u[i]-g*sn);v[i]=wrap(v[i]+g*sn);
     }
   };
   const U=this.U.get(y);upd(U,this.V.get(x),1);
   for(let k=0;k<this.neg;k++){const z=this.seen[Math.floor(this.r()*this.seen.length)];upd(U,this.V.get(z),0);}
   const z=this.seen[Math.floor(this.r()*this.seen.length)],uz=this.U.get(z);
   if(z!==y)for(let i=0;i<D;i++){
     const f=lr*this.repel*Math.sin(TWO_PI*short(U[i]-uz[i]))/TWO_PI;
     U[i]=wrap(U[i]+f);uz[i]=wrap(uz[i]-f);
   }
   if(++this.n%this.every===0)this.regroup();
 }
}
const score=(v,u)=>u.reduce((s,z,i)=>s+Math.cos(TWO_PI*(v[i]-z)),0);
function evaluate(g,D,alpha,first,last) {
 const keys=symbols,raw=keys.map(y=>g.U.get(y)),bias=keys.map(y=>g.B.get(y)||0);
 const best=new Map();
 for(const x of keys){
   const v=g.V.get(x),a=raw.map(u=>score(v,u));
   let p=0,bi=0;for(let i=1;i<keys.length;i++){
     if(a[i]>a[p])p=i;
     if(a[i]*alpha+bias[i]>a[bi]*alpha+bias[bi])bi=i;
   }
   best.set(x,[keys[p],keys[bi]]);
 }
 let count=0,pure=0,withBias=0,absZ=0,grad=0,saturated=0,meanProbability=0;
 for(let i=first;i<last;i++){
   const x=text[i-1],y=text[i],v=g.V.get(x),u=g.U.get(y);
   if(!v||!u)continue;
   const p=best.get(x);pure+=+(p[0]===y);withBias+=+(p[1]===y);
   const z=alpha*score(v,u)+(g.B.get(y)||0),q=sigmoid(z);
   count++;absZ+=Math.abs(z);grad+=q*(1-q);saturated+=+(Math.abs(z)>8);
   meanProbability+=q;
 }
 return {count,pure:pure/count,bias:withBias/count,meanAbsLogit:absZ/count,
  saturatedFraction:saturated/count,meanSigmoidGradient:grad/count,meanTargetProbability:meanProbability/count};
}
function train(D,variant,seed=17) {
 const options={D,lr:.03,neg:3,repel:.3,every:1e9,seed};
 const g=variant==="native"?new Geometry(options):
  new NormalizedGeometry({...options,scaling: d=>variant==="sqrt"?1/Math.sqrt(d):1/d});
 for(let i=1;i<cut;i++)g.learn(text[i-1],text[i]);
 const alpha=variant==="sqrt"?1/Math.sqrt(D):variant==="mean"?1/D:1;
 return {g,alpha};
}
test("native gate-saturation is measurable as D increases and dimensional scale is an actual experimental variable",()=>{
 const reports=[];
 for(const D of [2,5,16,64,256,1024]){
   const {g,alpha}=train(D,"native");
   const val=evaluate(g,D,alpha,cut,valEnd),held=evaluate(g,D,alpha,valEnd,text.length);
   reports.push({D,variant:"native",validation:val.pure,heldout:held.pure,
     saturation:held.saturatedFraction,meanSigmoidGradient:held.meanSigmoidGradient,
     meanAbsLogit:held.meanAbsLogit});
 }
 assert.equal(reports.length,6);
 assert.ok(reports.every(r=>r.meanSigmoidGradient>=0&&r.meanSigmoidGradient<=.25));
 console.log("XD_NATIVE_LOGIT_SATURATION",JSON.stringify(reports));
});
test("controlled scale normalization vs native on independent held-out 6000 chars; no production changes",()=>{
 const reports=[];
 for(const D of [16,64,256,1024]){
   for(const variant of ["sqrt","mean"]){
     const {g,alpha}=train(D,variant,17);
     const validation=evaluate(g,D,alpha,cut,valEnd),held=evaluate(g,D,alpha,valEnd,text.length);
     const chooseBias=validation.bias>validation.pure;
     reports.push({D,variant,validationPure:validation.pure,validationWithBias:validation.bias,
       testPure:held.pure,testWithBias:held.bias,selection:chooseBias?"bias":"pure",
       preselectedTest:chooseBias?held.bias:held.pure,
       saturated:held.saturatedFraction,meanSigmoidGradient:held.meanSigmoidGradient});
   }
 }
 assert.equal(reports.length,8);
 console.log("XD_CONTROLLED_SCALE_NORMALIZATION",JSON.stringify(reports));
});
