#!/usr/bin/env python3
"""credits_check.py: every exercise-content asset is credited, and its licence fits.

Rules (see docs/knowledge/decisions/exercise-media.md):
- Every file under content/, except README.md, LICENSE and credits.json, has an entry in
  content/credits.json.
- Every entry has path, author, licence, source and checked (a date). Adapted material also
  says what changed.
- The licence is one that CC BY-SA 4.0 content can include: CC0-1.0, CC-BY-4.0,
  CC-BY-SA-4.0, CC-BY-SA-3.0, MIT or Apache-2.0. Anything else, or unknown, fails.
- Share-alike material (CC-BY-SA-*) lives only under content/.
- The app's asset folders (web/public/, public/, assets/, whichever exist) are scanned too:
  every file there also needs an entry, so an uncredited third-party or share-alike file
  is refused wherever it sits.
- Every entry points at a file that exists.

Usage: python3 tools/credits_check.py [--root DIR]
Exit 0 clean, 1 findings. Standard library only.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

COMPATIBLE = {"CC0-1.0", "CC-BY-4.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "MIT", "Apache-2.0"}
SHARE_ALIKE = re.compile(r"^CC-BY-SA-")
REQUIRED = ("path", "author", "licence", "source", "checked")
EXEMPT = {"README.md", "LICENSE", "credits.json"}
ASSET_DIRS = ("web/public", "public", "assets")
ASSET_EXEMPT = {".gitkeep"}
DATE = re.compile(r"^\d{4}-\d\d-\d\d$")


def check(root: Path) -> list[str]:
    content = root / "content"
    found: list[str] = []
    try:
        data = json.loads((content / "credits.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        return [f"content/credits.json: unreadable ({e.__class__.__name__})"]
    entries = data.get("entries", [])
    by_path: dict[str, dict] = {}
    for i, e in enumerate(entries):
        where = f"credits.json entry {i + 1}"
        missing = [k for k in REQUIRED if not str(e.get(k, "")).strip()]
        if missing:
            found.append(f"{where}: missing {', '.join(missing)}")
            continue
        lic = e["licence"]
        if lic not in COMPATIBLE:
            found.append(f"{where} ({e['path']}): licence {lic!r} is not compatible "
                         f"with CC BY-SA 4.0 content")
        if SHARE_ALIKE.match(lic) and not e["path"].startswith("content/"):
            found.append(f"{where} ({e['path']}): share-alike material must live under "
                         f"content/")
        if not DATE.match(str(e["checked"])):
            found.append(f"{where} ({e['path']}): checked must be a YYYY-MM-DD date")
        if e.get("adapted") and not str(e.get("changes", "")).strip():
            found.append(f"{where} ({e['path']}): adapted material must say what changed")
        by_path[e["path"]] = e
    for f in sorted(content.rglob("*")):
        if not f.is_file() or (f.parent == content and f.name in EXEMPT):
            continue
        rel = f.relative_to(root).as_posix()
        if rel not in by_path:
            found.append(f"{rel}: no entry in content/credits.json")
    for d in ASSET_DIRS:
        for f in sorted((root / d).rglob("*")) if (root / d).is_dir() else ():
            if not f.is_file() or f.name in ASSET_EXEMPT:
                continue
            rel = f.relative_to(root).as_posix()
            if rel not in by_path:
                found.append(f"{rel}: asset with no entry in content/credits.json")
    for path in sorted(by_path):
        if not (root / path).is_file():
            found.append(f"credits.json ({path}): no such file")
    return found


def main(argv: list[str]) -> int:
    root = Path(argv[argv.index("--root") + 1]) if "--root" in argv else Path(
        __file__).resolve().parent.parent
    findings = check(root)
    if findings:
        print("credits_check:\n" + "\n".join(findings), file=sys.stderr)
        return 1
    print("credits_check: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
