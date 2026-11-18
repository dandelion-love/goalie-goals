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
- its stop signs leave out a warning sign every card must carry (REQUIRED_STOPS: a pain
  sign, chest pain, a racing heartbeat, shortness of breath, dizziness and feeling faint,
  from the training-rules Decision's warning signs);
- text the player shows mid-session is too long for the quality rubric's CT1: a cue label
  over 3 words, or a sentence over 12 words in the reason, a setup line, a parent check,
  a step, a cue's feedback line, a mistake or its fix, a stop sign, the easier or harder
  hint, or the tempo (shown_text);
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
import privacy_guard  # noqa: E402

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
# hold: HOLD_LIMITS below; a card holds a starting dose, so its seconds use start_seconds.
#
# HOLD_LIMITS mirrors the Holds table of the training-rules Decision
# (docs/knowledge/decisions/training-rules.md, "# Holds"). Change both together;
# tests/test_content_check.py fails when they differ.
HOLD_LIMITS = {
    "sets": (1, 2),            # Hold sets: 1 to 2 (per side for a one-sided hold)
    "seconds": (10, 30),       # Hold time: 10 to 30 s, never longer
    "start_seconds": (10, 20),  # Starting hold: 10 to 20 s
    "step_seconds": 5,         # Hold step: at most 5 s longer at a time
    "rest_s_min": 30,          # Hold rest: at least 30 s between sets
}
LIMITS = {
    "reps": {"sets": (1, 2), "reps": (10, 15), "rest_s": (30, 180)},
    "contacts": {"sets": (1, 3), "reps": (3, 6), "rest_s": (60, 180), "total": 30},
    "efforts": {"sets": (1, 4), "reps": (1, 8), "rest_s": (90, 300), "distance_m": (1, 20),
                "total": 16},
    # The 180 s rest ceiling is a sanity bound, not a Decision limit.
    "hold": {"sets": HOLD_LIMITS["sets"], "seconds": HOLD_LIMITS["start_seconds"],
             "rest_s": (HOLD_LIMITS["rest_s_min"], 180)},
}
DOSE_KEYS = {"reps": ("reps",), "contacts": ("reps",), "efforts": ("reps", "distance_m"),
             "hold": ("seconds",)}
MAXIMAL = re.compile(r"\bmax(imal|imum)?\b|\bto failure\b|\b1 ?rm\b|\bone[- ]rep\b|"
                     r"\bas many (reps )?as (you can|possible)\b|\bamrap\b", re.I)
MOVE_ON = re.compile(r"two sessions in a row.*owner approves", re.I)
# The quality rubric's CT1 limits for in-session screens (K2 to K5):
# docs/knowledge/decisions/quality-rubric.md. A cue is a button label; every other card
# line is counted per sentence, as the rubric's Script I counts text on screen.
CUE_WORDS = 3
SENTENCE_WORDS = 12
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")

# Warning signs every card's stop_if must carry (training-rules Decision, "Warning signs
# that stop a session"). Long signs may be split into several items; the check reads them
# together, so a split keeps every sign and a dropped one fails.
REQUIRED_STOPS = {
    "a pain sign": re.compile(r"\bpain (in|that changes how you move)\b", re.I),
    "chest pain": re.compile(r"\bchest pain\b", re.I),
    "a racing heartbeat": re.compile(r"\bracing heartbeat\b", re.I),
    "shortness of breath": re.compile(r"\bshortness of breath\b", re.I),
    "dizziness": re.compile(r"\bdizz", re.I),
    "feeling faint": re.compile(r"\bfaint", re.I),
}
SVG_BANNED = re.compile(r"<metadata|<script|<image|<foreignObject|sodipodi|inkscape|"
                        r"xlink:href|href=|data:|\son[a-z]+=|<!ENTITY|<!DOCTYPE", re.I)


def load_cards(root: Path) -> dict[str, tuple[Path, dict | None]]:
    cards = {}
    for f in sorted((root / "content" / "exercises").glob("*.json")):
        if f.name.endswith(DOSSIER_SUFFIX):
            continue  # a card's dossier (story 115), checked by check_dossiers
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


def shown_text(card: dict) -> list[tuple[str, str]]:
    """The card lines the player shows, as (field, text) pairs, in the shape the screen
    renders them (web/src/SessionPlayer.tsx and the cue feedback of web/src/player.ts)."""
    out = [("why", card["why"])]
    # Story 117: the player's intro shows every setup line and the parent checks (story 112).
    out += [(f"setup.{k}", v) for k, v in card["setup"].items() if isinstance(v, str)]
    out += [(f"parent_check[{i}]", c) for i, c in enumerate(card["parent_check"])]
    out += [(f"steps[{i}]", s) for i, s in enumerate(card["steps"])]
    out += [(f"cues[{i}] feedback", f"{c}: nice") for i, c in enumerate(card["cues"])]
    for i, m in enumerate(card["mistakes"]):
        out += [(f"mistakes[{i}].mistake", m["mistake"]), (f"mistakes[{i}].fix", f": {m['fix']}")]
    out += [(f"stop_if[{i}]", s) for i, s in enumerate(card["stop_if"])]
    out.append(("easier", f"Easier: {card['easier']['variant']} ({card['easier']['use_when']})"))
    out += [("harder.variant", card["harder"]["variant"]),
            ("harder.move_on_when", card["harder"]["move_on_when"]),
            ("dose.tempo", f"Tempo: {card['dose']['tempo']}.")]
    return out


def _words(text: str) -> int:
    return len(text.split())


def text_errors(card: dict) -> list[str]:
    """CT1 (quality rubric): cue labels at most 3 words, every other sentence at most 12."""
    out = []
    for i, cue in enumerate(card["cues"]):
        if _words(cue) > CUE_WORDS:
            out.append(f"cues[{i}] {cue!r} is {_words(cue)} words; a cue label is at most "
                       f"{CUE_WORDS} (quality rubric CT1)")
    for field, text in shown_text(card):
        for sentence in SENTENCE_END.split(text.strip()):
            if _words(sentence) > SENTENCE_WORDS:
                out.append(f"{field}: {sentence!r} is {_words(sentence)} words; an in-session "
                           f"sentence is at most {SENTENCE_WORDS} (quality rubric CT1)")
    return out


def safety_errors(card: dict) -> list[str]:
    """Warning signs every card's stop_if must keep (training-rules Decision)."""
    stops = " ".join(card["stop_if"])
    return [f"stop_if is missing {name} (training-rules Decision, warning signs)"
            for name, pattern in REQUIRED_STOPS.items() if not pattern.search(stops)]


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
        found += [f"{rel}: {e}" for e in safety_errors(card)]
        found += [f"{rel}: {e}" for e in text_errors(card)]
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
    found += check_dossiers(root, good, by_path)
    return found


# --- Exercise dossiers (story 115) -------------------------------------------------------
# The exercise-dossier Decision (docs/knowledge/decisions/exercise-dossier.md) sets the file
# shape; the claim rules (docs/knowledge/dossiers/claim-rules.md) set what a claim may say.
# A dossier is content/exercises/<id>.dossier.json beside its card. The pass fails a dossier
# when:
# 1. it has no card, or `id` and `card` disagree (a card with no dossier fails only once
#    DOSSIER_REQUIRED is on: story 115 adds the plank first, the other cards follow);
# 2. a field is missing, the wrong type, or outside the Decision's counts and lengths, or
#    `approved` is not false (only the parent approves, in the app);
# 3. a claim has no sources, a source id does not resolve, or a source is unused;
# 4. `evidence` differs from the label computed from the sources, or an `adult` claim's text
#    does not say "adult";
# 5. a "what to expect" claim has no outcome, no youth source, or a text that does not quote
#    its range (low end first) and its weeks;
# 6. keeper-facing text holds a word the claim rules refuse (looks, size, shape, weight,
#    prevention, promises), outside a `negates` limits claim;
# 7. a `main` muscle is not `measured`, or a muscle id is not in the vocabulary;
# 8. `clips` is not empty (no clip policy Decision yet);
# 9. a source URL is not https (an `app` source is a repo path), or is a link the privacy
#    guard refuses;
# 10. a keeper-facing sentence runs over SENTENCE_WORDS: the player opens the dossier from the
#    card's intro before set 1, so it is held to the in-session limit of the quality rubric's
#    CT1, like the card (claim rule 11, short sentences).
# It warns (exit 0) when `stale_after` has passed, when keeper-facing text runs past about
# 2,000 characters, and when its reading-grade estimate is above grade 8.

DOSSIER_SUFFIX = ".dossier.json"
# Story 115 builds the dossiers in two PRs; the second turns this on with the last dossier.
DOSSIER_REQUIRED = False
ACTIONS = ("dive", "set-position", "jump", "distribution", "recovery")
EVIDENCE = ("youth", "adult", "mixed", "app")
SOURCE_KINDS = ("position-statement", "meta-analysis", "review", "trial", "observational",
                "lab-study", "guidance", "reference", "app")
MUSCLES = frozenset((
    "rectus-abdominis", "external-oblique", "internal-oblique", "transversus-abdominis",
    "erector-spinae", "gluteus-maximus", "gluteus-medius", "hip-adductors", "hip-flexors",
    "quadriceps", "hamstrings", "calves", "tibialis-anterior", "pectorals", "deltoids",
    "triceps", "biceps", "latissimus-dorsi", "trapezius", "serratus-anterior",
    "rotator-cuff", "forearm-flexors"))
# The claim rules' refused words, matched as whole words, case-insensitive ("absorb",
# "fatigue" and "clean" pass). Each new kind of finding becomes a rule here, with a test.
REFUSED_WORDS = (
    "tone", "toned", "sculpt", "bulk", "bigger muscles", "muscle growth", "grow your muscles",
    "hypertrophy", "six-pack", "abs", "flat stomach", "burn fat", "fat", "lose weight",
    "gain weight", "weight loss", "slim", "lean", "body shape", "look better", "prevent",
    "prevents", "injury-proof", "protects you from", "guarantee", "you will")
REFUSED = re.compile(r"(?<![\w-])(" + "|".join(re.escape(w).replace(r"\ ", r"\s+")
                                               for w in REFUSED_WORDS) + r")(?![\w-])", re.I)
SOURCE_ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
REPO_PATH = re.compile(r"^(content|docs)/[\w.-]+(/[\w.-]+)*$")
STAMP = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")
PRIVATE_LINK = re.compile(r"claude\.ai/|docs\.google\.com|drive\.google\.com|"
                          r"gist\.github\.com|dropbox\.com|onedrive\.live\.com", re.I)
NUMBER = re.compile(r"\d+(?:\.\d+)?")
DOSSIER_CHARS = 2000
READING_GRADE = 8.0


def load_dossiers(root: Path) -> dict[str, tuple[Path, dict | None]]:
    out = {}
    for f in sorted((root / "content" / "exercises").glob("*" + DOSSIER_SUFFIX)):
        stem = f.name[:-len(DOSSIER_SUFFIX)]
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            out[stem] = (f, data if isinstance(data, dict) else None)
        except ValueError:
            out[stem] = (f, None)
    return out


def _text(value: object, lo: int, hi: int) -> bool:
    return isinstance(value, str) and lo <= len(value.strip()) <= hi and value == value.strip()


def _pair(value: object) -> bool:
    return (isinstance(value, list) and len(value) == 2
            and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in value)
            and value[0] <= value[1])


