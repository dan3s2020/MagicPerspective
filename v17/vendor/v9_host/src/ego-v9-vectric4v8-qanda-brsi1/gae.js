export function computeGAE(records, gamma=0.985, lambda=0.95) {
  const n=records.length;
  const advantages=new Float64Array(n), returns=new Float64Array(n);
  let nextAdv=0;
  for (let t=n-1;t>=0;t--) {
    const r=Number(records[t].reward)||0;
    const v=Number(records[t].value)||0;
    const terminal=Boolean(records[t].terminal);
    const nextV=terminal?0:(Number(records[t].nextValue)||0);
    const delta=r+gamma*nextV-v;
    const adv=delta+(terminal?0:gamma*lambda*nextAdv);
    advantages[t]=adv;
    returns[t]=adv+v;
    nextAdv=adv;
  }
  return {advantages,returns};
}

export function normalizeAdvantages(a) {
  if (!a.length) return Float64Array.from(a);
  let m=0; for (const v of a) m+=v; m/=a.length;
  let s=0; for (const v of a) { const d=v-m; s+=d*d; }
  const sd=Math.sqrt(s/a.length+1e-8);
  return Float64Array.from(a,v=>(v-m)/sd);
}
