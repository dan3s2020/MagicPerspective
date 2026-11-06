// Real, repeatable V17 training ablation: same initial brain, same train episodes,
// with vs without its INTERNAL learned noise selection. Then FROZEN unseen worlds.
// Does not assert that noise helps; prints losses/wins even when it hurts.
// node v17/scripts/audit-endogenous-noise.mjs --train-mazes 12 --train-transforms 3 --test 8 --seeds 3
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';

const arg = (key, def) => { const i = process.argv.indexOf('--' + key); return i >= 0 ? Number(process.argv[i + 1]) : def; };
const trainMazes = arg('train-mazes', 12), trainTransforms = arg('train-transforms', 3);
const testCount = arg('test', 8), seedCount = arg('seeds', 3);
for (const [name, value] of Object.entries({trainMazes, trainTransforms, testCount, seedCount})) {
  if (!Number.isInteger(value) || value < (name === 'seedCount' ? 1 : 0) || value > 150)
    throw Error('Invalid ' + name + ': ' + value);
}
if (testCount < 1) throw Error('At least one unseen test episode is required');
const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const result = [];
for (let k = 0; k < seedCount; k++) {
  const seed = 11 + k * 19;
  const fixed = new Brain({rules: 'winner', seed});
  const own = new Brain({rules: 'winner', seed});
  const fixedRandom = new Brain({rules: 'winner', seed});
  const agency = own.enableEndogenousNoise();
  fixed.setControls({pnoise: 0, ltemp: 0}); own.setControls({pnoise: 0, ltemp: 0});
  fixedRandom.setControls({pnoise: 0.15, ltemp: 0});
  for (let j = 0; j < trainMazes; j++) { fixed.playMaze(false); own.playMaze(false); fixedRandom.playMaze(false); }
  for (let j = 0; j < trainTransforms; j++) { fixed.playTransform(false); own.playTransform(false); fixedRandom.playTransform(false); }
  // Training perturbations must be OFF for every frozen evaluator, including fixed random baseline.
  fixedRandom.setControls({pnoise: 0});
  const steps = agency.total;
  const Fm = fixed.testMazes(testCount), Rm = fixedRandom.testMazes(testCount), Om = own.testMazes(testCount);
  const evalTransforms = b => trainTransforms ? b.testTransforms(Math.max(1, Math.min(testCount, 8))) : null;
  const Ft = evalTransforms(fixed), Rt = evalTransforms(fixedRandom), Ot = evalTransforms(own);
  if (agency.total !== steps) throw Error('Frozen evaluation changed noise policy');
  const s = agency.status();
  if (!s.decisions || !s.bySite.none || !s.noiseChoices) throw Error('No actual autonomous noise choices: ' + JSON.stringify(s.bySite));
  result.push({
    seed, trainEpisodes: {maze:trainMazes, transform:trainTransforms},
    brainOnly: {maze: Fm, transform: Ft},
    fixedRandomTraining: {maze: Rm, transform: Rt},
    brainWithAgency: {maze: Om, transform: Ot},
    endogenousNoise: {decisions:s.decisions, noiseRate:s.noiseRate, bySite:s.bySite,
      cumulativeReward:s.cumulativeReward},
    noiseCausedTrainingDifference: Fm.solved !== Om.solved || Fm.ratio !== Om.ratio ||
       Fm.shape !== Om.shape || Ft?.solved !== Ot?.solved
  });
}
const metric = (arm, world, key) => avg(result.map(r => r[arm][world]?.[key]).filter(Number.isFinite));
const fixedMaze = metric('brainOnly','maze','solved'), ownMaze = metric('brainWithAgency','maze','solved');
const randomMaze = metric('fixedRandomTraining','maze','solved');
const fixedShape = metric('brainOnly','maze','shape'), ownShape = metric('brainWithAgency','maze','shape');
const fixedTransform = metric('brainOnly','transform','solved'), ownTransform = metric('brainWithAgency','transform','solved');
const randomTransform = metric('fixedRandomTraining','transform','solved');
console.log(JSON.stringify({protocol: 'SAME_SEEDS_SAME_WORLD_EPISODES_FROZEN_UNSEEN_TESTS',
  caveat: 'Descriptive paired training ablation; no universal transfer or statistically significant benefit implied',
  trainMazes, trainTransforms, testCount, seedCount,
  paired: result,
  summary: {
    mazeSuccessNoAgency: fixedMaze, mazeSuccessFixedRandom: randomMaze, mazeSuccessOwnAgency: ownMaze,
    mazeSuccessDifference: ownMaze - fixedMaze,
    mazeSuccessDifferenceVsFixedRandom: ownMaze - randomMaze,
    mazeFirstShapeNoAgency: fixedShape, mazeFirstShapeOwnAgency: ownShape,
    mazeFirstShapeDifference: ownShape - fixedShape,
    transformSuccessNoAgency: fixedTransform, transformSuccessFixedRandom: randomTransform,
    transformSuccessOwnAgency: ownTransform,
    transformSuccessDifference: fixedTransform === null ? null : ownTransform - fixedTransform,
    transformSuccessDifferenceVsFixedRandom: randomTransform === null ? null : ownTransform - randomTransform,
  },
}, null, 2));
