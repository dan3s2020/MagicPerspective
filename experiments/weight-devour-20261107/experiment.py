"""MagicPerspective weight-devouring hypothesis test.

Donor: neural network trained on discrete transformations of a 2D world.
Devourer: accesses donor *parameters only*, not training data, labels,
teacher predictions, or optimization gradients. Discovers local tensor pathways
with the chain rule; dreams at latent coordinates; builds a transformation
atlas; evaluates blind composition and goal-navigation. This uses an adapted
attraction-wave concept from MagicPerspective's V17 Discoverer.shape, not the
repo's original JS classes. No claim of full V17 integration.
"""
import json, math, random, time, copy, argparse
from pathlib import Path
import numpy as np
import torch
from torch import nn

torch.set_num_threads(2)
MATS = np.array([
    [[1,0],[0,1]], [[0,-1],[1,0]], [[-1,0],[0,-1]], [[0,1],[-1,0]],
    [[1,0],[0,-1]], [[0,1],[1,0]], [[-1,0],[0,1]], [[0,-1],[-1,0]],
], dtype=np.float64)

class Donor(nn.Module):
    def __init__(self, h=24):
        super().__init__()
        self.enc = nn.Linear(2,h)
        self.gates = nn.Parameter(torch.randn(8,h,h)*0.12)
        self.dec = nn.Linear(h,2)
    def forward(self, x, op):
        z = torch.tanh(self.enc(x))
        z = torch.bmm(self.gates[op], z.unsqueeze(-1)).squeeze(-1)
        return self.dec(torch.tanh(z))


def train_donor(seed, steps, h):
    torch.manual_seed(seed);np.random.seed(seed);random.seed(seed)
    donor=Donor(h)
    initial=copy.deepcopy(donor.state_dict())
    optim=torch.optim.Adam(donor.parameters(), lr=0.012)
    target_mats=torch.tensor(MATS,dtype=torch.float32)
    t0=time.perf_counter()
    history=[]
    for step in range(steps):
        op=torch.randint(0,8,(384,))
        x=(torch.rand(384,2)*2.-1.) * .9
        y=torch.bmm(target_mats[op],x.unsqueeze(-1)).squeeze(-1)
        out=donor(x,op)
        loss=((out-y)**2).mean()
        optim.zero_grad();loss.backward();optim.step()
        if step==0 or (step+1)%200==0 or step==steps-1:
            history.append({'step':step+1,'mse':float(loss.detach())})
    return donor,initial,history,round(time.perf_counter()-t0,2)


def extract_weights(donor):
    """Read trainable tensors only; no donor.forward calls from meditate."""
    sd=donor.state_dict()
    return {k:v.detach().cpu().double().numpy().copy() for k,v in sd.items()}

