// Weight-only donor-coordinate navigation for a VISIBLE target.
// Never executes Qwen, fabricates a Qwen prediction, or changes the original Brain.
// The atlas remains frozen. A candidate is accepted ONLY when the actual
// donor-vector readout returns the requested target token after physical motion.
const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
export class WeightedAtlasProjector{
  constructor(rows,axes,{rankTolerance=1e-8}={}){
    this.rows=rows;this.axes=axes;this.dim=rows[0].length;
    this.selected=[];this.orthonormal=[];this.R=[];
    const available=axes.map((_,i)=>i);
    for(let k=0;k<this.dim;k++){
      let best=-1,bestNorm=rankTolerance*rankTolerance;
      for(let t=0;t<available.length;t++){
        const axis=axes[available[t]],v=axis.slice();
        for(let i=0;i<k;i++){
          const p=dot(v,this.orthonormal[i]);
          for(let j=0;j<this.dim;j++)v[j]-=p*this.orthonormal[i][j];
        }
        const n=dot(v,v);
        if(n>bestNorm){bestNorm=n;best=t;}
      }
      if(best<0)break;
      const index=available.splice(best,1)[0],v=axes[index].slice();
      for(let i=0;i<k;i++){
        const p=dot(v,this.orthonormal[i]);this.R[i][k]=p;
        for(let j=0;j<this.dim;j++)v[j]-=p*this.orthonormal[i][j];
      }
      for(let i=0;i<k;i++){
        const p=dot(v,this.orthonormal[i]);this.R[i][k]+=p;
        for(let j=0;j<this.dim;j++)v[j]-=p*this.orthonormal[i][j];
      }
      const norm=Math.sqrt(dot(v,v));if(norm<=rankTolerance)break;
      this.selected.push(index);this.R[k]=[];this.R[k][k]=norm;
      this.orthonormal.push(v.map(x=>x/norm));
    }
    this.rank=this.selected.length;this.ready=this.rank===this.dim;
    this.positions=[];this.cache=new Map();
    this.cacheHits=0;this.cacheMisses=0;this.verifiedMoves=0;this.rejectedMoves=0;
    if(this.ready)for(const row of rows){
      const q=this.orthonormal.map(b=>dot(b,row)),x=new Float64Array(this.dim);
      for(let i=this.dim-1;i>=0;i--){
        let value=q[i];for(let j=i+1;j<this.dim;j++)value-=this.R[i][j]*x[j];
        x[i]=value/this.R[i][i];
      }
      this.positions.push(x);
    }
  }
  move(from,to){
    if(from===to)return {from,to,coefficientPairs:[],exact:true,zeroAction:true};
    if(!this.ready)return null;
    const key=from*this.rows.length+to;
    if(this.cache.has(key)){this.cacheHits++;return this.cache.get(key);}
    this.cacheMisses++;
    const src=this.rows[from].slice(),a=this.positions[from],b=this.positions[to];
    const pairs=[];
    for(let i=0;i<this.dim;i++){
      const c=b[i]-a[i];if(Math.abs(c)<1e-14)continue;
      const axis=this.axes[this.selected[i]];
      for(let j=0;j<this.dim;j++)src[j]+=c*axis[j];
      pairs.push([this.selected[i],c]);
    }
    // Verify the REAL decoder readout from the actually moved donor state.
    // No target index is ever directly written as a generated output.
    const norm=Math.hypot(...src);let actual=-1,score=-Infinity;
    if(norm>1e-14)for(let i=0;i<this.rows.length;i++){
      const similarity=dot(src,this.rows[i])/norm;
      if(similarity>score){score=similarity;actual=i;}
    }
    const result=actual===to?{from,to,coefficientPairs:pairs,exact:true,
      zeroAction:false,readout:actual,cosine:score}:null;
    if(result)this.verifiedMoves++;else this.rejectedMoves++;
    this.cache.set(key,result);
    return result;
  }
}
