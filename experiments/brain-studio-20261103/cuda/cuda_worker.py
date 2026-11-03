#!/usr/bin/env python3
"""CUDA-only batched Graph Cells training. Simulators and policy tensors live on GPU.
Separate GPU-native maze, network and modular-symbolic world families; these are
not byte-identical replacements for the historic JS simulator generators.
JSON checkpoint format is exactly the JS GraphCellsBrain parameter/Adam schema.
"""
import argparse
import json
import math
import os
import random
import sys
import threading
import time
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError as error:
    raise SystemExit("PyTorch missing. Run START_MAGIC_CUDA.ps1 first: " + str(error))

N = 81
SIDE = 9
ACTIONS = 5
CHANNELS = 8
ROUNDS = 3
DOMAINS = ("maze", "network", "text")
SHAPES = {
    "in": (8, 9), "bias": (8,), "self": (8,), "message": (8,),
    "stepBias": (8,), "readCurrent": (8,), "readTarget": (8,),
    "action": (5,), "outBias": (1,), "cost": (1,),
    "revisit": (1,), "unknown": (1,)
}
DATA_DIR = Path(__file__).resolve().parent / "data"
LIVE = DATA_DIR / "cuda-live.json"

def utc():
    return datetime.now(timezone.utc).isoformat()

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temp, path)

def valid_snapshot(s):
    if not isinstance(s, dict) or s.get("schema") != 1 or s.get("architecture") != "graph-cells":
        raise ValueError("Expected a GraphCellsBrain checkpoint; never convert another architecture.")
    for key, shape in SHAPES.items():
        arr = s.get("parameters", {}).get(key)
        length = math.prod(shape)
        if not isinstance(arr, list) or len(arr) != length or not all(
            isinstance(x, (int, float)) and math.isfinite(x) for x in arr
        ):
            raise ValueError("Invalid GPU checkpoint tensor " + key)
    return s

class Cells(nn.Module):
    def __init__(self, snapshot, device):
        super().__init__()
        s = valid_snapshot(snapshot)
        self.device_name = device
        self.p = nn.ParameterDict({
            k: nn.Parameter(torch.tensor(s["parameters"][k], device=device,
                dtype=torch.float32).reshape(shape))
            for k, shape in SHAPES.items()
        })
        self.optimizer = torch.optim.Adam(self.p.values(), lr=0.004)
        self.episodes = int(s.get("episodes", 0))
        self.samples = int(s.get("samples", 0))
        self.steps = int(s.get("steps", 0))
        self.seed = int(s.get("seed", 19))
        self.domains = {k: int((s.get("domainCounts") or {}).get(k, 0)) for k in DOMAINS}
        for k, param in self.p.items():
            state = self.optimizer.state[param]
            state["step"] = torch.tensor(float(self.steps), device="cpu")
            state["exp_avg"] = torch.tensor((s.get("m") or {}).get(k, [0.] * param.numel()),
                dtype=torch.float32, device=device).reshape(param.shape)
            state["exp_avg_sq"] = torch.tensor((s.get("v") or {}).get(k, [0.] * param.numel()),
                dtype=torch.float32, device=device).reshape(param.shape)
    def snapshot(self):
        if self.device_name.type == "cuda":
            torch.cuda.synchronize()
        parameters = {k: p.detach().flatten().cpu().tolist() for k, p in self.p.items()}
        m = {k: self.optimizer.state[p]["exp_avg"].detach().flatten().cpu().tolist()
            for k, p in self.p.items()}
        v = {k: self.optimizer.state[p]["exp_avg_sq"].detach().flatten().cpu().tolist()
            for k, p in self.p.items()}
        return dict(schema=1, architecture="graph-cells", seed=self.seed,
            episodes=self.episodes, samples=self.samples, steps=self.steps,
            domainCounts=self.domains.copy(), parameters=parameters, m=m, v=v,
            lastLearning={"backend": "torch-cuda", "steps": self.steps})
    def forward_graph(self, features, observed):
        p = self.p
        hidden = torch.tanh(F.linear(features, p["in"], p["bias"]))
        layers = [hidden]
        degree = observed.sum(-1, keepdim=True).clamp(min=1)
        for _ in range(ROUNDS):
            aggregate = torch.bmm(observed, hidden) / degree
            hidden = torch.tanh(hidden * p["self"] +
                aggregate * p["message"] + p["stepBias"])
            layers.append(hidden)
        return layers
    def scores(self, layers, current, destinations, costs, revisit, valid):
        p = self.p
        b = current.shape[0]
        idx = torch.arange(b, device=current.device)
        h = layers[-1]
        own = h[idx, current]
        known = destinations >= 0
        target = h[idx[:, None], destinations.clamp(min=0)] * known.unsqueeze(-1)
        logits = ((own * p["readCurrent"]).sum(-1).unsqueeze(1) +
            (target * p["readTarget"]).sum(-1) + p["action"].unsqueeze(0) +
            p["outBias"][0] + p["cost"][0] * costs +
            p["revisit"][0] * revisit + p["unknown"][0] * (~known).float())
        return logits.masked_fill(~valid, -1e6)

