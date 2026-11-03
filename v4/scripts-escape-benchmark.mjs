// Fresh weights, fully specified seeds and read-only held-out evaluation.
import {PerspectiveLearner,trainProjection,evaluateProjection} from './engine/projection.mjs';
import {evaluateRules} from './engine/rules.mjs';
import {planChemistry} from './engine/chemistry.mjs';
const scenes=Number(process.argv[2]||100);
const count=Number(process.argv[3]||100);
if(!Number.isInteger(scenes)||scenes<1||scenes>10000||!Number.isInteger(count)||count<5||count>1000)
 throw Error('Usage: node scripts-escape-benchmark.mjs [train_scenes=100] [test_scenes=100]');
const model=new PerspectiveLearner();
const before=evaluateProjection(model,{count,seed:990011});
const learned=trainProjection(model,{scenes,seed:103001});
const after=evaluateProjection(model,{count,seed:990011});
const causal=evaluateRules({count:Math.min(count,300),seed:910037});
const impossible=planChemistry({water:5},{goal:'ethanol'});
const possible=planChemistry({glucose:1,water:1},{goal:'ethanol'});
const output={version:'4.0.0-escape-experiment',scenes,count,before,learned,after,causal,
 chemistry:{waterAlone:impossible,glucosePlusWater:possible}};
console.log(JSON.stringify(output,null,2));
if(after.accuracy<before.accuracy||causal.heldOutAccuracy<causal.fixedAdditionAccuracy)
 process.exitCode=1;
