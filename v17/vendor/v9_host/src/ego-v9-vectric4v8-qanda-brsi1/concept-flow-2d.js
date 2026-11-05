const SCHEMA="octopus-concept-flow-2d-v1";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
const ema=(old,v,r)=>old==null?Number(v):Number(old)+(Number(v)-Number(old))*r;

function qcoord(coord,steps=28){
  return [Math.round(clamp(coord?.[0]||0,-1,1)*steps),Math.round(clamp(coord?.[1]||0,-1,1)*steps)];
}
function localIntentSignature(intents=[],active=0){
  const rows=Array.from(intents||[]);
  if(!rows.length)return"none";
  return rows.slice(0,16).map((r,i)=>{
    const a=Math.max(0,Math.floor(Number(r?.action)||0));
    const c=Math.round(clamp(Number(r?.confidence)||0,0,1)*15);
    return (i===active?"a":"n")+a.toString(16)+"c"+c.toString(16);
  }).join(".");
}
function keyFor({coord,intents,activeCell=0}={}){
  const [x,y]=qcoord(coord),local=localIntentSignature(intents,activeCell);
  return {exact:`${x},${y}|${local}`,tile:`${x},${y}`,local};
}
function freshEdge(){return{visits:0,lastSerial:0,resistanceEma:null,affordanceEma:null,rewardEma:null,mismatchEma:null,accepted:0,blocked:0,progress:0};}
function freshContext(){return{visits:0,lastSerial:0,actions:{}};}
function getContext(table,key,create=false){
  let row=table[key];
  if(!row&&create){row=freshContext();table[key]=row;}
  return row||null;
}
function getEdge(ctx,action,create=false){
  if(!ctx)return null;
  const k=String(Math.max(0,Math.floor(Number(action)||0)));
  let e=ctx.actions[k];
  if(!e&&create){e=freshEdge();ctx.actions[k]=e;}
  return e||null;
}
function scoreEdge(e){
  const n=Math.max(0,Number(e?.visits)||0);
  if(!n)return{resistance:.18,affordance:0,permeability:.82,confidence:0,evidence:0};
  const confidence=n/(n+4);
  const resistance=(1-confidence)*.18+confidence*clamp(Number(e.resistanceEma??.18),0,1);
  const affordance=confidence*clamp(Number(e.affordanceEma)||0,0,1);
  return{resistance,affordance,permeability:clamp(1-resistance+.25*affordance,0,1),confidence,evidence:n};
}
function combine(a,b){
  const rows=[a,b].filter(Boolean).map(scoreEdge);
  if(!rows.length)return scoreEdge(null);
  let sw=0,r=0,a0=0,p=0,e=0,c=0;
  for(let i=0;i<rows.length;i++){
    const q=rows[i],w=(i===0?1:.55)*(.25+q.confidence);
    sw+=w;r+=q.resistance*w;a0+=q.affordance*w;p+=q.permeability*w;e+=q.evidence;c+=q.confidence;
  }
  return{resistance:r/sw,affordance:a0/sw,permeability:p/sw,confidence:clamp(c/rows.length,0,1),evidence:e};
}
function updateEdge(e,s,rate,serial){
  e.visits=(Number(e.visits)||0)+1;e.lastSerial=serial;
  e.resistanceEma=ema(e.resistanceEma,s.resistance,rate);
  e.affordanceEma=ema(e.affordanceEma,s.affordance,rate);
  e.rewardEma=ema(e.rewardEma,s.reward,rate);
  e.mismatchEma=ema(e.mismatchEma,s.mismatch,rate);
  if(s.accepted)e.accepted++;else e.blocked++;
  if(s.progress)e.progress++;
}
function prune(table,max){
  const keys=Object.keys(table);if(keys.length<=max)return 0;
  keys.sort((a,b)=>(Number(table[a]?.lastSerial)||0)-(Number(table[b]?.lastSerial)||0));
  const n=keys.length-max;for(let i=0;i<n;i++)delete table[keys[i]];return n;
}
function drivesVector(cellDrives=[],sample={}){
  const rows=Array.from(cellDrives||[]);
  let sx=0,sy=0,mag=0;
  for(const d of rows){const x=Number(d?.x)||0,y=Number(d?.y)||0;sx+=x;sy+=y;mag+=Math.hypot(x,y);}
  const coherence=mag>1e-9?clamp(Math.hypot(sx,sy)/mag,0,1):0;
  return[
    rows.length?sx/rows.length:0,rows.length?sy/rows.length:0,coherence,
    clamp(sample.resistance,0,1),clamp(sample.affordance,0,1),sample.progress?1:0,
    clamp((Number(sample.reward)||0)*.5+.5,0,1),clamp((Number(sample.mismatch)||0)/(1+Math.abs(Number(sample.mismatch)||0)),0,1)
  ];
}
function vecDist(a,b){let q=0,n=Math.max(a?.length||0,b?.length||0,1);for(let i=0;i<n;i++)q+=(Number(a?.[i]||0)-Number(b?.[i]||0))**2;return Math.sqrt(q/n);}
function observeMode(state,vector,{threshold=.14,maxModes=96,maxPhase=2048,serial=0,action=0}={}){
  let best=null;
  for(const m of Object.values(state.modes||{})){const d=vecDist(vector,m.centroid);if(!best||d<best.d)best={m,d};}
  let mode,reused=false;
  if(best&&best.d<=threshold){
    mode=best.m;reused=true;mode.count++;mode.lastSerial=serial;const r=1/Math.min(64,mode.count);
    for(let i=0;i<vector.length;i++)mode.centroid[i]=ema(mode.centroid[i],vector[i],r);
  }else{
    const id="M"+String(state.nextModeId++).padStart(4,"0");
    mode={id,count:1,lastSerial:serial,centroid:Array.from(vector)};state.modes[id]=mode;state.stats.modeCreated++;
  }
  if(state.lastMode&&state.lastMode!==mode.id){
    const k=state.lastMode+"→"+mode.id;state.modeTransitions[k]=(Number(state.modeTransitions[k])||0)+1;state.stats.modeSwitches++;
  }
  state.lastMode=mode.id;state.stats.modeObservations++;if(reused)state.stats.modeReused++;
  state.phase.push({serial,modeId:mode.id,reused,action,vector:Array.from(vector)});
  if(state.phase.length>maxPhase)state.phase.splice(0,state.phase.length-maxPhase);
  const ids=Object.keys(state.modes);if(ids.length>maxModes){ids.sort((a,b)=>state.modes[a].count-state.modes[b].count||state.modes[a].lastSerial-state.modes[b].lastSerial);for(let i=0;i<ids.length-maxModes;i++)delete state.modes[ids[i]];}
  return{modeId:mode.id,reused,distance:best?.d??null,coherence:vector[2]};
}

