#!/usr/bin/env python3
"""Tests for tools/privacy_guard.py. Standard library only:

    python3 tests/test_privacy_guard.py

Every sensitive-looking value is assembled at run time, so this file passes the guard it
tests. Names here are invented; private terms come from a temporary file.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GUARD = ROOT / "tools" / "privacy_guard.py"
sys.path.insert(0, str(ROOT / "tools"))
import privacy_guard as pg  # noqa: E402

AT = "@"


def j(*parts: str) -> str:
    return "".join(parts)


class Rules(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        terms = Path(self.tmp.name) / "terms.txt"
        terms.write_text("# test terms\nZebulon\nre:north\\s+shore\\s+fc\n", encoding="utf-8")
        os.environ["GOALIE_PRIVATE_TERMS"] = str(terms)
        os.environ["GTD_PUBLIC_DENYLIST"] = str(Path(self.tmp.name) / "none.txt")
        os.environ.pop("GOALIE_PRIVATE_TERMS_TEXT", None)
        pg._terms = None

    def tearDown(self) -> None:
        self.tmp.cleanup()
        pg._terms = None

    def hits(self, text: str, message: bool = False) -> list[str]:
        return pg.scan(text, "t", message=message)

    def assertFlags(self, text: str, rule: str, message: bool = False) -> None:
        found = self.hits(text, message)
        self.assertTrue(any(rule in f for f in found), f"{rule!r} not flagged in {found}")

    def assertClean(self, text: str, message: bool = False) -> None:
        self.assertEqual(self.hits(text, message), [])

    def test_tokens(self) -> None:
        self.assertFlags(j("token = ", "gh", "p_", "a1" * 18), "secret or token")
        self.assertFlags(j("AI", "za", "B" * 35), "secret or token")
        self.assertFlags(j("GOC", "SPX-", "abcdefghijkl"), "secret or token")
        self.assertFlags(j("-----BEGIN ", "RSA PRIVATE KEY", "-----"), "secret or token")
        self.assertFlags(j('"private', '_key": "x"'), "secret or token")

    def test_oauth_client_id(self) -> None:
        self.assertFlags(j("1234567", "-", "a" * 24, ".apps.googleusercontent.com"),
                         "OAuth client id")

    def test_credential_in_code(self) -> None:
        self.assertFlags(j("pass", "word = ", '"', "hunter22hunter", '"'), "credential in code")
        self.assertClean(j("pass", "word = ", '"', "<from-secret-manager>", '"'))
        self.assertClean(j("api_", "key: ", '"', "your-key-here", '"'))

    def test_cloud_hosts(self) -> None:
        self.assertFlags(j("https://svc-abc", ".run", ".app/x"), "cloud host")
        self.assertFlags(j("deploy", AT, "proj", ".iam.gserviceaccount.com"), "cloud host")
        self.assertFlags(j("gs:", "//my-bucket/x"), "cloud host")

    def test_numbers(self) -> None:
        self.assertFlags(j("project ", "1234", "56789"), "long numeric id")
        self.assertFlags(j("call ", "604", "-555-", "0199"), "phone number")
        self.assertFlags(j("10.", "1.2.", "3"), "IP address")
        self.assertClean("bind to 127.0.0.1 or 0.0.0.0")
        self.assertClean("save 12 of 15 shots, 3x10 reps, version 1.2.3")

    def test_emails(self) -> None:
        self.assertFlags(j("kid", AT, "gmail", ".com"), "email address")
        self.assertClean(j("player", AT, "example", ".com"))
        self.assertClean(j("Co-Authored-By: Claude <", "noreply", AT, "anthropic", ".com>"),
                         message=True)
        self.assertClean(j("1+me", AT, "users.noreply", ".github.com"))

    def test_places_and_paths(self) -> None:
        self.assertFlags(j("V5K", " 0A1"), "postal code")
        self.assertFlags(j("C:", "\\", "Users\\someone\\x"), "private filesystem path")
        self.assertFlags(j("/", "Users/someone/x"), "private filesystem path")
        self.assertFlags(j("cd /", "d/work/goalie-goals"), "private filesystem path")
        self.assertClean("see tools/privacy_guard.py and ./docs/x.md")

    def test_private_terms(self) -> None:
        self.assertFlags("Zebulon dove left", "private term", message=True)
        self.assertFlags("zebulon's save", "private term")
        self.assertFlags("Plays for North  Shore FC", "private term")
        self.assertClean("Zebulonia is a different word")

    def test_inline_terms(self) -> None:
        os.environ["GOALIE_PRIVATE_TERMS_TEXT"] = "Quintessa;Ridgeview Secondary"
        pg._terms = None
        try:
            self.assertFlags("goes to ridgeview secondary", "private term")
        finally:
            os.environ.pop("GOALIE_PRIVATE_TERMS_TEXT")

    def test_redaction(self) -> None:
        found = self.hits(j("email ", "kid", AT, "gmail", ".com", " now"))
        self.assertNotIn("gmail", found[0])

    def test_claude_links_only_in_files(self) -> None:
        link = j("https://claude", ".ai/code/", "session_abc")
        self.assertFlags(link, "claude.ai link")
        self.assertClean(link, message=True)


class Files(unittest.TestCase):
    def blob(self, path: str, data: bytes = b"ok\n") -> list[str]:
        return pg.scan_blob(path, data, path)

    def test_blocked_names(self) -> None:
        for path in (".env", ".env.local", "config/client_secret_x.json", "keys/a.pem",
                     "data/workouts.fit", "media/save.mov", "media/dive.jpg",
                     "voice/note.m4a", "db/app.sqlite"):
            self.assertTrue(self.blob(path), path)

    def test_allowed_names(self) -> None:
        for path in (".env.example", "public/icons/glove.svg", "public/sfx/ding.ogg",
                     "src/app.ts"):
            self.assertEqual(self.blob(path), [], path)

    def test_exif(self) -> None:
        self.assertTrue(self.blob("a.png", b"\x89PNG\0\0eXIf\0" + b"x" * 100))
        self.assertEqual(self.blob("a.png", b"\x89PNG\0\0IDAT" + b"x" * 100), [])

    def test_size(self) -> None:
        self.assertTrue(self.blob("big.txt", b"a\n" * (pg.MAX_BYTES // 2 + 10)))


class Hook(unittest.TestCase):
    def run_hook(self, event: dict) -> subprocess.CompletedProcess:
        env = {**os.environ, "GOALIE_PRIVATE_TERMS_TEXT": "Zebulon",
               "GOALIE_PRIVATE_TERMS": os.devnull, "GTD_PUBLIC_DENYLIST": os.devnull}
        return subprocess.run([sys.executable, str(GUARD), "--claude-hook"],
                              input=json.dumps(event), capture_output=True, text=True,
                              env=env, timeout=60)

    def test_gtd_write_blocked(self) -> None:
        r = self.run_hook({"tool_name": "mcp__abc123__capture",
                           "tool_input": {"title": "Zebulon needs a stronger leap"}})
        self.assertEqual(r.returncode, 2, r.stderr)

    def test_gtd_write_clean(self) -> None:
        r = self.run_hook({"tool_name": "mcp__abc123__capture",
                           "tool_input": {"title": "The keeper needs a stronger leap"}})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_gtd_read_ignored(self) -> None:
        r = self.run_hook({"tool_name": "mcp__abc123__issue_get",
                           "tool_input": {"query": "Zebulon"}})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_other_mcp_ignored(self) -> None:
        r = self.run_hook({"tool_name": "mcp__gmail__search_threads",
                           "tool_input": {"query": j("from:coach", AT, "gmail.com")}})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_gh_issue_blocked(self) -> None:
        r = self.run_hook({"tool_name": "Bash", "cwd": str(ROOT), "tool_input": {
            "command": "gh issue create --title 'Plan for Zebulon' --body x"}})
        self.assertEqual(r.returncode, 2, r.stderr)

    def test_gh_secret_exempt(self) -> None:
        r = self.run_hook({"tool_name": "Bash", "cwd": str(ROOT), "tool_input": {
            "command": j("gh secret set X --body ", "gh", "p_", "a1" * 18)}})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_no_verify_blocked(self) -> None:
        r = self.run_hook({"tool_name": "Bash", "cwd": str(ROOT), "tool_input": {
            "command": "git commit --no-verify -m 'x'"}})
        self.assertEqual(r.returncode, 2, r.stderr)

    def test_unrelated_tools_ignored(self) -> None:
        r = self.run_hook({"tool_name": "Write", "tool_input": {"content": "Zebulon"}})
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=1)
