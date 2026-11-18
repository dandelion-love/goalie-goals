#!/usr/bin/env python3
"""privacy_guard.py: keep private data out of this PUBLIC repository.

Everything here is public: files, file names, commit messages, author lines, issues, pull
requests and comments. The app is built around a real young athlete and their family, so
the bar is higher than "no secrets": no names, no contact details, no places, no photos or
recordings, no health or body data, and no addresses of the infrastructure that runs it.

It runs from the git hooks in .githooks/ (pre-commit, commit-msg, pre-push) and from the
Claude Code hooks in .claude/settings.json (before a git commit or push, a gh write, or a
write tool of the gtd or GitHub MCP servers). Strict on purpose: a false alarm costs a
rewrite of one line; a leak cannot be taken back. There is no allow marker: rewrite the
line, use example.com addresses and obviously fake values in tests.

Modes:
  --staged          staged files and their names (pre-commit)
  --message FILE    a commit message (commit-msg)
  --pre-push        git's pre-push lines on stdin: every outgoing commit
  --range A..B      every commit in a range that no remote has yet
  --history [REF]   author and committer lines of every commit reachable from REF
                    (default HEAD), pushed ones included: catches commits GitHub made
  --all             every tracked file
  --text            text on stdin, read as a message (check an issue body before posting)
  --claude-hook     a Claude Code PreToolUse event on stdin; prints a deny decision
  --codex-hook      the same for Codex (same event and deny shape)
  --session-start   a Claude Code SessionStart hook: wire the git hooks, report status
  --status          which private-term sources are loaded (never the terms themselves)

Private terms (names, places, teams, schools, private domains) are never written in this
repo. They live outside it, one per line, matched case-insensitively as whole words; a
line starting with "re:" is a regular expression and "#" starts a comment. Sources, all
read when present:
  $GOALIE_PRIVATE_TERMS, else ~/.config/goalie-goals/private-terms.txt   (a file)
  $GOALIE_PRIVATE_TERMS_TEXT       the terms themselves, ";" or newline separated (cloud, CI)
  $GTD_PUBLIC_DENYLIST, else ~/.config/gtd/public-denylist.txt   (shared with gtd-board-kit)
plus the gtd server's host when the board kit resolves it from outside the repo.

Exit status: 0 clean (or a hook decision printed), 1 private data found, 2 bad usage.
Standard library only.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_BYTES = 2_000_000
LOCKFILES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "uv.lock", "poetry.lock",
             "Cargo.lock", "bun.lockb"}
ZERO = "0" * 40

ALLOWED_EMAIL = re.compile(
    r"(noreply@anthropic\.com|noreply@github\.com|git@github\.com"
    r"|@users\.noreply\.github\.com|@example\.(?:com|org|net))$", re.I)
PLACEHOLDER = re.compile(
    r"^(<.*>|\$\{.*\}|\{\{.*\}\}|\$[A-Z_]+|.*(example|placeholder|dummy|fake|changeme"
    r"|redacted|xxxx|your[_-]|not[_-]a[_-]real).*)$", re.I)
NO_EDGE = r"(?<![A-Za-z0-9+/=_-])"
# Public citation ids are not ids of ours: a DOI suffix (10.<registrant>/...), an App
# Store app id (apps.apple.com/.../id<n>) and an ISBN-13 (978 or 979, 13 digits).
PUBLIC_ID_BEFORE = re.compile(
    r"(?:\b10\.\d{4,9}/\S*|apps\.apple\.com/\S*/id|\bISBN(?:-13)?[:\s]*)$", re.I)
ISBN13 = re.compile(r"97[89]\d{10}")

# (name, pattern, applies to messages and issue text too). Generic shapes only: nothing
# private is named here.
RULES: list[tuple[str, re.Pattern[str], bool]] = [
    ("secret or token", re.compile(
        NO_EDGE + r"(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}"
        r"|gtdj_[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{32,}"
        r"|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|GOCSPX-[A-Za-z0-9_-]{10,}"
        r"|ya29\.[A-Za-z0-9_-]{20,}|1//0[A-Za-z0-9_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}"
        r"|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.)"
        r"|-----BEGIN [A-Z ]*PRIVATE KEY-----|\"private_key(?:_id)?\"\s*:"), True),
    ("OAuth client id", re.compile(
        r"\d{6,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com"), True),
    ("credential in code", re.compile(
        r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token"
        r"|client[_-]?secret)[\"']?\s*[:=]\s*[\"']([^\"'\s]{8,})[\"']"), True),
    ("cloud host, bucket or account", re.compile(
        r"([\w-]+\.run\.app|[\w-]+\.iam\.gserviceaccount\.com|[\w-]+\.cloudfunctions\.net"
        r"|[\w-]+\.firebaseapp\.com|[\w-]+\.appspot\.com|gs://[\w.-]+)"), True),
    # An age is identifying: public text uses a band ("U15", "early teens"). A narrow
    # range of years is an age too. Research cites ages as bands as well.
    ("age or birthday", re.compile(
        r"(?i)\b(?:\d{1,2}(?:\s*(?:to|or|[^\w\s])\s*\d{1,2})?[- ](?:years?|yrs?)[- ]olds?\b"
        r"|aged?\s+\d{1,2}(?:\s*(?:to|or|[^\w\s])\s*\d{1,2})?(?![\w.])"
        r"(?!\s*(?:days?|weeks?|months?|hours?|minutes?|seconds?|%|ms|s)\b)"
        r"|turn(?:s|ed|ing)\s+\d{1,2}\b|\d{1,2}(?:st|nd|rd|th)\s+birthday"
        r"|birthday\s+(?:is|on)\s+\w+)"), True),
    ("IP address", re.compile(
        r"(?<![\w.])(?!127\.0\.0\.1(?![\w.])|0\.0\.0\.0(?![\w.]))\d{1,3}(?:\.\d{1,3}){3}"
        r"(?![\w.])"), True),
    ("long numeric id", re.compile(r"(?<![\w.#-])\d{9,}(?![\w.])"), True),
    ("email address", re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), True),
    ("phone number", re.compile(
        r"(?<![\w.+-])(?:\+?1[ .-]?)?\(?[2-9]\d{2}\)?[ .-]\d{3}[ .-]\d{4}(?![\w.])"), True),
    ("postal code", re.compile(
        r"\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d\b"), True),
    ("private filesystem path", re.compile(
        r"((?<![A-Za-z])[A-Za-z]:\\[^\s`'\"]|/Users/[A-Za-z]|/home/(?!user\b|runner\b|node\b)"
        r"[a-z][\w-]*/|/mnt/(?:user|project)-(?:files|data)|(?<![\w.])/[a-z]/(?:Users|work)/)"),
     True),
    ("claude.ai link", re.compile(
        r"claude\.ai/(?:code/)?(?:artifact|project|session|chat|share)", re.I), False),
]
PATH_RULE = "private filesystem path"

BLOCKED_FILE = [
    ("secrets file", re.compile(
        r"(^|/)(\.env(\.(?!example$|sample$|template$)[\w.-]+)?|\.netrc|\.pypirc"
        r"|id_(rsa|dsa|ecdsa|ed25519)[\w.-]*|[^/]*service[-_]?account[^/]*\.json"
        r"|[^/]*credentials?[^/]*\.json|client_secret[^/]*\.json"
        r"|[^/]*\.(pem|key|p12|pfx|jks|keystore))$", re.I)),
    # State and plans hold every resource id and often secrets in clear; vars files hold
    # the deployment's identifiers. Only *.tf and .terraform.lock.hcl belong in git.
    ("Terraform state, variables or plan", re.compile(
        r"(^|/)(\.terraform/|[^/]*\.tfstate([.][\w.-]+)?$|\.terraform\.tfstate\.lock\.info$"
        r"|[^/]*\.tfvars([.](?!example$)[\w.-]+)?$|[^/]*\.tfplan$|crash([.]\d+)?\.log$)", re.I)),
    ("database or personal data export", re.compile(
        r"\.(sqlite3?|db|fit|gpx|tcx|kml|kmz|xlsx?|numbers|vcf|ics)$", re.I)),
    ("camera photo, video or voice recording", re.compile(
        r"\.(jpe?g|heic|heif|dng|raw|mov|mp4|m4v|3gp|avi|mkv|m4a|aac|amr|wav|caf)$", re.I)),
]

_terms: list[re.Pattern[str]] | None = None
_term_sources: list[str] = []


# --------------------------------------------------------------------------- terms

def _compile_terms(lines: list[str]) -> list[re.Pattern[str]]:
    out: list[re.Pattern[str]] = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("re:"):
            out.append(re.compile(line[3:], re.I))
        else:
            out.append(re.compile(rf"(?<![A-Za-z0-9]){re.escape(line)}(?![A-Za-z0-9])", re.I))
    return out


def _read(path: str) -> list[str] | None:
    try:
        return Path(path).expanduser().read_text(encoding="utf-8").splitlines()
    except OSError:
        return None


def private_terms() -> list[re.Pattern[str]]:
    global _terms
    if _terms is not None:
        return _terms
    found: list[re.Pattern[str]] = []
    _term_sources.clear()
    home = Path.home()
    files = [
        ("goalie-goals terms file", os.environ.get("GOALIE_PRIVATE_TERMS")
         or str(home / ".config" / "goalie-goals" / "private-terms.txt")),
        ("shared gtd denylist", os.environ.get("GTD_PUBLIC_DENYLIST")
         or str(home / ".config" / "gtd" / "public-denylist.txt")),
    ]
    for label, path in files:
        lines = _read(path)
        if lines is not None:
            pats = _compile_terms(lines)
            if pats:
                found += pats
                _term_sources.append(f"{label}: {len(pats)} terms")
    inline = os.environ.get("GOALIE_PRIVATE_TERMS_TEXT")
    if inline:
        pats = _compile_terms(re.split(r"[;\n]", inline))
        if pats:
            found += pats
            _term_sources.append(f"$GOALIE_PRIVATE_TERMS_TEXT: {len(pats)} terms")
    host = _server_host()
    if host:
        found.append(re.compile(rf"(?<![\w.-]){re.escape(host)}(?![\w-])", re.I))
        _term_sources.append("gtd server host (resolved outside the repo)")
    _terms = found
    return found


def _server_host() -> str | None:
    """The gtd server's host, when the board kit resolves it from outside the repo."""
    kit_tools = ROOT / ".gtd" / "kit" / "tools"
    if not (kit_tools / "gtd_server.py").is_file():
        return None
    sys.path.insert(0, str(kit_tools))
    try:
        import gtd_server  # type: ignore
        res = gtd_server.resolve(ROOT)
        return res.host if res.host and not res.committed else None
    except Exception:  # noqa: BLE001 - a broken resolver must not stop the guard
        return None
    finally:
        sys.path.remove(str(kit_tools))