export function createConceptFlowState(raw=null,id="A"){
  if(raw?.schema===SCHEMA){
    raw.id=String(id||raw.id||"A");raw.exact=raw.exact||{};raw.tiles=raw.tiles||{};raw.modes=raw.modes||{};raw.modeTransitions=raw.modeTransitions||{};raw.phase=Array.isArray(raw.phase)?raw.phase:[];raw.stats=raw.stats||{};
    raw.serial=Math.max(0,Number(raw.serial)||0);raw.nextModeId=Math.max(1,Number(raw.nextModeId)||1);return raw;
  }
  return{schema:SCHEMA,id:String(id),serial:0,exact:{},tiles:{},modes:{},modeTransitions:{},phase:[],lastMode:null,nextModeId:1,
    stats:{queries:0,updates:0,accepted:0,blocked:0,progress:0,pruned:0,resistanceEma:null,affordanceEma:null,modeObservations:0,modeReused:0,modeCreated:0,modeSwitches:0}};
}

export function queryConceptFlow(state,{coord,action,intents,activeCell=0,trackStats=true}={}){
  const k=keyFor({coord,intents,activeCell}),a=Math.max(0,Math.floor(Number(action)||0));
  const q=combine(getEdge(getContext(state.exact,k.exact),a),getEdge(getContext(state.tiles,k.tile),a));
  if(trackStats)state.stats.queries=(Number(state.stats.queries)||0)+1;
  return{action:a,...q,context:{tile:k.tile,local:k.local}};
}

