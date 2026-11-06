// UI interaction smoke: verifies the actual original V17 research controls,
// not a user-facing mock corpus or claimed language learning metric.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setupShapeReplay} from '../v17/transcend/torus-aether/ui/research-replay.mjs';
import {setupCharacterReplay} from '../v17/transcend/torus-aether/ui/research-character-replay.mjs';
import {captureSolutionShape} from '../isolated/native-language-paths/solution-shape-trace.mjs';
import {Brain} from '../v17/transcend/torus-aether/devour/brain.mjs';
import {ObservedQAAtlas} from '../isolated/native-language-paths/atlas.mjs';

const noop=()=>{};
const g=new Proxy({},{
  get(t,key){return t[key]??noop;},
  set(t,key,value){t[key]=value;return true;}
});
class Control{
  constructor(id=''){this.id=id;this.value='0';this.textContent='';
    this.children=[];this.listeners={};this.checked=false;this.className='';
    this.classList={add:noop,remove:noop,contains:()=>false};
    this.width=800;this.height=440;}
  getContext(){return g;}
  addEventListener(name,cb){this.listeners[name]=cb;}
  replaceChildren(){this.children=[];}
  append(child){this.children.push(child);}
}
const ids=[
 'shapeResearch','rTraceStep','rActorPolicy','rProjection','rDimX','rDimY',
 'rRotate','rRotateOut','rFieldSweep','rSweepCount','rStepCount',
 'researchShapeMap','researchLocal','rFirst','rPrev','rPlay','rPause',
 'rNext','rFollow','rReplaySpeed','rStepFacts','rAlternativeList',
 'rTraceEvents','rShapeTruth','rCharStep','rCharacterStream','rCharStatus','rCharInspection'
];
test('original UI has every connected real-graph field and working replay controls',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const html=fs.readFileSync(path.join(root,'v17/transcend/torus-aether/ui/index.html'),'utf8');
  for(const id of ids)assert.ok(html.includes('id="'+id+'"'),'Original UI missing #'+id);
  const elements=new Map(ids.map(id=>[id,new Control(id)]));
  for(const [id,value] of Object.entries({
    rActorPolicy:'native',rProjection:'topology',rDimX:'attraction',
    rDimY:'successor',rRotate:'0',rReplaySpeed:'650',rTraceStep:'0',rFieldSweep:'0'
  }))elements.get(id).value=value;
  elements.get('rFollow').checked=true;
  globalThis.document={getElementById:id=>elements.get(id)||null,
    createElement:tag=>new Control(tag)};
  const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
  const brain=new Brain({rules,c:{margin:.05,window:400},seed:11});
  for(let i=0;i<35;i++)brain.playMaze(false);
  const atlas=new ObservedQAAtlas();
  atlas.observe('Where is the archive?','The archive is inside the city library.',15);
  const graph=atlas.build('Where is the archive located?');
  const native=captureSolutionShape(graph,brain.disc,{actorPolicy:'native'});
  const successor=captureSolutionShape(graph,brain.disc,{actorPolicy:'successor'});
  const replay=setupShapeReplay();
  replay.update({navigation:{native,successor},index:27},0,1);
  assert.match(elements.get('rStepCount').textContent,/Pas 0/);
  assert.match(elements.get('rStepFacts').textContent,/PERSPECTIVĂ GLOBALĂ/);
  elements.get('rNext').onclick();
  assert.match(elements.get('rStepCount').textContent,/Pas 1/);
  elements.get('rProjection').value='diagnostic';
  elements.get('rProjection').listeners.change();
  elements.get('rRotate').value='95';
  elements.get('rRotate').listeners.input();
  assert.equal(elements.get('rRotateOut').textContent,'95°');
  elements.get('rActorPolicy').value='successor';
  elements.get('rActorPolicy').onchange();
  assert.match(elements.get('rStepCount').textContent,/Pas 0/);
  const choices=elements.get('rAlternativeList').children;
  assert.ok(choices.length>0);
  choices[0].onclick();
  elements.get('rFieldSweep').value='0';
  elements.get('rFieldSweep').oninput();
  assert.match(elements.get('rSweepCount').textContent,/iterații/);
  const character=setupCharacterReplay();
  character.update({seen:4,hits:2,accuracy:.5,recent:[
    {at:1,guess:65,actual:65,correct:true,source:'mem'},
    {at:2,guess:66,actual:67,correct:false,source:'form'}
  ]},{requested:'off'});
  assert.match(elements.get('rCharInspection').textContent,/A prezis/);
  assert.equal(elements.get('rCharacterStream').children.length,2);
  elements.get('rCharStep').value='0';elements.get('rCharStep').oninput();
  assert.match(elements.get('rCharInspection').textContent,/Caracter 1/);
  character.update({seen:0,hits:0,frozenRow:42,frozenAccuracy:.5,
    frozenRecent:[{at:0,guess:65,actual:66,correct:false,source:'frozen-preobservation'}]},
    {requested:'cuda:0'});
  assert.match(elements.get('rCharStatus').textContent,/readFrozen/);
  elements.get('rPause').onclick();
  elements.get('rFirst').onclick();
  assert.match(elements.get('rStepCount').textContent,/Pas 0/);
});
