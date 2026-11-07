"""Replay/acceptance tests for the archived weight-only donor experiments.

Execute with: python -m unittest -v test_weight_devour.py
The tests use the saved donor checkpoints and atlases, and preserve them.
"""
import json
import unittest
from pathlib import Path
import numpy as np
import torch

import experiment as ex
import nonlinear as nl

ROOT = Path(__file__).resolve().parent


class WeightDevourArchiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.linear_saved = torch.load(ROOT / 'donor_weights.pt', map_location='cpu', weights_only=True)
        cls.linear_donor = ex.Donor(24)
        cls.linear_donor.load_state_dict(cls.linear_saved['donor_state'])
        cls.linear_atlas = ex.WeightAtlas().meditate(ex.extract_weights(cls.linear_donor), seed=116, dreams=256)
        cls.nonlinear_saved = torch.load(ROOT / 'nonlinear_donor_weights.pt', map_location='cpu', weights_only=True)
        cls.nonlinear_donor = ex.Donor(32)
        cls.nonlinear_donor.load_state_dict(cls.nonlinear_saved['donor_state'])
        cls.nonlinear_field = nl.LocalField().meditate(ex.extract_weights(cls.nonlinear_donor), grid_n=7)

    def test_linear_weights_are_independently_usable(self):
        self.assertEqual(sum(p.numel() for p in self.linear_donor.parameters()), 4730)
        self.assertEqual(ex.external_evaluate(self.linear_atlas, 217, n_test=128)['discovered_composition_match_to_d4'], 1.0)
        # The donor is now detached: the atlas is a separate object with only 48 continuous coefficients.
        self.assertEqual(self.linear_atlas.M.size + self.linear_atlas.b.size, 48)
        saved = json.loads((ROOT / 'weight_atlas.json').read_text())
        self.assertTrue(np.allclose(self.linear_atlas.M, saved['M'], atol=1.e-10))
        self.assertTrue(np.allclose(self.linear_atlas.b, saved['b'], atol=1.e-10))

    def test_random_initial_weights_cannot_solve_same_tasks(self):
        untrained = ex.Donor(24)
        untrained.load_state_dict(self.linear_saved['initial_state'])
        control = ex.WeightAtlas().meditate(ex.extract_weights(untrained), seed=116, dreams=256)
        trained = ex.external_evaluate(self.linear_atlas, 217, n_test=128)
        random = ex.external_evaluate(control, 217, n_test=128)
        self.assertGreaterEqual(trained['goals_solved_l2_lt_0.085'], 68)
        self.assertLess(random['goals_solved_l2_lt_0.085'], 15)

    def test_nonlinear_weight_derived_field_is_independent(self):
        self.assertEqual(sum(p.numel() for p in self.nonlinear_donor.parameters()), 8354)
        z = np.load(ROOT / 'nonlinear_dream_field.npz', allow_pickle=False)
        self.assertTrue(np.allclose(self.nonlinear_field.grid, z['grid']))
        self.assertTrue(np.allclose(self.nonlinear_field.values, z['jacobians']))
        self.assertTrue(np.allclose(self.nonlinear_field.bias, z['bias']))
        self.assertEqual(self.nonlinear_field.values.size, 1568)
        report = nl.score(self.nonlinear_field)
        self.assertLess(report['mean_l2'], .02)
        self.assertGreater(report['accuracy_l2_lt_0.05'], .97)
        inverses = self.nonlinear_field.observe_inverse_closure(n=48)
        self.assertEqual([x['best_reverse'] for x in inverses], [0,2,1,4,3,6,5,7])


if __name__ == '__main__':
    unittest.main()
