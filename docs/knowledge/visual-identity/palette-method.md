---
type: Pattern
title: Palette method and contrast table
description: How the app's colour roles (action, success, warning, stop, rest) are derived from safety-colour conventions, OKLCH and WCAG 2.2 contrast targets, with the computed light and dark contrast table and a colour-vision check.
tags: [visual-identity, colour, accessibility, wcag, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: wcag-contrast, resource: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, title: "W3C: Understanding WCAG 2.2 SC 1.4.3 Contrast (Minimum)" }
  - { id: wcag-nontext, resource: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html, title: "W3C: Understanding WCAG 2.2 SC 1.4.11 Non-text Contrast" }
  - { id: wcag-use-of-colour, resource: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html, title: "W3C: Understanding WCAG 2.2 SC 1.4.1 Use of Color" }
  - { id: wcag-luminance, resource: https://www.w3.org/WAI/GL/wiki/Relative_luminance, title: "W3C WAI: relative luminance" }
  - { id: iso-3864, resource: https://standards.iteh.ai/catalog/standards/iso/e38ba1f3-bbc1-4939-8df8-3078467e1f7c/iso-3864-1-2011, title: "ISO 3864-1:2011 Graphical symbols: safety colours and safety signs, part 1, design principles (catalogue entry)" }
  - { id: oklab, resource: https://bottosson.github.io/posts/oklab/, title: "Björn Ottosson: A perceptual color space for image processing (OKLab)" }
  - { id: css-color-4, resource: https://www.w3.org/TR/css-color-4/#ok-lab, title: "W3C CSS Color Module Level 4: OKLab and OKLCH" }
  - { id: machado, resource: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html, title: "Machado, Oliveira and Fernandes (2009): a physiologically-based model for simulation of color vision deficiency" }
  - { id: visual, resource: /ux/visual-language.md, title: Visual language }
---

# Roles

Five roles, each with one meaning everywhere in the app:

| Role | Means | Typical use |
|---|---|---|
| action | "do this" | primary buttons, links, the current step on the path |
| success | done, good form | a finished set, a completed day, a positive form rating |
| warning | take care | form cue, a load that needs the parent's look, a missed check |
| stop | stop now | pain report, end exercise, a safety stop |
| rest | recovery is part of the plan | rest days on the path, rest intervals, cool-down |

Colour is never the only signal: every role also has an icon and a word.[^wcag-use-of-colour]

# Method

The palette is derived from rules alone. No value was taken, sampled or compared from any
other app, including the reference app; the steps below produce every hex value from the
inputs named here.

1. **Hue from convention, not from a brand.** The international safety-colour convention gives red for
   prohibition and stop, yellow for warning, green for a safe condition and blue for a mandatory
   action.[^iso-3864] Those map onto stop, warning, success and action. Rest takes violet,
   in the widest gap left between the four (between action and stop), and a calm one. In OKLCH hue degrees: stop 27,
   warning 80, success 150, action 255, rest 300.
2. **Work in OKLCH.** OKLCH lightness tracks perceived lightness far better than HSL, so the
   same lightness gives roles the same visual weight.[^oklab] Browsers accept `oklch()`
   directly; the table below gives the sRGB hex each value lands on.[^css-color-4]
3. **Two tiers by lightness**, so the safety-critical pair never depends on hue:
   - deep roles (action, stop) carry white text in the light theme;
   - bright roles (success, warning, rest) sit at lightness 0.80 and carry dark text.
   Stop and success then differ by a luminance ratio of about 2.5, which survives every
   colour-vision deficiency.
4. **Chroma** is 90 per cent of the most the sRGB gamut allows at that lightness and hue,
   capped at 0.19, so colours are bold without turning neon.
5. **Contrast targets** (WCAG 2.2, computed on the final hex values):[^wcag-contrast]
   [^wcag-nontext] [^wcag-luminance]
   - text on a fill: at least 4.5:1 (AA for normal text, though button labels are large and
     bold);
   - role text ("ink") on page, card and its own tint: at least 4.7:1, a margin over 4.5;
   - a fill or its pressable edge against the page: at least 3:1 where it is what shows the
     control's boundary.
   For each role the script steps through lightness from 0.25 to 0.96 and keeps the
   lightest step that passes (light theme) or the darkest (dark theme), so colours stay as
   vivid as the targets allow.
6. **Neutrals** lean slightly towards the action hue (chroma 0.006 to 0.03), so greys feel
   part of the same set.

Each role gets five tokens: `fill`, `on` (text on the fill), `edge` (the darker pressable
bottom edge, at least 0.12 lower in OKLCH lightness than the fill), `ink` (the role as text or icon)
and `tint` (a soft panel).

# Contrast table: light theme

Page `#f4f7fb`, card `#ffffff`, text `#131e2b` (15.66:1 on page, 16.82:1 on card), muted
text `#525f6f` (6.06:1, 6.51:1), control line `#7e8792` (3.39:1, 3.64:1).

| Role | Fill | On | On / fill | Fill / page | Edge | Edge / page | Ink | Ink / page | Ink / card | Tint | Ink / tint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| action | `#1f76d8` | `#ffffff` | 4.52 | 4.21 | `#14549d` | 7.02 | `#1c6cc6` | 4.87 | 5.24 | `#edf4fe` | 4.73 |
| success | `#49de78` | `#131e2b` | 9.62 | 1.63 | `#2aa253` | 3.06 | `#1e7d3e` | 4.82 | 5.17 | `#e4fbe7` | 4.74 |
| warning | `#f0b236` | `#131e2b` | 8.91 | 1.76 | `#b78727` | 3.00 | `#8b661b` | 4.87 | 5.23 | `#fef2de` | 4.73 |
| stop | `#d73f39` | `#ffffff` | 4.51 | 4.19 | `#a61d1d` | 6.94 | `#ca322e` | 4.88 | 5.24 | `#fef0ee` | 4.72 |
| rest | `#c8aef9` | `#131e2b` | 8.71 | 1.80 | `#a772f5` | 3.07 | `#854ece` | 4.91 | 5.28 | `#f5f1fe` | 4.75 |

Bright fills are under 3:1 against the page on their own; their 3:1 edge and their label
identify the control, which is what SC 1.4.11 asks for.[^wcag-nontext]

# Contrast table: dark theme

Page `#0c121a`, card `#19212b`, text `#eef2f7` (16.72:1 on page, 14.44:1 on card), muted
text `#afb8c4` (9.38:1, 8.10:1), control line `#6a727d` (3.86:1, 3.34:1). Every fill
carries the page colour as its text.

| Role | Fill | On | On / fill | Fill / page | Edge | Edge / page | Ink | Ink / page | Ink / card | Tint | Ink / tint |
|---|---|---|---|---|---|---|---|---|---|---|---|
| action | `#217ce2` | `#0c121a` | 4.52 | 4.52 | `#165aa6` | 2.73 | `#4c98f5` | 6.37 | 5.50 | `#1a2c44` | 4.78 |
| success | `#49de78` | `#0c121a` | 10.75 | 10.75 | `#30b45d` | 6.99 | `#2ead59` | 6.48 | 5.59 | `#17321e` | 4.79 |
| warning | `#f0b236` | `#0c121a` | 9.96 | 9.96 | `#c18e2a` | 6.42 | `#bf8d29` | 6.32 | 5.45 | `#38280a` | 4.78 |
| stop | `#de463f` | `#0c121a` | 4.52 | 4.52 | `#b01f1f` | 2.74 | `#f7665b` | 6.27 | 5.42 | `#41211e` | 4.80 |
| rest | `#c8aef9` | `#0c121a` | 9.74 | 9.74 | `#ab79f5` | 6.07 | `#ac7cf5` | 6.23 | 5.38 | `#2f2540` | 4.77 |

In the dark theme every fill passes 3:1 against the page by itself; the edge is
decoration there.

# Colour-vision check

Fills were run through the Machado, Oliveira and Fernandes simulation at full severity
and compared by OKLab distance (×100; CSS Color 4 treats 2 as just noticeable).[^machado] [^css-color-4]

| Theme | Normal vision, closest pair | Protan | Deutan | Tritan | Stop vs success, deutan |
|---|---|---|---|---|---|
| light | 19.7 (success, warning) | 8.5 (success, warning) | 6.7 (success, warning) | 11.3 (warning, rest) | 19.6, luminance ratio 2.58 |
| dark | 19.7 (success, warning) | 8.5 (success, warning) | 6.7 (success, warning) | 11.3 (warning, rest) | 17.6, luminance ratio 2.38 |

Success and warning come closest under red-green deficiencies. Both are bright tiers by
design, so they always carry their icon and word; stop never relies on hue.

# Clean room

- The reference app's colours were never sampled, eyedropped or looked up, not even to
  steer away from them. The [visual language](/ux/visual-language.md) finding records the
  general style only.[^visual]
- Every value above comes from the inputs in this concept: five conventional hues, two
  lightness tiers, a chroma rule and the WCAG targets. Anyone can rerun the script and get
  the same values.

# Computation

Python 3 standard library only. Prints the values in both tables.

```python
import math

HUES = {"action": 255, "success": 150, "warning": 80, "stop": 27, "rest": 300}
BRIGHT = {"success", "warning", "rest"}  # light fills that carry dark text
BRIGHT_L, CHROMA_CAP = 0.80, 0.19
STEPS = [i / 1000 for i in range(250, 961, 5)]

def to_linear_rgb(L, C, h):  # OKLCH -> linear sRGB (Ottosson's OKLab matrices)
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)

def to_hex(rgb):
    enc = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(enc(min(max(c, 0), 1)) * 255):02x}" for c in rgb)

def luminance(hx):  # WCAG 2.2 relative luminance
    lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(int(hx[i:i + 2], 16) / 255) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(x, y):
    hi, lo = sorted((luminance(x), luminance(y)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

def colour(L, h, share=0.9, cap=CHROMA_CAP):  # 90% of the in-gamut chroma, capped
    lo, hi = 0.0, 0.4
    for _ in range(40):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if all(-1e-4 <= c <= 1.0001 for c in to_linear_rgb(L, mid, h)) else (lo, mid)
    return to_hex(to_linear_rgb(L, min(lo * share, cap), h))

def step(h, ok, lightest=True):  # the lightest (or darkest) lightness step that passes
    passing = [L for L in STEPS if ok(colour(L, h))]
    return max(passing) if lightest else min(passing)

grey = lambda L, c: to_hex(to_linear_rgb(L, c, 255))  # neutrals lean slightly to the action hue
THEMES = {
    "light": {"bg": grey(0.975, 0.006), "surface": "#ffffff", "text": grey(0.23, 0.03),
              "muted": grey(0.48, 0.03), "line": grey(0.62, 0.02)},
    "dark": {"bg": grey(0.18, 0.02), "surface": grey(0.245, 0.022), "text": grey(0.96, 0.008),
             "muted": grey(0.78, 0.02), "line": grey(0.55, 0.02)},
}

for mode, t in THEMES.items():
    print(f"\n{mode}: " + ", ".join(f"{k} {v}" for k, v in t.items()))
    for k in ("text", "muted", "line"):
        print(f"  {k}: {ratio(t[k], t['bg']):.2f} on bg, {ratio(t[k], t['surface']):.2f} on surface")
    for role, h in HUES.items():
        light = mode == "light"
        on = (t["text"] if role in BRIGHT else "#ffffff") if light else t["bg"]
        fill_L = BRIGHT_L if role in BRIGHT else step(h, lambda x: ratio(on, x) >= 4.5, lightest=light)
        fill = colour(fill_L, h)
        edge_L = fill_L - 0.12
        if light:
            edge_L = min(edge_L, step(h, lambda x: ratio(x, t["bg"]) >= 3 and luminance(x) < luminance(fill)))
        edge = colour(edge_L, h)
        tint = colour(0.965, h, cap=0.035) if light else colour(0.29, h, cap=0.05)
        ink = colour(step(h, lambda x: min(ratio(x, t["bg"]), ratio(x, t["surface"]), ratio(x, tint)) >= 4.7,
                          lightest=light), h)
        print(f"  {role:8} fill {fill} (L {fill_L:.3f}) on {on} {ratio(on, fill):5.2f} | fill/bg {ratio(fill, t['bg']):5.2f}"
              f" | edge {edge} {ratio(edge, t['bg']):5.2f} | ink {ink} bg {ratio(ink, t['bg']):.2f}"
              f" surface {ratio(ink, t['surface']):.2f} tint {tint} {ratio(ink, tint):.2f}")
```

The colour-vision check applies the published full-severity protan, deutan and tritan
matrices in linear RGB to each fill, then measures OKLab distance between every pair.[^machado]

[^wcag-contrast]: WCAG 2.2 SC 1.4.3
[^wcag-nontext]: WCAG 2.2 SC 1.4.11
[^wcag-use-of-colour]: WCAG 2.2 SC 1.4.1
[^wcag-luminance]: WCAG relative luminance
[^iso-3864]: ISO 3864-1 safety colours
[^oklab]: OKLab
[^css-color-4]: CSS Color 4
[^machado]: Machado et al. 2009
[^visual]: Visual language finding
