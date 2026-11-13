// Independently validate the FROZEN original-Discoverer Moyal hypotheses
// against an instantaneous Schrodinger density-matrix commutator integral.
// This is NOT full long-time evolution or an experimental discovery.
import {runMoyal} from "./moyal-native-hypothesis.mjs";
import {RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
const pureW=(x,p,x0,p0,h)=>Math.exp(-((x-x0)**2+(p-p0)**2)/h)/(Math.PI*h);
const V=(type,x,l)=>x*x/2+l*(type==="quartic"?x**4/4:x**6/6);
const forceGradient=(type,x,l)=>x+l*(type==="quartic"?x**3:x**5);
function independentInstantaneousQuantum(type,o) {
  const {x,p,x0,p0,hbar:h,lambda:l}=o;
  const N=1200,H=16*Math.sqrt(h)/N;
  let sum=0;
  for(let j=1;j<N;j++) {
    const y=j*H;
    const potentialDiff=V(type,x+y/2,l)-V(type,x-y/2,l)-
      y*forceGradient(type,x,l);
    const kernel=Math.exp(-((x-x0)**2+y*y/4)/h)/Math.sqrt(Math.PI*h);
    sum+=(j%2===0?2:4)*potentialDiff*kernel*
      Math.sin((p0-p)*y/h);
  }
  return sum*(H/3)/(Math.PI*h*h);
}
function independentSamples(type,seed,n,{shifted=false}={}){
  const rng=new RNG(seed),arr=[];
  for(let i=0;i<n;i++){
    const hbar=shifted?1.65+1.15*rng.next():.55+1.2*rng.next();
    const lambda=shifted?1+.7*rng.next():.15+rng.next();
    const x=3*rng.next()-1.5,p=4*rng.next()-2;
    const x0=2.2*rng.next()-1.1,p0=2.4*rng.next()-1.2;
    const dx=.075+.055*rng.next();
    const f=k=>pureW(x,p+k*dx,x0,p0,hbar);
    const d2=dx*dx,d3=d2*dx,d4=d3*dx,d5=d4*dx;
    const diff=[f(0),(f(1)-f(-1))/(2*dx),
      (f(1)-2*f(0)+f(-1))/d2,
      (f(2)-2*f(1)+2*f(-1)-f(-2))/(2*d3),
      (f(2)-4*f(1)+6*f(0)-4*f(-1)+f(-2))/d4,
      (f(3)-4*f(2)+5*f(1)-5*f(-1)+4*f(-2)-f(-3))/(2*d5)];
    const y=independentInstantaneousQuantum(type,{x,p,x0,p0,hbar,lambda});
    arr.push({x,p,hbar,lam:lambda,diff,y,x0,p0,lambda});
  }
  return arr;
}
function independentKnownDiagnostic(type,r) {
  const dp=r.p-r.p0,h=r.hbar,lam=r.lambda;
  const g=pureW(r.x,r.p,r.x0,r.p0,h);
  const third=g*(12*dp/h**2-8*dp**3/h**3);
  const fifth=g*(-32*dp**5/h**5+160*dp**3/h**4-120*dp/h**3);
  return type==="quartic"?-h*h*lam*r.x*third/4:
    -(5/6)*h*h*lam*r.x**3*third+h**4*lam*r.x*fifth/16;
}
function independentMeasure(type,rows,model){
  let absolute=0,sse=0,baseline=0,check=0;
  const examples=[];
  for(const r of rows){
    let y=0;
    for(let j=0;j<model.terms.length;j++){
      const c=model.terms[j];
      y+=model.coefficients[j]*r.diff[c.order]*r.x**c.ax*
        r.lam**c.bl*r.hbar**c.ch;
    }
    const error=y-r.y,oracle=independentKnownDiagnostic(type,r);
    absolute+=Math.abs(error);sse+=error*error;
    baseline+=r.y*r.y;check+=Math.abs(oracle-r.y);
    if(examples.length<3)examples.push({schrodingerPotentialKernel:r.y,
      frozenOrganismPrediction:y,knownMoyalDiagnostic:oracle});
  }
  return {n:rows.length,mae:absolute/rows.length,
    r2:1-sse/Math.max(baseline,1e-25),
    zeroModelMse:baseline/rows.length,
    oracleAgreementMAE:check/rows.length,examples};
}
export function runIndependent(){
  const training=runMoyal(),cases=[];
  for(const c of training.cases){
    const test=independentMeasure(c.type,
      independentSamples(c.type,c.type==="quartic"?912:1412,200),c.model);
    const shifted=independentMeasure(c.type,
      independentSamples(c.type,c.type==="quartic"?913:1413,100,{shifted:true}),c.model);
    cases.push({potential:c.type,frozenTerms:c.model.terms,
      frozenCoefficients:c.model.coefficients,test,shifted});
  }
  return {date:"2026-11-13",source:"independent Schrodinger density-matrix commutator Fourier integral",
    trainingAndOriginalNativeSource:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    noRefitOnIndependentQuantumObservations:true,
    cases,verdict:"Known quantum correction rediscovered within a restricted hypothesis grammar, corroborated by an independently implemented instantaneous Schrodinger generator. No new law.",
    limits:["Instantaneous potential generator, not full Schrodinger integration.",
      "Initial states are pure coherent-state Gaussians, not laboratory observations.",
      "Researcher selected 450 candidate derivative/power operators."]};
}