def _whole_pair(value: object) -> bool:
    return _pair(value) and all(isinstance(v, int) for v in value)  # type: ignore[union-attr]


def computed_evidence(ids: list[str], population: dict[str, str]) -> str:
    """The Decision's rule: app sources are set aside unless they are all there is; then all
    youth gives youth, all adult gives adult, any other mix gives mixed."""
    pops = [population[i] for i in ids if i in population]
    rest = [p for p in pops if p != "app"]
    if not rest:
        return "app"
    if all(p == "youth" for p in rest):
        return "youth"
    if all(p == "adult" for p in rest):
        return "adult"
    return "mixed"


def source_errors(sources: object) -> tuple[list[str], dict[str, str]]:
    """Errors in `sources`, and each good source's population by id."""
    if not isinstance(sources, list) or not sources:
        return ["sources must list at least one source"], {}
    out: list[str] = []
    population: dict[str, str] = {}
    for i, s in enumerate(sources):
        where = f"sources[{i}]"
        if not isinstance(s, dict):
            out.append(f"{where} must be an object")
            continue
        sid = s.get("id")
        if not (isinstance(sid, str) and SOURCE_ID.match(sid) and len(sid) <= 40):
            out.append(f"{where}.id must be lowercase kebab, up to 40 characters")
            continue
        where = f"source {sid}"
        if sid in population:
            out.append(f"{where} is listed twice")
        if not _text(s.get("title"), 1, 200):
            out.append(f"{where}: title must be 1 to 200 characters")
        if s.get("kind") not in SOURCE_KINDS:
            out.append(f"{where}: kind must be one of {', '.join(SOURCE_KINDS)}")
        if s.get("population") not in EVIDENCE:
            out.append(f"{where}: population must be one of {', '.join(EVIDENCE)}")
        if not _text(s.get("band"), 1, 30):
            out.append(f"{where}: band must be an age band of 1 to 30 characters")
        if not isinstance(s.get("year"), int) or isinstance(s.get("year"), bool):
            out.append(f"{where}: year must be a whole number")
        url = s.get("url")
        if not isinstance(url, str):
            out.append(f"{where}: url is missing")
        elif s.get("population") == "app" or s.get("kind") == "app":
            if not REPO_PATH.match(url) or ".." in url:
                out.append(f"{where}: an app source's url is a path in this repo")
        elif not url.startswith("https://"):
            out.append(f"{where}: url must be https://")
        if isinstance(url, str) and (PRIVATE_LINK.search(url) or privacy_guard.scan(
                url, where, skip=frozenset({privacy_guard.PATH_RULE}))):
            out.append(f"{where}: url is a private link the privacy guard refuses")
        population[sid] = str(s.get("population"))
    return out, population


