import json
import numpy as np
import torch
from pathlib import Path
import experiment as exp

runs=[]
for seed in [17,29,43,67,101]:
    donor,initial,history,sec=exp.train_donor(seed,1400,24)
    atlas=exp.WeightAtlas().meditate(exp.extract_weights(donor),seed=seed+99,dreams=256)
    results=exp.external_evaluate(atlas,seed+200)
    control=exp.Donor(24); control.load_state_dict(initial)
    random_atlas=exp.WeightAtlas().meditate(exp.extract_weights(control),seed=seed+99,dreams=256)
    random=exp.external_evaluate(random_atlas,seed+200)
    # extrapolation requires x beyond the training square for some components
    rng=np.random.default_rng(seed+404)
    angles=rng.uniform(0,2*np.pi,512); radii=rng.uniform(1.05,1.35,512)
    xx=np.stack([radii*np.cos(angles),radii*np.sin(angles)],axis=-1)
    kk=rng.integers(0,8,512)
    yy=np.einsum('nij,nj->ni',exp.MATS[kk],xx)
    yp=np.array([atlas.apply(k,x) for k,x in zip(kk,xx)])
    err=np.linalg.norm(yy-yp,axis=-1)
    fordream={}
    for n in [1,16,256]:
        a=exp.WeightAtlas().meditate(exp.extract_weights(donor),seed=seed+99,dreams=n)
        z=exp.external_evaluate(a,seed+200)
        fordream[str(n)]={'single_mean_l2':z['single_mean_l2'],'closure_residual_mean':z['closure_residual_mean'],'five_step_acc':z['composition_accuracy_l2_lt_0.10']['5']}
    runs.append({'seed':seed,'train_seconds':sec,'train_mse':history[-1]['mse'],
        'single_correct':int(results['single_accuracy_l2_lt_0.10']*512),
        'composition_5_correct':int(results['composition_accuracy_l2_lt_0.10']['5']*512),
        'table_correct':int(round(results['discovered_composition_match_to_d4']*64)),
        'goal_success':results['goals_solved_l2_lt_0.085'],
        'random_goal_success':random['goals_solved_l2_lt_0.085'],
        'ood_l2_mean':float(err.mean()),'ood_acc_l2_lt_0.10':float((err<.1).mean()),'dream_ablation':fordream})
    print('seed',seed,'single',runs[-1]['single_correct'],'seq5',runs[-1]['composition_5_correct'],'group',runs[-1]['table_correct'],'goals',runs[-1]['goal_success'],'rnd',runs[-1]['random_goal_success'],'ood',round(float(err.mean()),4),flush=True)
Path(__file__).resolve().parent/'robustness.json'.write_text(json.dumps(runs,indent=2,default=lambda o: o.item() if isinstance(o,np.generic) else str(o)))
