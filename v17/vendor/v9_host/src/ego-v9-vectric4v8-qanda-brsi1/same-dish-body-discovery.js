import {causalPredictStep,createTrackCausalPredictor,trackCausalPredictorSnapshot} from "./same-dish-track-predictor.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mag=v=>Math.hypot(v.x||0,v.y||0,v.z||0);
const sub=(a,b)=>({x:(a.x||0)-(b.x||0),y:(a.y||0)-(b.y||0),z:(a.z||0)-(b.z||0)});
const add=(a,b)=>({x:(a.x||0)+(b.x||0),y:(a.y||0)+(b.y||0),z:(a.z||0)+(b.z||0)});
const dist=(a,b)=>mag(sub(a,b));
const relOf=p=>({x:Number(p.relX)||0,y:Number(p.relY)||0,z:Number(p.relZ)||0});
const key=p=>`${p.x},${p.y},${p.z}`;
const dirs=dim=>dim===3?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];

function softmaxRows(scores){
  const names=["self","tool","other","passive","unknown"],vals=names.map(n=>Number(scores[n])||0),mx=Math.max(...vals),ex=vals.map(v=>Math.exp(v-mx)),sum=ex.reduce((a,b)=>a+b,0)||1,o={};
  for(let i=0;i<names.length;i++)o[names[i]]=ex[i]/sum;
  return o;
}
function rootConnected(points,dimension){
  const occ=new Set(points.map(key));occ.add("0,0,0");
  const seen=new Set(["0,0,0"]),q=[{x:0,y:0,z:0}];
  for(let h=0;h<q.length;h++){
    const p=q[h];
    for(const[dX,dY,dZ]of dirs(dimension)){
      const n={x:p.x+dX,y:p.y+dY,z:p.z+dZ},k=key(n);
      if(occ.has(k)&&!seen.has(k)){seen.add(k);q.push(n);}
    }
  }
  return seen;
}
function directionKey(v){return`${Math.sign(v.x||0)},${Math.sign(v.y||0)},${Math.sign(v.z||0)}`;}
function newTrack(id,rel,step){
  return{id,rel:{...rel},prevRel:{...rel},lastSeen:step,seen:1,rootStreak:0,rootTotal:0,lastRoot:false,lastMatch:.5,lastGlobalMove:0,
    predictor:createTrackCausalPredictor(),
    scores:{self:0,tool:0,other:0,passive:0,unknown:1.35},history:[]};
}
function matchTracks(state,points){
  const candidates=[];
  for(const t of state.tracks.values())if(state.step-t.lastSeen<=state.maxTrackGap)for(let i=0;i<points.length;i++)candidates.push({id:t.id,i,d:dist(t.rel,points[i])});
  candidates.sort((a,b)=>a.d-b.d||a.id-b.id||a.i-b.i);
  const usedT=new Set(),usedP=new Set(),pairs=[];
  for(const c of candidates){
    if(c.d>state.maxAssociationJump||usedT.has(c.id)||usedP.has(c.i))continue;
    usedT.add(c.id);usedP.add(c.i);pairs.push([state.tracks.get(c.id),points[c.i]]);
  }
  const unmatched=points.filter((_,i)=>!usedP.has(i)).sort((a,b)=>a.x-b.x||a.y-b.y||a.z-b.z);
  for(const p of unmatched){const t=newTrack(state.nextTrackId++,p,state.step);state.tracks.set(t.id,t);pairs.push([t,p]);}
  return pairs;
}

export function createCausalBodyDiscovery(options={}){
  return{
    version:1,mode:"shadow",dimension:Number(options.dimension)===3?3:2,step:0,nextTrackId:1,tracks:new Map(),
    maxTrackGap:Math.max(1,Number(options.maxTrackGap)||3),maxAssociationJump:Math.max(.5,Number(options.maxAssociationJump)||2.25),
    acceptedDirections:new Set(),separationEvidence:0,
    // The only hard self anchor is the local sensorimotor locus itself. No other body member is supplied.
    anchor:{scores:{self:8,tool:-6,other:-6,passive:-6,unknown:-6}},
    metrics:{updates:0,informative:0,ambiguous:0}
  };
}