class Batch:
    def __init__(self, batch, domains, seed, device):
        self.B = batch
        self.device = device
        self.n = N
        self.index = torch.arange(batch, device=device)
        torch.manual_seed(int(seed) & 0x7fffffff)
        self.labels = [domains[i % len(domains)] for i in range(batch)]
        self.dom = torch.tensor([DOMAINS.index(x) for x in self.labels],
            device=device, dtype=torch.long)
        self.maze = self.dom == 0
        self.network = self.dom == 1
        self.text = self.dom == 2
        node = torch.arange(N, device=device)
        xi, yi = node % SIDE, node // SIDE
        near = (((node[:, None] - node[None, :]).abs() == 1) &
            (yi[:, None] == yi[None, :])) | (
            (node[:, None] - node[None, :]).abs() == SIDE)
        floors = torch.rand(batch, N, device=device) > .25
        # Two distinct guaranteed corridors; additional openings differ per world.
        orientation = torch.rand(batch, 1, device=device) < .5
        corridor_a = (yi == 0) | (xi == SIDE - 1)
        corridor_b = (xi == 0) | (yi == SIDE - 1)
        floors |= torch.where(orientation, corridor_a, corridor_b)
        maze_adj = near.unsqueeze(0) & floors[:, :, None] & floors[:, None, :]
        links = torch.rand(batch, N, N, device=device) < .062
        links = torch.triu(links, diagonal=1)
        links = links | links.transpose(1, 2)
        chain = torch.diag(torch.ones(N-1, dtype=torch.bool, device=device), 1)
        chain = chain | chain.T
        net_adj = links | chain
        self.truth = torch.where(self.maze[:, None, None], maze_adj, net_adj)
        self.truth &= ~self.text[:, None, None]
        random_cost = 1 + 2.5 * torch.rand(batch, N, N, device=device)
        self.costs = torch.where(self.maze[:, None, None],
            torch.ones_like(random_cost), random_cost)
        coords = torch.stack((xi.float() / (SIDE - 1), yi.float() / (SIDE - 1)), -1)
        self.pos = coords.unsqueeze(0).expand(batch, -1, -1).clone()
        netpos = torch.rand(batch, N, 2, device=device)
        self.pos = torch.where(self.network[:, None, None], netpos, self.pos)
        self.start = torch.zeros(batch, dtype=torch.long, device=device)
        text_start = torch.randint(0, 49, (batch,), device=device)
        self.start = torch.where(self.text, text_start, self.start)
        self.goal = torch.full_like(self.start, N - 1)
        text_goal = (text_start + torch.randint(1, 49, (batch,), device=device)) % 49
        self.goal = torch.where(self.text, text_goal, self.goal)
        self.current = self.start.clone()
        self.visits = torch.zeros(batch, N, device=device)
        self.visits[self.index, self.current] = 1
        self.seen = torch.zeros(batch, N, dtype=torch.bool, device=device)
        self.seen[self.index, self.current] = True
        self.seen[self.index, self.goal] = True
        self.observed = torch.zeros(batch, N, N, device=device)
        self.transition_memory = torch.full((batch, N, ACTIONS), -1,
            device=device, dtype=torch.long)
        self.rule_shift = torch.randint(2, 7, (batch,), device=device)
        self.finished = self.start == self.goal
        self.walked = [self.start.clone()]
        self.total_cost = torch.zeros(batch, device=device)
        self.total_reward = torch.zeros(batch, device=device)
    def sense(self):
        row = self.truth[self.index, self.current]
        row = row & ~self.text[:, None]
        self.observed[self.index, self.current] = torch.maximum(
            self.observed[self.index, self.current], row.float())
        self.observed[self.index, :, self.current] = torch.maximum(
            self.observed[self.index, :, self.current], row.float())
        self.seen |= row
        self.seen[self.index, self.current] = True
    def features(self):
        here = self.pos[self.index, self.current]
        goal = self.pos[self.index, self.goal]
        delta = goal[:, None, :] - self.pos
        node = torch.arange(N, device=self.device)[None, :]
        return torch.stack([
            torch.ones(self.B, N, device=self.device),
            self.pos[:, :, 0], self.pos[:, :, 1],
            delta[:, :, 0], delta[:, :, 1],
            (self.visits / 12).clamp(max=1),
            (node == self.current[:, None]).float(),
            (node == self.goal[:, None]).float(),
            self.seen.float()
        ], -1) * self.seen.unsqueeze(-1).float()
    def candidates(self):
        row = self.truth[self.index, self.current] & ~self.text[:, None]
        order = torch.arange(N, device=self.device).float().unsqueeze(0)
        ranks = torch.where(row, -order, torch.full_like(order, -1e6))
        values, ids = ranks.topk(ACTIONS, dim=1)
        valid = (values > -1e5) | self.text[:, None]
        known = self.transition_memory[self.index, self.current]
        ids = torch.where(self.text[:, None], known, ids)
        ids = torch.where(valid, ids, torch.full_like(ids, -1))
        dest = ids.clamp(min=0)
        c = self.costs[self.index[:, None], self.current[:, None], dest]
        costs = torch.where(self.text[:, None], torch.ones_like(c), c) / 12
        revisit = (self.visits[self.index[:, None], dest] / 12).clamp(max=2)
        revisit = torch.where(ids >= 0, revisit, torch.zeros_like(revisit))
        return ids, costs, revisit, valid
    def step(self, selected, target, selected_cost, active):
        prev = self.current.clone()
        r, b = prev // 7, prev % 7
        text_actions = torch.stack([
            ((r + 1) % 7) * 7 + b,
            r * 7 + (b + 1) % 7,
            b * 7 + r,
            ((r + self.rule_shift) % 7) * 7 + b,
            r * 7 + (b + self.rule_shift) % 7
        ], -1)
        text_next = text_actions.gather(1, selected[:, None]).squeeze(1)
        actual = torch.where(self.text, text_next, target.clamp(min=0))
        actual = torch.where(active, actual, prev)
        self.transition_memory[self.index, prev, selected] = torch.where(
            self.text & active, actual,
            self.transition_memory[self.index, prev, selected])
        self.observed[self.index, prev, actual] = torch.where(
            self.text & active, torch.ones_like(selected_cost),
            self.observed[self.index, prev, actual])
        self.observed[self.index, actual, prev] = torch.where(
            self.text & active, torch.ones_like(selected_cost),
            self.observed[self.index, actual, prev])
        old_pos = self.pos[self.index, prev]
        new_pos = self.pos[self.index, actual]
        goal_pos = self.pos[self.index, self.goal]
        distance_old = (old_pos - goal_pos).square().sum(-1).sqrt()
        distance_new = (new_pos - goal_pos).square().sum(-1).sqrt()
        repeat = self.visits[self.index, actual]
        success = (actual == self.goal) & active
        measured_cost = torch.where(self.text, torch.ones_like(selected_cost),
            selected_cost * 12)
        reward = (2 * (distance_old - distance_new) -
            .035 * measured_cost - .045 * repeat + 1.8 * success.float()) * active
        self.current = actual
        self.visits[self.index, actual] += active.float()
        self.seen[self.index, actual] = True
        self.finished |= success
        self.total_cost += measured_cost * active
        self.total_reward += reward
        self.walked.append(actual.clone())
        return reward, success, measured_cost

