export function createModuleAdapter({id,moduleId,hostVersions,hooks={}}){
  if(!id||!moduleId)throw new Error("adapter id and moduleId required");
  if(!Array.isArray(hostVersions)||!hostVersions.length)throw new Error("adapter hostVersions required");
  return Object.freeze({id:String(id),moduleId:String(moduleId),hostVersions:Object.freeze(hostVersions.map(String)),hooks:Object.freeze({...hooks})});
}