export function leastResistancePolicy(state,{coord,probs,actionMask,intents,activeCell=0,strength=.65,trackStats=true}={}){
  const src=Array.from(probs||[]),scores=[],logits=new Array(src.length).fill(-Infinity);
  let max=-Infinity;
  for(let a=0;a<src.length;a++){
    if(actionMask&&!(actionMask[a]??1)){scores[a]=queryConceptFlow(state,{coord,action:a,intents,activeCell,trackStats});continue;}
    const q=queryConceptFlow(state,{coord,action:a,intents,activeCell,trackStats});scores[a]=q;
    const flow=(q.permeability+q.affordance-q.resistance-0.64);
    const l=Math.log(Math.max(1e-12,Number(src[a])||0))+Math.max(0,Number(strength)||0)*q.confidence*flow;
    logits[a]=l;if(l>max)max=l;
  }
  const out=new Float64Array(src.length);let sum=0;
  for(let a=0;a<out.length;a++){if(Number.isFinite(logits[a])){out[a]=Math.exp(logits[a]-max);sum+=out[a];}}
  if(sum<=0)return{probs:Float64Array.from(src),scores};
  for(let a=0;a<out.length;a++)out[a]/=sum;
  return{probs:out,scores};
}

export function observeConceptFlow(state,{coord,action,intents,activeCell=0,accepted=false,progress=false,reward=0,mismatch=0,support=0,opposition=0,netDrive=0,cellDrives=[]}={}){
  state.serial++;const serial=state.serial,k=keyFor({coord,intents,activeCell}),a=Math.max(0,Math.floor(Number(action)||0));
  const opp=clamp(Number(opposition)||0,0,4),sup=clamp(Number(support)||0,0,4),mis=clamp(Math.abs(Number(mismatch)||0),0,4),blocked=accepted?0:1;
  const resistance=clamp(.62*blocked+.18*(opp/(1+opp))+.12*(mis/(1+mis))+.08*(Number(netDrive)<0?1:0)-.28*(progress?1:0),0,1);
  const affordance=clamp(.55*(progress?1:0)+.25*clamp((Number(reward)||0)*.5+.5,0,1)+.20*(sup/(1+sup))-.20*(opp/(1+opp)),0,1);
  const sample={resistance,affordance,reward:Number(reward)||0,mismatch:mis,accepted:Boolean(accepted),progress:Boolean(progress)};
  for(const [table,key,rate] of [[state.exact,k.exact,.28],[state.tiles,k.tile,.14]]){
    const ctx=getContext(table,key,true);ctx.visits++;ctx.lastSerial=serial;updateEdge(getEdge(ctx,a,true),sample,rate,serial);
  }
  const st=state.stats;st.updates++;if(accepted)st.accepted++;else st.blocked++;if(progress)st.progress++;
  st.resistanceEma=ema(st.resistanceEma,resistance,.03);st.affordanceEma=ema(st.affordanceEma,affordance,.03);
  st.pruned+=prune(state.exact,12000)+prune(state.tiles,2500);
  const mode=observeMode(state,drivesVector(cellDrives,sample),{serial,action:a});
  return{...sample,action:a,mode,context:k};
}