def oracle_path(adj, start, goal):
    links = [set() for _ in range(adj.shape[0])]
    for a, b in adj.nonzero().tolist():
        links[a].add(b)
    queue = deque([start])
    prev = {start: None}
    while queue:
        node = queue.popleft()
        if node == goal:
            break
        for other in links[node]:
            if other not in prev:
                prev[other] = node
                queue.append(other)
    if goal not in prev:
        return []
    route, node = [], goal
    while node is not None:
        route.append(node)
        node = prev[node]
    return route[::-1]

def make_trace(batch, records, model, index, loss, weight_delta, decision_weights):
    """Only record actually executed GPU transitions and pre-action activations.
    The oracle graph is serialized after execution, never used for the policy.
    """
    if not records:
        return None
    idx = min(max(int(index), 0), batch.B-1)
    domain = batch.labels[idx]
    pos = batch.pos[idx].detach().cpu().tolist()
    truth = batch.truth[idx].detach().cpu()
    truth_edges = [{"a": a, "b": b, "open": True}
        for a, b in truth.nonzero().tolist() if a < b]
    start = int(batch.start[idx].item())
    goal = int(batch.goal[idx].item())
    # Symbolic worlds have a hidden shift and a directed transformation graph.
    if domain == "text":
        shift = int(batch.rule_shift[idx].item())
        truth_edges = []
        for node in range(49):
            r, b = node // 7, node % 7
            for tool, dest in enumerate([
                ((r+1)%7)*7+b, r*7+(b+1)%7, b*7+r,
                ((r+shift)%7)*7+b, r*7+(b+shift)%7]):
                truth_edges.append({"a": node, "b": dest, "action": tool, "open": True})
        oracle = [[] for _ in range(N)]
        for edge in truth_edges:
            oracle[edge["a"]].append(edge["b"])
        queue, prev = deque([start]), {start: None}
        while queue:
            u = queue.popleft()
            if u == goal:
                break
            for v in oracle[u]:
                if v not in prev:
                    prev[v] = u
                    queue.append(v)
        route = []
        if goal in prev:
            cur = goal
            while cur is not None:
                route.append(cur)
                cur = prev[cur]
            route.reverse()
    else:
        route = oracle_path(truth, start, goal)
    nodes = [{"id": i, "x": float(p[0]), "y": float(p[1]),
        "label": str(i) if domain != "text" else f"{i//7},{i%7}"} for i, p in enumerate(pos)]
    frames = []
    walked = [start]
    for step, rec in enumerate(records):
        if not bool(rec["active"][idx].item()):
            continue
        src = int(rec["current"][idx].item())
        dest = int(rec["actual"][idx].item())
        act = int(rec["selected"][idx].item())
        adj = rec["observed"][idx].detach().cpu()
        edges = [{"a": a, "b": b, "open": True} for a,b in adj.nonzero().tolist() if a < b]
        visibility = rec["seen"][idx].nonzero().flatten().cpu().tolist()
        layers = [lay[idx].detach().cpu().tolist() for lay in rec["layers"]]
        cells = [{"id": node, "input": rec["features"][idx,node].cpu().tolist(),
            "neighbors": adj[node].nonzero().flatten().tolist(),
            "activations": [layers[r][node] for r in range(ROUNDS+1)],
            "inbox": [], "activity": float(math.sqrt(sum(x*x for x in layers[-1][node]))),
            "gradient": None} for node in visibility]
        messages = []
        p_message = decision_weights["message"].detach().cpu().tolist()
        for a,b in adj.nonzero().tolist():
            if a == b:
                continue
            degree = max(1., float(adj[b].sum().item()))
            for round_num in range(1, ROUNDS+1):
                strength = sum(abs(p_message[k]*layers[round_num-1][a][k]/degree)
                    for k in range(CHANNELS)) / CHANNELS
                messages.append({"from":a,"to":b,"round":round_num,
                    "strength":round(strength,6),"channels":CHANNELS})
        logits = rec["logits"][idx].detach().cpu().tolist()
        candidate_ids = rec["dest"][idx].detach().cpu().tolist()
        valid = rec["valid"][idx].detach().cpu().tolist()
        candidates = [{"from":src,"to":(int(candidate_ids[j]) if candidate_ids[j]>=0 else None),
            "action":str(j),"q":round(float(torch.sigmoid(torch.tensor(logits[j])).item()),6),
            "utility":round(float(torch.sigmoid(torch.tensor(logits[j])).item()),6),
            "knownDestination":candidate_ids[j]>=0}
            for j in range(ACTIONS) if valid[j]]
        chosen = next((x for x in candidates if x["action"]==str(act)),None)
        if chosen:
            own = layers[-1][src]
            tar = layers[-1][candidate_ids[act]] if candidate_ids[act]>=0 else [0]*CHANNELS
            weights_a = decision_weights["readCurrent"].detach().cpu().tolist()
            weights_b = decision_weights["readTarget"].detach().cpu().tolist()
            chosen["contribution"]={"votes":[
                {"cell":src,"channel":k,"role":"current",
                 "value":round(own[k]*weights_a[k],6)} for k in range(CHANNELS)
                ]+([{"cell":candidate_ids[act],"channel":k,"role":"target",
                 "value":round(tar[k]*weights_b[k],6)} for k in range(CHANNELS)]
                 if candidate_ids[act]>=0 else [])}
        frames.append({"step":step,"current":src,"walked":walked[:],
            "graph":{"observedNodes":visibility,"observedEdges":edges,
             "predictedPath":([src,candidate_ids[act]] if candidate_ids[act]>=0 else [src]),
             "predictedNext":(candidate_ids[act] if candidate_ids[act]>=0 else None),
             "planSource":"GPU batched cellular policy; observed links only",
             "candidates":sorted(candidates,key=lambda e:-e["q"]),
             "chosen":chosen,
             "actual":{"from":src,"to":dest,"action":str(act),
                 "cost":float(rec["cost"][idx].item()),
                 "reward":round(float(rec["reward"][idx].item()),5),
                 "matched":candidate_ids[act]==dest,"predictionKnown":candidate_ids[act]>=0},
             "compute":{"engine":"GRAPH-CELLS","control":"GPU batched message passing",
                 "rounds":ROUNDS,"channels":CHANNELS,"participatingCells":len(cells),
                 "cells":cells,"messages":messages,
                 "learning":{"loss":loss,"weightDelta":weight_delta,
                     "updatedWeights":model.steps,
                     "note":"Batch gradient; individual cell gradients are not exposed by CUDA worker"}}}})
        walked.append(dest)
    frames.append({"step":len(frames),"current":walked[-1],"walked":walked[:],
        "graph":{"observedNodes":[],"observedEdges":[],"candidates":[],
            "predictedPath":[walked[-1]],"predictedNext":None,"chosen":None,
            "actual":None,"planSource":"Completed episode"}})
    return {"meta":{"domain":domain,"seed":int(records[0]["seed"]),
        "kind":"cells","text":"GPU state-transition world",
        "start":start,"goal":goal,"positions":[{"x":p[0],"y":p[1]} for p in pos],
        "abstract":{"schema":"magic.abstract.graph.v1","domain":domain,"nodes":nodes,
            "edges":truth_edges,"solution":{"path":route,"actions":[],
                "cost":len(route)-1 if route else None,"reachable":bool(route)},
            "provenance":{"evaluator":"Full GPU simulator, post-hoc only",
                "learned":"CUDA-observed adjacency only"}}},
        "frames":frames,
        "outcome":{"solved":walked[-1]==goal,"steps":len(walked)-1,
            "cost":float(batch.total_cost[idx].item()),"loss":loss,
            "domain":domain}}

