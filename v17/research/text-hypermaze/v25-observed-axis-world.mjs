// V25 ISOLATED RESEARCH: learned action effects as position-invariant text axes.
// Native goal propagation is DIRECTLY the original V17 Discoverer.shape method.
// This is NOT a next-character model, pretrained LM, latent embedding, or
// replacement for the existing V17 Brain/UI/checkpoints.
// 
// Inductive bias, openly disclosed: an observed ONE-TOKEN replacement can
// apply at an UNSEEN position if its source token is UNIQUE in that text.
// This is a constrained edit-physics world, not learned semantic understanding.
import {Discoverer, KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

const snapshot = x => JSON.parse(JSON.stringify(x));
const key = s => JSON.stringify(s);
function checkTokens(tokens,max) {
  if (!Array.isArray(tokens) || tokens.length<1 ||
      tokens.length>max || tokens.some(x=>typeof x!=="string"))
    throw Error("Expected an observed bounded text-token state");
}
const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);

export class ObservedAxisCognitiveWorld {
  constructor({maxStates=128,maxStateTokens=4096}={}) {
    if(!Number.isInteger(maxStates)||maxStates<2||maxStates>20000||
       !Number.isInteger(maxStateTokens)||maxStateTokens<1||maxStateTokens>65536)
      throw Error("Invalid state or node budget");
    this.maxStates=maxStates;this.maxStateTokens=maxStateTokens;
    this.actions=new Map();this.blocked=new Set();
    this.observed=0;this.rejected=0;this.conflicts=0;
  }
  observeActionResult({before,action,after,accepted}={}) {
    checkTokens(before,this.maxStateTokens);checkTokens(after,this.maxStateTokens);
    if(before.length!==after.length||typeof action!=="string"||!action||
       typeof accepted!=="boolean")throw Error("Real same-length text action observation required");
    const blockedKey=key([before,action]);
    if(!accepted){
      this.rejected++;this.blocked.add(blockedKey);
      return {learned:false,wall:true};
    }
    const changed=[];
    for(let i=0;i<before.length;i++)if(before[i]!==after[i])changed.push(i);
    if(changed.length!==1)return {learned:false,reason:"only one-token observed changes supported"};
    const at=changed[0],from=before[at],to=after[at];
    let rule=this.actions.get(action);
    if(rule&&(rule.from!==from||rule.to!==to)){
      rule.ambiguous=true;rule.conflicts=(rule.conflicts||0)+1;this.conflicts++;
      return {learned:false,reason:"contradictory observed effect",ambiguous:true};
    }
    if(!rule){
      rule={action,from,to,count:0,ambiguous:false,
        observedPositions:[]};
      this.actions.set(action,rule);
    }
    rule.count++;
    if(!rule.observedPositions.includes(at)&&rule.observedPositions.length<24)
      rule.observedPositions.push(at);
    this.observed++;this.blocked.delete(blockedKey);
    return {learned:true,action,from,to,observedAt:at,evidence:rule.count};
  }
  predictEffect(tokens,action){
    checkTokens(tokens,this.maxStateTokens);
    const r=this.actions.get(action);
    if(!r||r.ambiguous||this.blocked.has(key([tokens,action])))return null;
    const i=tokens.indexOf(r.from);
    // A repeated source token is an ambiguous perspective. Abstain rather than
    // invent which occurrence is the intended subject of the action.
    if(i<0||tokens.lastIndexOf(r.from)!==i)return null;
    const out=tokens.slice();out[i]=r.to;
    return {after:out,index:i,action,
      source:"observed-causal-one-token-effect",
      observations:r.count};
  }
  static satisfied(state,goal){
    const values=goal?.requires;
    if(!Array.isArray(values)||values.length<1||
       values.some(x=>typeof x!=="string"||!x))
      throw Error("Goal must specify observable required words before planning");
    return values.every(x=>state.includes(x));
  }
  formSolution(start,goal,{seed=74129,temperature=0,maxStates=this.maxStates}={}){
    checkTokens(start,this.maxStateTokens);
    ObservedAxisCognitiveWorld.satisfied(start,goal);
    if(!Number.isInteger(maxStates)||maxStates<2||maxStates>this.maxStates)
      throw Error("Invalid planner node budget");
    const state0=start.slice();
    const states=[state0],neighbors=[[]],ids=new Map([[key(state0),0]]);
    let rejected=0,truncated=false;
    for(let head=0;head<states.length;head++){
      for(const [action] of this.actions){
        const effect=this.predictEffect(states[head],action);
        if(!effect){rejected++;continue;}
        const sig=key(effect.after);
        let dest=ids.get(sig);
        if(dest===undefined){
          if(states.length>=maxStates){truncated=true;continue;}
          dest=states.length;ids.set(sig,dest);
          states.push(effect.after);neighbors.push([]);
        }
        neighbors[head].push({to:dest,action,
          observedSupport:effect.observations,
          axisAt:effect.index,verifiedSource:true});
      }
    }
    const targets=states.flatMap((s,i)=>
      ObservedAxisCognitiveWorld.satisfied(s,goal)?[i]:[]);
    const world={states,neighbors,start:0,targets,goal:snapshot(goal),
      stateTokens:start.length,actionAxes:this.actions.size,
      truncated,blockedOrUnknownHypotheses:rejected};
    if(targets.includes(0))return {
      found:true,plannedBeforeAction:true,path:[],world,
      predictedCompleteOutput:state0.slice(),
      field:[],directOriginalMethod:"Discoverer.shape",
      reason:"ALREADY_AT_GOAL"};
    if(!targets.length)return {
      found:false,plannedBeforeAction:true,path:[],world,field:[],
      directOriginalMethod:"Discoverer.shape",
      reason:"NO_GOAL_STATE_REACHABLE_BY_OBSERVED_EFFECTS"};
    const kinds=states.map((_,i)=>i===0?KIND.self:
      targets.includes(i)?KIND.target:KIND.floor);
    const actor=new Discoverer(seed);
    actor.temp=temperature;
    let field=[];
    // ORIGINAL V17 exact attenuation (.97), attraction, resistance, uphill
    // selection and optional stochastic alternatives. Only the physically
    // observed text-world ADJACENCY differs from the two-dimensional retina.
    const path=actor.shape(kinds,0,0,{
      neighbors,conduct:k=>k===KIND.wall?0:1,
      attract:k=>k===KIND.target?1:0,
      onField:values=>{field=values}
    })||[];
    const found=path.length>0&&targets.includes(path.at(-1).to);
    return {found,plannedBeforeAction:true,path,world,field,
      predictedCompleteOutput:found?states[path.at(-1).to].slice():null,
      directOriginalMethod:"Discoverer.shape",
      reason:found?"PREACTION_COMPLETE_SHAPE":"NO_ASCENDING_PATH",
      trainingEffects:this.observed};
  }
  execute(plan,worldStep,{learnFeedback=false}={}){
    if(!plan?.found||typeof worldStep!=="function")
      throw Error("Frozen successful plan and independent physical action callback required");
    let current=plan.world.states[0].slice(),traces=[];
    for(const hop of plan.path){
      const expected=plan.world.states[hop.to];
      const observed=worldStep(current.slice(),hop.action);
      if(!observed||!Array.isArray(observed.after)||
         typeof observed.accepted!=="boolean")
        throw Error("Physics must return actual {after,accepted}");
      const accurate=observed.accepted&&eq(observed.after,expected);
      traces.push({action:hop.action,axisAt:hop.axisAt,
        predictionCorrect:accurate,accepted:observed.accepted,
        fromIndex:hop.from??null,toIndex:hop.to});
      if(learnFeedback)this.observeActionResult({
        before:current,action:hop.action,after:observed.after,
        accepted:observed.accepted});
      current=observed.after.slice();
      if(!accurate)break;
    }
    const solved=traces.length===plan.path.length&&
      traces.every(t=>t.predictionCorrect)&&
      ObservedAxisCognitiveWorld.satisfied(current,plan.world.goal);
    return {solved,steps:traces.length,trace:traces,final:current,
      exactPredictedCompleteOutput:solved&&
        eq(current,plan.predictedCompleteOutput)};
  }
  report(){return {learnedEffects:this.actions.size,observed:this.observed,
    rejected:this.rejected,conflicts:this.conflicts,blocked:this.blocked.size,
    ruleType:"observed single-token causal edit; unique source token required",
    nativePlanner:"Discoverer.shape",notGeneralLanguage:true};}
  export(){return {version:1,maxStates:this.maxStates,maxStateTokens:this.maxStateTokens,
    actions:[...this.actions],blocked:[...this.blocked],
    observed:this.observed,rejected:this.rejected,conflicts:this.conflicts};}
  static restore(x){
    if(x?.version!==1)throw Error("Unsupported evidence snapshot");
    const m=new ObservedAxisCognitiveWorld({
      maxStates:x.maxStates,maxStateTokens:x.maxStateTokens});
    m.actions=new Map(x.actions);m.blocked=new Set(x.blocked);
    m.observed=x.observed;m.rejected=x.rejected;m.conflicts=x.conflicts;
    return m;
  }
}
