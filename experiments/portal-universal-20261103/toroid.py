"""A FOUR-SPATIAL-dimensional solid torus S¹×B³, not a replay/time axis.

A node is an actual persistent graph node. Its coordinate is a deterministic
embedding used for the section camera; the embedding does not create nodes,
links or physical facts. Positions are reproducible across checkpoints.
"""
from __future__ import annotations
import hashlib
import math

MAJOR_RADIUS = 1.75
MINOR_RADIUS = 0.92

def solid_torus4_position(label):
    """Return (x,y,z,w) in the 4D solid torus, not a flattened 3D proxy."""
    digest=hashlib.sha256(label.encode('utf-8')).digest()
    rand=lambda a: int.from_bytes(digest[a:a+4], 'little')/2**32
    theta=2*math.pi*rand(0)
    # A point in the 3-ball cross section, uniform in 4-volume.
    rad=MINOR_RADIUS*0.93*rand(4)**(1/3)
    phi=2*math.pi*rand(8)
    mu=2*rand(12)-1
    u=rad*math.sqrt(1-mu*mu)*math.cos(phi)
    z=rad*math.sqrt(1-mu*mu)*math.sin(phi)
    w=rad*mu
    return [round((MAJOR_RADIUS+u)*math.cos(theta),6),
            round((MAJOR_RADIUS+u)*math.sin(theta),6),
            round(z,6),round(w,6)]

def inside_solid_torus4(point,epsilon=1e-5):
    x,y,z,w=point
    return (math.hypot(x,y)-MAJOR_RADIUS)**2+z*z+w*w<=MINOR_RADIUS**2+epsilon

def section_intersection(a,b,w):
    """A 4D graph EDGE (not an invented node) intersects the w=constant cut."""
    w0,w1=a[3],b[3]
    if not min(w0,w1)<=w<=max(w0,w1) or w0==w1:return None
    alpha=(w-w0)/(w1-w0)
    return [a[i]+alpha*(b[i]-a[i]) for i in range(3)]+[w]
