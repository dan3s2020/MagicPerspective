// V8 organism: one brain that lives on grids (relief, mazes, braided mazes — V7's self-discovered specialists)
// and on abstract networks (the network organ + the dance). Its body tells it whether it walks cells or nodes;
// which KIND of grid it is in, it still discovers by itself.
import {Organism,Organism7} from './organ.mjs';
import {NetOrgan} from './netorgan.mjs';
export class Organism8{
  constructor(seed=17){this.seed=seed;this.kind='v8';this.grid=new Organism7(seed);this.net=new NetOrgan(seed);this.episodes=0;}
  get samples(){return this.grid.samples+this.net.samples;}
  snapshot(){return {schema:8,seed:this.seed,episodes:this.episodes,grid:this.grid.snapshot(),net:this.net.snapshot()};}
  static restore(s){if(!s||s.schema!==8)throw Error('Incompatible V8 checkpoint');const o=new Organism8(s.seed);o.grid=Organism7.restore(s.grid);o.net=NetOrgan.restore(s.net);o.episodes=s.episodes||0;return o;}
}
export function restoreAny(s){if(s?.schema===8)return Organism8.restore(s);if(s?.schema===7)return Organism7.restore(s);if(s?.schema===6)return Organism.restore(s);throw Error('Unknown brain schema');}
export const freshLike=b=>b.kind==='v8'?new Organism8(b.seed):b.kind==='v7'?new Organism7(b.seed):new Organism(b.seed);
export const gridPart=b=>b.kind==='v8'?b.grid:b;
export const netPart=b=>b.kind==='v8'?b.net:null;
