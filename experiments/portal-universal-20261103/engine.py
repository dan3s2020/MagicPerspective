"""Persistent multi-world graph research engine (V10 experimental, no oracle action selection).
World truth stays in a simulator; graph receives observations and realized feedback.
"""
from __future__ import annotations
import hashlib
import copy
import json
import math
import random
import sqlite3
import threading
import time
from collections import deque
from pathlib import Path

import torch
from torch import nn
import torch.nn.functional as F

KINDS = ('maze3d', 'network', 'symbols', 'yesno', 'car', 'text')
DIM = 24
MAX_NODES = 32768
MAX_OBS = 24
MAX_ACTIONS = 8


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def fingerprint(obj):
    return hashlib.sha256(canonical(obj).encode('utf-8')).hexdigest()


def position(label):
    b = hashlib.sha256(label.encode('utf-8')).digest()
    angle = int.from_bytes(b[:4], 'little') / (2**32) * 2*math.pi
    z = int.from_bytes(b[4:8], 'little') / (2**32) * 2 - 1
    radius = 0.25 + 0.72 * int.from_bytes(b[8:12], 'little') / (2**32)
    s = math.sqrt(max(0, 1-z*z))
    return [round(radius*s*math.cos(angle), 5), round(radius*s*math.sin(angle), 5), round(radius*z, 5)]


