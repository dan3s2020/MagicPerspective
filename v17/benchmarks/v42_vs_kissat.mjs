// Read-only benchmark harness. No edits to MagicPerspective V42 or SAT adapter.
// Uses existing isolated V42 3-SAT adapter unchanged, and compares its outputs
// to unmodified upstream Kissat on identical deterministic SHA-256 3-CNF inputs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomThreshold,parityGraph,runV42,worldHash} from '../tests/v42_hard_sat_lab.mjs';

const [,,action,kind,seedText,limitText,file]=process.argv;
const seed=Number(seedText);
const limit=Number(limitText);
const world=kind==='parity72' ? parityGraph(48,true,seed) :
  (['100','300','1000'].includes(kind) ? randomThreshold(seed,Number(kind)) : null);
if(!world)throw Error('Unsupported fixed comparison case '+kind);
const clauses=world.clauses,n=world.n,m=clauses.length;
function satisfies(a){
 return clauses.every(c=>c.some(l=>a[Math.abs(l)-1]===(l>0?1:0)));
}
if(action==='generate'){
 const out=['c SHA256 reproducible 3SAT from MagicPerspective existing v42_hard_sat_lab.mjs',
 'c case='+kind+' seed='+seed+' hash='+worldHash(world),'p cnf '+n+' '+m,
 ...clauses.map(c=>c.join(' ')+' 0')].join('\n')+'\n';
 process.stdout.write(out);
}else if(action==='v42'){
 const r=runV42(world,{maxMs:limit,maxProposals:10000000,seed:17});
 if(r.status==='SAT')assert(satisfies(r.solution),'V42 produced an INVALID SAT witness');
 if(r.status==='UNSAT')assert(r.exhausted,'Invalid UNSAT: not fully exhausted');
 const {solution,...rest}=r;
 console.log('FAIR_SAT_V42 '+JSON.stringify({case:kind,seed,hash:worldHash(world),
  n,m,limitMs:limit,engine:'UNMODIFIED ORIGINAL Discoverer.shapeGraph + EXISTING v42_hard_sat_lab.mjs external SAT adapter',
  ...rest,witnessValid:r.status==='SAT'?true:undefined,witness:solution?.join('')}));
}else if(action==='kissat-verify'){
 const raw=fs.readFileSync(file,'utf8');
 const result=/^s SATISFIABLE$/m.test(raw)?'SAT':/^s UNSATISFIABLE$/m.test(raw)?'UNSAT':'UNKNOWN';
 let witnessValid=null;
 if(result==='SAT'){
  const lits=raw.split('\n').filter(x=>x.startsWith('v ')).join(' ')
     .split(/\s+/).filter(x=>/^-?\d+$/.test(x)).map(Number).filter(x=>x!==0);
  const a=Array(n).fill(-1);
  for(const l of lits)a[Math.abs(l)-1]=l>0?1:0;
  witnessValid=a.every(x=>x!==-1)&&satisfies(a);
  assert(witnessValid,'Kissat SAT witness invalid or incomplete');
 }
 console.log('FAIR_SAT_KISSAT '+JSON.stringify({case:kind,seed,hash:worldHash(world),
  n,m,status:result,witnessValid,unsatProofChecked:false,
  solver:'unmodified upstream arminbiere/kissat CDCL',limitMs:limit}));
}else throw Error('Unknown action '+action);
