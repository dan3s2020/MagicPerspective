import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {SharedExperience} from '../transcend/torus-aether/shared/experience.mjs';
import {CausalTextAgent} from '../../isolated/noise-space/causal_text_world.mjs';
import {TextActionPaths} from '../../isolated/noise-space/text_action_paths.mjs';

const rules = {depth:1, off:['R2','R4'], budEvery:100, empty:true, maxWires:32, fold:false};
test('real V17 maze and transform learning use the SAME shared sink', () => {
  const brain = new Brain({rules, c:{margin:.05, window:400, many:12}, seed:41});
  const shared = new SharedExperience({capacity:512});
  brain.setSharedObserver(t => shared.observe(t));
  brain.playMaze(true);
  brain.playTransform(false);
  const s = shared.status();
  assert.ok(s.domains.maze>0, JSON.stringify(s));
  assert.ok(s.domains.transform>0, JSON.stringify(s));
  assert.ok(shared.take().every(e => e.before && e.after && e.action !== undefined));
});
test('V17 training text world emits real actions to the SAME sink', () => {
  const head = new TextActionPaths();
  const agent = new CausalTextAgent({seed:41});
  const shared = new SharedExperience();
  const prompt = 'How can a door be opened?';
  const answer = 'Turn the key to open the door.';
  head.learn(prompt, answer);
  const outcome = agent.train(prompt, answer, head, {
    maxActions: 12, seed: 12, emit: ev => shared.observeText(ev, prompt)
  });
  assert.equal(outcome.trained, true);
  assert.ok(shared.status().domains.text > 0);
  const prior = agent.export();
  agent.navigate(prompt, head, {steps:5});
  assert.deepEqual(agent.export(), prior, 'inference must not learn');
});

test('frozen V17 maze and transform eval emit separate samples without training the original brain', () => {
  const brain = new Brain({rules, c:{margin:.05, window:400, many:12}, seed:52});
  const shared = new SharedExperience();
  brain.setSharedObserver(e => shared.observe(e));
  brain.playMaze(true); brain.playTransform(false);
  const before = {lived:brain.lived, maze:brain.mazes.played, trans:brain.trans.played, count:shared.total};
  const evidence = [];
  brain.examMazes([7], 1, 9021, {onTransition: e => evidence.push(e)});
  brain.evalTransforms(1, 0, 9021, {onTransition: e => evidence.push(e)});
  assert.ok(evidence.some(e => e.domain === 'maze'));
  assert.ok(evidence.some(e => e.domain === 'transform'));
  assert.equal(brain.lived, before.lived);
  assert.equal(brain.mazes.played, before.maze);
  assert.equal(brain.trans.played, before.trans);
  assert.equal(shared.total, before.count, 'frozen evaluation did not enter training queue');
});
