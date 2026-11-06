// Diagnostic only: measures repeated contiguous windows in actual model outputs.
// This is not a quantum-frequency detector or a measure of language correctness.
export function repeatedWindowFraction(text,window=24) {
  const s=String(text),n=Math.floor(window);
  if(!Number.isInteger(n)||n<2||n>1024)throw Error('Invalid repetition window');
  const total=Math.max(0,s.length-n+1);
  if(!total)return 0;
  const counts=new Map();let repeated=0;
  for(let i=0;i<total;i++){
    const key=s.slice(i,i+n);
    if(counts.has(key))repeated++;
    counts.set(key,(counts.get(key)||0)+1);
  }
  return repeated/total;
}
