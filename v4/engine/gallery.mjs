// Evaluator-only preview worlds. No preview truth enters agent or training APIs.
import {makeWorld,publicStructure,oracle} from './world.mjs';
export function makeGallery(size=7){
 if(!Number.isInteger(size)||size<5||size>17||size%2!==1)throw Error('Gallery requires odd size 5..17');
 return ['maze','braided','graph'].map((kind,i)=>{
  const w=makeWorld(280701+i*7391,kind,size),path=oracle(w);
  return {kind,position:w.start,spec:publicStructure(w),
   teacher:{truth:w.edges.map(e=>({id:e.id,open:e.open})),
    path:path.nodes,edges:path.edges,cost:path.cost}};
 });
}
