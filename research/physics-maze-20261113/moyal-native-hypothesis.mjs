// Original V17 Discoverer navigates a Wigner-Moyal hypothesis maze.
// New hypothesis memory is trained ONLY from observed physical rates.
// The quantum oracle is a KNOWN Moyal equation: known-law test, not discovery.
import {Discoverer,playExercise} from "../../v17/transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,RNG} from "../../v17/transcend/torus-aether/worlds/labyrinth.mjs";
function gaussian(m,x,p,h,k) {
  let ans=0;
  for(const e of m) {
    const d=p-e.p,dx=x-e.x;
    const g=e.w/(Math.PI*h)*Math.exp(-(d*d+dx*dx)/h);
    const f=k===0?1:k===3?(12*d/h**2-8*d**3/h**3):
      k===5?(-32*d**5/h**5+160*d**3/h**4-120*d/h**3):0;
    ans+=g*f;
  }
  return ans;
}
function observedWorld(type,seed,n,options={}) {
  const rng=new RNG(seed),out=[];
  for(let i=0;i<n;i++) {
    const hbar=options.hbarZero?0:(options.shifted?1.6+1.3*rng.next():.55+1.2*rng.next());
    const h=hbar||1,lam=options.lambdaZero?0:(options.shifted?1+.8*rng.next():.15+rng.next());
    const x=3*rng.next()-1.5,p=4*rng.next()-2;
    const k=.3+.4*rng.next();
    const mixture=[
      {x:2.2*rng.next()-1.1,p:2.4*rng.next()-1.2,w:k},
      {x:2.2*rng.next()-1.1,p:2.4*rng.next()-1.2,w:1-k}
    ];
    const dx=.075+.055*rng.next();
    const w=Array.from({length:7},(_,j)=>gaussian(mixture,x,p+(j-3)*dx,h,0));
    const f=j=>w[j+3],d2=dx*dx,d3=d2*dx,d4=d3*dx,d5=d4*dx;
    const diff=[f(0),(f(1)-f(-1))/(2*dx),
      (f(1)-2*f(0)+f(-1))/d2,
      (f(2)-2*f(1)+2*f(-1)-f(-2))/(2*d3),
      (f(2)-4*f(1)+6*f(0)-4*f(-1)+f(-2))/d4,
      (f(3)-4*f(2)+5*f(1)-5*f(-1)+4*f(-2)-f(-3))/(2*d5)];
    const dThird=gaussian(mixture,x,p,h,3),dFifth=gaussian(mixture,x,p,h,5);
    const y=options.hbarZero?0:type==="quartic"?
      -(hbar*hbar*lam*x/4)*dThird:
      -(5/6)*hbar*hbar*lam*x**3*dThird+
       (hbar**4*lam*x/16)*dFifth;
    out.push({x,p,hbar,lam,diff,y});
  }
  return out;
}
const candidates=[];
for(let order=0;order<=5;order++)for(let ax=0;ax<=4;ax++)
for(let bl=0;bl<=2;bl++)for(let ch=0;ch<=4;ch++)
  candidates.push({order,ax,bl,ch});
