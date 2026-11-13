// Native MagicPerspective blind future-wind lab. No new predictor, no donor proxy.
// ORIGINAL Brain.live learns observations in chronological valid-time order.
// ORIGINAL AligningGraph.write reads heldout future without seeing its labels.
// Targets: 6h, 12h, 24h wind direction bins. This is NOT a nuclear-risk forecast.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=process.env.V42_ORIGINAL_TEST_ROOT;
if(!root)throw Error('V42_ORIGINAL_TEST_ROOT required; no substitute organism allowed');
const original=path.join(root,'v17/transcend/torus-aether/devour/brain.mjs');
if(!fs.existsSync(original))throw Error('Original V42 source missing');
const {Brain}=await import(pathToFileURL(original).href);
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const stations=[
 {name:'Berlin',lat:52.52,lon:13.405},
 {name:'Vienna',lat:48.2082,lon:16.3738},
 {name:'Budapest',lat:47.4979,lon:19.0402},
 {name:'Bucharest',lat:44.4268,lon:26.1025}
];
const START=process.env.ATMOS_START||'2025-08-01',END=process.env.ATMOS_END||'2025-10-31',HORIZONS=[6,12,24];
const TRAIN_H=24*50,VAL_H=24*12;
const HEAD=208,ST_BASE=180,FUT_BASE=130;
const DIR=(d)=>Math.floor((((d%360)+360)%360+22.5)/45)%8;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function features(obs,site,t,codec,H){
  const a=obs[t],old=obs[t-6],pressureSlope=clamp(Math.round((a.pressure-old.pressure)/2),-3,3);
  // Future is intentionally NEVER read to compose the input.
  const hcode=H===6?0:H===12?1:2;
  const mark=HEAD+hcode*8+codec;
  const siteCode=ST_BASE+site;
  const now=40+a.dir;
  if(codec===0)return [mark,siteCode,now];
  if(codec===1)return [mark,siteCode,50+old.dir,now];
  if(codec===2)return [mark,siteCode,100+a.upper850,now];
  if(codec===3)return [mark,siteCode,110+a.upper700,now];
  if(codec===4)return [mark,siteCode,100+a.upper850,110+a.upper700,now];
  if(codec===5)return [mark,siteCode,100+a.upper850,120+a.upperSpeed,now];
  if(codec===6)return [mark,siteCode,90+pressureSlope+3,100+a.upper850,now];
  throw Error('Invalid native sensor codec');
}
const raw=[];
for(const s of stations){
 const u=new URL('https://historical-forecast-api.open-meteo.com/v1/forecast');
 for(const [k,v] of Object.entries({
   latitude:s.lat,longitude:s.lon,start_date:START,end_date:END,
   hourly:'wind_direction_100m,wind_speed_100m,wind_direction_850hPa,wind_speed_850hPa,wind_direction_700hPa,wind_speed_700hPa,pressure_msl',
   timezone:'GMT',wind_speed_unit:'ms'
 }))u.searchParams.set(k,String(v));
 const res=await fetch(u,{signal:AbortSignal.timeout(90000)});
 if(!res.ok)throw Error('Real historical ERA5 request failed '+s.name+': '+res.status+' '+(await res.text()).slice(0,180));
 const j=await res.json();const o=j.hourly;
 if(!o?.time?.length)throw Error('No real ERA5 time stamps: '+s.name);
 for(const k of ['wind_direction_100m','wind_speed_100m','wind_direction_850hPa','wind_speed_850hPa','wind_direction_700hPa','wind_speed_700hPa','pressure_msl'])
   if(!Array.isArray(o[k])||o[k].length!==o.time.length||o[k].some(v=>typeof v!=='number'||!Number.isFinite(v)))
     throw Error('Invalid historical variable '+k+' for '+s.name);
 raw.push({name:s.name,url:u.toString(),observations:o.time.map((time,i)=>({
   time,dir:DIR(o.wind_direction_100m[i]),
   speed:clamp(Math.floor(o.wind_speed_100m[i]/3),0,7),
   pressure:o.pressure_msl[i],
   upper850:DIR(o.wind_direction_850hPa[i]),upper700:DIR(o.wind_direction_700hPa[i]),
   upperSpeed:clamp(Math.floor(o.wind_speed_850hPa[i]/3),0,7)
 }))});
 console.log('REAL_WEATHER_FETCH',s.name,o.time.length);
}
const N=raw[0].observations.length,cutTrain=TRAIN_H,cutVal=TRAIN_H+VAL_H;
if(cutVal+HORIZONS.at(-1)>=N)throw Error('Missing fully unseen test interval');
for(const s of raw){
 if(s.observations.length!==N||s.observations.some((x,t)=>x.time!==raw[0].observations[t].time))
   throw Error('ERA5 source timelines not aligned');
}
const sha=crypto.createHash('sha256').update(JSON.stringify(raw.map(s=>s.observations))).digest('hex');
const brain=new Brain({rules,seed:17});
const labels=(v)=>FUT_BASE+v;
const codecs=[0,1,2,3,4,5,6];
let nativeLived=0,episodes=0;
const started=Date.now();