class Graph:
    """One global persistent graph; nodes are observation/action/outcome/motif concepts."""
    def __init__(self, capacity=MAX_NODES):
        self.capacity = capacity
        self.nodes = []
        self.by_label = {}
        self.edges = {}  # (from,to,kind) -> {count, confirmed, amplitude}
        self.link_counts = {} # (from,to) -> maximum observed edge count, for fast local adjacency
        self.used_by_domain = {}
        self.growth_events = 0
        self.cross_domain_links = 0
        self.last_growth = []
        self.ensure('UNKNOWN', 'unknown', 'system')

    def ensure(self, label, role, domain):
        created = label not in self.by_label
        if label in self.by_label:
            i = self.by_label[label]
        else:
            if len(self.nodes) >= self.capacity:
                return 0, False
            i = len(self.nodes)
            self.by_label[label] = i
            self.nodes.append({'id':i,'label':label,'role':role,
                               'pos':position(label),'uses':0,'domains':[]})
            self.growth_events += 1
            self.last_growth.append(i)
        n=self.nodes[i]
        n['uses'] += 1
        if domain not in n['domains']: n['domains'].append(domain)
        return i, created

    def link(self, a, b, role, strength=1.0, domain=None):
        if a == b: return
        key = (int(a), int(b), role)
        v=self.edges.get(key)
        if v is None:
            v={'count':0,'strength':0.0,'domains':[]}
            self.edges[key]=v
        v['count']+=1
        self.link_counts[(int(a),int(b))]=max(self.link_counts.get((int(a),int(b)),0),v['count'])
        v['strength']+=float(strength)
        if domain and domain not in v['domains']:
            if len(v['domains'])==1:self.cross_domain_links += 1
            v['domains'].append(domain)

    def remember(self, domain, observed, action, effect, before_ids, after_ids):
        self.last_growth=[]
        world,_=self.ensure('WORLD/'+domain, 'world', domain)
        action_id,_=self.ensure('ACTION/'+action, 'action', domain)
        effect_id,_=self.ensure('EFFECT/'+effect, 'effect', domain)
        self.link(world,action_id,'candidate',domain=domain)
        self.link(action_id,effect_id,'produced',domain=domain)
        for v in before_ids:
            self.link(v,action_id,'influenced',domain=domain)
            self.link(world,v,'perceived',domain=domain)
        for v in after_ids:
            self.link(effect_id,v,'observed_after',domain=domain)
        # Generic result nodes are shared across domains; a concept is retained
        # only as a genuine repeatable observation-action-effect combination.
        motif='MOTIF/'+fingerprint({'a':action,'effect':effect,'common':sorted(self.nodes[i]['label'].split('/')[-1]
                    for i in before_ids if i<len(self.nodes) and self.nodes[i]['role']=='sensor')[:4]})[:20]
        motif_id,_=self.ensure(motif,'motif',domain)
        self.link(motif_id,effect_id,'predicts',domain=domain)
        self.link(action_id,motif_id,'recruits',domain=domain)
        return {'action_id':action_id,'effect_id':effect_id,'motif_id':motif_id,
                'born':self.last_growth[:],'node_count':len(self.nodes),'edge_count':len(self.edges)}

    def context(self, domain, observed, actions):
        born_start=len(self.nodes)
        world,_=self.ensure('WORLD/'+domain,'world',domain)
        ids=[world]
        for tag in observed[:MAX_OBS-1]:
            name = tag if tag.startswith('SHARED/') else ('OBS/'+tag)
            v,_=self.ensure(name,'sensor',domain)
            ids.append(v)
        action_ids=[]
        for a in actions[:MAX_ACTIONS]:
            i,_=self.ensure('ACTION/'+a,'action',domain)
            action_ids.append(i)
        # Existing learned links, never the hidden environment truth.
        matrix=[[0.0]*MAX_OBS for _ in range(MAX_OBS)]
        for i in range(MAX_OBS): matrix[i][i]=1.0 if i<len(ids) else 0.0
        pos_ids={v:i for i,v in enumerate(ids)}
        for ia,a in enumerate(ids):
            for ib,b in enumerate(ids):
                if ia==ib:continue
                count=self.link_counts.get((a,b),0)
                if count:matrix[ia][ib]=min(1.0,math.log1p(count)/4)
        born=list(range(born_start,len(self.nodes)))
        return ids+[0]*(MAX_OBS-len(ids)), action_ids+[0]*(MAX_ACTIONS-len(action_ids)), matrix, len(ids),len(action_ids),born

    def view(self, active=(), limit=350):
        # Stable positions; prioritize active nodes and well-used memories.
        keep=set(active)
        for n in sorted(self.nodes,key=lambda n:-n['uses']):
            if len(keep)>=limit:break
            keep.add(n['id'])
        nodes=[{'id':n['id'],'label':n['label'],'role':n['role'],'pos':n['pos'],
                'uses':n['uses'],'domains':n['domains']} for n in self.nodes if n['id'] in keep]
        edges=[]
        for (a,b,k),v in self.edges.items():
            if a in keep and b in keep:
                edges.append({'from':a,'to':b,'type':k,'weight':round(v['strength']/max(1,v['count']),5),
                              'count':v['count'],'domains':v['domains']})
        edges.sort(key=lambda e:-e['count'])
        return {'nodes':nodes,'edges':edges[:min(2000,len(edges))],
                'total_nodes':len(self.nodes),'total_edges':len(self.edges),
                'cross_domain_links':self.cross_domain_links,'capacity':self.capacity}

    def state(self):
        return {'capacity':self.capacity,'nodes':self.nodes,'edges':[
                [a,b,k,v] for (a,b,k),v in self.edges.items()],
                'growth_events':self.growth_events,'cross_domain_links':self.cross_domain_links}

    @classmethod
    def restore(cls, d):
        g=cls(d['capacity'])
        g.nodes=copy.deepcopy(d['nodes'])
        g.by_label={n['label']:n['id'] for n in g.nodes}
        g.edges={(int(a),int(b),k):copy.deepcopy(v) for a,b,k,v in d['edges']}
        g.link_counts={}
        for (a,b,k),v in g.edges.items():g.link_counts[(a,b)]=max(g.link_counts.get((a,b),0),v['count'])
        g.growth_events=d['growth_events']
        g.cross_domain_links=d.get('cross_domain_links',0)
        g.last_growth=[]
        return g


class GraphController(nn.Module):
    """Single trainable GNN parameter set reused without reset in ALL domains."""
    def __init__(self,capacity=MAX_NODES,dim=DIM):
        super().__init__()
        self.embedding=nn.Embedding(capacity,dim)
        self.self_layer=nn.Linear(dim,dim)
        self.msg_layer=nn.Linear(dim,dim,bias=False)
        self.context=nn.Linear(dim,dim)
        self.action=nn.Linear(dim,dim)
        self.value_bias=nn.Parameter(torch.zeros(1))
        nn.init.normal_(self.embedding.weight, std=.06)

    def forward(self, obs_ids, act_ids, adjacency, obs_mask, act_mask, trace=False):
        # shapes: [B,S], [B,A], [B,S,S], [B,S], [B,A]
        h=self.embedding(obs_ids)
        activations=[];signals=[]
        for _ in range(3):
            denom=adjacency.sum(-1,keepdim=True).clamp(min=1)
            agg=torch.bmm(adjacency,h)/denom
            if trace:
                source_magnitude=self.msg_layer(h).detach().norm(dim=-1)
                # Message from j to i; real contribution to the learned message transform.
                strength=adjacency*source_magnitude.unsqueeze(1)/denom
                signals.append(strength.detach().cpu())
            h=torch.tanh(self.self_layer(h)+self.msg_layer(agg))
            if trace:activations.append(h.detach().cpu())
        ctx=(h*obs_mask.unsqueeze(-1)).sum(1)/obs_mask.sum(1,keepdim=True).clamp(min=1)
        a=self.embedding(act_ids)
        scores=(self.context(ctx).unsqueeze(1)*self.action(a)).sum(-1)/math.sqrt(h.shape[-1])+self.value_bias
        scores=scores.masked_fill(act_mask==0,-1e5)
        return scores,activations,signals


