// ADDITIVE V42 GAME WORLD. Installs beside ORIGINAL, unmodified Brain and Discoverer.
// The input+output are immutable labyrinth constraints. The donor brain is the
// only movable character; every physical move is a donor-vector transformation.
// The ORIGINAL Discoverer.shapeGraph predicts the path before any move occurs.
// No parallel GRU, no learned replacement output head, no donor inference.
import fs from 'node:fs';
import path from 'node:path';
import {writeV43Telemetry} from './v43-telemetry.mjs';
import {Discoverer, KIND} from '../worlds/exercise.mjs';

const norm=v=>{const a=Math.hypot(...v);return a>1e-12?v.map(x=>x/a):v.map(()=>0)};
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const copyRows=(rows,dim,label)=>{
  if(!Array.isArray(rows)||rows.length<4||rows.length>256)
    throw Error(label+' must contain 4..256 genuine fixed donor rows');
  return rows.map(row=>{
    if(!Array.isArray(row)||row.length!==dim||row.some(x=>!Number.isFinite(x)))
      throw Error('Invalid '+label+' coordinate');
    return Object.freeze(norm(row));
  });
};
const frozen=(a)=>Object.freeze(a);

export class BrainCharacterWorld {
  constructor({brain,donor,saveFile=null,maxOutputBytes=0,maxActionsPerByte=16}={}){
    if(!brain||typeof brain.live!=='function'||!brain.chain||!brain.e)
      throw Error('The ORIGINAL V42 Brain instance is required');
    if(!donor||donor.format!=='braivour/v42-brain-character/v1')
      throw Error('Genuine donor-coordinate world object required');
    const dim=Number(donor.dimensions);
    if(!Number.isInteger(dim)||dim<2||dim>256)
      throw Error('Invalid donor dimension');
    this.inputRows=frozen(copyRows(donor.input_rows,dim,'input_rows'));
    this.outputRows=frozen(copyRows(donor.output_rows,dim,'output_rows'));
    if(this.inputRows.length!==this.outputRows.length)
      throw Error('Donor input/output token atlas sizes disagree');
    this.axes=frozen(copyRows(donor.movement_axes,dim,'movement_axes'));
    this.gain=Number(donor.move_gain||1.4);
    if(!Number.isFinite(this.gain)||this.gain<.05||this.gain>5)
      throw Error('Invalid physical movement gain');
    this.brain=brain;
    this.saveFile=saveFile;
    this.maxOutputBytes=maxOutputBytes;
    this.maxActionsPerByte=maxActionsPerByte;
    this.neighbors=[];
    this.transitions=[];
    // Same normalized frozen-donor coordinate readout, precomputed dot
    // products. Normalization of (src + sign*gain*axis) is a positive common
    // scalar across candidate output rows, so argmax is exactly preserved.
    // Work: O((N*N + A*N)*D + N*A*N), not O(N*A*N*D).
    const rowDots=this.outputRows.map(src=>this.outputRows.map(dst=>dot(src,dst)));
    const axisDots=this.axes.map(axis=>this.outputRows.map(dst=>dot(axis,dst)));
    for(let from=0;from<this.outputRows.length;from++){
      const edges=[],next=[];
      for(let k=0;k<this.axes.length;k++)for(const sign of [-1,1]){
        let dst=0,best=-Infinity,runnerUp=-Infinity;
        for(let j=0;j<this.outputRows.length;j++){
          const value=rowDots[from][j]+sign*this.gain*axisDots[k][j];
          if(value>best){runnerUp=best;best=value;dst=j;}
          else if(value>runnerUp)runnerUp=value;
        }
        // Preserve exact legacy floating point tie-breaking on near-equal
        // actual GGUF coordinates; use the byte-original slow computation
        // only for numerically ambiguous edges.
        if(best-runnerUp<1e-9){
          const src=this.outputRows[from];
          dst=this._closest(norm(src.map((x,i)=>x+sign*this.gain*this.axes[k][i])));
        }
        // Every edge is the SAME donor physical transformation readout.
        if(dst===from)continue;
        const action={axis:k,sign,gain:this.gain};
        edges.push({to:dst,action});
        next.push({to:dst,action});
      }
      this.neighbors.push(edges);
      this.transitions.push(next);
    }
    this.neighbors=frozen(this.neighbors.map(frozen));
    this.transitions=frozen(this.transitions.map(frozen));
    // Reverse edges belong to the identical immutable donor graph. Each
    // visible target requires one attraction-wave coverage calculation.
    this.reverse=Array.from({length:this.outputRows.length},()=>[]);
    for(let from=0;from<this.neighbors.length;from++)
      for(const e of this.neighbors[from])this.reverse[e.to].push(from);
    this.goalDistances=new Map();
    this.waveVerified=new Set();
    this.waveRejected=new Set();
    this.waveCalls=0;
    this.waveOriginalCalls=0;
    this.waveFastCalls=0;
    this.waveParityFailures=0;
    this.totalEdges=this.neighbors.reduce((n,e)=>n+e.length,0);
    if(this.totalEdges<1)throw Error('Frozen donor axes cause no observable character movement');
    // All learning belongs to the SAME original serializable Brain.
    brain.brainCharacterWorld ||= {version:1,worlds:0,planned:0,
      executed:0,matched:0,bytesVisited:0,bytesTotal:0,actions:0,
      predictedBeforeMoving:0,attempts:0,last:[],noGoldAtInference:false};
    if(!brain.disc)brain.disc=Object.assign(new Discoverer(brain.seed),{body:brain.body||=( {})});
  }