def claim_errors(claim: object, where: str, population: dict[str, str], used: set[str], *,
                 action: bool = False, outcome: bool = False, negates_ok: bool = False,
                 text_field: str = "text", text_len: tuple[int, int] = (20, 220)) -> list[str]:
    """One claim record (or a muscle-map entry, whose text is its `plain` label)."""
    if not isinstance(claim, dict):
        return [f"{where} must be an object"]
    out = []
    text = claim.get(text_field)
    if not _text(text, *text_len):
        out.append(f"{where}.{text_field} must be {text_len[0]} to {text_len[1]} characters")
        text = text if isinstance(text, str) else ""
    detail = claim.get("detail")
    if detail is not None and not _text(detail, 1, 400):
        out.append(f"{where}.detail must be up to 400 characters")
    ids = claim.get("sources")
    if not (isinstance(ids, list) and 1 <= len(ids) <= 4 and all(isinstance(i, str) for i in ids)):
        out.append(f"{where} has no sources: every claim names 1 to 4 source ids (claim rule 1)")
        ids = []
    for i in ids:
        if i not in population:
            out.append(f"{where}: source {i} is not in sources")
    used.update(ids)
    if claim.get("evidence") not in EVIDENCE:
        out.append(f"{where}.evidence must be one of {', '.join(EVIDENCE)}")
    elif ids and all(i in population for i in ids):
        want = computed_evidence(ids, population)
        if claim["evidence"] != want:
            out.append(f"{where}: evidence is {claim['evidence']}, but its sources give {want}")
        elif want == "adult" and text_field == "text" and not re.search(r"\badults?\b", text, re.I):
            out.append(f"{where}: adult-only evidence must say so in its text (claim rule 3)")
    if action:
        if claim.get("action") not in ACTIONS:
            out.append(f"{where}.action must be one of {', '.join(ACTIONS)}")
    elif "action" in claim:
        out.append(f"{where}: action belongs only in why.claims")
    if claim.get("negates") not in (None, True):
        out.append(f"{where}.negates must be true or absent")
    negates = claim.get("negates") is True
    if negates and not negates_ok:
        out.append(f"{where}: negates is allowed only in science.limits")
    if not (negates and negates_ok):
        for field in (text, detail if isinstance(detail, str) else ""):
            m = REFUSED.search(field)
            if m:
                out.append(f"{where}: says {m.group(1)!r}, which the claim rules refuse "
                           f"(claim rules 4, 5 and 7)")
    if outcome:
        out += outcome_errors(claim, where, text, population, ids)
    elif "outcome" in claim:
        out.append(f"{where}: outcome belongs only in expect.claims")
    return out


