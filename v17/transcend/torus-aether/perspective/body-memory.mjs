// A learned action-to-body displacement memory from actually OBSERVED V17 maze transitions.
// No maze generator secrets, shortest paths, target values, or evaluator positions are inputs.
// Kept in a separate, versioned sidecar so native Brain/.v8 checkpoints stay byte-compatible.
export class BodyPerspectiveMemory {
  constructor() {
    this.version=1;this.actions=Array.from({length:8},()=>new Map());
    this.observed=0;this.moves=0;this.blocked=0;this.skipped=0;
  }
  observe({domain,before,after,action,context},selfKind){
    if(domain!=='maze')return false;
    const o=Number(String(action).replace(/^output:/,'')),m=String(context||'').match(/^grid:(\d+)$/);
    const n=m?+m[1]:0;
    if(!Number.isInteger(o)||o<0||o>=8||n<3||!Array.isArray(before)||!Array.isArray(after)||before.length!==n*n||after.length!==n*n||!Number.isInteger(selfKind)||selfKind<0){
      this.skipped++;return false;
    }
    const i=before.indexOf(selfKind),j=after.indexOf(selfKind);
    if(i<0||j<0||before.lastIndexOf(selfKind)!==i||after.lastIndexOf(selfKind)!==j){this.skipped++;return false;}
    const dx=(j%n)-(i%n),dy=Math.floor(j/n)-Math.floor(i/n);
    if(Math.abs(dx)+Math.abs(dy)>1){this.skipped++;return false;}
    // Blocked actions are counted as outcomes, but NOT a false "this output means stand still" motor mapping.
    this.observed++;
    if(!dx&&!dy){this.blocked++;return true;}
    const key=dx+','+dy,slot=this.actions[o];slot.set(key,(slot.get(key)||0)+1);this.moves++;return true;
  }
  effect(o,{minimum=2,confidence=.65}={}){
    const counts=this.actions[o];if(!counts)return null;
    let total=0,best=null,hits=0;
    for(const [key,n]of counts){total+=n;if(n>hits){hits=n;best=key;}}
    return total>=minimum&&hits/total>=confidence?best.split(',').map(Number):null;
  }
  summary(){
    const actions=this.actions.map((slot,o)=>({output:o,samples:[...slot.values()].reduce((a,b)=>a+b,0),
      delta:this.effect(o),outcomes:[...slot.entries()].map(([delta,count])=>({delta,count}))}));
    return {version:this.version,observed:this.observed,moves:this.moves,blocked:this.blocked,skipped:this.skipped,
      known:actions.filter(a=>a.delta).length,actions};
  }
  export(){return {version:1,observed:this.observed,moves:this.moves,blocked:this.blocked,skipped:this.skipped,
    actions:this.actions.map(m=>[...m.entries()])};}
  static restore(s){
    if(!s||s.version!==1||!Array.isArray(s.actions)||s.actions.length!==8)throw Error('Invalid BodyPerspectiveMemory sidecar');
    const x=new BodyPerspectiveMemory();
    for(const field of ['observed','moves','blocked','skipped'])x[field]=Number.isSafeInteger(s[field])&&s[field]>=0?s[field]:0;
    x.actions=s.actions.map(row=>{const m=new Map();if(!Array.isArray(row))throw Error('Invalid action row');
      for(const [key,n]of row){if(!/^[-01],[-01]$/.test(key)||!Number.isSafeInteger(n)||n<1)throw Error('Invalid displacement evidence');m.set(key,n);}
      return m;});
    return x;
  }
}