class Controller:
    def __init__(self, device):
        self.device = device
        self.lock = threading.RLock()
        self.stop_flag = threading.Event()
        self.thread = None
        self.model = None
        self.settings = dict(worlds=64, domains=list(DOMAINS), steps=24,
            checkpointEvery=5, inspectIndex=0)
        self.info = dict(available=True, running=False, status="ready",
            device=str(device), gpuName=torch.cuda.get_device_name(0),
            cudaVersion=torch.version.cuda, gpuVerified=True, requestedWorlds=64,
            effectiveWorlds=0, completedWorlds=0, batches=0, worldsPerSecond=0.,
            loss=None, success={}, gpuMemoryAllocatedMB=0,
            gpuMemoryReservedMB=0, vramTotalMB=round(torch.cuda.get_device_properties(0).total_memory/1048576),
            checkpointSavedAt=None, error=None, traceId=0, trace=None)
    def status(self):
        with self.lock:
            return dict(self.info)
    def start(self, data):
        with self.lock:
            if self.info["running"]:
                raise ValueError("CUDA trainer already running")
            resume=bool(data.get("resume"))
            if resume:
                if not LIVE.is_file():
                    raise ValueError("No CUDA checkpoint found to resume")
                snapshot=json.loads(LIVE.read_text(encoding="utf-8"))["snapshot"]
            else:
                snapshot=data.get("snapshot")
            valid_snapshot(snapshot)
            domains=data.get("domains",list(DOMAINS))
            if not isinstance(domains,list) or not domains or any(d not in DOMAINS for d in domains):
                raise ValueError("Invalid domains")
            worlds=int(data.get("worlds",64))
            if not 1<=worlds<=512:
                raise ValueError("CUDA parallel world count must be 1–512")
            self.settings.update(worlds=worlds,domains=list(dict.fromkeys(domains)),
                steps=max(4,min(64,int(data.get("steps",24)))),
                checkpointEvery=max(1,min(50,int(data.get("checkpointEvery",5)))),
                inspectIndex=max(0,int(data.get("inspectIndex",0))))
            self.stop_flag.clear()
            self.model=Cells(snapshot,self.device)
            self.info.update(running=True,status="running",error=None,
                requestedWorlds=worlds,effectiveWorlds=0)
            self.thread=threading.Thread(target=self.train,daemon=True)
            self.thread.start()
        return self.status()
    def resize(self, data):
        count=int(data.get("worlds",0))
        if not 1<=count<=512:
            raise ValueError("CUDA parallel world count must be 1–512")
        with self.lock:
            self.settings["worlds"]=count
            self.info["requestedWorlds"]=count
        return self.status()
    def inspect(self,data):
        index=int(data.get("inspectIndex",0))
        if index<0 or index>511:
            raise ValueError("Inspect world index must be 0–511")
        with self.lock:
            self.settings["inspectIndex"]=index
        return self.status()
    def stop(self):
        self.stop_flag.set()
        with self.lock:
            if self.info["running"]:
                self.info["status"]="stopping after GPU batch"
        return self.status()
    def checkpoint(self):
        if not LIVE.is_file():
            raise ValueError("No saved CUDA model")
        return json.loads(LIVE.read_text(encoding="utf-8"))
    def save(self):
        snapshot=self.model.snapshot()
        entry={"schema":"cuda-graph-cells-1","snapshot":snapshot,
            "savedAt":utc(),"gpu":self.info["gpuName"]}
        atomic_json(LIVE,entry)
        with self.lock:
            self.info["checkpointSavedAt"]=entry["savedAt"]
    def train(self):
        try:
            while not self.stop_flag.is_set():
                with self.lock:
                    settings=dict(self.settings)
                n=settings["worlds"]
                started=time.perf_counter()
                try:
                    result=self.train_batch(n,settings)
                except torch.cuda.OutOfMemoryError:
                    torch.cuda.empty_cache()
                    if n<=1:
                        raise
                    with self.lock:
                        self.settings["worlds"]=max(1,n//2)
                        self.info["error"]="CUDA OOM: downgraded effective worlds "+str(n)+" to "+str(n//2)
                    continue
                torch.cuda.synchronize()
                duration=max(1e-4,time.perf_counter()-started)
                with self.lock:
                    self.info.update(running=True,status="running",
                        effectiveWorlds=n,completedWorlds=self.model.episodes,
                        batches=self.info["batches"]+1,worldsPerSecond=round(n/duration,2),
                        loss=result["loss"],success=result["success"],
                        gpuMemoryAllocatedMB=round(torch.cuda.memory_allocated()/1048576),
                        gpuMemoryReservedMB=round(torch.cuda.memory_reserved()/1048576))
                    if result["trace"] is not None:
                        self.info["traceId"]+=1
                        self.info["trace"]=result["trace"]
                    save_due=self.info["batches"]%settings["checkpointEvery"]==0
                if save_due:
                    self.save()
        except Exception as e:
            with self.lock:
                self.info["error"]=str(e)
                self.info["status"]="error"
        finally:
            try:
                if self.model is not None:
                    self.save()
            except Exception as e:
                with self.lock:
                    self.info["error"]="CUDA checkpoint save failed: "+str(e)
            with self.lock:
                self.info["running"]=False
                if self.info["status"]!="error":
                    self.info["status"]="paused"
    def train_batch(self, count, settings):
        model=self.model
        device=self.device
        decision_weights={k:model.p[k].detach().clone() for k in ("message","readCurrent","readTarget")}
        batch=Batch(count,settings["domains"],model.seed+model.episodes*7919,device)
        records=[]
        rewards=[]
        active_masks=[]
        for step in range(settings["steps"]):
            batch.sense()
            active=~batch.finished
            with torch.no_grad():
                features=batch.features()
                dest, costs, revisit, valid=batch.candidates()
                layers=model.forward_graph(features,batch.observed)
                logits=model.scores(layers,batch.current,dest,costs,revisit,valid)
                prob=torch.softmax(logits/.8,dim=-1)
                selected=torch.multinomial(prob,1).squeeze(1)
                target=dest.gather(1,selected[:,None]).squeeze(1)
                measured_cost=costs.gather(1,selected[:,None]).squeeze(1)
                current=batch.current.clone()
                obs=batch.observed.clone()
                seen=batch.seen.clone()
                reward,success,measured=batch.step(selected,target,measured_cost,active)
                records.append({"seed":model.seed+model.episodes*7919,"features":features,
                    "observed":obs,"seen":seen,"current":current,
                    "dest":dest,"costs":costs,"revisit":revisit,
                    "valid":valid,"logits":logits,"selected":selected,
                    "actual":batch.current.clone(),"reward":reward,
                    "cost":measured,"active":active.clone(),
                    "layers":[layer.detach() for layer in layers]})
                rewards.append(reward.detach())
                active_masks.append(active.detach())
        # Reverse discounted returns use measured executed rewards only, not oracle.
        returns=[None]*len(records)
        ret=torch.zeros(count,device=device)
        for i in reversed(range(len(records))):
            ret=rewards[i]+.90*ret
            returns[i]=(.5+ret/5).clamp(.025,.975).detach()
        model.optimizer.zero_grad(set_to_none=True)
        accum=torch.zeros((),device=device)
        samples=0
        # Truncated GPU BPTT *within each graph*, not through all time steps.
        # Each action state was recorded on CUDA; recompute for exact gradients.
        used=0
        for t in range(0,len(records),2):
            rec=records[t]
            if not bool(active_masks[t].any().item()):
                continue
            layers=model.forward_graph(rec["features"],rec["observed"])
            logits=model.scores(layers,rec["current"],rec["dest"],
                rec["costs"],rec["revisit"],rec["valid"])
            chosen=logits.gather(1,rec["selected"][:,None]).squeeze(1)
            mask=active_masks[t].float()
            loss=(F.binary_cross_entropy_with_logits(chosen,returns[t],reduction="none")*mask).sum() / mask.sum().clamp(min=1)
            (loss/max(1,(len(records)+1)//2)).backward()
            accum+=loss.detach()
            samples+=int(mask.sum().item())
            used+=1
        if used:
            torch.nn.utils.clip_grad_norm_(model.parameters(),max_norm=4.)
            before={k:p.detach().clone() for k,p in model.p.items()}
            model.optimizer.step()
            delta=torch.sqrt(sum((p.detach()-before[k]).square().sum()
                for k,p in model.p.items()))
            delta_value=float(delta.item())
            model.steps+=1
        else:
            delta_value=0.
        model.episodes+=count
        model.samples+=samples
        successes={}
        for domain in settings["domains"]:
            mask=batch.dom==DOMAINS.index(domain)
            total=int(mask.sum().item())
            if total:
                win=int((batch.finished & mask).sum().item())
                model.domains[domain]+=total
                successes[domain]={"wins":win,"worlds":total,"success":round(win/total,5),
                    "meanCost":round(float(batch.total_cost[mask].mean().item()),3)}
        loss_value=round(float(accum.item()/max(1,used)),6)
        trace=None
        if (self.info["batches"] % 3)==0:
            trace=make_trace(batch,records,model,settings["inspectIndex"],
                loss_value,round(delta_value,7),decision_weights)
        return {"loss":loss_value,"success":successes,"trace":trace}

class API(BaseHTTPRequestHandler):
    controller = None
    def log_message(self, *args):
        return
    def respond(self, status, payload):
        value=json.dumps(payload,ensure_ascii=False,allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Length",str(len(value)))
        self.end_headers()
        self.wfile.write(value)
    def do_GET(self):
        path=urlparse(self.path).path
        try:
            if path=="/status":
                return self.respond(200,self.controller.status())
            if path=="/checkpoint":
                if self.controller.status()["running"]:
                    raise ValueError("Pause CUDA before retrieving a stable checkpoint")
                return self.respond(200,self.controller.checkpoint())
            return self.respond(404,{"error":"Not found"})
        except Exception as e:
            return self.respond(400,{"error":str(e)})
    def do_POST(self):
        length=int(self.headers.get("Content-Length","0"))
        if length<0 or length>2_000_000:
            return self.respond(413,{"error":"Payload exceeds 2 MB"})
        try:
            raw=self.rfile.read(length)
            body=json.loads(raw) if raw else {}
            path=urlparse(self.path).path
            if path=="/start":
                result=self.controller.start(body)
            elif path=="/resize":
                result=self.controller.resize(body)
            elif path=="/inspect":
                result=self.controller.inspect(body)
            elif path=="/stop":
                result=self.controller.stop()
            else:
                return self.respond(404,{"error":"Not found"})
            return self.respond(200,result)
        except Exception as e:
            return self.respond(400,{"error":str(e)})

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=3045)
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--cpu-test",action="store_true")
    args=parser.parse_args()
    if not torch.cuda.is_available() and not args.cpu_test:
        raise SystemExit("CUDA UNAVAILABLE: torch.cuda.is_available() is false. No CPU fallback.")
    device=torch.device("cpu" if args.cpu_test else "cuda:0")
    if args.self_test:
        # Use an isolated fixture; no user checkpoints are touched.
        zero={k:[0.0]*math.prod(shape) for k,shape in SHAPES.items()}
        zero["self"]=[.73]*8;zero["message"]=[.46]*8
        snap={"schema":1,"architecture":"graph-cells","seed":19,"episodes":0,
            "samples":0,"steps":0,"domainCounts":{},
            "parameters":zero,"m":zero,"v":zero}
        c=Controller(device) if not args.cpu_test else None
        model=Cells(snap,device)
        batch=Batch(6,list(DOMAINS),19,device)
        batch.sense()
        destinations,costs,revisits,valid=batch.candidates()
        layers=model.forward_graph(batch.features(),batch.observed)
        logits=model.scores(layers,batch.current,destinations,costs,revisits,valid)
        assert logits.shape==(6,5)
        assert all(layer.device.type==device.type for layer in layers)
        assert bool(torch.isfinite(logits[valid]).all().item())
        choice=torch.zeros(6,dtype=torch.long,device=device)
        target=torch.full((6,),.8,device=device)
        model.optimizer.zero_grad(set_to_none=True)
        loss=F.binary_cross_entropy_with_logits(
            logits.gather(1,choice[:,None]).squeeze(1),target)
        loss.backward()
        assert any(p.grad is not None and bool(torch.isfinite(p.grad).all().item())
            for p in model.parameters())
        model.optimizer.step()
        assert model.snapshot()["parameters"]["in"]
        print("CUDA_GRAPH_SELFTEST_PASS",device,torch.__version__,flush=True)
        return
    if args.cpu_test:
        raise SystemExit("CPU is allowed ONLY with --self-test; live CUDA training never falls back.")
    API.controller=Controller(device)
    server=ThreadingHTTPServer(("127.0.0.1",args.port),API)
    print("CUDA_GRAPH_READY "+torch.cuda.get_device_name(0)+" port="+str(args.port),flush=True)
    try:
        server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt:
        API.controller.stop()
    finally:
        server.server_close()

if __name__=="__main__":
    main()
