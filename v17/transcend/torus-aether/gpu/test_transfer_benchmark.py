"""Regression and negative controls for episode-disjoint transfer measurement."""
import json
import os
import tempfile
import unittest

from transfer_benchmark import read_trace, split_episodes, permuted_actions, audit

def samples():
    result = []
    for domain in ('maze', 'transform', 'text'):
        for episode in range(5):
            for step in range(3):
                result.append({'domain': domain, 'episode': f'{domain}:{episode}',
                               'before': [domain, episode, step],
                               'after': [domain, episode, step + 1],
                               'action': f'action:{(step + episode) % 3}', 'context': domain})
    return result

class TransferTests(unittest.TestCase):
    def test_episode_disjoint_and_repeatable(self):
        train, held, stats = split_episodes(samples(), seed=13)
        self.assertEqual({r['episode'] for r in train} & {r['episode'] for r in held}, set())
        self.assertEqual(stats['text']['heldoutEpisodes'], 1)
        self.assertEqual((train, held, stats), split_episodes(samples(), seed=13))

    def test_forbidden_reference_never_reaches_training(self):
        with tempfile.TemporaryDirectory() as tmp:
            filename = os.path.join(tmp, 'events.jsonl')
            with open(filename, 'w', encoding='utf8') as stream:
                stream.write(json.dumps({**samples()[0], 'answer': 'oracle'}) + '\n')
            with self.assertRaisesRegex(ValueError, 'Forbidden'):
                read_trace(filename)

    def test_shuffled_action_control_and_frozen_scoring(self):
        rows = samples()
        corrupted = permuted_actions(rows, seed=21)
        self.assertNotEqual([v['action'] for v in rows], [v['action'] for v in corrupted])
        self.assertEqual([v['after'] for v in rows], [v['after'] for v in corrupted])
        result = audit(rows, target='text', seed=7, steps=2, batch=3, device='cpu')
        self.assertEqual(result['targetHeldoutEvents'], 3)
        self.assertEqual(set(result['frozen']), {'shared_adaptive', 'shared_no_noise',
                                                  'target_only', 'source_only', 'shuffled_actions',
                                                  'source_then_target', 'target_matched_adaptation'})
        self.assertEqual(result['frozen']['shared_adaptive']['noiseUpdates'], 2)
        self.assertEqual(result['pretrainSteps'], 1)
        self.assertEqual(result['targetAdaptationSteps'], 1)
        self.assertEqual(result['frozen']['target_matched_adaptation']['optimizerSteps'], 1)
        self.assertEqual(result['frozen']['source_then_target']['optimizerSteps'], 2)
        self.assertIsNotNone(result['zeroShotAfterSourcePretrain'])
        self.assertIn('relativePretrainVsSameTargetAdaptation', result)
        self.assertTrue(all(v['updates'] is False for v in result['frozen'].values()))

if __name__ == '__main__':
    unittest.main()
