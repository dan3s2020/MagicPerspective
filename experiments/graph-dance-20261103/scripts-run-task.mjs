// Headless execution of a USER-SUPPLIED weighted problem graph.
// It never generates a graph or trains on evaluator paths; it reports all controls.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {importExternalWorld} from './engine/external.mjs';
import {oracle} from './engine/world.mjs';
import {AssociationRule} from './engine/dance.mjs';
import {Episode} from './engine/agent.mjs';

const home=path.dirname(fileURLToPath(import.meta.url));
async function main(){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts-run-task.mjs /path/to/my-graph.json');
 const userInput=JSON.parse(await readFile(path.resolve(file),'utf8'));
 const {world,summary}=importExternalWorld(userInput);
 let rule=new AssociationRule(19),source='new/untrained';
 for(const name of ['best-rule.json','live-rule.json']){
  const cp=path.join(home,'data',name);
  if(!existsSync(cp))continue;
  const data=JSON.parse(await readFile(cp,'utf8'));
  if(data?.schema!==7)throw Error('Unsupported saved checkpoint format');
  rule=AssociationRule.restore(data.rule);
  source=name;break;
 }
 const modes={},opt=oracle(world);
 if(!Number.isFinite(opt.cost)){
  console.log(JSON.stringify({schema:1,source:'user-supplied graph',
   modelCheckpoint:source,task:summary,reachable:false,
   verdict:'No valid open path exists; impossible under the supplied constraints',modes:{}},null,2));return;
 }
 for(const [name,settings] of Object.entries({
  'learned-dance':{dance:true,trained:true},
  'no-dance':{dance:false,trained:true},
  'untrained-dance':{dance:true,trained:false}
 })){
  const localRule=settings.trained?AssociationRule.restore(rule.snapshot()):new AssociationRule(rule.seed);
  const ep=new Episode(world,localRule,{online:false,dance:settings.dance});
  ep.run();
  const metric=ep.summary();
  modes[name]={
    success:metric.solved,actualCost:metric.cost,
    optimalCost:opt.cost,excessCost:metric.solved?metric.cost-opt.cost:null,
    steps:metric.steps,initialF1:metric.initialF1,
    observedAssociations:metric.discovered,
    eventTrace:ep.journal.map(e=>({from:e.from,to:e.to,type:e.type,cost:e.cost,
      newAssociations:e.newAssociations,surprise:e.surprise}))
  };
 }
 console.log(JSON.stringify({schema:1,source:'user-supplied graph',modelCheckpoint:source,
  task:summary,reachable:true,optimalRoute:opt.nodes.map(i=>summary.ids[i]),modes},null,2));
}
main().catch(e=>{console.error('TASK IMPORT ERROR:',e.message);process.exitCode=1;});
