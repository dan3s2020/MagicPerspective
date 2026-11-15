// True time-ordered CatMeows multi-call episodes: one native V42 Brain learns
// acoustics with NO context labels and predicts the NEXT previously unseen call.
// The caller's underlying goal is deciphering communication; a call forecast
// is only a necessary stepping stone, NOT a semantic translation.
// Negative controls: reverse temporal order of training calls; previous-call
// continuity and per-feature modal audio on heldout owners/cats.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const PATH='runtime/catmeows/real_sequences.json';
if(!fs.existsSync(PATH))throw Error('Real verified uncut CatMeows episodes missing');
const rows=JSON.parse(fs.readFileSync(PATH,'utf8'));
if(rows.length!==30)throw Error('Expected 30 original uncut recordings');
const ROOT=245,CALL=246,STOP=247,END=248;
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const parents=new Map();
function root(x){if(!parents.has(x))parents.set(x,x);let y=parents.get(x);if(y!==x)parents.set(x,root(y));return parents.get(x);}
function join(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
rows.forEach(e=>join('cat:'+e.cat,'owner:'+e.owner));
const connected=new Map();
for(const e of rows){
 let k=root('cat:'+e.cat),g=connected.get(k)||{owners:new Set(),count:0};g.owners.add(e.owner);g.count++;connected.set(k,g);
}
const components=[...connected.values()].sort((a,b)=>b.count-a.count);
const folded=Array.from({length:3},()=>new Set()),foldN=[0,0,0];
for(const g of components){let k=foldN.indexOf(Math.min(...foldN));for(let owner of g.owners)folded[k].add(owner);foldN[k]+=g.count;}
const modes=['audio_global','audio_duration'];
const reports=[];
const predictions=[];
function events(b,mode){
 const x=b[mode];
 if(!Array.isArray(x)||x.length!==9||x.some(t=>!Number.isInteger(t)||t<20||t>127))throw Error('Unexpected real acoustic-burst representation');
 return x.map(t=>t+108);
}
function trainBrain(brain,episodes,mode,reverseTrainOrder){
 for(const record of episodes){
  brain.live(ROOT);
  const bursts=reverseTrainOrder?record.bursts.slice().reverse():record.bursts;
  for(const burst of bursts){
   brain.live(CALL);
   for(const t of events(burst,mode))brain.live(t);
   brain.live(STOP);
  }
  brain.live(END);
 }
}
function accuracy(pred,truth){let n=0;for(let i=0;i<truth.length;i++)n+=pred[i]===truth[i];return n/truth.length;}
for(const mode of modes){
 for(let fold=0;fold<3;fold++){
  const hold=rows.filter(r=>folded[fold].has(r.owner)),train=rows.filter(r=>!folded[fold].has(r.owner));
  if(hold.some(r=>train.some(t=>r.cat===t.cat||r.owner===t.owner)))throw Error('Audio identity leakage across folds');
  let perSlot=Array.from({length:9},()=>new Map());
  for(const e of train)for(const b of e.bursts){
    const v=events(b,mode);
    for(let j=0;j<9;j++){let m=perSlot[j],k=v[j];m.set(k,(m.get(k)||0)+1);}
  }
  const modal=perSlot.map(m=>[...m].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??128);
  for(const reverseTrainOrder of [false,true]){
   const brain=new Brain({rules,seed:730+fold});
   trainBrain(brain,train,mode,reverseTrainOrder);
   let hits=0,prevHits=0,modalHits=0,full=0,prevFull=0,modalFull=0,nCalls=0,nEvents=0;
   let heldoutEnergyBurstCount=0;
   for(const e of hold){
    if(e.bursts.length<2)continue;
    let prefix=[ROOT];
    for(let i=0;i<e.bursts.length;i++){
      const actual=events(e.bursts[i],mode);
      prefix.push(CALL);
      if(i>0){
       const after=brain.lived;
       const predicted=brain.align.write(prefix,{max:9,T:0});
       if(brain.lived!==after)throw Error('Original organism trained on heldout call');
       const previous=events(e.bursts[i-1],mode);
       const n=actual.filter((v,j)=>predicted[j]===v).length;
       const m=actual.filter((v,j)=>modal[j]===v).length;
       const p=actual.filter((v,j)=>previous[j]===v).length;
       hits+=n;prevHits+=p;modalHits+=m;nEvents+=9;nCalls++;
       full+=(n===9);prevFull+=(p===9);modalFull+=(m===9);
       predictions.push({mode,fold,reverseTrainOrder,source:e.recording,cat:e.cat,owner:e.owner,
         burstIndex:i,trueNext:actual,predicted,previous,modal,numberCorrect:n});
      }
      prefix.push(...actual,STOP);
    }
    heldoutEnergyBurstCount+=e.bursts.length;
   }
   if(!nCalls)throw Error('No real unseen next acoustic calls in fold');
   const report={mode,fold,reverseTrainOrder,trainRecordingCount:train.length,
       heldoutRecordingCount:hold.length,heldoutBursts:heldoutEnergyBurstCount,
       heldoutNextCallPredictions:nCalls,heldoutEvents:nEvents,
       nativeOriginalBrainNextCallTokenAccuracy:hits/nEvents,
       sameCatPreviousCallTokenAccuracy:prevHits/nEvents,
       trainingPerBandModalTokenAccuracy:modalHits/nEvents,
       nativeOriginalBrainExact9Count:full,
       repeatPreviousExact9Count:prevFull,
       modalExact9Count:modalFull,
       fullNineTokenEvents:nCalls,
       contextLabelsTrained:false,
       nativeBrainIsUnmodified:true,
       task:"genuine next acoustic burst continuation, NOT meaning or call-response intent"};
   reports.push(report);
   console.log('CATMEOWS_REAL_UNCUT_NATIVE_SEQUENCE '+JSON.stringify(report));
  }
 }
}
fs.mkdirSync('runtime/catmeows',{recursive:true});
fs.writeFileSync('runtime/catmeows/uncut_native_sequence_results.json',JSON.stringify({source:'Zenodo CatMeows uncut extras.zip MD5 7663bb5e1de2c808beeb202a52dc99ab',audioOnly:true,noContextLabelsUsed:true,results:reports},null,2));
fs.writeFileSync('runtime/catmeows/uncut_native_sequence_predictions.jsonl',predictions.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log('CATMEOWS_REAL_UNCUT_SEQUENCE_AUDIT_COMPLETE '+JSON.stringify({results:reports.length,predictions:predictions.length}));
