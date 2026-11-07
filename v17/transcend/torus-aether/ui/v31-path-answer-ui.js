// V31: optional LIVE native path-driven answer, no fabricated content.
// Existing original V17 controls / Brain.writer are not replaced.
const $=id=>document.getElementById(id);
const run=$("v31PathRun");
if(run){
 run.addEventListener("click",async()=>{
  const answer=$("v31PathAnswer"),status=$("v31PathStatus"),evidence=$("v31PathEvidence");
  const maxTokens=Number($("v31PathTokens").value),
    maxNodes=Number($("v31PathNodes").value),
    maxDepth=Number($("v31PathDepth").value),
    minVerifiedContexts=Number($("v31PathCausal").value);
  const question=$("v31PathInput").value;
  if(!question||question.length>131072||![maxTokens,maxNodes,maxDepth].every(Number.isSafeInteger)||
    maxTokens<1||maxTokens>2048||maxNodes<2||maxNodes>20000||maxDepth<1||maxDepth>256||
    !Number.isSafeInteger(minVerifiedContexts)||minVerifiedContexts<0||minVerifiedContexts>32){
    status.textContent="EROARE: textul trebuie să fie prezent; maxTokens ≤2048, maxNodes ≤20000, maxDepth ≤256.";
    return;
  }
  run.disabled=true;status.textContent="Planificare pe memoria cognitivă reală…";
  answer.textContent="Nicio predicție încă";evidence.textContent="";
  try{
    const worker=Math.max(0,Math.trunc(Number($("v30AtlasWorker")?.value)||0));
    // Deliberately exclude the reference answer. It may be entered in Atlas
    // only AFTER this native frozen path has already been recorded.
    const res=await fetch("/path-answer",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({w:worker,question,maxTokens,maxNodes,maxDepth,minVerifiedContexts}),
      cache:"no-store"
    });
    if(!res.ok)throw Error("HTTP "+res.status);
    const data=await res.json();
    if(data.error)throw Error(data.error);
    status.textContent=data.found?
      "TRASEU CALCULAT · RĂSPUNS DIN FORMA SOLUȚIEI, NU DIN PREDICTORUL VECHI":
      "FĂRĂ TRASEU — NU FABRICĂM RĂSPUNSUL";
    answer.textContent=data.answer??"NU EXISTĂ RĂSPUNS EXECUTABIL PE GRAFUL ÎNVĂȚAT";
    evidence.textContent=JSON.stringify({
      method:data.originalMethod||data.source,
      causalWriter:data.actualWriter,
      frozen:data.frozen,trainingModified:data.trainingModified,
      referenceWasNotProvided:data.referenceWasNotProvided,
      nodesConsidered:data.nodesConsidered,candidateEdges:data.candidateEdges,
      requiredIndependentPhysicalContexts:minVerifiedContexts,
      path:data.path,diagnostics:data.diagnostics,
      missingReason:data.reason
    },null,2);
    $("v30AtlasReload")?.click();
  }catch(err){status.textContent="Eroare: "+String(err?.message||err);
    answer.textContent="NO PATH-DRIVEN ANSWER";}
  finally{run.disabled=false;}
 });
}
