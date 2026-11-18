#!/usr/bin/env python3
"""Each exercise card's dose matches its acceptance spec and the training-rules limits.

python3 tests/test_exercise_specs.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import content_check as cc  # noqa: E402

CARDS = {stem: card for stem, (_, card) in cc.load_cards(ROOT).items()}


class ExerciseSpecs(unittest.TestCase):
    def test_about_eight_cards(self) -> None:
        self.assertTrue(8 <= len(CARDS) <= 10, sorted(CARDS))

    def test_each_card_matches_its_spec(self) -> None:
        for stem, card in CARDS.items():
            with self.subTest(card=stem):
                spec_path = ROOT / "content" / "exercises" / f"{stem}.spec.md"
                self.assertTrue(spec_path.is_file(), "spec missing")
                spec = cc.parse_spec(spec_path.read_text(encoding="utf-8"))
                self.assertTrue(spec["cites_rules"], "spec must cite the training-rules Decision")
                self.assertTrue(spec["has_progression"], "spec needs a progression limit")
                dose = {k: v for k, v in card["dose"].items() if k != "tempo"}
                self.assertEqual(dose, spec["dose"])
                self.assertEqual(card["stop_if"], spec["stop_if"])

    def test_each_dose_inside_training_rules(self) -> None:
        for stem, card in CARDS.items():
            with self.subTest(card=stem):
                self.assertEqual(cc.dose_errors(card["dose"]), [])
                self.assertIsNone(cc.MAXIMAL.search(cc._text_of(card)))

    def test_jump_contacts_fit_one_session(self) -> None:
        # All jump cards together stay inside the Decision's 50-60 starting contacts.
        total = sum(c["dose"]["sets"] * c["dose"]["reps"] * (2 if c["dose"]["per_side"] else 1)
                    for c in CARDS.values() if c["dose"]["kind"] == "contacts")
        self.assertLessEqual(total, 50)


if __name__ == "__main__":
    unittest.main(verbosity=1)
