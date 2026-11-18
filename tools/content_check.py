#!/usr/bin/env python3
"""content_check.py: every exercise card is complete, safe to schedule and credited.

A card is content/exercises/<id>.json in the shape of the exercise card pattern
(docs/knowledge/exercise-apps/explanation-elements.md), with the equipment fields of the
equipment-model Decision. The check fails a card when:
- a field is missing, empty or of the wrong type (see SCHEMA), or the id is not the
  file name;
- `stop_if` or `substitutes` is empty, or a substitute is unknown, itself, shares no
  goal tag, or carries a higher risk (equipment-model Decision, how the planner swaps);
- it needs more than the "bodyweight and home" default profile has (equipment, floor
  space, surface);
- its dose is outside the training-rules Decision's limits (LIMITS), or uses words of
  maximal effort;
- its acceptance spec, content/exercises/<id>.spec.md, is missing, does not cite the
  training-rules Decision, has a dose that differs from the card's, or lists other stop
  signs;
- its figure is missing, is not a clean SVG (no metadata, editor data, scripts or
  embedded rasters), or the card, spec or figure lacks a complete credits entry.

Usage: python3 tools/content_check.py [--root DIR]
Exit 0 clean, 1 findings. Standard library only.
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import credits_check  # noqa: E402

TRAINING_RULES = "/decisions/training-rules.md"

# Field -> type. "text" is a non-empty string; "list:N-M" a list of N to M non-empty
# strings; dicts name their own required keys.
SCHEMA: dict[str, object] = {
    "id": "text", "name": "text", "aliases": "list:0-5",
    "category": ("strength", "power", "footwork", "trunk"),
    "why": "text",
    "goal": "list:1-4", "risk": ("low", "medium"),
    "needs": {"all": "list:1-6", "any": "groups"},
    "space_m": "size", "surface": ("any", "soft"),
    "setup": {"space": "text", "equipment": "text", "parent": "text"},
    "steps": "list:3-5", "cues": "list:2-3",
    "mistakes": "mistakes", "parent_check": "list:2-3", "stop_if": "list:2-6",
    "easier": {"variant": "text", "use_when": "text"},
    "harder": {"variant": "text", "move_on_when": "text"},
    "dose": "dose", "timer": ("reps", "interval", "countdown", "none"),
    "substitutes": "list:1-4",
    "media": {"figure": "text"}, "spec": "text",
    "approved": "bool", "licence": ("CC-BY-SA-4.0",),
}

# The "bodyweight and home" default profile (equipment-model Decision).
HOME_PROFILE = {"equipment": {"body only", "other:ball", "other:wall", "other:step"},
                "space_m": (2, 2), "surfaces": {"any"}}

# Starting doses inside the training-rules Decision's progression limits.
# reps: rule 2, a new exercise starts at 1-2 sets of 10-15.
# contacts: power 1-3 sets of 3-6; a card keeps to 30 contacts so a session of a few jump
#   cards stays inside the 50-60 starting contacts.
# efforts: sprint and change-of-direction limit, 16 efforts of 20 m or less, 90 s rest.
# hold: the Decision sets no hold time; 1-2 sets of 10-30 s is this repo's cautious start.
LIMITS = {
    "reps": {"sets": (1, 2), "reps": (10, 15), "rest_s": (30, 180)},
    "contacts": {"sets": (1, 3), "reps": (3, 6), "rest_s": (60, 180), "total": 30},
    "efforts": {"sets": (1, 4), "reps": (1, 8), "rest_s": (90, 300), "distance_m": (1, 20),
                "total": 16},
    "hold": {"sets": (1, 2), "seconds": (10, 30), "rest_s": (30, 180)},
}
DOSE_KEYS = {"reps": ("reps",), "contacts": ("reps",), "efforts": ("reps", "distance_m"),
             "hold": ("seconds",)}
MAXIMAL = re.compile(r"\bmax(imal|imum)?\b|\bto failure\b|\b1 ?rm\b|\bone[- ]rep\b|"
                     r"\bas many (reps )?as (you can|possible)\b|\bamrap\b", re.I)
MOVE_ON = re.compile(r"two sessions in a row.*owner approves", re.I)
SVG_BANNED = re.compile(r"<metadata|<script|<image|<foreignObject|sodipodi|inkscape|"
                        r"xlink:href|href=|data:|\son[a-z]+=|<!ENTITY|<!DOCTYPE", re.I)


def load_cards(root: Path) -> dict[str, tuple[Path, dict | None]]:
    cards = {}
    for f in sorted((root / "content" / "exercises").glob("*.json")):
        try:
            cards[f.stem] = (f, json.loads(f.read_text(encoding="utf-8")))
        except ValueError:
            cards[f.stem] = (f, None)
    return cards


def _type_errors(value: object, kind: object, name: str) -> list[str]:
    if isinstance(kind, dict):
        if not isinstance(value, dict):
            return [f"{name} must be an object"]
        out = []
        for k, sub in kind.items():
            out += _type_errors(value.get(k), sub, f"{name}.{k}")
        return out
    if isinstance(kind, tuple):
        return [] if value in kind else [f"{name} must be one of {', '.join(kind)}"]
    if kind == "text":
        return [] if isinstance(value, str) and value.strip() else [f"{name} is missing or empty"]
    if kind == "bool":
        return [] if isinstance(value, bool) else [f"{name} must be true or false"]
    if isinstance(kind, str) and kind.startswith("list:"):
        lo, hi = (int(x) for x in kind[5:].split("-"))
        if not isinstance(value, list) or not lo <= len(value) <= hi:
            return [f"{name} must list {lo} to {hi} items"]
        if not all(isinstance(v, str) and v.strip() for v in value):
            return [f"{name} items must be non-empty text"]
        return []
    if kind == "groups":
        ok = isinstance(value, list) and all(
            isinstance(g, list) and g and all(isinstance(v, str) for v in g) for g in value)
        return [] if ok else [f"{name} must be a list of equipment groups"]
    if kind == "size":
        ok = (isinstance(value, list) and len(value) == 2
              and all(isinstance(v, (int, float)) and v > 0 for v in value))
        return [] if ok else [f"{name} must be [width, depth] in metres"]
    if kind == "mistakes":
        ok = (isinstance(value, list) and 2 <= len(value) <= 3 and all(
            isinstance(m, dict) and str(m.get("mistake", "")).strip()
            and str(m.get("fix", "")).strip() for m in value))
        return [] if ok else [f"{name} must list 2 to 3 items, each with mistake and fix"]
    if kind == "dose":
        if not isinstance(value, dict) or value.get("kind") not in LIMITS:
            return [f"{name}.kind must be one of {', '.join(LIMITS)}"]
        out = []
        for k in ("sets", "rest_s", *DOSE_KEYS[value["kind"]]):
            if not isinstance(value.get(k), int) or isinstance(value.get(k), bool):
                out.append(f"{name}.{k} must be a whole number")
        if not isinstance(value.get("per_side"), bool):
            out.append(f"{name}.per_side must be true or false")
        if not str(value.get("tempo", "")).strip():
            out.append(f"{name}.tempo is missing or empty")
        return out
    return [f"{name}: unknown schema type {kind!r}"]


def validate_card(card: object, stem: str) -> list[str]:
    """Schema errors for one card (without cross-file checks)."""
    if not isinstance(card, dict):
        return ["not a JSON object"]
    out = []
    for field, kind in SCHEMA.items():
        if field not in card:
            out.append(f"missing {field}")
        else:
            out += _type_errors(card[field], kind, field)
    if card.get("id") != stem:
        out.append(f"id {card.get('id')!r} must match the file name {stem!r}")
    return out


def dose_errors(dose: dict) -> list[str]:
    lim = LIMITS[dose["kind"]]
    out = []
    for k, rng in lim.items():
        if k == "total" or k not in dose:
            continue
        lo, hi = rng
        if not lo <= dose[k] <= hi:
            out.append(f"dose {k} {dose[k]} is outside {lo} to {hi} for {dose['kind']} "
                       f"(training-rules Decision)")
    if "total" in lim:
        total = dose["sets"] * dose["reps"] * (2 if dose["per_side"] else 1)
        if total > lim["total"]:
            out.append(f"dose total {total} {dose['kind']} is above {lim['total']} "
                       f"(training-rules Decision)")
    return out


def _section(text: str, heading: str) -> str:
    m = re.search(rf"^## {re.escape(heading)}\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def parse_spec(text: str) -> dict:
    """The dose (`- key: value` lines) and stop signs (bullets) of a spec file."""
    dose: dict[str, object] = {}
    for key, val in re.findall(r"^- ([a-z_]+): (\S+)\s*$", _section(text, "Dose"), re.M):
        dose[key] = {"yes": True, "no": False}.get(val, int(val) if val.isdigit() else val)
    stops = [s.strip() for s in re.findall(r"^- (.+)$", _section(text, "Stop signs"), re.M)]
    return {"dose": dose, "stop_if": stops,
            "cites_rules": TRAINING_RULES in text,
            "has_progression": bool(_section(text, "Progression limit").strip())}


def spec_errors(card: dict, text: str) -> list[str]:
    spec = parse_spec(text)
    out = []
    if not spec["cites_rules"]:
        out.append(f"spec does not cite {TRAINING_RULES}")
    if not spec["has_progression"]:
        out.append("spec has no Progression limit section")
    card_dose = {k: v for k, v in card["dose"].items() if k != "tempo"}
    if spec["dose"] != card_dose:
        out.append(f"card dose {card_dose} differs from spec dose {spec['dose']}")
    if spec["stop_if"] != card["stop_if"]:
        out.append("card stop_if differs from the spec's Stop signs")
    return out


def svg_errors(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    out = []
    if SVG_BANNED.search(text):
        out.append("SVG carries metadata, editor data, a script, a link or an embedded raster")
    try:
        root = ET.fromstring(text)
        if root.tag != "{http://www.w3.org/2000/svg}svg":
            out.append("not an SVG document")
    except ET.ParseError:
        out.append("SVG does not parse")
    return out


def credits_errors(path: str, by_path: dict[str, dict]) -> list[str]:
    e = by_path.get(path)
    if e is None:
        return [f"{path}: no entry in content/credits.json"]
    missing = [k for k in credits_check.REQUIRED if not str(e.get(k, "")).strip()]
    if missing:
        return [f"{path}: credits entry missing {', '.join(missing)}"]
    if e["licence"] not in credits_check.COMPATIBLE:
        return [f"{path}: credits licence {e['licence']!r} is not compatible"]
    if e.get("adapted") and not str(e.get("changes", "")).strip():
        return [f"{path}: adapted material must say what changed"]
    return []


def load_credits(root: Path) -> dict[str, dict]:
    try:
        data = json.loads((root / "content" / "credits.json").read_text(encoding="utf-8"))
        return {e.get("path"): e for e in data.get("entries", []) if isinstance(e, dict)}
    except (OSError, ValueError):
        return {}


LICENCE_NAMES = {"CC0-1.0": "CC0 1.0", "CC-BY-4.0": "CC BY 4.0", "CC-BY-SA-3.0": "CC BY-SA 3.0",
                 "CC-BY-SA-4.0": "CC BY-SA 4.0", "MIT": "MIT", "Apache-2.0": "Apache 2.0"}


def credit_line(card: dict, by_path: dict[str, dict]) -> str:
    """The card's credit line, generated from the credits manifest entry of its figure."""
    e = by_path[card["media"]["figure"]]
    lic = LICENCE_NAMES.get(e["licence"], e["licence"])
    line = f"Figure: {e['author']}, {lic}"
    if e.get("source"):
        line += f", {e['source']}"
    if e.get("adapted") and e.get("changes"):
        line += f" ({e['changes']})"
    return line + "."


