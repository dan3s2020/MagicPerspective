import json
from pathlib import Path
import experiment as ex
from nonlinear import train,LocalField,score
r=[]; expected=[0,2,1,4,3,6,5,7]
for seed in [17,29,43]:
    donor,init,history=train(seed,2200,32)
    weight=ex.extract_weights(donor)
    atlas=LocalField().meditate(weight,7)
    a=score(atlas,seed+101)
    avg=score(ex.WeightAtlas().meditate(weight,seed+99),seed+101)
    init_model=ex.Donor(32);init_model.load_state_dict(init)
    rand_atlas=LocalField().meditate(ex.extract_weights(init_model),7)
    random=score(rand_atlas,seed+101)
    inv=atlas.observe_inverse_closure(8,seed+102)
    inv_r=rand_atlas.observe_inverse_closure(8,seed+102)
    r.append({'seed':seed,'trained_loss':history[-1]['mse'],
            'field':a,'global_affine':avg,'random_weights':random,
            'inverses_found':sum(int(row['best_reverse']==expected[i]) for i,row in enumerate(inv)),
            'random_inverses_found':sum(int(row['best_reverse']==expected[i]) for i,row in enumerate(inv_r))})
    print('seed',seed,'field',a['accuracy_l2_lt_0.05'],'seq3',a['three_step_accuracy_l2_lt_0.10'],'inv',r[-1]['inverses_found'],'rand_inv',r[-1]['random_inverses_found'],flush=True)
Path(__file__).resolve().parent/'nonlinear_robustness.json'.write_text(json.dumps(r,indent=2))
