// A GPU settings update must not discard the loaded Python TextCard index.
// This is PURE classification, with no subprocess or checkpoint mutation.
export function classifyGpuUpdate(previous, next) {
  const a=previous?.device||"off", b=next?.device||"off";
  if(a!==b)return "restart"; // different device: old tensors cannot be reused
  if(b==="off")return "reuse";
  if(Number(previous?.util??100)!==Number(next?.util??100) ||
     Number(previous?.vram??0)!==Number(next?.vram??0))
     return "configure"; // same device; Python Server.init retains TextCard and shared model
  return "reuse"; // worlds/textBatch belong to the Node worker; no Python restart or setup RPC
}