def private_term_names_loaded() -> bool:
    private_terms()
    return any(not s.startswith("gtd server host") for s in _term_sources)


# --------------------------------------------------------------------------- scanning

def _redact(line: str, spans: list[tuple[int, int]]) -> str:
    for start, end in sorted(spans, reverse=True):
        line = line[:start] + "[...]" + line[end:]
    line = line.strip()
    return line[:80] + ("..." if len(line) > 80 else "")


def scan(text: str, where: str, *, message: bool = False,
         skip: frozenset[str] = frozenset()) -> list[str]:
    """One finding per offending line. The matched text is never printed."""
    found: list[str] = []
    terms = private_terms()
    for n, line in enumerate(text.splitlines(), 1):
        hits: set[str] = set()
        spans: list[tuple[int, int]] = []
        for name, rx, in_msgs in RULES:
            if (message and not in_msgs) or name in skip:
                continue
            for m in rx.finditer(line):
                if name == "email address" and ALLOWED_EMAIL.search(m.group(0)):
                    continue
                if name == "credential in code" and PLACEHOLDER.match(m.group(1)):
                    continue
                if name == "long numeric id" and (
                        PUBLIC_ID_BEFORE.search(line[:m.start()])
                        or ISBN13.fullmatch(m.group(0))):
                    continue
                hits.add(name)
                spans.append(m.span())
        for rx in terms:
            for m in rx.finditer(line):
                hits.add("private term")
                spans.append(m.span())
        if hits:
            found.append(f"{where}:{n}: {', '.join(sorted(hits))}: {_redact(line, spans)}")
    return found


