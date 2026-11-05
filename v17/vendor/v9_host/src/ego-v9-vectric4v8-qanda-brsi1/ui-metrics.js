export function formatIdentityAmbiguityPair(lastResult){
  const a=lastResult?.row?.A?.identityAmbiguity;
  const b=lastResult?.row?.B?.identityAmbiguity;
  const fmt=v=>Number.isFinite(Number(v))?Number(v).toFixed(3):"—";
  return fmt(a)+" / "+fmt(b);
}