def _num(v: float) -> str:
    return f"{v:g}"


def outcome_errors(claim: dict, where: str, text: str, population: dict[str, str],
                   ids: list[str]) -> list[str]:
    """Claim rule 4: an expected change is a range with a time frame, from a youth source."""
    o = claim.get("outcome")
    if not isinstance(o, dict):
        return [f"{where} has no outcome: an expected change states its range and weeks"]
    out = []
    if not _text(o.get("measure"), 1, 60):
        out.append(f"{where}.outcome.measure must be 1 to 60 characters")
    if not _pair(o.get("change_pct")):
        out.append(f"{where}.outcome.change_pct must be [low, high], low first")
    if not _whole_pair(o.get("weeks")):
        out.append(f"{where}.outcome.weeks must be [low, high] whole numbers")
    if not _whole_pair(o.get("sessions_per_week")):
        out.append(f"{where}.outcome.sessions_per_week must be [low, high] whole numbers")
    if not _text(o.get("band"), 1, 30):
        out.append(f"{where}.outcome.band must be an age band")
    if not any(population.get(i) == "youth" for i in ids):
        out.append(f"{where}: an expected change needs a youth source (claim rule 3)")
    if out:
        return out
    numbers = NUMBER.findall(text)
    for name in ("change_pct", "weeks"):
        lo, hi = (_num(v) for v in o[name])
        if lo == hi:
            if lo not in numbers:
                out.append(f"{where}: text does not quote its {name} {lo} (claim rule 4)")
        elif not re.search(rf"(?<![\d.]){re.escape(lo)}\s*%?\s*to\s*{re.escape(hi)}(?![\d.])",
                           text):
            out.append(f"{where}: text does not quote its {name} as '{lo} to {hi}', "
                       f"low end first (claim rule 4)")
    return out