function feat(row,c) {
  return row.diff[c.order]*row.x**c.ax*row.lam**c.bl*row.hbar**c.ch;
}
function fit(rows,cs) {
  if(!cs.length)return [];
  if(cs.length===1) {
    let a=0,b=0;
    for(const row of rows){const z=feat(row,cs[0]);a+=z*row.y;b+=z*z;}
    return [b>1e-20?a/b:0];
  }
  const [u,v]=cs;let aa=0,ab=0,bb=0,ay=0,by=0;
  for(const row of rows) {
    const a=feat(row,u),b=feat(row,v);
    aa+=a*a;ab+=a*b;bb+=b*b;ay+=a*row.y;by+=b*row.y;
  }
  const det=aa*bb-ab*ab;
  if(Math.abs(det)<1e-24)return null;
  return [(ay*bb-by*ab)/det,(by*aa-ay*ab)/det];
}
function score(rows,cs,coeffs) {
  let ss=0,abs=0,total=0;
  for(const r of rows) {
    let pred=0;for(let j=0;j<cs.length;j++)pred+=coeffs[j]*feat(r,cs[j]);
    const err=pred-r.y;
    ss+=err*err;abs+=Math.abs(err);total+=r.y*r.y;
  }
  return {n:rows.length,mae:abs/rows.length,mse:ss/rows.length,
    zeroMse:total/rows.length,r2:1-ss/Math.max(total,1e-28)};
}
class MoyalDiscoverer extends Discoverer {
  constructor(seed){super(seed);this.physicalResiduals=new Map();}
  liveDifference(world,row) {
    const rows=this.physicalResiduals.get(world)||[];
    rows.push(row);this.physicalResiduals.set(world,rows);
  }
  originalShapeHypothesisMaze(from,to) {
    const N=candidates.length,kind=Array(N).fill(0),links=Array.from({length:N},()=>[]);
    kind[from]=3;kind[to]=2;
    const idOf=q=>candidates.findIndex(z=>z.order===q.order&&z.ax===q.ax&&z.bl===q.bl&&z.ch===q.ch);
    for(let i=0;i<N;i++) {
      const c=candidates[i];
      for(const dim of ["order","ax","bl","ch"])for(const d of [-1,1]){
        const id=idOf({...c,[dim]:c[dim]+d});
        if(id>=0)links[i].push({to:id,action:dim+":"+d});
      }
    }
    const path=this.shapeGraph(kind,links,from,{details:true});
    if(!path?.targetReached)throw Error("Native original hypothesis shape failed");
    return {steps:path.path.length,goalReached:path.targetReached};
  }
  discover(world,validation,maxTerms=2) {
    const training=this.physicalResiduals.get(world),chosen=[],paths=[];
    let current=0,prior=score(validation,[],[]);
    for(let stage=0;stage<maxTerms;stage++){
      let best=null;
      for(let i=0;i<candidates.length;i++){
        if(chosen.some(c=>candidates.indexOf(c)===i))continue;
        const test=[...chosen,candidates[i]],weights=fit(training,test);
        if(weights===null)continue;
        const accuracy=score(validation,test,weights);
        if(!Number.isFinite(accuracy.mse))continue;
        if(!best||accuracy.mse<best.accuracy.mse)
          best={id:i,term:candidates[i],weights,accuracy};
      }
      if(!best)break;
      if(stage>0&&best.accuracy.mse>=prior.mse*.96)break;
      paths.push(this.originalShapeHypothesisMaze(current,best.id));
      current=best.id;chosen.push(best.term);prior=best.accuracy;
    }
    const coefficients=fit(training,chosen);
    return {terms:chosen,coefficients,paths,validation:score(validation,chosen,coefficients)};
  }
}
export function runMoyal() {
  const brain=new MoyalDiscoverer(17);
  let mazeWins=0;
  for(let i=0;i<160;i++)
    mazeWins+=Number(playExercise(makeMaze(1000003+i*7919,7,.3),brain).solved);
  const worlds=[];
  for(const [type,start] of [["quartic",210],["sextic",510]]) {
    const training=observedWorld(type,start,300);
    for(const row of training)brain.liveDifference(type,row);
    const model=brain.discover(type,observedWorld(type,start+1,160),2);
    const test=score(observedWorld(type,start+2,320),model.terms,model.coefficients);
    const shifted=score(observedWorld(type,start+3,160,{shifted:true}),model.terms,model.coefficients);
    const harmonic=score(observedWorld(type,start+4,80,{lambdaZero:true}),model.terms,model.coefficients);
    const classical=score(observedWorld(type,start+5,80,{hbarZero:true}),model.terms,model.coefficients);
    worlds.push({type,training:training.length,model,test,shifted,harmonic,classical});
  }
  const quarticOnSextic=score(observedWorld("sextic",512,320),
    worlds[0].model.terms,worlds[0].model.coefficients);
  const broken=observedWorld("quartic",210,300);
  const rand=new RNG(8181),ys=broken.map(x=>x.y);
  for(let i=ys.length-1;i>0;i--){const j=rand.int(i+1);[ys[i],ys[j]]=[ys[j],ys[i]];}
  const other=new MoyalDiscoverer(17);
  for(let i=0;i<160;i++)playExercise(makeMaze(1000003+i*7919,7,.3),other);
  for(let i=0;i<broken.length;i++)other.liveDifference("shuffled",{...broken[i],y:ys[i]});
  const bad=other.discover("shuffled",observedWorld("quartic",211,160),1);
  const shuffled=score(observedWorld("quartic",212,320),bad.terms,bad.coefficients);
  return {date:"2026-11-13",originalV17Commit:"ac205b5bc561274b957584a7dee058a1110ab6f8",
    nativeMazeWins:mazeWins,candidateCount:candidates.length,
    cases:worlds,controls:{quarticOnSextic,shuffled,shuffledModel:bad},
    knownPhysicsOracleOnly:{
      quartic:"-(hbar*hbar*lambda*x/4) D3p W",
      sextic:"-(5/6)*hbar*hbar*lambda*x^3 D3p W + hbar^4*lambda*x/16 D5p W"},
    warning:"KNOWN-LAW rediscovery from synthetic Moyal oracle, NOT discovery of new physics. Candidate differential grammar and coefficient fitting preselected. Native Discoverer shapeGraph navigates hypothesis lattice but is not the sole inference component."};
}
