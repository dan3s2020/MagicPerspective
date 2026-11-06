import os
import tempfile
import unittest
from shared_perspective import SharedPerspective, state_features, action_features

SAMPLES = [
    {'domain':'maze','before':[1,2,3,4], 'after':[1,3,2,4], 'action':'output:3','context':'grid:2'},
    {'domain':'transform','before':[7,4,3,1], 'after':[7,3,4,1], 'action':'output:2','context':'grid:2'},
    {'domain':'text','before':['turn','door'], 'after':['turn','door','open'], 'action':'speech-tool:1:open','context':'question'},
    {'domain':'selfcode','before':'function f(){return 1}','after':'function f(){return 2}','action':'portal-jump','context':'selfsource'},
]
class SharedTests(unittest.TestCase):
    def test_hash_determinism(self):
        self.assertEqual(state_features([1,2,3]), state_features([1,2,3]))
        self.assertNotEqual(state_features([1,2,3]), state_features([3,2,1]))
        self.assertNotEqual(action_features('a','maze'), action_features('a','text'))
    def test_cross_domain_gradient_and_frozen_eval(self):
        m=SharedPerspective('cpu',seed=7)
        initial=m.evaluate(SAMPLES)
        self.assertFalse(initial['updates']); self.assertEqual(m.steps,0)
        for _ in range(8):
            ret=m.train(SAMPLES)
        final=m.evaluate(SAMPLES)
        self.assertEqual(m.steps,8)
        self.assertLess(final['loss'], initial['loss'])
        self.assertEqual(m.counts, {'maze':8,'transform':8,'text':8,'selfcode':8})
        self.assertEqual(len(ret['trace']['predicted']),32)
    def test_checkpoint_and_oracle_guard(self):
        m=SharedPerspective('cpu',seed=4);m.train(SAMPLES)
        with tempfile.TemporaryDirectory() as tmp:
            f=os.path.join(tmp,'shared.pt');m.save(f)
            n=SharedPerspective('cpu',seed=98);n.load(f)
            self.assertEqual(n.steps,1)
            self.assertEqual(n.evaluate(SAMPLES)['loss'],m.evaluate(SAMPLES)['loss'])
        with self.assertRaisesRegex(ValueError,'oracle'):
            m.train([{**SAMPLES[0], 'optimal':1}])
    def test_adaptive_noise_is_training_only_and_resumable(self):
        m = SharedPerspective('cpu', seed=123)
        held = m.evaluate(SAMPLES)
        self.assertEqual(m.noise_updates, 0)
        self.assertEqual(m.steps, 0)
        train = m.train(SAMPLES, adaptive_noise=True)
        self.assertEqual(m.noise_updates, 1)
        self.assertGreater(train['noiseUsed'], 0)
        self.assertGreater(train['nextTrainingNoise'], 0)
        frozen = m.evaluate(SAMPLES)
        self.assertEqual(m.noise_updates, 1)
        self.assertFalse(frozen['updates'])
        self.assertNotEqual(held['loss'], frozen['loss'])
        with tempfile.TemporaryDirectory() as tmp:
            save = os.path.join(tmp, 'adaptive.pt')
            m.save(save)
            copy = SharedPerspective('cpu', seed=999)
            copy.load(save)
            self.assertEqual(copy.noise_updates, m.noise_updates)
            self.assertEqual(copy.noise, m.noise)
            self.assertEqual(copy.noise_rng.get_state().tolist(), m.noise_rng.get_state().tolist())
            self.assertEqual(copy.evaluate(SAMPLES), m.evaluate(SAMPLES))

    def test_organism_selects_real_perturbation_site_and_strength(self):
        scores = {}
        for site in ('none', 'perception', 'imagination', 'action'):
            m = SharedPerspective('cpu', seed=719)
            start = m.evaluate(SAMPLES)
            result = m.train(SAMPLES, adaptive_noise=True,
                             noise_selection={'site': site, 'strength': 0.7})
            self.assertTrue(result['organismSelected'])
            self.assertEqual(result['noiseSite'], site)
            self.assertEqual(result['noiseUpdates'], 0,
                             'no competing hardcoded noise policy may override the organism')
            self.assertIsInstance(result['trainingNoiseGain'], float)
            self.assertFalse(m.evaluate(SAMPLES)['updates'])
            self.assertEqual(m.steps, 1)
            scores[site] = m.evaluate(SAMPLES)['loss']
            if site == 'none':
                self.assertEqual(result['noiseUsed'], 0)
            else:
                self.assertGreater(result['noiseUsed'], 0)
            self.assertNotEqual(scores[site], start['loss'])
        self.assertNotEqual(scores['none'], scores['imagination'])
        self.assertNotEqual(scores['none'], scores['action'])
        self.assertNotEqual(scores['none'], scores['perception'])
        with self.assertRaisesRegex(ValueError, 'unknown organism noise site'):
            SharedPerspective('cpu').train(SAMPLES, noise_selection={'site': 'oracle', 'strength': 1})
        with self.assertRaisesRegex(ValueError, 'strength'):
            SharedPerspective('cpu').train(SAMPLES, noise_selection={'site': 'perception', 'strength': 100})

    def test_zero_noise_selection_matches_unperturbed_original_gradient(self):
        a = SharedPerspective('cpu', seed=223)
        b = SharedPerspective('cpu', seed=223)
        a.train(SAMPLES, adaptive_noise=False)
        b.train(SAMPLES, adaptive_noise=True, noise_selection={'site': 'none', 'strength': 0})
        self.assertEqual(a.evaluate(SAMPLES)['loss'], b.evaluate(SAMPLES)['loss'],
                         'organism can choose exact zero noise without a hidden fixed perturbation')

    def test_cuda_no_silent_fallback(self):
        import torch
        if not torch.cuda.is_available():
            with self.assertRaisesRegex(RuntimeError,'no silent CPU fallback'):
                SharedPerspective('cuda:0')

if __name__ == '__main__': unittest.main()