def _count(value: object, lo: int, hi: int) -> bool:
    return isinstance(value, list) and lo <= len(value) <= hi


def _part(d: dict, key: str, out: list[str]) -> dict:
    if not isinstance(d.get(key), dict):
        out.append(f"{key} must be an object")
        return {}
    return d[key]


def dossier_errors(d: object, stem: str, cards: dict[str, dict]) -> list[str]:
    """Every finding for one dossier (rules 1 to 9 above)."""
    if not isinstance(d, dict):
        return ["not a JSON object"]
    out: list[str] = []
    if d.get("id") != stem:
        out.append(f"id {d.get('id')!r} must match the file name {stem!r}")
    if stem not in cards:
        out.append(f"no card content/exercises/{stem}.json for this dossier")
    if d.get("card") != f"content/exercises/{stem}.json":
        out.append(f"card must be content/exercises/{stem}.json")
    if d.get("approved") is not False:
        out.append("approved must start false; only the parent approves, in the app")
    if d.get("licence") != "CC-BY-SA-4.0":
        out.append("licence must be CC-BY-SA-4.0")
    for k in ("reviewed_at", "stale_after"):
        if not (isinstance(d.get(k), str) and STAMP.match(d[k])):
            out.append(f"{k} must be a UTC timestamp (YYYY-MM-DDTHH:MM:SSZ)")
    errs, population = source_errors(d.get("sources"))
    out += errs
    used: set[str] = set()

    why = _part(d, "why", out)
    headline = why.get("headline")
    if not _text(headline, 10, 80):
        out.append("why.headline must be 10 to 80 characters")
    elif REFUSED.search(headline):
        out.append(f"why.headline: says {REFUSED.search(headline).group(1)!r}, which the "
                   f"claim rules refuse")
    if not _count(why.get("claims"), 2, 4):
        out.append("why.claims must list 2 to 4 claims")
    for i, c in enumerate(why.get("claims") or []):
        out += claim_errors(c, f"why.claims[{i}]", population, used, action=True)

    expect = _part(d, "expect", out)
    if not _count(expect.get("claims"), 2, 4):
        out.append("expect.claims must list 2 to 4 claims")
    for i, c in enumerate(expect.get("claims") or []):
        out += claim_errors(c, f"expect.claims[{i}]", population, used, outcome=True)
    if "keep_up" not in expect:
        out.append("expect.keep_up is missing")
    else:
        out += claim_errors(expect["keep_up"], "expect.keep_up", population, used)

    muscles = _part(d, "muscles", out)
    if not _count(muscles.get("map"), 2, 8):
        out.append("muscles.map must list 2 to 8 entries")
    for i, m in enumerate(muscles.get("map") or []):
        where = f"muscles.map[{i}]"
        out += claim_errors(m, where, population, used, text_field="plain", text_len=(1, 60))
        if not isinstance(m, dict):
            continue
        if m.get("muscle") not in MUSCLES:
            out.append(f"{where}: muscle {m.get('muscle')!r} is not in the vocabulary")
        if m.get("role") not in ("main", "helping"):
            out.append(f"{where}.role must be main or helping")
        if m.get("basis") not in ("measured", "cued"):
            out.append(f"{where}.basis must be measured or cued")
        if m.get("role") == "main" and m.get("basis") != "measured":
            out.append(f"{where}: a main muscle must be measured in a study")
    if muscles.get("note") is not None:
        out += claim_errors(muscles["note"], "muscles.note", population, used)

    if d.get("clips") != []:
        out.append("clips must be empty until the clip policy Decision exists")

    science = _part(d, "science", out)
    if not _count(science.get("claims"), 2, 5):
        out.append("science.claims must list 2 to 5 claims")
    for i, c in enumerate(science.get("claims") or []):
        out += claim_errors(c, f"science.claims[{i}]", population, used)
    if not _count(science.get("limits"), 1, 3):
        out.append("science.limits must list 1 to 3 claims: say what is not known (claim rule 9)")
    for i, c in enumerate(science.get("limits") or []):
        out += claim_errors(c, f"science.limits[{i}]", population, used, negates_ok=True)

    for sid in population:
        if sid not in used:
            out.append(f"source {sid} is not cited by any claim")
    for text in keeper_text(d):
        for sentence in SENTENCE_END.split(text.strip()):
            if _words(sentence) > SENTENCE_WORDS:
                out.append(f"{sentence!r} is {_words(sentence)} words; a sentence the player "
                           f"shows is at most {SENTENCE_WORDS} (quality rubric CT1)")
    return out


