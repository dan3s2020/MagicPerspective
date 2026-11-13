// BRAIVOUR atmospheric pilot — REAL archived weather, ORIGINAL V42 Brain.
// No replacement neural model, teacher-forced evaluation, future exposure,
// radioactive source assumptions, or invented "safe" decisions.
// This pilot measures only hidden next-hour wind-DIRECTION bins.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.env.V42_ORIGINAL_TEST_ROOT;
if(!root) throw Error('V42_ORIGINAL_TEST_ROOT is required; refuse proxy Brain');
const source=path.join(root,'v17/transcend/torus-aether/devour/brain.mjs');
if(!fs.existsSync(source))throw Error('Pinned original Brain source is unavailable: '+source);
const {Brain}=await import(pathToFileURL(source).href);

const STATIONS=[
  {name:'Berlin',lat:52.52,lon:13.405},
  {name:'Vienna',lat:48.2082,lon:16.3738},
  {name:'Budapest',lat:47.4979,lon:19.0402},
  {name:'Bucharest',lat:44.4268,lon:26.1025}
];
const START='2025-10-01',END='2025-10-16';
const SPLIT_HOURS=12*24;
const DATA_MODEL='era5';
const RULES={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const DIRECTIONS=Array.from({length:8},(_,i)=>40+i);
const STATION_BASE=180,HOUR_BASE=190,SPEED_BASE=70,RAIN_BASE=90;

const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
const encodeDirection=(d)=>Math.floor((((d%360)+360)%360+22.5)/45)%8;
const speedBin=v=>Math.max(0,Math.min(7,Math.floor(v/3)));
const rainBin=v=>v>0.2?1:0;
const rng=(seed)=>()=>{seed|=0;seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296};
const shuffled=(n,seed)=>{const a=Array.from({length:n},(_,i)=>i);const r=rng(seed);for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const argmax=(a)=>{let k=0,m=-Infinity;for(let i=0;i<a.length;i++){if(finite(a[i])&&a[i]>m){m=a[i];k=i}}if(m===-Infinity)throw Error('Original Brain returned no finite directional score');return k};

async function fetchStation(s){
  const u=new URL('https://archive-api.open-meteo.com/v1/archive');
  const q={
    latitude:s.lat,longitude:s.lon,start_date:START,end_date:END,
    hourly:'wind_direction_100m,wind_speed_100m,precipitation',
    models:DATA_MODEL,timezone:'GMT',wind_speed_unit:'ms'
  };
  for(const [k,v] of Object.entries(q))u.searchParams.set(k,String(v));
  const res=await fetch(u,{signal:AbortSignal.timeout(90000)});
  if(!res.ok)throw Error('Historical weather request '+s.name+' HTTP '+res.status+' '+(await res.text()).slice(0,180));
  const json=await res.json();
  if(json.error)throw Error('Weather API error: '+JSON.stringify(json));
  const h=json.hourly;
  if(!h||!Array.isArray(h.time))throw Error('No hourly timeline for '+s.name);
  const N=h.time.length;
  for(const field of ['wind_direction_100m','wind_speed_100m','precipitation']){
    if(!Array.isArray(h[field])||h[field].length!==N||h[field].some(v=>!finite(v)))
      throw Error('Missing/non-finite REAL '+field+' observations for '+s.name);
  }
  const observations=h.time.map((time,i)=>({
    time,
    dir:encodeDirection(h.wind_direction_100m[i]),
    windMps:h.wind_speed_100m[i],
    speed:speedBin(h.wind_speed_100m[i]),
    precipitationMm:h.precipitation[i],
    rain:rainBin(h.precipitation[i])
  }));
  return {name:s.name,lat:s.lat,lon:s.lon,url:u.toString(),obs:observations};
}

const stations=[];
for(const s of STATIONS){stations.push(await fetchStation(s));console.log('FETCH_OK',s.name,stations.at(-1).obs.length)}
const times=stations[0].obs.map(o=>o.time);
if(times.length<=(SPLIT_HOURS+24))throw Error('Insufficient real hourly data for train/test');
for(const s of stations)if(s.obs.length!==times.length||s.obs.some((v,i)=>v.time!==times[i]))throw Error('Unaligned historical weather records');

const checksum=crypto.createHash('sha256').update(JSON.stringify(stations.map(s=>s.obs))).digest('hex');
const N=times.length;
const split=SPLIT_HOURS;
const brainOriginal=new Brain({rules:RULES,seed:17});
const brainShuffled=new Brain({rules:RULES,seed:17});
const pastBins=Array.from({length:STATIONS.length},()=>Array(8).fill(0));
const lived=(brain,t,s)=>{
  const obs=stations[s].obs[t],h=Number(obs.time.slice(11,13));
  brain.live(STATION_BASE+s);
  brain.live(HOUR_BASE+h);
  // This is the actual original Brain's mechanism, not a substitute learner.
  return obs;
};
const reveal=(brain,obs)=>{
  brain.live(40+obs.dir);
  brain.live(SPEED_BASE+obs.speed);
  brain.live(RAIN_BASE+obs.rain);
};
const predict=(brain)=>{const logits=brain.predict();return argmax(DIRECTIONS.map(i=>logits[i]))};
// Train on REAL observations only. Both Brains have the same architecture,
// the control is trained with chronologically SHUFFLED hours.
for(let t=0;t<split;t++){
  for(let s=0;s<stations.length;s++){
    const obs=lived(brainOriginal,t,s);reveal(brainOriginal,obs);
    pastBins[s][obs.dir]++;
  }
}
for(const t of shuffled(split,99117)){
  for(let s=0;s<stations.length;s++){
    const obs=lived(brainShuffled,t,s);reveal(brainShuffled,obs);
  }
}
const mode=pastBins.map(counts=>argmax(counts));
console.log('TRAIN_COMPLETE',JSON.stringify({hours:split,stations:stations.length,originalLived:brainOriginal.lived,shuffledLived:brainShuffled.lived,sha256:checksum}));

// Strict zero-feedback probe: starts at forecast origin and never sees a
// holdout observation. Provides a direct check on accidental target leakage.
// This is NOT a physics-based 24h transport forecast.
const frozenHist=brainOriginal.past.slice();
const frozen=[];
for(let t=split;t<Math.min(N,split+24);t++)for(let s=0;s<stations.length;s++){
  const h=Number(stations[s].obs[t].time.slice(11,13));
  const past=[...frozenHist,STATION_BASE+s,HOUR_BASE+h];
  const logits=brainOriginal.predict(past);
  const choice=argmax(DIRECTIONS.map(i=>logits[i]));
  frozen.push({t,s,pred:choice,actual:stations[s].obs[t].dir});
}

// Rolling causal test: predict current hidden weather; only AFTER prediction
// reveal it to the same original Brain.live() for the next hour.
const rows=[],names=['native','shuffled','persistence','training_mode'];
const totals=Object.fromEntries(names.map(k=>[k,0]));
const byStation=Object.fromEntries(stations.map(s=>[s.name,Object.fromEntries(names.map(k=>[k,0]))]));
for(let t=split;t<N;t++){
  for(let s=0;s<stations.length;s++){
    const obs=stations[s].obs[t],persistence=stations[s].obs[t-1].dir;
    lived(brainOriginal,t,s);
    lived(brainShuffled,t,s);
    const predictions={
      native:predict(brainOriginal),
      shuffled:predict(brainShuffled),
      persistence,
      training_mode:mode[s]
    };
    for(const k of names)if(predictions[k]===obs.dir){totals[k]++;byStation[stations[s].name][k]++}
    rows.push({timestamp:obs.time,station:stations[s].name,actualDirectionBin:obs.dir,predictions,wind100mMps:obs.windMps,precipitationMm:obs.precipitationMm});
    reveal(brainOriginal,obs);
    reveal(brainShuffled,obs);
  }
}
const ratio=(n,d)=>+(n/d).toFixed(5);
const heldoutN=rows.length;
const result={
  experiment:'original-v42-Brain-lived-weather-blind-next-hour',
  originalOrganism:true,
  originalFunctions:['Brain.live','Brain.predict'],
  proxyModel:false,
  sourceModel:'open-meteo/archive/era5',
  sourceUrls:stations.map(s=>s.url),
  scope:'meteorological wind-direction bins, NOT plume contamination/dose/safety',
  scoreProtocol:'train historical 12 days; hidden next-hour direction predicted before its observation is shown; rolling evaluation',
  frozen24hProtocol:'fixed starting Brain memory, no holdout observation revealed in 24h',
  weatherDates:{start:START,end:END,trainThrough:times[split-1],testFrom:times[split]},
  records:stations.length*N,trainHours:split,testHours:N-split,
  sha256:checksum,stationNames:stations.map(s=>s.name),
  results:Object.fromEntries(names.map(k=>[k,{hits:totals[k],n:heldoutN,accuracy:ratio(totals[k],heldoutN)}])),
  perStation:Object.fromEntries(stations.map(s=>[s.name,Object.fromEntries(names.map(k=>[k,ratio(byStation[s.name][k],N-split)]))])),
  strictFrozen24h:{hits:frozen.filter(x=>x.pred===x.actual).length,n:frozen.length,accuracy:ratio(frozen.filter(x=>x.pred===x.actual).length,frozen.length)},
  evaluationRows:rows,
  strictFrozenRows:frozen
};
if(rows.length<100||new Set(rows.map(x=>x.timestamp)).size<24)throw Error('No sufficiently large REAL heldout evaluation');
fs.mkdirSync('experiments/atmospheric-native-20261113/results',{recursive:true});
fs.writeFileSync('experiments/atmospheric-native-20261113/results/latest.json',JSON.stringify(result,null,2));
console.log('ATMOSPHERE_TEST_RESULT',JSON.stringify({source:'real historical ERA5',...result.results,strictFrozen24h:result.strictFrozen24h,trainHours:split,testHours:N-split,sha256:checksum}));
console.log('REPORT_FILE experiments/atmospheric-native-20261113/results/latest.json');
