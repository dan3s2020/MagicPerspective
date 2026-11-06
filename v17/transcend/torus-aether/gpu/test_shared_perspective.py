import os
import tempfile
import unittest
from shared_perspective import SharedPerspective, state_features, action_features

SAMPLES = [
    {'domain':'maze','before':[1,2,3,4], 'after':[1,3,2,4], 'action':'output:3','context':'grid:2'},
    {'domain':'transform','before':[7,4,3,1], 'after':[7,3,4,1], 'action':'output:2','context':'grid:2'},
    {'domain':'text','before':['turn','door'], 'after':['turn','door','open'], 'action':'speech-tool:1:open','context':'question'},
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
        self.assertEqual(m.counts, {'maze':8,'transform':8,'text':8})
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
    def test_cuda_no_silent_fallback(self):
        import torch
        if not torch.cuda.is_available():
            with self.assertRaisesRegex(RuntimeError,'no silent CPU fallback'):
                SharedPerspective('cuda:0')

if __name__ == '__main__': unittest.main()
