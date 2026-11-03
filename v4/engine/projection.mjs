// V4 Perspective Escape: discover shared latent factors from repeated 2D observations.
// The learner receives observed pairs, NEVER a ProjectionWorld's hidden coordinates.
export class RNG {
  constructor(seed=1){this.s=(seed>>>0)||1}
  next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296}
  int(n){return Math.floor(this.next()*n)}
}
export const VIEWS=['front','side','top'];
export const SLOTS=VIEWS.flatMap(v=>[v+'.0',v+'.1']);
const SECRET_VIEWS={front:[0,1],side:[1,2],top:[0,2]};
export function createProjectionWorld(seed){
  const rng=new RNG(seed),hidden=[1+rng.int(9),1+rng.int(9),1+rng.int(9)];
  return Object.freeze({
    seed,
    // The test/evaluator may inspect this. The learner is passed observe(view) ONLY.
    teacher:()=>hidden.slice(),
    observe:(view)=>{
      if(!VIEWS.includes(view))throw Error('Unknown view');
      return {view,pair:SECRET_VIEWS[view].map(i=>hidden[i])};
    }
  });
}
const slot=(view,i)=>view+'.'+i;
function union(parent,a,b){
  const find=x=>{while(parent[x]!==x)x=parent[x];return x};
  parent[find(b)]=find(a);
}
export class PerspectiveLearner {
  constructor({minEvidence=12}={}){
    this.minEvidence=minEvidence;this.scenes=0;
    this.evidence={};this.frequencies=Object.fromEntries(SLOTS.map(s=>[s,Array(10).fill(0)]));
    for(let i=0;i<SLOTS.length;i++)for(let j=i+1;j<SLOTS.length;j++){
      if(SLOTS[i].split('.')[0]===SLOTS[j].split('.')[0])continue;
      this.evidence[SLOTS[i]+'|'+SLOTS[j]]={equal:0,total:0};
    }
  }
  observeScene(observations){
    const values={};
    for(const observation of observations){
      if(!VIEWS.includes(observation.view)||!Array.isArray(observation.pair)||observation.pair.length!==2)throw Error('Invalid observation');
      for(let i=0;i<2;i++){
        const n=observation.pair[i];
        if(!Number.isInteger(n)||n<1||n>9)throw Error('Invalid observed size');
        const key=slot(observation.view,i);
        if(values[key]!==undefined&&values[key]!==n)throw Error('Conflicting observation');
        values[key]=n;
      }
    }
    if(Object.keys(values).length<2)return;
    this.scenes++;
    for(const [k,v] of Object.entries(values))this.frequencies[k][v]++;
    for(const [pair,record] of Object.entries(this.evidence)){
      const [a,b]=pair.split('|');
      if(values[a]===undefined||values[b]===undefined)continue;
      record.total++;if(values[a]===values[b])record.equal++;
    }
  }
  links(){
    return Object.entries(this.evidence).filter(([,e])=>e.total>=this.minEvidence&&e.equal===e.total).map(([key,e])=>{
      const [a,b]=key.split('|');return {a,b,support:e.total,agreement:e.equal/e.total};
    });
  }
  clusters(){
    const parent=Object.fromEntries(SLOTS.map(x=>[x,x]));
    for(const link of this.links())union(parent,link.a,link.b);
    const groups={};
    for(const name of SLOTS){let p=name;while(parent[p]!==p)p=parent[p];(groups[p]??=[]).push(name)}
    return Object.values(groups);
  }
  predict(view,observations=[]){
    if(!VIEWS.includes(view))throw Error('Unknown view');
    const values={};
    for(const o of observations){
      if(!VIEWS.includes(o.view)||!Array.isArray(o.pair)||o.pair.length!==2)throw Error('Invalid observation');
      for(let i=0;i<2;i++)values[slot(o.view,i)]=o.pair[i];
    }
    const clusters=this.clusters(),pair=[],sources=[],confidence=[];
    for(let i=0;i<2;i++){
      const target=slot(view,i),cluster=clusters.find(c=>c.includes(target))||[target];
      const known=cluster.map(s=>values[s]).filter(v=>v!==undefined);
      if(known.length&&known.every(v=>v===known[0])){
        pair.push(known[0]);sources.push(values[target]!==undefined?'seen':'inferred');
        confidence.push(values[target]!==undefined?1:Math.min(.999,1-Math.pow(1/9,this.scenes)));
      }else{
        pair.push(null);sources.push(known.length?'conflict':'unknown');confidence.push(0);
      }
    }
    return {view,pair,sources,confidence,latentGroups:clusters.length};
  }
  chooseView(observations=[]){
    const already=new Set(observations.map(x=>x.view));
    const clusters=this.clusters(),known=new Set(observations.flatMap(o=>o.pair.map((_,i)=>slot(o.view,i))));
    const seenGroups=new Set(clusters.map((c,i)=>c.some(s=>known.has(s))?i:-1).filter(i=>i>=0));
    return VIEWS.filter(v=>!already.has(v)).map(v=>({
      view:v,information:clusters.reduce((n,c,i)=>n+(seenGroups.has(i)?0:c.some(s=>s.startsWith(v+'.'))?1:0),0)
    })).sort((a,b)=>b.information-a.information||VIEWS.indexOf(a.view)-VIEWS.indexOf(b.view))[0]||null;
  }
  summary(){return {scenes:this.scenes,latentGroups:this.clusters(),links:this.links(),minEvidence:this.minEvidence}}
  snapshot(){return {schema:1,minEvidence:this.minEvidence,scenes:this.scenes,evidence:this.evidence,frequencies:this.frequencies}}
  static restore(snapshot){
    if(snapshot?.schema!==1||!Number.isInteger(snapshot.scenes)||snapshot.scenes<0)throw Error('Invalid perspective checkpoint');
    const model=new PerspectiveLearner({minEvidence:snapshot.minEvidence});
    for(const key of Object.keys(model.evidence)){
      const e=snapshot.evidence?.[key];if(!e||!Number.isInteger(e.total)||!Number.isInteger(e.equal)||e.equal<0||e.equal>e.total||e.total>snapshot.scenes)throw Error('Corrupt latent evidence');
      model.evidence[key]={equal:e.equal,total:e.total};
    }
    for(const key of SLOTS){
      const freq=snapshot.frequencies?.[key];
      if(!Array.isArray(freq)||freq.length!==10||!freq.every(x=>Number.isInteger(x)&&x>=0&&x<=snapshot.scenes))throw Error('Corrupt frequencies');
      model.frequencies[key]=freq.slice();
    }
    model.scenes=snapshot.scenes;return model;
  }
}
export function trainProjection(model,{scenes=100,seed=103001}={}){
  if(!Number.isInteger(scenes)||scenes<1||scenes>10000)throw Error('Invalid scene count');
  for(let k=0;k<scenes;k++){
    const world=createProjectionWorld(seed+k*577);
    // Three measured views of the SAME scene; no direct access to teacher().
    model.observeScene(VIEWS.map(view=>world.observe(view)));
  }
  return model.summary();
}
export function evaluateProjection(model,{count=60,seed=990011}={}){
  if(!Number.isInteger(count)||count<1||count>1000)throw Error('Invalid evaluation size');
  let exact=0,components=0,correct=0,coverage=0,baselineCorrect=0;
  for(let k=0;k<count;k++){
    const w=createProjectionWorld(seed+k*739);
    const visible=[w.observe('front'),w.observe('side')];
    const expected=w.observe('top').pair;
    const got=model.predict('top',visible).pair;
    const baseline=['top.0','top.1'].map(s=>{
      const v=model.frequencies[s];let best=1;for(let i=2;i<=9;i++)if(v[i]>v[best])best=i;return best;
    });
    if(got.every((n,i)=>n===expected[i]))exact++;
    for(let i=0;i<2;i++){components++;if(got[i]!==null)coverage++;if(got[i]===expected[i])correct++;if(baseline[i]===expected[i])baselineCorrect++;}
  }
  return {count,exactRate:exact/count,accuracy:correct/components,coverage:coverage/components,
    independent2DAccuracy:baselineCorrect/components,latentGroups:model.clusters().length,
    learnedLinks:model.links().length};
}
