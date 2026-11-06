import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Geometry} from "../transcend/torus-aether/concepts.mjs";

// This suite tests the REAL periodic U/V Geometry.learn operator from V17.
// No invented tensor or path score, and no changes to the original generator.
const random = seed => () => {
  seed = (Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/4294967296;
};
const wrap = x => x-Math.round(x);
const dot = (a,b) => a.reduce((s,x,i)=>s+Math.cos(Math.PI*2*(x-b[i])),0);
const distance = (a,b) => Math.hypot(...a.map((v,i)=>wrap(v-b[i])));
const params={lr:.03,repel:.3,every:1000000000};
const corpus=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8")
 .replace(/[^\x20-\x7e\n\t]/g," ").slice(0,47000);
const text=Array.from(corpus,c=>c.charCodeAt(0));
const sample="abacabadabacaba cabcaacabac babbaabaab cab cab. \n".repeat(80);
const chars=Array.from(sample,c=>c.charCodeAt(0));

function lift(g,D,seed=1927) {
  const k=D-g.D;
  const h=new Geometry({...params,D,neg:g.neg});
  h.U=new Map([...g.U].map(([y,p])=>[y,p.concat(Array(k).fill(.271))]));
  h.V=new Map([...g.V].map(([y,p])=>[y,p.concat(Array(k).fill(.271))]));
  h.B=new Map([...g.B].map(([y,b])=>[y,b-k]));
  h.seen=g.seen.slice();h.n=g.n;h.r=random(seed);
  return h;
}
function learnCorpus(D,neg,seed=17,limit=35000) {
  const g=new Geometry({...params,D,neg,seed});
  for(let i=1;i<limit;i++)g.learn(text[i-1],text[i]);
  return g;
}
test("EXACT dimensional lift of learned 2D transformations into 3D and 5D: commute with Geometry.learn including noise",()=>{
  const reports=[];
  for(const neg of [0,3,8]){
    const two=new Geometry({...params,D:2,neg,seed:17});
    for(let i=1;i<1600;i++)two.learn(chars[i-1],chars[i]);
    two.r=random(1927);
    const three=lift(two,3),five=lift(two,5);
    let steps=0;
    for(let i=1600;i<3400;i++){
      const x=chars[i-1],y=chars[i];
      assert.ok(two.U.has(x)&&two.U.has(y),"No unseen new symbols: controlled lift of existing states");
      two.learn(x,y);three.learn(x,y);five.learn(x,y);steps++;
    }
    let error=0,extraDrift=0;
    for(const higher of [three,five])for(const [y,p] of two.U){
      for(let d=0;d<2;d++){
        error=Math.max(error,Math.abs(p[d]-higher.U.get(y)[d]),
          Math.abs(two.V.get(y)[d]-higher.V.get(y)[d]));
      }
      for(let d=2;d<higher.D;d++)extraDrift=Math.max(extraDrift,
        Math.abs(higher.U.get(y)[d]-.271),Math.abs(higher.V.get(y)[d]-.271));
      error=Math.max(error,Math.abs(two.B.get(y)-(higher.B.get(y)+(higher.D-2))));
    }
    assert.ok(error<2e-10,JSON.stringify({neg,error,extraDrift}));
    assert.ok(extraDrift<2e-10,"neutral added dimensions remain neutral");
    reports.push({noise:neg,steps,maxOldAxisError:error,extraAxisDrift:extraDrift});
  }
  console.log("EXACT_DIMENSIONAL_LIFT",JSON.stringify(reports));
});
test("gnoise drives stochastic MULTI-AXIS angular forces, not a single rigid spatial rotation",()=>{
  const base=new Geometry({...params,D:5,neg:0,seed:91});
  for(let i=1;i<1100;i++)base.learn(chars[i-1],chars[i]);
  const clone=neg=>{
    const g=new Geometry({...params,D:5,neg,seed:91});
    g.U=new Map([...base.U].map(([c,p])=>[c,p.slice()]));
    g.V=new Map([...base.V].map(([c,p])=>[c,p.slice()]));
    g.B=new Map(base.B);g.seen=base.seen.slice();g.n=base.n;g.r=random(13);
    return g;
  };
  const silent=clone(0),noisy=clone(8),before=new Map([...base.U].map(([k,v])=>[k,v.slice()]));
  for(let i=1100;i<1300;i++){silent.learn(chars[i-1],chars[i]);noisy.learn(chars[i-1],chars[i]);}
  const symbols=[...base.U.keys()];
  let dimensionsChanged=0;
  for(let d=0;d<5;d++)if(symbols.some(y=>Math.abs(wrap(silent.U.get(y)[d]-noisy.U.get(y)[d]))>1e-7))dimensionsChanged++;
  let pairError=0;
  for(let i=0;i<symbols.length;i++)for(let j=i+1;j<symbols.length;j++){
    const a=symbols[i],b=symbols[j];
    pairError=Math.max(pairError,Math.abs(distance(noisy.U.get(a),noisy.U.get(b))-
      distance(before.get(a),before.get(b))));
  }
  assert.ok(dimensionsChanged>=2,"noise influences multiple toroidal axes, not one prescribed axis");
  assert.ok(pairError>1e-5,"a single rigid rotation would conserve all pairwise distances");
  console.log("NOISE_ANGLE_VS_RIGID_ROTATION",
    JSON.stringify({changedAxes:dimensionsChanged,rigidIsometryDeviation:pairError}));
});
test("held-out REAL V(x)->U(y) geometric transitions beat shuffled geometry, with D=2/3/5 comparisons",()=>{
  assert.ok(text.length>45000,"Need separate genuinely held-out text");
  const training=35000;
  const all=[];
  for(const D of [2,3,5])for(const neg of [0,3,8]){
    const g=learnCorpus(D,neg);
    const letters=[...g.U.keys()],permuted=letters.map(x=>g.U.get(x).slice());
    const rand=random(1164);
    for(let i=permuted.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[permuted[i],permuted[j]]=[permuted[j],permuted[i]];}
    const shuffled=new Map(letters.map((c,i)=>[c,permuted[i]]));
    let measured=0,actualScore=0,shuffledScore=0,top=0,shuffledTop=0;
    for(let i=training;i<text.length;i++){
      const x=text[i-1],y=text[i],v=g.V.get(x);
      if(!v||!g.U.has(y))continue;
      measured++;actualScore+=dot(v,g.U.get(y));shuffledScore+=dot(v,shuffled.get(y));
      let best=-Infinity,bestY=-1,bestNull=-Infinity,bestNullY=-1;
      for(const candidate of letters){
        const s=dot(v,g.U.get(candidate)),sn=dot(v,shuffled.get(candidate));
        if(s>best){best=s;bestY=candidate;}
        if(sn>bestNull){bestNull=sn;bestNullY=candidate;}
      }
      top+=(bestY===y);shuffledTop+=(bestNullY===y);
    }
    const r={dimensions:D,gnoise:neg,heldOut:measured,meanLearnedScore:actualScore/measured,
      meanShuffledScore:shuffledScore/measured,learnedTop1:top/measured,shuffleTop1:shuffledTop/measured};
    all.push(r);
  }
  const f=all.find(x=>x.dimensions===5&&x.gnoise===3);
  assert.ok(f.learnedTop1>f.shuffleTop1+.03,JSON.stringify(f));
  assert.ok(f.meanLearnedScore>f.meanShuffledScore+.5,JSON.stringify(f));
  console.log("REAL_GEOMETRY_HELDOUT",JSON.stringify(all));
});
