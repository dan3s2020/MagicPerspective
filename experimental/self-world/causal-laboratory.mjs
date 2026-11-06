// Original V17 code is evaluated unchanged and with only allowlisted patches.
// The challenge data stays on the evaluator side of the lock, not in the learner's observations.
import {CodeLock, evaluateV17Text} from './code-world.mjs';
import crypto from 'node:crypto';

function rng(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
export function trainingCorpus(seed=33){
  const r=rng(seed),a=['blue','small','bright','quiet','green','red'],b=['cat','dog','fox','river','bird','tree'],c=['jumps','runs','sleeps','shines','sings','flows'];
  const make=(n,offset)=>Array.from({length:n},(_,j)=>{
    const x=(j+offset)%a.length,y=(j*7+offset)%b.length,z=(j*3+offset)%c.length;
    const noise=Math.floor(r()*a.length);
    return `the ${a[(x+noise)%a.length]} ${b[y]} ${c[z]}. the ${a[(x+2)%a.length]} ${b[(y+1)%b.length]} ${c[(z+2)%c.length]}.`;
  });
  return {train:make(48,0),held:make(8,51)};
}
export async function measureEdit(world,slot,value,{seed=33,steps=2100,limit=300}={}){
  const corp=trainingCorpus(seed),base=world.editor.original;
  const draft=world.editor.makeDraft({id:slot,value});
  const a=await evaluateV17Text({modulePath:base,corpus:corp,steps,limit});
  const b=await evaluateV17Text({modulePath:draft.path,corpus:corp,steps,limit});
  return {slot,value,seed,steps,before:a,after:b,delta:b-a,draft};
}
export function configureSealedLock(world,{steps=2100,seed=9087}={}){
  // Distinct seeds, never used in training probes. The learner cannot read their corpus from the gate.
  const choices=[
    ['observation-period',56],['observation-period',224],
    ['perspective-period',14],['perspective-period',56],
    ['promotion-margin',0.004],['promotion-margin',0.08],
    ['complexity-cost',0],['complexity-cost',0.02],
  ];
  const sealed=choices.map(([slot,value],i)=>({id:'blind-'+(i+1),slot,value,secretSeed:seed+i*101,steps}));
  world.lock=new CodeLock({sealed,required:sealed.length,accuracy:.75,margin:.1,
    oracle:async c=>(await measureEdit(world,c.slot,c.value,{seed:c.secretSeed,steps:c.steps})).delta});
  return world.lock.status();
}
// Opt-in autonomous probe loop. The model selects code regions with uncertainty-driven
// portals and decides which legal numerical modifications to test.
export async function exploratoryTraining(world,{rounds=12,steps=2100,seed=33}={}){
  const specs=world.editor.patches(),logs=[];
  for(let i=0;i<rounds;i++){
    const nodes=world.atlas.nodes.filter(n=>n.kind!=='locked'&&n.kind!=='portal');
    const sourceNode=nodes[(i*13+1)%nodes.length];
    const uncertainty=Object.fromEntries(nodes.map(n=>[n.id,1/(1+(world.portal.visits.get(n.id)?.n||0))]));
    const jump=world.explore(sourceNode.id,uncertainty);
    const spec=specs[i%specs.length];
    const candidates=spec.integer?[spec.min,Math.floor((spec.min+spec.max)/2),spec.max]:[spec.min,+(spec.max/5).toFixed(3),spec.max];
    const value=candidates[Math.floor(world.portal.random()*candidates.length)];
    const trial=await measureEdit(world,spec.id,value,{seed:seed+i*53,steps});
    world.effectModel.observe({slot:spec.id,value,delta:trial.delta,corpusId:'practice-'+i});
    world.feedOutcome(jump.to,Math.max(-1,Math.min(1,trial.delta*10)));
    logs.push({probe:i+1,portalFrom:jump.from,portalTo:jump.to,slot:spec.id,value,delta:trial.delta});
  }
  return logs;
}