export function updateCausalBodyDiscovery(state,observation,intervention={}){
  state.step++;
  const points=(observation?.points||[]).map(relOf).filter(p=>!(p.x===0&&p.y===0&&p.z===0));
  const connected=rootConnected(points,state.dimension),pairs=matchTracks(state,points);
  const anchorDelta={x:Number(intervention.anchorDelta?.x)||0,y:Number(intervention.anchorDelta?.y)||0,z:Number(intervention.anchorDelta?.z)||0};
  const accepted=intervention.accepted===true&&mag(anchorDelta)>1e-9;
  const command={x:Number(intervention.command?.x)||0,y:Number(intervention.command?.y)||0,z:Number(intervention.command?.z)||0};
  if(accepted)state.acceptedDirections.add(directionKey(anchorDelta));
  const diversity=state.acceptedDirections.size;

  for(const[t,p]of pairs){
    const prev={...t.rel},prevRoot=t.lastRoot,prevMatch=t.lastMatch,currRoot=connected.has(key(p)),relDelta=sub(p,prev),globalDelta=add(anchorDelta,relDelta);
    const trackMove=mag(globalDelta),relMove=mag(relDelta),anchorMove=mag(anchorDelta),err=anchorMove>1e-9?dist(globalDelta,anchorDelta):trackMove,match=anchorMove>1e-9?Math.exp(-1.8*err):.5;
    // Prediction is evaluated against this transition BEFORE it is learned, so the current target cannot leak into its own score.
    const causal=causalPredictStep(t.predictor,{command,accepted,anchorDelta,globalDelta});

    t.prevRel=prev;t.rel={...p};t.lastSeen=state.step;t.seen++;t.lastRoot=currRoot;t.rootStreak=currRoot?t.rootStreak+1:0;if(currRoot)t.rootTotal++;t.lastMatch=match;t.lastGlobalMove=trackMove;

    if(accepted){
      state.metrics.informative++;
      if(currRoot){
        // Root-connected co-motion is compatible with body or tool/contact. Before any separating evidence,
        // keep the hypothesis deliberately ambiguous rather than equating adjacency+motion with SELF.
        const separated=state.separationEvidence>0;
        t.scores.self+=(separated?1.20:.18)*match;
        t.scores.tool+=(separated?.18:.24)*match;
        if(separated&&t.rootStreak>=3&&diversity>=2)t.scores.self+=.85;
        if(match<.35){t.scores.self-=.20;t.scores.tool+=.10;}
      }else{
        // A disconnected perfect mimic is intentionally not allowed to become confident SELF from motion alone.
        t.scores.self+=.05*match;
        if(trackMove>.15&&match>.75)t.scores.other+=.08;
      }
      if(match<.35){
        if(trackMove<.20)t.scores.passive+=.55;
        else t.scores.other+=.28;
      }
      // Learned intervention model contributes only evidence, never a hidden target.
      // Root-connected causal advantage remains compatible with BODY or TOOL until a separating event exists.
      if(causal.predictiveConfidence>.25&&causal.causalAdvantage>.05){
        const q=.30*causal.causalAdvantage;
        if(currRoot){
          if(state.separationEvidence>0)t.scores.self+=q;
          else{t.scores.self+=q*.35;t.scores.tool+=q*.35;}
        }else{
          t.scores.unknown+=q*.10;
        }
      }
      if(match>.80&&currRoot&&state.separationEvidence>0)t.scores.unknown-=.10;
    }else{
      // Rejected/zero-control interventions are only autonomy evidence when the local anchor itself stayed put.
      // If the anchor was passively displaced by an external force, co-moving body material must not be relabelled OTHER.
      if(anchorMove<=.10&&relMove>.20){
        const learnedAutonomy=.35*causal.autonomyEvidence;
        t.scores.other+=1.60+learnedAutonomy;t.scores.self-=.32;t.scores.unknown-=.40;state.separationEvidence++;
      }else if(anchorMove<=.10&&relMove<=.20){
        t.scores.passive+=.05;
      }else{
        // Exogenous motion of the focal sensorimotor locus is an identifiability gap: preserve uncertainty.
        if(currRoot&&relMove<.15)t.scores.unknown-=.02;
        else t.scores.unknown+=.05;
      }
    }

    // Material that co-moved while root-connected and then decouples after a separating intervention is tool-like, not body by default.
    if(prevRoot&&!currRoot){
      if(prevMatch>.65)t.scores.tool+=1.85;
      else t.scores.tool+=.35;
      t.scores.self-=.55;
      t.scores.unknown-=.30;
      state.separationEvidence++;
    }
    if(!prevRoot&&currRoot&&t.seen>2)t.scores.tool+=.08;

    for(const n of ["self","tool","other","passive"])t.scores[n]=clamp(t.scores[n],-3,12);
    t.scores.unknown=clamp(t.scores.unknown,-4,4);
    t.history.push({step:state.step,command:{...command},accepted,anchorDelta:{...anchorDelta},rel:{...p},globalDelta,root:currRoot,match,causal:{
      actionError:causal.actionError,passiveError:causal.passiveError,couplingError:causal.couplingError,
      predictiveConfidence:causal.predictiveConfidence,causalAdvantage:causal.causalAdvantage,directCoupling:causal.directCoupling,autonomyEvidence:causal.autonomyEvidence
    }});
    if(t.history.length>24)t.history.shift();
  }

  for(const t of state.tracks.values())if(t.lastSeen<state.step)t.lastRoot=false;
  state.metrics.updates++;
  const visible=pairs.map(([t])=>softmaxRows(t.scores));
  if(visible.some(p=>Math.max(p.self,p.tool,p.other,p.passive)<.62))state.metrics.ambiguous++;
  return discoverySnapshot(state);
}

