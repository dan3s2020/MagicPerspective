import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {existsSync,createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ShapeNet,trainingSnapshots,evaluateModel} from './src/model.js';
import {makeMaze,RNG} from './src/maze.js';
import {Episode} from './src/agent.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const persist=path.join(root,'data','weights.json');
const HOST=process.env.HOST||'127.0.0.1',PORT=Number(process.env.PORT||3030);
const help='Use http://127.0.0.1:'+PORT;
let model=new ShapeNet(), episode,seed=1317,task=null,lastEvaluation=null,lastTraining=null;
try{if(existsSync(persist))model=ShapeNet.restore(JSON.parse(await readFile(persist,'utf8')));}catch(e){console.error('[MagicPerspective] Saved weights unavailable:',e.message);}
episode=new Episode(seed,model,11);
const json=(res,obj,status=200)=>{const b=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'same-origin'});res.end(b);};
const body=async(req)=>{let s='';for await(const c of req){s+=c;if(s.length>12000)throw Error('Payload too long');}return s?JSON.parse(s):{};};
const fail=(res,e,status=400)=>json(res,{error:e.message||String(e)},status);
async function save(){await mkdir(path.dirname(persist),{recursive:true});await writeFile(persist+'.tmp',JSON.stringify(model.serialize()));await rename(persist+'.tmp',persist);}
function state(){return {episode:episode.payload(),model:{steps:model.steps,trainedEpisodes:model.trainedEpisodes,params:model.w1.length+model.b1.length+model.w2.length+1},training:task,evaluation:lastEvaluation,lastTraining};}
async function startTraining(request){
  if(task?.running)throw Error('Training is already running');
  const count=Math.min(2000,Math.max(1,Math.floor(Number(request.episodes)||200)));
  const rate=Math.min(.04,Math.max(.0003,Number(request.lr)||.009));
  const trainSeed=Math.floor(Number(request.seed)||20261102);
  const before=evaluateModel(model,{seed:910001,count:30});
  task={running:true,total:count,done:0,loss:null,error:null,seed:trainSeed,started:new Date().toISOString()};
  lastTraining={before,after:null};
  async function process(){
    const rng=new RNG(trainSeed+count),n=episode.world.n;
    try{
      for(let i=0;i<count;i++){
        const w=makeMaze(trainSeed+i*7709,n),snaps=trainingSnapshots(w,trainSeed+i*3),order=rng.shuffle(snaps.slice());
        let total=0;
        for(const snap of order)total+=model.trainSample(w,snap.belief,w.goal,snap.position,snap.teacher,rate,rng,1);
        task.loss=+(total/snaps.length).toFixed(5);model.trainedEpisodes++;task.done=i+1;
        // Real event-loop yielding keeps /api/state and Stop UI responsive.
        if(i%2===0)await new Promise(resolve=>setImmediate(resolve));
      }
      await save();lastEvaluation=evaluateModel(model,{seed:910001,count:30});lastTraining.after=lastEvaluation;
      episode.model=model;episode.refresh();
    }catch(e){task.error=e.stack||e.message;console.error(e);}finally{task.running=false;task.finished=new Date().toISOString();}
  }
  void process();return {started:true,total:count,before};
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');const pathname=u.pathname;
    if(pathname.startsWith('/api/')){
      if(req.method==='GET'&&pathname==='/api/health')return json(res,{ok:true,version:'1.0.0',modelSteps:model.steps});
      if(req.method==='GET'&&pathname==='/api/state')return json(res,state());
      if(req.method!=='POST')return fail(res,new Error('Method not allowed'),405);
      const input=await body(req);
      if(pathname==='/api/new'){
        seed=Number.isFinite(Number(input.seed))?Math.floor(Number(input.seed))>>>0:(seed+1013)>>>0;
        const n=[7,9,11,13,15,17,19,21].includes(Number(input.n))?Number(input.n):11;
        episode=new Episode(seed,model,n);return json(res,state());
      }
      if(pathname==='/api/step'){
        if(task?.running)return fail(res,new Error('Cannot act while training'),409);
        const action=input.next===undefined?episode.step():episode.move(Math.floor(Number(input.next)));
        return json(res,{action,...state()});
      }
      if(pathname==='/api/train')return json(res,await startTraining(input));
      if(pathname==='/api/evaluate'){
        if(task?.running)return fail(res,new Error('Evaluate when training ends'),409);
        const n=episode.world.n;lastEvaluation=evaluateModel(model,{seed:910001,count:36,n});return json(res,state());
      }
      if(pathname==='/api/reset-model'){
        if(task?.running)return fail(res,new Error('Cannot reset during training'),409);
        model=new ShapeNet();episode.model=model;episode.refresh();lastEvaluation=null;lastTraining=null;await save();return json(res,state());
      }
      return fail(res,new Error('Not found'),404);
    }
    if(req.method!=='GET')return fail(res,new Error('Method not allowed'),405);
    const requested=pathname==='/'?'index.html':pathname.slice(1);
    if(!['index.html','app.js','style.css'].includes(requested))return fail(res,new Error('Not found'),404);
    const filename=path.join(root,'public',requested);
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'text/plain','Cache-Control':'no-cache'});
    createReadStream(filename).pipe(res);
  }catch(e){fail(res,e,500);}
});
server.listen(PORT,HOST,()=>console.log(`MagicPerspective ready: ${help} (HOST=${HOST})`));
