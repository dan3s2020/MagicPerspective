// OPTIONAL offline bridge: creates a NEW checkpoint copy in the self-world sandbox.
// It never edits the original checkpoint, source files, running server, or original V17 viewer.
// Run: node attach-saved-v17.mjs <v17-folder> <existing-v17-checkpoint.v8>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SelfCodeWorld} from './code-world.mjs';
const [root,checkpoint]=process.argv.slice(2);
if(!root||!checkpoint)throw Error('Usage: node attach-saved-v17.mjs <v17-folder> <checkpoint.v8>');
const modulePath=path.resolve(root,'transcend/torus-aether/devour/brain.mjs');
const enginePath=path.resolve(root,'transcend/epistemic-text/engine.mjs');
if(!fs.existsSync(modulePath)||!fs.existsSync(enginePath)||!fs.statSync(checkpoint).isFile())throw Error('The exact V17 brain, engine, and checkpoint are required');
const {Brain}=await import(pathToFileURL(modulePath).href);
const brain=Brain.load(path.resolve(checkpoint));
const base=path.dirname(fileURLToPath(import.meta.url)), sandbox=path.join(base,'runtime-selfcode-sandbox');
const world=new SelfCodeWorld({sourceFiles:[
  {path:enginePath,label:'v17/epistemic-text/engine.mjs'},
  {path:modulePath,label:'v17/torus-aether/devour/brain.mjs'}],
  sandbox,brain,seed:brain.seed});
const focus=world.atlas.nodes.find(n=>n.name==='EpistemicText')||world.atlas.nodes[0];
world.perceive(focus.id);
const hop=world.explore(focus.id);world.perceive(hop.to);
// Save the influenced brain only under a NEW sidecar file, not at the original path.
const newFile=path.join(sandbox,'brain-with-self-code.v8');brain.save(newFile);
console.log(JSON.stringify({originalCheckpoint:checkpoint,newCheckpoint:newFile,brainLived:brain.lived,codeAtlas:world.atlas.nodes.length,portal:hop,originalNotOverwritten:true},null,2));
