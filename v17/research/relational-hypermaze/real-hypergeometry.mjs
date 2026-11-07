// V24 observational N-dimensional geometry for faithful navigation/inspection.
// Axes 0..11 are deterministic signed projections of ACTUAL observed text
// terms, not claimed to be autonomously learned physics or semantic knowledge.
// Axes 12..15 are observed role, confidence, experience age and ORIGINAL
// Discoverer.shape goal-attraction field. Graph edges remain authoritative.
export const AXIS_LABELS=[
 "Text term projection 01","Text term projection 02","Text term projection 03",
 "Text term projection 04","Text term projection 05","Text term projection 06",
 "Text term projection 07","Text term projection 08","Text term projection 09",
 "Text term projection 10","Text term projection 11","Text term projection 12",
 "Observed state role","Confidence from actual evidence",
 "Observation age","Original Discoverer.shape attraction"
];
function hash(s,salt){
 let h=(2166136261 ^ salt)>>>0;
 for(let j=0;j<s.length;j++)h=Math.imul(h^s.charCodeAt(j),16777619)>>>0;
 h^=h>>>16;h=Math.imul(h,2246822507)>>>0;return (h^(h>>>13))>>>0;
}
const ROLE={ "new-question":-1,"hypothesized-perspective":-.45,
  "observed-question":.35,"observed-answer":1};
function termVector(text,terms){
 const values=new Array(12).fill(0),tokens=terms(text);
 if(!tokens.length)return values;
 for(const token of tokens){
  for(let d=0;d<12;d++){
   const h=hash(token,0x9e3779b9+Math.imul(d+1,0x85ebca6b));
   values[d]+=(h&1)?1:-1;
  }
 }
 const scale=1/Math.sqrt(tokens.length);
 return values.map(x=>Math.tanh(x*scale));
}
export function projectObservedWorld(nodes,field,records,nextId,terms){
 const projected=nodes.map((n,i)=>{
  const r=n.recordId==null?null:records.get(n.recordId);
  const actualText=n.kind==="observed-answer"&&r?r.answer:
    n.kind==="observed-question"&&r?r.prompt:n.label;
  const semantic=termVector(actualText,terms);
  const confidence=n.kind==="observed-answer"||n.kind==="observed-question"?1:
    n.kind==="hypothesized-perspective"?.25:0;
  const age=r&&nextId>1?2*r.id/(nextId-1)-1:0;
  const value=Number.isFinite(field?.[i])?field[i]:0;
  const axes=[...semantic,ROLE[n.kind]??0,confidence,age,
    Math.max(-1,Math.min(1,value))];
  return {...n,axes,axisTerms:terms(actualText).length,
    axisProvenance:{
      language:"Actual observed lexical features (signed projections, not trained physical dimensions)",
      role:"Original graph node role",
      confidence:"Observed Q/A=1; hypothesized perspective=0.25; incoming link verification is shown separately",
      time:"Observed record ID / experience history",
      attraction:"Original V17 Discoverer.shape computed field"
    }};
 });
 return {dimensions:16,axisLabels:AXIS_LABELS,origin:"observed-text-and-original-field",
    nonlinearProjection:"hashed term signatures, not a learned continuous physics",
    nodes:projected};
}
