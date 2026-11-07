// MagicPerspective V24 corpus input: REAL Q/A documents, no fabricated target.
// Parquet uses the existing V17 reader and its last-16 held-out partition.
// JSONL/TXT are scanned twice, keeping held-out records OUT of the train iterator.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import crypto from "node:crypto";
import {openTextDataset,exerciseOf,HELD_OUT} from "../../transcend/torus-aether/data/text-dataset.mjs";

export async function* jsonlRows(file){
 const lines=readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});
 let index=0,lineNo=0;
 for await(const rawLine of lines){
  const line=lineNo===0?rawLine.replace(/^\uFEFF/,""):rawLine;
  lineNo++;if(!line.trim())continue;
  let obj;try{obj=JSON.parse(line);}catch(e){throw Error("JSONL parse failure at line "+lineNo+": "+e.message);}
  if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("Expected JSONL object at "+lineNo);
  const {prompt,answer}=exerciseOf(obj);
  yield {index:index++,prompt,answer};
 }
}
export async function* qaTxtRows(file){
 const lines=readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});
 let index=0,prompt=null,answer=null,lineNo=0;
 for await(const rawLine of lines){
  const line=lineNo++===0?rawLine.replace(/^\uFEFF/,""):rawLine;
  if(/^Q:\s*/i.test(line)){
   if(prompt!==null){
    if(answer===null)throw Error("Q/A TXT: missing answer for row "+index);
    yield {index:index++,prompt,answer:answer.trim()};
   }
   prompt=line.replace(/^Q:\s*/i,"").trim();answer=null;
  }else if(/^A:\s*/i.test(line)){
   if(prompt===null||answer!==null)throw Error("Q/A TXT: answer without a pending question "+index);
   answer=line.replace(/^A:\s*/i,"");
  }else if(answer!==null)answer+="\n"+line;
  else if(line.trim())throw Error("Q/A TXT requires explicit Q: / A: pairs; found unstructured text");
 }
 if(prompt!==null){if(answer===null)throw Error("Q/A TXT: missing final answer");
   yield {index:index++,prompt,answer:answer.trim()};}
}
async function inventory(root,files){
 const entries=[];for(const f of files){const p=await fsp.realpath(f),st=await fsp.stat(p);
   entries.push({path:p,size:st.size,mtimeMs:st.mtimeMs});}
 const h=crypto.createHash("sha256").update(JSON.stringify({root,files:entries})).digest("hex");
 return {fingerprint:h,files:entries.length};
}
async function countAndHold(factory,hold){
 let n=0,held=[];
 for await(const row of factory()){n++;held.push(row);
   if(held.length>hold)held.shift();}
 return {n,held};
}
export async function openRealSource({data=null,jsonl=null,qaTxt=null,held=16}={}){
 const selected=[data,jsonl,qaTxt].filter(Boolean);
 if(selected.length!==1)throw Error("Exactly one of --data, --jsonl or --qa-txt is required");
 if(!Number.isInteger(held)||held<1||held>1000)throw Error("Held-out count must be 1..1000");
 if(data){
  if(held!==HELD_OUT)throw Error("Parquet held-out partition is fixed at "+HELD_OUT+" by the original V17 reader; do not silently change it");
  const ds=await openTextDataset(data);
  if(ds.held<1)throw Error("Not enough parquet rows for a real held-out evaluation");
  const inv=await inventory(data,ds.files.map(x=>x.path));
  return {kind:"parquet",root:await fsp.realpath(data),
    fingerprint:inv.fingerprint,totalRows:ds.total,trainRows:ds.trainRows,
    heldRows:ds.held,files:inv.files,
    async* trainingFrom(start=0){
      for(let index=start;index<ds.trainRows;index++){
        const row=await ds.exercise(index);
        if(row.index!==index)throw Error("Parquet row cursor wrapped unexpectedly");
        yield {index,prompt:row.prompt,answer:row.answer};
      }
    },
    async heldOut(){const out=[];for(let i=0;i<ds.held;i++)out.push(await ds.heldOut(i));return out;}
  };
 }
 const file=await fsp.realpath(jsonl||qaTxt),factory=()=>jsonl?jsonlRows(file):qaTxtRows(file);
 const inv=await inventory(file,[file]),scan=await countAndHold(factory,held);
 if(scan.n<=held)throw Error("Need more than "+held+" Q/A rows for disjoint held-out evaluation");
 const trainRows=scan.n-held;
 return {kind:jsonl?"jsonl":"qa-txt",root:file,fingerprint:inv.fingerprint,
  totalRows:scan.n,trainRows,heldRows:held,files:1,
  async* trainingFrom(start=0){
    if(!Number.isInteger(start)||start<0||start>trainRows)throw Error("Invalid resume cursor");
    for await(const row of factory())if(row.index>=start&&row.index<trainRows)yield row;
  },
  async heldOut(){return scan.held.map(x=>({...x}));}
 };
}