  _closest(vec){
    let best=0,value=-Infinity;
    for(let i=0;i<this.outputRows.length;i++){
      const sim=dot(vec,this.outputRows[i]);
      if(sim>value){value=sim;best=i;}
    }
    return best;
  }

  _start(input){
    const bytes=Buffer.from(String(input),'utf8');
    if(!bytes.length)throw Error('Fixed input cannot be empty');
    const dim=this.inputRows[0].length,mean=Array(dim).fill(0);
    for(const b of bytes){const row=this.inputRows[b%this.inputRows.length];
      for(let i=0;i<dim;i++)mean[i]+=row[i];}
    return this._closest(norm(mean));
  }

  _originalNativeShape(start,target){
    this.waveOriginalCalls++;
    const kinds=Array(this.outputRows.length).fill(KIND.floor);
    kinds[start]=KIND.self;
    if(target!==start)kinds[target]=KIND.target;
    const prediction=this.brain.disc.shapeGraph(kinds,this.neighbors,start,{details:true});
    if(!prediction?.targetReached)return null;
    const route=prediction.path.slice(0,this.maxActionsPerByte);
    return {route,complete:prediction.path.length<=this.maxActionsPerByte,
      firstPredictionBeforeAction:prediction.firstPredictionBeforeAction,
      sharedOriginalAlgorithm:prediction.sharedOriginalAlgorithm,
      visitedStates:prediction.path.map(p=>p.to)};
  }

  _uniformAttractionWave(start,target){
    // Optimization of the EXACT ORIGINAL shapeGraph under the one-visible-goal,
    // homogeneous-floor case. The original recurrence is V=0.97*c*max(next).
    // Consequently V is monotone in reverse shortest-hop distance. One
    // reverse wave per visible target gives the same steepest-ascent route,
    // including original donor edge ordering. Other kinds/laws use ORIGINAL.
    const disc=this.brain.disc,N=this.neighbors.length;
    if(!Number.isInteger(start)||!Number.isInteger(target)||start<0||target<0||
      start>=N||target>=N)return undefined;
    if(target===start)return null; // No other attractive target in this world.
    if(!(disc.attract(KIND.target)>.2)||
       disc.attract(KIND.floor)>.2||
       disc.conduct(KIND.floor)<.5)return undefined;
    let distance=this.goalDistances.get(target);
    if(!distance){
      distance=new Int16Array(N);distance.fill(-1);
      distance[target]=0;
      const queue=[target];
      for(let head=0;head<queue.length;head++){
        const u=queue[head];
        for(const v of this.reverse[u])if(distance[v]<0){
          distance[v]=distance[u]+1;queue.push(v);
        }
      }
      this.goalDistances.set(target,distance);
    }
    if(distance[start]<0)return null;
    if(distance[start]>this.maxActionsPerByte)return undefined;
    const route=[],visitedStates=[];
    let node=start;
    while(node!==target){
      const step=this.neighbors[node].find(e=>distance[e.to]===distance[node]-1);
      if(!step)return undefined;
      route.push({from:node,to:step.to,action:step.action,value:0});
      visitedStates.push(step.to);
      node=step.to;
    }
    return {route,complete:true,firstPredictionBeforeAction:true,
      sharedOriginalAlgorithm:true,visitedStates};
  }

