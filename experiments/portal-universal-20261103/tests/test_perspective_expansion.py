"""Actual CPU regression tests for the opt-in perspective expansion mechanism."""
import tempfile
import unittest
import torch
import torch.nn.functional as F
from perspective_expansion import PerspectiveExpansion
from engine import PortalEngine, GraphController


class ExpansionUnitTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(123)
        self.h = torch.randn(2, 7, 24)
        self.mask = torch.tensor([[1,1,1,1,0,0,0],[1,1,1,1,1,1,0]],
                                 dtype=torch.float32).unsqueeze(-1)

    def test_learned_directions_and_rank_growth(self):
        m = PerspectiveExpansion()
        correction = m(self.h,self.mask,step=2,trace=True)
        self.assertEqual(tuple(correction.shape),(2,24))
        self.assertTrue(torch.equal(correction,torch.zeros_like(correction)))
        self.assertEqual(tuple(m.last_coordinates.shape),(2,7,12))
        self.assertGreater(float(m.last_coordinates[:,:,:4].abs().sum()),0.0)
        self.assertEqual(float(m.last_coordinates[:,:,4:].abs().sum()),0.0)
        self.assertTrue(torch.isfinite(m.last_consistency))
        self.assertTrue(m.increase_rank())
        m(self.h,self.mask,trace=True)
        self.assertGreater(float(m.last_coordinates[:,:,4:8].abs().sum()),0.0)
        self.assertTrue(m.increase_rank())  # rank 2 -> 3
        self.assertFalse(m.increase_rank())  # at max rank

    def test_noise_reproducible_and_disabled_at_evaluation(self):
        m=PerspectiveExpansion(local_noise=.1,shared_noise=.2)
        m.train()
        m(self.h,self.mask,step=3,trace=True)
        a=m.last_coordinates.clone()
        m(self.h,self.mask,step=3,trace=True)
        self.assertTrue(torch.equal(a,m.last_coordinates))
        m(self.h,self.mask,step=4,trace=True)
        self.assertFalse(torch.equal(a,m.last_coordinates))
        m.eval()
        m(self.h,self.mask,step=3,trace=True)
        b=m.last_coordinates.clone()
        m(self.h,self.mask,step=4,trace=True)
        self.assertTrue(torch.equal(b,m.last_coordinates))

    def test_identical_current_state_changes_with_different_real_histories(self):
        m=PerspectiveExpansion()
        history_a=torch.zeros(2,24)
        history_b=torch.ones(2,24)*.7
        m(self.h,self.mask,step=1,trace=True,history=history_a)
        a=m.last_coordinates.clone()
        m(self.h,self.mask,step=1,trace=True,history=history_b)
        b=m.last_coordinates.clone()
        self.assertFalse(torch.equal(a,b),
            'Historical information must affect the new degrees of freedom')

    def test_joint_prediction_and_self_error_gradients(self):
        m=PerspectiveExpansion()
        out=m(self.h,self.mask,step=1,trace=True)
        target=torch.tensor([.3,.8])
        loss=out.sum()+F.mse_loss(m.last_self_prediction,target)+.02*m.last_consistency
        loss.backward()
        self.assertGreater(float(m.readout.weight.grad.abs().sum()),0)
        self.assertGreater(float(m.self_error_head.weight.grad.abs().sum()),0)
        self.assertGreater(float(m.scales[0].local.weight.grad.abs().sum()),0)

    def test_baseline_state_dict_is_unchanged_before_enable(self):
        m=GraphController(capacity=512)
        self.assertFalse(any('expansion.' in k for k in m.state_dict()))
        self.assertIsNone(m.expansion)


class ExpansionEngineTests(unittest.TestCase):
    def test_actual_world_update_trace_checkpoint_resume(self):
        with tempfile.TemporaryDirectory() as folder:
            engine=PortalEngine(folder,device='cpu',capacity=2048)
            before=engine.model.context.weight.detach().clone()
            state=engine.enable_expansion({'max_levels':3,'local_noise':0.07,'shared_noise':0.05})
            self.assertEqual(state['active_levels'],1)
            self.assertEqual(len(engine.optimizer.param_groups),2)
            # True action, reward, and optimizer update in an existing world.
            result=engine.episode_many(['yesno','symbols'],batch_size=2,capture=True)
            self.assertEqual(result['episodes'],2)
            self.assertGreater(float((engine.model.context.weight-before).abs().sum()),0)
            self.assertTrue('expansion' in engine.last_trace)
            logged=[x.get('expansion') for x in engine.recent(200) if x.get('expansion')]
            self.assertTrue(any(x['temporal_memory_norm']>0 for x in logged),
                'Actual multi-step world memory should affect perspective')
            point=engine.last_trace['expansion']['nodes'][0]
            self.assertEqual(len(point['latent']),4)
            self.assertEqual(engine.status()['perspective_expansion']['active_levels'],1)
            shape=engine.model.expansion.scales[0].local.weight.detach().clone()
            engine.save()
            engine.close()
            resumed=PortalEngine(folder,device='cpu',capacity=2048)
            self.assertEqual(len(resumed.optimizer.param_groups),2)
            self.assertEqual(resumed.status()['perspective_expansion']['max_levels'],3)
            self.assertTrue(torch.equal(resumed.model.expansion.scales[0].local.weight,shape))
            # The held-out evaluation must not mutate trained weights or rank.
            before_eval=resumed.model.expansion.scales[0].local.weight.detach().clone()
            tested=resumed.evaluate(['yesno'],count=2)
            self.assertEqual(tested['trained']['worlds'],2)
            self.assertTrue(torch.equal(before_eval,resumed.model.expansion.scales[0].local.weight))
            resumed.close()

    def test_unmodified_baseline_still_trains_and_reloads(self):
        with tempfile.TemporaryDirectory() as folder:
            engine=PortalEngine(folder,'cpu',capacity=2048)
            self.assertIsNone(engine.model.expansion)
            engine.episode_many(['yesno'],batch_size=2,capture=True)
            engine.close()
            resumed=PortalEngine(folder,'cpu',capacity=2048)
            self.assertIsNone(resumed.model.expansion)
            self.assertEqual(len(resumed.optimizer.param_groups),1)
            resumed.close()

if __name__=='__main__':
    unittest.main()
