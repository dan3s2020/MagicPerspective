// Actual local TinyStories UTF-8 .txt streaming. No in-memory 2GB read.
// TinyStories-train.txt officially separates stories with <|endoftext|>.
// For user-authored text files lacking that marker, blank line separators
// are supported and UI calls the items "segments" rather than asserting stories.
import fs from "node:fs";
import fsp from "node:fs/promises";

const MARK=Buffer.from("<|endoftext|>","utf8");
const LF=Buffer.from("\n\n","utf8");
const CRLF=Buffer.from("\r\n\r\n","utf8");
export async function sourceMetadata(file) {
 const stat=await fsp.stat(file);
 if(!stat.isFile()||stat.size<8)throw Error("TinyStories source is not a nonempty TXT file: "+file);
 const fd=await fsp.open(file,"r"),preview=Buffer.alloc(Math.min(stat.size,2*1024*1024));
 try{await fd.read(preview,0,preview.length,0);}finally{await fd.close();}
 const delimiter=preview.includes(MARK)?"tiny-mark":preview.includes(CRLF)?"crlf":preview.includes(LF)?"blank":"none";
 if(delimiter==="none"&&stat.size>8*1024*1024)
  throw Error("TinyStories TXT has no visible story boundary in first 2MB. Expected <|endoftext|> or blank lines.");
 return {size:stat.size,mtimeMs:stat.mtimeMs,delimiter};
}
function normalizedText(raw){
 const text=raw.toString("utf8").replace(/\0/g," ").trim();
 // Preserve authentic Unicode story content. GPU learns the underlying
 // UTF-8 octets (256-symbol vocabulary), not a destructive ASCII rewrite.
 return {text,ascii:Buffer.from(text,"utf8")};
}
export async function* stories(file,{startOffset=0,metadata=null,maxStoryBytes=4*1024*1024}={}){
 const meta=metadata||await sourceMetadata(file);
 if(startOffset<0||startOffset>meta.size||!Number.isSafeInteger(startOffset))
  throw Error("Invalid saved TinyStories byte offset");
 const sep=meta.delimiter==="tiny-mark"?MARK:meta.delimiter==="crlf"?CRLF:meta.delimiter==="blank"?LF:null;
 if(!sep&&meta.size-startOffset>maxStoryBytes)
  throw Error("Too large for one story without a story separator");
 let base=startOffset,carry=Buffer.alloc(0),pending=null;
 for await(const chunk of fs.createReadStream(file,{start:startOffset,highWaterMark:1024*1024})){
  carry=carry.length?Buffer.concat([carry,chunk]):chunk;
  if(sep){
   let k;
   while((k=carry.indexOf(sep))>=0){
    const raw=carry.subarray(0,k),endOffset=base+k+sep.length;
    carry=carry.subarray(k+sep.length);
    base=endOffset;
    if(raw.length){
     const item=normalizedText(raw);
     if(item.ascii.length){
      // Keep the most recent item until we know its exact EOF boundary.
      // TinyStories TXT often has a final newline after <|endoftext|>.
      if(pending)yield pending;
      pending={...item,endOffset,sourceBytes:raw.length};
     }
    }
   }
  }
  if(carry.length>maxStoryBytes)
   throw Error("A TinyStories item exceeds "+maxStoryBytes+
     " bytes; wrong delimiter or unexpectedly huge item");
 }
 if(carry.length){
  const item=normalizedText(carry);
  if(item.ascii.length){
   if(pending)yield pending;
   pending={...item,endOffset:meta.size,sourceBytes:carry.length};
  }else if(pending){
   // Only trailing whitespace remains: no new story. Consume its real
   // bytes as part of the last confirmed source boundary (100%, not 99.996%).
   pending.endOffset=meta.size;
  }
 }
 if(pending)yield pending;
}
