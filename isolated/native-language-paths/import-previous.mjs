// Migrate the ACTUAL previous failed 2-row Parquet experiment into the
// original V17 live worker, preserving learned Brain and observed data intact.
// Source folder is READ ONLY; destination must be fresh.
import fs from 'node:fs';
import path from 'node:path';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {ObservedQAAtlas} from './atlas.mjs';
import {LiveResearch} from './live-research.mjs';

const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf('--'+name);if(i<0||!args[i+1])throw Error('Missing --'+name);return path.resolve(args[i+1]);};
const src=option('source'),dst=option('destination');
const oldBrain=path.join(src,'brain.v8'),oldAtlas=path.join(src,'atlas.json'),
  oldProgress=path.join(src,'progress.json');
const target=path.join(dst,'brains','brain-0-stable+many.v8'),
  targetResearch=target+'.research.json';
if([oldBrain,oldAtlas,oldProgress].some(f=>!fs.existsSync(f)))
  throw Error('Old real experiment is missing brain.v8, atlas.json or progress.json');
if([target,targetResearch].some(f=>fs.existsSync(f)))
  throw Error('Target brain already exists. Import refuses to overwrite.');
const progress=JSON.parse(fs.readFileSync(oldProgress,'utf8'));
if(!Number.isInteger(progress.nextRow)||progress.nextRow<1)throw Error('Old progress has no valid row offset.');
const brain=Brain.load(oldBrain);
if(Math.abs((brain.chars||0)-(progress.trainingChars||0))>1)
  throw Error('Old brain character count differs from progress; cannot trust import.');
const old=ObservedQAAtlas.restore(JSON.parse(fs.readFileSync(oldAtlas,'utf8')));
if(old.examples.length!==progress.examples)throw Error('Old atlas and progress counts disagree.');
const research=new LiveResearch({maxEntries:3000,reportEvery:5,characterLimit:160,candidates:8});
research.atlas=old;research.atlas.maxEntries=Math.max(3000,old.maxEntries);
research.observed=old.examples.length;
research.trainingChars=brain.chars;
research.progress={phase:'Old Brain imported; future rows are evaluated prequentially',bytesTotal:0,bytesProcessed:0,index:progress.nextRow};
brain.exercises=progress.nextRow;
fs.mkdirSync(path.dirname(target),{recursive:true});
brain.save(target);
fs.writeFileSync(targetResearch+'.tmp',JSON.stringify(research.save()));
fs.renameSync(targetResearch+'.tmp',targetResearch);
console.log(JSON.stringify({
  imported:true,from:src,to:dst,
  originalBrainCharacters:brain.chars,originalMazeEpisodes:brain.mazes.played,
  preservedAtlasExamples:old.examples.length,
  trainingResumesAtRow:progress.nextRow,
  previousMeasuredScoresImported:false,
  oldSourceUnchanged:true
},null,2));
