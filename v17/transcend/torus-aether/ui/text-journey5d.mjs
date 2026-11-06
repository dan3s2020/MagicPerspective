// MagicPerspective V17 — faithful 5D projection of observed V17 symbol geometry.
// NO invented trajectories: every edge corresponds to a real predicted/observed
// symbol step from frozen AligningGraph, or to a proven NativeGearDrive action.
// These are 5D derived CONTEXT states, not a separately trained linguistic maze.
export const DIMS = 5;
const TAU = 2 * Math.PI;
export const finitePoint = v => Array.isArray(v) && v.length >= DIMS && v.slice(0,DIMS).every(x => Number.isFinite(x) && x >= 0 && x <= 1);
export function geometryMap(entries=[]) {
  const m=new Map();
  if(!Array.isArray(entries))return m;
  for(const p of entries){if(!Array.isArray(p)||p.length!==2)continue;
    const [k,v]=p;if(!Number.isInteger(Number(k))||!finitePoint(v))continue;
    m.set(Number(k),v.slice(0,DIMS));}
  return m;
}
export function asciiBytes(s) { return [...String(s||'')].map(x=>x.charCodeAt(0)).filter(c=>Number.isFinite(c)); }
export function rollingState(bytes,map,depth=12){
  // Circular mean, respecting torus wrap-around in EVERY learned dimension.
  const h=bytes.slice(-depth),out=[];let known=0;
  for(let d=0;d<DIMS;d++){
    let x=0,y=0,w=0;
    for(let i=0;i<h.length;i++){
      const u=map.get(h[i]);if(!u)continue;
      const weight=.78**(h.length-i-1),phi=TAU*u[d];x+=weight*Math.cos(phi);y+=weight*Math.sin(phi);w+=weight;
    }
    if(d===0)known=h.filter(code=>map.has(code)).length;
    if(w===0){out.push(null);continue;}
    let phi=Math.atan2(y,x)/TAU;if(phi<0)phi+=1;
    out.push(phi);
  }
  return {u:out,known,total:h.length,valid:out.every(x=>x!==null)};
}
export function tracePath(prefix,continuation,map,kind,cap=30000){
  const all=prefix.slice(-12),points=[];
  const start=rollingState(all,map);
  points.push({i:-1,code:null,kind, ...start});
  for(let i=0;i<continuation.length&&i<cap;i++){
    all.push(continuation[i]);if(all.length>12)all.shift();
    const state=rollingState(all,map);
    points.push({i,code:continuation[i],kind,...state});
  }
  return points;
}
function onlineCandidate(prefix,observed,guess,map,index){
  const previous=prefix.concat(observed.slice(Math.max(0,index-11),index));
  const before=rollingState(previous,map);
  const after=rollingState(previous.concat([guess]),map);
  return {i:index,code:guess,from:before.u,to:after.u,valid:before.valid&&after.valid};
}
export function fromFrozenEvaluation(ex,space=[]){
  if(!ex||!Array.isArray(ex.rows))throw Error('A real V17 evaluation rows array is required');
  const map=geometryMap(space),a0=Math.max(0,Math.floor(Number(ex.a0)||0));
  const prefix=ex.rows.slice(0,a0).map(r=>r[0]);
  const observed=ex.rows.slice(a0).map(r=>r[0]),guessed=ex.rows.slice(a0).map(r=>r[1]);
  const shape=asciiBytes(ex.shape||'');
  const plan=tracePath(prefix,shape,map,'open-loop');
  const actual=tracePath(prefix,observed,map,'observed');
  const online=guessed.map((code,i)=>onlineCandidate(prefix,observed,code,map,i));
  const replans=(ex.replans||[]).filter(x=>Number.isInteger(x.at)&&x.at>=0&&x.at<observed.length).map(x=>({
    at:x.at,source:x.source,code:x.predicted?.charCodeAt(0)||null,
    predicted:x.preview||'',points:tracePath(prefix.concat(observed.slice(0,x.at)),asciiBytes(x.preview||''),map,'replan',120)
  }));
  const errorIndices=[];for(let i=0;i<observed.length;i++)if(guessed[i]!==observed[i])errorIndices.push(i);
  let firstDeparture=-1;for(let i=0;i<Math.max(observed.length,shape.length);i++)if(shape[i]!==observed[i]){firstDeparture=i;break;}
  return {mode:'frozen-evaluation',a0,answerLength:observed.length,prefix,observed,guessed,shape,
    plan,actual,online,replans,errorIndices,firstDeparture,knownGeometry:map.size,
    provenTransformations:[],targetFrom:'held-out reference revealed only in evaluation',
    note:'Gold: frozen open-loop prediction BEFORE answer. Blue: held-out reference observed by teacher forcing. Orange: each online prediction using TRUE prefix. Cyan: frozen recomputation AFTER seeing a true prefix. This is not an autonomous cursor reaching the target.'};
}
export function fromNativeChat(reply,space=[],prompt=''){
  if(!reply||typeof reply.text!=='string')throw Error('Live V17 chat result required');
  const map=geometryMap(space),bytes=asciiBytes(reply.text),seed=asciiBytes(prompt).slice(-12);
  const executed=tracePath(seed,bytes,map,'native-action');
  const gear=reply.gear||{},route=Array.isArray(gear.route)?gear.route:[];
  const macro=route.map((x,i)=>({i,from:x.before,to:x.after,operator:x.operator||'',evidence:x.evidence||0,
    start:rollingState(asciiBytes(x.before),map),end:rollingState(asciiBytes(x.after),map),slot:x.slot}));
  const alternatives=(gear.alternative?.route||[]).map((x,i)=>({i,from:x.before,to:x.after,
    start:rollingState(asciiBytes(x.before),map),end:rollingState(asciiBytes(x.after),map),slot:x.slot,evidence:x.evidence}));
  return {mode:gear.used?'native-chat':'legacy-chat',answerLength:bytes.length,observed:bytes,guessed:[],shape:[],
    plan:[],actual:executed,online:[],replans:[],errorIndices:[],firstDeparture:-1,knownGeometry:map.size,
    macro,alternatives,steps:gear.steps||[],goal:gear.goal||null,driver:gear.used?'NativeGearDrive':'AligningGraph original',
    note:gear.used?'Plan of observed operators (purple) drove ACTUAL character output (blue). Without external feedback, its predicted and executed characters coincide; no false replan is shown.':'V17 original generator emitted the blue character path. No verified operator plan was available; do not label this a solved N-D maze.'};
}

