// Original MagicPerspective organism absorbing archived *pre-issued* 24h forecast
// as a sensed physical "donor" rather than a replacement predictor. The donor
// was published 24h before valid time, and target is a later historical
// observation never shown during heldout inference. No radiation claims.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.env.V42_ORIGINAL_TEST_ROOT;
if(!root)throw Error('Original V42 Brain required, substitute model forbidden');
const file=path.join(root,'v17/transcend/torus-aether/devour/brain.mjs');
if(!fs.existsSync(file))throw Error('Exact original Brain missing');
const {Brain}=await import(pathToFileURL(file).href);
const brain=new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false},seed:17});
const sites=[
  {name:'Berlin',latitude:52.52,longitude:13.405},
  {name:'Vienna',latitude:48.2082,longitude:16.3738},
  {name:'Budapest',latitude:47.4979,longitude:19.0402},
  {name:'Bucharest',latitude:44.4268,longitude:26.1025}
];
const START='2025-08-01',END='2025-10-31',H=24,TRAIN=24*50,VAL=24*12;
const DIR=d=>Math.floor((((d%360)+360)%360+22.5)/45)%8;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const READOUT_BASE=130;
const CODECS=[0,1,2,3,4,5,6,7,8,9];
const num=x=>typeof x==='number'&&Number.isFinite(x);
async function fetchMulti(host,vars,model=null){
 const u=new URL(host);
 const params={
  ...(model?{models:model}:{}),
  latitude:sites.map(s=>s.latitude).join(','),
  longitude:sites.map(s=>s.longitude).join(','),
  start_date:START,end_date:END,timezone:'GMT',
  wind_speed_unit:'ms',
  hourly:vars.join(',')
 };
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));
 let res=null;
 for(let attempt=1;attempt<=3;attempt++){
  try{res=await fetch(u,{signal:AbortSignal.timeout(90000)});break;}
  catch(err){
   console.error('REMOTE_DATA_CONNECTION_RETRY',JSON.stringify({host:u.host,attempt,error:String(err)}));
   if(attempt===3)throw err;
   await new Promise(resolve=>setTimeout(resolve,3000*attempt));
  }
 }
 const text=await res.text();
 if(!res.ok)throw Error('TRUE_ARCHIVE_HTTP_'+res.status+' '+text.slice(0,360));
 const json=JSON.parse(text);
 const arr=Array.isArray(json)?json:[json];
 if(arr.length!==sites.length)throw Error('Four actual sites not returned from '+host);
 const clock=arr[0].hourly?.time;
 if(!clock?.length)throw Error('Missing archive UTC timeline');
 for(const j of arr){
  const h=j.hourly;
  if(h.time.length!==clock.length||h.time.some((x,k)=>x!==clock[k]))throw Error('Misaligned issue/valid times');
  for(const v of vars)if(!Array.isArray(h[v])||h[v].length!==clock.length)
    throw Error('Absent measured field '+v);
 }
 return {sourceUrl:u.toString(),n:clock.length,time:clock,fields:arr.map(x=>x.hourly)};
}
const observed=await fetchMulti('https://historical-forecast-api.open-meteo.com/v1/forecast',
 ['wind_direction_100m','wind_speed_100m','wind_direction_850hPa','pressure_msl']);
console.log('REAL_VALID_OBSERVATIONS',observed.n);
const modelAddress='https://previous-runs-api.open-meteo.com/v1/forecast';
const modelFields=['wind_direction_100m_previous_day1','wind_speed_100m_previous_day1'];
const donor={
  best:await fetchMulti(modelAddress,modelFields),
  ecmwf:await fetchMulti(modelAddress,modelFields,'ecmwf_ifs025'),
  gfs:await fetchMulti(modelAddress,modelFields,'ncep_gfs_global')
};
for(const [model,issued] of Object.entries(donor)){
 console.log('REAL_PREISSUED_INDEPENDENT_MODEL',model,issued.n);
 if(issued.n!==observed.n||issued.time.some((x,i)=>x!==observed.time[i]))
   throw Error('Preissued model/valid truth UTC mismatch: '+model);
}
const N=observed.n;
const cut=TRAIN+VAL;
if(N<cut+H+40)throw Error('Not enough completely hidden test hours');
const hash=crypto.createHash('sha256').update(JSON.stringify([observed.fields,donor.best.fields,donor.ecmwf.fields,donor.gfs.fields])).digest('hex');
const valid=(s,u)=>num(donor.best.fields[s].wind_direction_100m_previous_day1[u])&&
 num(donor.ecmwf.fields[s].wind_direction_100m_previous_day1[u])&&
 num(donor.gfs.fields[s].wind_direction_100m_previous_day1[u])&&
 num(observed.fields[s].wind_direction_100m[u])&&num(observed.fields[s].wind_direction_100m[u-H])&&
 num(observed.fields[s].wind_direction_850hPa[u-H])&&
 num(observed.fields[s].pressure_msl[u-H])&&num(observed.fields[s].pressure_msl[u-H-6]);