  _nativeShape(start,target){
    this.waveCalls++;
    const fast=this._uniformAttractionWave(start,target);
    if(fast===undefined||this.waveRejected.has(target))
      return this._originalNativeShape(start,target);
    // Verify against the UNCHANGED original Discoverer.shapeGraph once per
    // target and periodically when the native learner's statistics evolve.
    const check=!this.waveVerified.has(target)||this.waveCalls%2048===0;
    if(check){
      const original=this._originalNativeShape(start,target);
      const edges=r=>r?JSON.stringify({
        complete:r.complete,steps:r.route.map(x=>[x.from,x.to,x.action?.axis,x.action?.sign])
      }):"null";
      if(edges(fast)!==edges(original)){
        this.waveParityFailures++;this.waveRejected.add(target);
        return original; // Never silently change a real V42 goal trajectory.
      }
      this.waveVerified.add(target);
      return original;
    }
    this.waveFastCalls++;
    return fast;
  }

  _nativeExplore(state){
    const possible=this.transitions[state];
    if(!possible.length)return null;
    // ORIGINAL organism's Discoverer owns the exploratory RNG. The environment
    // cannot invent moves outside the donor-defined physical action set.
    return possible[this.brain.disc.r.int(possible.length)];
  }

  _planEntireExercise(input,expected){
    const instructions=[];
    let simulated=this._start(input);
    // Plan the FULL configured target coverage before executing any action.
    for(const wanted of expected){
      const from=simulated;
      const planned=this._nativeShape(from,wanted);
      const route=planned?.complete?planned.route.map(edge=>edge.action):[];
      if(!route.length&&wanted!==from){
        const exploratory=this._nativeExplore(from);
        if(exploratory)route.push(exploratory.action);
      }
      const steps=[];
      for(const action of route){
        const original=this.transitions[simulated].find(e=>e.action.axis===action.axis&&
          e.action.sign===action.sign);
        if(!original)throw Error('Predicted movement is not in frozen donor action space');
        steps.push({from:simulated,to:original.to,action});
        simulated=original.to;
      }
      // The target is VISIBLE. If already at goal, the correct pre-action
      // solution shape is the empty path (zero physical actions).
      const zeroActionGoal=(wanted===from);
      instructions.push({from,wanted,planned:zeroActionGoal||!!planned?.complete,
        predicted_before_move:zeroActionGoal||planned?.firstPredictionBeforeAction===true,
        steps,expectedFinal:simulated});
      // Read-only progress callback; no donor, original planner or Brain mutation.
      if(typeof this.onPlanProgress==='function' &&
        (instructions.length===1 || instructions.length%128===0 || instructions.length===expected.length))
        this.onPlanProgress(instructions.length,expected.length,instructions);
    }
    return instructions;
  }

