#!/usr/bin/env python3
"""Tests for tools/credits_check.py: python3 tests/test_credits_check.py"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import credits_check as cc  # noqa: E402

GOOD = {"path": "content/figures/squat.svg", "author": "the goalie-goals contributors",
        "licence": "CC-BY-SA-4.0", "source": "drawn for this repo", "checked": "2026-11-18"}


class Credits(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "content" / "figures").mkdir(parents=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def write(self, entries: list[dict], files: tuple[str, ...] = ()) -> list[str]:
        (self.root / "content" / "credits.json").write_text(
            json.dumps({"version": 1, "entries": entries}), encoding="utf-8")
        for f in files:
            (self.root / f).parent.mkdir(parents=True, exist_ok=True)
            (self.root / f).write_text("<svg/>", encoding="utf-8")
        return cc.check(self.root)

    def test_clean(self) -> None:
        self.assertEqual(self.write([GOOD], (GOOD["path"],)), [])

    def test_uncredited_file(self) -> None:
        found = self.write([], ("content/figures/lunge.svg",))
        self.assertTrue(any("no entry" in f for f in found), found)

    def test_incompatible_licence(self) -> None:
        bad = {**GOOD, "licence": "CC-BY-NC-4.0"}
        found = self.write([bad], (GOOD["path"],))
        self.assertTrue(any("not compatible" in f for f in found), found)

    def test_unknown_licence(self) -> None:
        found = self.write([{**GOOD, "licence": "see website"}], (GOOD["path"],))
        self.assertTrue(any("not compatible" in f for f in found), found)

    def test_government_licences(self) -> None:
        for lic in ("OGL-UK-3.0", "PD-USGov"):
            entry = {**GOOD, "licence": lic, "author": "A government department",
                     "source": "https://example.com/publication"}
            self.assertEqual(self.write([entry], (GOOD["path"],)), [], lic)
        for lic in ("OGL-Canada-2.0", "CC-BY-NC-SA-3.0-IGO", "OGL-UK-2.0"):
            found = self.write([{**GOOD, "licence": lic}], (GOOD["path"],))
            self.assertTrue(any("not compatible" in f for f in found), (lic, found))

    def test_share_alike_outside_content(self) -> None:
        stray = {**GOOD, "path": "web/public/icons/glove.svg"}
        found = self.write([stray])
        self.assertTrue(any("must live under content/" in f for f in found), found)

    def test_missing_fields_and_changes(self) -> None:
        found = self.write([{"path": GOOD["path"], "licence": "MIT"}], (GOOD["path"],))
        self.assertTrue(any("missing author" in f for f in found), found)
        adapted = {**GOOD, "adapted": True}
        found = self.write([adapted], (GOOD["path"],))
        self.assertTrue(any("say what changed" in f for f in found), found)

    def test_uncredited_asset_outside_content(self) -> None:
        found = self.write([GOOD], (GOOD["path"], "web/public/icons/glove.svg"))
        self.assertTrue(any(f.startswith("web/public/icons/glove.svg: asset with no entry")
                            for f in found), found)
        found = self.write([GOOD], ("assets/badge.svg", "public/x/.gitkeep"))
        self.assertIn("assets/badge.svg: asset with no entry in content/credits.json", found)
        self.assertFalse(any(".gitkeep" in f for f in found), found)

    def test_credited_asset_outside_content(self) -> None:
        icon = {**GOOD, "path": "web/public/icons/timer.svg", "licence": "MIT",
                "author": "Icon set authors", "source": "https://example.com/icons"}
        self.assertEqual(self.write([GOOD, icon], (GOOD["path"], icon["path"])), [])

    def test_entry_for_missing_file(self) -> None:
        found = self.write([GOOD])
        self.assertTrue(any("no such file" in f for f in found), found)

    def test_repo_is_clean(self) -> None:
        self.assertEqual(cc.check(ROOT), [])


if __name__ == "__main__":
    unittest.main(verbosity=1)
