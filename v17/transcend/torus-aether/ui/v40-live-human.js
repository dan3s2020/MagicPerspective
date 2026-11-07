// Optional original-native V17 live V40 path-answer UI.
// Every displayed item comes from POST /v40/answer on the actual worker or
// saved original Brain. No hidden reference answer sent to this service.
const $=id=>document.getElementById(id);
const run=$('v40LiveAsk');
if(run){
 const mode=$('v40LiveMode'),question=$('v40LiveQuestion'),source=$('v40LiveSource'),
   status=$('v40LiveStatus'),answer=$('v40LiveAnswer'),details=$('v40LiveEvidence');
 mode.onchange=()=>{
  if(mode.value==='instruction-goal'){
   question.value='Brew the refreshment';source.value='Ada keeps tea.';
  }else{
   question.value='Which city hosted the meeting?';
   source.value='The meeting was hosted in Rome yesterday.';
  }
  answer.textContent='Nu a fost făcută încă o predicție.';
  details.textContent='Aștept memorie reală în Brain.';
 };
 run.onclick=async()=>{
  const w=Number($('v40LiveWorker').value);
  if(!Number.isSafeInteger(w)||w<0||w>10000||
     question.value.length<1||question.value.length>4096||
     source.value.length<1||source.value.length>65536){
   status.textContent='EROARE: selectează un worker valid, o întrebare și pasajul complet în limitele explicite.';
   return;
  }
  run.disabled=true;
  status.textContent='Cerere către originalul V17 Brain, fără răspuns de referință…';
  answer.textContent='Fără răspuns încă';details.textContent='';
  try{
   const type=mode.value;
   if(!['human-extractive','instruction-goal'].includes(type))
    throw Error('Mod necunoscut');
   const payload=type==='human-extractive'?
      {kind:type,question:question.value,context:source.value,includeAtlas:true}:
      {kind:type,instruction:question.value,source:source.value,allowComposedInstructions:false,maxTokens:96};
   const resp=await fetch('/v40/answer?w='+w,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(payload),cache:'no-store'
   });
   if(!resp.ok)throw Error('HTTP '+resp.status);
   const data=await resp.json();
   if(data.error)throw Error(data.error);
   const found=!!data.found;
   status.textContent=found?
     'CALE PREZISĂ DIN ORIGINALUL BRAIN · '+(data.originalMotor||data.source||'')+
       (data.originalSavedBrain?' · checkpoint salvat':' · worker viu'):
     'NU EXISTĂ CALE CONFIRMATĂ: '+(data.reason||'lipsesc dovezile');
   answer.textContent=found?(data.predicted??data.answer??'Nu a fost produs un răspuns.'):
     'Abținere: nu fabric un răspuns lipsă.';
   details.textContent=JSON.stringify({
    type:payload.kind,found,original:!!data.originalSharedBrain,
    method:data.originalMotor||data.source,
    explanation:data.goalInferredBy||data.evidence||null,
    observedSource:!!data.completeObservedTextContext,
    fullCandidateGraph:data.atlas||data.fullAtlas||null,
    shapePath:data.initialShape||data.path||[],
    stats:data.graph||data.diagnostics||null,
    trainingEvidenceCount:data.learnedTrainingPairs,
    refusalReason:data.reason||null,
    noReferenceAnswerInRequest:true
   },null,2);
  }catch(err){status.textContent='EROARE ORIGINAL BRAIN: '+String(err?.message||err);
   answer.textContent='Fără răspuns produs';}
  finally{run.disabled=false;}
 };
}