// Train in strict chronological VALID TIME. At wall clock time u,
// we show the weather observation at u as the target for a forecast
// that would have originated earlier at u-H. This never shows a target
// from validation or test to Brain.live, and every target has truly occurred.
for(let u=30;u<cutTrain;u++){
  for(let s=0;s<stations.length;s++){
    const obs=raw[s].observations;
    for(const H of HORIZONS){
      const start=u-H;
      if(start<6)continue;
      for(const codec of codecs){
        const input=features(obs,s,start,codec,H),target=labels(obs[u].dir);
        brain.beginExercise();
        for(const y of [...input,target]){brain.live(y);nativeLived++}
        episodes++;
      }
    }
  }
  if(u%240===0)console.log('NATIVE_LEARNING',JSON.stringify({validTime:u,episodes,nativeLived,seconds:Math.round((Date.now()-started)/1000)}));
}
console.log('FROZEN_TRAINING',JSON.stringify({days:TRAIN_H/24,episodes,nativeLived,brainLived:brain.lived,sha,seconds:Math.round((Date.now()-started)/1000)}));

// All readouts are ORIGINAL organism internals. A fixed
// action-space mask restricts selection to valid forecast direction symbols;
// no external classifier / nearest-neighbor / regression is introduced.
function argmaxRestricted(values,ids){
 let chosen=null,best=-Infinity;
 for(const id of ids){const score=values.get(id)||0;if(score>best&&score>0){chosen=id;best=score}}
 return chosen===null?null:chosen-FUT_BASE;
}
function forecast(input){
 let nativeDistribution=null;
 const readout=brain.align.write(input,{max:1,T:0,onStep:step=>{nativeDistribution=step.distribution;}});
 const unrestricted=(readout[0]>=FUT_BASE&&readout[0]<FUT_BASE+8)?readout[0]-FUT_BASE:null;
 const restricted=nativeDistribution?argmaxRestricted(nativeDistribution,Array.from({length:8},(_,i)=>FUT_BASE+i)):null;
 const logits=brain.predict(input);
 let chainMax=-Infinity,chainBin=null;
 for(let i=0;i<8;i++){const score=logits[FUT_BASE+i];if(typeof score==='number'&&Number.isFinite(score)&&score>chainMax){chainMax=score;chainBin=i}}
 return {unrestricted,restricted,chain:chainBin};
}
const candidates=codecs.flatMap(codec=>['unrestricted','restricted','chain'].map(readout=>({codec,readout,key:codec+'-'+readout})));
const counts={};
for(const period of ['validation','test']){
 counts[period]={};
 for(const H of HORIZONS)counts[period][H]={
  n:0,byCandidate:Object.fromEntries(candidates.map(c=>[c.key,{hits:0,valid:0}])),
  persistence:0,stationMode:0,firstHourMode:0,upper850Direction:0,upper700Direction:0
 };
}
const stationMode={};
for(const H of HORIZONS){
 stationMode[H]=raw.map(s=>{
  const count=Array(8).fill(0);
  for(let u=30;u<cutTrain;u++)count[s.observations[u].dir]++;
  return count.indexOf(Math.max(...count));
 });
}
const rows=[];
for(const period of ['validation','test']){
 const first=period==='validation'?cutTrain:cutVal;
 const end=period==='validation'?cutVal:N;
 for(const H of HORIZONS){
   const C=counts[period][H];
   for(let t=first;t+H<end;t++){
     for(let s=0;s<stations.length;s++){
       const obs=raw[s].observations;
       const actual=obs[t+H].dir;
       const baseline={persistence:obs[t].dir,stationMode:stationMode[H][s],firstHourMode:obs[t-6].dir,upper850Direction:obs[t].upper850,upper700Direction:obs[t].upper700};
       C.n++;
       for(const [name,value] of Object.entries(baseline))C[name]+=Number(value===actual);
       const prediction={};
       for(const codec of codecs){
         const r=forecast(features(obs,s,t,codec,H));
         for(const [name,value] of Object.entries(r)){
           const k=codec+'-'+name;
           prediction[k]=value;
           if(value!==null){C.byCandidate[k].valid++;if(value===actual)C.byCandidate[k].hits++}
         }
       }
       rows.push({period,horizonHours:H,time:obs[t].time,validTime:obs[t+H].time,station:stations[s].name,prediction,baseline,actualDirectionBin:actual});
     }
   }
 }
}
const accuracy=(v,n)=>+(v/Math.max(1,n)).toFixed(5);
const report={experiment:'ORIGINAL MagicPerspective V42 Native 3D Layered Weather Time-Future',what:'future direction of wind at 100m after 6/12/24h, NEVER radioactive transport or air safety',source:'Open-Meteo historical forecast archive: 100m 850hPa 700hPa layers',originalBrain:true,functions:['Brain.live','Brain.beginExercise','Brain.predict','AligningGraph.write'],userCodeModifiedOriginalBrain:false,trainRecords:episodes,trainLivedSymbols:nativeLived,trainingEnd:raw[0].observations[cutTrain-1].time,validationBegins:raw[0].observations[cutTrain].time,testBegins:raw[0].observations[cutVal].time,archiveDates:{START,END},sha,sourceUrls:raw.map(s=>s.url),validationSelection:{},scores:{},rawRows:rows};
for(const H of HORIZONS){
 const V=counts.validation[H],T=counts.test[H];
 // This code chooses the candidate using ONLY validation before independent test.
 const ranked=candidates.map(c=>({key:c.key,accuracy:accuracy(V.byCandidate[c.key].hits,V.n),hits:V.byCandidate[c.key].hits,coverage:accuracy(V.byCandidate[c.key].valid,V.n)}))
   .sort((a,b)=>b.accuracy-a.accuracy||(a.key<b.key?-1:1));
 const selected=ranked[0].key;
 report.validationSelection[H]={selected,ranked,validationHours:VAL_H,validationForecasts:V.n};
 const summarize=C=>({
   n:C.n,
   persistence:{hits:C.persistence,accuracy:accuracy(C.persistence,C.n)},
   stationMode:{hits:C.stationMode,accuracy:accuracy(C.stationMode,C.n)},
   previousSixHours:{hits:C.firstHourMode,accuracy:accuracy(C.firstHourMode,C.n)},
   upper850Direction:{hits:C.upper850Direction,accuracy:accuracy(C.upper850Direction,C.n)},
   upper700Direction:{hits:C.upper700Direction,accuracy:accuracy(C.upper700Direction,C.n)},
   selected:{name:selected,hits:C.byCandidate[selected].hits,accuracy:accuracy(C.byCandidate[selected].hits,C.n),coverage:accuracy(C.byCandidate[selected].valid,C.n)},
   byCandidate:Object.fromEntries(candidates.map(x=>[x.key,{hits:C.byCandidate[x.key].hits,accuracy:accuracy(C.byCandidate[x.key].hits,C.n),coverage:accuracy(C.byCandidate[x.key].valid,C.n)}]))
 });
 report.scores[H]={validation:summarize(V),test:summarize(T)};
}
const runTag=process.env.ATMOS_RUN_TAG||'original';
if(!/^[a-zA-Z0-9_-]{1,40}$/.test(runTag))throw Error('Unsafe report identifier');
const location='experiments/atmospheric-native-20261113/results/native-vertical-future-'+runTag+'.json';
fs.mkdirSync(path.dirname(location),{recursive:true});
fs.writeFileSync(location,JSON.stringify(report,null,2));
console.log('NATIVE_FUTURE_WEATHER_RESULT',JSON.stringify({hash:sha,trainLivedSymbols:nativeLived,seconds:Math.round((Date.now()-started)/1000),results:Object.fromEntries(HORIZONS.map(H=>[H,{validation:report.scores[H].validation.selected,test:report.scores[H].test.selected,baseline:report.scores[H].test.persistence,upper850:report.scores[H].test.upper850Direction,stationMode:report.scores[H].test.stationMode,n:report.scores[H].test.n}]))}));
console.log('NATIVE_RESULT_PATH',location);
