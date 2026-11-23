#!/usr/bin/env python3
"""Validate the isolated bridge dose candidate with the existing card rules."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import content_check as cc  # noqa: E402


class BridgeStepCandidate(unittest.TestCase):
    def test_candidate_matches_card_rules(self):
        folder = ROOT / 'content/progression-candidates/bridge'
        card = json.loads((folder / 'glute-bridge-14.json').read_text(encoding='utf-8'))
        errors = (cc._type_errors(card, cc.SCHEMA, 'card') + cc.dose_errors(card['dose'])
                  + cc.text_errors(card) + cc.safety_errors(card)
                  + cc.spec_errors(card, (folder / 'glute-bridge-14.spec.md').read_text(encoding='utf-8')))
        self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