def scan_blob(path: str, blob: bytes, where: str) -> list[str]:
    out = scan(path, f"{where} (file name)")
    name = path.rsplit("/", 1)[-1]
    for label, rx in BLOCKED_FILE:
        if rx.search(path):
            out.append(f"{where}: {label} may not be committed here")
    if len(blob) > MAX_BYTES and name not in LOCKFILES:
        out.append(f"{where}: {len(blob) // 1000} kB is over the {MAX_BYTES // 1000} kB limit")
    if b"\0" in blob[:8000]:
        head = blob[:65536]
        # JPEG/TIFF "Exif\0\0", PNG "eXIf" chunk, WebP "EXIF" chunk.
        if b"Exif\0\0" in head or b"eXIf" in head or b"EXIF" in head:
            out.append(f"{where}: image carries camera metadata (EXIF); strip it or use a "
                       f"drawn asset")
    else:
        out += scan(blob.decode("utf-8", "replace"), where)
    return out


def git(*args: str, root: Path | None = None) -> str:
    return subprocess.run(["git", "-C", str(root or ROOT), *args], capture_output=True,
                          text=True, check=True, encoding="utf-8", errors="replace").stdout


def git_bytes(*args: str) -> bytes:
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True,
                          check=True).stdout


def scan_staged() -> list[str]:
    out: list[str] = []
    paths = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z").split("\0")
    for path in filter(None, paths):
        entry = git("ls-files", "-s", "--", path).split()
        if entry and entry[0] == "160000":
            continue  # a submodule pin: its own repo, scanned there
        out += scan_blob(path, git_bytes("show", f":{path}"), path)
    return out


