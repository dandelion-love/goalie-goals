#!/usr/bin/env python3
"""Render one checked-in synthetic pose fixture. No footage, network or model access.

This is a local prototype, not a real-footage allowlist or a training prescription.
The only accepted CLI argument is a fixture identifier, never a file path or URL.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'tools' / 'pose_sources.json'
FIXTURES = {'synthetic-squat-v1': ROOT / 'tests' / 'fixtures' / 'synthetic-squat-pose.json'}
ANGLES = ('torso', 'thigh', 'shin', 'upper_arm', 'forearm')


def point(origin: tuple[float, float], length: float, angle: float) -> tuple[float, float]:
    radians = math.radians(angle)
    return (origin[0] + length * math.cos(radians), origin[1] + length * math.sin(radians))


def validate(data: object, manifest: object) -> list[dict]:
    """Reject unknown or disabled sources, extra fields, invalid coordinates and timings."""
    if not isinstance(data, dict) or set(data) != {'source_id', 'poses'}:
        raise ValueError('invalid fixture')
    source_id = data['source_id']
    if not isinstance(source_id, str) or source_id not in FIXTURES:
        raise ValueError('source is not an enabled synthetic fixture')
    if not isinstance(manifest, dict) or not isinstance(manifest.get('sources'), list):
        raise ValueError('invalid source manifest')
    matches = [x for x in manifest['sources'] if isinstance(x, dict) and x.get('id') == source_id]
    if len(matches) != 1 or matches[0].get('kind') != 'synthetic' or matches[0].get('enabled') is not True:
        raise ValueError('source is not an enabled synthetic fixture')
    poses = data['poses']
    if not isinstance(poses, list) or len(poses) != 2:
        raise ValueError('expected two poses')
    total = 0
    for pose in poses:
        if not isinstance(pose, dict) or set(pose) != {'root', 'angles', 'duration_ms'}:
            raise ValueError('invalid pose')
        root, angles, duration = pose['root'], pose['angles'], pose['duration_ms']
        finite = lambda n: isinstance(n, (int, float)) and not isinstance(n, bool) and math.isfinite(n)
        if not isinstance(root, list) or len(root) != 2 or not all(finite(n) and 20 <= n <= 340 for n in root):
            raise ValueError('invalid root')
        if not isinstance(angles, dict) or set(angles) != set(ANGLES) or not all(finite(n) and -180 <= n <= 180 for n in angles.values()):
            raise ValueError('invalid angles')
        if not isinstance(duration, int) or isinstance(duration, bool) or not 500 <= duration <= 10000:
            raise ValueError('invalid duration')
        total += duration
        if any(not (12 <= x <= 348 and 12 <= y <= 188) for x, y in joints(pose)):
            raise ValueError('pose exceeds figure bounds')
    if total > 20000:
        raise ValueError('duration exceeds limit')
    return poses


def joints(pose: dict) -> list[tuple[float, float]]:
    hip = tuple(pose['root'])
    a = pose['angles']
    shoulder = point(hip, 52, a['torso'])
    head = point(shoulder, 15, a['torso'])
    knee = point(hip, 40, a['thigh'])
    ankle = point(knee, 42, a['shin'])
    elbow = point(shoulder, 24, a['upper_arm'])
    wrist = point(elbow, 24, a['forearm'])
    return [hip, shoulder, head, knee, ankle, elbow, wrist]


def figure(pose: dict) -> str:
    hip, shoulder, head, knee, ankle, elbow, wrist = joints(pose)
    fmt = lambda p: f'{p[0]:.1f},{p[1]:.1f}'
    return (f'<circle cx="{head[0]:.1f}" cy="{head[1]:.1f}" r="10"/>'
            f'<polyline points="{fmt(shoulder)} {fmt(hip)} {fmt(knee)} {fmt(ankle)}"/>'
            f'<polyline points="{fmt(shoulder)} {fmt(elbow)} {fmt(wrist)}"/>')


def render(data: object, manifest: object) -> str:
    poses = validate(data, manifest)
    duration = sum(p['duration_ms'] for p in poses)
    split = poses[0]['duration_ms'] / duration * 100
    if not 0 < split < 100:
        raise ValueError('invalid timing')
    figures = [figure(p) for p in poses]
    shared = 'fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" id="motion" viewBox="0 0 360 200" role="img" aria-labelledby="title">'
            f'<title id="title">Synthetic pose example</title><style>.animated{{opacity:0}}'
            f'@media (prefers-reduced-motion:no-preference){{svg:target .still{{display:none}}svg:target .animated{{opacity:1}}'
            f'.p0{{animation:a {duration}ms steps(1,end) infinite}}.p1{{animation:b {duration}ms steps(1,end) infinite}}'
            f'@keyframes a{{0%,100%{{opacity:1}}{split:.3f}%{{opacity:0}}}}'
            f'@keyframes b{{0%,100%{{opacity:0}}{split:.3f}%{{opacity:1}}}}}}</style>'
            f'<g class="still"><g transform="translate(0 47) scale(.49)" {shared}>{figures[0]}</g>'
            f'<g transform="translate(180 47) scale(.49)" {shared}>{figures[1]}</g></g>'
            f'<g class="animated" opacity="0"><g class="p0" {shared}>{figures[0]}</g><g class="p1" {shared}>{figures[1]}</g></g></svg>')


def main(argv: list[str]) -> int:
    if len(argv) != 1 or argv[0] not in FIXTURES:
        print('usage: pose_synthetic.py synthetic-squat-v1', file=sys.stderr)
        return 2
    try:
        manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
        data = json.loads(FIXTURES[argv[0]].read_text(encoding='utf-8'))
        if not isinstance(data, dict) or data.get('source_id') != argv[0]:
            raise ValueError('fixture identifier mismatch')
        print(render(data, manifest))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        print('synthetic fixture refused', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
