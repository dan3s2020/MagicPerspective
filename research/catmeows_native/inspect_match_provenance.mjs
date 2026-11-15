// Source-fidelity: inspect the ACTUAL suffix-match lengths k (not proposal index d)
// inside ORIGINAL AligningGraph after genuine CatMeows learning on owner-disjoint cats.
// Diagnostic only, no new model, no tuning, no semantic accuracy claim.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
const data=JSON.parse(fs.readFileSync('runtime/catmeows/sensory.json','utf8'));
if(data.length!==440)throw Error('Missing the 440 original WAV-derived samples');
const BASE={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const pmap=new Map();
function root(k){if(!pmap.has(k))pmap.set(k,k);const p=pmap.get(k);if(p!==k)pmap.set(k,root(p));return pmap.get(k);}
function join(a,b){a=root(a);b=root(b);if(a!==b)pmap.set(a,b);}
data.forEach(x=>join('c:'+x.cat,'o:'+x.owner));
const group=new Map();
for(const x of data){const k=root('c:'+x.cat),v=group.get(k)||{owners:new Set(),n:0};v.n++;v.owners.add(x.owner);group.set(k,v);}
const sorted=[...group.values()].sort((a,b)=>b.n-a.n),folds=Array.from({length:3},()=>new Set()),counts=[0,0,0];
for(const g of sorted){const j=counts.indexOf(Math.min(...counts));counts[j]+=g.n;g.owners.forEach(o=>folds[j].add(o));}
const tokens=new Set([240,241,242]);
const runs=[],raw=[];
const freq={};
for(const variant of ['audio_absolute','audio_change'])for(let fold=0;fold<3;fold++){
 const train=data.filter(x=>!folds[fold].has(x.owner)),test=data.filter(x=>folds[fold].has(x.owner));
 if(test.some(x=>train.some(y=>x.cat===y.cat||x.owner===y.owner)))throw Error('Owner leakage');
 const brain=new Brain({rules:BASE,seed:1200+fold});
 for(const x of train){
   brain.live(245);
   for(const t of x[variant])brain.live(t+108);
   brain.live(246);brain.live({B:240,F:241,I:242}[x.context]);brain.live(247);
 }
 const hist=new Map(),kmatches=[],kall=[],stat={variant,fold,testN:test.length,matchedAnyClass:0,maxClassK:0,maxAnyK:0,atLeastTen:0,atLeastTwenty:0,atLeastSeventy:0,sourceCounts:{},sawMemoryProposals:0};
 for(const x of test){
   let got=[],prediction;
   brain.align.write([245,...x[variant].map(t=>t+108),246],{max:1,T:0,onStep:step=>{
    prediction=step.selected;
    got=step.proposals.map(p=>({source:p.src,k:p.k,d:p.d,
          labelSupport:[...tokens].some(t=>p.dist.has(t))}));
   }});
   const labeled=got.filter(p=>p.labelSupport),maxK=Math.max(0,...labeled.map(p=>p.k||0));
   const maxAny=Math.max(0,...got.map(p=>p.k||0));
   stat.maxClassK=Math.max(stat.maxClassK,maxK);stat.maxAnyK=Math.max(stat.maxAnyK,maxAny);
   stat.matchedAnyClass+=Number(labeled.length>0);
   stat.atLeastTen+=Number(maxK>=10);
   stat.atLeastTwenty+=Number(maxK>=20);
   stat.atLeastSeventy+=Number(maxK>=70);
   stat.sawMemoryProposals+=Number(got.some(p=>p.source.startsWith('mem')||p.source.startsWith('form')));
   for(const p of labeled)stat.sourceCounts[p.source]=(stat.sourceCounts[p.source]||0)+1;
   raw.push({variant,fold,recording:x.recording,cat:x.cat,owner:x.owner,
     truth:x.context,predictedLabel:Object.entries({B:240,F:241,I:242}).find(([_,v])=>v===prediction)?.[0]||'?',
     nProposals:got.length,nLabelProposals:labeled.length,
     maxLabelSupportingMatchedSymbols:maxK,maxAnyMatchedSymbols:maxAny,
     labelProposalDetails:labeled.map(p=>({src:p.source,k:p.k,d:p.d})).slice(0,40)});
   kmatches.push(maxK);kall.push(maxAny);
 }
 const avg=x=>x.reduce((a,b)=>a+b,0)/x.length;
 stat.meanMaxClassMatchedSymbols=avg(kmatches);
 stat.meanMaxAnyMatchedSymbols=avg(kall);
 stat.classContextFractionWithAtLeastTenSymbols=stat.atLeastTen/test.length;
 stat.classContextFractionWithAtLeastSeventySymbols=stat.atLeastSeventy/test.length;
 runs.push(stat);
 console.log('CATMEOWS_ACTUAL_SUFFIX_K '+JSON.stringify(stat));
}
fs.mkdirSync('runtime/catmeows',{recursive:true});
fs.writeFileSync('runtime/catmeows/native_match_provenance.json',JSON.stringify({warning:'Original AligningGraph depth is a number of PROPOSAL LEVELS, NOT fixed context token cap',runs},null,2));
fs.writeFileSync('runtime/catmeows/native_match_provenance_raw.jsonl',raw.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log('CATMEOWS_ACTUAL_SUFFIX_K_COMPLETE '+raw.length);