def scan_commit(sha: str) -> list[str]:
    """What a commit introduces, plus its message and author lines. Every outgoing commit
    is scanned, so data added and removed again before a push is still caught."""
    parents = git("rev-list", "--parents", "-n", "1", sha).split()[1:]
    if parents:
        paths = git("diff", "--name-only", "--diff-filter=ACMR", "-z", parents[0], sha)
    else:
        paths = git("ls-tree", "-r", "--name-only", "-z", sha)
    out: list[str] = []
    for path in filter(None, paths.split("\0")):
        mode = git("ls-tree", sha, "--", path).split()
        if not mode or mode[0] == "160000":
            continue
        out += scan_blob(path, git_bytes("show", f"{sha}:{path}"), f"{sha[:8]}:{path}")
    out += scan(git("log", "-1", "--format=%B", sha), f"commit {sha[:8]} message",
                message=True)
    out += scan(git("log", "-1", "--format=%an <%ae>%n%cn <%ce>", sha),
                f"commit {sha[:8]} author", message=True)
    return out


def scan_history(ref: str = "HEAD") -> list[str]:
    """Author and committer lines of every commit reachable from ref, including
    commits already on a remote. The other modes skip pushed commits, so a merge
    commit GitHub writes (for example from its web merge button) is only seen here."""
    out: list[str] = []
    log = git("log", "--format=%h%x09%an <%ae>%x09%cn <%ce>", ref)
    for line in filter(None, log.splitlines()):
        sha, _, people = line.partition("\t")
        out += scan(people.replace("\t", "\n"), f"commit {sha} author", message=True)
    return out


def scan_range(rng: str) -> list[str]:
    out: list[str] = []
    for sha in git("rev-list", "--reverse", rng, "--not", "--remotes").split():
        out += scan_commit(sha)
    return out


def scan_new(head: str) -> list[str]:
    out: list[str] = []
    for sha in git("rev-list", "--reverse", head, "--not", "--remotes").split():
        out += scan_commit(sha)
    return out


def scan_pre_push(lines: list[str]) -> list[str]:
    out: list[str] = []
    for line in lines:
        parts = line.split()
        if len(parts) != 4:
            continue
        _, local_sha, _, remote_sha = parts
        if local_sha == ZERO:
            continue  # deleting a ref publishes nothing
        out += scan_new(local_sha) if remote_sha == ZERO else scan_range(
            f"{remote_sha}..{local_sha}")
    return out


def scan_outgoing() -> list[str]:
    """What a plain `git push` of the current branch would send."""
    try:
        upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").strip()
    except subprocess.CalledProcessError:
        return scan_new("HEAD")
    return scan_range(f"{upstream}..HEAD")


def scan_all() -> list[str]:
    out: list[str] = []
    for path in filter(None, git("ls-files", "-z").split("\0")):
        p = ROOT / path
        if p.is_symlink() or not p.is_file():
            continue
        out += scan_blob(path, p.read_bytes(), path)
    return out


# --------------------------------------------------------------------------- Claude hook

GH_WRITE = re.compile(
    r"\bgh\s+(?:issue|pr|release|gist|repo|label|project|api|discussion)\b[^|;&]*"
    r"(?:\b(?:create|edit|comment|review|close|reopen|merge|new|upload|delete|develop)\b"
    r"|\s-[fF]\s|--field|--raw-field|--input|-X\s*(?:POST|PATCH|PUT))")