def maze_world(seed):
    r=random.Random(seed)
    size=4
    cells=size**3
    def coords(i):return (i%size, i//size%size, i//(size*size))
    def at(x,y,z):return x+size*y+size*size*z
    moves=[('X+',1,0,0),('X-',-1,0,0),('Y+',0,1,0),('Y-',0,-1,0),('Z+',0,0,1),('Z-',0,0,-1)]
    adj={i:[] for i in range(cells)}
    for i in range(cells):
        x,y,z=coords(i)
        for _,dx,dy,dz in moves:
            xx,yy,zz=x+dx,y+dy,z+dz
            if min(xx,yy,zz)>=0 and max(xx,yy,zz)<size:adj[i].append(at(xx,yy,zz))
    # randomized spanning tree + extra passages, always connected
    begin=r.randrange(cells);seen={begin}; stack=[begin];edges=set()
    while stack:
        current=stack[-1];nexts=[u for u in adj[current] if u not in seen]
        if nexts:
            u=r.choice(nexts);edges.add(tuple(sorted((current,u))));seen.add(u);stack.append(u)
        else:stack.pop()
    for i in range(cells):
        for j in adj[i]:
            if j>i and r.random()<.09:edges.add((i,j))
    start=r.randrange(cells);goal=r.randrange(cells-1)
    if goal>=start:goal+=1
    return World('maze3d',seed,{'size':size,'edges':sorted(edges),'start':start,'goal':goal,'limit':30})


def network_world(seed):
    r=random.Random(seed);n=r.randint(9,16)
    edges={(min(i,(i+1)%n),max(i,(i+1)%n)):r.randint(1,5) for i in range(n)}
    for _ in range(n*2):
        a=r.randrange(n);b=r.randrange(n)
        if a!=b:edges[(min(a,b),max(a,b))]=r.randint(1,5)
    start=r.randrange(n);goal=(start+r.randrange(1,n))%n
    return World('network',seed,{'n':n,'edges':[[a,b,c] for (a,b),c in sorted(edges.items())],
                                 'start':start,'goal':goal,'limit':n*3})


def symbols_world(seed):
    r=random.Random(seed);mod=r.choice([31,37,41,43,47,53,59,61])
    start=r.randrange(mod);goal=r.randrange(mod)
    return World('symbols',seed,{'mod':mod,'start':start,'goal':goal,
                                 'limit':18})


def yesno_world(seed):
    r=random.Random(seed)
    bits=r.getrandbits(12)
    mask=r.randint(1,4095)
    flavor=r.choice(['parity','threshold','majority','implication'])
    offset=r.randint(0,12)
    truth=({'parity':lambda:((bits&mask).bit_count()+offset)%2==1,
            'threshold':lambda:(bits&mask).bit_count()>offset,
            'majority':lambda:(bits&mask).bit_count()*2>=mask.bit_count()+offset,
            'implication':lambda:not(bool(bits&mask)) or (bits.bit_count()>offset)}[flavor])()
    return World('yesno',seed,{'bits':bits,'mask':mask,'flavor':flavor,'offset':offset,'truth':bool(truth),'limit':1})


def car_world(seed):
    r=random.Random(seed)
    w=8;start=[r.randrange(w),r.randrange(w)];goal=[r.randrange(w),r.randrange(w)]
    while goal==start:goal=[r.randrange(w),r.randrange(w)]
    obstacles=set()
    for _ in range(8):
        p=(r.randrange(w),r.randrange(w))
        if list(p)!=start and list(p)!=goal:obstacles.add(p)
    return World('car',seed,{'w':w,'start':start,'goal':goal,'heading':r.randrange(4),
                             'obstacles':[list(x) for x in sorted(obstacles)],'limit':35})


def text_world(seed,corpus):
    r=random.Random(seed)
    if not corpus or len(corpus)<32:raise ValueError('Text requires a nonempty real corpus (>=32 bytes)')
    offset=r.randrange(8,len(corpus)-1)
    context=list(corpus[offset-8:offset]);target=corpus[offset]
    options={target}
    while len(options)<8:options.add(r.randrange(256))
    arr=list(options);r.shuffle(arr)
    return World('text',seed,{'context':context,'target':target,'options':arr,
                              'corpus_hash':getattr(corpus,'digest',hashlib.sha256(corpus).hexdigest() if isinstance(corpus,bytes) else 'unknown'),
                              'offset':offset,'limit':1})


class World:
    def __init__(self,kind,seed,spec):
        self.kind=kind;self.seed=seed;self.spec=spec
        # Source file offset and filename must not counterfeit a distinct text exercise.
        semantic={k:v for k,v in spec.items() if k not in ('offset','corpus_hash')} if kind=='text' else spec
        self.fingerprint=fingerprint({'kind':kind,'spec':semantic})
        self.t=0;self.done=False
        self.pos=(spec['start'][:] if isinstance(spec.get('start'),list) else spec.get('start',0))
        self.heading=spec.get('heading',0)
        self.last_effect='unknown'

    def observation(self):
        s=self.spec;k=self.kind;tok=['SHARED/episode','SHARED/goal_existence']
        if k=='maze3d':
            size=s['size'];x,y,z=self.pos%size,self.pos//size%size,self.pos//(size*size)
            gx,gy,gz=s['goal']%size,s['goal']//size%size,s['goal']//(size*size)
            tok+=['SHARED/pos/'+str(x),'SHARED/goal_dx/'+str(gx-x),'SHARED/goal_dy/'+str(gy-y),
                  'SHARED/goal_dz/'+str(gz-z),'MAZE/pos/'+str(self.pos)]
            ops=['X+','X-','Y+','Y-','Z+','Z-']
            for a in ops:tok.append('MAZE/sense/'+a+'/'+('open' if self._maze_dest(a) is not None else 'wall'))
        elif k=='network':
            ops=[]
            for a,b,c in s['edges']:
                if a==self.pos:ops.append((b,c))
                if b==self.pos:ops.append((a,c))
            ops.sort();ops=ops[:MAX_ACTIONS]
            self.choices=ops
            tok+=['NET/current/'+str(self.pos),'NET/degree/'+str(len(ops)),
                  'SHARED/goal_dx/'+str(s['goal']-self.pos)]
            for i,(dest,cost) in enumerate(ops):tok+=['NET/slot/'+str(i)+'/cost/'+str(cost),
                                                       'NET/slot/'+str(i)+'/dest/'+str(dest)]
            return tok,['EDGE/'+str(i) for i in range(len(ops))]
        elif k=='symbols':
            tok+=['SYMBOL/mod/'+str(s['mod']),'SYMBOL/value/'+str(self.pos),
                  'SYMBOL/goal/'+str(s['goal']),'SHARED/goal_dx/'+str(s['goal']-self.pos)]
            ops=['ADD1','SUB1','MUL2','XOR3','ADD3']
        elif k=='yesno':
            tok+=['BOOL/flavor/'+s['flavor'],'BOOL/mask/'+str(s['mask']),
                  'BOOL/bits/'+str(s['bits']),'BOOL/offset/'+str(s['offset'])]
            ops=['NO','YES']
        elif k=='car':
            x,y=self.pos;gx,gy=s['goal']
            tok+=['CAR/x/'+str(x),'CAR/y/'+str(y),'CAR/heading/'+str(self.heading),
                  'SHARED/goal_dx/'+str(gx-x),'SHARED/goal_dy/'+str(gy-y)]
            for delta,(dx,dy) in enumerate([(0,-1),(1,0),(0,1),(-1,0)]):
                nx,ny=x+dx,y+dy
                status='blocked' if (nx<0 or ny<0 or nx>=s['w'] or ny>=s['w'] or
                   [nx,ny] in s['obstacles']) else 'free'
                tok+=['CAR/sense/'+str(delta)+'/'+status]
            ops=['LEFT','FORWARD','RIGHT','REVERSE']
        elif k=='text':
            tok+=['TEXT/context/'+str(i)+'/'+str(v) for i,v in enumerate(s['context'])]
            ops=['BYTE/'+str(x) for x in s['options']]
        else: raise ValueError('unknown domain')
        return tok[:MAX_OBS],ops

    def _maze_dest(self,a):
        d={'X+':(1,0,0),'X-':(-1,0,0),'Y+':(0,1,0),'Y-':(0,-1,0),'Z+':(0,0,1),'Z-':(0,0,-1)}[a]
        s=self.spec['size'];x,y,z=self.pos%s,self.pos//s%s,self.pos//(s*s)
        xx,yy,zz=x+d[0],y+d[1],z+d[2]
        if min(xx,yy,zz)<0 or max(xx,yy,zz)>=s:return None
        v=xx+s*yy+s*s*zz
        return v if tuple(sorted((self.pos,v))) in map(tuple,self.spec['edges']) else None

    def step(self,action):
        if self.done:raise RuntimeError('world already completed')
        s=self.spec;k=self.kind;self.t+=1
        before=self.pos[:] if isinstance(self.pos,list) else self.pos
        blocked=False;reward=-.04;effect='moved'
        if k=='maze3d':
            v=self._maze_dest(action)
            if v is None: blocked=True
            else:self.pos=v
        elif k=='network':
            idx=int(action.split('/')[-1])
            if 0<=idx<len(self.choices):self.pos,cost=self.choices[idx];reward=-.01*cost
            else:blocked=True
        elif k=='symbols':
            mod=s['mod'];a=int(self.pos)
            self.pos={'ADD1':lambda:a+1,'SUB1':lambda:a-1,'MUL2':lambda:a*2,
                      'XOR3':lambda:a^3,'ADD3':lambda:a+3}[action]()%mod
        elif k=='yesno':
            reward=1.0 if (action=='YES')==s['truth'] else -1.0
            effect='correct' if reward>0 else 'incorrect';self.done=True
        elif k=='car':
            self.heading=(self.heading+{'LEFT':-1,'RIGHT':1,'FORWARD':0,'REVERSE':2}[action])%4
            dx,dy=[(0,-1),(1,0),(0,1),(-1,0)][self.heading]
            nx,ny=self.pos[0]+dx,self.pos[1]+dy
            if min(nx,ny)<0 or max(nx,ny)>=s['w'] or [nx,ny] in s['obstacles']:blocked=True
            else:self.pos=[nx,ny]
        elif k=='text':
            reward=1.0 if int(action.split('/')[-1])==s['target'] else -1.0
            effect='correct' if reward>0 else 'incorrect';self.done=True
        if blocked:reward=-.6;effect='blocked'
        if not self.done and k not in ('yesno','text'):
            if self.pos==s['goal']:reward=1.0;effect='goal';self.done=True
        if self.t>=s['limit']:self.done=True
        self.last_effect=effect
        return {'before':before,'after':self.pos,'effect':effect,'reward':reward,
                'done':self.done,'goal':effect=='goal','t':self.t}


def build_world(kind,seed,corpus=None):
    return {'maze3d':lambda:maze_world(seed),'network':lambda:network_world(seed),
            'symbols':lambda:symbols_world(seed),'yesno':lambda:yesno_world(seed),
            'car':lambda:car_world(seed),'text':lambda:text_world(seed,corpus)}[kind]()


class PortalEngine:
    def __init__(self,folder,device='cpu',capacity=MAX_NODES,corpus=None):
        self.folder=Path(folder);self.folder.mkdir(parents=True,exist_ok=True)
        self.device=torch.device(device)
        if self.device.type=='cuda' and not torch.cuda.is_available():raise RuntimeError('CUDA not actually available')
        self.db=sqlite3.connect(self.folder/'experience.sqlite',timeout=30,check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS worlds(hash TEXT PRIMARY KEY, domain TEXT, seed INTEGER)')
        self.db.execute('CREATE TABLE IF NOT EXISTS episodes(id INTEGER PRIMARY KEY AUTOINCREMENT, world_hash TEXT, domain TEXT, steps INTEGER, reward REAL, success INTEGER)')
        self.db.execute('CREATE TABLE IF NOT EXISTS trace(id INTEGER PRIMARY KEY AUTOINCREMENT, episode INTEGER, frame TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT)')
        self.db.commit()
        self.graph=Graph(capacity)
        self.model=GraphController(capacity).to(device)
        self.optimizer=torch.optim.AdamW(self.model.parameters(),lr=.001)
        self.seq=0
        self.episodes=0
        self.steps=0
        self.error_mean=0.0
        self.loss_mean=0.0
        self.last_trace=None
        self.history=deque(maxlen=200)
        self.corpus=corpus
        self._restore()

    def _meta_get(self,k,default):
        r=self.db.execute('SELECT v FROM meta WHERE k=?',(k,)).fetchone()
        return json.loads(r[0]) if r else default

    def _meta_set(self,k,value):
        self.db.execute('INSERT OR REPLACE INTO meta(k,v) VALUES(?,?)',(k,canonical(value)))

    def _restore(self):
        p=self.folder/'brain.pt'
        if p.exists():
            ck=torch.load(p,map_location=self.device,weights_only=False)
            self.model.load_state_dict(ck['model']);self.optimizer.load_state_dict(ck['optimizer'])
            self.graph=Graph.restore(ck['graph'])
            self.steps=ck['steps'];self.episodes=ck['episodes'];self.loss_mean=ck.get('loss_mean',0.0)
            self.error_mean=ck.get('error_mean',0.0)
        self.seq=self._meta_get('seq',0)

    def save(self):
        p=self.folder/'brain.pt';tmp=self.folder/'brain.pt.tmp'
        torch.save({'model':self.model.state_dict(),'optimizer':self.optimizer.state_dict(),
                    'graph':self.graph.state(),'steps':self.steps,'episodes':self.episodes,
                    'loss_mean':self.loss_mean,'error_mean':self.error_mean},tmp)
        tmp.replace(p)
        self._meta_set('seq',self.seq);self.db.commit()
        return str(p)

    def new_world(self,kind):
        for _ in range(1000):
            seed=self.seq;self.seq+=1
            world=build_world(kind,seed,corpus=self.corpus)
            result=self.db.execute('INSERT OR IGNORE INTO worlds(hash,domain,seed) VALUES(?,?,?)',
                                   (world.fingerprint,kind,seed))
            if result.rowcount==1:
                return world
        raise RuntimeError('Cannot find a new unique task after 1000 attempts; domain may be saturated')

    def _batch(self,worlds):
        contexts=[];stored=[]
        for w in worlds:
            obs,actions=w.observation()
            ids,act_ids,adj,ns,na,born=self.graph.context(w.kind,obs,actions)
            contexts.append((ids,act_ids,adj,ns,na,born))
            stored.append((obs,actions,ids[:ns]))
        ids=torch.tensor([c[0] for c in contexts],device=self.device,dtype=torch.long)
        acts=torch.tensor([c[1] for c in contexts],device=self.device,dtype=torch.long)
        adj=torch.tensor([c[2] for c in contexts],device=self.device,dtype=torch.float32)
        mask=torch.tensor([[int(j<c[3]) for j in range(MAX_OBS)] for c in contexts],device=self.device)
        amask=torch.tensor([[int(j<c[4]) for j in range(MAX_ACTIONS)] for c in contexts],device=self.device)
        return (ids,acts,adj,mask,amask),stored,contexts

    def step_many(self,worlds,epsilon=.18,record=True):
        if not worlds:return []
        batch,stored,contexts=self._batch(worlds)
        self.model.train()
        logits,acts,signals=self.model(*batch,trace=record)
        with torch.no_grad():
            probabilities=F.softmax(logits,dim=1).cpu().tolist()
        rng=random.Random((self.steps+1)*113)
        picks=[];rewards=[];truth=[];outcomes=[];errors=[];frame=[]
        for i,w in enumerate(worlds):
            obs,actions,ids=stored[i]
            p=probabilities[i][:len(actions)]
            selected=rng.randrange(len(actions)) if rng.random()<epsilon else max(range(len(actions)),key=lambda j:p[j])
            # predicted outcome confidence is neural score of the chosen action
            pred=torch.sigmoid(logits[i,selected]).detach().item()
            result=w.step(actions[selected])
            target=(result['reward']+1)/2
            target=max(0.0,min(1.0,target))
            picks.append(selected);rewards.append(target);outcomes.append(result)
            errors.append(abs(pred-target))
            observed_next,_=w.observation() if not w.done else ([],[])
            growth_start=len(self.graph.nodes)
            # Grow the same graph from actual experience, never from hidden state.
            after_ids=[]
            for tag in observed_next[:MAX_OBS-1]:
                node,_=self.graph.ensure(tag if tag.startswith('SHARED/') else 'OBS/'+tag,'sensor',w.kind)
                after_ids.append(node)
            growth=self.graph.remember(w.kind,obs,actions[selected],result['effect'],ids,after_ids)
            growth['born']=list(dict.fromkeys(contexts[i][5]+list(range(growth_start,len(self.graph.nodes)))))
            step_frame={'domain':w.kind,'seed':w.seed,'world_hash':w.fingerprint,'step':w.t,
                        'observed':obs,'action':actions[selected],
                        'prediction':round(pred,6),'reward':result['reward'],
                        'target':round(target,6),'error':round(abs(pred-target),6),
                        'actual':result,'active':ids+[contexts[i][1][selected]],
                        'probabilities':[{'action':a,'prob':round(p[j],5)} for j,a in enumerate(actions)],
                        'growth':growth,'device':str(self.device)}
            if record:
                step_frame['activations']=[{'round':round_i+1,'nodes':[
                    {'id':ids[j],'amplitude':round(float(acts[round_i][i,j].abs().mean()),5)}
                    for j in range(contexts[i][3])]} for round_i in range(len(acts))]
                step_frame['messages']=[{'from':contexts[i][0][b],'to':contexts[i][0][a],
                    'round':r+1,'strength':round(float(signals[r][i,a,b]),6)}
                    for r in range(len(signals)) for a in range(contexts[i][3]) for b in range(contexts[i][3])
                    if a!=b and contexts[i][2][a][b]>0][:150]
            frame.append(step_frame)
        chosen=logits.gather(1,torch.tensor(picks,dtype=torch.long,device=self.device).unsqueeze(-1)).squeeze(-1)
        targets=torch.tensor(rewards,dtype=torch.float32,device=self.device)
        # Predict the quality of REAL executed choices. The world reports targets only afterwards.
        loss=F.binary_cross_entropy_with_logits(chosen,targets)
        self.optimizer.zero_grad(set_to_none=True);loss.backward()
        grad_norm=float(torch.nn.utils.clip_grad_norm_(self.model.parameters(),2.0))
        before=self.model.context.weight.detach().clone()
        self.optimizer.step()
        update_norm=float((self.model.context.weight.detach()-before).norm())
        self.steps+=len(worlds)
        self.loss_mean=loss.item() if self.steps==len(worlds) else .98*self.loss_mean+.02*loss.item()
        self.error_mean=sum(errors)/len(errors) if self.steps==len(worlds) else .98*self.error_mean+.02*sum(errors)/len(errors)
        for i,entry in enumerate(frame):
            entry.update({'update_norm':round(update_norm,8),'gradient_norm':round(grad_norm,7),
                          'loss':round(loss.item(),7),'global_step':self.steps,
                          'event_seq':self.steps-len(worlds)+i+1})
        if record:
            self.last_trace=frame[-1]
            self.history.extend(frame)
        return frame

    def episode_many(self,domains,batch_size=8,epsilon=.18,capture=True):
        if not domains:raise ValueError('Choose at least one world domain')
        if 'text' in domains and self.corpus is None:raise ValueError('Text corpus not loaded')
        selected=[domains[(self.episodes+j)%len(domains)] for j in range(batch_size)]
        worlds=[self.new_world(k) for k in selected]
        accumulated={w.fingerprint:0.0 for w in worlds}
        while any(not w.done for w in worlds):
            active=[w for w in worlds if not w.done]
            frames=self.step_many(active,epsilon,capture)
            for w,f in zip(active,frames):accumulated[w.fingerprint]+=f['reward']
            if capture:
                for f in frames:
                    self.db.execute('INSERT INTO trace(episode,frame) VALUES(?,?)',(self.episodes+1,canonical(f)))
        for w in worlds:
            success=(w.last_effect in ('goal','correct'))
            self.db.execute('INSERT INTO episodes(world_hash,domain,steps,reward,success) VALUES(?,?,?,?,?)',
                            (w.fingerprint,w.kind,w.t,accumulated[w.fingerprint],int(success)))
        self.episodes+=len(worlds)
        self._meta_set('seq',self.seq)
        self.db.commit()
        return {'episodes':len(worlds),'steps':sum(w.t for w in worlds),
                'successes':sum(w.last_effect in ('goal','correct') for w in worlds),
                'loss':self.loss_mean,'error':self.error_mean}

    def status(self):
        created=self.db.execute('SELECT COUNT(*) FROM worlds').fetchone()[0]
        unique=self.db.execute('SELECT COUNT(DISTINCT world_hash) FROM episodes').fetchone()[0]
        rows=self.db.execute('SELECT domain,COUNT(*),AVG(success) FROM episodes GROUP BY domain').fetchall()
        return {'device':str(self.device),'cuda':self.device.type=='cuda','steps':self.steps,
                'episodes':self.episodes,'unique_worlds_verified_sqlite':unique,'unique_worlds_created':created,'next_seed':self.seq,
                'loss':round(self.loss_mean,6),'prediction_error':round(self.error_mean,6),
                'graph':{'nodes':len(self.graph.nodes),'edges':len(self.graph.edges),
                         'growth_events':self.graph.growth_events,'cross_domain_links':self.graph.cross_domain_links,
                         'capacity':self.graph.capacity},
                'domains':{k:{'episodes':c,'success_rate':round(s or 0,4)} for k,c,s in rows},
                'last':self.last_trace}

    def recent(self,limit=20):
        rows=self.db.execute('SELECT frame FROM trace ORDER BY id DESC LIMIT ?', (max(1,min(1000,limit)),)).fetchall()
        return [json.loads(r[0]) for r in reversed(rows)]

    def evaluate(self, domains=None, count=24, seed=2000000000):
        """Blind held-out worlds: frozen existing controller vs fresh untrained control.
        No graph/checkpoint/replay mutations in the actual learner. No hidden oracle plan.
        """
        domains=domains or ['maze3d','network','symbols','yesno','car']
        if any(k not in KINDS for k in domains):raise ValueError('Unknown evaluation world')
        if 'text' in domains and self.corpus is None:raise ValueError('Text corpus is not available')
        if not 1<=count<=128:raise ValueError('Evaluation count must be between 1 and 128')
        trained_graph=Graph.restore(self.graph.state())
        new_graph=Graph(self.graph.capacity)
        baseline_model=GraphController(self.graph.capacity).to(self.device)
        results={}
        def measure(model,graph):
            successes=0;total=0;reward_total=0.;per_domain={}
            model.eval()
            with torch.no_grad():
                for i in range(count):
                    kind=domains[i%len(domains)]
                    world=build_world(kind,seed+i*7919,self.corpus)
                    reward=0.;last=None
                    while not world.done:
                        obs,opts=world.observation()
                        ids,act_ids,adj,n,m,_=graph.context(kind,obs,opts)
                        d=self.device
                        logits,_,_=model(torch.tensor([ids],dtype=torch.long,device=d),
                              torch.tensor([act_ids],dtype=torch.long,device=d),
                              torch.tensor([adj],dtype=torch.float32,device=d),
                              torch.tensor([[int(j<n) for j in range(MAX_OBS)]],device=d),
                              torch.tensor([[int(j<m) for j in range(MAX_ACTIONS)]],device=d))
                        selected=int(logits[0,:m].argmax().item())
                        event=world.step(opts[selected]);reward+=event['reward'];last=event
                    solved=world.last_effect in ('goal','correct')
                    successes+=int(solved);total+=1;reward_total+=reward
                    per_domain.setdefault(kind,[]).append(int(solved))
            return {'worlds':total,'success':round(successes/total,4),'mean_reward':round(reward_total/total,4),
                    'by_domain':{k:round(sum(v)/len(v),4) for k,v in per_domain.items()}}
        results['trained_shared']=measure(self.model,trained_graph)
        results['untrained_control']=measure(baseline_model,new_graph)
        return {'heldout_seed':seed,'count':count,'domains':domains,
                'trained':results['trained_shared'],'untrained':results['untrained_control'],
                'note':'Comparaison without optimizer changes. Not yet a causal cross-domain-transfer ablation.'}

    def close(self):
        self.save();self.db.close()
