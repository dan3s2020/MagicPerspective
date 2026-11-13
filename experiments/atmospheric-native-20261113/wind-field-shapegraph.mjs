// Original MagicPerspective V42 Discoverer.shapeGraph over genuine observed
// weather-derived WIND-GRAPH edges; no source term, radioactive plume or dose.
// GOAL VISIBLE, CURRENT FIELD VISIBLE, so this is a navigation/geometry
// experiment, categorically NOT a prediction of unseen meteorological futures.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=process.env.V42_ORIGINAL_TEST_ROOT;
if(!root)throw Error('No pinned original V42 checkout; refuse a substitute organism');
const dir=path.join(root,'v17/transcend/torus-aether');
const {Brain}=await import(pathToFileURL(path.join(dir,'devour/brain.mjs')).href);
const {KIND}=await import(pathToFileURL(path.join(dir,'worlds/exercise.mjs')).href);
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const brain=new Brain({rules,seed:17});
const SIZE=4,START='2025-10-01',END='2025-10-04';
const cells=Array.from({length:SIZE*SIZE},(_,n)=>({
  row:Math.floor(n/SIZE),col:n%SIZE,
  lat:50.74+.10*Math.floor(n/SIZE),
  lon:13.38+.16*(n%SIZE)
}));
const uri=new URL('https://archive-api.open-meteo.com/v1/archive');
for(const [k,v] of Object.entries({
 latitude:cells.map(c=>c.lat).join(','),
 longitude:cells.map(c=>c.lon).join(','),
 start_date:START,end_date:END,
 hourly:'wind_direction_100m,wind_speed_100m',models:'era5',
 timezone:'GMT',wind_speed_unit:'ms'
}))uri.searchParams.set(k,String(v));
const response=await fetch(uri,{signal:AbortSignal.timeout(90000)});
if(!response.ok)throw Error('Grid weather HTTP '+response.status+' '+(await response.text()).slice(0,300));
const readings=await response.json();
const grid=Array.isArray(readings)?readings:[readings];
if(grid.length!==SIZE*SIZE)throw Error('API did not return 16 distinct REAL grid weather records: '+grid.length);
const hours=grid[0].hourly?.time;
if(!Array.isArray(hours)||hours.length<50)throw Error('Weather chronology missing');
for(const station of grid){
 const o=station.hourly;
 if(!o||o.time.length!==hours.length||o.time.some((x,i)=>x!==hours[i]))
   throw Error('Misaligned 4D real weather');
 for(const k of ['wind_direction_100m','wind_speed_100m'])
   if(!Array.isArray(o[k])||o[k].length!==hours.length||o[k].some(x=>typeof x!=='number'||!Number.isFinite(x)))
     throw Error('Non-finite weather grid '+k);
}
console.log('GRID_REAL_WEATHER_OK',JSON.stringify({cells:cells.length,hours:hours.length,first:hours[0],last:hours.at(-1)}));

// Native discoveries must come from the ORIGINAL organism's lived maze
// episodes, not from manually assigned 'attraction' coefficients.
let episodes=0;
for(;episodes<40;episodes++){
  if(brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>.5)break;
  brain.playMaze(true);
}
const learned={episodes,attractTarget:brain.disc.attract(KIND.target),conductFloor:brain.disc.conduct(KIND.floor)};
console.log('ORIGINAL_LEARNED_PRIORS',JSON.stringify(learned));
if(!(learned.attractTarget>.2&&learned.conductFloor>.5))
  throw Error('Native organism did not learn goal attraction and floor conductance');

