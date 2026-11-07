// MagicPerspective V17: Learn to CONSTRUCT paths from incomplete worlds.
// Two independent geometries use one recorded state/action/successor grammar.
// Maze: compare COMPLETE vs MASKED observations in TRAINING only; at frozen
// evaluation the organism receives NO terrain map, BFS field or solved route.
// Text: each predicted character is an action through a multi-scale context;
// a complete response is a hierarchical composition of those actions.
// This is empirical partial-observation inference, not semantic comprehension.
import {ACTIONS, nextCell, bfs, makeMaze, seedOf, SEEDS} from './labyrinth.mjs';

const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const EPS=1e-9, END=256;
function signature(v) { return String(v); }
export class ConstructedTransitionGraph {
  constructor({maxStates=160000}={}) {
    this.edges=new Map();this.maxStates=maxStates;
    this.observations=0;this.predictedBeforeObservation=0;this.rightBeforeObservation=0;
    this.unknownStates=0;
  }
  observe(from,action,to) {
    const key=signature(from),label=signature(action),next=signature(to);
    let choices=this.edges.get(key);
    if(!choices) {
      if(this.edges.size>=this.maxStates){this.unknownStates++;return false;}
      choices=new Map();this.edges.set(key,choices);
    }
    const before=this.predict(key,label);
    if(before) {
      this.predictedBeforeObservation++;
      this.rightBeforeObservation+=Number(before===next);
    }
    let values=choices.get(label);
    if(!values){values=new Map();choices.set(label,values);}
    values.set(next,(values.get(next)||0)+1);this.observations++;return true;
  }
  predict(from,action) {
    const opts=this.edges.get(signature(from))?.get(signature(action));
    if(!opts)return null;
    let best=null,n=-1;
    for(const [to,count] of opts)if(count>n){best=to;n=count;}
    return best;
  }
  choices(from) {
    const actions=this.edges.get(signature(from));
    if(!actions)return [];
    return [...actions].map(([action,targets])=>{
      const total=[...targets.values()].reduce((a,b)=>a+b,0);
      const successors=[...targets].sort((a,b)=>b[1]-a[1]).map(([to,n])=>({to,
        probability:n/total,seen:n}));
      return {action,successors,total};
    });
  }
  // Generic navigation through connections actually learned. Neither a maze
  // plan nor a character path can call a simulator oracle here.
  path(start,isGoal,{limit=256}={}) {
    const key=signature(start),Q=[{state:key,route:[]}],seen=new Set([key]);
    for(let i=0;i<Q.length&&i<limit;i++){
      const now=Q[i];
      if(isGoal(now.state))return {found:true,route:now.route,expanded:i+1};
      for(const edge of this.choices(now.state))for(const next of edge.successors){
        if(seen.has(next.to))continue;
        seen.add(next.to);Q.push({state:next.to,route:now.route.concat({from:now.state,action:edge.action,
          to:next.to,probability:next.probability})});
        if(Q.length>=limit)break;
      }
    }
    return {found:false,route:[],expanded:Q.length};
  }
  status(){return {observedEdges:this.observations,distinctStates:this.edges.size,
    unseenContexts:this.unknownStates,preObservationAccuracy:this.predictedBeforeObservation?
      this.rightBeforeObservation/this.predictedBeforeObservation:null};}
}

