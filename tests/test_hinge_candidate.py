#!/usr/bin/env python3
"""Check the locked hinge packet even though it is outside the live card directory."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import content_check as cc  # noqa: E402


class HingeCandidate(unittest.TestCase):
    def test_candidate_meets_content_rules_without_becoming_live(self):
        folder = ROOT / 'content/progression-candidates/hinge'
        card = json.loads((folder / 'hip-hinge-wall-tap.json').read_text(encoding='utf-8'))
        dossier = json.loads((folder / 'hip-hinge-wall-tap.dossier.json').read_text(encoding='utf-8'))
        self.assertEqual(dossier['card'], 'content/progression-candidates/hinge/hip-hinge-wall-tap.json')
        # The production dossier checker expects its future live path; check its remaining
        # fields using that projected path without changing the candidate on disk.
        projected = {**dossier, 'card': 'content/exercises/hip-hinge-wall-tap.json'}
        errors = (cc._type_errors(card, cc.SCHEMA, 'card') + cc.dose_errors(card['dose'])
                  + cc.text_errors(card) + cc.safety_errors(card)
                  + cc.spec_errors(card, (folder / 'hip-hinge-wall-tap.spec.md').read_text(encoding='utf-8'))
                  + cc.svg_errors(folder / 'hip-hinge-wall-tap.svg')
                  + cc.dossier_errors(projected, card['id'], {card['id']: card}))
        self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