function frame(s,u,codec,ablated=false){
 const now=observed.fields[s];
 const field=(model)=>DIR(donor[model].fields[s].wind_direction_100m_previous_day1[u]);
 const b=field('best'),i=field('ecmwf'),g=field('gfs');
 const fB=ablated?(b+4)%8:b, fI=ablated?(i+4)%8:i, fG=ablated?(g+4)%8:g;
 const issuedAt=u-H;
 const surface=DIR(now.wind_direction_100m[issuedAt]);
 const aloft=DIR(now.wind_direction_850hPa[issuedAt]);
 const slope=clamp(Math.round((now.pressure_msl[issuedAt]-now.pressure_msl[issuedAt-6])/2),-3,3);
 const site=180+s,mark=208+codec;
 if(codec===0)return [mark,site,50+fB];
 if(codec===1)return [mark,site,60+fI];
 if(codec===2)return [mark,site,70+fG];
 if(codec===3)return [mark,site,50+fB,70+fG];
 if(codec===4)return [mark,site,60+fI,50+fB];
 if(codec===5)return [mark,site,60+fI,70+fG];
 if(codec===6)return [mark,site,60+fI,70+fG,50+fB];
 if(codec===7)return [mark,site,40+surface,70+fG,50+fB];
 if(codec===8)return [mark,site,80+aloft,60+fI,50+fB];
 if(codec===9)return [mark,site,90+slope+3,70+fG,50+fB];
 throw Error('Unknown native multi-donor perspective');
}

