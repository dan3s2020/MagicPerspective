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
    for(let from=0;from<this.outputRows.length;from++){
      const src=this.outputRows[from],edges=[],next=[];
      for(let k=0;k<this.axes.length;k++)for(const sign of [-1,1]){
        const candidate=norm(src.map((x,i)=>x+sign*this.gain*this.axes[k][i]));
        const dst=this._closest(candidate);
        // Every edge is the ACTUAL physical donor transformation readout.
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

  _nativeShape(start,target){
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
      instructions.push({from,wanted,planned:!!planned?.complete,
        predicted_before_move:planned?.firstPredictionBeforeAction===true,
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
      randomQwenInferenceExecuted:false};
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