def keeper_text(d: dict) -> list[str]:
    """The keeper-facing text of a dossier: the headline, every claim and the muscle labels."""
    part = lambda k: d.get(k) if isinstance(d.get(k), dict) else {}  # noqa: E731
    out = [part("why").get("headline", "")]
    for section in ("why", "expect", "science"):
        for key in ("claims", "limits"):
            out += [c.get("text", "") for c in part(section).get(key) or [] if isinstance(c, dict)]
    keep_up = part("expect").get("keep_up")
    if isinstance(keep_up, dict):
        out.append(keep_up.get("text", ""))
    out += [m.get("plain", "") for m in part("muscles").get("map") or [] if isinstance(m, dict)]
    note = part("muscles").get("note")
    if isinstance(note, dict):
        out.append(note.get("text", ""))
    return [t for t in out if isinstance(t, str) and t]


def _syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    groups = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and not w.endswith(("le", "ee")) and groups > 1:
        groups -= 1
    return max(1, groups)


def reading_grade(texts: list[str]) -> float:
    """Flesch-Kincaid grade, standard library only: an estimate, never the final word."""
    sentences = [s for t in texts for s in SENTENCE_END.split(t.strip()) if s.strip()]
    words = [w for s in sentences for w in re.findall(r"[A-Za-z']+", s)]
    if not sentences or not words:
        return 0.0
    syllables = sum(_syllables(w) for w in words)
    return 0.39 * len(words) / len(sentences) + 11.8 * syllables / len(words) - 15.59


