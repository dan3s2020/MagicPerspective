// Bounded corpus windows from actual .txt/.md/.jsonl/.json sources.
// The laboratory target is a controlled action transformation, not free QA.
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {clamp} from "./engine.mjs";

export const DEFAULT_CORPUS=fileURLToPath(new URL("../../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url));
export const wordsOf=s=>String(s).match(/[\p{L}\p{N}_-]+/gu)||[];
const hash=s=>createHash("sha256").update(s).digest("hex");
const hexNumber=s=>Number.parseInt(hash(s).slice(0,8),16)>>>0;

export async function loadCorpus(file=DEFAULT_CORPUS,{maxReadBytes=32*1024*1024}={}){
  const resolved=path.resolve(file);
  const st=await fs.stat(resolved);
  if(!st.isFile()||st.size<500)throw Error("A nonempty real corpus file is required");
  if(/\.parquet$/i.test(resolved))
    throw Error("Parquet needs convert_parquet.py -> JSONL before training");
  const cap=Math.round(clamp(maxReadBytes,1*1024*1024,128*1024*1024));
  let train=[],test=[],sampled=0;
  const source=await fs.open(resolved,"r");
  try{
    if(st.size<=cap){
      const b=await source.readFile();
      const tokens=wordsOf(b.toString("utf8"));
      if(tokens.length<200)throw Error("Corpus has too few lexical tokens");
      const a=Math.floor(tokens.length*.55),b0=Math.floor(tokens.length*.70);
      train=tokens.slice(0,a);
      test=tokens.slice(b0);sampled=b.length;
    }else{
      const segments=24,chunk=Math.max(64*1024,Math.floor(cap/segments));
      const trainPools=[],testPools=[];
      for(let i=0;i<segments;i++){
        const position=Math.max(0,Math.floor(i*(st.size-chunk)/(segments-1)));
        const b=Buffer.allocUnsafe(Math.min(chunk,st.size-position));
        const {bytesRead}=await source.read(b,0,b.length,position);
        sampled+=bytesRead;
        // File-offset samples may start/end mid-word: discard those fragments.
        const bounded=b.subarray(0,bytesRead).toString("utf8")
          .replace(/^\S+/u,"").replace(/\S+$/u,"");
        const tokens=wordsOf(bounded);
        if(i%4===0||i%4===1)trainPools.push(tokens);
        else testPools.push(tokens);
      }
      train=trainPools.flat();test=testPools.flat();
    }
  }finally{await source.close();}
  if(train.length<200||test.length<100)
    throw Error("Need at least 200 training tokens and 100 heldout tokens");
  const fingerprint=hash(resolved+"\0"+st.size+"\0"+
    train.slice(0,1000).join("\0")+"\0"+test.slice(0,1000).join("\0"));
  return {path:resolved,sizeBytes:st.size,sampledBytes:sampled,
    train,test,fingerprint,trainTokens:train.length,testTokens:test.length,
    trainEvalDisjointSourceRanges:true,
    splitDescription:st.size<=cap?
      "first 55% train, last 30% heldout, untouched 15% gap":
      "24 disjoint file-offset samples; train blocks 0/1 modulo 4, heldout 2/3"};
}
export function chooseAxisPhysics(corpus,axisCount=6){
  const axes=Math.trunc(clamp(axisCount,2,10)),freq=new Map();
  for(const w of corpus.train){
    const x=w.toLocaleLowerCase("en");
    if(!/^[\p{L}][\p{L}\p{N}_-]{3,23}$/u.test(x))continue;
    freq.set(x,(freq.get(x)||0)+1);
  }
  // Source and target are genuine corpus words, not prewritten demo tags.
  // The edit itself is an explicit LABORATORY PHYSICAL LAW, not semantics.
  const ranked=[...freq].filter(([w,n])=>n>=1&&n<=30)
    .map(([word,n])=>({word,n,rank:hexNumber(word)}))
    .sort((a,b)=>a.n-b.n||a.rank-b.rank);
  if(ranked.length<axes*2)throw Error("Corpus vocabulary too small for independent observed effects");
  const selected=ranked.slice(0,axes*2);
  const from=selected.slice(0,axes).map(x=>x.word);
  const to=selected.slice(axes).map(x=>x.word);
  return from.map((word,i)=>({
    action:"observed-corpus-action-"+i,from:word,to:to[i],index:i,
    source:"corpus-derived-word-physical-intervention"
  }));
}
export function makeTask(corpus,effects,{kind="train",length=1024,rng=Math.random,
  includeGoalCount=null}={}){
  const pool=kind==="holdout"?corpus.test:corpus.train;
  if(!Array.isArray(pool)||pool.length<32)throw Error("Missing real source corpus split");
  const n=Math.min(pool.length,Math.max(32,Math.trunc(length)));
  if(n<effects.length*8)throw Error("Too few text tokens for configured axes");
  let tokens=null;
  const reserved=new Set(effects.flatMap(x=>[x.from,x.to]));
  for(let trial=0;trial<96;trial++){
    const start=Math.floor(rng()*Math.max(1,pool.length-n+1));
    const proposed=pool.slice(start,start+n);
    const rawTerms=new Set(proposed.map(x=>x.toLocaleLowerCase("en")));
    if([...reserved].every(x=>!rawTerms.has(x))){tokens=proposed;break;}
  }
  if(!tokens)throw Error("No clean source span; action word collisions with corpus");
  const d=effects.length,positions=[];
  for(let i=0;i<d;i++){
    const center=Math.floor((i+.5)*n/d);
    let at=Math.max(0,Math.min(n-1,center+
      Math.floor((rng()-.5)*Math.max(1,Math.floor(n/(2*d))))));
    while(positions.includes(at))at=(at+1)%n;
    positions.push(at);tokens[at]=effects[i].from;
  }
  const desiredCount=includeGoalCount===null?
    Math.max(1,Math.min(d,1+Math.floor(rng()*d))):
    Math.max(1,Math.min(d,Math.trunc(includeGoalCount)));
  const indices=Array.from({length:d},(_,i)=>i);
  for(let i=indices.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [indices[i],indices[j]]=[indices[j],indices[i]];
  }
  const required=indices.slice(0,desiredCount).sort((a,b)=>a-b);
  return {tokens,positions,required,
    goal:{requires:required.map(i=>effects[i].to)},
    sourceSplit:kind,originalCorpusWords:n,
    construction:"real corpus span plus explicit controlled text-action sites",
    axisSources:effects.map(x=>x.from)};
}
export function applyIndependentPhysics(before,action,effects){
  const r=effects.find(x=>x.action===action);
  if(!r)return {accepted:false,after:before.slice()};
  const at=before.indexOf(r.from);
  if(at<0||before.lastIndexOf(r.from)!==at)
    return {accepted:false,after:before.slice()};
  const next=before.slice();next[at]=r.to;
  return {accepted:true,after:next};
}
export function makeAnswerAfterPlan(task,effects){
  const expected=task.tokens.slice();
  for(const i of task.required){
    const r=effects[i],at=expected.indexOf(r.from);
    if(at<0||expected.lastIndexOf(r.from)!==at)
      throw Error("Independent reference is ambiguous");
    expected[at]=r.to;
  }
  return expected;
}
