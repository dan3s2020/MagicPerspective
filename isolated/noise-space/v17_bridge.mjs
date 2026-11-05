// Isolated bridge to the REAL V17 Brain running in its own Node worker.
import {Worker} from 'node:worker_threads';
const worker=new Worker(new URL('./v17_worker.mjs',import.meta.url));
let state={available:false,real:true,engine:'V17 Brain',running:false,error:'Starting real V17 worker'};
worker.on('message',msg=>{if(msg?.type==='state')state=msg.state;});
worker.on('error',err=>{state={...state,available:false,running:false,error:String(err.stack||err)};});
worker.on('exit',code=>{state={...state,available:false,running:false,error:'Real V17 worker exited: '+code};});
export const realState=()=>state;
export function realCommand(command){
  if(!command||typeof command.action!=='string')throw Error('Missing action');
  if(!['start','pause','resume','stop','save','load','state'].includes(command.action))throw Error('Unknown action');
  if(!state.available&&command.action!=='state')throw Error('Real V17 worker is not available: '+state.error);
  worker.postMessage(command);
}
export function closeRealWorker(){worker.terminate();}
