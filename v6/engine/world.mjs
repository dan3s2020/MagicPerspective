// V6 causal-text world generator: privileged rules stay inside the environment.
// All observations returned to the learner are action -> measured transition events.
export class RNG {
  constructor(seed=1){this.s=(seed>>>0)||1}
  next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296}
  int(n){if(!Number.isInteger(n)||n<1)throw Error('Invalid random bound');return Math.floor(this.next()*n)}
}
export const BASE=7,TOOLS=['amber','violet','cobalt'];
export const PROBES=[[0,0],[1,2],[3,5]];
const KINDS=['add-red','add-blue','swap','rotate','conditional'];
const mod=x=>(x%BASE+BASE)%BASE;
const valid=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0&&n<BASE);
function transition(rule,state){
 const [r,b]=state,a=rule.amount;
 switch(rule.kind){
 case 'add-red':return [mod(r+a),b];
 case 'add-blue':return [r,mod(b+a)];
 case 'swap':return [b,r];
 case 'rotate':return [b,mod(r+a)];
 case 'conditional':return b>=3?[mod(r+a),b]:[r,mod(b+a)];
 default:throw Error('Invalid law');
 }
}
export function createWorld(seed=1){
 const rng=new RNG(seed),rules=Object.fromEntries(TOOLS.map(tool=>
  [tool,{kind:KINDS[rng.int(KINDS.length)],amount:1+rng.int(3)}]));
 return Object.freeze({
   seed,
   // Evaluator-only access. Never pass this to learner features or model training.
   teacher:()=>structuredClone(rules),
   intervene:(state,tool)=>{
     if(!valid(state)||!TOOLS.includes(tool))throw Error('Invalid intervention');
     return {tool,from:state.slice(),to:transition(rules[tool],state)};
   }
 });
}
export function senseProbes(world){
 return TOOLS.flatMap(tool=>PROBES.map(state=>world.intervene(state,tool)));
}
export function encodeContext(events){
 const features=[];
 for(const tool of TOOLS)for(const state of PROBES){
   const event=events.find(e=>e.tool===tool&&e.from[0]===state[0]&&e.from[1]===state[1]);
   if(!event)throw Error('Missing intervention probe '+tool+' at '+state.join(','));
   features.push(event.to[0]/(BASE-1),event.to[1]/(BASE-1));
 }
 return features; // 18 real-valued observed outcomes; laws never disclosed
}
export function features(state,tool,context){
 if(!valid(state)||!TOOLS.includes(tool)||!Array.isArray(context)||context.length!==18||
   !context.every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw Error('Invalid model input');
 return [state[0]/6,state[1]/6,...TOOLS.map(t=>t===tool?1:0),...context];
}
export const INPUTS=23; // 2 state + 3 tool + 18 probe outcomes
export function parseGoal(text){
 // Fixed restricted-language input parser. This is NOT learned natural language.
 if(typeof text!=='string'||text.length>160)throw Error('Invalid goal instruction');
 const matches=[...text.toLowerCase().matchAll(/\b(red|blue)\s*(?:=|to|at)\s*([0-6])\b/g)];
 if(matches.length!==2||new Set(matches.map(m=>m[1])).size!==2)throw Error('Goal must specify red and blue registers, 0..6');
 const kv=Object.fromEntries(matches.map(m=>[m[1],Number(m[2])]));
 return [kv.red,kv.blue];
}
export function describeGoal(goal,variation=0){
 if(!valid(goal))throw Error('Invalid goal');
 return variation%2===0?('Set red to '+goal[0]+' and blue to '+goal[1]+'.'):
   ('Reach blue = '+goal[1]+' and red = '+goal[0]+'.');
}
const key=s=>s[0]*BASE+s[1];
export function shortestOracle(world,start,goal,maxDepth=6){
 if(!valid(start)||!valid(goal))throw Error('Invalid states');
 const queue=[{state:start,actions:[]}],seen=new Set([key(start)]);
 for(let q=0;q<queue.length;q++){
  const cur=queue[q];if(key(cur.state)===key(goal))return cur.actions;
  if(cur.actions.length>=maxDepth)continue;
  for(const action of TOOLS){const next=world.intervene(cur.state,action).to,k=key(next);
   if(seen.has(k))continue;seen.add(k);queue.push({state:next,actions:[...cur.actions,action]});
  }
 }
 return null;
}
export function generateTask(world,seed=55,{minSteps=2,maxSteps=5}={}){
 const rng=new RNG(seed),start=[rng.int(BASE),rng.int(BASE)];
 // Goal generation may inspect hidden physics; the goal and start alone are revealed.
 const queue=[{state:start,depth:0}],seen=new Set([key(start)]),candidates=[];
 for(let i=0;i<queue.length;i++){
  const item=queue[i];
  if(item.depth>=minSteps&&item.depth<=maxSteps)candidates.push(item.state);
  if(item.depth>=maxSteps)continue;
  for(const tool of TOOLS){
   const state=world.intervene(item.state,tool).to,k=key(state);
   if(!seen.has(k)){seen.add(k);queue.push({state,depth:item.depth+1})}
  }
 }
 const goal=candidates.length?candidates[rng.int(candidates.length)]:[mod(start[0]+3),mod(start[1]+2)];
 return {start,goal,text:describeGoal(goal,seed),minSteps,maxSteps,
  reachable:shortestOracle(world,start,goal,maxSteps)!==null};
}
