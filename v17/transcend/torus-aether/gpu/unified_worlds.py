"""Same FastText GPU brain learns real original V17 procedural maze physics.

Uses ORIGINAL make_maze(seed,n) (not a demo puzzle), and uses teacher
shortest-path directions only as training targets. On unseen evaluation the
learner cannot access hidden BFS distances: it acts from visible local walls,
goal bearing and its own learned action policy. The trained policy and
action-effects are saved in the SAME TinyStories .npz checkpoint.

This is a fast learned policy HEAD. It is not falsely described as the full
original JS Brain graph or the native V17 solver transplanted to CUDA.
"""
import numpy as np
try:
    import torch
except ImportError:
    torch = None

DIRECTIONS = ((0, -1), (1, 0), (0, 1), (-1, 0))
FORMAT = 1


def world(seed):
    from worlds_gpu import make_maze
    return make_maze(int(seed), 7)


def observable(maze, i):
    n = maze["n"]
    x, y = i % n, i // n
    gx, gy = maze["goal"] % n, maze["goal"] // n
    b = (np.sign(gx-x)+1)*3 + (np.sign(gy-y)+1)
    mask = 0
    neighbors = []
    for k, (dx, dy) in enumerate(DIRECTIONS):
        nx, ny = x+dx, y+dy
        j = ny*n+nx
        blocked = nx < 0 or ny < 0 or nx >= n or ny >= n or bool(maze["wall"][j])
        if blocked:
            mask |= 1 << k
            neighbors.append(None)
        else:
            neighbors.append(j)
    return int(b), mask, neighbors


class UnifiedWorlds:
    def __init__(self, device, arrays=None):
        self.device = device
        self.use_torch = device != "numpy"
        tables = {
            "policy": np.zeros((9, 16, 4), dtype=np.int32),
            "effects": np.zeros((4, 3, 3), dtype=np.int32),
        }
        self.episodes = 0
        self.learned_steps = 0
        self.latest = None
        if arrays is not None and "worlds_format" in arrays:
            if int(arrays["worlds_format"]) != FORMAT:
                raise RuntimeError("Unknown integrated GPU worlds checkpoint version")
            for key in tables:
                val = arrays["worlds_" + key]
                if val.shape != tables[key].shape:
                    raise RuntimeError("Integrated GPU world head shape mismatch: " + key)
                tables[key] = val.copy()
            self.episodes = int(arrays["worlds_episodes"])
            self.learned_steps = int(arrays["worlds_learned_steps"])
        for name, data in tables.items():
            setattr(self, name, torch.as_tensor(data, device=device) if self.use_torch else data)

    def _add(self, matrix, indices):
        if not len(indices):
            return
        flat = matrix.view(-1) if self.use_torch else matrix.reshape(-1)
        ix = np.asarray(indices, dtype=np.int64)
        if self.use_torch:
            t = torch.as_tensor(ix, dtype=torch.int64, device=self.device)
            flat.index_add_(0, t, torch.ones(t.shape, dtype=torch.int32, device=self.device))
        else:
            np.add.at(flat, ix, 1)

    def observe(self, count=1):
        policy_ix = []
        effects_ix = []
        for j in range(int(count)):
            maze = world(210000001 + 131 * (self.episodes+j))
            pos = maze["start"]
            visited = set()
            # True training labels from THE ORIGINAL world's BFS topology.
            # Heldout evaluation must never use these oracle labels.
            for step in range(maze["n"] ** 2):
                if pos == maze["goal"] or pos in visited:
                    break
                visited.add(pos)
                bearing, mask, neighbors = observable(maze, pos)
                for d, cell in enumerate(neighbors):
                    dx, dy = DIRECTIONS[d]
                    effect = (0, 0) if cell is None else (dx, dy)
                    effects_ix.append(d * 9 + (effect[0]+1)*3 + effect[1]+1)
                valid = [(maze["dist"][cell], d, cell)
                         for d, cell in enumerate(neighbors)
                         if cell is not None and maze["dist"][cell] < maze["dist"][pos]]
                if not valid:
                    break
                _, d, nxt = min(valid)
                policy_ix.append(bearing*16*4+mask*4+d)
                pos=nxt
        self._add(self.policy, policy_ix)
        self._add(self.effects, effects_ix)
        self.episodes += int(count)
        self.learned_steps += len(policy_ix)
        return self.report()

    def _decision(self, bearing, mask, visits):
        row = self.policy[bearing, mask]
        if self.use_torch:
            scores = row.detach().cpu().numpy().astype(np.float64)
        else:
            scores = row.astype(np.float64)
        for d in range(4):
            if mask & (1 << d):
                scores[d] = -1e15
            else:
                scores[d] -= visits[d] * (1 + max(1., scores.max()/10))
        return int(np.argmax(scores))

    def evaluate(self, cases=16, start_seed=990001):
        succeeded = 0
        total_steps = 0
        optimal_steps = 0
        for j in range(cases):
            maze = world(start_seed + j * 137)
            pos = maze["start"]
            visits = np.zeros((maze["n"]*maze["n"]), dtype=np.int32)
            steps = 0
            optimal_steps += maze["dist"][maze["start"]]
            while steps < maze["n"] ** 2 * 5 and pos != maze["goal"]:
                bearing, mask, neighbors = observable(maze, pos)
                counts = np.array([visits[c] if c is not None else 0 for c in neighbors])
                direction = self._decision(bearing, mask, counts)
                new = neighbors[direction]
                if new is None:
                    break
                visits[pos] += 1
                pos = new
                steps += 1
            total_steps += steps
            if pos == maze["goal"]:
                succeeded += 1
        return {"frozen": True, "actualUnseenSeeds": cases,
                "solved": succeeded, "accuracy": round(succeeded/cases, 6) if cases else None,
                "avgSteps": round(total_steps/cases, 2) if cases else None,
                "optimalTrainingOracleNotUsedDuringTest": True,
                "teacherPaths": self.episodes,
                "nativeFullV17Solver": False}

    def report(self):
        return {"mazeWorldsTrained": self.episodes,
                "mazeTeacherStepsLearned": self.learned_steps,
                "observedActionEffectClasses": 4, "policyStoredOnGPU": self.device.startswith("cuda"),
                "worldGenerator": "original-V17-procedural-maze",
                "fullOriginalBrain": False}

    def serialize(self):
        return {"worlds_format": np.int64(FORMAT),
                "worlds_policy": (self.policy.detach().cpu().numpy() if self.use_torch else self.policy),
                "worlds_effects": (self.effects.detach().cpu().numpy() if self.use_torch else self.effects),
                "worlds_episodes": np.int64(self.episodes),
                "worlds_learned_steps": np.int64(self.learned_steps)}
