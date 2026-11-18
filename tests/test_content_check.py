#!/usr/bin/env python3
"""Tests for tools/content_check.py: python3 tests/test_content_check.py"""
from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import content_check as cc  # noqa: E402


class ContentCheck(unittest.TestCase):
    """Each test copies the real content/ folder, breaks one thing and expects a finding."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        shutil.copytree(ROOT / "content", self.root / "content")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def card_path(self, cid: str = "squat-to-box") -> Path:
        return self.root / "content" / "exercises" / f"{cid}.json"

    def edit_card(self, change, cid: str = "squat-to-box") -> list[str]:
        card = json.loads(self.card_path(cid).read_text(encoding="utf-8"))
        change(card)
        self.card_path(cid).write_text(json.dumps(card), encoding="utf-8")
        return cc.check(self.root)

    def edit_credits(self, change) -> list[str]:
        p = self.root / "content" / "credits.json"
        data = json.loads(p.read_text(encoding="utf-8"))
        change(data["entries"])
        p.write_text(json.dumps(data), encoding="utf-8")
        return cc.check(self.root)

    def assertFinding(self, found: list[str], text: str) -> None:
        self.assertTrue(any(text in f for f in found), found)

    def test_copy_is_clean(self) -> None:
        self.assertEqual(cc.check(self.root), [])

    # AC4: stop_if, substitutes, spec and credits are required.
    def test_missing_stop_if(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.pop("stop_if")), "missing stop_if")

    def test_empty_stop_if(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(stop_if=[])), "stop_if must list")

    def test_missing_substitutes(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.pop("substitutes")),
                           "missing substitutes")

    def test_empty_substitutes(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(substitutes=[])),
                           "substitutes must list")

    def test_bad_substitutes(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(substitutes=["no-such-card"])),
                           "not a valid card")
        self.assertFinding(self.edit_card(lambda c: c.update(substitutes=["squat-to-box"])),
                           "the card itself")
        self.assertFinding(self.edit_card(lambda c: c.update(substitutes=["side-plank"])),
                           "shares no goal tag")
        self.assertFinding(self.edit_card(lambda c: c.update(substitutes=["broad-jump-stick"])),
                           "higher risk")

    def test_missing_spec(self) -> None:
        (self.root / "content" / "exercises" / "squat-to-box.spec.md").unlink()
        self.assertFinding(cc.check(self.root), "no acceptance spec")

    def test_missing_credits_entry(self) -> None:
        def drop_figure(es):
            es[:] = [e for e in es if e["path"] != "content/figures/plank.svg"]
        found = self.edit_credits(drop_figure)
        self.assertFinding(found, "content/figures/plank.svg: no entry")

    def test_incomplete_credits_entry(self) -> None:
        def drop_author(es):
            for e in es:
                if e["path"] == "content/exercises/plank.json":
                    e["author"] = ""
        self.assertFinding(self.edit_credits(drop_author), "credits entry missing author")

    # AC2: the dose stays inside the training-rules Decision and matches the spec.
    def test_dose_over_limit(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["dose"].update(sets=4)),
                           "dose sets 4 is outside")

    def test_jump_total_over_limit(self) -> None:
        self.assertFinding(
            self.edit_card(lambda c: c["dose"].update(per_side=True), "pogo-hops"),
            "dose total 36 contacts is above 30")

    # Holds: the Decision's Holds table (issue #39).
    def test_hold_longer_than_start(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["dose"].update(seconds=25), "plank"),
                           "dose seconds 25 is outside 10 to 20 for hold")

    def test_hold_shorter_than_floor(self) -> None:
        self.assertFinding(
            self.edit_card(lambda c: c["dose"].update(seconds=8), "side-plank"),
            "dose seconds 8 is outside 10 to 20 for hold")

    def test_hold_three_sets(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["dose"].update(sets=3), "plank"),
                           "dose sets 3 is outside 1 to 2 for hold")

    def test_hold_rest_too_short(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["dose"].update(rest_s=20), "plank"),
                           "dose rest_s 20 is outside 30 to 180 for hold")

    def test_hold_limits_mirror_decision(self) -> None:
        text = (ROOT / "docs" / "knowledge" / "decisions" / "training-rules.md").read_text(
            encoding="utf-8")
        holds = re.search(r"^# Holds$(.*?)^# ", text, re.M | re.S)
        self.assertIsNotNone(holds, "the Decision has no Holds section")

        def row(lever: str) -> list[int]:
            m = re.search(rf"^\| {lever} \| ([^|]+)\|", holds.group(1), re.M)
            self.assertIsNotNone(m, f"no {lever} row in the Holds table")
            return [int(n) for n in re.findall(r"\d+", m.group(1))]

        lim = cc.HOLD_LIMITS
        self.assertEqual(row("Hold sets"), list(lim["sets"]))
        self.assertEqual(row("Hold time"), list(lim["seconds"]))
        self.assertEqual(row("Starting hold"), list(lim["start_seconds"]))
        self.assertEqual(row("Hold step"), [lim["step_seconds"]])
        self.assertEqual(row("Hold rest"), [lim["rest_s_min"]])
        lo, hi = lim["start_seconds"]
        self.assertTrue(lim["seconds"][0] <= lo <= hi <= lim["seconds"][1])
        self.assertEqual(cc.LIMITS["hold"]["sets"], lim["sets"])
        self.assertEqual(cc.LIMITS["hold"]["seconds"], lim["start_seconds"])

    def test_dose_differs_from_spec(self) -> None:
        def raise_reps(c):
            c["dose"]["reps"] = 12
        self.assertFinding(self.edit_card(raise_reps), "differs from spec dose")

    def test_spec_must_cite_rules(self) -> None:
        p = self.root / "content" / "exercises" / "plank.spec.md"
        p.write_text(p.read_text(encoding="utf-8").replace(cc.TRAINING_RULES, "/x.md"),
                     encoding="utf-8")
        self.assertFinding(cc.check(self.root), "does not cite")

    def test_stop_signs_match_spec(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["stop_if"].append("Feeling bored")),
                           "stop_if differs")

    # Story #91: CT1 limits on card text the player shows, and the required warning signs.
    LONG = "Keep both of your feet flat on the floor the whole time you move."  # 14 words

    def test_cue_label_over_three_words(self) -> None:
        found = self.edit_card(lambda c: c["cues"].__setitem__(0, "Straight like a board"),
                               "plank")
        self.assertFinding(found, "cues[0] 'Straight like a board' is 4 words")

    def test_cue_label_of_three_words_passes(self) -> None:
        self.assertEqual(
            self.edit_card(lambda c: c["cues"].__setitem__(0, "Hips back first")), [])

    def test_long_step(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["steps"].__setitem__(0, self.LONG)),
                           "steps[0]: 'Keep both of your feet")

    def test_long_step_split_into_short_sentences_passes(self) -> None:
        split = "Keep both feet flat on the floor. Do it the whole time you move."
        self.assertEqual(self.edit_card(lambda c: c["steps"].__setitem__(0, split)), [])

    def test_long_reason(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(why=self.LONG)), "why: ")

    def test_long_cue_feedback(self) -> None:
        found = self.edit_card(lambda c: c["cues"].__setitem__(
            0, "Keep both feet flat on the floor the whole time you move"))
        self.assertFinding(found, "cues[0] feedback: ")

    def test_long_mistake_and_fix(self) -> None:
        def change(c):
            c["mistakes"][0]["mistake"] = self.LONG
            c["mistakes"][1]["fix"] = self.LONG
        found = self.edit_card(change)
        self.assertFinding(found, "mistakes[0].mistake: ")
        self.assertFinding(found, "mistakes[1].fix: ")

    def test_long_stop_sign(self) -> None:
        found = self.edit_card(lambda c: c["stop_if"].append(
            "Any knee pain at all that does not go away after a short rest (end the set)"))
        self.assertFinding(found, "stop_if[5]: 'Any knee pain at all")
        self.assertFinding(found, "is 17 words")

    def test_long_easier_and_harder_hints(self) -> None:
        def change(c):
            c["easier"]["use_when"] = self.LONG
            c["harder"]["variant"] = self.LONG
        found = self.edit_card(change)
        self.assertFinding(found, "easier: ")
        self.assertFinding(found, "harder.variant: ")

    def test_long_move_on_rule(self) -> None:
        found = self.edit_card(lambda c: c["harder"].update(
            move_on_when="Every rep clean in two sessions in a row, and the owner approves "
                         "the change."))
        self.assertFinding(found, "harder.move_on_when: ")

    def test_long_tempo(self) -> None:
        found = self.edit_card(lambda c: c["dose"].update(tempo=self.LONG.rstrip(".")))
        self.assertFinding(found, "dose.tempo: ")

    def _drop_stop(self, needle: str) -> list[str]:
        return self.edit_card(lambda c: c.update(
            stop_if=[s for s in c["stop_if"] if needle not in s]), "plank")

    def test_missing_chest_sign(self) -> None:
        found = self._drop_stop("Chest pain")
        for name in ("chest pain", "a racing heartbeat", "shortness of breath"):
            self.assertFinding(found, f"stop_if is missing {name}")

    def test_missing_faint_sign(self) -> None:
        found = self._drop_stop("faint")
        self.assertFinding(found, "stop_if is missing dizziness")
        self.assertFinding(found, "stop_if is missing feeling faint")

    def test_missing_pain_sign(self) -> None:
        def no_pain(c):
            c["stop_if"] = [s for s in c["stop_if"] if not s.startswith("Pain")]
        self.assertFinding(self.edit_card(no_pain, "plank"), "stop_if is missing a pain sign")

    def test_split_stop_sign_keeps_every_warning(self) -> None:
        for card in cc.load_cards(ROOT).values():
            self.assertEqual(cc.safety_errors(card[1]), [], card[0].name)

    def test_maximal_words(self) -> None:
        self.assertFinding(
            self.edit_card(lambda c: c["steps"].append("Do as many as you can.")),
            "maximal effort")

    def test_progression_needs_owner(self) -> None:
        self.assertFinding(
            self.edit_card(lambda c: c["harder"].update(move_on_when="When it feels easy.")),
            "two clean sessions")

    def test_starts_unapproved(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(approved=True)),
                           "approved must start false")

    # AC1: the default equipment profiles.
    def test_equipment_outside_profile(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c["needs"]["all"].append("bands")),
                           "outside the default profiles")
        self.assertFinding(self.edit_card(lambda c: c.update(space_m=[3, 1])),
                           "larger than the default")
        self.assertFinding(self.edit_card(lambda c: c.update(surface="soft")),
                           "not in the default profiles")

    def test_id_matches_file(self) -> None:
        self.assertFinding(self.edit_card(lambda c: c.update(id="other")), "must match")

    # AC3: a clean SVG figure.
    def test_figure_with_metadata(self) -> None:
        p = self.root / "content" / "figures" / "plank.svg"
        p.write_text(p.read_text(encoding="utf-8").replace(
            "<title", "<metadata>made in an editor</metadata><title"), encoding="utf-8")
        self.assertFinding(cc.check(self.root), "SVG carries metadata")

    def test_missing_figure(self) -> None:
        (self.root / "content" / "figures" / "plank.svg").unlink()
        self.assertFinding(cc.check(self.root), "does not exist")

    def test_credit_line(self) -> None:
        card = json.loads(self.card_path("plank").read_text(encoding="utf-8"))
        self.assertEqual(cc.credit_line(card, cc.load_credits(self.root)),
                         "Figure: the goalie-goals contributors, CC BY-SA 4.0, "
                         "drawn for this repo.")
        adapted = {card["media"]["figure"]: {
            "author": "A. Author", "licence": "CC-BY-4.0", "source": "https://example.com/a",
            "adapted": True, "changes": "redrawn in this app's style"}}
        self.assertEqual(cc.credit_line(card, adapted),
                         "Figure: A. Author, CC BY 4.0, https://example.com/a "
                         "(redrawn in this app's style).")

    def test_repo_is_clean(self) -> None:
        self.assertEqual(cc.check(ROOT), [])


if __name__ == "__main__":
    unittest.main(verbosity=1)
