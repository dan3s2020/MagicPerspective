// Original V17 language-source evidence index: deterministic sparse token
// fingerprints with a coverage guarantee, rather than a 1/32 lottery on
// the first token. This module ONLY selects witnessed source substrings.
// It does not predict, generate, teach answers, validate semantics or
// replace the original Discoverer.shapeGraph.
//
// If an identical run of at least width + window - 1 tokens appears in
// TWO observed independent corpora at different offsets, both source
// windows deterministically choose at least one identical width-token
// fingerprint completely inside the shared passage.
//
// The 32-bit rolling hash is ONLY a sampling priority. Exact witness
// identity still uses full SHA256 of the complete original token span.
// Nonmatching text cannot become a verified physics edge by hash collision.
const BASE=257;
const positiveInt=(x,min,max)=>
 Number.isSafeInteger(x)&&x>=min&&x<=max;
function tokenHash(token){
 let h=2166136261;
 for(const char of String(token).normalize("NFC")){
  h^=char.codePointAt(0);
  h=Math.imul(h,16777619);
 }
 return h>>>0;
}
function fingerprints(tokens,width){
 const count=tokens.length-width+1;
 const hashes=new Uint32Array(count);
 const words=tokens.map(tokenHash);
 let power=1;
 for(let i=1;i<width;i++)power=Math.imul(power,BASE)>>>0;
 let hash=0;
 for(let i=0;i<width;i++)hash=(Math.imul(hash,BASE)+words[i])>>>0;
 hashes[0]=hash;
 for(let i=1;i<count;i++){
  // Exclude the outgoing whole token; include one new whole token.
  hash=(Math.imul((hash-Math.imul(words[i-1],power))>>>0,BASE)
   +words[i+width-1])>>>0;
  hashes[i]=hash;
 }
 return hashes;
}
export function selectAnchors(tokens,{width=5,window=16,
 includeBoundary=true}={}){
 if(!Array.isArray(tokens)||!positiveInt(width,1,128)||
   !positiveInt(window,1,256))
  throw Error("Winnowing needs real original token array and finite width/window");
 if(tokens.length<width)return [];
 const h=fingerprints(tokens,width),count=h.length;
 const positions=new Set();
 if(includeBoundary){
  positions.add(0); // preserved V31 start-of-response anchor semantics
  positions.add(count-1);
 }
 // Standard rightmost-minimum winnowing. Every window of consecutive
 // source k-grams picks the same minimum when its contents are shared.
 // No arbitrary absolute text or batch offsets.
 const w=Math.min(window,count),deque=new Int32Array(count);
 let first=0,last=0;
 for(let i=0;i<count;i++){
  while(first<last&&h[deque[last-1]]>=h[i])last--;
  deque[last++]=i;
  while(first<last&&deque[first]<=i-w)first++;
  if(i>=w-1)positions.add(deque[first]);
 }
 return [...positions].sort((a,b)=>a-b).map(at=>({
  at,width,fingerprint:h[at]
 }));
}
