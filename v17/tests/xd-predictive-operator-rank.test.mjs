// Exact reduction of the ORIGINAL V17 toroidal geometry's next-symbol ENERGY
// to a finite transition-score graph; no reinterpretation as semantic solution planning.
// For N observed symbols and D learned torus axes,
//   K[x,y] = Σ_i cos(2π(V_xi - U_yi))
//          = dot([cos V_x,sin V_x], [cos U_y,sin U_y]) in R^(2D).
// Hence rank(K) <= min(N, 2D), regardless of how large D becomes.
// The complete frozen first-order geometric scorer is an N×N weighted graph.
// This is an exact, finite functional reduction, NOT spontaneous physical collapse
// and NOT a replacement for the full original AligningGraph or its training memory.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";
const TWO_PI=2*Math.PI;
const original=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8");
const source=Array.from(original.replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000),c=>c.charCodeAt(0));
const trainEnd=35000,valEnd=41000;
const alphabet=[...new Set(source.slice(0,trainEnd))],N=alphabet.length;
const identities=new Map(alphabet.map((s,i)=>[s,i]));
const frequency=new Map(),bigrams=new Map();
for(let i=1;i<trainEnd;i++){
 const x=source[i-1],y=source[i];
 frequency.set(y,(frequency.get(y)||0)+1);
 const r=bigrams.get(x)||new Map();r.set(y,(r.get(y)||0)+1);bigrams.set(x,r);
}
const top=map=>[...map].sort((a,b)=>b[1]-a[1])[0]?.[0];
const uni=top(frequency),bigr=new Map([...bigrams].map(([x,m])=>[x,top(m)]));
const geometricScore=(v,u)=>u.reduce((s,q,i)=>s+Math.cos(TWO_PI*(v[i]-q)),0);
function rank(S,rel=1e-9){
 const M=S.map(row=>row.slice());const rows=M.length,cols=M[0]?.length||0;
 const peak=Math.max(...M.flat().map(Math.abs)),threshold=peak*rel;let r=0;
 for(let j=0;j<cols&&r<rows;j++){
   let pivot=r,best=Math.abs(M[r][j]);
   for(let i=r+1;i<rows;i++)if(Math.abs(M[i][j])>best){best=Math.abs(M[i][j]);pivot=i;}
   if(best<=threshold)continue;
   [M[r],M[pivot]]=[M[pivot],M[r]];
   for(let i=r+1;i<rows;i++){
     const frac=M[i][j]/M[r][j];M[i][j]=0;
     for(let k=j+1;k<cols;k++)M[i][k]-=frac*M[r][k];
   }
   r++;
 }
 return r;
}
function evaluation(K, start, end) {
 const best=K.map(row=>{
  let bi=0;for(let j=1;j<row.length;j++)if(row[j]>row[bi])bi=j;
  return alphabet[bi];
 });
 let right=0,valid=0,unigram=0,bigram=0;
 for(let i=start;i<end;i++){
   const x=source[i-1],y=source[i],j=identities.get(x);
   if(j===undefined||!identities.has(y))continue;
   valid++;right+=+(best[j]===y);unigram+=+(uni===y);bigram+=+((bigr.get(x)??uni)===y);
 }
 return {total:valid,geometry:right/valid,unigram:unigram/valid,bigram:bigram/valid};
}
test("up to 1024 genuine random-initialized native torus axes: xD→N-symbol exact scorer graph and rank saturation",()=>{
 assert.ok(N>70,"nontrivial real corpus with symbols, not a tiny toy alphabet");
 const rows=[],Ds=[2,5,16,32,64,128,256,512,1024];
 for(const D of Ds){
   const time0=performance.now();
   const g=new Geometry({D,lr:.03,neg:3,repel:.3,every:1e9,seed:17});
   for(let i=1;i<trainEnd;i++)g.learn(source[i-1],source[i]);
   const trainMs=performance.now()-time0;
   const K=alphabet.map(x=>alphabet.map(y=>geometricScore(g.V.get(x),g.U.get(y))));
   const r=rank(K),valid=evaluation(K,trainEnd,valEnd),held=evaluation(K,valEnd,source.length);
   let scoreError=0;
   for(let j=0;j<Math.min(20,N);j++){
     const from=alphabet[j],to=alphabet[(j*7+3)%N];
     scoreError=Math.max(scoreError,Math.abs(K[j][(j*7+3)%N]-
       geometricScore(g.V.get(from),g.U.get(to))));
   }
   assert.ok(r<=Math.min(N,2*D),JSON.stringify({D,r,N}));
   assert.equal(scoreError,0,"the compact weighted graph is built from the exact unchanged native scoring rule");
   const rawBytes=2*N*D*8,graphBytes=N*N*8;
   rows.push({dimension:D,symbols:N,operatorRank:r,maximumRank:Math.min(N,2*D),
      heldout:held.total,validationAccuracy:valid.geometry,testAccuracy:held.geometry,
      unigramAccuracy:held.unigram,bigramAccuracy:held.bigram,
      rawCoordinateBytes:rawBytes,frozenGraphBytes:graphBytes,
      memoryRatio:rawBytes/graphBytes,trainMs:Math.round(trainMs)});
 }
 assert.equal(rows.length,Ds.length);
 const high=rows.find(x=>x.dimension===1024);
 assert.ok(high.operatorRank<=N);
 assert.ok(high.memoryRatio>20);
 console.log("ACTUAL_XD_PREDICTIVE_OPERATOR_COLLAPSE",JSON.stringify(rows));
 console.log("XD_OPERATOR_NOTE",JSON.stringify({
   meaning:"Exact finite reduction of ONE frozen first-order geometric energy operator; not full model, text context or semantic solution",
   xDmax:1024,completeGraphStates:N,scoreMatrixEntries:N*N,
   noSpontaneousCollapseClaim:true,noQuantumClaim:true}));
});
