// External task adapter for the ORIGINAL Graph Dance engine.
// A user-provided weighted graph is not generated from any built-in family.
// All privileged edge costs/statuses stay in the world; Collective still uses sense().
import {oracle} from './world.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value,lo,hi)=>typeof value==='number'&&Number.isFinite(value)&&value>=lo&&value<=hi;
const idOf=value=>{
  if(typeof value==='string'&&value.length>=1&&value.length<=64)return value;
  if(Number.isSafeInteger(value)&&value>=0&&value<=999999)return String(value);
  throw Error('Node identifiers must be nonempty strings (max 64 chars) or positive safe integers');
};
const edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;

export function importExternalWorld(problem){
 if(!plain(problem)||problem.schema!==1)throw Error('Expected problem object with schema: 1');
 if(!Array.isArray(problem.nodes)||problem.nodes.length<3||problem.nodes.length>65)
  throw Error('Provide between 3 and 65 nodes');
 if(!Array.isArray(problem.edges)||problem.edges.length<1||problem.edges.length>1500)
  throw Error('Provide 1 to 1,500 edges');
 const name=typeof problem.name==='string'&&problem.name.trim()
  ?problem.name.trim().slice(0,120):'Problemă importată';
 const ids=[],positions=[],lookup=new Map();
 problem.nodes.forEach((raw,i)=>{
  const node=plain(raw)?raw:{id:raw};
  const id=idOf(node.id);
  if(lookup.has(id))throw Error('Duplicate node ID '+id);
  lookup.set(id,i);ids.push(id);
  const t=(Math.PI*2*i/problem.nodes.length)-Math.PI/2;
  const x=node.x===undefined?.5+.42*Math.cos(t):node.x;
  const y=node.y===undefined?.5+.42*Math.sin(t):node.y;
  if(!bounded(x,0,1)||!bounded(y,0,1))throw Error('Node positions must be in [0,1]');
  positions.push({x,y});
 });
 const resolve=value=>{
  const id=idOf(value),i=lookup.get(id);
  if(i===undefined)throw Error('Unknown node ID '+id);
  return i;
 };
 const start=resolve(problem.start),goal=resolve(problem.goal);
 if(start===goal)throw Error('Start and goal must be different');
 const used=new Set(),edges=[];
 for(const source of problem.edges){
  if(!plain(source))throw Error('Edges must be objects');
  const a=resolve(source.from),b=resolve(source.to);
  if(a===b)throw Error('Self-links are not allowed');
  const k=edgeKey(a,b);
  if(used.has(k))throw Error('Duplicate edge '+k);
  used.add(k);
  if(typeof source.open!=='undefined'&&typeof source.open!=='boolean')throw Error('Edge open must be boolean');
  const cost=source.cost===undefined?1:source.cost;
  if(!bounded(cost,.001,1000))throw Error('Edge costs must be finite and in [0.001,1000]');
  edges.push({id:edges.length,a,b,open:source.open!==false,cost});
 }
 const world={seed:0,n:ids.length,family:'external',start,goal,positions,edges};
 const best=oracle(world),reachable=Number.isFinite(best.cost);
 const summary={name,nodeCount:ids.length,edgeCount:edges.length,start:ids[start],
  goal:ids[goal],reachable,ids,optimalCost:reachable?best.cost:null};
 return {world,summary};
}

// The evaluator can inspect oracle(world), but training/observations cannot.