export function fromLiveTraining(steps,space=[]) {
  if(!Array.isArray(steps))throw Error('Real training trace required');
  const map=geometryMap(space),arr=steps.filter(x=>Array.isArray(x)&&x.length>=4);
  const observed=arr.map(x=>x[1]),guessed=arr.map(x=>x[2]);
  const actual=tracePath([],observed,map,'training-observed');
  const online=guessed.map((code,i)=>onlineCandidate([],observed,code,map,i));
  const errorIndices=[];for(let i=0;i<observed.length;i++)if(guessed[i]>=0&&observed[i]!==guessed[i])errorIndices.push(i);
  const aligned=arr.filter(x=>x[4]==='align-online').length,replay=arr.filter(x=>x[4]==='chain-gpu-replay').length;
  return {mode:'live-training',answerLength:observed.length,observed,guessed,shape:[],plan:[],actual,online,replans:[],
    errorIndices,firstDeparture:-1,knownGeometry:map.size,aligned,replay,firstTick:arr[0]?.[0]||0,lastTick:arr.at(-1)?.[0]||0,
    note:'LIVE — actual V17 training symbols and predictions. For CPU text: AligningGraph online guesses; for CUDA replay: old C/A graph guesses, because CUDA alignment totals are batched. No global before-answer plan is measured here. This trace never replaces the separate frozen unseen-text evaluation.'};
}
