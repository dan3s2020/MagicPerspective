"""Offline arithmetic/parity tests; run with original CUDA venv Python."""
import unittest
import torch
from cuda_aux_models import AuxiliaryCuda

def geometry_state():
    lane=lambda:{'E':[[.08 if i==j else .01 for j in range(5)] for i in range(8)],
                 'P':[[0.]*10 for _ in range(8)],
                 'D':[[.08 if i==j else .01 for j in range(8)] for i in range(5)],
                 'be':[0.]*8,'bd':[0.]*5}
    stats=lambda:{'trainN':0,'trainLossSum':0.,'evalN':0,'evalLossSum':0.,
                   'baselineLossSum':0.,'last':None}
    return {'version':1,'seed':11,'lanes':{w:lane() for w in ('text','maze','transform')},
            'T':[[.6 if i==j else 0. for j in range(8)] for i in range(8)],
            'A':[[0.]*8 for _ in range(8)],'bt':[0.]*8,
            'stats':{w:stats() for w in ('text','maze','transform')},
            'lr':.018,'recon':.12,'updates':0}

def latent_state():
    return {'version':1,'seed':19,'W':[[.01]*128 for _ in range(32)],
            'updates':0,'lastLoss':None,'averageLoss':0.,'lr':.11}

class CudaAuxAcceptance(unittest.TestCase):
    def test_geometry_train_holdout_is_frozen(self):
        engine=AuxiliaryCuda('cpu')
        state=geometry_state()
        ev={'world':'maze','x':[.1,-.2,.4,.6,-.1],'y':[.15,-.05,.3,.48,-.2],
            'prev':[.13,-.15,.43,.63,-.05],'action':2}
        first=engine.geometry(state,[{**ev,'heldout':True}])['state']['stats']['maze']['last']['mse']
        self.assertEqual(state['updates'],0)
        out=engine.geometry(state,[ev for _ in range(200)],batch_size=32)
        self.assertEqual(out['trained'],200)
        self.assertEqual(state['updates'],200)
        after=engine.geometry(state,[{**ev,'heldout':True}])['state']['stats']['maze']['last']['mse']
        self.assertLess(after,first)
        self.assertEqual(state['stats']['maze']['evalN'],2)

    def test_latent_online_sgd_matches_cpu_equation(self):
        state=latent_state();x=[0.]*128;x[4]=1.
        result=AuxiliaryCuda('cpu').latent(state,[{'features':x,'target':[.2]*32}]*4)
        expected=.01
        for _ in range(4):expected-=.11*(expected-.2)
        self.assertAlmostEqual(state['W'][0][4],expected,12)
        self.assertEqual(result['trained'],4)

    def test_invalid_inputs_rejected(self):
        engine=AuxiliaryCuda('cpu')
        with self.assertRaises(ValueError):engine.latent(latent_state(),[{'features':[1.],'target':[1.]}])
        with self.assertRaises(ValueError):engine.geometry(geometry_state(),[{'world':'text','x':[0.]*5,'y':[0.]*5,'prev':[0.]*5,'action':99}])

    @unittest.skipUnless(torch.cuda.is_available(),'No NVIDIA CUDA device in this test environment')
    def test_real_cuda_allocation(self):
        engine=AuxiliaryCuda('cuda:0')
        result=engine.latent(latent_state(),[{'features':[.1]*128,'target':[.2]*32}])
        self.assertEqual(result['device'],'cuda:0')
        self.assertGreater(result['peakVramGB'],0)

if __name__=='__main__':unittest.main()
