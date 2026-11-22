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

    # Story 117: the player's intro shows every setup line and the parent checks (story 112).
    def test_long_setup_lines(self) -> None:
        def change(c):
            c["setup"]["space"] = "About 1.5 m of floor, with a wall nearby for a hand if needed."
            c["setup"]["equipment"] = self.LONG
            c["setup"]["parent"] = ("Stand in front like a shooter and point left or right "
                                    "to start each effort.")
        found = self.edit_card(change, "split-squat")
        rel = "content/exercises/split-squat.json"
        self.assertFinding(found, f"{rel}: setup.space: 'About 1.5 m of floor")
        self.assertFinding(found, "if needed.' is 14 words")
        self.assertFinding(found, f"{rel}: setup.equipment: 'Keep both")
        self.assertFinding(found, f"{rel}: setup.parent: 'Stand in front")
        self.assertFinding(found, "each effort.' is 15 words")

    def test_long_surface_note(self) -> None:
        found = self.edit_card(lambda c: c["setup"].update(
            surface_note="A wooden floor, carpet over a firm floor, a thick mat or grass."),
            "pogo-hops")
        self.assertFinding(found, "content/exercises/pogo-hops.json: setup.surface_note: ")
        self.assertFinding(found, "is 13 words")

    def test_long_parent_check(self) -> None:
        found = self.edit_card(lambda c: c["parent_check"].__setitem__(1, self.LONG),
                               "split-squat")
        self.assertFinding(found, "content/exercises/split-squat.json: parent_check[1]: 'Keep")
        self.assertFinding(found, "is 14 words")

    def test_setup_and_parent_check_of_twelve_words_pass(self) -> None:
        twelve = "Stand side-on, about 2 m away, where you can see the knees."
        self.assertEqual(len(twelve.split()), 12)

        def change(c):
            c["setup"]["parent"] = twelve
            c["parent_check"][0] = twelve
        self.assertEqual(self.edit_card(change, "split-squat"), [])

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


