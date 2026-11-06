// Opt-in, goal-conditioned native gear for V17 Brain.chat().
// All prompt->answer associations and all source-edit operators are learned from
// OBSERVED TRAINING data. No held-out reference or test answers at inference.
// No language semantics oracle; an unsupported prompt falls back to V17's original writer.
import {gearTokens} from './nested_text_gears.mjs';

const MAX_CUES = 48, MAX_ROWS = 6000, MAX_WORDS = 9, MAX_STATES = 1200;
const key = (n,i,w) => JSON.stringify([n,i,w]);
const normalize = s => String(s||'').normalize('NFKC').toLowerCase();
const promptFeatures = s => [...new Set(gearTokens(s).slice(0,64).map(normalize))].slice(0,MAX_CUES);
const finite = n => Number.isFinite(n) ? n : 0;
const endpoint = s => gearTokens(s).join(' ') + '.';
const lex = s => (s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const equal = (a,b) => lex(a) === lex(b);
function pickAnswer(answer) {
  if(typeof answer !== 'string') return null;
  for(const sentence of answer.slice(0,4096).split(/[.!?]+|\n+/u).slice(0,8)) {
    const words=gearTokens(sentence);
    if(words.length>=2 && words.length<=MAX_WORDS) return words;
  }
  return null;
}
function add(m,k,v=1){m.set(k,(m.get(k)||0)+v);}
function serialize(m){return [...m].map(([k,v])=>[k,v instanceof Map?serialize(v):v]);}
function deserialize(rows){return new Map((rows||[]).map(([k,v])=>[k,Array.isArray(v)?deserialize(v):v]));}

export class NativeGearDrive {
  constructor({gears,seed=19}={}) {
    if(!gears || typeof gears.plan !== 'function' || typeof gears.observeAnswer !== 'function') throw Error('A real V17 nested-gears learner is required');
    this.gears=gears;this.seed=seed;
    this.cueCounts=new Map();this.cueTotals=new Map();this.glob=new Map();this.lengths=new Map();
    this.examples=[];this.rows=0;this.tested=0;this.preExact=0;this.attempts=0;
    this.accepted=0;this.blocked=0;this.fallbacks=0;this.cursorSteps=0;
    this.lastPlan=null;this.lastPreUpdate=null;this.revision=0;
  }
  // Only the observed training answer is used here. PRE-update evaluations run
  // from old weights, BEFORE this observation is incorporated.
  observePair(prompt,answer,{onEvidence=null}={}) {
    const valid=typeof prompt==='string' && prompt.trim() && typeof answer==='string' && answer.trim();
    if(!valid)return {trained:false};
    const candidate=pickAnswer(answer);
    if(candidate && this.rows>=3){
      const predicted=this.propose(prompt,{maxStates:400});
      if(predicted.used){this.tested++;this.preExact+=Number(equal(predicted.text,endpoint(candidate)));
        this.lastPreUpdate={correct:equal(predicted.text,endpoint(candidate)),beforeUpdate:predicted.text};}
    }
    // All observed training sentences feed the existing learned-operator world,
    // even where the answer is too long for prompt-conditioned char execution.
    const observed=this.gears.observeAnswer(answer,{limit:8,onEvidence});
    if(!candidate || this.rows>=MAX_ROWS)return {trained:true,observed,conditional:false};
    const n=candidate.length,q=promptFeatures(prompt),id=this.rows;
    for(let i=0;i<n;i++)add(this.glob,key(n,i,candidate[i]));
    for(const cue of q){
      const counts=this.cueCounts.get(cue)||new Map();
      for(let i=0;i<n;i++)add(counts,key(n,i,candidate[i]));
      this.cueCounts.set(cue,counts);add(this.cueTotals,cue);
    }
    add(this.lengths,String(n));
    this.examples.push({q,n,words:candidate});this.rows++;this.revision++;
    return {trained:true,observed,conditional:true};
  }
  // Infer a goal from PROMPT-ONLY statistical evidence, never from an answer.
  // Then use observed source-state transformations as the ONLY allowed moves.
  propose(prompt,{maxStates=MAX_STATES,seed=this.seed,minShared=2}={}) {
    this.attempts++;
    if(typeof prompt!=='string' || !prompt.trim() || this.rows<3 || !this.gears.operators.size)
      return {used:false,reason:'insufficient training observations'};
    const q=promptFeatures(prompt),known=q.filter(x=>this.cueTotals.has(x));
    if(known.length<minShared)return {used:false,reason:'prompt has insufficient learned cues'};
    let best=null;
    for(const [len,frequency] of this.lengths){
      const n=Number(len),goal={}, confidence=[];
      for(let pos=0;pos<n;pos++){
        const opts=new Map();
        for(const [k,c] of this.glob){const [N,i,w]=JSON.parse(k);if(N===n&&i===pos)opts.set(w,{w,prior:c,score:0,matched:0});}
        const total=[...opts.values()].reduce((s,x)=>s+x.prior,0);
        for(const o of opts.values()){
          o.score=.08*o.prior/Math.max(1,total);
          // Lexically grounded prompt cue: a candidate observed in a prompt is
          // strong evidence, not a hand-written grammar/slot label.
          if(q.includes(normalize(o.w)))o.score+=2;
          for(const cue of known){const hits=this.cueCounts.get(cue)?.get(key(n,pos,o.w))||0;
            const cnt=this.cueTotals.get(cue)||1;
            if(hits){o.score+=hits/cnt;o.matched++;}
          }
        }
        const ranked=[...opts.values()].sort((a,b)=>b.score-a.score || b.matched-a.matched || b.prior-a.prior);
        if(!ranked.length)continue;
        const top=ranked[0],runner=ranked[1];
        goal[pos]=top.w;
        confidence.push({score:top.score,margin:top.score-(runner?.score||0),matched:top.matched});
      }
      if(Object.keys(goal).length!==n)continue;
      const relevant=confidence.filter(v=>v.matched>=1 && v.margin>.03).length;
      const grounded=Object.values(goal).filter(v=>q.includes(normalize(v))).length;
      if(relevant<2 || grounded<2)continue;
      const rank=confidence.reduce((a,v)=>a+v.score,0)/n+.02*frequency;
      // Only examples observed in TRAINING can be starting states. A completed
      // target sentence has never been supplied to the plan if it was held out.
      const starts=this.gears.examples.filter(x=>x.length===n)
        .map(words=>({words,dist:words.reduce((s,w,i)=>s+(w!==goal[i]),0)}))
        .sort((a,b)=>a.dist-b.dist).slice(0,16);
      for(const start of starts){
        try{
          const path=this.gears.plan(start.words,goal,{maxStates,seed,maxDepth:12});
          if(!path.ok)continue;
          const proposal={used:true,text:endpoint(path.terminal),goal,path,from:start.words.join(' '),
            scores:confidence,observedEvidence:path.route.map(t=>t.evidence),
            strength:rank,learnedRows:this.rows,chars:endpoint(path.terminal).length};
          if(!best || proposal.strength>best.strength)best=proposal;
          break;
        }catch{}
      }
    }
    return best || {used:false,reason:'no learned operator route reaches the predicted goal'};
  }
  // Same candidate in the *native* Brain.chat writer. Every cursor step validates
  // that its observed-operator route can still reach the predicted goal. When the
  // precondition fails, it refuses the step and the original V17 writer takes over.
  generate(history,{max=400,T=.6,seed=this.seed,onStep=null}={}) {
    const question=[...(history||[])].reverse().find(x=>x[0]==='you')?.[1];
    if(typeof question!=='string')return {used:false,reason:'no user goal'};
    const P=this.propose(question,{seed,maxStates:MAX_STATES});
    if(!P.used){this.blocked++;this.lastPlan={used:false,reason:P.reason};return P;}
    if(P.text.length>Math.min(400,Math.max(1,Number(max)||400))){
      this.blocked++;return {used:false,reason:'limited by requested character budget'};
    }
    const route=this.gears.cursor(P.from,P.goal,{seed,maxStates:MAX_STATES,maxChars:400,noise:0});
    if(!route.ok || !route.verified || route.output!==P.text){
      this.blocked++;return {used:false,reason:'receding-horizon cursor did not verify the planned route'};
    }
    // Commit accepted character actions (not merely an auxiliary UI replay).
    for(const action of route.cursor){
      if(action.executed!==action.predicted || !action.verified){this.blocked++;return {used:false,reason:'unverified cursor action'};}
      onStep?.({...action,goal:P.goal,source:'learned operator route'});
      this.cursorSteps++;
    }
    this.accepted++;this.lastPlan={used:true,prompt:question,text:route.output,
      route:route.route,chars:route.cursor.length,expanded:route.expanded,goal:P.goal,
      origin:'learned observed transformations -> goal -> native V17 Brain.chat character actions'};
    return {used:true,text:route.output,chars:route.cursor.length,
      route:route.route,goal:P.goal,expanded:route.expanded,source:'native gear cursor'};
  }
  fallback(reason='no verified plan') {this.fallbacks++;this.lastPlan={used:false,reason};}
  summary(){return {version:1,trainedRows:this.rows,learnedOperators:this.gears.operators.size,
    attempted:this.attempts,accepted:this.accepted,blocked:this.blocked,fallbacks:this.fallbacks,
    cursorSteps:this.cursorSteps,preUpdateExact:this.tested?this.preExact/this.tested:null,
    preUpdateTests:this.tested,lastPlan:this.lastPlan ? {...this.lastPlan,
      route:this.lastPlan.route?.slice(0,16)}:null};}
  export(){return {version:1,seed:this.seed,cueCounts:serialize(this.cueCounts),cueTotals:serialize(this.cueTotals),
    glob:serialize(this.glob),lengths:serialize(this.lengths),examples:this.examples,
    rows:this.rows,tested:this.tested,preExact:this.preExact,accepted:this.accepted,
    blocked:this.blocked,fallbacks:this.fallbacks,cursorSteps:this.cursorSteps};}
  static restore(data,{gears}={}){
    if(data?.version!==1||!Array.isArray(data.examples)||data.examples.length>MAX_ROWS)throw Error('Invalid native gear checkpoint');
    const d=new NativeGearDrive({gears,seed:data.seed});
    for(const k of ['cueCounts','cueTotals','glob','lengths'])d[k]=deserialize(data[k]);
    d.examples=data.examples;d.rows=finite(data.rows);d.tested=finite(data.tested);d.preExact=finite(data.preExact);
    d.accepted=finite(data.accepted);d.blocked=finite(data.blocked);d.fallbacks=finite(data.fallbacks);
    d.cursorSteps=finite(data.cursorSteps);return d;
  }
}
