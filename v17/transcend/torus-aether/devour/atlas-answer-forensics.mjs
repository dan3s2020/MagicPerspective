// Strictly POST-HOC diagnostic: called ONLY AFTER native frozen evaluation produced
// its complete answer, never during training, planning or generation.
// The legacy char writer is NOT the native Discoverer hypermaze path.
const latin1=bytes=>Buffer.from(bytes).toString('latin1');
export function answerForensics(result,sourceExercises,{worker=null}={}){
 if(result?.heldoutAnswerComplete!==true||result?.strictFullAnswer!==true||
    !Array.isArray(result.exercises)||!Array.isArray(sourceExercises))
  throw Error('Only genuine complete frozen heldout answers may enter posthoc atlas diagnostics');
 const sorted=sourceExercises.slice().sort((a,b)=>a.length-b.length);
 if(sorted.length!==result.exercises.length)throw Error('Heldout answers do not align with evaluation rows');
 return result.exercises.map((row,index)=>{
  const input=sorted[index];
  if(!Array.isArray(input)||!Number.isSafeInteger(row.a0)||row.a0<0||row.a0>input.length)
   return {type:'answer-evaluation',worker,index,frozen:true,scorable:false,
     source:'original-AligningGraph-write',causallyDrivenByDiscovererPath:false,
     failureReason:'NO_VALID_ANSWER_BOUNDARY_OR_UNALIGNED_EXERCISE',
     originalLength:input?.length??null,expectedAnswer:null,predictedAnswer:row.shape??null};
  const question=latin1(input.slice(0,row.a0));
  // Only consulted *after* the original worker has already generated r.shape.
  const expected=latin1(input.slice(row.a0)).trimEnd();
  const predicted=typeof row.shape==='string'?row.shape.trimEnd():null;
  const a=Array.from(predicted??''),b=Array.from(expected),total=Math.max(a.length,b.length);
  const differences=[];let right=0;
  for(let i=0;i<total;i++){
   const x=a[i]??null,y=b[i]??null;
   if(x===y)right++;else differences.push({index:i,predicted:x,expected:y,
     kind:x===null?'MISSING_OUTPUT_CHARACTER':y===null?'EXTRA_OUTPUT_CHARACTER':'SUBSTITUTION'});
  }
  const exact=predicted===expected;
  return {type:'answer-evaluation',worker,index,frozen:true,scorable:predicted!==null,
   source:'original-AligningGraph-write',causallyDrivenByDiscovererPath:false,
   discoveredHypermazeShapeUsedToGenerateCharacters:false,
   blockedByDesign:'NO_CAUSAL_BRIDGE_BETWEEN_DISCOVERER_PATH_AND_LEGACY_ALIGNING_GRAPH_WRITE',
   originalLength:input.length,questionPrefix:question,
   expectedAnswer:expected,predictedAnswer:predicted,answerExact:exact,
   nativeWorkerReportedExact:row.firstAnswerExact,
   scoringConsistent:row.firstAnswerExact===exact,
   firstMismatch: differences.length?differences[0].index:null,
   correctCharacters:right,comparedCharacters:total,
   predictedCharacterCount:a.length,expectedCharacterCount:b.length,
   differences,
   answerBoundaryFound:true,
   unsupportedAttribution:'A wrong character cannot be causally assigned to a Discoverer route when the writer does not use that route.'
  };
 });
}
