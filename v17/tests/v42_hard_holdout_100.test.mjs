import test from 'node:test';
import assert from 'node:assert/strict';
import {randomThreshold,runV42,worldHash} from './v42_hard_sat_lab.mjs';

// Independent reference: scipy.optimize.milp / HiGHS binary integer
// feasibility, 5s per problem, using separately constructed clause matrix.
// The reference labels are assertions ONLY, never fed into the V42 engine.
const independentMILP={
  20262001:'UNSAT',20262002:'UNSAT',20262003:'UNSAT',
  20262004:'SAT',20262005:'UNSAT',20262006:'SAT',
  20262007:'SAT',20262008:'SAT',20262009:'SAT',20262010:'UNSAT'
};
function allClausesTrue(clauses,bits){return clauses.every(c=>c.some(l=>bits[Math.abs(l)-1]===(l>0?1:0)));}

test('10 new 100-variable 426-clause random 3-SAT formulas: original V42 vs independent MILP',()=>{
  let sat=0,unsat=0;
  for(let seed=20262001;seed<=20262010;seed++){
    const world=randomThreshold(seed,100);
    const answer=runV42(world,{maxMs:9000,maxProposals:100000});
    assert.equal(answer.status,independentMILP[seed],`V42 failed independent reference on seed ${seed}`);
    if(answer.status==='SAT'){
      sat++;
      assert.equal(answer.solution.length,100);
      assert(allClausesTrue(world.clauses,answer.solution));
    }else{
      unsat++;
      assert(answer.exhausted,'Claimed UNSAT without full route exhaustion');
    }
    const {solution,...report}=answer;
    console.log('V42_HELDOUT_100_PROOF '+JSON.stringify({seed,hash:worldHash(world),variables:100,
      clauses:world.clauses.length,independentMILP:independentMILP[seed],
      ...report,witness:solution?.join('')}));
  }
  assert.equal(sat,5);assert.equal(unsat,5);
  console.log('V42_HELDOUT_100_SUMMARY '+JSON.stringify({total:10,sat,unsat,unknown:0}));
});
