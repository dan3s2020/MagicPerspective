// Independent trainable geometry attached to observed V17 transitions.
// NOT the original DUST optimizer. No optimizer/gradient touches original V17 Brain.
const D=5,H=8,ACT=8,WORLDS=['text','maze','transform'];
const sq=v=>v*v;
const mean=v=>v.reduce((a,b)=>a+b,0)/Math.max(1,v.length);
function random(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
function mat(rows,cols,r,scale=.07,identity=0){return Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>(r()-.5)*2*scale+(i===j?identity:0)));}
function mv(M,x){return M.map(row=>row.reduce((s,v,i)=>s+v*x[i],0));}
function mulAdd(M,x,b){return mv(M,x).map((v,i)=>v+b[i]);}
function tnh(v){return Math.tanh(v);}
function outerSample(x,prev){const p=[];for(let i=0;i<D;i++)for(let j=i+1;j<D;j++)p.push(x[i]*prev[j]-x[j]*prev[i]);return p;}
function numeric(v){return Array.isArray(v)&&v.length===D&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<1e5);}
function bounded(x){return Math.max(-2,Math.min(2,x));}
function clip(x){return Math.max(-3,Math.min(3,x));}
const initLane=r=>({E:mat(H,D,r,.16),P:mat(H,10,r,.04),D:mat(D,H,r,.16),be:Array(H).fill(0),bd:Array(D).fill(0)});
const emptyStats=()=>({trainN:0,trainLossSum:0,evalN:0,evalLossSum:0,baselineLossSum:0,last:null});
export class GeometricLearningLab{
  constructor(seed=11){this.seed=seed;const r=random(seed*37+19);this.lanes=Object.fromEntries(WORLDS.map(w=>[w,initLane(r)]));
    this.T=mat(H,H,r,.035,.72);this.A=mat(H,ACT,r,.1);this.bt=Array(H).fill(0);
    this.stats=Object.fromEntries(WORLDS.map(w=>[w,emptyStats()]));this.lr=.018;this.recon=.12;this.updates=0;
  }
  check(world,x,y,prev,action){
    if(!WORLDS.includes(world))throw Error('Unknown geometric lane '+world);
    if(!numeric(x)||!numeric(y)||!numeric(prev))throw Error('Expected three finite 5D vectors');
    if(!Number.isInteger(action)||action<0||action>=ACT)throw Error('Action must be 0..7');
  }
  forward(world,x,prev,action){
    const L=this.lanes[world],p=outerSample(x,prev),zPre=mulAdd(L.E,x,L.be),zp=mv(L.P,p);
    const z=zPre.map((a,i)=>tnh(a+zp[i])),ap=Array(ACT).fill(0);ap[action]=1;
    const nextPre=mulAdd(this.T,z,this.bt),act=mv(this.A,ap);
    const h=nextPre.map((a,i)=>tnh(a+act[i]));
    const prediction=mulAdd(L.D,h,L.bd),reconstruction=mulAdd(L.D,z,L.bd);
    return {p,z,h,ap,prediction,reconstruction};
  }
  consume({world,x,y,prev=x,action=0,heldout=false}){
    this.check(world,x,y,prev,action);
    const L=this.lanes[world],st=this.stats[world],f=this.forward(world,x,prev,action);
    const mse=mean(f.prediction.map((v,i)=>sq(v-y[i]))),base=mean(x.map((v,i)=>sq(v-y[i])));
    const recon=mean(f.reconstruction.map((v,i)=>sq(v-x[i])));
    if(heldout){st.evalN++;st.evalLossSum+=mse;st.baselineLossSum+=base;}
    else {
      st.trainN++;st.trainLossSum+=mse;this.updates++;
      // Exact analytic chain rule for the two-layer tanh lift/transition/project.
      const dY=f.prediction.map((v,i)=>clip((2/D)*(v-y[i])));
      const dR=f.reconstruction.map((v,i)=>clip(this.recon*(2/D)*(v-x[i])));
      const dH=Array.from({length:H},(_,i)=>clip(L.D.reduce((s,row,k)=>s+row[i]*dY[k],0)*(1-f.h[i]*f.h[i])));
      const dZ=Array.from({length:H},(_,i)=>clip((this.T.reduce((s,row,k)=>s+row[i]*dH[k],0)+L.D.reduce((s,row,k)=>s+row[i]*dR[k],0))*(1-f.z[i]*f.z[i])));
      const eta=this.lr,wd=.00002;
      for(let i=0;i<D;i++){for(let j=0;j<H;j++)L.D[i][j]-=eta*clip(dY[i]*f.h[j]+dR[i]*f.z[j]+wd*L.D[i][j]);L.bd[i]-=eta*(dY[i]+dR[i]);}
      for(let i=0;i<H;i++){
        for(let j=0;j<H;j++)this.T[i][j]-=eta*clip(dH[i]*f.z[j]+wd*this.T[i][j]);
        this.A[i][action]-=eta*clip(dH[i]+wd*this.A[i][action]);this.bt[i]-=eta*dH[i];
        for(let j=0;j<D;j++)L.E[i][j]-=eta*clip(dZ[i]*x[j]+wd*L.E[i][j]);
        for(let j=0;j<10;j++)L.P[i][j]-=eta*clip(dZ[i]*f.p[j]+wd*L.P[i][j]);L.be[i]-=eta*dZ[i];
      }
    }
    st.last={world,heldout,mse,base,recon,action,prediction:f.prediction.map(bounded),actual:y.map(bounded),
      x:x.map(bounded),plucker:f.p.map(bounded),latent:f.z.map(bounded),projected:f.h.map(bounded)};
    return st.last;
  }
  summary(){
    const lanes={};for(const w of WORLDS){const s=this.stats[w],n=s.evalN,rmse=n?Math.sqrt(s.evalLossSum/n):null,
      base=n?Math.sqrt(s.baselineLossSum/n):null,delta=rmse!==null&&base>0?1-rmse/base:null;
      lanes[w]={trainN:s.trainN,trainRMSE:s.trainN?Math.sqrt(s.trainLossSum/s.trainN):null,
        evalN:n,evalRMSE:rmse,baselineRMSE:base,improvement:delta,
        assessment:n<20?'INSUFFICIENT_EVIDENCE':delta>=.05?'BETTER':delta<=-.05?'WORSE':'INCONCLUSIVE',
        last:s.last};}
    return {engine:'real-transition lifted 5D→8D→5D, shared latent transition, analytic gradients',device:'CPU / JavaScript',
      optimizer:'SGD (analytic chain rule); not DUST',updates:this.updates,pluckerCoordinates:10,latentDimension:8,
      realExperiencesOnly:true,lanes,
      crossWorld:'SHARED_PARAMETERS_NOT_PROOF_OF_SHARED_TRAJECTORY'};
  }
  export(){return {version:1,seed:this.seed,lanes:this.lanes,T:this.T,A:this.A,bt:this.bt,stats:this.stats,lr:this.lr,recon:this.recon,updates:this.updates};}
  static restore(o){
    if(o?.version!==1)throw Error('Unsupported geometric checkpoint');
    const v=new GeometricLearningLab(o.seed);
    // Reject malformed checkpoints, keeping the original V17 checkpoint independent.
    for(const w of WORLDS){if(!o.lanes?.[w]||!o.stats?.[w])throw Error('Missing lane '+w);}
    if(!Array.isArray(o.T)||o.T.length!==H||!Array.isArray(o.A)||o.A.length!==H)throw Error('Bad geometry matrices');
    Object.assign(v,o);return v;
  }
}
// Normalize observations directly from recorded V17 physics; no invented node positions.
export function observedFeatures(world,event){
  const n=event.n||1;
  if(world==='maze'){
    const idx=event.index,goal=event.goal,wall=event.wall||[],density=wall.length?wall.filter(Boolean).length/wall.length:0;
    return [2*(idx%n)/(n-1)-1,2*Math.floor(idx/n)/(n-1)-1,2*(goal%n)/(n-1)-1,2*Math.floor(goal/n)/(n-1)-1,2*density-1];
  }
  if(world==='transform'){
    const b=event.board||[],goal=event.goal||[],p=b.findIndex(v=>[2,5,8,11,15].includes(v));
    const matches=goal.length?goal.filter((v,i)=>v===17||v===b[i]).length/goal.length:0,
      open=b.length?b.filter(v=>[10,11,12,14,15,16].includes(v)).length/b.length:0,
      boxes=b.length?b.filter(v=>[3,6,12,16].includes(v)).length/b.length:0;
    return [p<0?0:2*(p%n)/(n-1)-1,p<0?0:2*Math.floor(p/n)/(n-1)-1,2*matches-1,2*open-1,2*boxes-1];
  }
  if(world==='text'){
    const a=event.history||[];return Array.from({length:5},(_,i)=>2*(a[a.length-5+i]??32)/127-1);
  }
  throw Error('Unknown world');
}
