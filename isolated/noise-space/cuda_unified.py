"""One GPU process for unmodified V17 worlds/TextCard + isolated CUDA trainers.
All existing V17 command names are passed unchanged to the upstream Server.
"""
import json
import sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
GPU=(HERE/'../../v17/transcend/torus-aether/gpu').resolve()
sys.path.insert(0,str(GPU))
from worlds_gpu import Server as V17Server
from cuda_aux_models import AuxiliaryCuda

class UnifiedServer(V17Server):
    def __init__(self):
        super().__init__()
        self.aux=None

    def handle(self,request):
        name=request['cmd']
        if name=='init':
            info=super().handle(request)
            # The original Back object enforces real hardware, memory cap and
            # explicit numpy test mode. Never silently convert CUDA -> CPU.
            self.aux=AuxiliaryCuda(self.B.device if self.B.torch else 'cpu')
            info['auxiliary']=self.aux.status()
            return info
        if name in ('geometry_train','latent_train','aux_status'):
            if self.aux is None:
                raise RuntimeError('Initialize original V17 GPU before auxiliary training')
            if name=='aux_status':
                return self.aux.status()
            if self.B.device.startswith('cuda') and not self.aux.status()['torchCUDA']:
                raise RuntimeError('Auxiliary CUDA tensors are not on the requested device')
            if name=='geometry_train':
                return self.aux.geometry(request['state'],request['samples'],request.get('batchSize',128))
            return self.aux.latent(request['state'],request['samples'])
        return super().handle(request)

if __name__=='__main__':
    server=UnifiedServer()
    for line in sys.stdin:
        if not line.strip():continue
        request=None
        try:
            request=json.loads(line)
            response=server.handle(request)
        except Exception as exc:
            response={'error':f'{type(exc).__name__}: {exc}'}
        response['id']=request.get('id') if isinstance(request,dict) else None
        sys.stdout.write(json.dumps(response)+'\n')
        sys.stdout.flush()