// Learned *operation* (not memory of individual maze routes): given a
// partly seen local state, estimate whether a direction continues toward
// the goal. Training compares the SAME maze with and without all pathways.
// Only aggregate coefficients and an empirical open-space prior are kept.
export class ConstructedPathLearner {
  constructor({seed=11,maxTextStates=160000}={}) {
    this.seed=seed;
    this.links=new ConstructedTransitionGraph({maxStates:maxTextStates});
    this.weights=[0,0,0,0,0,0];  // bias, toward-goal, known open, unknown, known blocked, novelty
    // Shared learner, reused without retraining separate fixed rules for every
    // world: predicted progress, causal support, uncertainty and novelty.
    this.pathPolicy=[0,0,0,0,0,0];this.pathPolicyUpdates=0;
    this.examples=0;this.paired=0;this.open=1;this.blocked=1;
    this.textRows=0;this.textChars=0;this.textEOS=0;
    this.byScale=[1,2,4,8,16,32];
    this.scales=this.byScale.map(()=>new ConstructedTransitionGraph({maxStates:Math.floor(maxTextStates/6)}));
    this.first=new Map();this.endCounts=new Map();
    this.lastMaze=null;this.lastText=null;this.lastPair=null;
    // Set by the owning Brain only in the isolated unified experiment.
    this.worldCore=null;
  }
  features(map,n,pos,action,goal,visited=null) {
    const j=nextCell({n},pos,action),v=j<0?1:map[j];
    const here=Math.abs(pos%n-goal%n)+Math.abs(Math.floor(pos/n)-Math.floor(goal/n));
    const there=j<0?here+5:Math.abs(j%n-goal%n)+Math.abs(Math.floor(j/n)-Math.floor(goal/n));
    return [1,clip(here-there,-1,1),v===0?1:0,v===-1?1:0,
      v===1?-1:0,visited&&j>=0?1/(1+(visited[j]||0)):1];
  }
  score(feature){return feature.reduce((s,v,i)=>s+v*this.weights[i],0);}
  transferableFeatures({progress=0,support=0,uncertainty=0,novelty=1,terminal=0}={}){
    return [1,clip(progress,-1,1),clip(support,0,1),clip(-uncertainty,-1,0),
      clip(novelty,0,1),clip(terminal,0,1)];
  }
  transferableScore(feature) {
    return feature.reduce((v,x,i)=>v+x*this.pathPolicy[i],0);
  }
  learnTransferable(feature,successful,rate=.04) {
    const logit=clip(this.transferableScore(feature),-25,25);
    const predicted=1/(1+Math.exp(-logit));
    const delta=clip((successful?1:0)-predicted,-1,1)*rate;
    for(let k=0;k<this.pathPolicy.length;k++)this.pathPolicy[k]+=delta*feature[k];
    this.pathPolicyUpdates++;
    return predicted;
  }
  // A generic route constructor works on the currently *BELIEVED* world.
  // Unknown cells remain traversable at a learned extra cost. A failed guess
  // revises the map; success reveals new edges. NO true wall is read in plan.
  construct(map,n,start,goal,{visited=null,noise=null}={}) {
    if(!Number.isInteger(n)||map.length!==n*n||start<0||goal<0)return [];
    const dist=new Float64Array(n*n).fill(Infinity),prev=new Int32Array(n*n).fill(-1);
    const prevAction=new Int8Array(n*n).fill(-1),used=new Uint8Array(n*n);
    dist[start]=0;
    const openRate=this.open/(this.open+this.blocked);
    const uncertaintyCost=1.0+2.2*(1-openRate);
    for(let t=0;t<n*n;t++){
      let p=-1,best=Infinity;
      for(let j=0;j<n*n;j++)if(!used[j]&&dist[j]<best){best=dist[j];p=j;}
      if(p<0||p===goal)break;used[p]=1;
      for(let a=0;a<4;a++){
        const j=nextCell({n},p,a);
        if(j<0||map[j]===1)continue;
        const f=this.features(map,n,p,a,goal,visited);
        const learned=this.examples?clip(this.score(f),-4,4):0;
        const transfer=this.transferableScore(this.transferableFeatures({
          progress:f[1],support:f[2],uncertainty:f[3],novelty:f[5],
          terminal:Number(j===goal&&map[j]===0)}));
        const shared=this.worldCore?.scoreMaze({
          progress:f[1],support:f[2],uncertainty:f[3]===1?1:0,
          novelty:f[5],terminal:Number(j===goal&&map[j]===0)})||0;
        const cost=1+(map[j]===-1?uncertaintyCost:0)+
          clip(-learned*.16-transfer*.06-shared*.24,-.65,.65)+(visited?.[j]||0)*.03;
        if(dist[p]+cost<dist[j]){
          dist[j]=dist[p]+cost;prev[j]=p;prevAction[j]=a;
        }
      }
    }
    if(!Number.isFinite(dist[goal]))return [];
    const route=[];let q=goal;
    while(q!==start&&q>=0&&route.length<n*n){
      const p=prev[q];if(p<0)return [];
      route.push({from:p,to:q,action:prevAction[q],uncertain:map[q]===-1,
        predictedConfidence:map[q]===-1?this.open/(this.open+this.blocked):1});
      q=p;
    }
    return route.reverse();
  }
  static reveal(world,belief,pos,radius=2) {
    const {n}=world;
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const x=pos%n+dx,y=Math.floor(pos/n)+dy;
      if(x>=0&&y>=0&&x<n&&y<n){
        const i=y*n+x;belief[i]=world.wall[i]?1:0;
      }
    }
  }
  trainPair(world,{samples=0}={}) {
    // Complete view and mask are temporary TRAINING observations; no world
    // walls, distance field or target-specific route survives in the model.
    const n=world.n;
    const trueDistances=bfs(n,world.wall,world.goal); // train-only supervisory comparison
    let compared=0,missed=0;
    const cap=samples>0?clip(Math.trunc(samples),1,n*n):n*n;
    const candidates=[];
    for(let p=0;p<n*n;p++)if(!world.wall[p]&&trueDistances[p]<1e9)candidates.push(p);
    // Deterministic, unbiased across episodes. No test data ever enters.
    const stride=Math.max(1,Math.floor(candidates.length/cap));
    for(let i=0;i<candidates.length;i+=stride){
      const p=candidates[i],partial=new Int8Array(n*n).fill(-1);
      ConstructedPathLearner.reveal(world,partial,p,2);
      const blindFirst=this.construct(partial,n,p,world.goal)[0]?.action;
      let positive=false;
      for(let a=0;a<4;a++){
        const j=nextCell(world,p,a);
        const y=j>=0&&!world.wall[j]&&trueDistances[j]<trueDistances[p]?1:0;
        const x=this.features(partial,n,p,a,world.goal);
        const expected=1/(1+Math.exp(-clip(this.score(x),-30,30)));
        for(let k=0;k<this.weights.length;k++)this.weights[k]+=.045*(y-expected)*x[k];
        this.learnTransferable(this.transferableFeatures({
          progress:x[1],support:x[2],uncertainty:x[3],novelty:x[5],
          terminal:Number(j===world.goal)}),y,.015);
        this.examples++;compared++;
        if(y){positive=true;if(blindFirst!==a)missed++;}
        if(j>=0){this.open+=!world.wall[j]?1:0;this.blocked+=world.wall[j]?1:0;}
      }
    }
    this.paired++;
    this.lastPair={n,trainExample:true,compared,firstPathMismatch:missed,
      weights:this.weights.slice(),unknownPrior:this.open/(this.open+this.blocked)};
    return this.lastPair;
  }
  // A test world contains only START + GOAL + currently sensed local patch.
  // Paths are proposed using its own belief map before an action, then revised
  // from observed movement/no-movement. Teacher BFS is metric-only.
  navigateBlind(world,{maxSteps=world.n*world.n*6,record=false,train=false,noiseAgent=null,live=null,onTransition=null}={}) {
    const n=world.n,belief=new Int8Array(n*n).fill(-1),visits=new Uint16Array(n*n);
    let pos=world.start,steps=0,bumps=0,routeRepairs=0,madePredictions=0;
    ConstructedPathLearner.reveal(world,belief,pos,2);
    visits[pos]++;
    const initialMap=record?Array.from(belief):null;
    // ONE prediction from an INCOMPLETE world, before any action.
    const predictedInitial=this.construct(belief,n,pos,world.goal,{visited:visits});
    const firstRoute=predictedInitial.map(x=>({...x}));
    // This is EVALUATOR-ONLY scoring, calculated strictly after the first
    // route is frozen. The planner receives no true dist, wall or teacher path.
    let p0=world.start,firstCorrect=0;
    for(const edge of firstRoute){
      if(edge.from!==p0||edge.to<0||world.wall[edge.to]||
        world.dist[edge.to]>=world.dist[p0])break;
      firstCorrect++;p0=edge.to;
    }
    const firstShapeAccuracy=firstCorrect/
      Math.max(1,firstRoute.length,world.dist[world.start]);
    let chosen=predictedInitial,at=0,lastUncertain=null;
    const trace=[],path=[pos],beforeObservations=belief.filter(v=>v===-1).length;
    while(pos!==world.goal&&steps<maxSteps){
      if(at>=chosen.length||chosen[at]?.from!==pos){
        const next=this.construct(belief,n,pos,world.goal,{visited:visits});
        if(!next.length)break;
        chosen=next;at=0;routeRepairs++;
      }
      if(!chosen.length)break;
      const proposed=chosen[at];
      const state='maze:'+world.seed+':'+n+':'+pos,action='move:'+proposed.action;
      const modelPrediction=this.links.predict(state,action);
      let a=proposed.action;
      // The organism's OWN noise agency may explore alternatives; this is
      // an internal branch choice, not a global slider forced by the person.
      const portal=noiseAgent?.decide({domain:'maze',known:this.examples>0,planned:chosen.length>0})||null;
      if(portal&&['action','imagination'].includes(portal.site))
        a=noiseAgent.output(a,4,portal);
      // This is a REAL local retinal view, not the hidden complete map.
      // Feed the original V17 Brain (and optionally shared PyTorch transition
      // queue) rather than training a disconnected demonstration agent.
      if(live){
        const S=[1,2,3,4,127];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
          const x=pos%n+dx,y=Math.floor(pos/n)+dy,j=y*n+x;
          const v=x<0||y<0||x>=n||y>=n||belief[j]===-1?4:belief[j]===1?1:
            j===world.goal?2:j===pos?3:0;
          live(S[v]);
        }
        live([5,6,7,8][a]);
      }
      const beforeBelief=Array.from(belief);
      const j=nextCell(world,pos,a),before=pos;
      const moved=j>=0&&!world.wall[j];
      if(moved){pos=j;path.push(pos);visits[pos]++;} else bumps++;
      const predictedState=modelPrediction;
      if(predictedState!==null){madePredictions++;}
      // The physics is accessible only AFTER the chosen physical action.
      if(j>=0&&train){this.open+=moved?1:0;this.blocked+=moved?0:1;}
      if(j>=0)belief[j]=moved?0:1;
      if(moved)ConstructedPathLearner.reveal(world,belief,pos,2);
      if(train){
        this.links.observe(state,action,'maze:'+world.seed+':'+n+':'+pos);
        const seen=beforeBelief[j] ?? -1;
        this.learnTransferable(this.transferableFeatures({
          progress:clip((Math.abs(before%n-world.goal%n)+
            Math.abs(Math.floor(before/n)-Math.floor(world.goal/n)))-
            (Math.abs(pos%n-world.goal%n)+Math.abs(Math.floor(pos/n)-Math.floor(world.goal/n))),-1,1),
          support:Number(seen===0),uncertainty:Number(seen===-1),
          novelty:1/(1+(visits[pos]||0)),terminal:Number(pos===world.goal)}),moved,.007);
      }
      if(live)live(moved?30:31);
      if(onTransition)onTransition({domain:'maze',before:beforeBelief,after:Array.from(belief),
        action:'move:'+a,context:'mask:'+n,worldSeed:world.seed,
        actualMoved:moved,actualProgress:clip((Math.abs(before%n-world.goal%n)+
          Math.abs(Math.floor(before/n)-Math.floor(world.goal/n)))-
          (Math.abs(pos%n-world.goal%n)+Math.abs(Math.floor(pos/n)-Math.floor(world.goal/n))),-1,1),
        actualTerminal:pos===world.goal,
        sensedUncertainty:j<0?1:Number(beforeBelief[j]===-1)});
      if(portal&&train)noiseAgent.learn(portal,{before:[before],after:[pos],solved:pos===world.goal});
      if(record)trace.push({step:steps,from:before,to:pos,proposed,action:a,moved,
        sensedCells:belief.filter(x=>x!==-1).length,portal:portal?.site||'none',
        predictedNext:predictedState,worldSolved:pos===world.goal});
      if(pos===proposed.to&&a===proposed.action)at++;
      else{at=chosen.length;routeRepairs++;}
      steps++;
    }
    const result={n,seed:world.seed,solved:pos===world.goal,steps,bumps,
      initialUnknowns:beforeObservations,firstShapeLength:firstRoute.length,
      firstShapeAccuracy,firstCorrectSteps:firstCorrect,
      firstShape:firstRoute.map(x=>x.action),firstUncertain:firstRoute.filter(x=>x.uncertain).length,
      routeRepairs,learnedTrainingPairs:this.paired,
      seenCells:belief.filter(x=>x!==-1).length,goalVisibleAsCoordinate:true,
      blindAtDecision:true,actualWorldNeverReadByPlanner:true,
      learnedEdgePredictions:madePredictions,finalBelief:record?Array.from(belief):undefined,
      initialBelief:initialMap,plannedInitial:record?firstRoute:undefined,
      path:record?path:undefined,trace:record?trace:undefined};
    if(record)this.lastMaze=result;
    return result;
  }
  // Each character is its own action, each suffix-scale a relation state, and
  // the answer is a composition of shorter paths. The next character must be
  // generated without seeing it: no teacher-forcing in this routine.
  static qkey(question){
    const w=String(question||'').toLowerCase().match(/[a-z0-9_]+/g)||[];
    // Lexical associations are fallible! This is a learned contextual anchor,
    // not a supplied semantic embedding or a hidden ideal answer.
    return [...new Set(w.filter(x=>x.length>2))].slice(0,6).sort().join('|').slice(0,120);
  }
  textState(question,history,scale){
    const suffix=history.slice(-scale);
    return 'text:'+scale+':'+(scale>=8?ConstructedPathLearner.qkey(question):'')+':'+suffix;
  }
  trainText(question,answer){
    if(typeof question!=='string'||typeof answer!=='string'||!question.trim()||!answer.trim())
      return {trained:false,reason:'missing observed question or answer'};
    const q=question.slice(0,8192);
    // No hard cap on training answer length; only the number of DISTINCT
    // learned states is bounded. Long sequences continue providing evidence.
    const bytes=Array.from(answer,c=>c.charCodeAt(0)).filter(x=>x>=0&&x<128);
    const context=this.first.get(ConstructedPathLearner.qkey(q))||new Map();
    const firstKey=ConstructedPathLearner.qkey(q),leading=bytes[0];
    context.set(leading,(context.get(leading)||0)+1);
    if(this.first.size<25000||this.first.has(firstKey))this.first.set(firstKey,context);
    let history='';
    for(let i=0;i<=bytes.length;i++){
      const next=i===bytes.length?END:bytes[i];
      for(let s=0;s<this.byScale.length;s++){
        const width=this.byScale[s],state=this.textState(q,history,width);
        this.scales[s].observe(state,String(next),this.textState(q,history+String.fromCharCode(next===END?0:next),width));
      }
      if(next===END){this.textEOS++;break;}
      this.textChars++;history+=String.fromCharCode(next);
      if(history.length>32)history=history.slice(-32);
    }
    this.textRows++;
    return {trained:true,chars:bytes.length,rows:this.textRows};
  }
  nextCharacters(question,history,limit=6){
    const values=new Map();
    // A mixture of learned contexts at six scales is the higher-dimensional
    // *choice space*. Long contexts are trusted only when observed repeatedly.
    for(let s=0;s<this.byScale.length;s++){
      const width=this.byScale[s],key=this.textState(question,history,width);
      const choices=this.scales[s].choices(key);
      const seen=choices.reduce((sum,r)=>sum+r.total,0);
      const reliability=Math.log2(1+seen)/(3+Math.log2(1+seen))*(1+s*.12);
      for(const e of choices){const action=+e.action;if(!Number.isInteger(action))continue;
        values.set(action,(values.get(action)||0)+reliability*e.total/Math.max(1,seen));}
    }
    if(!history.length){
      const starters=this.first.get(ConstructedPathLearner.qkey(question));
      if(starters){const n=[...starters.values()].reduce((a,b)=>a+b,0);
        for(const [c,k] of starters)values.set(c,(values.get(c)||0)+k/n*1.4);}
    }
    const sum=[...values.values()].reduce((n,x)=>n+x,0)+EPS;
    return [...values].map(([character,weight])=>{
      const support=clip(weight/sum,0,1);
      const tf=this.transferableFeatures({progress:character===END?1:0,
        support,uncertainty:1-support,novelty:history.endsWith(String.fromCharCode(character))?0:1,
        terminal:Number(character===END)});
      const policyAdjustment=clip(this.transferableScore(tf),-5,5);
      return {character,weight:weight*Math.exp(policyAdjustment*.12),
        transferableScore:policyAdjustment};
    }).sort((a,b)=>b.weight-a.weight).slice(0,limit);
  }
  imagineText(question,{maxChars=512,beamWidth=3,fanOut=4,prefix="",record=true}={}){
    if(!question?.trim())throw Error('Question required before constructing a text route');
    const L=clip(Math.floor(maxChars),1,20000),B=clip(beamWidth,1,8),F=clip(fanOut,1,8);
    // Prefix is the CURRENT observed cursor state when replanning, not a
    // reference answer. The initial call always has empty prefix.
    const pre=String(prefix||"").slice(-200);
    let beam=[{output:pre,score:0,done:false,steps:[],boundaries:[]}],expanded=0;
    for(let i=0;i<L;i++){
      const candidates=[];
      for(const hyp of beam){
        if(hyp.done){candidates.push(hyp);continue;}
        const options=this.nextCharacters(question,hyp.output.slice(-32),F);
        if(!options.length){candidates.push({...hyp,done:true});continue;}
        const sum=options.reduce((a,b)=>a+b.weight,0)+EPS;
        for(const opt of options) {
          const done=opt.character===END;
          const next=done?hyp.output:hyp.output+String.fromCharCode(opt.character);
          const terminalBoundary=/[ .!?\n]/.test(next.slice(-1));
          const steps=hyp.steps.concat({position:pre.length+i,action:opt.character,
            scaleEvidence:this.byScale.map((scale,j)=>this.scales[j].choices(
              this.textState(question,hyp.output.slice(-32),scale)).reduce((n,r)=>n+r.total,0)),
            alternatives:options.slice(0,4)});
          candidates.push({output:next,score:hyp.score+Math.log((opt.weight+EPS)/sum),
            steps,done,boundaries:terminalBoundary?hyp.boundaries.concat(next.length):hyp.boundaries});
          expanded++;
        }
      }
      candidates.sort((a,b)=>{
        const x=a.score/(Math.pow(Math.max(1,a.output.length),.65));
        const y=b.score/(Math.pow(Math.max(1,b.output.length),.65));
        return y-x || a.output.length-b.output.length;
      });
      beam=candidates.slice(0,B);
      if(beam.every(x=>x.done))break;
    }
    const winner=beam.find(x=>x.done)||beam[0];
    const result={question,predicted: winner?.output||'',path:winner?.steps||[],
      wordOrSentenceBoundaries:winner?.boundaries||[],expanded,
      finished:!!winner?.done,modelRows:this.textRows,graphStates:this.scales.reduce((a,g)=>a+g.edges.size,0),
      previewBeforeAnswer:true,referenceNotAvailable:true,
      note:'One character is one internal graph action; the complete answer is a composition of these action paths. Contextual transition learning is NOT proof of semantic correctness.'};
    if(record)this.lastText={...result,path:result.path.slice(0,128)};
    return result;
  }
  // Live, no-oracle episode from the SAME six-scale character transition
  // graphs owned by the Brain. Compute the global answer-shape BEFORE the
  // observed answer of the current training row is absorbed. A separate
  // greedy local cursor then executes each emitted character. Divergence
  // triggers a fresh plan from its current prefix. Every edge shown is
  // either in a learned scale graph or was generated by this recorded policy.
  traceLiveTextMaze(question,{maxChars=24}={}){
    const prompt=String(question||"").slice(0,1024);
    if(!prompt.trim())return {ready:false,reason:"no-prompt",modelRows:this.textRows};
    const size=clip(Math.trunc(maxChars)||24,1,40);
    if(!this.textRows)return {ready:false,reason:"no-previous-learned-text-transitions",
      question:prompt.slice(0,160),modelRows:0};
    const startRows=this.textRows,startStates=this.scales.reduce((a,g)=>a+g.edges.size,0);
    const overhead=this.imagineText(prompt,{maxChars:size,beamWidth:3,fanOut:4,record:false});
    const global=overhead.predicted||"";
    const shape=[""];
    for(let i=0;i<global.length;i++)shape.push(global.slice(0,i+1));
    // The gold line is frozen now. The local cursor NEVER reads the reference
    // answer or a subsequently trained row.
    const frames=[{index:0,stage:"before-first-action",state:"",
      plannedBeforeFirstMovement:true,options:[],perspective:"global"}];
    const exploration=new Map(),links=new Map(),put=(from,to,kind,count=1)=>{
      const key=from+"\u0000"+to+"\u0000"+kind;
      if(!links.has(key))links.set(key,{from,to,kind,count});
    };
    let cursor="",replans=0,divergences=0,terminated=false,finished=false;
    const limited=size;
    for(let i=0;i<limited;i++){
      const choices=this.nextCharacters(prompt,cursor.slice(-32),5);
      if(!choices.length)break;
      const chosen=choices[0],code=chosen.character;
      const nextChar=code===END?"":String.fromCharCode(code);
      const current=cursor,next=cursor+nextChar;
      const inInitial=shape[i+1]||null;
      const options=choices.slice(0,5).map(c=>{
        const ch=c.character===END?"END":String.fromCharCode(c.character);
        const candidate=c.character===END?cursor:cursor+ch;
        put(current,candidate,"learned-alternative",c.weight);
        return {character:ch,state:candidate,score:c.weight,
          scales:this.byScale.map((n,j)=>this.scales[j].choices(
            this.textState(prompt,cursor.slice(-32),n)).reduce((v,x)=>v+x.total,0))};
      });
      const move=code===END?"END":nextChar;
      const matched=next===inInitial;
      if(!matched)divergences++;
      if(code!==END)put(current,next,"executed",chosen.weight);
      let revised=null;
      if(!matched&&code!==END){
        revised=this.imagineText(prompt,{prefix:next,maxChars:Math.min(12,limited-i-1),
          beamWidth:3,fanOut:4,record:false});
        replans++;
      }
      frames.push({index:i+1,stage:"after-action",before:current,state:next,
        action:move,chosenScore:chosen.weight,initialExpected:inInitial,
        alignedWithInitial:matched,alternatives:options,
        correctedShape:revised?(()=>{
          const arr=[next];for(let k=next.length;k<revised.predicted.length;k++)
            arr.push(revised.predicted.slice(0,k+1));return arr;
        })():null,
        perspective:matched?"body":"body → overhead → body",
        effectSource:"same-trained-multiscale-character-graph",
        semanticOracle:false});
      if(code===END){terminated=true;finished=true;break;}
      cursor=next;
    }
    return {ready:true,kind:"multiscale-character-maze",question:prompt.slice(0,160),
      modelRowsBeforeNewObservation:startRows,graphStates:startStates,
      initialShape:shape,globalPrediction:global,originalGlobalFinished:overhead.finished,
      globalExpanded:overhead.expanded,frames,links:[...links.values()].slice(0,220),
      endState:cursor,bodyActions:frames.length-1,
      divergences,replans,terminated,finished,
      trainReferenceProvided:false,oracleAnswerUsed:false,
      semanticsValidated:false,goalType:"sequence-completion (EOS)",
      scales:this.byScale.slice(),status:"frozen-before-current-row-training"};
  }
  summary(){return {pairedWorlds:this.paired,pairedObservations:this.examples,
    learnedUnknownOpenPrior:this.open/(this.open+this.blocked),learnedPathCoefficients:this.weights.slice(),
    transferablePolicy:{weights:this.pathPolicy.slice(),updates:this.pathPolicyUpdates,
      usedBy:['maze','text']},
    textQARows:this.textRows,textPathActions:this.textChars,textCompletedPaths:this.textEOS,
    scaleGraphStates:this.scales.map((g,i)=>({scale:this.byScale[i],...g.status()})),
    sharedRelations:this.links.status(),lastMaze:this.lastMaze,lastText:this.lastText,lastPair:this.lastPair};}
}