def dossier_warnings(root: Path, now: str | None = None) -> list[str]:
    """Stale dossiers, long ones and a high reading grade: reviewed, never hidden."""
    import datetime
    now = now or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = []
    for f, d in load_dossiers(root).values():
        if not isinstance(d, dict):
            continue
        rel = f.relative_to(root).as_posix()
        stale = d.get("stale_after")
        if isinstance(stale, str) and STAMP.match(stale) and stale <= now:
            out.append(f"{rel}: stale_after {stale} has passed; review it")
        texts = keeper_text(d)
        chars = sum(len(t) for t in texts)
        if chars > DOSSIER_CHARS:
            out.append(f"{rel}: keeper-facing text is {chars} characters, above about "
                       f"{DOSSIER_CHARS} (two iPad screens)")
        grade = reading_grade(texts)
        if grade > READING_GRADE:
            out.append(f"{rel}: reading grade about {grade:.1f}, above {READING_GRADE:g} "
                       f"(an estimate; the reviewer's read decides)")
    return out


def check_dossiers(root: Path, cards: dict[str, dict], by_path: dict[str, dict]) -> list[str]:
    """Every dossier's findings and its credits entry; with DOSSIER_REQUIRED, every card's dossier."""
    found: list[str] = []
    dossiers = load_dossiers(root)
    for stem, (f, d) in dossiers.items():
        rel = f.relative_to(root).as_posix()
        if d is None:
            found.append(f"{rel}: not valid JSON")
            continue
        found += [f"{rel}: {e}" for e in dossier_errors(d, stem, cards)]
        found += credits_errors(rel, by_path)
    if DOSSIER_REQUIRED:
        found += [f"content/exercises/{stem}.json: no dossier at "
                  f"content/exercises/{stem}{DOSSIER_SUFFIX}" for stem in cards
                  if stem not in dossiers]
    return found



def main(argv: list[str]) -> int:
    root = Path(argv[argv.index("--root") + 1]) if "--root" in argv else Path(
        __file__).resolve().parent.parent
    findings = check(root)
    for w in dossier_warnings(root):
        print(f"content_check: warning: {w}")
    if findings:
        print("content_check:\n" + "\n".join(findings), file=sys.stderr)
        return 1
    print(f"content_check: ok ({len(load_cards(root))} cards)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
