// Phase 2: isolated V17 frozen-checkpoint causal intervention.
// Distinct script; phase 1 and all native training files remain unchanged.
// All outputs have the same maximum length; stopBlank=false, learn=false.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {QUESTIONS,summarizeTrace,repeatedEightGrams} from "./graph0-ablation-core.mjs";

export const POLICIES = Object.freeze({
  "full": {self:1,fself:1},
  "no-self": {self:0,fself:1},
  "no-fself": {self:1,fself:0},
  "no-self-fself": {self:0,fself:0},
  "half-self-fself": {self:0.5,fself:0.5},
  "half-fself": {self:1,fself:0.5}
});

export function applyPolicy(align,name) {
  if (!Object.hasOwn(POLICIES,name)) throw Error("Unknown policy: "+name);
  const original = align.proposals;
  if (typeof original !== "function") throw Error("Missing native AligningGraph proposals");
  const f=POLICIES[name];
  // distribution() uses trust**g * dist_votes / tot. Attenuating dist_votes
  // while keeping tot leaves the original learned trust & candidate identity intact.
  align.proposals=function(...args) {
    return original.apply(this,args).flatMap(p=>{
      const factor=p.src==="self"?f.self:p.src==="fself"?f.fself:1;
      if(factor===0)return [];
      if(factor===1)return [p];
      return [{...p,dist:new Map([...p.dist].map(([c,n])=>[c,n*factor]))}];
    });
  };
  return ()=>{align.proposals=original;};
}

export function summarizeText(output) {
  const printable=[...output].filter(c=>{
    const x=c.charCodeAt(0);
    return x===9||x===10||(x>=32&&x<127);
  });
  return {bytes:output.length,distinctCharacters:new Set([...output]).size,
    printableFraction:output.length?+(printable.length/output.length).toFixed(6):0,
    repeatedEightGramFraction:repeatedEightGrams(output)};
}

const argv=process.argv.slice(2);
if(import.meta.url===new URL("file://"+path.resolve(process.argv[1]||"")).href ||
  (process.argv[1] && path.basename(process.argv[1])==="graph0-phase2.mjs")) {
  const opt={};
  for(let i=0;i<argv.length;i+=2){
    if(!argv[i]?.startsWith("--")||!argv[i+1]) throw Error("Expected --arg value pairs");
    opt[argv[i].slice(2)]=argv[i+1];
  }
  const allowed=new Set(["checkpoint","out","policy","max","seed"]);
  for(const k of Object.keys(opt))if(!allowed.has(k))throw Error("Unknown --arg "+k);
  if(!opt.checkpoint||!opt.out||!Object.hasOwn(POLICIES,opt.policy))
    throw Error("Required --checkpoint COPY.v8 --out DIR --policy "+Object.keys(POLICIES).join("|"));
  const max=opt.max==null?240:Number(opt.max),seed=opt.seed==null?20261107:Number(opt.seed);
  if(!Number.isInteger(max)||max<20||max>2000||!Number.isInteger(seed)||seed<0||seed>4294967295)
    throw Error("Invalid max or seed");
  const file=path.resolve(opt.checkpoint),out=path.resolve(opt.out);
  if(!file.toLowerCase().endsWith(".v8"))throw Error("Checkpoint must be .v8");
  fs.mkdirSync(out,{recursive:true});
  const hash=()=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const shaBefore=hash();
  const brain=Brain.load(file),a=brain.align;
  if(!a)throw Error("No native AligningGraph in saved checkpoint");
  const counters=()=>JSON.stringify({
    chars:brain.chars,lived:brain.lived,exercises:brain.exercises,
    memory:a.mem.n,formMemory:a.fmem.n,trust:a.trust.size
  });
  const before=counters();
  const undo=applyPolicy(a,opt.policy),rows=[];
  try{
    for(const question of QUESTIONS){
      const r=brain.chat([["you",question]],{
        T:0.6,seed,max,stopBlank:false,learn:false,observePath:true
      });
      if(!r.pathTrace)throw Error("Native observer missing");
      const s=summarizeTrace(r.pathTrace,0.6);
      rows.push({question,output:r.text,textMetrics:summarizeText(r.text),
        traceMetrics:s,first200:r.text.slice(0,200),
        firstRepeat:r.pathTrace.steps.find(v=>Number(v.contextVisit)>0)||null,
        steps:r.pathTrace.steps});
      console.log(JSON.stringify({
        arm:opt.policy,question,seed,chars:r.text.length,loopRate:rows.at(-1).textMetrics.repeatedEightGramFraction,
        repeatContexts:s.repeatedContextSteps,singletons:s.singleCandidateSteps,
        entropy:s.meanEntropyBits,first200:r.text.slice(0,100)
      }));
      if(r.text.length!==max)throw Error("Unexpected early stop; stopBlank=false should force max chars");
    }
  }finally{undo();}
  if(counters()!==before)throw Error("Learning counters changed during read-only experiment");
  if(hash()!==shaBefore)throw Error("Checkpoint copy changed during experiment");
  const report={experiment:"phase2-fixed-length-native-v17",arm:opt.policy,weights:POLICIES[opt.policy],
    seed,max,checkpointSha256:shaBefore,
    frozen:true,stopBlank:false,
    promptUniqueOutputs:new Set(rows.map(r=>r.output)).size,
    originalCounters:JSON.parse(before),
    rows};
  const dest=path.join(out,"phase2-"+opt.policy+"-seed"+seed+".json");
  fs.writeFileSync(dest,JSON.stringify(report,null,2),"utf8");
  console.log("SAVED: "+dest);
}
