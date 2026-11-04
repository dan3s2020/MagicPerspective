"""V14: empirically learned self/world distinction, not two hardcoded brains."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from engine import Graph, PortalEngine, build_world
from perspective import PerspectiveLearner, feature_values
from toroid import inside_solid_torus4


class PerspectiveTests(unittest.TestCase):
    def test_counterfactual_sensitivity_is_learned_without_preset_self_world_labels(self):
        learner=PerspectiveLearner()
        for n in range(16):
            report=learner.contrast('car','TURN','BRAKE',
                ['CAR/x/3','CAR/heading/2','ENV/weather/rain'],
                ['CAR/x/3','CAR/heading/0','ENV/weather/rain'],
                {'effect':'moved','reward':-.04},
                {'effect':'blocked','reward':-.6},source='same-world-same-state')
        rows={v['channel']:v for v in learner.summary(30)['channels']}
        self.assertEqual(rows['CAR/heading']['classification'],'action-sensitive')
        self.assertGreater(rows['CAR/heading']['controllability'],.9)
        self.assertEqual(rows['ENV/weather']['classification'],'action-invariant')
        self.assertLess(rows['ENV/weather']['controllability'],.1)
        self.assertLess(rows['CAR/x']['controllability'],.1)
        self.assertTrue(all('SELF' not in r and 'WORLD' not in r for r in learner.channels))
        restored=PerspectiveLearner.restore(learner.state())
        self.assertEqual(restored.summary(30),learner.summary(30))
        self.assertEqual(report['actual_action'],'TURN')
        self.assertEqual(report['alternative_action'],'BRAKE')

    def test_actual_simulator_two_actions_from_identical_state_give_measurable_contrast(self):
        world=build_world('symbols',52)
        before,actions=world.observation()
        self.assertIn('ADD1',actions)
        self.assertIn('SUB1',actions)
        shadow=copy.deepcopy(world)
        a=world.step('ADD1')
        b=shadow.step('SUB1')
        real_tokens,_=world.observation()
        shadow_tokens,_=shadow.observation()
        learning=PerspectiveLearner()
        report=learning.contrast('symbols','ADD1','SUB1',real_tokens,shadow_tokens,a,b)
        by_channel={x['channel']:x for x in report['features']}
        self.assertTrue(by_channel['SYMBOL/value']['different'])
        self.assertFalse(by_channel['SYMBOL/mod']['different'])
        self.assertEqual(world.spec,shadow.spec)
        self.assertNotEqual(world.pos,shadow.pos)
        self.assertNotIn('oracle',json.dumps(report).lower())

    def test_integrated_real_training_grows_perspective_nodes_and_gnn_can_recruit_them(self):
        with tempfile.TemporaryDirectory() as folder:
            p=PortalEngine(folder,'cpu',capacity=3500)
            p.episode_many(['maze3d','car','symbols','yesno'],8,capture=True)
            self.assertGreater(p.perspective.probes,0)
            self.assertIn('perspective',p.status())
            self.assertTrue(any(n['role']=='perspective' for n in p.graph.nodes))
            self.assertTrue(any(n['role']=='policy' for n in p.graph.nodes))
            self.assertTrue(any(e[2]=='expresses_policy' for e in p.graph.edges))
            lens=[n for n in p.graph.nodes if n['role']=='perspective']
            self.assertTrue(all(n['origin']['method']=='matched_counterfactual' for n in lens))
            self.assertTrue(all(inside_solid_torus4(n['p4']) for n in lens))
            self.assertTrue(all('controllability' in n for n in lens))
            self.assertTrue(any('intervention_tested'==edge[2] for edge in p.graph.edges))
            observed_lens={n['id'] for n in lens}
            found=False
            for domain in ('car','symbols','maze3d'):
                world=build_world(domain,90011)
                tokens,actions=world.observation()
                obs_ids,_,_,ns,_,_=p.graph.context(domain,tokens,actions)
                if observed_lens.intersection(obs_ids[:ns]):found=True;break
            # Stored perspective is not merely a side dashboard: the model's
            # ordinary observation graph can include matched-intervention lens nodes.
            self.assertTrue(found)
            self.assertTrue(any(f.get('perspective') for f in p.recent(100)))
            view=p.graph.view_page(0,1500,0,3000)
            self.assertTrue(any(n['role']=='perspective' for n in view['nodes']))
            before=p.perspective.summary(30)
            p.save();p.close()
            reopened=PortalEngine(folder,'cpu',capacity=3500)
            self.assertEqual(reopened.perspective.summary(30),before)
            self.assertEqual(len(reopened.graph.nodes),len(view['nodes']))
            self.assertGreater(reopened.perspective.probes,0)
            reopened.reset_all()
            self.assertEqual(reopened.perspective.probes,0)
            self.assertFalse(any(n['role']=='perspective' for n in reopened.graph.nodes))
            reopened.close()

    def test_existing_checkpoint_without_perspective_can_be_restored(self):
        with tempfile.TemporaryDirectory() as folder:
            p=PortalEngine(folder,'cpu',capacity=1500)
            p.save();p.close()
            import torch
            target=Path(folder)/'brain.pt'
            original=torch.load(target,map_location='cpu',weights_only=False)
            del original['perspective']
            torch.save(original,target)
            reopened=PortalEngine(folder,'cpu',capacity=1500)
            self.assertEqual(reopened.perspective.probes,0)
            reopened.step_many([build_world('symbols',4)],record=True)
            self.assertGreater(reopened.steps,0)
            reopened.close()

    def test_v13_ui_kept_and_new_perspective_inspector_connected(self):
        base=Path(__file__).resolve().parents[1]
        html=(base/'web/index.html').read_text(encoding='utf8')
        js=(base/'web/app.js').read_text(encoding='utf8')
        torus=(base/'web/torus-view.js').read_text(encoding='utf8')
        for marker in ('data-mode="3d"','data-mode="torus"','data-mode="4d"',
                       'id="sliceW"','id="start"','id="resetDialog"',
                       'id="timeline"','id="perspectiveStats"','id="perspectiveLatest"'):
            self.assertIn(marker,html)
        self.assertIn('f.perspective',js)
        self.assertIn("s.perspective",js)
        self.assertIn("n.role==='perspective'",torus)
        self.assertIn('PortalTorusView.draw',js)


if __name__=='__main__':unittest.main()