class WeightAtlas:
    def __init__(self):
        self.M=None;self.b=None;self.report={}
    def meditate(self,weights,seed=1337,dreams=256):
        """No training, target labels, or donor outputs. Only weight algebra.
        Dreams are virtual egocentric coordinates used to calculate the local
        (analytic) Jacobian of the donor's parameter-defined transform.
        """
        W0=weights['enc.weight'];b0=weights['enc.bias']
        G=weights['gates'];W2=weights['dec.weight'];b2=weights['dec.bias']
        rng=np.random.default_rng(seed)
        anchors=rng.uniform(-.8,.8,(dreams,2))
        # Self-observation through the parameter graph, not behavioral labels:
        jac_list=np.empty((dreams,8,2,2)); base=np.empty((8,2))
        for k in range(8):
            z0=np.tanh(b0)
            z1=np.tanh(G[k]@z0)
            base[k]=W2@z1+b2
            for i,x in enumerate(anchors):
                h=np.tanh(W0@x+b0)
                g=np.tanh(G[k]@h)
                jac_list[i,k]= (W2*(1.-g*g)) @ G[k] @ ((1.-h*h)[:,None]*W0)
        self.M=np.mean(jac_list,axis=0)
        self.b=base
        v=np.linalg.norm(jac_list-self.M[None,:,:,:],axis=(2,3))
        stability=v.mean(axis=0)
        self.report={'dreams':dreams,'jacobian_variation_mean':float(v.mean()),
                     'per_operator_variation':[float(x) for x in stability],
                     'no_teacher_outputs':True,
                     'no_source_training_samples':True,
                     'no_student_gradient_training':True,
                     'method':'exact chain-rule through donor weights, averaged over imagined coordinates'}
        return self
    def apply(self,k,x): return self.M[int(k)]@np.asarray(x)+self.b[int(k)]
    def apply_sequence(self, ops, x):
        y=np.asarray(x).copy()
        for k in ops:y=self.apply(k,y)
        return y
    def composition_table(self):
        C=np.empty((8,8),dtype=int);err=np.empty((8,8))
        for a in range(8):
            for b in range(8):
                composed=self.M[b]@self.M[a]
                ds=np.linalg.norm(self.M-composed[None,:,:],axis=(1,2))
                C[a,b]=int(np.argmin(ds));err[a,b]=float(ds[C[a,b]])
        return C,err
    def plan_via_attraction_wave(self,x,goal,max_depth=3,goal_tol=.085):
        """V17-inspired solution-shape wave on *measured weight-derived* edges.
        Generate reachable states from parameter-derived actions, seed goal,
        propagate 0.97 * max(successor_value), climb before acting.
        """
        # Unfold action graph; duplicate paths kept, no hidden evaluator access.
        nodes=[{'vec':np.array(x,dtype=float),'depth':0,'parent':-1,'action':None}]
        edges=[]
        frontier=[0]
        for depth in range(max_depth):
            nxt=[]
            for ix in frontier:
                for k in range(8):
                    v=self.apply(k,nodes[ix]['vec'])
                    child=len(nodes);nodes.append({'vec':v,'depth':depth+1,'parent':ix,'action':k})
                    edges.append((ix,child));nxt.append(child)
            frontier=nxt
        distances=np.array([np.linalg.norm(n['vec']-goal) for n in nodes])
        targets=np.flatnonzero(distances<=goal_tol)
        if targets.size==0:
            # No plausible goal state; do NOT mark nearest as success.
            return {'ready':False,'reason':'no-learned-reachable-state','closest_error':float(distances.min())}
        # Identity on exact source must not be scored as nonempty plan.
        targets=targets[targets!=0]
        if targets.size==0:return {'ready':True,'actions':[],'prediction':list(map(float,x)),'goal_error':float(distances[0])}
        V=np.zeros(len(nodes),dtype=float)
        V[targets]=1.
        for _ in range(max_depth):
            for a,b in reversed(edges):
                V[a]=max(V[a], .97*V[b])
        ix=0;actions=[]
        for depth in range(max_depth):
            neigh=[b for a,b in edges if a==ix]
            if not neigh:break
            # choose goal wave value; break ties on actual distance
            ni=max(neigh,key=lambda j:(V[j],-distances[j]))
            if V[ni]<=0:break
            actions.append(nodes[ni]['action']);ix=ni
            if ix in set(targets): break
        return {'ready':True,'actions':[int(a) for a in actions],
                'prediction':[float(z) for z in nodes[ix]['vec']],
                'goal_error':float(distances[ix]),'predictedBeforeAction':True}


def external_evaluate(atlas,seed,n_test=512):
    """True transforms used ONLY here, after meditate() froze its atlas."""
    rng=np.random.default_rng(seed)
    xs=rng.uniform(-.8,.8,(n_test,2))
    ops=rng.integers(0,8,n_test)
    expected=np.einsum('nij,nj->ni',MATS[ops],xs)
    predicted=np.array([atlas.apply(k,x) for k,x in zip(ops,xs)])
    errors=np.linalg.norm(predicted-expected,axis=1)
    # Longer paths were not represented by any training sample.
    seq_errors={};seq_wins={}
    for depth in [2,3,5]:
        seqs=rng.integers(0,8,(n_test,depth));exp=[];pred=[]
        for x,seq in zip(xs,seqs):
            e=np.array(x);p=np.array(x)
            for k in seq:
                e=MATS[k]@e;p=atlas.apply(k,p)
            exp.append(e);pred.append(p)
        errs=np.linalg.norm(np.array(pred)-np.array(exp),axis=1)
        seq_errors[str(depth)]=float(np.mean(errs));seq_wins[str(depth)]=float(np.mean(errs<.10))
    C,cl=atlas.composition_table()
    # Associativity of discovered labels, true table used to evaluate correctness only:
    canon=np.array([[int(np.argmin(np.linalg.norm(MATS-(MATS[b]@MATS[a]),axis=(1,2)))) for b in range(8)] for a in range(8)])
    correct=float(np.mean(C==canon))
    # Fixed canonical compositional inverse accuracy.
    n_plans=72;solved=0;ready=0;plan_errors=[];mean_steps=[]
    for i in range(n_plans):
        # Nontrivial geometry: exclude tiny vectors and identity targets.
        # Otherwise a random model can appear successful near the origin.
        for _attempt in range(100):
            angle=rng.uniform(0,2*np.pi)
            radius=rng.uniform(.45,.75)
            x=radius*np.array([np.cos(angle),np.sin(angle)])
            seq=rng.integers(0,8,rng.integers(1,4))
            target=x.copy()
            for a in seq:target=MATS[a]@target
            if np.linalg.norm(target-x)>.35:break
        else:raise RuntimeError('failed to draw nontrivial goal')
        p=atlas.plan_via_attraction_wave(x,target,max_depth=2,goal_tol=.085)
        if p['ready']:
            ready+=1;pe=np.linalg.norm(np.array(p['prediction'])-target)
            replay=np.linalg.norm(atlas.apply_sequence(p['actions'],x)-np.array(p['prediction']))
            assert replay<1.e-8, 'predicted solution path differs from actual replay'
            plan_errors.append(float(pe));mean_steps.append(len(p['actions']))
            solved+=pe<.085
    return {'single_mean_l2':float(np.mean(errors)),'single_accuracy_l2_lt_0.10':float(np.mean(errors<.10)),
            'composition_mean_l2':seq_errors,'composition_accuracy_l2_lt_0.10':seq_wins,
            'discovered_composition_match_to_d4':correct,
            'closure_residual_mean':float(np.mean(cl)),
            'group_table':C.tolist(),
            'goal_plans':n_plans,'goals_ready':ready,'goals_solved_l2_lt_0.085':solved,
            'goal_mean_l2_when_ready':float(np.mean(plan_errors)) if plan_errors else None,
            'goal_mean_actions_when_ready':float(np.mean(mean_steps)) if mean_steps else None}