def _text_of(card: dict) -> str:
    keep = {k: v for k, v in card.items() if k not in ("id", "media", "spec", "licence")}
    return json.dumps(keep, ensure_ascii=False)


def check(root: Path) -> list[str]:
    cards = load_cards(root)
    by_path = load_credits(root)
    found: list[str] = []
    if not cards:
        return ["content/exercises: no exercise cards"]
    good = {stem: c for stem, (_, c) in cards.items() if isinstance(c, dict)}
    for stem, (f, card) in cards.items():
        rel = f.relative_to(root).as_posix()
        if card is None:
            found.append(f"{rel}: not valid JSON")
            continue
        errs = validate_card(card, stem)
        if errs:
            found += [f"{rel}: {e}" for e in errs]
            continue
        # Substitutes (equipment-model Decision, how the planner swaps).
        rank = {"low": 0, "medium": 1}
        for sub in card["substitutes"]:
            other = good.get(sub)
            if sub == stem:
                found.append(f"{rel}: substitute {sub} is the card itself")
            elif other is None or validate_card(other, sub):
                found.append(f"{rel}: substitute {sub} is not a valid card")
            elif not set(card["goal"]) & set(other["goal"]):
                found.append(f"{rel}: substitute {sub} shares no goal tag")
            elif rank[other["risk"]] > rank[card["risk"]]:
                found.append(f"{rel}: substitute {sub} has a higher risk")
        # Default profile.
        extra = set(card["needs"]["all"]) - HOME_PROFILE["equipment"]
        if extra:
            found.append(f"{rel}: needs {', '.join(sorted(extra))}, outside the default profiles")
        if card["needs"]["any"] and not any(
                set(g) <= HOME_PROFILE["equipment"] for g in card["needs"]["any"]):
            found.append(f"{rel}: no needs.any group is met by the default profiles")
        if any(a > b for a, b in zip(sorted(card["space_m"]), sorted(HOME_PROFILE["space_m"]))):
            found.append(f"{rel}: space_m {card['space_m']} is larger than the default 2 x 2 m")
        if card["surface"] not in HOME_PROFILE["surfaces"]:
            found.append(f"{rel}: surface {card['surface']} is not in the default profiles")
        if card["category"] == "power" and not str(card["setup"].get("surface_note", "")).strip():
            found.append(f"{rel}: jump cards need setup.surface_note (never on concrete)")
        # Safety and progression.
        found += [f"{rel}: {e}" for e in dose_errors(card["dose"])]
        if MAXIMAL.search(_text_of(card)):
            found.append(f"{rel}: uses words of maximal effort (training-rules rule 3)")
        if not MOVE_ON.search(card["harder"]["move_on_when"]):
            found.append(f"{rel}: harder.move_on_when must require two clean sessions in a "
                         f"row and the owner's approval")
        if card["approved"]:
            found.append(f"{rel}: approved must start false; only the owner approves")
        # Spec.
        spec_rel = f"content/exercises/{stem}.spec.md"
        if card["spec"] != spec_rel:
            found.append(f"{rel}: spec must be {spec_rel}")
        spec_path = root / spec_rel
        if not spec_path.is_file():
            found.append(f"{rel}: no acceptance spec at {spec_rel}")
        else:
            found += [f"{spec_rel}: {e}" for e in
                      spec_errors(card, spec_path.read_text(encoding="utf-8"))]
        # Figure.
        fig = card["media"]["figure"]
        fig_path = root / fig
        if not (fig.startswith("content/figures/") and fig.endswith(".svg")):
            found.append(f"{rel}: media.figure must be an SVG under content/figures/")
        elif not fig_path.is_file():
            found.append(f"{rel}: figure {fig} does not exist")
        else:
            found += [f"{fig}: {e}" for e in svg_errors(fig_path)]
        # Credits.
        for path in (rel, spec_rel, fig):
            found += credits_errors(path, by_path)
    return found


def main(argv: list[str]) -> int:
    root = Path(argv[argv.index("--root") + 1]) if "--root" in argv else Path(
        __file__).resolve().parent.parent
    findings = check(root)
    if findings:
        print("content_check:\n" + "\n".join(findings), file=sys.stderr)
        return 1
    print(f"content_check: ok ({len(load_cards(root))} cards)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