GH_EXEMPT = re.compile(r"\bgh\s+(?:secret|variable)\b")
GIT_COMMIT = re.compile(r"\bgit\b[^|;&]*\bcommit\b")
GIT_PUSH = re.compile(r"\bgit\b[^|;&]*\bpush\b")
BYPASS = re.compile(
    r"\bgit\b[^|;&]*(--no-verify|\bcommit\b[^|;&]*\s-[a-zA-Z]*n[a-zA-Z]*\b"
    r"|core\.hooksPath(?!\s*=?\s*\.githooks\b))")
FILE_ARG = re.compile(r"(?:--body-file|--file|-F)[=\s]+(\"[^\"]+\"|'[^']+'|\S+)")
GIT_DIR = re.compile(r"\bgit\s+-C\s+(\"[^\"]+\"|'[^']+'|\S+)")

# Write tools of the gtd MCP server (any prefix) and of GitHub MCP servers.
GTD_WRITE = re.compile(
    r"^(capture|clarify|dispatch|organize|pr_open|intake_ack|listen_mark_post"
    r"|issue_(?!get$|list$|blocked_by_list$|artifact_get$|artifact_list$)\w+"
    r"|item_(?:claim|close_done|ready|release|renew|report)|comment_(?:update|redact)"
    r"|channel_comment_post|run_state_post|experiment_record|sub_issue_add|work_items_sync"
    r"|project_(?:create|copy|update|draft_add|draft_update|draft_convert|status_update"
    r"|set_field|set_status|add_item))$")
GITHUB_WRITE = re.compile(r"(create|update|add|push|merge|comment|edit|write|review)")


def _unquote(s: str) -> str:
    return s[1:-1] if len(s) > 1 and s[0] == s[-1] and s[0] in "\"'" else s


def _as_path(raw: str, cwd: Path) -> Path:
    raw = _unquote(raw)
    m = re.match(r"^/([a-zA-Z])/(.*)$", raw)  # a Git Bash path on Windows
    if m and os.name == "nt":
        raw = f"{m.group(1)}:/{m.group(2)}"
    p = Path(raw).expanduser()
    return p if p.is_absolute() else cwd / p


def _strings(obj) -> list[str]:
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, dict):
        return [s for v in obj.values() for s in _strings(v)]
    if isinstance(obj, list):
        return [s for v in obj for s in _strings(v)]
    return []


def check_command(cmd: str, cwd: Path) -> list[str]:
    findings: list[str] = []
    m = GIT_DIR.search(cmd)
    other_repo = False
    if m:
        try:
            other_repo = _as_path(m.group(1), cwd).resolve() != ROOT
        except OSError:
            other_repo = False
    is_commit, is_push = GIT_COMMIT.search(cmd), GIT_PUSH.search(cmd)
    if (is_commit or is_push) and not other_repo:
        if BYPASS.search(cmd):
            findings.append("command: skipping or rewiring this repo's git hooks is not "
                            "allowed here")
        if is_commit:
            findings += scan_staged()
            findings += scan(cmd, "commit command", message=True, skip=frozenset({PATH_RULE}))
            if re.search(r"\scommit\b[^|;&]*\s(-a\b|--all\b|-[a-zA-Z]*a[a-zA-Z]*\s)", cmd):
                findings.append("git commit -a: stage files explicitly so the guard sees them")
        if is_push:
            findings += scan_outgoing()
    if GH_WRITE.search(cmd) and not GH_EXEMPT.search(cmd):
        findings += scan(cmd, "gh command", message=True, skip=frozenset({PATH_RULE}))
    if (is_commit or GH_WRITE.search(cmd)) and not other_repo:
        for fm in FILE_ARG.finditer(cmd):
            p = _as_path(fm.group(1), cwd)
            if p.is_file():
                findings += scan(p.read_text(encoding="utf-8", errors="replace"),
                                 f"{p.name}", message=True)
    return findings


def check_mcp(tool: str, data: dict) -> list[str]:
    short = tool.rsplit("__", 1)[-1]
    is_github = "github" in tool.lower()
    if not (GTD_WRITE.match(short) or (is_github and GITHUB_WRITE.search(short))):
        return []
    findings: list[str] = []
    for key, value in data.items():
        for s in _strings(value):
            findings += scan(s, f"{short}.{key}", message=True)
    return findings