def main():
    p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=1600);p.add_argument('--seed',type=int,default=17)
    p.add_argument('--hidden',type=int,default=24);p.add_argument('--out',default=str(Path(__file__).resolve().parent))
    args=p.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    donor,initial,history,train_time=train_donor(args.seed,args.steps,args.hidden)
    atlas=WeightAtlas().meditate(extract_weights(donor),seed=args.seed+99,dreams=256)
    trained=external_evaluate(atlas,args.seed+200)
    original=Donor(args.hidden);original.load_state_dict(initial)
    noise=WeightAtlas().meditate(extract_weights(original),seed=args.seed+99,dreams=256)
    random_eval=external_evaluate(noise,args.seed+200)
    # Shuffle parts of learned expert matrices: disrupt their computational wiring.
    permuted=extract_weights(donor)
    rng=np.random.default_rng(args.seed+99)
    permuted['gates']=np.array([g[rng.permutation(g.shape[0]),:] for g in permuted['gates']])
    disrupted=WeightAtlas().meditate(permuted,seed=args.seed+99,dreams=256)
    disrupted_eval=external_evaluate(disrupted,args.seed+200)
    # True held-out donor inference, for a transparent baseline only.
    xr=np.random.default_rng(args.seed+200).uniform(-.8,.8,(512,2))
    op=np.random.default_rng(args.seed+300).integers(0,8,512)
    with torch.no_grad():
        donor_preds=donor(torch.tensor(xr,dtype=torch.float32),torch.tensor(op)).numpy()
    truth=np.einsum('nij,nj->ni',MATS[op],xr)
    donor_err=np.linalg.norm(donor_preds-truth,axis=1)
    report={'seed':args.seed,'steps':args.steps,'hidden':args.hidden,'parameter_count':sum(p.numel() for p in donor.parameters()),
            'train_s':train_time,'training_loss_history':history,
            'donor_heldout_mean_l2':float(donor_err.mean()),'donor_heldout_accuracy_l2_lt_0.10':float((donor_err<.10).mean()),
            'trained_atlas':{**atlas.report,**trained},'random_weight_control':{**noise.report,**random_eval},
            'wiring_scramble_control':{**disrupted.report,**disrupted_eval},
            'scope':'isolated CPU PyTorch donor + weight algebra, MagicPerspective V17-style goal-wave port; no original V17 run'}
    torch.save({'donor_state':donor.state_dict(),'initial_state':initial,'meta':{'steps':args.steps,'seed':args.seed}},out/'donor_weights.pt')
    (out/'weight_atlas.json').write_text(json.dumps({'M':atlas.M.tolist(),'b':atlas.b.tolist(),'discovery':atlas.report},indent=2))
    (out/'results.json').write_text(json.dumps(report,indent=2,default=lambda o: o.item() if isinstance(o,np.generic) else str(o)))
    print(json.dumps({k:v for k,v in report.items() if k not in ('training_loss_history',)},indent=2,default=lambda o:o.item() if isinstance(o,np.generic) else str(o)))

if __name__=='__main__':main()
