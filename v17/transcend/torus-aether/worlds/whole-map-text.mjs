// MagicPerspective V17 / Whole-World Navigator.
// ABSORB THE COMPLETE WORLD FIRST. No teacher-forced next-character target is used by the navigator.
// One generic goal-wave mechanism works for 2D mazes and finite N-dimensional text-state hypercubes.
// These are explicit finite graph worlds, NOT a semantic map inferred from arbitrary natural language.
const finite=(x,low,high)=>Number.isInteger(x)&&x>=low&&x<=high;
const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;}};
const id=(domain,k)=>domain+':'+k;
const verifyWord=(s,bits)=>typeof s==='string'&&s.length===bits&&/^[01]+$/.test(s);

// States are points in {0,1}^D. Legal transitions toggle EXACTLY ONE coordinate,
// not an arbitrary next-token distribution. Walls are forbidden states / edges.
export function makeTextHypercube({dimensions=6,seed=1,start=null,goal=null,wallRate=.18,maxStates=2048,forbidden=[],ensureConnected=true}={}){
 if(!finite(dimensions,1,11)||!Number.isFinite(wallRate)||wallRate<0||wallRate>.85)
  throw Error('Text hypercube requires 1..11 binary dimensions and wallRate 0..0.85');
 const n=2**dimensions;
 if(n>maxStates)throw Error('State space exceeds explicit atlas limit. No incomplete map is silently accepted');
 start ??= '0'.repeat(dimensions);goal ??= '1'.repeat(dimensions);
 if(!verifyWord(start,dimensions)||!verifyWord(goal,dimensions))throw Error('Start and goal must be binary strings matching dimensions');
 const words=Array.from({length:n},(_,i)=>i.toString(2).padStart(dimensions,'0'));
 const fixed=new Set(forbidden);
 for(const w of fixed)if(!verifyWord(w,dimensions))throw Error('A forbidden state has incorrect dimensions');
 if(fixed.has(start)||fixed.has(goal))throw Error('Start or goal is a wall');
 // The environment generates the entire wall layout. Neither the chosen path nor
 // the distance-to-goal field is passed to the organism.
 let walls=null,attempts=0;
 const random=rng(seed);
 for(;attempts<40;attempts++){
  walls=new Set(fixed);
  for(const word of words)if(word!==start&&word!==goal&&!fixed.has(word)&&random()<wallRate)walls.add(word);
  const reachable=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++){
   const state=queue[i];
   for(let d=0;d<dimensions;d++){
    const next=state.slice(0,d)+(state[d]==='0'?'1':'0')+state.slice(d+1);
    if(!walls.has(next)&&!reachable.has(next)){reachable.add(next);queue.push(next);}
   }
  }
  if(reachable.has(goal)||!ensureConnected)break;
 }
 if(attempts===40)throw Error('No connected wall layout found; lower wallRate or set ensureConnected=false');
 const nodes=words.map(w=>({id:id('text',w),label:w,position:[...w].map(Number),wall:walls.has(w)}));
 const edges=[];
 for(const w of words){
  for(let d=0;d<dimensions;d++){
   const to=w.slice(0,d)+(w[d]==='0'?'1':'0')+w.slice(d+1);
   edges.push({from:id('text',w),to:id('text',to),axis:d,
    action:'flip-axis-'+d,blocked:walls.has(w)||walls.has(to),cost:1});
  }
 }
 return {domain:'text',dimensions,seed,start:id('text',start),goal:id('text',goal),
  nodes,edges,metadata:{wallRate,connectivityChecked:true,fullAtlas:true,
   name:'Binary text-state hypercube (NOT natural-language meaning)',generatedAttempts:attempts+1}};
}

// A concrete input->target world: the organism is a cursor in a space
// of COMPLETE strings. A movement edits exactly one character coordinate.
// The "next character" is the symbol at the cursor's new position.
export function makeTextEditMaze({input,target,forbidden=[],seed=1,wallRate=0}={}){
 if(typeof input!=='string'||typeof target!=='string'||input.length!==target.length)
  throw Error('Input and target must be strings of equal length');
 const changed=[];
 for(let i=0;i<input.length;i++)if(input[i]!==target[i])changed.push(i);
 if(changed.length<1||changed.length>10||input.length>256)
  throw Error('Explicit string-edit atlas supports 1..10 changed positions');
 const wordOf=bits=>{
  const chars=[...input];
  for(let j=0;j<bits.length;j++)if(bits[j]==='1')chars[changed[j]]=target[changed[j]];
  return chars.join('');
 };
 const options=new Map();
 for(let mask=0;mask<2**changed.length;mask++){
  const bits=mask.toString(2).padStart(changed.length,'0');
  options.set(wordOf(bits),bits);
 }
 const fixed=[];
 for(const word of forbidden){
  if(!options.has(word))throw Error('Forbidden text state is not reachable through the defined single-character edits');
  fixed.push(options.get(word));
 }
 const base=makeTextHypercube({dimensions:changed.length,seed,wallRate,
  forbidden:fixed,start:'0'.repeat(changed.length),goal:'1'.repeat(changed.length)});
 return {...base,domain:'text',nodes:base.nodes.map(n=>({...n,label:wordOf(n.label)})),
  edges:base.edges.map(e=>({...e,axis:changed[e.axis],action:'edit-character-'+changed[e.axis]})),
  metadata:{...base.metadata,input,target,changedCharacterPositions:changed,
   name:'Complete input-to-target text-state atlas; not an LM'}}; 
}

