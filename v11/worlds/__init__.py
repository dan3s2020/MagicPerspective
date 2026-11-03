"""Registry of the worlds of V11. Every world gives the same interface to the one abstract network:
a perspective laid into the graph (instance nodes with labels and relations), options with imagined consequences,
the teacher's shape (training only), and the references without learning."""
from .grid import GridMaze, GridMind
from .states import GraphWorld, SatWorld, SymbolWorld, CarWorld, make_mind
from .symbolic import TextWorld, TextMind, VoterWorld, VoterMind

FAMILIES = {}


def register(name, make, mind, sizes, test_sizes=None, title=''):
    FAMILIES[name] = dict(make=make, mind=mind, sizes=sizes, test_sizes=test_sizes or sizes, title=title)


register('maze2d', lambda seed, size: GridMaze(seed, size, 2), lambda w: GridMind(w, 'maze2d'), [7, 9], [7, 9, 11], 'Labirint 2D')
register('maze3d', lambda seed, size: GridMaze(seed, size, 3), lambda w: GridMind(w, 'maze3d'), [5], [5, 7], 'Labirint 3D')
register('dynamic', lambda seed, size: GridMaze(seed, size, 2, dynamic=True), lambda w: GridMind(w, 'dynamic'), [9], [9], 'Labirint cu uși care se mișcă singure')
register('graph', lambda seed, size: GraphWorld(seed), lambda w: make_mind('graph', w), [0], [0], 'Graf de stări cu reguli ascunse')
register('sat', lambda seed, size: SatWorld(seed), lambda w: make_mind('sat', w), [0], [0], 'Constrângeri logice (3-SAT)')
register('symbols', lambda seed, size: SymbolWorld(seed), lambda w: make_mind('symbols', w), [0], [0], 'Joc de simboluri (rescriere)')
register('car', lambda seed, size: CarWorld(seed, size), lambda w: make_mind('car', w), [7], [7, 9], 'Mașină pe pistă')
register('text', lambda seed, size: TextWorld(seed, split='train' if size == 0 else 'test'), lambda w: TextMind(w), [0], [1], 'Text (corpusul Verbatim)')
register('voter', lambda seed, size: VoterWorld(seed), lambda w: VoterMind(w), [0], [0], 'Yes/No voter')
