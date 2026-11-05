// OctopusV2 Universal Graph — text exercises for the text lab, read straight from the local OpenThoughts3-1.2M
// parquet files (default D:\training\OpenThoughts3-1.2M on Windows; OCTOPUS_TEXT_DATA overrides it).
// Each row is one exercise: conversations[0] (human) is the question, conversations[1] (gpt) the answer to be written.
// Pure JavaScript (vendored hyparquet + fzstd), nothing to install. The last HELD_OUT rows are never trained on.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import {parquetMetadataAsync,parquetReadObjects} from "./vendor/hyparquet/index.js";
import {asyncBufferFromFile} from "./vendor/hyparquet/node.js";
import {decompress as zstdDecompress} from "./vendor/fzstd.mjs";

export const HELD_OUT=16;
export const DEFAULT_TEXT_ROOT=process.env.OCTOPUS_TEXT_DATA||(process.platform==="win32"?"D:\\training\\OpenThoughts3-1.2M":path.join(os.homedir(),"training","OpenThoughts3-1.2M"));
const compressors={
  ZSTD:(input,n)=>zstdDecompress(input,new Uint8Array(n)),
  GZIP:input=>new Uint8Array(zlib.gunzipSync(input)),
  BROTLI:input=>new Uint8Array(zlib.brotliDecompressSync(input))};

async function parquetFiles(root){const out=[];
  async function walk(d){let es;try{es=await fs.readdir(d,{withFileTypes:true});}catch(e){if(e.code==="ENOENT")return;throw e;}
    for(const e of es){const p=path.join(d,e.name);if(e.isDirectory()){if(!e.name.startsWith("."))await walk(p);}else if(e.name.toLowerCase().endsWith(".parquet"))out.push(p);}}
  await walk(root);return out.sort();}
const text=v=>typeof v==="string"?v:v==null?"":typeof v==="bigint"?String(v):Array.isArray(v)?v.map(text).join("\n"):typeof v==="object"?text(v.value??v.content??v.text??""):String(v);
// question and answer of one row (OpenThoughts: conversations [{from:"human"},{from:"gpt"}]; other layouts by field name)
export function exerciseOf(row){
  const conv=row.conversations??row.messages??row.conversation;
  if(Array.isArray(conv)&&conv.length){const role=m=>String(m?.from??m?.role??"").toLowerCase();
    const q=conv.find(m=>["human","user"].includes(role(m)))??conv[0],qi=conv.indexOf(q),a=conv.slice(qi+1).find(m=>["gpt","assistant","model"].includes(role(m)))??conv[qi+1];
    return{prompt:text(q),answer:text(a)};}
  return{prompt:text(row.problem??row.question??row.prompt??row.instruction??""),answer:text(row.solution??row.answer??row.response??row.output??"")};}

export async function openTextDataset(root=DEFAULT_TEXT_ROOT){
  const files=await parquetFiles(root);if(!files.length)throw Error("No parquet files found under "+root+" (set OCTOPUS_TEXT_DATA to the dataset folder)");
  const list=[];let total=0;
  for(const p of files){const file=await asyncBufferFromFile(p),md=await parquetMetadataAsync(file),rows=Number(md.num_rows);list.push({path:p,file,md,start:total,rows});total+=rows;}
  const held=Math.min(HELD_OUT,Math.floor(total/5)),trainRows=Math.max(1,total-held);let cache=null;
  // a whole row group is decoded at once anyway, so it is kept: the exercises are walked in order, each group read once
  async function row(i){const g=((i%total)+total)%total,f=list.findLast(x=>x.start<=g);const local=g-f.start;
    if(!cache||cache.f!==f||local<cache.a||local>=cache.b){let a=0,b=f.rows;
      for(const rg of f.md.row_groups||[]){const n=Number(rg.num_rows);if(local<a+n){b=a+n;break;}a+=n;}
      // a very large row group is taken in slices of at most 1000 rows (memory); only the conversation column when there is one
      if(b-a>1000){a=a+Math.floor((local-a)/1000)*1000;b=Math.min(b,a+1000);}
      const names=(f.md.schema||[]).map(x=>x.name),columns=names.includes("conversations")?["conversations"]:undefined;
      cache=null;cache={f,a,b,rows:await parquetReadObjects({file:f.file,metadata:f.md,rowStart:a,rowEnd:b,columns,compressors})};}
    return cache.rows[local-cache.a];}
  return{root,files:list.map(x=>({path:x.path,rows:x.rows})),total,trainRows,
    // training exercise k (wraps around the training rows); held-out exercise k of HELD_OUT
    async exercise(k){const i=k%trainRows;return{index:i,...exerciseOf(await row(i))};},
    held,async heldOut(k){const i=held?trainRows+(k%held):k%total;return{index:i,...exerciseOf(await row(i))};}};
}
