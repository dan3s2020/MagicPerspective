import { DEFAULT_SWARM_SIZE, globalActionDt } from "./config.js";

export class EgoScheduler {
  constructor({stepsPerEgoTurn=1, egoDecisionHz=30, swarmSize=DEFAULT_SWARM_SIZE}={}) {
    this.stepsPerEgoTurn=Math.max(1,Math.floor(stepsPerEgoTurn));
    this.egoDecisionHz=Math.max(0.001,Number(egoDecisionHz)||30);
    this.swarmSize=Math.max(1,Math.floor(Number(swarmSize)||DEFAULT_SWARM_SIZE));
    this.reset();
  }
  reset() { this.cycle=0; this.orderPos=0; this.stepInTurn=0; this.decisions=0; }
  orderAt(pos=this.orderPos) { return (this.cycle + pos) % this.swarmSize; }
  currentEgo() { return this.orderAt(); }
  dt() { return globalActionDt(this.egoDecisionHz,this.swarmSize); }
  advance() {
    this.decisions++;
    this.stepInTurn++;
    if (this.stepInTurn >= this.stepsPerEgoTurn) {
      this.stepInTurn=0;
      this.orderPos++;
      if (this.orderPos>=this.swarmSize) { this.orderPos=0; this.cycle++; }
    }
  }
  snapshot() {
    return {cycle:this.cycle,orderPos:this.orderPos,stepInTurn:this.stepInTurn,decisions:this.decisions,currentEgo:this.currentEgo(),swarmSize:this.swarmSize,dt:this.dt()};
  }
}
