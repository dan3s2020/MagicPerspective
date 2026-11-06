"""CUDA-only training of the existing 5D geometric model and 32D language goal field.
The original V17 physics and TextCard use the same Python process through cuda_unified.py.
CPU is permitted only by explicit numpy-mode test; production CUDA never falls back.
"""
import math
import time
import torch

LANES=('text','maze','transform')
D,H,ACT=5,8,8
def tensor(v,device): return torch.tensor(v,device=device,dtype=torch.float64)
def values(t): return t.detach().cpu().tolist()
def bounded(v): return max(-2.,min(2.,float(v)))

class AuxiliaryCuda:
    def __init__(self,device='cuda:0'):
        if device.startswith('cuda') and not torch.cuda.is_available():
            raise RuntimeError('CUDA was requested but no CUDA torch device is available')
        self.device=device
        self.geometry_steps=0
        self.latent_steps=0

    def geometry(self,state,samples,batch_size=128):
        if state.get('version')!=1 or not set(LANES).issubset(state['lanes']):
            raise ValueError('Invalid original geometry checkpoint')
        device=self.device
        lanes=state['lanes']
        shared={k:torch.nn.Parameter(tensor(state[k],device)) for k in ('T','A','bt')}
        local={w:{k:torch.nn.Parameter(tensor(v,device)) for k,v in lanes[w].items()} for w in LANES}
        params=list(shared.values())+[v for w in LANES for v in local[w].values()]
        batch_size=max(1,min(1024,int(batch_size)))
        groups=[]
        for ev in samples:
            world=ev['world'];held=bool(ev.get('heldout'));act=ev['action']
            if world not in LANES or not isinstance(act,int) or act not in range(ACT):
                raise ValueError('Invalid geometry world or action')
            for k in ('x','y','prev'):
                v=ev[k]
                if len(v)!=D or not all(math.isfinite(t) and abs(t)<1e5 for t in v):
                    raise ValueError('Invalid 5D observed vector')
            if not groups or groups[-1][0]!=(world,held) or len(groups[-1][1])>=batch_size:
                groups.append(((world,held),[]))
            groups[-1][1].append(ev)
        trained=0;evaled=0;t0=time.perf_counter()
        for (world,held),batch in groups:
            layer=local[world]
            X=tensor([v['x'] for v in batch],device)
            Y=tensor([v['y'] for v in batch],device)
            PREV=tensor([v['prev'] for v in batch],device)
            actions=torch.tensor([v['action'] for v in batch],device=device,dtype=torch.long)
            pl=torch.stack([X[:,i]*PREV[:,j]-X[:,j]*PREV[:,i]
                            for i in range(D) for j in range(i+1,D)],dim=1)
            Z=torch.tanh(X@layer['E'].T+pl@layer['P'].T+layer['be'])
            HIDDEN=torch.tanh(Z@shared['T'].T+shared['A'].T[actions]+shared['bt'])
            predicted=HIDDEN@layer['D'].T+layer['bd']
            reconstruction=Z@layer['D'].T+layer['bd']
            err=((predicted-Y)**2).mean(dim=1)
            baseline=((X-Y)**2).mean(dim=1)
            recon=((reconstruction-X)**2).mean(dim=1)
            stats=state['stats'][world];n=len(batch)
            if held:
                evaled+=n;stats['evalN']+=n
                stats['evalLossSum']+=float(err.detach().sum().cpu())
                stats['baselineLossSum']+=float(baseline.detach().sum().cpu())
            else:
                trained+=n;stats['trainN']+=n
                stats['trainLossSum']+=float(err.detach().sum().cpu())
                loss=err.mean()+float(state['recon'])*recon.mean()
                for p in params:p.grad=None
                loss.backward()
                with torch.no_grad():
                    for p in params:
                        if p.grad is not None:
                            decay=.00002*p if p.ndim==2 else 0
                            p.add_(torch.clamp(p.grad+decay,-3,3),alpha=-float(state['lr']))
                state['updates']+=n
                self.geometry_steps+=1
            j=-1
            stats['last']={'world':world,'heldout':held,'mse':float(err[j].detach().cpu()),
                'base':float(baseline[j].detach().cpu()),'recon':float(recon[j].detach().cpu()),
                'action':batch[j]['action'],
                'prediction':[bounded(a) for a in values(predicted[j])],
                'actual':[bounded(a) for a in values(Y[j])],
                'x':[bounded(a) for a in values(X[j])],
                'plucker':[bounded(a) for a in values(pl[j])],
                'latent':[bounded(a) for a in values(Z[j])],
                'projected':[bounded(a) for a in values(HIDDEN[j])]}
        for w in LANES:
            for k,p in local[w].items():lanes[w][k]=values(p)
        for k,p in shared.items():state[k]=values(p)
        if device.startswith('cuda'):torch.cuda.synchronize()
        peak=round(torch.cuda.max_memory_allocated(device)/1e9,4) if device.startswith('cuda') else 0.
        return {'state':state,'trained':trained,'evaluated':evaled,'device':device,
                'kernelGroups':len(groups),'elapsedMs':round(1000*(time.perf_counter()-t0),1),
                'peakVramGB':peak}

    def latent(self,state,samples):
        if state.get('version')!=1 or len(state.get('W',[]))!=32 or any(len(r)!=128 for r in state['W']):
            raise ValueError('Invalid original 32D goal-field checkpoint')
        device=self.device;W=tensor(state['W'],device)
        t0=time.perf_counter()
        for e in samples:
            if len(e.get('features',[]))!=128 or len(e.get('target',[]))!=32:
                raise ValueError('Expected 128D input and 32D target')
            X=tensor(e['features'],device);Y=tensor(e['target'],device)
            with torch.no_grad():
                error=W@X-Y
                loss=(error*error).mean()
                W.add_(torch.outer(error,X),alpha=-float(state['lr']))
            loss_value=float(loss.cpu());n=int(state['updates'])+1
            state['averageLoss']+=(loss_value-float(state['averageLoss']))/n
            state['lastLoss']=loss_value;state['updates']=n;self.latent_steps+=1
        state['W']=values(W)
        if device.startswith('cuda'):torch.cuda.synchronize()
        return {'state':state,'trained':len(samples),'device':device,
                'elapsedMs':round(1000*(time.perf_counter()-t0),1),
                'peakVramGB':round(torch.cuda.max_memory_allocated(device)/1e9,4) if device.startswith('cuda') else 0.}

    def status(self):
        return {'device':self.device,'torchCUDA':self.device.startswith('cuda') and torch.cuda.is_available(),
                'geometricKernelGroups':self.geometry_steps,'latentUpdates':self.latent_steps}
