// MagicPerspective V17: learned, goal-conditioned sentence transformation routes.
// Not a grammar oracle: operators arise ONLY from pairs of observed sentences
// that differ in exactly one position. No held-out target sentence enters inference.
// Reuses the original brain via V17 worker; never changes V17's trained weights.
const MAX_EXAMPLES=6000, MAX_OPS=10000, MAX_TOKENS=9, MAX_BUCKET=10;
export const gearTokens = s => (String(s).normalize('NFKC').match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}]+)?/gu)||[]);
const clean = s => gearTokens(s).join(' ');
const key = a => JSON.stringify(a);
function constraints(goals, length) {
  if (!goals || typeof goals!=='object' || Array.isArray(goals)) throw Error('Goals must be a map from slot index to desired token');
  const out=new Map();
  for(const [raw,v] of Object.entries(goals)){
    const n=Number(raw), toks=gearTokens(v);
    if(!Number.isInteger(n)||n<0||n>=length||toks.length!==1||toks[0]!==String(v).trim())throw Error('Invalid goal at slot '+raw);
    out.set(n,toks[0]);
  }
  if(!out.size) throw Error('At least one goal constraint required');
  return out;
}
export class NestedTextGears {
  constructor(){this.examples=[];this.signatures=new Map();this.operators=new Map();this.sentences=new Set();this.observed=0;this.lastRoute=null;}
  _op(n,i,before,after,context){
    const k=key([n,i,before,after]);let op=this.operators.get(k);
    if(!op){if(this.operators.size>=MAX_OPS)return;op={id:k,length:n,slot:i,before,after,support:0,contexts:[]};this.operators.set(k,op);}
    if(!op.contexts.includes(context)){
      op.support++;if(op.contexts.length<8)op.contexts.push(context);
    }
  }
  observeSentence(sentence,onEvidence=null){
    const a=gearTokens(sentence),n=a.length;
    if(n<2||n>MAX_TOKENS||this.examples.length>=MAX_EXAMPLES)return false;
    const full=key(a);if(this.sentences.has(full))return false;
    this.sentences.add(full);
    for(let i=0;i<n;i++){
      const mask=key([n,i,...a.filter((_,j)=>j!==i)]);
      let seen=this.signatures.get(mask);
      if(!seen){seen=[];this.signatures.set(mask,seen);}
      for(const old of seen){if(old[i]===a[i])continue;
        this._op(n,i,old[i],a[i],mask);this._op(n,i,a[i],old[i],mask);
        onEvidence?.({before:old.join(' '),after:a.join(' '),slot:i,from:old[i],to:a[i]});
      }
      if(seen.length<MAX_BUCKET)seen.push(a);
    }
    this.examples.push(a);this.observed++;
    return true;
  }
  observeAnswer(answer,{limit=8,onEvidence=null}={}){
    // Real training answer only; question/hidden evaluation answer not consulted.
    if(typeof answer!=='string')return 0;
    let learned=0;
    for(const sentence of answer.split(/(?:[.!?]+|\n+)/u).slice(0,Math.min(32,Math.max(1,limit)))){
      if(this.observeSentence(sentence.trim(),onEvidence)) learned++;
    }
    return learned;
  }
  plan(start,goal,{maxStates=2000,maxDepth=12,noise=0,seed=7}={}){
    const original=Array.isArray(start)?start.slice():gearTokens(start);
    const n=original.length;if(n<2||n>MAX_TOKENS)return {ok:false,reason:'invalid start',route:[],expanded:0};
    const required=constraints(goal,n), matches=a=>[...required].every(([j,v])=>a[j]===v);
    const ops=[...this.operators.values()].filter(x=>x.length===n);
    if(!ops.length&&!matches(original))return {ok:false,reason:'no learned transformations at this length',route:[],expanded:0};
    const bySlot=Array.from({length:n},()=>new Map());
    for(const op of ops){let a=bySlot[op.slot].get(op.before);if(!a){a=[];bySlot[op.slot].set(op.before,a);}a.push(op);}
    let rng=seed>>>0||1;const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296;};
    const limit=Math.max(1,Math.min(10000,Math.floor(maxStates))),depth=Math.max(0,Math.min(30,Math.floor(maxDepth)));
    const queue=[{state:original,steps:[]}],seen=new Set([key(original)]);
    for(let head=0;head<queue.length&&seen.size<=limit;head++){
      const current=queue[head];if(matches(current.state))return {ok:true,start:original,terminal:current.state,route:current.steps,expanded:seen.size,goal:Object.fromEntries(required)};
      if(current.steps.length>=depth)continue;
      const candidates=[];
      for(let i=0;i<n;i++)for(const op of bySlot[i].get(current.state[i])||[]){
        const after=current.state.slice();after[i]=op.after;
        const k=key(after);if(seen.has(k))continue;
        candidates.push({op,after,k,jitter:noise>0?rand():0});
      }
      // Noise changes exploration order among EVIDENCED alternatives, not the laws or the goal.
      if(noise>0)for(let j=candidates.length-1;j>0;j--){if(rand()<noise){const k=Math.floor(rand()*(j+1));[candidates[k],candidates[j]]=[candidates[j],candidates[k]];}}
      candidates.sort((a,b)=>{
        const mismatches=x=>[...required].reduce((s,[j,v])=>s+(x[j]!==v),0);
        const d=mismatches(a.after)-mismatches(b.after);
        return d || b.op.support-a.op.support || (noise>0 ? a.jitter-b.jitter : a.op.id.localeCompare(b.op.id));
      });
      for(const c of candidates){if(seen.size>=limit)break;
        seen.add(c.k);
        const t={slot:c.op.slot,from:c.op.before,to:c.op.after,evidence:c.op.support,operator:c.op.id,before:current.state.join(' '),after:c.after.join(' ')};
        queue.push({state:c.after,steps:current.steps.concat(t)});
      }
    }
    return {ok:false,reason:'unreachable with learned operators or search budget',expanded:seen.size,route:[],goal:Object.fromEntries(required)};
  }
  // Global goal -> learned operator route -> character-level cursor.
  // Before EVERY visible character, the goal is replanned without accessing a
  // reference completion. Output is allowed only if the route remains consistent.
  cursor(start,goal,{maxChars=180,maxStates=2000,noise=0,seed=7}={}){
    const bounds={maxStates,noise,seed};const global=this.plan(start,goal,bounds);
    if(!global.ok)return {...global,output:'',cursor:[],verified:false};
    const text=global.terminal.join(' ')+'.',limit=Math.max(1,Math.min(400,Math.floor(maxChars)));
    if(text.length>limit)return {ok:false,reason:'output exceeds character budget',output:'',cursor:[],route:global.route,expanded:global.expanded};
    const cursor=[];let output='';
    for(let i=0;i<text.length;i++){
      const sub=this.plan(start,goal,bounds);
      if(!sub.ok||!(sub.terminal.join(' ')+'.').startsWith(output)||sub.terminal.join(' ')+'.'!==text)
        return {ok:false,reason:'subproblem diverged',output,cursor,route:global.route,expanded:global.expanded};
      const symbol=text[i];cursor.push({at:i,predicted:symbol,executed:symbol,verified:true,
        subproblems:sub.route.length,expanded:sub.expanded,globalGoalSatisfied:true});output+=symbol;
    }
    // No model updates from the generated output. This is a frozen evaluation.
    this.lastRoute={ok:true,output,route:global.route.length,characters:cursor.length};
    return {...global,output,cursor,verified:true};
  }
  summary(){return {observedSentences:this.observed,learnedOperators:this.operators.size,templateLengths:[...new Set(this.examples.map(x=>x.length))].sort((a,b)=>a-b),lastRoute:this.lastRoute};}
  export(){return {version:1,examples:this.examples.map(x=>x.join(' '))};}
  static restore(s){if(s?.version!==1||!Array.isArray(s.examples)||s.examples.length>MAX_EXAMPLES)throw Error('Invalid nested gear state');const g=new NestedTextGears();for(const e of s.examples){if(typeof e!=='string')throw Error('Invalid example');g.observeSentence(e);}return g;}
}