// Convert exactly the existing V17 2D maze to the SAME graph representation.
export function mapFrom2DMaze(maze){
 const {n,wall,start,goal}=maze;
 if(!finite(n,3,100)||wall?.length!==n*n)throw Error('Invalid V17 maze');
 const nodes=Array.from({length:n*n},(_,p)=>({id:id('maze',p),label:String(p),
  position:[p%n,Math.floor(p/n)],wall:!!wall[p]}));
 const moves=[[0,-1],[1,0],[0,1],[-1,0]],edges=[];
 for(let p=0;p<n*n;p++)for(let d=0;d<4;d++){
  const x=p%n+moves[d][0],y=Math.floor(p/n)+moves[d][1];
  if(x<0||y<0||x>=n||y>=n)continue;
  const q=y*n+x;
  edges.push({from:id('maze',p),to:id('maze',q),axis:d,action:'move-'+d,
   blocked:!!wall[p]||!!wall[q],cost:1});
 }
 return {domain:'maze',dimensions:2,seed:maze.seed??0,nodes,edges,
  start:id('maze',start),goal:id('maze',goal),metadata:{fullAtlas:true,name:'Original V17 2D maze'}};
}

// Iterative local wavefront through every legal connection, after the entire
// world is observed and before any character/state movement takes place.
// The same operation is used in 2D and N-D with NO domain-specific route rule.
export class WholeWorldNavigator{
 constructor({maxNodes=2048,maxPasses=2048}={}){
  this.maxNodes=maxNodes;this.maxPasses=maxPasses;this.atlas=null;this.values=new Map();
  this.stats=null;this.history=[];
 }
 absorb(world){
  if(!world||!Array.isArray(world.nodes)||!Array.isArray(world.edges)||
    world.nodes.length<2||world.nodes.length>this.maxNodes)throw Error('Invalid or oversized world');
  const map=new Map();
  for(const n of world.nodes){
   if(typeof n.id!=='string'||map.has(n.id)||!Array.isArray(n.position))throw Error('Invalid / duplicate state');
   map.set(n.id,{...n,position:n.position.slice()});
  }
  if(!map.has(world.start)||!map.has(world.goal)||map.get(world.start).wall||map.get(world.goal).wall)throw Error('Invalid start or goal');
  const edges=[],inward=new Map(),outward=new Map();
  for(const e of world.edges){
   if(!map.has(e.from)||!map.has(e.to)||!Number.isFinite(e.cost)||e.cost<=0||e.cost!==1)
    throw Error('Unknown state or nonunit cost');
   const x={...e,blocked:!!(e.blocked||map.get(e.from).wall||map.get(e.to).wall)};
   edges.push(x);
   if(!inward.has(x.to))inward.set(x.to,[]);
   if(!outward.has(x.from))outward.set(x.from,[]);
   if(!x.blocked){inward.get(x.to).push(x);outward.get(x.from).push(x);}
  }
  // Do not smuggle a BFS distance matrix or solution path into the observed world.
  this.atlas={...world,nodes:[...map.values()],edges,
    absorbedAtOnce:true};
  this.map=map;this.inward=inward;this.outward=outward;
  this.values=new Map([[world.goal,0]]);this.history=[];this.stats=null;
  this.cursor=world.start;this.internalPath=null;this.nextMoveIndex=0;this.executed=[];this.characters=[];
  return {domain:world.domain,states:map.size,edges:edges.length,
   walls:[...map.values()].filter(v=>v.wall).length,
   start:world.start,goal:world.goal,dimensions:world.dimensions};
 }
 propagate(){
  if(!this.atlas)throw Error('Absorb the whole world BEFORE planning');
  const wave=[[this.atlas.goal]],changes=[1];let passes=0;
  for(let i=0;i<wave.length&&passes<this.maxPasses;i++,passes++){
   const frontier=wave[i],next=[];
   for(const to of frontier){
    const v=this.values.get(to);
    for(const edge of this.inward.get(to)||[]){
     const candidate=v+1,old=this.values.get(edge.from);
     if(old===undefined||candidate<old){
      this.values.set(edge.from,candidate);next.push(edge.from);
     }
    }
   }
   if(next.length){wave.push([...new Set(next)]);changes.push(new Set(next).size);}
  }
  const completed=passes< this.maxPasses;
  this.stats={wavePasses:passes,propagationSizes:changes,
   reachedStates:this.values.size,completed,
   startReachable:this.values.has(this.atlas.start),
   initialDistance:this.values.get(this.atlas.start)??null};
  return {...this.stats};
 }
 plan({noise=0,random=Math.random}={}){
  if(!this.stats||!this.stats.completed)throw Error('First propagate the goal field over the entire map');
  if(!Number.isFinite(noise)||noise<0||noise>1)throw Error('Noise must be 0..1');
  let here=this.atlas.start;
  const states=[here],actions=[],choices=[];
  if(!this.values.has(here)){
   this.internalPath=null;this.cursor=here;this.executed=[];this.characters=[];
   return {solved:false,reason:'no-legal-path',states,actions,
    walls:this.atlas.nodes.filter(x=>x.wall).length, ...this.stats};
  }
  while(here!==this.atlas.goal){
   const d=this.values.get(here);
   // NO random action is permitted to cross a wall or increase target distance.
   const valid=(this.outward.get(here)||[]).filter(x=>this.values.get(x.to)===d-1);
   if(!valid.length)throw Error('Inconsistent goal field');
   const idx=noise>0&&random()<noise?Math.floor(random()*valid.length):0;
   const edge=valid[Math.max(0,Math.min(valid.length-1,idx))];
   actions.push(edge.action);choices.push({at:here,available:valid.length,selected:edge.action,
    blocked:(this.atlas.edges.filter(e=>e.from===here&&e.blocked)).length});
   here=edge.to;states.push(here);
   if(actions.length>this.atlas.nodes.length)throw Error('Route loop');
  }
  this.history=choices;
  // This entire route exists INSIDE the navigator BEFORE any observable character moves.
  this.internalPath={states:states.slice(),actions:actions.slice(),choices:choices.map(x=>({...x}))};
  this.cursor=here===this.atlas.goal ? this.atlas.start : states[0];
  this.nextMoveIndex=0;this.executed=[];this.characters=[];
  return {solved:true,states,actions,steps:actions.length,optimal:this.stats.initialDistance,
   walls:this.atlas.nodes.filter(x=>x.wall).length,
   firstAction:actions[0]??null,choices,
   plannedBeforeMovement:true,executedMovements:0,
   ...this.stats};
 }
 // Called only AFTER plan() has discovered the internal route.
 // The emitted "next character" is the organism's NEW POSITION, not a token prediction.
 moveOne(){
  if(!this.internalPath)throw Error('Find an internal path before moving the character');
  const i=this.nextMoveIndex,states=this.internalPath.states;
  if(i>=this.internalPath.actions.length)return null;
  const from=states[i],to=states[i+1],action=this.internalPath.actions[i];
  if(this.cursor!==from)throw Error('Cursor drifted away from the internally discovered path');
  const edge=(this.outward.get(from)||[]).find(e=>e.to===to&&e.action===action);
  if(!edge||edge.blocked)throw Error('The chosen movement crossed a wall');
  const before=this.map.get(from),after=this.map.get(to);
  // A one-coordinate hypercube movement changes one bit: that bit is the visible
  // character after motion. Other worlds may define their own position symbol.
  const char=edge.axis<after.label.length&&this.atlas.domain==='text'
    ? after.label[edge.axis] : after.label;
  this.cursor=to;this.nextMoveIndex++;
  const record={step:this.nextMoveIndex,from,to,axis:edge.axis,action,
   nextCharacter:char,position:after.position.slice(),
   remaining:this.internalPath.actions.length-this.nextMoveIndex,
   reachedGoal:to===this.atlas.goal};
  this.executed.push(record);this.characters.push(char);
  return record;
 }
}

