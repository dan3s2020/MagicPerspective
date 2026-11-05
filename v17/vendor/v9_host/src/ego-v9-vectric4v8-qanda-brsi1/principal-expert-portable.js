const TYPE_KEY="__octopusPortableType";
const typedConstructors=Object.freeze({
  Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,
  ...(typeof BigInt64Array!=="undefined"?{BigInt64Array}:{}),
  ...(typeof BigUint64Array!=="undefined"?{BigUint64Array}:{})
});

export function encodePortableState(value){
  const seen=new WeakSet();
  function walk(v){
    if(v==null||typeof v==="string"||typeof v==="number"||typeof v==="boolean")return v;
    if(typeof v==="bigint")return{[TYPE_KEY]:"BigInt",value:String(v)};
    if(ArrayBuffer.isView(v)&&!(v instanceof DataView)){
      return{[TYPE_KEY]:v.constructor.name,data:Array.from(v,x=>typeof x==="bigint"?String(x):x)};
    }
    if(v instanceof ArrayBuffer)return{[TYPE_KEY]:"ArrayBuffer",data:Array.from(new Uint8Array(v))};
    if(v instanceof Date)return{[TYPE_KEY]:"Date",value:v.toISOString()};
    if(v instanceof Map)return{[TYPE_KEY]:"Map",data:Array.from(v.entries(),([k,x])=>[walk(k),walk(x)])};
    if(v instanceof Set)return{[TYPE_KEY]:"Set",data:Array.from(v,walk)};
    if(Array.isArray(v))return v.map(walk);
    if(typeof v!=="object")throw new TypeError("unsupported portable state value: "+typeof v);
    if(seen.has(v))throw new Error("portable expert state cannot contain cycles");
    seen.add(v);
    const out={};for(const [k,x] of Object.entries(v))out[k]=walk(x);
    seen.delete(v);return out;
  }
  return walk(value);
}

export function decodePortableState(value){
  function walk(v){
    if(v==null||typeof v!=="object")return v;
    if(Array.isArray(v))return v.map(walk);
    const type=v[TYPE_KEY];
    if(type){
      if(type==="BigInt")return BigInt(v.value);
      if(type==="ArrayBuffer")return Uint8Array.from(v.data||[]).buffer;
      if(type==="Date")return new Date(v.value);
      if(type==="Map")return new Map((v.data||[]).map(([k,x])=>[walk(k),walk(x)]));
      if(type==="Set")return new Set((v.data||[]).map(walk));
      const C=typedConstructors[type];
      if(!C)throw new Error("unknown portable typed array "+type);
      const rows=(v.data||[]).map(x=>(type==="BigInt64Array"||type==="BigUint64Array")?BigInt(x):x);
      return new C(rows);
    }
    const out={};for(const [k,x] of Object.entries(v))out[k]=walk(x);return out;
  }
  return walk(value);
}

export const PRINCIPAL_EXPERT_PORTABLE_SCHEMA="octopus-principal-expert-portable-state-v1";
