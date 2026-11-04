"""Matched-intervention perspective learner for the ONE persistent graph.

A 'self/world' boundary is not pre-labelled. The engine tests two available
interventions from the SAME PRE-action state and observes which publicly
observable features change with the action. The learned quantity is local
counterfactual action sensitivity, not consciousness or global control.

The shadow world is an independently stepped simulator copy; it is never
used for the main controller's action selection, reward target or gradient.
"""
from __future__ import annotations
from collections import defaultdict
import copy
import math


def feature_values(tokens, outcome=None):
    """Translate observed token strings to stable value-bearing channels.

    Works across V13 domains without giving the learner simulator `spec` or
    hidden truth. `outcome` is the simulator's reported result AFTER action.
    """
    result={}
    for token in tokens:
        if not isinstance(token,str):continue
        pieces=token.split('/')
        if len(pieces)>=3:
            result['/'.join(pieces[:-1])]=pieces[-1]
    if outcome is not None:
        result['FEEDBACK/effect']=str(outcome.get('effect','unknown'))
        result['FEEDBACK/reward']=str(round(float(outcome.get('reward',0)),2))
        # These are measured actor/environment interaction observations, not
        # hard-coded declarations of which variables belong to the 'self'.
    return result


class PerspectiveLearner:
    """Bayesian per-feature matched-action sensitivity estimates.

    Each sample is a genuine pair of simulator interventions starting at the
    same state but choosing different available actions. `different` counts
    contrasts, `same` counts invariants. Prior Beta(1,1) stays uncertain until
    enough evidence arrives. New experience updates the SAME global ledger.
    """
    def __init__(self,capacity=1024):
        self.capacity=capacity
        self.channels={}
        self.probes=0
        self.domains={}
        self.last=None

    def contrast(self, domain, action, alternative, actual_tokens, alternative_tokens,
                 actual_outcome, alternative_outcome, source=None):
        if action==alternative:raise ValueError('Counterfactual requires different actions')
        a=feature_values(actual_tokens,actual_outcome)
        b=feature_values(alternative_tokens,alternative_outcome)
        candidates=sorted(set(a)|set(b))
        comparisons=[]
        for channel in candidates:
            if channel not in self.channels and len(self.channels)>=self.capacity:
                continue
            record=self.channels.setdefault(channel,{'different':0,'same':0,'domains':{},'examples':[]})
            changed=a.get(channel,'<ABSENT>')!=b.get(channel,'<ABSENT>')
            record['different' if changed else 'same']+=1
            record['domains'][domain]=record['domains'].get(domain,0)+1
            # Store examples for causal trace; bounded and without hidden truth.
            example={'world':source,'action':action,'alternative':alternative,
                     'observed':a.get(channel,'<ABSENT>'),
                     'alternative_observed':b.get(channel,'<ABSENT>')}
            examples=record['examples']
            if changed and len(examples)<3:examples.append(example)
            n=record['different']+record['same']
            p=(record['different']+1)/(n+2)
            comparisons.append({'channel':channel,'different':changed,'trials':n,
                                'controllability':round(p,5),
                                'classification':'action-sensitive' if n>=5 and p>=.7 else
                                  'action-invariant' if n>=5 and p<=.3 else 'undetermined',
                                'observed':a.get(channel,'<ABSENT>'),
                                'alternative':b.get(channel,'<ABSENT>')})
        self.probes+=1
        self.domains[domain]=self.domains.get(domain,0)+1
        report={'schema':'portal.perspective.v1','method':'matched counterfactual intervention',
                'domain':domain,'actual_action':action,'alternative_action':alternative,
                'features':comparisons,'probe_index':self.probes,
                'note':'Action sensitivity inferred from a matched simulator experiment; not a predetermined self/world identity.'}
        self.last=report
        return report

    def state(self):
        return {'schema':1,'capacity':self.capacity,'channels':copy.deepcopy(self.channels),
                'probes':self.probes,'domains':dict(self.domains)}

    @classmethod
    def restore(cls, snapshot):
        p=cls(snapshot.get('capacity',1024))
        p.channels=copy.deepcopy(snapshot.get('channels',{}))
        p.probes=int(snapshot.get('probes',0))
        p.domains=dict(snapshot.get('domains',{}))
        return p

    def summary(self,limit=12):
        rows=[]
        for channel,record in self.channels.items():
            n=record['different']+record['same']
            p=(record['different']+1)/(n+2)
            # A posterior credible interval approximation is for information,
            # not a proof of causality outside the matched simulator tests.
            variance=(record['different']+1)*(record['same']+1)/((n+2)**2*(n+3))
            band=1.96*math.sqrt(variance)
            classification='action-sensitive' if n>=5 and p>=.7 else 'action-invariant' if n>=5 and p<=.3 else 'undetermined'
            rows.append({'channel':channel,'trials':n,'different':record['different'],
                         'controllability':round(p,5),
                         'uncertainty_95_approx':[round(max(0,p-band),4),round(min(1,p+band),4)],
                         'classification':classification,'domains':record['domains']})
        # Stable tie order; surface both action-sensitive and invariant channels.
        rows.sort(key=lambda v:(-v['trials'],v['channel']))
        best=sorted(rows,key=lambda v:(-(v['controllability']-.5)*v['trials'],v['channel']))[:limit//2]
        invariant=sorted(rows,key=lambda v:((v['controllability']-.5)*v['trials'],v['channel']))[:limit-len(best)]
        unique={r['channel']:r for r in best+invariant}
        return {'schema':'portal.perspective.v1','probes':self.probes,
                'channels_observed':len(self.channels),'domains':self.domains,
                'counts':{
                    'action-sensitive':sum(x['classification']=='action-sensitive' for x in rows),
                    'action-invariant':sum(x['classification']=='action-invariant' for x in rows),
                    'undetermined':sum(x['classification']=='undetermined' for x in rows)},
                'channels':list(unique.values())[:limit],
                'status':'observationally anchored, matched counterfactual simulator test',
                'limitation':'Changing outcome with action is evidence of controllability, NOT a proof of subjective self or global causation.'}
