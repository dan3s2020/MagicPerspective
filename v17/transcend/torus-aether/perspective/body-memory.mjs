// A learned action-to-body displacement memory from actually OBSERVED V17 maze transitions.
// No maze generator secrets, shortest paths, target values, or evaluator positions are inputs.
// Kept in a separate, versioned sidecar so native Brain/.v8 checkpoints stay byte-compatible.
export class BodyPerspectiveMemory {
  constructor() {
    this.version=2;this.actions=Array.from({length:8},()=>new Map());
    this.localWeights=new Array(9).fill(1);this.priorWeight=.055;
    this.localUpdates=0;this.localSamples=0;this.localHits=0;
    this.observed=0;this.moves=0;this.blocked=0;this.skipped=0;
  }
  observe({domain,before,after,action,context},selfKind){
    if(domain!=='maze')return false;
    const o=Number(String(action).replace(/^output:/,'')),m=String(context||'').match(/^grid:(\d+)$/);
    const n=m?+m[1]:0;
    if(!Number.isInteger(o)||o<0||o>=8||n<3||!Array.isArray(before)||!Array.isArray(after)||before.length!==n*n||after.length!==n*n||!Number.isInteger(selfKind)||selfKind<0){
      this.skipped++;return false;
    }
    const i=before.indexOf(selfKind),j=after.indexOf(selfKind);
    if(i<0||j<0||before.lastIndexOf(selfKind)!==i||after.lastIndexOf(selfKind)!==j){this.skipped++;return false;}
    const dx=(j%n)-(i%n),dy=Math.floor(j/n)-Math.floor(i/n);
    if(Math.abs(dx)+Math.abs(dy)>1){this.skipped++;return false;}
    // Blocked actions are counted as outcomes, but NOT a false "this output means stand still" motor mapping.
    this.observed++;
    if(!dx&&!dy){this.blocked++;this.learnLocalTransition(before,after,n,i,j,o,selfKind);return true;}
    const key=dx+','+dy,slot=this.actions[o];slot.set(key,(slot.get(key)||0)+1);this.moves++;
    this.learnLocalTransition(before,after,n,i,j,o,selfKind);return true;
  }
  // A tiny learned global->egocentric matcher. Supervision is ONLY the before/after
  // position of the organism's self symbol visible in real V17 TRAINING retina,
  // never the hidden shortest-path oracle. Held-out exams DO NOT update these weights.
  learnLocalTransition(before,after,n,i,j,o,selfKind){
    const observed=[],cx=j%n,cy=Math.floor(j/n);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=cx+dx,y=cy+dy;
      observed.push(x<0||y<0||x>=n||y>=n?-1:after[y*n+x]);
    }
    const d=this.effect(o),X=d?i%n+d[0]:i%n,Y=d?Math.floor(i/n)+d[1]:Math.floor(i/n);
    const predicted=X>=0&&X<n&&Y>=0&&Y<n?Y*n+X:i;
    const score=candidate=>{
      const x=candidate%n,y=Math.floor(candidate/n),features=[];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy,k=features.length;
        let seen;
        if(xx<0||yy<0||xx>=n||yy>=n)seen=-1;
        else {const ix=yy*n+xx;seen=ix===candidate?selfKind:ix===i?0:before[ix];}
        features.push(seen===observed[k]?1:0);
      }
      const dist=Math.abs(x-predicted%n)+Math.abs(y-Math.floor(predicted/n));
      const norm=this.localWeights.reduce((s,w)=>s+w,0);
      return {cell:candidate,features,dist,score:features.reduce((s,v,k)=>s+v*this.localWeights[k],0)/norm-this.priorWeight*dist};
    };
    const positive=score(j);let negative=null;
    for(let k=0;k<n*n;k++){
      if(k===j||before[k]===1)continue;
      const candidate=score(k);
      if(!negative||candidate.score>negative.score)negative=candidate;
    }
    this.localSamples++;
    if(!negative||positive.score>negative.score)this.localHits++;
    if(!negative||positive.score>negative.score+.025)return;
    const lr=.12;
    for(let k=0;k<9;k++){
      this.localWeights[k]=Math.max(.08,Math.min(3,this.localWeights[k]+lr*(positive.features[k]-negative.features[k])));
    }
    this.priorWeight=Math.max(0,Math.min(.25,this.priorWeight+.015*(negative.dist-positive.dist)/Math.max(1,n)));
    this.localUpdates++;
  }
  effect(o,{minimum=2,confidence=.65}={}){
    const counts=this.actions[o];if(!counts)return null;
    let total=0,best=null,hits=0;
    for(const [key,n]of counts){total+=n;if(n>hits){hits=n;best=key;}}
    return total>=minimum&&hits/total>=confidence?best.split(',').map(Number):null;
  }
  summary(){
    const actions=this.actions.map((slot,o)=>({output:o,samples:[...slot.values()].reduce((a,b)=>a+b,0),
      delta:this.effect(o),outcomes:[...slot.entries()].map(([delta,count])=>({delta,count}))}));
    return {version:this.version,observed:this.observed,moves:this.moves,blocked:this.blocked,skipped:this.skipped,
      known:actions.filter(a=>a.delta).length,actions,
      localizer:{weights:this.localWeights.slice(),priorWeight:this.priorWeight,updates:this.localUpdates,
        samples:this.localSamples,trainingTop1Rate:this.localSamples?this.localHits/this.localSamples:null}};
  }
  export(){return {version:2,observed:this.observed,moves:this.moves,blocked:this.blocked,skipped:this.skipped,
    actions:this.actions.map(m=>[...m.entries()]),localWeights:this.localWeights.slice(),priorWeight:this.priorWeight,
    localUpdates:this.localUpdates,localSamples:this.localSamples,localHits:this.localHits};}
  static restore(s){
    if(!s||![1,2].includes(s.version)||!Array.isArray(s.actions)||s.actions.length!==8)throw Error('Invalid BodyPerspectiveMemory sidecar');
    const x=new BodyPerspectiveMemory();
    for(const field of ['observed','moves','blocked','skipped'])x[field]=Number.isSafeInteger(s[field])&&s[field]>=0?s[field]:0;
    x.actions=s.actions.map(row=>{const m=new Map();if(!Array.isArray(row))throw Error('Invalid action row');
      for(const [key,n]of row){if(!/^(?:-1|0|1),(?:-1|0|1)$/.test(key)||!Number.isSafeInteger(n)||n<1)throw Error('Invalid displacement evidence');m.set(key,n);}
      return m;});
    if(s.version===2){
      if(!Array.isArray(s.localWeights)||s.localWeights.length!==9||s.localWeights.some(w=>!Number.isFinite(w)||w<.08||w>3)||!Number.isFinite(s.priorWeight)||s.priorWeight<0||s.priorWeight>.25)
        throw Error('Invalid learned local-frame weights');
      x.localWeights=s.localWeights.slice();x.priorWeight=s.priorWeight;
      for(const k of ['localUpdates','localSamples','localHits'])x[k]=Number.isSafeInteger(s[k])&&s[k]>=0?s[k]:0;
    }
    return x;
  }
}