export function discoverySnapshot(state){
  const tracks=[];
  for(const t of state.tracks.values()){
    const probability=softmaxRows(t.scores);
    tracks.push({
      track:t.id,rel:{...t.rel},lastSeen:t.lastSeen,visible:t.lastSeen===state.step,rootConnected:t.lastRoot,rootStreak:t.rootStreak,seen:t.seen,
      lastMatch:t.lastMatch,lastGlobalMove:t.lastGlobalMove,probability,
      uncertainty:1-Math.max(probability.self,probability.tool,probability.other,probability.passive),
      causalPrediction:trackCausalPredictorSnapshot(t.predictor),
      history:t.history.map(h=>({...h,command:{...h.command},anchorDelta:{...h.anchorDelta},rel:{...h.rel},globalDelta:{...h.globalDelta},causal:h.causal?{...h.causal}:null}))
    });
  }
  tracks.sort((a,b)=>a.rel.x-b.rel.x||a.rel.y-b.rel.y||a.rel.z-b.rel.z||a.track-b.track);
  return{version:1,mode:state.mode,step:state.step,anchor:{probability:softmaxRows(state.anchor.scores)},acceptedDirectionCount:state.acceptedDirections.size,separationEvidence:state.separationEvidence,tracks,metrics:{...state.metrics}};
}

export function inferredExpectedBodyMass(snapshot){
  let n=1;
  for(const t of snapshot?.tracks||[])if(t.visible)n+=Number(t.probability?.self)||0;
  return n;
}

export function ownershipWeightedPool(states,ownership=[]){
  if(!states.length)return new Float64Array(0);
  const n=states[0]?.length||0,out=new Float64Array(n);let wsum=0;
  for(let i=0;i<states.length;i++){
    const w=clamp(Number(ownership[i])||0,0,1);wsum+=w;
    for(let j=0;j<n;j++)out[j]+=w*(Number(states[i]?.[j])||0);
  }
  if(wsum>1e-9)for(let j=0;j<n;j++)out[j]/=wsum;
  return out;
}