// A 2D 4x4 'maze' is built only from actual measured wind FROM-directions.
// An allowed neighbor edge aligns with the locally measured wind TO-vector.
// This discretizes a static local airflow map; it does NOT track a real 3D
// moving air parcel. The evaluator's BFS never chooses an organism action.
const directions=[
  {dr:0,dc:1,ex:1,ny:0,action:1},
  {dr:0,dc:-1,ex:-1,ny:0,action:2},
  {dr:1,dc:0,ex:0,ny:1,action:3},
  {dr:-1,dc:0,ex:0,ny:-1,action:4}
];
function graphAt(t){
  return cells.map(c=>{
    const d=grid[c.row*SIZE+c.col].hourly.wind_direction_100m[t];
    const sp=grid[c.row*SIZE+c.col].hourly.wind_speed_100m[t];
    const to=(d+180)*Math.PI/180,ex=Math.sin(to),ny=Math.cos(to);
    return directions.filter(a=>{
      const nr=c.row+a.dr,nc=c.col+a.dc;
      return nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&sp>=.5&&ex*a.ex+ny*a.ny>=.25;
    }).map(a=>({to:(c.row+a.dr)*SIZE+c.col+a.dc,action:a.action}));
  });
}
function bfs(adj,start,goal){
 const q=[start],seen=new Set(q);
 for(let k=0;k<q.length;k++){
   const n=q[k];if(n===goal)return true;
   for(const e of adj[n])if(!seen.has(e.to)){seen.add(e.to);q.push(e.to)}
 }
 return false;
}
function runObservedMaze(t,start,goal){
 const adjacency=graphAt(t);
 const kinds=Array(SIZE*SIZE).fill(KIND.floor);
 kinds[start]=KIND.self;kinds[goal]=KIND.target;
 const reachable=bfs(adjacency,start,goal);
 const plan=brain.disc.shapeGraph(kinds,adjacency,start,{details:true});
 let pos=start,valid=!!plan?.path?.length;
 for(const move of plan?.path||[]){
    if(move.from!==pos||!adjacency[pos].some(e=>e.to===move.to&&e.action===move.action))valid=false;
    pos=move.to;
 }
 const reached=!!plan&&plan.targetReached===true&&valid&&pos===goal;
 // Do not call the BFS to choose movements. It is an independent evaluator.
 return {time:hours[t],start,goal,reachable,reached,valid,
   route:plan?.path?.map(s=>({from:s.from,to:s.to,action:s.action}))||[],
   native:'Discoverer.shapeGraph',firstPredictionBeforeAction:plan?.firstPredictionBeforeAction===true};
}
const targets=[{name:'east',goal:3},{name:'south',goal:12},{name:'southeast',goal:15}];
const episodesData=[];
for(let t=0;t<hours.length;t+=3){
 for(const target of targets){
   const r=runObservedMaze(t,0,target.goal);
   episodesData.push({region:target.name,stage:t<48?'seen-period':'heldout-period',...r});
 }
}
function summary(data){
 return {
  count:data.length,
  reachable:data.filter(x=>x.reachable).length,
  nativeReached:data.filter(x=>x.reached).length,
  nativeReachableSuccess:data.filter(x=>x.reachable&&x.reached).length,
  falsePositiveRoutes:data.filter(x=>!x.reachable&&x.reached).length,
  validRoutes:data.filter(x=>x.route.length&&x.valid).length,
  beforeActionSuccess:data.filter(x=>x.firstPredictionBeforeAction&&x.reached).length
 };
}
const result={
 experiment:'original-Discoverer-shapeGraph-on-real-observed-100m-wind-graph',
 timeSource:'ERA5 100m winds archived 2025-10-01..04',
 sourceUrl:uri.toString(),
 weatherHash:crypto.createHash('sha256').update(JSON.stringify(grid.map(s=>s.hourly))).digest('hex'),
 nativeBrain:true,nativePlanner:'Discoverer.shapeGraph',
 sourceAndTargetsVisible:true,
 futureWeatherPredicted:false,
 physicalScope:'instantaneous static 2D alignment edges, NOT 3D trajectory, hazard plume, contamination or safety assessment',
 nativePriorLearning:learned,
 all:summary(episodesData),
 heldout:summary(episodesData.filter(x=>x.stage==='heldout-period')),
 perRegion:Object.fromEntries(targets.map(s=>[s.name,summary(episodesData.filter(x=>x.region===s.name))])),
 data:episodesData
};
if(result.all.falsePositiveRoutes)throw Error('Native weather maze falsely claims physical reachability');
fs.mkdirSync('experiments/atmospheric-native-20261113/results',{recursive:true});
fs.writeFileSync('experiments/atmospheric-native-20261113/results/wind-maze.json',JSON.stringify(result,null,2));
console.log('NATIVE_WIND_MAZE_RESULTS',JSON.stringify({all:result.all,heldout:result.heldout,perRegion:result.perRegion,learned}));
console.log('REPORT_FILE experiments/atmospheric-native-20261113/results/wind-maze.json');