class DossierCheck(unittest.TestCase):
    """Story 115 AC1: the dossier pass refuses unsourced claims and what the claim rules forbid.
    Each test copies content/, breaks the plank dossier in one way and expects a finding."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        shutil.copytree(ROOT / "content", self.root / "content")
        self.path = self.root / "content" / "exercises" / "plank.dossier.json"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def edit(self, change) -> list[str]:
        d = json.loads(self.path.read_text(encoding="utf-8"))
        change(d)
        self.path.write_text(json.dumps(d), encoding="utf-8")
        return cc.check(self.root)

    def assertFinding(self, found: list[str], text: str) -> None:
        self.assertTrue(any("plank.dossier.json" in f and text in f for f in found), found)

    def test_plank_dossier_is_clean(self) -> None:
        self.assertEqual(cc.check(self.root), [])
        self.assertEqual(cc.dossier_warnings(self.root, now="2026-11-18T00:00:00Z"), [])

    def test_explicit_unavailable_evidence_requires_no_hidden_claims(self) -> None:
        path = ROOT / "docs/proposals/candidates"
        d = json.loads((path / "squat-to-box-pause.dossier.json").read_text(encoding="utf-8"))
        card = json.loads((path / "squat-to-box-pause.json").read_text(encoding="utf-8"))
        cards = {"squat-to-box-pause": card}
        self.assertEqual(cc.dossier_errors(d, "squat-to-box-pause", cards), [])
        d["expect"]["keep_up"] = {"text": "Hidden claim"}
        self.assertTrue(any("expect.unavailable" in e for e in cc.dossier_errors(d, "squat-to-box-pause", cards)))
        del d["expect"]["keep_up"]
        d["muscles"]["unavailable"] = ""
        self.assertTrue(any("muscles.unavailable" in e for e in cc.dossier_errors(d, "squat-to-box-pause", cards)))

    def test_dossier_is_not_read_as_a_card(self) -> None:
        self.assertNotIn("plank.dossier", cc.load_cards(self.root))

    # Rule 1 of the claim rules: every claim carries a source.
    def test_unsourced_claim(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][0].update(sources=[])),
                           "has no sources")
        self.assertFinding(self.edit(lambda d: d["expect"]["keep_up"].pop("sources")),
                           "has no sources")

    def test_unknown_and_unused_sources(self) -> None:
        self.assertFinding(
            self.edit(lambda d: d["why"]["claims"][0].update(sources=["no-such-source"])),
            "source no-such-source is not in sources")
        self.assertFinding(self.edit(lambda d: d["sources"].append({
            "id": "extra-2020", "url": "https://pubmed.ncbi.nlm.nih.gov/1/", "title": "Extra",
            "kind": "trial", "population": "youth", "band": "teens", "year": 2020})),
            "source extra-2020 is not cited")

    # Rule 5: no promises about looks, size, shape or weight.
    def test_refused_words_about_looks(self) -> None:
        for text in ("Planks give you a six-pack and flat abs by summer, with steady work.",
                     "Hold the plank to tone your middle and look better on the pitch.",
                     "This hold helps you burn fat and lose weight over a few weeks.",
                     "Keep at it and you get bigger muscles all down your middle."):
            self.assertFinding(self.edit(lambda d: d["why"]["claims"][0].update(text=text)),
                               "which the claim rules refuse")

    def test_refused_words_in_the_headline(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"].update(headline="A lean, toned middle.")),
                           "why.headline")

    def test_refused_words_match_whole_words_only(self) -> None:
        text = "A steady middle helps you absorb a landing. Keep it clean, even with fatigue."
        self.assertEqual(self.edit(lambda d: d["why"]["claims"][0].update(text=text)), [])

    # Rule 7: injury claims no stronger than the evidence.
    def test_prevention_claim_outside_a_limit(self) -> None:
        self.assertFinding(self.edit(lambda d: d["science"]["claims"][0].update(
            text="Planks prevent back injuries in young keepers who do them twice a week.")),
            "'prevent'")

    def test_negates_only_in_limits(self) -> None:
        self.assertFinding(self.edit(lambda d: d["science"]["claims"][0].update(negates=True)),
                           "negates is allowed only in science.limits")
        self.assertFinding(self.edit(lambda d: d["science"]["limits"][1].pop("negates")),
                           "'prevents'")

    def test_promise_you_will(self) -> None:
        self.assertFinding(self.edit(lambda d: d["expect"]["keep_up"].update(
            text="You will hold the plank for longer and longer every single week.")),
            "'You will'")

    # Rule 4: outcomes are ranges with time frames, quoted low end first.
    def test_outcome_missing(self) -> None:
        self.assertFinding(self.edit(lambda d: d["expect"]["claims"][0].pop("outcome")),
                           "has no outcome")

    def test_outcome_range_not_quoted(self) -> None:
        self.assertFinding(self.edit(lambda d: d["expect"]["claims"][0].update(
            text="In a trial with pupils in their early teens, trunk training for 6 weeks "
                 "improved trunk strength tests by up to 22%.")),
            "as '8 to 22'")
        self.assertFinding(self.edit(lambda d: d["expect"]["claims"][0].update(
            text="In a trial with pupils in their early teens, trunk training improved trunk "
                 "strength tests by 8 to 22% and sideways jumping by 4 to 5%.")),
            "its weeks 6")

    def test_outcome_high_end_first(self) -> None:
        self.assertFinding(self.edit(lambda d: d["expect"]["claims"][0].update(
            text="In a trial with pupils in their early teens, trunk training for 6 weeks "
                 "improved trunk strength tests by 22 to 8%.")),
            "low end first")

    def test_outcome_range_shape(self) -> None:
        self.assertFinding(
            self.edit(lambda d: d["expect"]["claims"][0]["outcome"].update(change_pct=[22, 8])),
            "change_pct must be [low, high]")
        self.assertFinding(
            self.edit(lambda d: d["expect"]["claims"][0]["outcome"].update(weeks=6)),
            "weeks must be [low, high]")

    def test_expect_needs_a_youth_source(self) -> None:
        def adult_only(d: dict) -> None:
            c = d["expect"]["claims"][0]
            c.update(sources=["ekstrom-2007"], evidence="adult",
                     text="In studies with adults, " + c["text"][0].lower() + c["text"][1:])
        self.assertFinding(self.edit(adult_only), "needs a youth source")

    # Rule 3: adult-only evidence is labelled, and the label is computed, not trusted.
    def test_evidence_label_must_match_sources(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][3].update(evidence="youth")),
                           "evidence is youth, but its sources give mixed")

    def test_adult_claim_says_adult(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][2].update(
            text="A stiffer middle lets the push from the hips reach the arms and legs.")),
            "must say so in its text")

    # The Decision's other limits.
    def test_counts_and_lengths(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"].update(claims=d["why"]["claims"][:1])),
                           "why.claims must list 2 to 4")
        self.assertFinding(self.edit(lambda d: d["science"].update(limits=[])),
                           "science.limits must list 1 to 3")
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][0].update(text="x" * 221)),
                           "must be 20 to 220 characters")
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][0].pop("action")),
                           "action must be one of")

    def test_long_sentence(self) -> None:
        self.assertFinding(self.edit(lambda d: d["why"]["claims"][0].update(
            text="When you dive your trunk links the push from your legs to your hands.")),
            "a sentence the player shows is at most 12")

    def test_starts_unapproved(self) -> None:
        self.assertFinding(self.edit(lambda d: d.update(approved=True)),
                           "approved must start false")

    def test_muscles(self) -> None:
        self.assertFinding(self.edit(lambda d: d["muscles"]["map"][0].update(muscle="abs-ish")),
                           "not in the vocabulary")
        self.assertFinding(self.edit(lambda d: d["muscles"]["map"][3].update(role="main")),
                           "a main muscle must be measured")

    def test_clips_empty(self) -> None:
        self.assertFinding(self.edit(lambda d: d.update(clips=[{"url": "https://example.com"}])),
                           "clips must be empty")

    def test_source_urls(self) -> None:
        self.assertFinding(self.edit(lambda d: d["sources"][0].update(url="http://example.com/a")),
                           "url must be https://")
        self.assertFinding(self.edit(lambda d: d["sources"][0].update(
            url="https://docs.google.com/document/d/0000")), "private link")
        self.assertFinding(self.edit(lambda d: d["sources"][-1].update(url="../outside.json")),
                           "path in this repo")

    def test_dossier_needs_a_card_and_credits(self) -> None:
        shutil.copy(self.path, self.path.with_name("no-such-card.dossier.json"))
        found = cc.check(self.root)
        self.assertTrue(any("no card content/exercises/no-such-card.json" in f for f in found))
        self.assertTrue(any("no-such-card.dossier.json: no entry in content/credits.json" in f
                            for f in found))

    def test_every_card_has_a_clean_dossier(self) -> None:
        # Story 115 AC4: with DOSSIER_REQUIRED on, every card carries its dossier, and none warns.
        self.assertTrue(cc.DOSSIER_REQUIRED)
        self.assertEqual(sorted(cc.load_dossiers(self.root)), sorted(cc.load_cards(self.root)))
        self.assertEqual(cc.dossier_warnings(self.root, now="2026-11-18T00:00:00Z"), [])

    def test_a_card_without_a_dossier_fails(self) -> None:
        missing = self.root / "content" / "exercises" / "side-plank.dossier.json"
        missing.unlink()
        self.assertIn("content/exercises/side-plank.json: no dossier at "
                      "content/exercises/side-plank.dossier.json", cc.check(self.root))

    def test_card_and_id_agree(self) -> None:
        self.assertFinding(self.edit(lambda d: d.update(card="content/exercises/side-plank.json")),
                           "card must be content/exercises/plank.json")

    def test_not_json(self) -> None:
        self.path.write_text("{", encoding="utf-8")
        self.assertFinding(cc.check(self.root), "not valid JSON")

    def test_warnings_stale_long_and_hard(self) -> None:
        self.assertTrue(any("has passed" in w for w in
                            cc.dossier_warnings(self.root, now="2028-01-01T00:00:00Z")))
        hard = ("Electromyographical characterisation demonstrates considerable neuromuscular "
                "activation variability.")
        self.assertGreater(cc.reading_grade([hard]), cc.READING_GRADE)
        self.assertLess(cc.reading_grade(["You hold still. Then you push off fast."]), 8)

        def every_claim_hard(d: dict) -> None:
            for part in ("why", "expect", "science"):
                for c in d[part]["claims"]:
                    c["text"] = hard
        self.edit(every_claim_hard)
        self.assertTrue(any("reading grade" in w for w in
                            cc.dossier_warnings(self.root, now="2026-11-18T00:00:00Z")))
        self.edit(lambda d: d["science"]["claims"].extend([{"text": "y" * 200}] * 3))
        self.assertTrue(any("characters, above about 2000" in w for w in
                            cc.dossier_warnings(self.root, now="2026-11-18T00:00:00Z")))


if __name__ == "__main__":
    unittest.main(verbosity=1)
