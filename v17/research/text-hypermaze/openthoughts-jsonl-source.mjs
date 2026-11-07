// Real OpenThoughts JSONL, streaming as physical UTF-8 bytes with exact
// resume offsets. NO whole-file read, no Parquet->JSON conversion, and no
// reference answer may cross a heldout/train split.
import fs from "node:fs";
import path from "node:path";
import fsp from "node:fs/promises";

export async function enumerateJSONL(input){
 const p=path.resolve(String(input||""));
 const st=await fsp.stat(p);
 if(st.isFile()){
  if(!p.toLowerCase().endsWith(".jsonl"))
   throw Error("Use a real .jsonl file; this independent trainer does not silently read .parquet");
  return [{path:p,size:st.size,mtimeMs:st.mtimeMs}];
 }
 if(!st.isDirectory())throw Error("Input is not a file or directory: "+p);
 const list=[];
 async function visit(d){
  for(const e of await fsp.readdir(d,{withFileTypes:true})){
   const f=path.join(d,e.name);
   if(e.isDirectory()&&!e.name.startsWith("."))await visit(f);
   else if(e.isFile()&&e.name.toLowerCase().endsWith(".jsonl")){
    const a=await fsp.stat(f);list.push({path:f,size:a.size,mtimeMs:a.mtimeMs});
   }
  }
 }
 await visit(p);list.sort((a,b)=>a.path.localeCompare(b.path));
 if(!list.length)throw Error("No REAL JSONL files in "+p);
 return list;
}
export async function* rawJSONLLines(file,{offset=0,highWaterMark=1048576}={}){
 if(!Number.isSafeInteger(offset)||offset<0||offset>file.size)
  throw Error("Invalid exact byte resume offset");
 let carry=Buffer.alloc(0),read=offset;
 const stream=fs.createReadStream(file.path,{start:offset,highWaterMark});
 try{
  for await(const chunk of stream){
   // Buffer may split a UTF-8 code point; reassemble bytes BEFORE decoding.
   const data=carry.length?Buffer.concat([carry,chunk]):chunk;
   const begin=read-carry.length;
   let start=0;
   while(true){
    const at=data.indexOf(10,start);
    if(at<0)break;
    const raw=data.subarray(start,at);
    const endOffset=begin+at+1;
    yield {line:raw.length&&raw.at(-1)===13?raw.subarray(0,-1):raw,
      endOffset,bytes:endOffset-(begin+start)};
    start=at+1;
   }
   carry=data.subarray(start);
   read+=chunk.length;
  }
  if(carry.length)yield {line:carry.at(-1)===13?
    carry.subarray(0,-1):carry,endOffset:read,bytes:carry.length};
 }finally{stream.destroy();}
}

function collectText(value,out,depth=0){
 if(depth>12||value==null)return;
 if(typeof value==="string"){if(value.trim())out.push(value);return;}
 if(Array.isArray(value)){for(const x of value)collectText(x,out,depth+1);return;}
 if(typeof value!=="object")return;
 // Known chat schema: no labels invented; preserve actual text and turn order.
 if("content" in value)return collectText(value.content,out,depth+1);
 if("value" in value)return collectText(value.value,out,depth+1);
 if("text" in value)return collectText(value.text,out,depth+1);
 // Nested multi-modal blocks: only textual segments, never metadata IDs.
 for(const name of ["parts","message","body","segments"])
  if(name in value)collectText(value[name],out,depth+1);
}
export function textsFromRealJSON(row){
 const segments=[];
 if(Array.isArray(row))collectText(row,segments);
 else if(row&&typeof row==="object"){
  const conversations=row.conversations??row.messages??row.conversation??row.turns;
  if(Array.isArray(conversations))collectText(conversations,segments);
  else{
   for(const key of ["prompt","question","problem","instruction",
    "input","reasoning","analysis","thoughts","solution","answer",
    "response","output","generated_solution","generated_answer","text",
    "content","completion"])
    if(key in row)collectText(row[key],segments);
  }
 }else if(typeof row==="string")segments.push(row);
 return segments;
}
export function parseActualJSONL(raw,{maxLineBytes=16777216}={}){
 if(raw.length>maxLineBytes)
  throw Error("Actual JSONL row exceeded configured safety cap: "+raw.length+" bytes");
 let row;
 try{row=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw).replace(/^\uFEFF/,""));}
 catch(err){throw Error("Invalid real JSONL syntax: "+err.message);}
 const text=textsFromRealJSON(row);
 const qaPairs=qaPairsFromRealJSON(row);
 return {text,qaPairs,empty:!text.length};
}


// A real OpenThoughts training example is a causally ordered user QUESTION
// followed by an actual assistant ANSWER. Existing textsFromRealJSON() is
// kept byte-identical in behavior; the new role-aware stream never guesses
// answers from arbitrary message text or passes withheld outputs to a planner.
const roleText=message=>{
 const out=[];
 if(!message||typeof message!=="object")return "";
 const data=message.content??message.value??message.text??null;
 collectText(data,out);
 return out.join("\n").trim();
};
export function qaPairsFromRealJSON(row){
 if(!row||typeof row!=="object")return [];
 const messages=Array.isArray(row)?row:
  row.conversations??row.messages??row.conversation??row.turns;
 const pairs=[];
 if(Array.isArray(messages)){
  let pending=null;
  for(const m of messages){
   const role=String(m?.role??m?.from??m?.speaker??"").toLowerCase();
   const value=roleText(m);
   if(role==="user"||role==="human"){
    pending=value||null;continue;
   }
   if(role==="assistant"||role==="gpt"){
    if(pending&&value)pairs.push({question:pending,answer:value});
    pending=null;continue;
   }
   // Do not pair across system/tool/unknown intervening messages.
   pending=null;
  }
  return pairs;
 }
 const q=row.question??row.prompt??row.problem??row.instruction;
 const a=row.answer??row.response??row.solution??row.output??row.completion;
 if(q===undefined||a===undefined)return [];
 const read=v=>{
  if(typeof v==="string")return v.trim();
  const arr=[];collectText(v,arr);return arr.join("\n").trim();
 };
 const question=read(q),answer=read(a);
 return question&&answer?[{question,answer}]:[];
}
