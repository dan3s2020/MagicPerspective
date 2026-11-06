// Opt-in language action world for MagicPerspective V17.
// The reference answer is private to the TRAINING environment's reward function.
// It never enters proposed actions, simulated transitions, or held-out planning.
// Not a natural-language semantics oracle: actions operate on drafts and observed words.
import {tokenize,words,matchScore} from './text_action_paths.mjs';

const MAX_DRAFT=256, ACTIONS=5, MAX_CONTEXT_VALUES=60000, MAX_GLOBAL_VALUES=50000, MAX_LENGTH_VALUES=50000;
const keyOf=(a)=>JSON.stringify(a);
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
function rng(seed){let x=seed>>>0||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function validAction(a){return Number.isInteger(a?.tool)&&a.tool>=0&&a.tool<ACTIONS&&typeof a?.token==='string'&&a.token.length<=96;}
const safeToken=s=>tokenize(s)[0]||'';
const stateOf=(tokens)=>({tokens:tokens.slice(),length:tokens.length});
function text(t){return t.join(' ').replace(/\s+([.,?!;:])/g,'$1').replace(/([({])\s+/g,'$1');}
const exactSame=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

// Action IDs have an unknown, world-specific mapping. This remains private to the environment.
// A learner has to infer effects from state->action->observed state transitions.
const operations=['append','replace','delete','swap','copy'];
export class LanguageWorld {
  #permutation;
  #reference;
  constructor({prompt,reference=null,seed=11,initial=[]}={}){
    if(typeof prompt!=='string'||!prompt.trim())throw Error('A text-world prompt is required');
    if(reference!==null&&typeof reference!=='string')throw Error('Reference must be a string or null');
    this.prompt=prompt;this.tokens=initial.slice(0,MAX_DRAFT).map(safeToken).filter(Boolean);
    this.stepCount=0;this.history=[];
    // Stable seed per world. Not exposed to agents. A new world can change the laws.
    const r=rng(seed),a=operations.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    this.#permutation=a;
    this.#reference=reference===null?null:tokenize(reference).slice(0,MAX_DRAFT);
  }
  observe(){return {prompt:this.prompt,...stateOf(this.tokens),step:this.stepCount};}
  reward(){
    if(this.#reference===null)return null;
    const ref=this.#reference,actual=this.tokens;
    const common=actual.filter((v,i)=>v===ref[i]).length,prec=common/Math.max(1,actual.length),rec=common/Math.max(1,ref.length);
    const positionalF1=(prec+rec)?2*prec*rec/(prec+rec):0;
    // Reference visible to environment only, not to the learner.
    return clip(.65*positionalF1+.35*matchScore(text(actual),text(ref)).f1,0,1);
  }
  act(action){
    if(!validAction(action))throw Error('Invalid text-world action');
    const before=this.observe(),r0=this.reward(),s=this.tokens;
    const operation=this.#permutation[action.tool],token=safeToken(action.token);
    if(operation==='append'&&token&&s.length<MAX_DRAFT)s.push(token);
    if(operation==='replace'&&token&&s.length)s[s.length-1]=token;
    if(operation==='delete'&&s.length)s.pop();
    if(operation==='swap'&&s.length>=2)[s[s.length-2],s[s.length-1]]=[s[s.length-1],s[s.length-2]];
    if(operation==='copy'&&s.length<MAX_DRAFT){const w=words(this.prompt);if(w.length)s.push(w[(s.length+this.stepCount)%w.length]);}
    this.stepCount++;
    const after=this.observe(),r1=this.reward(),feedback=r0===null?null:{before:r0,after:r1,delta:r1-r0,solved:exactSame(s,this.#reference)};
    const ev={step:this.stepCount,before:before.tokens,action:{tool:action.tool,token},after:after.tokens,feedback};
    this.history.push(ev);return {observation:after,feedback,event:ev};
  }
  // Only acceptance tests may inspect hidden physical mechanics; ordinary training does not call this.
  observerLawForTestOnly(){return this.#permutation.slice();}
}

function classify(before,after,action,prompt){
  const a=before.tokens,b=after.tokens,la=a.length,lb=b.length;
  if(lb===la+1&&exactSame(a,b.slice(0,-1))){
    if(b.at(-1)===safeToken(action.token))return 'append';
    if(words(prompt).includes(b.at(-1)))return 'copy';
    return 'append';
  }
  if(lb===la-1&&exactSame(b,a.slice(0,-1)))return 'delete';
  if(lb===la&&la>0&&exactSame(b.slice(0,-1),a.slice(0,-1))&&b.at(-1)===safeToken(action.token))return 'replace';
  if(lb===la&&la>=2&&exactSame(b.slice(0,-2),a.slice(0,-2))&&b.at(-2)===a.at(-1)&&b.at(-1)===a.at(-2))return 'swap';
  return 'noop';
}
function simulate(before,action,kind){
  const a=before.tokens.slice(),token=safeToken(action.token);
  if(kind==='append'&&token&&a.length<MAX_DRAFT)a.push(token);
  else if(kind==='replace'&&token&&a.length)a[a.length-1]=token;
  else if(kind==='delete'&&a.length)a.pop();
  else if(kind==='swap'&&a.length>=2)[a[a.length-2],a[a.length-1]]=[a[a.length-1],a[a.length-2]];
  else if(kind==='copy'&&a.length<MAX_DRAFT){const w=words(before.prompt);if(w.length)a.push(w[(a.length+before.step)%w.length]);}
  return stateOf(a);
}
const pickTop=m=>[...m].sort((a,b)=>b[1]-a[1])[0];
export class ActionDynamics {
  constructor(){this.counts=Array.from({length:ACTIONS},()=>new Map());this.observations=0;this.matches=0;}
  observe(before,action,after){
    if(!validAction(action))throw Error('Invalid action');
    const predicted=this.predict(before,action),kind=classify(before,after,action,before.prompt);
    const c=this.counts[action.tool];
    // A blocked or inapplicable action does not reveal its underlying law.
    if(kind!=='noop')c.set(kind,(c.get(kind)||0)+1);
    this.observations++;
    if(predicted.available&&exactSame(predicted.tokens,after.tokens))this.matches++;
    return {classified:kind,predictedBeforeObservation:predicted.available?predicted.tokens:null,
      predictionMatched:predicted.available?exactSame(predicted.tokens,after.tokens):null};
  }
  predict(before,action){
    const best=pickTop(this.counts[action.tool]);
    if(!best||best[1]<2)return {available:false,confidence:0,tokens:before.tokens.slice()};
    const total=[...this.counts[action.tool].values()].reduce((a,b)=>a+b,0);
    return {available:true,confidence:best[1]/total,kind:best[0],tokens:simulate(before,action,best[0]).tokens};
  }
  summary(){return {observations:this.observations,preActionPredictions:this.matches,
    effects:this.counts.map((c,tool)=>({tool,observed:[...c],prediction:this.predict({prompt:'probe',tokens:['x','y'],step:0},{tool,token:'z'}).kind||null}))};}
  export(){return {counts:this.counts.map(m=>[...m]),observations:this.observations,matches:this.matches};}
  static restore(s){const x=new ActionDynamics();if(!Array.isArray(s?.counts)||s.counts.length!==ACTIONS)throw Error('Invalid action dynamics');
    x.counts=s.counts.map(c=>new Map(c));x.observations=s.observations||0;x.matches=s.matches||0;return x;}
}

// Trainable 32D prompt->goal field, with reproducible hashed input/target encodings.
// This is an empirical text embedding, NOT a discovered semantic manifold.
const D=32,F=128;
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
function hashes(s,n,makeBigrams=false){
 const toks=words(s).slice(0,160),f=new Float64Array(n);
 for(let i=0;i<toks.length;i++){
  const h=fnv('t:'+toks[i]);f[h%n]+=h&1?1:-1;
  if(makeBigrams&&i>0){const q=fnv('b:'+toks[i-1]+':'+toks[i]);f[q%n]+=(q&1?.6:-.6);}
 }
 const norm=Math.hypot(...f);if(norm)for(let j=0;j<n;j++)f[j]/=norm;
 return Array.from(f);
}
export class LatentGoalField {
 constructor(seed=7){this.seed=seed;const random=rng(seed);this.W=Array.from({length:D},()=>Array.from({length:F},()=>.025*(random()-.5)));
  this.updates=0;this.lastLoss=null;this.averageLoss=0;this.lr=.11;}
 features(prompt){return hashes(prompt,F,true);}
 target(answer){return hashes(answer,D,true);}
 goal(prompt){const f=this.features(prompt);return this.W.map(row=>row.reduce((s,w,i)=>s+w*f[i],0));}
 distance(v,g){const x=Array.isArray(v)&&v.length===D&&v.every(Number.isFinite)?v:typeof v==='string'?this.target(v):this.target(text(v));return mean(x.map((y,i)=>(y-g[i])**2));}
 fit(prompt,answer){const x=this.features(prompt),g=this.goal(prompt),y=this.target(answer);
  const error=g.map((v,i)=>v-y[i]);const loss=mean(error.map(v=>v*v));
  for(let i=0;i<D;i++)for(let j=0;j<F;j++)this.W[i][j]-=this.lr*error[i]*x[j];
  this.lastLoss=loss;this.averageLoss+=(loss-this.averageLoss)/(++this.updates);return loss;
 }
 summary(){return {dimensions:D,features:F,updates:this.updates,lastLoss:this.lastLoss,meanTrainingLoss:this.averageLoss,
  description:'32D trainable goal projection from hashed Unicode word/bi-gram features; NOT semantic equivalence'};}
 export(){return {version:1,seed:this.seed,W:this.W,updates:this.updates,lastLoss:this.lastLoss,averageLoss:this.averageLoss,lr:this.lr};}
 static restore(s){if(s?.version!==1||!Array.isArray(s.W)||s.W.length!==D||s.W.some(r=>!Array.isArray(r)||r.length!==F))throw Error('Invalid latent goal checkpoint');
  const m=new LatentGoalField(s.seed);Object.assign(m,s);return m;}
}

// A learned value field on goal-conditioned text states. The goal is predicted from prior
// corpus episodes (not read from the held-out answer). Updates use *observed reward only*.
export class TextValueField {
  constructor(){this.values=new Map();this.global=new Map();this.updates=0;}
  key(prompt,action,draft){const q=words(prompt).slice(0,12),p=words(draft).slice(-2);
    return [q.slice(0,2).join('_'),p.join('_'),action.tool,safeToken(action.token)].join('|');}
  predict(prompt,action,draft){const k=this.key(prompt,action,draft),l=this.values.get(k),g=this.global.get(action.tool+':'+safeToken(action.token));
    return (l?.n>=2?l.mean:.65*(g?.mean||0))||0;}
  observe(prompt,action,draft,delta){
    for(const [map,key] of [[this.values,this.key(prompt,action,draft)],[this.global,action.tool+':'+safeToken(action.token)]]){
      const s=map.get(key)||{mean:0,n:0};s.n++;s.mean+=(clip(delta,-1,1)-s.mean)/Math.min(30,s.n);map.set(key,s);
      const cap=map===this.values?MAX_CONTEXT_VALUES:MAX_GLOBAL_VALUES;
      if(map.size>cap)map.delete(map.keys().next().value);
    }this.updates++;
  }
  summary(){return {updates:this.updates,contextStates:this.values.size,globalActions:this.global.size};}
  export(){return {values:[...this.values],global:[...this.global],updates:this.updates};}
  static restore(s){const v=new TextValueField();v.values=new Map(s.values);v.global=new Map(s.global);v.updates=s.updates||0;return v;}
}

export class CausalTextAgent {
  constructor({seed=17}={}){this.seed=seed;this.rand=rng(seed);this.dynamics=new ActionDynamics();this.value=new TextValueField();this.latent=new LatentGoalField(seed+31);
    this.episodes=0;this.interventions=0;this.solved=0;this.last=null;this.lastHeldout=null;
    this.lengths=new Map();this.globalLength={mean:0,n:0};}
  learnGoalLength(prompt,answer){
    const k=words(prompt).slice(0,4).join('_'),n=tokenize(answer).slice(0,MAX_DRAFT).length;
    if(!k||!n)return;
    for(const [map,key] of [[this.lengths,k]]){const r=map.get(key)||{mean:0,n:0};r.n++;r.mean+=(n-r.mean)/r.n;map.set(key,r);if(map.size>MAX_LENGTH_VALUES)map.delete(map.keys().next().value);}
    const g=this.globalLength;g.n++;g.mean+=(n-g.mean)/g.n;
  }
  goalLength(prompt){const k=words(prompt).slice(0,4).join('_');
    const r=this.lengths.get(k);return clip(Math.round((r?.n>=2?r.mean:this.globalLength.mean)||16),1,MAX_DRAFT);}
  choices(observation,pathHead,{limit=5}={}){
    const prefix=observation.tokens,prompt=observation.prompt;
    const proposed=pathHead?.propose(prompt,prefix,limit)||[];
    const tokens=[...new Set([...proposed.map(x=>x.token),...words(prompt).slice(0,3)])].filter(x=>x!=='<eos>'&&x!=='<unk>').slice(0,limit+3);
    if(!tokens.length)tokens.push('the');
    // Tool IDs are deliberately opaque: the agent does not receive operation names.
    return Array.from({length:ACTIONS},(_,tool)=>tokens.map(token=>({tool,token}))).flat();
  }
  // The learned value field and candidate evidence are the ONLY navigation heuristics.
  // No target answer, environment law, or oracle path is read by this routine.
  rank(observation,pathHead,{top=10}={}){
    const candidates=this.choices(observation,pathHead,{limit:6}),prefix=observation.tokens;
    const observedProposals=new Map((pathHead?.propose(observation.prompt,prefix,8)||[]).map(x=>[x.token,x]));
    const draft=text(prefix),goal=this.latent.goal(observation.prompt),beforeField=this.latent.distance(prefix,goal);
    return candidates.map(a=>{
      const p=this.dynamics.predict(observation,a),delta=this.value.predict(observation.prompt,a,draft);
      const evidence=observedProposals.get(a.token);
      const matched=p.available&&!exactSame(p.tokens,prefix);
      const projectedField=p.available?this.latent.distance(p.tokens,goal):beforeField;
      const fieldGain=this.latent.updates>=3?(beforeField-projectedField)*.9:0;
      const generic=(evidence?.score??-6)*.025;
      const penalty=(prefix.length/MAX_DRAFT)*.025;
      const score=delta+.04*(matched?p.confidence:0)+generic+fieldGain-penalty;
      return {...a,score,expected:p.available?p.tokens:null,confidence:p.confidence,
        evidence:evidence?.observedTransitions||0,modelEffect:p.kind||null,fieldGain};
    }).sort((a,b)=>b.score-a.score||a.tool-b.tool||a.token.localeCompare(b.token)).slice(0,top);
  }
  probe(seed=this.seed){
    // Exploration of the physical tools with observed transitions, not a reference solution.
    const examples=[];for(let tool=0;tool<ACTIONS;tool++)for(let repeat=0;repeat<4;repeat++){
      const w=new LanguageWorld({prompt:'gamma alpha beta',seed,initial:['alpha','beta']});
      const pre=w.observe(),a={tool,token:'omega'},out=w.act(a);
      const info=this.dynamics.observe(pre,a,out.observation);
      examples.push({...out.event,model:info});this.interventions++;
    }
    return examples;
  }
  train(prompt,answer,pathHead,{maxActions=48,exploration=.25,seed=101,emit=null}={}){
    if(typeof prompt!=='string'||typeof answer!=='string'||!prompt.trim()||!answer.trim())return {trained:false,reason:'empty question/answer'};
    // The language world's action laws stay fixed for this brain. The episode seed affects only exploration.
    const world=new LanguageWorld({prompt,reference:answer,seed:this.seed}),r=rng((seed^this.seed^this.episodes)>>>0),events=[];
    let best=-Infinity;
    for(let t=0;t<clip(maxActions,1,256);t++){
      const before=world.observe(),opts=this.rank(before,pathHead,{top:12}),random=this.choices(before,pathHead);
      const choice=r()<exploration?random[Math.floor(r()*random.length)]:opts[0];
      if(!choice)break;
      const pre=this.dynamics.predict(before,choice),out=world.act(choice),d=out.feedback?.delta||0;
      const model=this.dynamics.observe(before,choice,out.observation);
      this.value.observe(prompt,choice,text(before.tokens),d);
      const goal=this.latent.goal(prompt);
      const event={...out.event,model,confidence:pre.confidence,
       latentBefore:this.latent.target(text(before.tokens)),latentAfter:this.latent.target(text(out.observation.tokens)),
       fieldDelta:this.latent.distance(before.tokens,goal)-this.latent.distance(out.observation.tokens,goal)};
      events.push(event);this.interventions++;
      emit?.(event);best=Math.max(best,out.feedback?.after||0);
      if(out.feedback?.solved)break;
    }
    this.learnGoalLength(prompt,answer);this.latent.fit(prompt,answer);
    this.episodes++;const result={trained:true,seed,steps:events.length,solved:world.reward()===1,
      final:text(world.tokens),reward:world.reward(),bestReward:best,events};
    result.goalLatent=this.latent.goal(prompt);
    if(result.solved)this.solved++;this.last=result;return result;
  }
  // A frozen test: held-out reference is NOT provided until after .navigate returns.
  navigate(prompt,pathHead,{steps=64,seed=11}={}){
    const world=new LanguageWorld({prompt,seed:this.seed}),events=[];
    const intendedLength=this.goalLength(prompt);
    for(let i=0;i<clip(steps,1,256);i++){
      if(world.tokens.length>=intendedLength)break;
      const before=world.observe(),ranked=this.rank(before,pathHead,{top:7});
      // No reward call or parameter update on frozen evaluation.
      let chosen=ranked.find(x=>x.expected&&!exactSame(x.expected,before.tokens));
      if(!chosen)break;
      const out=world.act(chosen),model=this.dynamics.predict(before,chosen);
      const goal=this.latent.goal(prompt);
      events.push({...out.event,predicted:chosen.expected,confidence:chosen.confidence,
        latentBefore:this.latent.target(text(before.tokens)),latentAfter:this.latent.target(text(out.observation.tokens)),
        fieldDelta:this.latent.distance(before.tokens,goal)-this.latent.distance(out.observation.tokens,goal),
        effect:chosen.modelEffect,alternatives:ranked.slice(0,4).map(x=>({tool:x.tool,token:x.token,score:x.score,expected:x.expected}))});
      if(!model.available||!exactSame(model.tokens,out.observation.tokens))break;
      // Stop when the model does not believe another action gives positive expected progress.
      if(i>1&&ranked[0].score<-.08)break;
    }
    return {prompt,generated:text(world.tokens),steps:events.length,intendedLength,goalLatent:this.latent.goal(prompt),events,
      origin:'original V17 corpus-derived TextActionPaths candidates + observed action dynamics + learned value field',
      caveat:'The field is learned from observed lexical reward; semantic correctness not guaranteed.'};
  }
  evaluate(prompt,reference,pathHead,{steps=64}={}){
    // O(1) freeze guard; complete checkpoint snapshots grow large during sustained training.
    const prior=[this.episodes,this.interventions,this.dynamics.observations,this.value.updates,this.globalLength.n,this.latent.updates];
    const route=this.navigate(prompt,pathHead,{steps}),metric=matchScore(route.generated,reference);
    const after=[this.episodes,this.interventions,this.dynamics.observations,this.value.updates,this.globalLength.n,this.latent.updates];
    if(!exactSame(prior,after))throw Error('Held-out evaluation mutated trainable state');
    this.lastHeldout={...route,metrics:metric,reference,referenceReadAfterPlanning:true};return this.lastHeldout;
  }
  summary(){return {episodes:this.episodes,interventions:this.interventions,solvedTrain:this.solved,
    dynamics:this.dynamics.summary(),value:this.value.summary(),latent:this.latent.summary(),goalLengthExamples:this.globalLength.n,last:this.last?{...this.last,events:this.last.events.slice(-30)}:null,
    heldout:this.lastHeldout?{...this.lastHeldout,events:this.lastHeldout.events.slice(0,30)}:null,
    implemented:'observed physical word-edit actions + learned action effects + learned reward field + goal-free heldout navigation',
    notImplemented:'learned natural-language semantics, grounded external world facts, shared CUDA tensor policy gradients'};}
  export(){return {version:1,seed:this.seed,episodes:this.episodes,interventions:this.interventions,solved:this.solved,
    dynamics:this.dynamics.export(),value:this.value.export(),latent:this.latent.export(),lengths:[...this.lengths],globalLength:this.globalLength};}
  static restore(s){if(s?.version!==1)throw Error('Invalid causal text checkpoint');const a=new CausalTextAgent({seed:s.seed});
    a.episodes=s.episodes||0;a.interventions=s.interventions||0;a.solved=s.solved||0;
    a.dynamics=ActionDynamics.restore(s.dynamics);a.value=TextValueField.restore(s.value);
    if(s.latent)a.latent=LatentGoalField.restore(s.latent);
    a.lengths=new Map(s.lengths||[]);a.globalLength=s.globalLength||{mean:0,n:0};return a;}
}
