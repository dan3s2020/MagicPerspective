// Analyze original V17 training test scores from the existing log.jsonl; READ ONLY.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {buildGraph0History,summarizeLearningCurve} from "./graph0-plateau-core.mjs";
const options={};
for(let i=2;i<process.argv.length;i+=2){
 if(!process.argv[i]?.startsWith("--")||!process.argv[i+1])throw Error("Expected --option value");
 options[process.argv[i].slice(2)]=process.argv[i+1];
}
for(const k of Object.keys(options))if(!["log","out","graph","window"].includes(k))throw Error("Unknown option "+k);
if(!options.log||!options.out)throw Error("Usage --log ORIGINAL.log.jsonl --out RESULTS_DIR [--graph 0 --window 12]");
const file=path.resolve(options.log),out=path.resolve(options.out),w=Number(options.graph??0),window=Number(options.window??12);
if(!Number.isInteger(w)||w<0||!Number.isInteger(window)||window<2||window>100)
  throw Error("Invalid graph or window");
if(!fs.existsSync(file))throw Error("Original log not found "+file);
const lines=readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});
const items=[];let invalid=0,total=0;
for await(const line of lines){
 if(!line.trim())continue;
 total++;
 try{
  const r=JSON.parse(line);
  if(Number(r.w)===w && r.test && Number.isFinite(Number(r.chars)))items.push(r);
 }catch{invalid++;}
}
const history=buildGraph0History(items,w),summary=summarizeLearningCurve(history,{windowPoints:window});
const report={source:file,graphId:w,recordsRead:total,invalidLines:invalid,
  timestamp:new Date().toISOString(),summary,history,
  caution:"Never infer causation from a plateau chart alone; compare held-out evaluations across independent frozen checkpoints."};
fs.mkdirSync(out,{recursive:true});
const target=path.join(out,"graph0-training-plateau-audit.json");
fs.writeFileSync(target,JSON.stringify(report,null,2),"utf8");
console.log(JSON.stringify({
  graphId:w,points:summary.count,trainedChars:summary.lastChars,
  exercises:summary.lastExercises,enoughData:summary.enoughDataForPlateauDecision,
  metrics:Object.fromEntries(Object.entries(summary.metrics).map(([name,m])=>[name,{
    latestPercent:m.latestPercent,
    slopePPperMillion:m.lastWindowSlopePPperMillion,
    plateauCandidate:m.plateauCandidate
  }])),
  report:target
}));
