// Corpus-grounded text navigation adapter. Every stored Q->A and intermediate
// answer sentence is OBSERVED in training data; no held-out answer is indexed.
// The planner is the original V17 Discoverer.shape(ret,n,me,adj), unchanged
// for 2D mazes. Similarity links are explicitly lexical, NOT claimed semantics.
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';

export const terms = text => (String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
  .filter(w => w.length > 2);
export const unique = xs => [...new Set(xs)];
const sentences = text => String(text).split(/(?<=[.!?])\s+|\n+/u)
  .map(x => x.trim()).filter(Boolean);
const round = x => Math.round(x * 10000) / 10000;

export function wordF1(expected, actual) {
  const ref = terms(expected), got = terms(actual);
  if (!ref.length || !got.length) return ref.length === 0 && got.length === 0 ? 1 : 0;
  const remaining = new Map();
  for (const w of ref) remaining.set(w, (remaining.get(w) || 0) + 1);
  let hit = 0;
  for (const w of got) {
    if ((remaining.get(w) || 0) > 0) {
      hit++; remaining.set(w, remaining.get(w) - 1);
    }
  }
  return 2 * hit / (ref.length + got.length);
}

export class ObservedQAAtlas {
  constructor({maxEntries=5000} = {}) {
    this.maxEntries=maxEntries;this.examples=[];this.df=new Map();this.totalObserved=0;
  }
  observe(prompt, answer, sourceIndex=null) {
    const q=String(prompt).trim(),a=String(answer).trim();
    if(!q||!a)return false;
    if(this.examples.length>=this.maxEntries)return false;
    const keys=unique(terms(q));
    if(!keys.length)return false;
    const steps=sentences(a).slice(0,10);
    if(!steps.length)return false;
    const id=this.examples.length;
    this.examples.push({id,sourceIndex,question:q,answer:a,keys,steps});
    for(const w of keys)this.df.set(w,(this.df.get(w)||0)+1);
    this.totalObserved++;
    return true;
  }
  similarities(prompt, k=8) {
    const q=unique(terms(prompt)),set=new Set(q);
    const N=this.examples.length;
    const results=[];
    for(const ex of this.examples) {
      const common=ex.keys.filter(t=>set.has(t));
      if(!common.length)continue;
      const weighted=common.reduce((s,w)=>s+Math.log(1+(N+1)/(1+(this.df.get(w)||0))),0);
      const score=weighted / Math.sqrt(Math.max(1,ex.keys.length)*Math.max(1,q.length));
      results.push({...ex,common,score});
    }
    results.sort((a,b)=>b.score-a.score||a.id-b.id);
    return results.slice(0,k);
  }
  // A graph represents OBSERVED transitions from a lexical cue to a training
  // question, then through sentences OBSERVED in its answer. Terminal answer
  // nodes attract; no reference from held-out examples is passed in.
  build(prompt, {candidates=8,maxCues=12}={}) {
    const matches=this.similarities(prompt,candidates);
    const nodes=[{label:'CURRENT QUERY',kind:KIND.self,source:null}];
    const adj=[[]];
    const add=(label,kind,source=null)=>{
      const i=nodes.length;nodes.push({label,kind,source});adj.push([]);return i;
    };
    const link=(a,b)=>{if(!adj[a].includes(b))adj[a].push(b);};
    const cueNodes=new Map();
    for(const ex of matches) {
      const qId=add(ex.question,KIND.floor,ex.sourceIndex);
      const cues=ex.common.slice(0,maxCues);
      for(const cue of cues){
        let termId=cueNodes.get(cue);
        if(termId===undefined){
          termId=add('cue: '+cue,KIND.floor,ex.sourceIndex);
          cueNodes.set(cue,termId);link(0,termId);
        }
        link(termId,qId);
      }
      let prev=qId;
      for(const line of ex.steps.slice(0,-1)) {
        const id=add(line,KIND.floor,ex.sourceIndex);
        link(prev,id);prev=id;
      }
      const finish=add(ex.steps.at(-1),KIND.target,ex.sourceIndex);
      link(prev,finish);
      nodes[finish].completeAnswer=ex.answer;
      nodes[finish].sourceQuestion=ex.question;
      nodes[finish].score=ex.score;
    }
    return {nodes,adj,matched:matches.length,queryTerms:unique(terms(prompt)).length,sourceIndices:matches.map(m=>m.sourceIndex)};
  }
  plan(prompt, discoverer, opts={}) {
    const g=this.build(prompt,opts);
    if(g.matched===0)return {ok:false,reason:'No observed lexical connection',...g,steps:[]};
    const ret=g.nodes.map(n=>n.kind);
    // Exact ORIGINAL native V17 propagator; only the list of neighbors differs.
    const actions=discoverer.shape(ret,0,0,g.adj);
    if(!actions)return {ok:false,reason:'Native goal-field found no rising path',...g,steps:[]};
    let at=0;
    const steps=[{node:0,label:g.nodes[0].label,kind:g.nodes[0].kind,action:null}];
    for(const a of actions){
      const dest=g.adj[at]?.[a];
      if(!Number.isInteger(dest))throw Error('Native shape generated invalid text graph action');
      at=dest;
      steps.push({node:at,label:g.nodes[at].label,kind:g.nodes[at].kind,action:a});
    }
    const terminal=g.nodes[at];
    return {ok:terminal.kind===KIND.target,reason:terminal.kind===KIND.target?'goal-reached':'path-incomplete',
      matched:g.matched,queryTerms:g.queryTerms,sourceIndices:g.sourceIndices,
      steps,answer:terminal.completeAnswer||'',evidenceQuestion:terminal.sourceQuestion||'',
      evidenceIndex:terminal.source,similarity:round(terminal.score||0),
      graphNodes:g.nodes.length,graphEdges:g.adj.reduce((s,a)=>s+a.length,0)};
  }
  snapshot() { return {entries:this.examples.length,totalObserved:this.totalObserved,
    vocabulary:this.df.size,examples:this.examples.map(e=>({id:e.id,sourceIndex:e.sourceIndex,question:e.question,
      answer:e.answer,keys:e.keys,steps:e.steps})),df:[...this.df]};}
  static restore(s) {
    const a=new ObservedQAAtlas({maxEntries:Math.max(1,s.entries)});
    a.examples=s.examples;a.df=new Map(s.df);a.totalObserved=s.totalObserved;return a;
  }
}