const ascii=s=>[...s].map(ch=>{const code=ch.charCodeAt(0);return code===10||code===9||(code>=32&&code<127)?code:63;});
export class NativeWholeTextWorld{
 constructor(brain,{dimensions=6,wallRate=.18,emitSymbols=320,input=null,target=null}={}){
  if(!brain||typeof brain.live!=='function'||!brain.trace)throw Error('Native V17 Brain required');
  if(!finite(dimensions,2,9))throw Error('Native world supports 2..9 dimensions');
  this.brain=brain;this.dimensions=dimensions;this.wallRate=wallRate;this.emitSymbols=emitSymbols;
  this.input=input;this.target=target;
  brain.wholeText ||= {episodes:0,solved:0,totalSteps:0,totalWalls:0,
   wavePasses:0,errors:0,recent:[],last:null};
 }
 // Absorb entire map before step 1. Goal is visible as in a 2D maze.
 // This is NOT the private unknown answer to an OpenThoughts question.
 play(seed){
  const w=this.input===null
    ? makeTextHypercube({dimensions:this.dimensions,wallRate:this.wallRate,seed})
    : makeTextEditMaze({input:this.input,target:this.target,wallRate:this.wallRate,seed});
  const nav=new WholeWorldNavigator();nav.absorb(w);
  const t=this.brain.trace; t.node('whole:text:universe','world','Text as complete map');
  t.node('whole:text:goal','goal','Target');
  const nodeid=x=>'whole:'+x;
  for(const n of w.nodes){
   const node=t.node(nodeid(n.id),n.wall?'wall':'text-state',n.label);
   node.type=n.wall?'wall':'text-state'; // same spatial position may be blocked in the new world
  }
  t.setEdge('whole:text:universe',nodeid(w.start),'start',2);
  t.setEdge(nodeid(w.goal),'whole:text:goal','target',3);
  for(const edge of t.edges.values()){
   if(edge.kind==='traversed'&&edge.a?.startsWith('whole:text:'))edge.w*=.03;
  }
  for(const e of w.edges){
   const a=nodeid(e.from),b=nodeid(e.to);
   // Prevent an old wall or passage from showing as an active edge in a NEW world.
   t.setEdge(a,b,'wall',e.blocked?.08:0,String(e.axis));
   t.setEdge(a,b,'possible-action',e.blocked?0:.7,String(e.axis));
  }
  // Structured world-sensing stream. ALL observations arrive before any action.
  // The original Brain may also learn this sensory stream, but decisions below
  // are made by topology, NOT a next-token LM or teacher-forcing.
  const header='[WHOLE MAP] '+w.domain+' dim='+w.dimensions+' start='+w.start+
    ' goal='+w.goal+' states='+w.nodes.length+' walls=';
  const all=header+w.nodes.filter(n=>n.wall).map(n=>n.label).join(',')+'\n';
  // Full structural absorption is atomic in GraphTrace and the navigator: no
  // teacher-forced string stream is used to construct the path. We keep the
  // entire sensory descriptor with this episode for auditing, not as a
  // next-character training target.
  this.lastAbsorbedDescriptor=all;
  const field=nav.propagate(),route=nav.plan();
  // All walls, nodes, connections and goal were absorbed before planning.
  // No character is emitted until an ENTIRE internal solution path exists.
  const physicalMoves=[];
  if(route.solved)for(let move; (move=nav.moveOne())!==null;){
   physicalMoves.push(move);
   const from=w.nodes.find(n=>n.id===move.from),to=w.nodes.find(n=>n.id===move.to);
   t.fire(nodeid(to.id));t.setEdge(nodeid(from.id),nodeid(to.id),'traversed',3);
   // NEXT CHARACTER = CURRENT POSITION AFTER MOVEMENT, NOT A GENERATED GUESS.
   for(const y of ascii(move.nextCharacter))this.brain.live(y,false);
   this.brain.observeShared?.({domain:'text',before:from.position,after:to.position,
    action:move.action,context:'whole-text-cursor-'+w.dimensions});
  }
  if(route.solved&&nav.cursor!==w.goal)throw Error('Internal route did not reach target');
  const s=this.brain.wholeText;s.episodes++;s.solved+=Number(route.solved);
  s.totalSteps+=route.steps;s.totalWalls+=route.walls;s.wavePasses+=field.wavePasses;
  const row={seed,states:w.nodes.length,dimensions:w.dimensions,walls:route.walls,
   solved:route.solved,steps:route.steps,optimal:route.optimal,
   wallCollisions:0,wavePasses:field.wavePasses,
   firstAction:route.firstAction,absorbBeforeFirstStep:true,
   plannedBeforeFirstCharacter:true,
   internalPlannedStates:route.states,
   actualMovements:physicalMoves.length,
   input:w.metadata.input??null,target:w.metadata.target??null,
   finalState:w.nodes.find(n=>n.id===nav.cursor)?.label??null,
   movementTrace:physicalMoves,
   movementCharacters:physicalMoves.map(x=>x.nextCharacter).join('')};
  s.last=row;s.recent.push(row);if(s.recent.length>24)s.recent.shift();
  return row;
 }
 status(){const s=this.brain.wholeText;return {episodes:s.episodes,solved:s.solved,
  solveRate:s.solved/Math.max(1,s.episodes),
  meanSteps:s.totalSteps/Math.max(1,s.episodes),
  meanWavePasses:s.wavePasses/Math.max(1,s.episodes),
  last:s.last,recent:s.recent.slice(-8),
  note:'Exact finite hypercube graph with explicit goals/walls. No demonstrated free-language understanding.'};}
}
