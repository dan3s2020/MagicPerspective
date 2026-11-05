import {sha256} from "./rvsi-seil.js";

export const CAUSAL_SCHEMA_VERSION=2;
export const CAUSAL_HORIZONS=Object.freeze([1,10,50,200,1000]);
export const ALPHA_COARSE=Object.freeze([0,.25,.5,1,1.5,2]);
export const LOCAL_COMPONENTS=Object.freeze([
  "body.W","body.b","world.W","world.b",
  "gru.Wz.W","gru.Wz.b","gru.Wr.W","gru.Wr.b","gru.Wh.W","gru.Wh.b",
  "actor.W","actor.b","critic.W","critic.b","ownPred.W","ownPred.b",
  "worldPred.W","worldPred.b","agency.W","agency.b"
]);
export const HIGHER_COMPONENTS=Object.freeze([
  "Wz.W","Wz.b","Wr.W","Wr.b","Wh.W","Wh.b",
  "context.W","context.b","predict.W","predict.b"
]);
export const META_COMPONENTS=Object.freeze([
  "W.0","W.1","W.2","W.3","W.4","W.5","W.6","W.7","W.8","b","v"
]);
export const WORLD_MODEL_COMPONENTS=Object.freeze(["w1","b1","w2","b2"]);

export function canonicalize(v){
  if(v===undefined)return null;
  if(v===null||typeof v!=="object")return Number.isNaN(v)?"NaN":v;
  if(ArrayBuffer.isView(v))return Array.from(v);
  if(Array.isArray(v))return v.map(canonicalize);
  const out={};
  for(const k of Object.keys(v).sort())out[k]=canonicalize(v[k]);
  return out;
}
export function stableStringify(v){return JSON.stringify(canonicalize(v));}
export function hashValue(v){return sha256(stableStringify(v));}
export function finite(x,d=0){return Number.isFinite(Number(x))?Number(x):d;}
export function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
export function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:0;}
export function median(a){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;}
export function deepClone(v){return structuredClone(v);}
export function pathGet(obj,path){
  let x=obj;for(const p of String(path).split(".")){if(x==null)return undefined;x=x[p];}return x;
}
export function pathSet(obj,path,value){
  const ps=String(path).split(".");let x=obj;for(let i=0;i<ps.length-1;i++)x=x[ps[i]];x[ps.at(-1)]=value;return obj;
}
export function experienceId({scope,batch=0,envId=0,egoId=null,localStep=0,globalActionIndex=null}){
  const e=egoId==null?"":":ego"+egoId;
  const g=globalActionIndex==null?"":":g"+globalActionIndex;
  return String(scope)+":b"+batch+":e"+envId+e+":t"+localStep+g;
}