  exercise(input,output,{record=true}={}){
    if(typeof input!=='string'||typeof output!=='string'||!input.length||!output.length)
      throw Error('Original fixed input and target output must be nonempty');
    const inputBefore=input,outputBefore=output;
    const gold=Buffer.from(output,'utf8');
    const limit=this.maxOutputBytes>0?Math.min(gold.length,this.maxOutputBytes):gold.length;
    const target=gold.subarray(0,limit);
    const predictions=this._planEntireExercise(input,target);
    // Until this point the player has not moved and original Brain.live() has
    // seen no character-game action. The plan is completely predicted.
    let state=this._start(input),successful=0,actions=0,planned=0,firstPredictions=0;
    const produced=[],trace=[];
    if(record)this.brain.beginExercise();
    for(const prediction of predictions){
      if(state!==prediction.from)
        throw Error('Native donor world plan simulation diverged before execution');
      if(prediction.planned)planned++;
      if(prediction.predicted_before_move)firstPredictions++;
      for(const step of prediction.steps){
        // Never assign output from the gold target: ONLY the actual donor
        // coordinate transformation and its frozen readout may move the player.
        const actual=this.transitions[state].find(e=>e.action.axis===step.action.axis&&
          e.action.sign===step.action.sign);
        if(!actual)throw Error('Attempted action outside the absorbed brain');
        state=actual.to;actions++;
        if(state!==step.to)throw Error('Physical outcome differs from predicted donor action');
        if(record){
          this.brain.live((step.action.axis*2+(step.action.sign>0?1:0))%256);
          this.brain.live(state);
        }
      }
      produced.push(state);
      successful+=Number(state===prediction.wanted);
      if(trace.length<32)trace.push({goalByte:prediction.wanted,actualByte:state,
        from:prediction.from,planned:prediction.planned,actions:prediction.steps.length,
        firstPredictionBeforeAction:prediction.predicted_before_move,
        path:prediction.steps.slice(0,16)});
      if(record){
        // The original Disc receives REAL movement outcome, not a synthetic
        // guaranteed target transition. Its existing trust law remains native.
        if(state===prediction.wanted){
          this.brain.disc.lastEntered=KIND.target;
          this.brain.disc.enter[KIND.target]++;
        }else{
          this.brain.disc.lastEntered=KIND.floor;
          this.brain.disc.enter[KIND.floor]++;
        }
        this.brain.disc.endEpisode(state===prediction.wanted,
          prediction.planned?{plan:1,explore:0}:{plan:0,explore:1});
      }
    }
    if(input!==inputBefore||output!==outputBefore)
      throw Error('The fixed input or target changed during physical execution');
    const result={bytes:target.length,totalOutputBytes:gold.length,
      unvisitedTargetBytes:gold.length-target.length,matchedBytes:successful,
      accuracy:successful/Math.max(1,target.length),predictedRoutes:planned,
      firstPredictionsBeforeMovement:firstPredictions,actions,
      completeOutputCovered:target.length===gold.length,
      producedPreview:Buffer.from(produced.slice(0,100)).toString('utf8'),
      targetPreview:Buffer.from(target.subarray(0,100)).toString('utf8'),trace,
      nativePlanner:'Discoverer.shapeGraph',originalOrganism:true,
      donorActionsOnly:true,donorWeightsReadOnly:true,
      targetHiddenAtExecution:false, // Gold known for planning in training
      randomQwenInferenceExecuted:false,
      waveOptimization:{fastCalls:this.waveFastCalls,
        originalCalls:this.waveOriginalCalls,parityFailures:this.waveParityFailures,
        validatedTargets:this.waveVerified.size,rejectedTargets:this.waveRejected.size}};
    if(record){
      const m=this.brain.brainCharacterWorld;
      m.worlds++;m.planned+=planned;m.executed++;m.matched+=successful;
      m.bytesVisited+=target.length;m.bytesTotal+=gold.length;
      m.actions+=actions;m.predictedBeforeMoving+=firstPredictions;
      m.attempts+=predictions.length;
      m.last.push({at:m.worlds,inputPreview:input.slice(0,80),...result,trace:trace.slice(0,4)});
      if(m.last.length>8)m.last.shift();
      this._saveStatus();
    }
    return result;
  }

  _saveStatus(){
    if(!this.saveFile)return;
    const file=this.saveFile+'.brain-character.json';
    const body={format:'braivour/v42-brain-character-status-v1',
      ...this.brain.brainCharacterWorld,frozenDonorEdges:this.totalEdges,
      frozenDonorAxes:this.axes.length,originalBrain:true};
    writeV43Telemetry(file,body);
  }
}
