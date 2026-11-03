// Additive Perspective Escape laboratory. Existing V1/V2/V3/V4 remain untouched.
// Local-only API; no LLM, network dependency, or privileged world truth in learner.
import http from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PerspectiveLearner,createProjectionWorld,VIEWS,trainProjection,evaluateProjection} from './engine/projection.mjs';
import {RuleLearner,createRuleWorld,ACTIONS,evaluateRules} from './engine/rules.mjs';
import {planChemistry} from './engine/chemistry.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const HOST=process.env.HOST||'127.0.0.1',PORT=Number(process.env.PORT||3037);
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid port');
const checkpoint=path.join(root,'data','escape-checkpoint.json');
let perspective=new PerspectiveLearner(),projectionSeed=2201,projectionWorld=createProjectionWorld(projectionSeed);
let visible=[],viewEvents=[],ruleSeed=3107,ruleWorld=createRuleWorld(ruleSeed);
let ruleState=5,ruleGoal=7,ruleLearner=new RuleLearner(),ruleEvents=[],rulePlan=null;
let chemistry=null,evaluation=null,training=null;
try{
 if(existsSync(checkpoint)){
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));
  perspective=PerspectiveLearner.restore(saved.perspective);
 }
}catch(e){console.error('Escape checkpoint restore failed:',e.message)}
async function save(){
 await mkdir(path.dirname(checkpoint),{recursive:true});
 await writeFile(checkpoint+'.tmp',JSON.stringify({schema:1,perspective:perspective.snapshot()}));
 await rename(checkpoint+'.tmp',checkpoint);
}
const send=(res,data,status=200)=>{
 const body=JSON.stringify(data);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(body);
};
async function readJSON(req){
 let body='';for await(const buf of req){body+=buf;if(body.length>12000)throw Error('Request too large')}
 return body?JSON.parse(body):{};
}
const number=(value,min,max,fallback)=>{
 const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;
};
function state(){
 return {
  version:'4.0.0-escape-experiment',
  projection:{
   seed:projectionSeed,observed:visible.map(o=>({view:o.view,pair:o.pair.slice()})),
   teacher:projectionWorld.teacher(), // Human-only; never passed to learner.
   proposed:VIEWS.map(view=>perspective.predict(view,visible)),
   next:perspective.chooseView(visible),events:viewEvents.slice(-15),
   learned:perspective.summary()
  },
  rules:{
   seed:ruleSeed,state:ruleState,goal:ruleGoal,
   teacher:ruleWorld.teacher(), // Human-only diagnostic.
   predictions:Object.fromEntries(ACTIONS.map(action=>[action,ruleLearner.predict(ruleState,action)])),
   next:ruleLearner.chooseExperiment(ruleState),
   learned:ruleLearner.summary(),events:ruleEvents.slice(-20),plan:rulePlan
  },
  chemistry,training,evaluation
 };
}
function newScenes(seed){
 projectionSeed=seed;projectionWorld=createProjectionWorld(seed);
 visible=[];viewEvents=[];
 ruleSeed=seed+1019;ruleWorld=createRuleWorld(ruleSeed);ruleLearner=new RuleLearner();
 ruleState=(seed%10)+1;ruleGoal=(ruleState+5)%11;
 ruleEvents=[];rulePlan=null;chemistry=null;
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/health'&&req.method==='GET')return send(res,{ok:true,version:'4.0.0-escape-experiment'});
  if(pathname==='/api/state'&&req.method==='GET')return send(res,state());
  if(pathname.startsWith('/api/')){
   if(req.method!=='POST')return send(res,{error:'Method not allowed'},405);
   const arg=await readJSON(req);
   if(pathname==='/api/new'){
    newScenes(number(arg.seed,1,2147000000,projectionSeed+131));return send(res,state());
   }
   if(pathname==='/api/view'){
    const view=String(arg.view||'');
    if(!VIEWS.includes(view))return send(res,{error:'Invalid viewpoint'},400);
    if(visible.some(o=>o.view===view))return send(res,state());
    const prediction=perspective.predict(view,visible),observed=projectionWorld.observe(view);
    visible.push(observed);viewEvents.push({view,predicted:prediction.pair,actual:observed.pair,
      accurate:prediction.pair.every((n,i)=>n===observed.pair[i])});
    if(visible.length===VIEWS.length){perspective.observeScene(visible);await save()}
    return send(res,state());
   }
   if(pathname==='/api/train'){
    const scenes=number(arg.scenes,1,10000,100);
    training={running:true,scenes,started:new Date().toISOString(),error:null};
    try{
      const result=trainProjection(perspective,{scenes,seed:number(arg.seed,1,2147000000,103001+perspective.scenes*593)});
      await save();
      training={running:false,scenes,completed:new Date().toISOString(),result};
    }catch(e){training={running:false,scenes,error:String(e.message||e)};throw e}
    return send(res,state());
   }
   if(pathname==='/api/evaluate'){
    const frozen=JSON.stringify(perspective.snapshot());
    const projection=evaluateProjection(perspective,{count:number(arg.count,5,1000,60),seed:990011});
    const rules=evaluateRules({count:number(arg.ruleWorlds,5,300,40),seed:910037});
    if(frozen!==JSON.stringify(perspective.snapshot()))throw Error('Evaluation mutated active model');
    evaluation={projection,rules,created:new Date().toISOString()};
    return send(res,state());
   }
   if(pathname==='/api/rule'){
    const action=String(arg.action||'');
    if(!ACTIONS.includes(action))return send(res,{error:'Invalid action'},400);
    const before=ruleLearner.predict(ruleState,action);
    const actual=ruleWorld.intervene(ruleState,action);
    ruleLearner.observe(actual);ruleState=actual.output;
    ruleEvents.push({step:ruleEvents.length+1,action,from:actual.input,expected:before.value,to:actual.output,
      matched:before.value===actual.output,model:before.law});
    rulePlan=null;return send(res,state());
   }
   if(pathname==='/api/plan-rule'){
    ruleGoal=number(arg.goal,0,10,7);
    rulePlan=ruleLearner.plan(ruleState,ruleGoal);return send(res,state());
   }
   if(pathname==='/api/chemistry'){
    const inventory=arg.inventory;
    if(!inventory||typeof inventory!=='object'||Array.isArray(inventory))throw Error('Inventory object required');
    chemistry=planChemistry(inventory,{goal:String(arg.goal||'ethanol'),amount:number(arg.amount,1,20,1)});
    return send(res,state());
   }
   if(pathname==='/api/reset'){
    if(arg.confirm!=='RESET ESCAPE')return send(res,{error:'Exact reset confirmation required'},400);
    perspective=new PerspectiveLearner();evaluation=null;training=null;newScenes(projectionSeed+211);
    if(existsSync(checkpoint))await unlink(checkpoint);
    return send(res,state());
   }
   return send(res,{error:'Not found'},404);
  }
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const filename=pathname==='/'?'index.html':pathname.slice(1);
  if(!['index.html','app.js','style.css'].includes(filename))return send(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(filename)],'Cache-Control':'no-store'});
  createReadStream(path.join(root,'escape-public',filename)).pipe(res);
 }catch(e){send(res,{error:String(e.message||e)},500)}
});
server.listen(PORT,HOST,()=>console.log('Perspective Escape at http://'+HOST+':'+PORT));