const startTime=Date.now();
let lived=0,exercises=0,missingTrain=0;
for(let u=H+7;u<TRAIN;u++){
 for(let s=0;s<sites.length;s++){
  if(!valid(s,u)){missingTrain++;continue}
  const target=READOUT_BASE+DIR(observed.fields[s].wind_direction_100m[u]);
  for(const codec of CODECS){
   brain.beginExercise();
   for(const token of [...frame(s,u,codec),target]){brain.live(token);lived++}
   exercises++;
  }
 }
 if(u%250===0)console.log('NATIVE_DONOR_AS_ORGAN_LEARNING',JSON.stringify({validTime:u,lived,exercises,seconds:Math.round((Date.now()-startTime)/1000)}));
}
console.log('NATIVE_DONOR_FROZEN',JSON.stringify({lived,exercises,missingTrain,trainEnd:observed.time[TRAIN-1],bytesHash:hash,seconds:Math.round((Date.now()-startTime)/1000)}));
const sourceIds=Array.from({length:8},(_,i)=>READOUT_BASE+i);
function prediction(p){
 let distribution=null;
 const emitted=brain.align.write(p,{max:1,T:0,onStep:s=>{distribution=s.distribution}});
 let best=null,score=-Infinity,total=0;
 for(const id of sourceIds){const x=distribution?.get(id)||0;total+=x;if(x>score&&x>0){best=id-READOUT_BASE;score=x}}
 return {best,raw:emitted[0]>=READOUT_BASE&&emitted[0]<READOUT_BASE+8?emitted[0]-READOUT_BASE:null,
  directionalConfidence:total>0?score/total:null};
}
const periods=['validation','test'];
const rows={validation:[],test:[]};
const measured={trainRecords:exercises,trainSymbols:lived,invalidTraining:missingTrain};
for(const period of periods){
 const begin=period==='validation'?TRAIN:TRAIN+VAL;
 const end=period==='validation'?TRAIN+VAL:N;
 for(let u=begin;u<end;u++){
  for(let s=0;s<sites.length;s++){
   if(!valid(s,u))continue;
   const trueDir=DIR(observed.fields[s].wind_direction_100m[u]);
   const direct=DIR(donor.best.fields[s].wind_direction_100m_previous_day1[u]);
   const ecmwf=DIR(donor.ecmwf.fields[s].wind_direction_100m_previous_day1[u]);
   const gfs=DIR(donor.gfs.fields[s].wind_direction_100m_previous_day1[u]);
   const now=DIR(observed.fields[s].wind_direction_100m[u-H]);
   const native={};const ablated={};
   for(const codec of CODECS){
    native[codec]=prediction(frame(s,u,codec,false));
    ablated[codec]=prediction(frame(s,u,codec,true));
   }
   rows[period].push({
    city:sites[s].name,issuedAt:observed.time[u-H],validTime:observed.time[u],
    actual:trueDir,directForecast:direct,ecmwfForecast:ecmwf,gfsForecast:gfs,persistence:now,native,ablated
   });
  }
 }
}
if(rows.test.length<1000||rows.validation.length<100)throw Error('Not enough independent historical forecasts');
const frac=(n,d)=>+(n/Math.max(1,d)).toFixed(5);
const score=(rows,property)=>rows.filter(x=>property(x)===x.actual).length;
const ranks=CODECS.map(codec=>({
 codec,validationHits:score(rows.validation,r=>r.native[codec].best),
 validationAccuracy:frac(score(rows.validation,r=>r.native[codec].best),rows.validation.length)
})).sort((a,b)=>b.validationHits-a.validationHits||a.codec-b.codec);
const picked=ranks[0].codec;
const summaries={};
for(const period of periods){
 const items=rows[period],n=items.length;
 summaries[period]={
  samples:n,
  selectedNative:{codec:picked,hits:score(items,r=>r.native[picked].best),accuracy:frac(score(items,r=>r.native[picked].best),n)},
  negativeDonorAblation:{hits:score(items,r=>r.ablated[picked].best),accuracy:frac(score(items,r=>r.ablated[picked].best),n)},
  trueIssued24hForecast:{hits:score(items,r=>r.directForecast),accuracy:frac(score(items,r=>r.directForecast),n)},
  ecmwfForecast:{hits:score(items,r=>r.ecmwfForecast),accuracy:frac(score(items,r=>r.ecmwfForecast),n)},
  gfsForecast:{hits:score(items,r=>r.gfsForecast),accuracy:frac(score(items,r=>r.gfsForecast),n)},
  forecastDisagreement:items.filter(r=>r.directForecast!==r.gfsForecast).length,
  eitherModelCorrect:items.filter(r=>r.directForecast===r.actual||r.gfsForecast===r.actual||r.ecmwfForecast===r.actual).length,
  persistence24h:{hits:score(items,r=>r.persistence),accuracy:frac(score(items,r=>r.persistence),n)},
  perspectives:Object.fromEntries(CODECS.map(codec=>[codec,{
   hits:score(items,r=>r.native[codec].best),
   accuracy:frac(score(items,r=>r.native[codec].best),n)
  }]))
 };
}
const report={
 experiment:'Original native Brain compares actual pre-issued ECMWF IFS + NCEP GFS + best-match 24h forecast donors',
 nativeOrganismOnly:true,originalBrainUnmodified:true,forecastInformationAlreadyAvailableAtIssueTime:true,
 weatherForecastsRunExternally:true,nativeAssimilationClaim:'conditional correction of historical forecast as sensed donor signal; NOT recovered weather physics',
 sourceUrls:{validAtmosphere:observed.sourceUrl,issued24h:Object.fromEntries(Object.entries(donor).map(([k,v])=>[k,v.sourceUrl]))},
 dates:{start:START,end:END,trainThrough:observed.time[TRAIN-1],validationFrom:observed.time[TRAIN],testFrom:observed.time[TRAIN+VAL]},
 checksum:hash,measured,selectionByValidationOnly:ranks,selectedCodec:picked,summaries,rows
};
const output='experiments/atmospheric-native-20261113/results/native-three-donor-forecast.json';
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log('NATIVE_ISSUED_FUTURE_RESULT',JSON.stringify({lived,seconds:Math.round((Date.now()-startTime)/1000),train:measured,selectedCodec:picked,validation:summaries.validation,test:summaries.test,checksum:hash}));
console.log('RAW_RESULT_FILE',output);
