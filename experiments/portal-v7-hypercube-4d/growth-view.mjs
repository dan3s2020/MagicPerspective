// The only way a new graph element becomes visible is a measured
// original-training event; no frontend timer or illustrative generator exists.
import {EvidenceGraph} from './growth.mjs';
import {createTesseractViewer} from './viewer.mjs';
export function bindMeasuredExperienceGraph(target,{snapshot=null,maxNodes=1500,maxEdges=6000}={}){
 let ledger=snapshot?EvidenceGraph.restore(snapshot):new EvidenceGraph();
 const viewer=createTesseractViewer(target);
 let error=null;
 if(ledger.sequence>0)viewer.setGraph(ledger.view({maxNodes,maxEdges}));
 function ingestEvidence(raw){
  const result=ledger.ingest(raw);
  if(!result.accepted)return result;
  viewer.setGraph(ledger.view({maxNodes,maxEdges}));
  viewer.setFrame(result.frame);
  return result;
 }
 const onExperience=e=>{
  try{ingestEvidence(e.detail);error=null}
  catch(exc){
   error=exc;
   const label=viewer.root.querySelector('[data-role=warning]');
   if(label)label.textContent='Eveniment V7 respins: '+exc.message;
  }
 };
 window.addEventListener('portal4d:measured-experience4d',onExperience);
 return {...viewer,ingestEvidence,stats:()=>ledger.stats(),
  exportSnapshot:()=>ledger.serialize(),getLastError:()=>error,
  replaceSnapshot(raw){
   const restored=EvidenceGraph.restore(raw);
   ledger=restored;viewer.setGraph(ledger.view({maxNodes,maxEdges}));
  },
  destroy(){
   window.removeEventListener('portal4d:measured-experience4d',onExperience);
   viewer.destroy();
  }};
}
