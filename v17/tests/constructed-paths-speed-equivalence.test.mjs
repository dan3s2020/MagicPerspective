import test from 'node:test';
import assert from 'node:assert/strict';
import {ConstructedPathLearner} from '../transcend/torus-aether/worlds/constructed-paths.mjs';

test('cached question key produces the exact original text states',()=>{
  const learner=new ConstructedPathLearner();
  const questions=['Why does a GPU stall?', 'A_very long prompt 123 with repeated repeated words'];
  const histories=['', 'a', '0123456789abcdefghijklmnopqrstuvwxyz'];
  for(const question of questions){
    const key=ConstructedPathLearner.qkey(question);
    for(const history of histories)for(const scale of learner.byScale){
      assert.equal(learner.textStateWithKey(key,history,scale),
        learner.textState(question,history,scale));
    }
  }
});

test('optimized trainText retains exact learned graph and counters',()=>{
  const optimized=new ConstructedPathLearner({maxTextStates:10000});
  const reference=new ConstructedPathLearner({maxTextStates:10000});
  reference.textStateWithKey=(key,history,scale)=>reference.textState(
    'Repeated prompt words explain GPU scheduling 42',history,scale);
  const question='Repeated prompt words explain GPU scheduling 42';
  const answer='An exact update sequence must remain unchanged. '.repeat(20);
  optimized.trainText(question,answer);
  reference.trainText(question,answer);
  assert.deepEqual(optimized.summary(),reference.summary());
  for(let i=0;i<optimized.scales.length;i++)
    assert.deepEqual([...optimized.scales[i].edges],[...reference.scales[i].edges]);
});
