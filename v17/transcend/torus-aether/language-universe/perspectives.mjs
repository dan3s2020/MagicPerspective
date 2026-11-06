// Language as an observed transition graph with learned multi-scale perspectives.
// All relations come from the supplied corpus. No grammar labels or rewrite templates.
// A generic max-product value field propagates observed paragraph-final attraction
// backwards through observed token transitions (same principle as V17's maze shape).
export const tokenize = text => String(text).match(/[\p{L}\p{M}\p{N}_]+(?:['’\-][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu) || [];
const key = (a, n) => a.slice(-n).join('\u001f');
const inc = (map, name, amount=1) => map.set(name, (map.get(name)||0)+amount);
const top = (map, n=8) => [...(map||new Map())].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,n);
const total = map => { let n=0; for (const v of map.values()) n+=v; return n; };

export class TextPerspectives {
  constructor({scales=[1,2,4,8],maxStates=85000}={}) {
    this.scales=[...scales]; this.maxStates=maxStates;
    this.lanes=this.scales.map(()=>new Map()); this.trust=this.scales.map(()=>({right:0,seen:0}));
    this.unigram=new Map(); this.edges=new Map(); this.finals=new Map();
    this.seen=0; this.blocked=0; this.value=new Map(); this.valueVersion=-1;
  }
  get stateCount() { return this.lanes.reduce((v,m)=>v+m.size,0); }
  observe(text) {
    const tokens=tokenize(text), history=[], trace=[];
    for (let i=0;i<tokens.length;i++) {
      const y=tokens[i];
      for (let j=0;j<this.scales.length;j++) {
        const n=this.scales[j]; if(history.length<n)continue;
        const k=key(history,n), m=this.lanes[j].get(k);
        if(m){ const t=this.trust[j]; t.seen++;t.right+=top(m,1)[0]?.[0]===y?1:0; }
        if(!m && this.stateCount>=this.maxStates){this.blocked++;continue;}
        const dest=m||new Map();inc(dest,y);
        if(!m)this.lanes[j].set(k,dest);
      }
      if(history.length){ const from=history.at(-1), m=this.edges.get(from)||new Map(); inc(m,y);this.edges.set(from,m); }
      inc(this.unigram,y); history.push(y);this.seen++;
      if(history.length>32)history.shift();
      if(i<4)trace.push(y);
    }
    if(tokens.length)inc(this.finals,tokens.at(-1));
    return {tokens:tokens.length,first:trace,last:tokens.at(-1)||null};
  }
  candidates(history,{useField=false}={}) {
    const found=[];
    for(let j=0;j<this.scales.length;j++){
      const n=this.scales[j];if(history.length<n)continue;
      const m=this.lanes[j].get(key(history,n));if(!m)continue;
      const count=total(m),tr=this.trust[j];
      const reliability=(tr.right+1)/(tr.seen+2);
      const score=reliability*Math.sqrt(count)/(Math.sqrt(count)+3)*Math.pow(n,0.15);
      found.push({index:j,scale:n,count,score,dist:m});
    }
    found.sort((a,b)=>b.score-a.score || b.scale-a.scale);
    const selected=found[0]||{index:-1,scale:0,count:total(this.unigram),score:0,dist:this.unigram};
    let sorted=top(selected.dist,12);
    if(useField){
      if(this.valueVersion!==this.seen)this.buildField();
      const max=Math.max(1,...sorted.map(([,n])=>n));
      sorted=sorted.map(([tok,n])=>({tok,n,score:(n/max)*(.4+.6*(this.value.get(tok)||0))})).sort((a,b)=>b.score-a.score||b.n-a.n).map(x=>[x.tok,x.n]);
    }
    return {token:sorted[0]?.[0]??null,scale:selected.scale,support:selected.count,
      alternatives:sorted.slice(0,5).map(([token,count])=>({token,count,goalValue:+(this.value.get(token)||0).toFixed(4)})),
      availablePerspectives:found.map(({scale,count,score})=>({scale,count,score:+score.toFixed(4)}))};
  }
  // Learned terminal tokens define attractors; edges and conductance are observed.
  // The propagation OPERATOR is supplied, just as in the maze, not invented.
  buildField({iterations=45,decay=.97}={}) {
    const value=new Map();for(const t of this.finals.keys())value.set(t,1);
    for(let it=0;it<iterations;it++){
      let changed=false;
      for(const [from,neighbors] of this.edges){
        let best=value.get(from)||0,den=total(neighbors);
        for(const [to,count] of neighbors){
          const v=decay*(count/den)*(value.get(to)||0);
          if(v>best+1e-8)best=v;
        }
        if(best>(value.get(from)||0)+1e-8){value.set(from,best);changed=true;}
      }
      if(!changed)break;
    }
    this.value=value;this.valueVersion=this.seen;return value;
  }
  navigate(prefix,{steps=24,useField=true}={}){
    const h=tokenize(prefix);const path=[];
    if(useField&&this.valueVersion!==this.seen)this.buildField();
    for(let i=0;i<steps;i++){
      const p=this.candidates(h,{useField});if(!p.token)break;
      path.push({step:i+1,token:p.token,perspective:p.scale,support:p.support,
        attraction:+(this.value.get(p.token)||0).toFixed(4),alternatives:p.alternatives});
      h.push(p.token);if(h.length>32)h.shift();
      if(this.finals.has(p.token)&&i>=2)break;
    }
    return {prefix,path,continuation:path.map(p=>p.token).join(' ')};
  }
  evaluate(text,{useField=false,limit=3000}={}){
    const tokens=tokenize(text).slice(0,limit),history=[],perspectives={},samples=[];
    let correct=0,known=0,first=0,firstN=0;
    if(useField)this.buildField();
    for(const y of tokens){
      const pred=this.candidates(history,{useField});
      if(pred.scale){known++;correct+=(pred.token===y);perspectives[pred.scale]=(perspectives[pred.scale]||0)+1;}
      if(history.length>=1){const x=this.lanes[0].get(key(history,1));if(x){firstN++;first+=top(x,1)[0]?.[0]===y?1:0;}}
      if(samples.length<12)samples.push({expected:y,predicted:pred.token,perspective:pred.scale});
      history.push(y);if(history.length>32)history.shift();
    }
    return {tokens:tokens.length,known,accuracy:known?correct/known:null,oneTokenBaseline:firstN?first/firstN:null,
      perspectiveUsage:perspectives,samples};
  }
  report(){return {observedTokens:this.seen,states:this.stateCount,blockedStates:this.blocked,
    terminalKinds:this.finals.size,edges:this.edges.size,
    trust:this.scales.map((scale,i)=>({scale,...this.trust[i],accuracy:this.trust[i].seen?this.trust[i].right/this.trust[i].seen:null}))};}
  serialize(){const nest=m=>[...m].map(([k,v])=>[k,v instanceof Map?nest(v):v]);return {version:1,scales:this.scales,maxStates:this.maxStates,
    lanes:this.lanes.map(nest),trust:this.trust,unigram:nest(this.unigram),edges:nest(this.edges),finals:nest(this.finals),seen:this.seen,blocked:this.blocked};}
  static restore(s){if(s.version!==1)throw Error('Unsupported perspective snapshot version');const map=(a,depth=1)=>new Map(a.map(([k,v])=>[k,depth>1?map(v,depth-1):v]));
    const x=new TextPerspectives({scales:s.scales,maxStates:s.maxStates});x.lanes=s.lanes.map(m=>map(m,2));x.trust=s.trust;
    x.unigram=map(s.unigram);x.edges=map(s.edges,2);x.finals=map(s.finals);x.seen=s.seen;x.blocked=s.blocked;x.valueVersion=-1;return x;}
}
