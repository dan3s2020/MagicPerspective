// F — the organ of the solution's shape (message 38: z = F(h_t, g); (Γ̂, U) = D(z)).
// "We do not program in the latent what a correct route means; we train it to discover the regularities."
// So F is a learned LOCAL rule, the same at every place of the organism's internal map, applied for K rounds:
// each place looks only at itself and its neighbours (relations between slices, message 45) and updates a hidden state.
// After K rounds every place says: probability that the solution passes here (p) and how unsure it is (U).
// Weights start random. Everything below is learned by gradient from the teacher's exact numeric error (messages 13, 15, 38).
import {RNG} from './maze.mjs';
export const FEAT=11;
const sig=x=>1/(1+Math.exp(-x));
function param(r,n,scale){return Float32Array.from({length:n},()=>(r.next()*2-1)*scale);}
export class ShapeOrgan{
  constructor({C=12,seed=7,lr=.003,shapeOutput=true}={}){
    const r=new RNG(seed);this.C=C;this.A=3*C+FEAT;this.lr=lr;this.t=0;this.updates=0;this.shapeOutput=shapeOutput;
    this.P={W0:param(r,C*FEAT,Math.sqrt(1/FEAT)),b0:new Float32Array(C),W:param(r,C*this.A,Math.sqrt(1/this.A)),b:new Float32Array(C),
      wp:param(r,C+FEAT,.3),bp:new Float32Array(1),wu:param(r,C+FEAT,.3),bu:new Float32Array(1),
      // decision (message 38: "choose actions guided by the anticipated shape"): q = where to step next, read from the same latent
      wq:param(r,C+FEAT,.3),bq:new Float32Array(1)};
    this.G=Object.fromEntries(Object.entries(this.P).map(([k,v])=>[k,new Float32Array(v.length)]));
    this.M=Object.fromEntries(Object.entries(this.P).map(([k,v])=>[k,new Float32Array(v.length)]));
    this.V=Object.fromEntries(Object.entries(this.P).map(([k,v])=>[k,new Float32Array(v.length)]));}
  rounds(n){return Math.max(8,Math.round(n*2.2));}
  // Works on any internal map: a grid (n×n) or any graph of states (graph.nb = neighbours of each state). Same weights everywhere.
  forward(x,n,graph=null){const C=this.C,A=this.A,N=graph?graph.nb.length:n*n,K=graph?graph.K:this.rounds(n),{W0,b0,W,b,wp,bp,wu,bu,wq,bq}=this.P,al=.5;
    const H=[new Float32Array(N*C)],AM=[];
    for(let c=0;c<N;c++)for(let k=0;k<C;k++){let s=b0[k];for(let f=0;f<FEAT;f++)s+=W0[k*FEAT+f]*x[c*FEAT+f];H[0][c*C+k]=Math.tanh(s);}
    const nb=graph?graph.nb.map(v=>v.length?v:[]):Array.from({length:N},(_,c)=>{const X=c%n,Y=(c/n)|0,o=[];if(Y>0)o.push(c-n);if(X<n-1)o.push(c+1);if(Y<n-1)o.push(c+n);if(X>0)o.push(c-1);return o;});
    const a=new Float32Array(A);
    for(let r=0;r<K;r++){const h=H[r],hn=new Float32Array(N*C),am=new Int32Array(N*C);
      for(let c=0;c<N;c++){const ns=nb[c];
        for(let k=0;k<C;k++){a[k]=h[c*C+k];let m=0,mx=-1e9,ai=-1;for(const j of ns){const v=h[j*C+k];m+=v;if(v>mx){mx=v;ai=j;}}a[C+k]=ns.length?m/ns.length:0;a[2*C+k]=ns.length?mx:0;am[c*C+k]=ai;}
        for(let f=0;f<FEAT;f++)a[3*C+f]=x[c*FEAT+f];
        for(let k=0;k<C;k++){let s=b[k];const o=k*A;for(let i=0;i<A;i++)s+=W[o+i]*a[i];hn[c*C+k]=(1-al)*h[c*C+k]+al*Math.tanh(s);}}
      H.push(hn);AM.push(am);}
    const hK=H[K],p=new Float32Array(N),U=new Float32Array(N),q=new Float32Array(N);
    for(let c=0;c<N;c++){let s=bp[0],u=bu[0],v=bq[0];for(let k=0;k<C;k++){s+=wp[k]*hK[c*C+k];u+=wu[k]*hK[c*C+k];v+=wq[k]*hK[c*C+k];}for(let f=0;f<FEAT;f++){s+=wp[C+f]*x[c*FEAT+f];u+=wu[C+f]*x[c*FEAT+f];v+=wq[C+f]*x[c*FEAT+f];}p[c]=sig(s);U[c]=sig(u);q[c]=sig(v);}
    return {p,U,q,cache:{x,n,N,K,H,AM,nb}};}
  // Teacher's exact numeric error on the whole shape (message 38.4): weighted BCE on p, and U learns |p - y| (message 38.2: uncertainty).
  // y: the teacher's shape (or null for the organism WITHOUT the shape organ); yNext: the next correct step (decision).
  backward({p,U,q,cache},y,mask,yNext=null,sampleWeight=1){const {x,n,N,K,H,AM,nb}=cache,C=this.C,A=this.A,{W0,W,wp,wu,wq}=this.P,G=this.G,al=.5;
    let cnt=0;for(let c=0;c<N;c++)if(mask[c])cnt++;if(!cnt)return 0;const wpos=1,tw=cnt/sampleWeight;
    let gh=new Float32Array(N*C),loss=0;const hK=H[K];
    if(yNext){let pos=0;for(let c=0;c<N;c++)if(mask[c])pos+=yNext[c];const wp1=Math.min(20,(cnt-pos)/Math.max(1,pos));let tw2=0;for(let c=0;c<N;c++)if(mask[c])tw2+=yNext[c]?wp1:1;
      for(let c=0;c<N;c++){if(!mask[c])continue;const w=sampleWeight*(yNext[c]?wp1:1)/tw2,qc=Math.min(1-1e-6,Math.max(1e-6,q[c]));loss+=-w*(yNext[c]*Math.log(qc)+(1-yNext[c])*Math.log(1-qc));const dz=w*(q[c]-yNext[c]);
        for(let k=0;k<C;k++){G.wq[k]+=dz*hK[c*C+k];gh[c*C+k]+=dz*wq[k];}for(let f=0;f<FEAT;f++)G.wq[C+f]+=dz*x[c*FEAT+f];G.bq[0]+=dz;}}
    for(let c=0;c<N;c++){if(!y||!mask[c])continue;const w=(y[c]?wpos:1)/tw,pc=Math.min(1-1e-6,Math.max(1e-6,p[c]));loss+=-w*(y[c]*Math.log(pc)+(1-y[c])*Math.log(1-pc));
      const dz=w*(p[c]-y[c]),tgt=Math.abs(p[c]-y[c]),du=(2*sampleWeight/cnt)*(U[c]-tgt)*U[c]*(1-U[c]);
      for(let k=0;k<C;k++){G.wp[k]+=dz*hK[c*C+k];G.wu[k]+=du*hK[c*C+k];gh[c*C+k]+=dz*wp[k]+du*wu[k];}
      for(let f=0;f<FEAT;f++){G.wp[C+f]+=dz*x[c*FEAT+f];G.wu[C+f]+=du*x[c*FEAT+f];}G.bp[0]+=dz;G.bu[0]+=du;}
    const a=new Float32Array(A),dpre=new Float32Array(C);
    for(let r=K-1;r>=0;r--){const h=H[r],hn=H[r+1],am=AM[r],gp=new Float32Array(N*C);
      for(let c=0;c<N;c++){const ns=nb[c];let any=false;
        for(let k=0;k<C;k++){const g=gh[c*C+k];gp[c*C+k]+=(1-al)*g;const u=(hn[c*C+k]-(1-al)*h[c*C+k])/al;dpre[k]=al*g*(1-u*u);if(dpre[k])any=true;}
        if(!any)continue;
        for(let k=0;k<C;k++){a[k]=h[c*C+k];let m=0,mx=-1e9;for(const j of ns){const v=h[j*C+k];m+=v;if(v>mx)mx=v;}a[C+k]=ns.length?m/ns.length:0;a[2*C+k]=ns.length?mx:0;}
        for(let f=0;f<FEAT;f++)a[3*C+f]=x[c*FEAT+f];
        for(let k=0;k<C;k++){const d=dpre[k];if(!d)continue;const o=k*A;G.b[k]+=d;for(let i=0;i<A;i++)G.W[o+i]+=d*a[i];
          for(let i=0;i<C;i++){gp[c*C+i]+=d*W[o+i];if(!ns.length)continue;const dm=d*W[o+C+i]/ns.length;for(const j of ns)gp[j*C+i]+=dm;gp[am[c*C+i]*C+i]+=d*W[o+2*C+i];}}}
      gh=gp;}
    const h0=H[0];for(let c=0;c<N;c++)for(let k=0;k<C;k++){const d=gh[c*C+k]*(1-h0[c*C+k]**2);if(!d)continue;G.b0[k]+=d;for(let f=0;f<FEAT;f++)G.W0[k*FEAT+f]+=d*x[c*FEAT+f];}
    this.pending=(this.pending||0)+1;return loss;}
  step(){if(!this.pending)return;this.t++;const b1=.9,b2=.999,c1=1-b1**this.t,c2=1-b2**this.t,s=1/this.pending;
    for(const k of Object.keys(this.P)){const P=this.P[k],G=this.G[k],M=this.M[k],V=this.V[k];
      for(let i=0;i<P.length;i++){let g=G[i]*s;g=Math.max(-1,Math.min(1,g));M[i]=b1*M[i]+(1-b1)*g;V[i]=b2*V[i]+(1-b2)*g*g;P[i]-=this.lr*(M[i]/c1)/(Math.sqrt(V[i]/c2)+1e-8);G[i]=0;}}
    this.pending=0;this.updates++;}
  snapshot(){return {schema:'v10-shape-organ',C:this.C,lr:this.lr,t:this.t,updates:this.updates,shapeOutput:this.shapeOutput,P:Object.fromEntries(Object.entries(this.P).map(([k,v])=>[k,Array.from(v)]))};}
  static restore(s){if(s?.schema!=='v10-shape-organ')throw Error('Incompatible V10 organ');const o=new ShapeOrgan({C:s.C,lr:s.lr,shapeOutput:s.shapeOutput});
    for(const k of Object.keys(o.P))o.P[k]=Float32Array.from(s.P[k]);o.t=s.t;o.updates=s.updates;return o;}
}