def use_worktree_of(cwd: Path) -> None:
    """Scan the checkout the command runs in. The hook is started from the project
    directory, but a session may work in another worktree of this repo; its staged
    files and outgoing commits are the ones that matter, not the main checkout's."""
    global ROOT
    try:
        top = Path(git("rev-parse", "--show-toplevel", root=cwd).strip())
        theirs = git("rev-parse", "--path-format=absolute", "--git-common-dir",
                     root=cwd).strip()
        mine = git("rev-parse", "--path-format=absolute", "--git-common-dir").strip()
    except (subprocess.CalledProcessError, OSError):
        return
    if top.parts and Path(theirs).resolve() == Path(mine).resolve():
        ROOT = top.resolve()


def claude_hook(raw: str) -> int:
    try:
        event = json.loads(raw)
    except ValueError:
        return 0
    tool = event.get("tool_name", "")
    data = event.get("tool_input") or {}
    cwd = Path(event.get("cwd") or ROOT)
    use_worktree_of(cwd)
    if tool in ("Bash", "PowerShell"):
        findings = check_command(data.get("command", ""), cwd)
    elif tool.startswith("mcp__"):
        findings = check_mcp(tool, data)
    else:
        return 0
    if findings:
        reason = ("privacy_guard: goalie-goals is a PUBLIC repository and this call would "
                  "publish private data. Blocked:\n" + "\n".join(findings[:20])
                  + "\nRewrite it in neutral terms (see .claude/skills/public-repo-privacy/"
                    "SKILL.md). Never bypass the guard.")
        # The deny form both Claude Code and Codex read (as the board kit's agent_guard).
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse", "permissionDecision": "deny",
            "permissionDecisionReason": reason}}))
        print(reason, file=sys.stderr)
    return 0


def session_start() -> int:
    try:
        if git("config", "--local", "--get", "core.hooksPath").strip() != ".githooks":
            raise subprocess.CalledProcessError(1, "git")
    except subprocess.CalledProcessError:
        try:
            git("config", "--local", "core.hooksPath", ".githooks")
        except subprocess.CalledProcessError:
            pass
    lines = ["goalie-goals is a PUBLIC repo: files, commits, issues and PRs are public. "
             "Read .claude/skills/public-repo-privacy/SKILL.md before writing anything that "
             "leaves this machine."]
    if private_term_names_loaded():
        lines.append("privacy_guard: private terms loaded (" + "; ".join(_term_sources) + ").")
    else:
        lines.append("privacy_guard WARNING: no private-terms source is set, so family "
                     "names, places and teams are NOT checked. Tell the owner; do not "
                     "publish issue text about people until it is set.")
    print("\n".join(lines))
    return 0


def status() -> int:
    private_terms()
    print("private-term sources: " + ("; ".join(_term_sources) or "none"))
    try:
        print("core.hooksPath: " + git("config", "--local", "--get", "core.hooksPath").strip())
    except subprocess.CalledProcessError:
        print("core.hooksPath: not set (run: git config core.hooksPath .githooks)")
    return 0


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    mode = argv[0]
    if mode in ("--claude-hook", "--codex-hook"):
        return claude_hook(sys.stdin.read())
    if mode == "--session-start":
        return session_start()
    if mode == "--status":
        return status()
    if mode == "--staged":
        findings = scan_staged()
    elif mode == "--message" and len(argv) > 1:
        findings = scan(Path(argv[1]).read_text(encoding="utf-8", errors="replace"),
                        "commit message", message=True)
    elif mode == "--pre-push":
        findings = scan_pre_push(sys.stdin.read().splitlines())
    elif mode == "--range" and len(argv) > 1:
        findings = scan_range(argv[1])
    elif mode == "--history":
        findings = scan_history(argv[1] if len(argv) > 1 else "HEAD")
    elif mode == "--all":
        findings = scan_all()
    elif mode == "--text":
        findings = scan(sys.stdin.read(), "stdin", message=True)
    else:
        print(f"unknown mode {mode}; see --help", file=sys.stderr)
        return 2
    if not private_term_names_loaded():
        print("privacy_guard: warning: no private-terms source; names and places are not "
              "checked (see --help)", file=sys.stderr)
    if findings:
        print("privacy_guard: this repository is PUBLIC; private data found:\n"
              + "\n".join(findings), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
