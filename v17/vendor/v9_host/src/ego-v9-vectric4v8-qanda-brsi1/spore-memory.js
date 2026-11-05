const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hashNumbers(a){
  let h=2166136261>>>0;for(const v of a||[]){const s=Number(v).toPrecision(15);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}}return(h>>>0).toString(16).padStart(8,"0");
}
export const SPORE_MEMORY_VERSION=1;

export function fragmentSporeState({hidden=[],meta=null},config={}){
  const src=Array.from(hidden,Number),chunk=Math.max(4,Math.floor(Number(config.sporeFragmentWidth)||12)),copies=Math.max(1,Math.floor(Number(config.sporeFragmentCopies)||2)),fragments=[];
  const count=Math.max(1,Math.ceil(src.length/chunk));
  for(let index=0;index<count;index++){
    const data=src.slice(index*chunk,Math.min(src.length,(index+1)*chunk)),checksum=hashNumbers(data);
    for(let copy=0;copy<copies;copy++)fragments.push({index,copy,count,totalLength:src.length,data:[...data],checksum});
  }
  return{version:SPORE_MEMORY_VERSION,totalLength:src.length,fragmentCount:count,copies,fragments,meta:meta?structuredClone(meta):null,stateChecksum:hashNumbers(src)};
}
export function reconstructSporeState(packet){
  if(!packet||packet.version!==SPORE_MEMORY_VERSION)return{complete:false,fidelity:0,hidden:[],missing:["invalid-packet"],meta:null};
  const by=new Map();for(const f of packet.fragments||[]){if(hashNumbers(f.data)!==f.checksum)continue;if(!by.has(f.index))by.set(f.index,f);}
  const missing=[];for(let i=0;i<packet.fragmentCount;i++)if(!by.has(i))missing.push(i);
  const hidden=[];for(let i=0;i<packet.fragmentCount;i++){const f=by.get(i);if(f)hidden.push(...f.data);}
  hidden.length=Math.min(hidden.length,packet.totalLength);
  const complete=missing.length===0&&hidden.length===packet.totalLength,stateChecksum=hashNumbers(hidden),fidelity=complete&&stateChecksum===packet.stateChecksum?1:clamp((packet.fragmentCount-missing.length)/Math.max(1,packet.fragmentCount),0,1);
  return{complete:complete&&stateChecksum===packet.stateChecksum,fidelity,hidden,missing,meta:packet.meta?structuredClone(packet.meta):null,stateChecksum};
}
export function damageSporePacket(packet,{dropCopies=0,dropIndices=[]}={}){
  const out=structuredClone(packet),dropSet=new Set(dropIndices.map(Number)),remaining=[];
  let copiesLeft=Math.max(0,Math.floor(Number(dropCopies)||0));
  for(const f of out.fragments||[]){
    if(dropSet.has(f.index))continue;
    if(copiesLeft>0){copiesLeft--;continue;}
    remaining.push(f);
  }
  out.fragments=remaining;return out;
}
