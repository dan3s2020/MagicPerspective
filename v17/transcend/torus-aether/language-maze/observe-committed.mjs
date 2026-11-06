/**
 * Commit boundary for actual completed training Q/A rows. The sampled
 * causal-text tools remain separate: this is called for EVERY row of a
 * confirmed GPU text batch or exactly once after each completed CPU row.
 * No held-out reference is accepted from inference/evaluation endpoints.
 */
export function observeCompletedTrainingRows(rows,languageMaze){
 if(!Array.isArray(rows)||typeof languageMaze?.learn!=="function")
   throw Error("Invalid completed training rows");
 let observed=0;
 for(const row of rows){
  if(typeof row?.prompt!=="string"||typeof row?.answer!=="string"||
     !row.prompt.trim()||!row.answer.trim())continue;
  const result=languageMaze.learn(row.prompt,row.answer);
  if(result?.learned)observed++;
 }
 return {observed,provided:rows.length};
}
