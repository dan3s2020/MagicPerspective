// Independent exact 2048 game-world transition model for MagicPerspective research.
// This is NOT a modification to the original Brain, 5D geometry or sampler.
// A move is global and deterministic; only AFTER a legal move does chance act.
export const DIRS=["left","right","up","down"];
export const mass=b=>b.reduce((a,x)=>a+x,0);
export const empty=b=>b.filter(x=>x===0).length;
export function slide(board,dir){
 if(board.length!==16||!board.every(x=>Number.isInteger(x)&&x>=0))throw Error("Expected 4x4 board");
 if(!DIRS.includes(dir))throw Error("Unknown direction");
 const out=Array(16).fill(0);let reward=0,merges=0;
 for(let row=0;row<4;row++){
  const indices=Array.from({length:4},(_,i)=>{
   if(dir==="left")return row*4+i;
   if(dir==="right")return row*4+3-i;
   if(dir==="up")return i*4+row;
   return (3-i)*4+row;
  });
  const vals=indices.map(i=>board[i]).filter(x=>x!==0),combined=[];
  for(let i=0;i<vals.length;i++){
   if(i+1<vals.length&&vals[i]===vals[i+1]){
    combined.push(vals[i]*2);reward+=vals[i]*2;merges++;i++;
   }else combined.push(vals[i]);
  }
  for(let i=0;i<combined.length;i++)out[indices[i]]=combined[i];
 }
 return {board:out,reward,merges,changed:out.some((x,i)=>x!==board[i])};
}
export function successors(board){
 const free=[];for(let i=0;i<16;i++)if(board[i]===0)free.push(i);
 if(!free.length)return [];
 return free.flatMap(index=>[2,4].map(value=>{
  const b=board.slice();b[index]=value;
  return {board:b,index,value,p:(value===2?.9:.1)/free.length};
 }));
}
export const legal=board=>DIRS.filter(dir=>slide(board,dir).changed);
export const randomSeed=initial=>()=>{initial=(Math.imul(initial,1664525)+1013904223)>>>0;return initial/4294967296;};
export function spawn(board,rand){
 const possible=successors(board);
 if(!possible.length)return null;
 const free=possible.filter(x=>x.value===2);
 const index=free[Math.floor(rand()*free.length)].index;
 const value=rand()<.9?2:4;
 return possible.find(x=>x.index===index&&x.value===value);
}
export function start(rand){
 let b=Array(16).fill(0);b=spawn(b,rand).board;b=spawn(b,rand).board;return b;
}
export function step(board,d,rand){
 const move=slide(board,d);
 if(!move.changed)return {...move,spawn:null};
 const outcome=spawn(move.board,rand);
 return {...move,board:outcome.board,spawn:{index:outcome.index,value:outcome.value}};
}
export function utility(board){
 // Fixed, publicly inspectable heuristic to evaluate BOARD POSITION, not an oracle.
 const E=empty(board),hi=Math.max(...board);
 const snake=[16,15,14,13,9,10,11,12,8,7,6,5,1,2,3,4];
 const rev=[13,14,15,16,12,11,10,9,5,6,7,8,4,3,2,1];
 const logs=board.map(x=>x?Math.log2(x):0);
 const placement=Math.max(snake.reduce((t,w,i)=>t+w*logs[i],0),
                           rev.reduce((t,w,i)=>t+w*logs[i],0));
 let near=0;
 for(let r=0;r<4;r++)for(let c=0;c<4;c++){
  const i=4*r+c;
  if(c<3&&board[i]&&board[i+1]&&board[i]===board[i+1])near++;
  if(r<3&&board[i]&&board[i+4]&&board[i]===board[i+4])near++;
 }
 return E*35+placement*.9+near*8+Math.log2(hi||1)*12;
}
export function greedy(board){
 const actions=legal(board).map(d=>({d,...slide(board,d)}));
 actions.sort((a,b)=>b.reward-a.reward || utility(b.board)-utility(a.board) ||
   DIRS.indexOf(a.d)-DIRS.indexOf(b.d));
 return actions[0]?.d??null;
}
export function chanceAware(board,{depth=2}={}){
 const root=legal(board);if(!root.length)return null;
 // Expectimax. No peek at rand/spawn. Every random future is enumerated.
 const plan=(state,remaining)=>{
  if(remaining===0)return utility(state);
  let best=-Infinity;
  for(const d of legal(state)){
   const moved=slide(state,d),outcomes=successors(moved.board);
   const estimate=moved.reward*8+(outcomes.length?
    outcomes.reduce((t,o)=>t+o.p*plan(o.board,remaining-1),0):utility(moved.board));
   if(estimate>best)best=estimate;
  }
  return best===-Infinity?utility(state)-500:best;
 };
 let best=-Infinity,result=null;
 for(const d of root){
  const moved=slide(board,d),outcomes=successors(moved.board);
  const score=moved.reward*8+(outcomes.length?
   outcomes.reduce((t,o)=>t+o.p*plan(o.board,depth-1),0):utility(moved.board));
  if(score>best){best=score;result=d;}
 }
 return result;
}
