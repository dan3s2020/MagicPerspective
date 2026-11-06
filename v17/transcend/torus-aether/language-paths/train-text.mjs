// Isolated, dependency-free Termux/Node trainer for induced language transformations.
// Training input: JSONL records {family,split,before,after}. This is symbolic induction,
// not neural-network training, and does not understand arbitrary English semantics.
import fs from 'node:fs';
import {induceTransformation,applyTransformation,discoverPath} from './engine.mjs';

const [command, input, output, target] = process.argv.slice(2);

function rows(file) {
  if (!file) throw Error('Missing JSONL filename');
  return fs.readFileSync(file,'utf8').split(/\r?\n/u)
    .map((line,i)=>({line:line.trim(),i:i+1})).filter(x=>x.line&&!x.line.startsWith('#'))
    .map(({line,i})=>{let r;try{r=JSON.parse(line);}catch(e){throw Error(file+':'+i+': '+e.message);}
      if (!r.family || !r.before || !r.after || !['train','test'].includes(r.split)) throw Error(file+':'+i+': need family, before, after, and split=train|test');
      return r;
    });
}
function load(file) {
  if (!file) throw Error('Missing rules JSON filename');
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  if(m.format!=='MagicPerspective-LanguagePaths-v1'||!Array.isArray(m.rules))throw Error('Invalid rules file');
  return m;
}
function train() {
  if(!output)throw Error('Usage: node train-text.mjs train DATA.jsonl RULES.json');
  const examples=rows(input),groups=new Map();
  for(const x of examples.filter(x=>x.split==='train')) {
    if(!groups.has(x.family))groups.set(x.family,[]);
    groups.get(x.family).push({before:x.before,after:x.after});
  }
  if(!groups.size)throw Error('No training rows');
  const rules=[];
  for(const [family,pairs] of groups)rules.push({family,...induceTransformation(pairs)});
  const model={format:'MagicPerspective-LanguagePaths-v1',trainingRows:examples.filter(x=>x.split==='train').length,
    learnedFamilies:rules.length,rules};
  fs.writeFileSync(output,JSON.stringify(model,null,2)+'\n');
  console.log(JSON.stringify({status:'TRAINED',trainingRows:model.trainingRows,learnedFamilies:model.learnedFamilies,
    saved:output, note:'Induced reusable templates from paired examples; no language model weights trained.'},null,2));
}
function evaluate() {
  if(!output)throw Error('Usage: node train-text.mjs eval DATA.jsonl RULES.json');
  const test=rows(input).filter(x=>x.split==='test'),m=load(output);
  if(!test.length)throw Error('No test rows');
  let correct=0;const examples=[];
  for(const r of test) {
    const rule=m.rules.find(x=>x.family===r.family);
    const prediction=rule?applyTransformation(rule,r.before):null,ok=prediction===r.after;
    correct+=+ok;
    if(examples.length<12)examples.push({family:r.family,before:r.before,expected:r.after,prediction,correct:ok});
  }
  console.log(JSON.stringify({status:'EVALUATED',unseenRows:test.length,correct,accuracy:correct/test.length,
    examples,note:'Measures template transfer on provided held-out examples, not semantic language understanding.'},null,2));
  if(correct!==test.length)process.exitCode=2;
}
function search() {
  if(!input || output===undefined || target===undefined) throw Error('Usage: node train-text.mjs path RULES.json "START SENTENCE" "TARGET SENTENCE"');
  const m=load(input),result=discoverPath(output,m.rules,s=>s===target,{maxDepth:6,maxStates:3000});
  console.log(JSON.stringify({start:output,target,...result,ruleNames:result.rules?.map(i=>m.rules[i].family)??[]},null,2));
  if(!result.solved)process.exitCode=2;
}
try {
  if(command==='train')train();
  else if(command==='eval')evaluate();
  else if(command==='path')search();
  else throw Error('Commands: train DATA.jsonl RULES.json | eval DATA.jsonl RULES.json | path RULES.json "START" "TARGET"');
} catch(e) { console.error('ERROR:',e.message); process.exitCode=1; }