function mergeEma(a,na,b,nb,fallback=0){
  const wa=Math.max(0,Number(na)||0),wb=Math.max(0,Number(nb)||0),d=wa+wb;
  if(!d)return fallback;return((Number(a??fallback)*wa)+(Number(b??fallback)*wb))/d;
}
function baselineEdge(baseTable,key,action){
  return baseTable?.[key]?.actions?.[String(action)]||null;
}
function mergeWorkerDelta(outTable,baseTable,srcTable){
  for(const [k,sctx] of Object.entries(srcTable||{})){
    const dctx=outTable[k]||(outTable[k]=freshContext()),bctx=baseTable?.[k]||null;
    const ctxDelta=Math.max(0,(Number(sctx.visits)||0)-(Number(bctx?.visits)||0));
    dctx.visits=(Number(dctx.visits)||0)+ctxDelta;
    dctx.lastSerial=Math.max(Number(dctx.lastSerial)||0,Number(sctx.lastSerial)||0);
    for(const [a,se] of Object.entries(sctx.actions||{})){
      const be=baselineEdge(baseTable,k,a),bn=Number(be?.visits)||0,sn=Number(se.visits)||0,delta=Math.max(0,sn-bn);
      if(delta<=0)continue;
      const de=dctx.actions[a]||(dctx.actions[a]=freshEdge()),dn=Number(de.visits)||0;
      de.resistanceEma=mergeEma(de.resistanceEma,dn,se.resistanceEma,delta,.18);
      de.affordanceEma=mergeEma(de.affordanceEma,dn,se.affordanceEma,delta,0);
      de.rewardEma=mergeEma(de.rewardEma,dn,se.rewardEma,delta,0);
      de.mismatchEma=mergeEma(de.mismatchEma,dn,se.mismatchEma,delta,0);
      de.visits=dn+delta;
      de.accepted=(Number(de.accepted)||0)+Math.max(0,(Number(se.accepted)||0)-(Number(be?.accepted)||0));
      de.blocked=(Number(de.blocked)||0)+Math.max(0,(Number(se.blocked)||0)-(Number(be?.blocked)||0));
      de.progress=(Number(de.progress)||0)+Math.max(0,(Number(se.progress)||0)-(Number(be?.progress)||0));
      de.lastSerial=Math.max(Number(de.lastSerial)||0,Number(se.lastSerial)||0);
    }
  }
}
export function mergeConceptFlowStates(base,states=[]){
  const cleanBase=createConceptFlowState(structuredClone(base),base?.id||"A");
  const out=createConceptFlowState(structuredClone(cleanBase),cleanBase.id);
  const baseStats=cleanBase.stats||{};
  for(const raw of states){
    const s=raw?.schema===SCHEMA?raw:null;if(!s)continue;
    mergeWorkerDelta(out.exact,cleanBase.exact,s.exact);
    mergeWorkerDelta(out.tiles,cleanBase.tiles,s.tiles);
    out.serial=Math.max(out.serial,Number(s.serial)||0);
    const updateDelta=Math.max(0,(Number(s.stats?.updates)||0)-(Number(baseStats.updates)||0));
    for(const k of ["queries","updates","accepted","blocked","progress","pruned"]){
      out.stats[k]=(Number(out.stats[k])||0)+Math.max(0,(Number(s.stats?.[k])||0)-(Number(baseStats[k])||0));
    }
    if(updateDelta>0){
      out.stats.resistanceEma=mergeEma(out.stats.resistanceEma,Number(out.stats.updates)-updateDelta,s.stats?.resistanceEma,updateDelta,.18);
      out.stats.affordanceEma=mergeEma(out.stats.affordanceEma,Number(out.stats.updates)-updateDelta,s.stats?.affordanceEma,updateDelta,0);
    }
    // Collective modes are descriptive/trajectory memory, not policy state.
    // Import only phase rows newer than the frozen base serial so parallel
    // workers cannot multiply pre-existing history.
    const newPhase=Array.from(s.phase||[]).filter(x=>(Number(x?.serial)||0)>(Number(cleanBase.serial)||0));
    for(const row of newPhase){
      const vector=Array.from(row.vector||[]);
      if(vector.length)observeMode(out,vector,{serial:Number(row.serial)||out.serial,action:Number(row.action)||0});
    }
  }
  if(out.phase.length>2048)out.phase=out.phase.slice(-2048);
  return out;
}

export function conceptFlowSnapshot(state,{limit=24}={}){
  const rows=[];
  for(const [contextKey,ctx] of Object.entries(state.exact||{}))for(const [action,e] of Object.entries(ctx.actions||{}))rows.push({contextKey,action:Number(action),...scoreEdge(e),lastSerial:Number(e.lastSerial)||0,progress:Number(e.progress)||0});
  rows.sort((a,b)=>b.evidence-a.evidence||(a.resistance-a.affordance)-(b.resistance-b.affordance));
  const st=state.stats||{},updates=Number(st.updates)||0,modes=Object.values(state.modes||{}).sort((a,b)=>(b.count||0)-(a.count||0));
  return{schema:SCHEMA,id:String(state.id||""),updates,queries:Number(st.queries)||0,contexts:{exact:Object.keys(state.exact||{}).length,tiles:Object.keys(state.tiles||{}).length},
    acceptanceRate:updates?(Number(st.accepted)||0)/updates:0,progressRate:updates?(Number(st.progress)||0)/updates:0,meanResistance:Number(st.resistanceEma)||0,meanAffordance:Number(st.affordanceEma)||0,
    modeCount:modes.length,modeReuseRate:(Number(st.modeObservations)||0)?(Number(st.modeReused)||0)/Number(st.modeObservations):0,lastMode:state.lastMode||null,
    topEvidence:rows.slice(0,Math.max(1,Math.min(100,Math.floor(Number(limit)||24)))),phase:Array.from(state.phase||[]).slice(-128)};
}
