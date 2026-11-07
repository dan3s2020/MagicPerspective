"""Second weight-only meditation experiment: nonlinear hidden transformations.
The donor is trained on 8 *state-dependent* geometric operators.
The devourer inspects only its parameters; it stores a grid of local Jacobians
and integrates those discovered local 'travel directions' to predict actions.
No generated outputs or training pairs enter the devourer.
"""
import json,time,copy
from pathlib import Path
import numpy as np
import torch
import experiment as ex

ROOT=Path(__file__).resolve().parent

def f_np(k,x):
    a,b=np.asarray(x)[...,0],np.asarray(x)[...,1]
    y=np.stack([a,b],-1).copy()
    if k==1:y[...,0]+= .45*b*b
    if k==2:y[...,0]-= .45*b*b
    if k==3:y[...,1]+= .45*a*a
    if k==4:y[...,1]-= .45*a*a
    if k==5:y=np.stack([-b,a],axis=-1)
    if k==6:y=np.stack([b,-a],axis=-1)
    if k==7:y=np.stack([-a,b],axis=-1)
    return y

class LocalField:
    def __init__(self):self.grid=None;self.values=None;self.bias=None
    def meditate(self, weights, grid_n=7, lim=1.4):
        W0=weights['enc.weight'];b0=weights['enc.bias']
        G=weights['gates'];W2=weights['dec.weight'];b2=weights['dec.bias']
        knots=np.linspace(-lim,lim,grid_n)
        field=np.empty((8,grid_n,grid_n,2,2))
        for k in range(8):
            for i,xx in enumerate(knots):
                for j,yy in enumerate(knots):
                    h=np.tanh(W0@np.array([xx,yy])+b0)
                    g=np.tanh(G[k]@h)
                    field[k,i,j]=(W2*(1.-g*g)) @ G[k] @ ((1.-h*h)[:,None]*W0)
        self.grid=knots;self.values=field
        self.bias=np.array([W2@np.tanh(G[k]@np.tanh(b0))+b2 for k in range(8)])
        return self
    def jac(self,k,x):
        k=int(k);s=self.grid
        # bilinear interpolation of *weight-derived* Jacobians; no donor calls.
        z=np.clip(x,s[0],s[-1]);dx=s[1]-s[0]
        ix=int(np.clip(np.floor((z[0]-s[0])/dx),0,len(s)-2))
        iy=int(np.clip(np.floor((z[1]-s[0])/dx),0,len(s)-2))
        u=float(np.clip((z[0]-s[ix])/dx,0,1))
        v=float(np.clip((z[1]-s[iy])/dx,0,1))
        A=self.values[k]
        return (1-u)*(1-v)*A[ix,iy]+u*(1-v)*A[ix+1,iy]+(1-u)*v*A[ix,iy+1]+u*v*A[ix+1,iy+1]
    def apply(self,k,x):
        x=np.asarray(x,dtype=float)
        # path integration from 0 -> x: reconstruct global transformation
        # via connected local directional changes (fundamental theorem of calculus).
        n=16
        accum=np.zeros(2)
        for i in range(n):
            t=(i+.5)/n
            accum+=self.jac(k,t*x)@x/n
        return self.bias[int(k)]+accum
    def observe_inverse_closure(self, n=128, seed=123):
        rng=np.random.default_rng(seed)
        xs=rng.uniform(-.5,.5,(n,2))
        inv=[]
        for k in range(8):
            # no true target labels: score dream returns near its own origin.
            score=[]
            for j in range(8):
                e=np.mean([np.linalg.norm(self.apply(j,self.apply(k,x))-x) for x in xs])
                score.append(float(e))
            inv.append({'op':k,'best_reverse':int(np.argmin(score)),
                        'round_trip_l2':float(np.min(score))})
        return inv


def train(seed=17,steps=2200,h=32):
    torch.manual_seed(seed); np.random.seed(seed)
    donor=ex.Donor(h); init=copy.deepcopy(donor.state_dict())
    opt=torch.optim.Adam(donor.parameters(),lr=.009)
    losses=[]
    for n in range(steps):
        xx=np.random.uniform(-.85,.85,(384,2)).astype('float32')
        ops=np.random.randint(0,8,384)
        yy=np.array([f_np(int(k),x) for k,x in zip(ops,xx)],dtype='float32')
        x=torch.from_numpy(xx);k=torch.from_numpy(ops);y=torch.from_numpy(yy)
        loss=((donor(x,k)-y)**2).mean()
        opt.zero_grad();loss.backward();opt.step()
        if n==0 or n==steps-1 or (n+1)%400==0:losses.append({'step':n+1,'mse':float(loss.detach())})
    return donor,init,losses


def score(atlas, seed=17,n=256):
    rng=np.random.default_rng(seed)
    xx=rng.uniform(-.7,.7,(n,2));kk=rng.integers(0,8,n)
    truth=np.array([f_np(k,x) for x,k in zip(xx,kk)])
    pred=np.array([atlas.apply(k,x) for x,k in zip(xx,kk)])
    err=np.linalg.norm(truth-pred,axis=1)
    nonlinear_mask=np.isin(kk,[1,2,3,4])
    seqs=rng.integers(0,8,(n,3));xseq=rng.uniform(-.4,.4,(n,2))
    pseq=[];yseq=[]
    for x,seq in zip(xseq,seqs):
        p=x.copy();y=x.copy()
        for k in seq:
            p=atlas.apply(k,p);y=f_np(k,y)
        pseq.append(p);yseq.append(y)
    seq_err=np.linalg.norm(np.array(pseq)-np.array(yseq),axis=-1)
    return {'mean_l2':float(err.mean()),'accuracy_l2_lt_0.05':float((err<.05).mean()),
       'nonlinear_only_mean_l2':float(err[nonlinear_mask].mean()),
       'three_step_mean_l2':float(seq_err.mean()),'three_step_accuracy_l2_lt_0.10':float((seq_err<.1).mean())}

def main():
    seed=17
    donor,initial,losses=train(seed=seed)
    W=ex.extract_weights(donor)
    # no teacher answers or targets are used below
    local=LocalField().meditate(W,grid_n=7)
    global_avg=ex.WeightAtlas().meditate(W,seed=116,dreams=256)
    init_model=ex.Donor(32);init_model.load_state_dict(initial)
    random=LocalField().meditate(ex.extract_weights(init_model),grid_n=7)
    out={'seed':seed,'parameter_count':sum(p.numel() for p in donor.parameters()),
         'training_losses':losses,'local_field':score(local),
         'global_affine_field':score(global_avg),'random_weight_field':score(random),
         'local_field_jacobian_coefficients':int(local.values.size),
         'round_trip_dreams':local.observe_inverse_closure(n=48)}
    ROOT.joinpath('nonlinear_results.json').write_text(json.dumps(out,indent=2))
    torch.save({'donor_state':donor.state_dict(),'meta':{'seed':seed,'task':'8 state-dependent transformations'}},ROOT/'nonlinear_donor_weights.pt')
    np.savez_compressed(ROOT/'nonlinear_dream_field.npz', grid=local.grid, jacobians=local.values, bias=local.bias)
    print(json.dumps(out,indent=2))
if __name__=='__main__':main()
