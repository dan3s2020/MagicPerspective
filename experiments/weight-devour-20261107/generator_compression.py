"""Unsupervised two-generator search on the weight-derived algebra.
Only reads the stored tiny atlas (not the donor). Reconstructs all eight
operations from two generators and their discovered composition paths.
"""
import json
import numpy as np
from pathlib import Path
from itertools import combinations
import experiment as exp

root=Path(__file__).resolve().parent
w=json.loads((root/'weight_atlas.json').read_text())
a=exp.WeightAtlas();a.M=np.array(w['M']);a.b=np.array(w['b'])
C,_=a.composition_table()
I=np.eye(3)
H=np.zeros((8,3,3));H[:,2,2]=1;H[:,:2,:2]=a.M;H[:,:2,2]=a.b
identity=int(np.argmin(np.linalg.norm(H-I,axis=(1,2))))

records=[]
for i,j in combinations([x for x in range(8) if x!=identity],2):
    generators=(i,j);paths={identity:()};queue=[identity]
    while queue:
        current=queue.pop(0)
        for g in generators:
            nxt=int(C[current,g])
            if nxt not in paths:
                paths[nxt]=paths[current]+(g,);queue.append(nxt)
    if len(paths)!=8:continue
    recon={}
    residual=[]
    for k,word in paths.items():
        mat=I.copy()
        for op in word:mat=H[op]@mat
        recon[k]=mat
        residual.append(np.linalg.norm(mat-H[k]))
    records.append((float(np.mean(residual)),generators,paths,recon))
if not records:raise RuntimeError('No two-generator closure discovered')
records.sort(key=lambda x:x[0]);resid,gen,paths,recon=records[0]
compact=exp.WeightAtlas();compact.M=np.array([recon[i][:2,:2] for i in range(8)]);compact.b=np.array([recon[i][:2,2] for i in range(8)])
measured=exp.external_evaluate(compact,217)
print('identity',identity,'generators',gen,'mean reconstruction matrix delta',resid)
print('recipes',{str(k):list(map(int,recipe)) for k,recipe in sorted(paths.items())})
print('compact atlas single accuracy',measured['single_accuracy_l2_lt_0.10'],'seq 5',measured['composition_accuracy_l2_lt_0.10']['5'],'goals',measured['goals_solved_l2_lt_0.085'])
result={'identity_op':identity,'generator_ops':list(gen),'generator_matrices':[H[k].tolist() for k in gen],
        'recipes':{str(k):list(map(int,recipe)) for k,recipe in sorted(paths.items())},
        'mean_reconstruction_matrix_delta':resid,'measured':measured,
        'source':'only 48 coefficients of stored weight atlas, not donor weights or donor outputs',
        'stored_continuous_parameters':12,'original_donor_trainable_parameters':4730}
(root/'two_generator_result.json').write_text(json.dumps(result,indent=2,default=lambda o: o.item() if isinstance(o,np.generic) else str(o)))
