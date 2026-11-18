---
type: Decision
title: Fonts and design tokens for a bold rounded look
description: Nunito as the one self-hosted variable font, and a small set of CSS custom-property tokens for type scale, spacing, radii, depth and five colour roles in light and dark, derived on our own.
tags: [decision, visual-identity, typography, design-tokens, colour, accessibility, clean-room]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: fonts, resource: /visual-identity/rounded-open-fonts.md, title: Open rounded fonts compared }
  - { id: distance, resource: /visual-identity/legibility-at-distance.md, title: Legibility at a distance }
  - { id: hosting, resource: /visual-identity/self-hosting-fonts.md, title: Self-hosting open fonts }
  - { id: tooling, resource: /visual-identity/token-tooling.md, title: Design token tooling compared }
  - { id: palette, resource: /visual-identity/palette-method.md, title: Palette method and contrast table }
  - { id: licences, resource: /visual-identity/licence-check.md, title: Licence check of fonts and token tools }
  - { id: ux, resource: /decisions/ux-patterns.md, title: UX patterns this app adopts }
  - { id: frontend, resource: /decisions/frontend-approach.md, title: Front-end approach for the iPad web app }
  - { id: touch, resource: /platform/touch-targets-and-gestures.md, title: Touch targets and gestures for an iPad web app }
  - { id: mdn-reduced-motion, resource: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion, title: "MDN: prefers-reduced-motion" }
---

# Context

The [UX patterns](/decisions/ux-patterns.md) decision asks for bold colour, rounded shapes,
heavy rounded type and high contrast, in our own palette and an open font.[^ux] Today's
stylesheet has a handful of variables and many one-off values. This decision fixes the font
and the token set that every screen reads; building it into `web/` is a separate item.

# Decision: font

- **Nunito**, the variable font (weight 200 to 1000), upright only, Latin subset, with a
  Latin Extended file loaded on demand by `unicode-range`. One 39 KB woff2 covers body
  text and the heaviest display weights.[^fonts] [^hosting]
- **Self-hosted** from the app's own origin through the Fontsource package, precached by
  the service worker of the [front-end approach](/decisions/frontend-approach.md). No font
  CDN at runtime.[^hosting] [^frontend]
- Licence: OFL 1.1 with no Reserved Font Name, so the subset keeps its name. `OFL.txt`
  ships with the app.[^licences]
- Fallback stack: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`, with
  `font-display: swap`.
- Not chosen: Fredoka (stops at 700 and would be a second file), Baloo 2 (low cap height,
  wide letters, stops at 800), Lexend (not rounded), Quicksand and Varela Round (light or
  single weight, reserved names), M PLUS Rounded 1c (a file per weight). Atkinson
  Hyperlegible stays a candidate for a later reading-help setting.[^fonts]

# Decision: tooling

Plain CSS custom properties in one `tokens.css`, with role-based names. No Style
Dictionary, Open Props or Radix Colors dependency. Names are kept close to the design
tokens format's groups (colour, dimension, font, shadow), so a move to Style Dictionary is
mechanical if a second output ever appears.[^tooling]

# Decision: type scale

Base 18 px, ratio 1.25. Weights: body 500, labels and buttons 800, headings 800,
display 900; the timer uses 800, which keeps the digit counters open.[^distance]

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-sm` | 0.875rem (14 px) | 1.4 | captions, never during a session |
| `--text-md` | 1.125rem (18 px) | 1.5 | body |
| `--text-lg` | 1.375rem (22 px) | 1.4 | lead text, list titles |
| `--text-xl` | 1.75rem (28 px) | 1.2 | section headings |
| `--text-2xl` | 2.25rem (36 px) | 1.15 | screen titles |
| `--text-3xl` | 2.75rem (44 px) | 1.1 | celebration and level-up |
| `--text-cue` | 5rem (80 px) | 1 | one or two in-session words read from 2 m |
| `--text-timer` | `clamp(9.5rem, 22vmin, 15rem)` (152 to 240 px) | 1 | timers and counts read from 2 to 3 m, with `font-variant-numeric: tabular-nums` |

# Decision: spacing, radii and depth

| Group | Tokens |
|---|---|
| Spacing (4 px base) | `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 24px, `--space-6` 32px, `--space-7` 48px, `--space-8` 64px |
| Radii | `--radius-sm` 8px (chips, inputs), `--radius-md` 16px (buttons), `--radius-lg` 24px (cards), `--radius-xl` 32px (sheets, path nodes), `--radius-pill` 999px |
| Borders | `--border` 2px solid `--line` on inputs and outlined controls (3:1 or better in both themes) |
| Pressable depth | `--press-depth` 4px (6px for in-session controls): `box-shadow: 0 var(--press-depth) 0 var(--<role>-edge)`; pressed moves the button down by the depth and drops the shadow |
| Elevation | `--shadow-1`: `0 1px 2px rgb(0 0 0 / 8%), 0 2px 6px rgb(0 0 0 / 6%)` (cards); `--shadow-2`: `0 4px 12px rgb(0 0 0 / 10%), 0 12px 32px rgb(0 0 0 / 8%)` (sheets). The dark theme drops shadows and lifts surfaces by lightness plus a 1 px `--line` border |
| Focus | 3px solid `--action-ink` outline, offset 2px |
| Targets | `--target` 44px, `--target-session` 56px[^touch] |
| Motion | the press moves only when `prefers-reduced-motion` is not set[^mdn-reduced-motion] |

# Decision: colour roles

Five roles, each with `fill`, `on`, `edge`, `ink` and `tint`, derived by the
[palette method](/visual-identity/palette-method.md) and checked against WCAG 2.2 there.[^palette]
Colour is never the only signal.

```css
:root {
  --bg: #f4f7fb; --surface: #ffffff; --text: #131e2b; --muted: #525f6f; --line: #7e8792;

  --action: #1f76d8;  --action-on: #ffffff;  --action-edge: #14549d;  --action-ink: #1c6cc6;  --action-tint: #edf4fe;
  --success: #49de78; --success-on: #131e2b; --success-edge: #2aa253; --success-ink: #1e7d3e; --success-tint: #e4fbe7;
  --warning: #f0b236; --warning-on: #131e2b; --warning-edge: #b78727; --warning-ink: #8b661b; --warning-tint: #fef2de;
  --stop: #d73f39;    --stop-on: #ffffff;    --stop-edge: #a61d1d;    --stop-ink: #ca322e;    --stop-tint: #fef0ee;
  --rest: #c8aef9;    --rest-on: #131e2b;    --rest-edge: #a772f5;    --rest-ink: #854ece;    --rest-tint: #f5f1fe;
}

/* dark: under prefers-color-scheme: dark, and under [data-theme='dark'] */
:root {
  --bg: #0c121a; --surface: #19212b; --text: #eef2f7; --muted: #afb8c4; --line: #6a727d;

  --action: #217ce2;  --action-on: #0c121a;  --action-edge: #165aa6;  --action-ink: #4c98f5;  --action-tint: #1a2c44;
  --success: #49de78; --success-on: #0c121a; --success-edge: #30b45d; --success-ink: #2ead59; --success-tint: #17321e;
  --warning: #f0b236; --warning-on: #0c121a; --warning-edge: #c18e2a; --warning-ink: #bf8d29; --warning-tint: #38280a;
  --stop: #de463f;    --stop-on: #0c121a;    --stop-edge: #b01f1f;    --stop-ink: #f7665b;    --stop-tint: #41211e;
  --rest: #c8aef9;    --rest-on: #0c121a;    --rest-edge: #ab79f5;    --rest-ink: #ac7cf5;    --rest-tint: #2f2540;
}
```

# How it stays our own

The palette comes from the safety-colour convention for hue, OKLCH for lightness and
chroma, and WCAG 2.2 for contrast; no value was sampled from the reference app or any
other app.[^palette] The font is an open one with its own design. Shapes (radii, the
pressable edge) are common, generic devices, set here by our own numbers.

# Consequences

- The app's main colour moves from green to blue: action is blue under this method, and
  green now means success only. Existing `--accent` and `--brand` uses map to `--action`.
- Every colour in components comes from a token; a lint or review check for raw hex
  values in component styles keeps it that way.
- In-session screens use `--text-cue` and `--text-timer` and few words; set-up screens use
  the body scale.[^distance]
- Undo: the tokens live in one file; changing a role's hue or a size is a one-line change,
  re-checked with the palette script.

# Open points

- Check on a device that Nunito has tabular figures and that the 800-weight timer reads
  well from 3 m; the table in the distance finding is computed, not tested.
- The owner reviews the look before the tokens replace today's styles.

[^fonts]: Open rounded fonts compared
[^distance]: Legibility at a distance
[^hosting]: Self-hosting open fonts
[^tooling]: Design token tooling compared
[^palette]: Palette method and contrast table
[^licences]: Licence check
[^ux]: UX patterns decision
[^frontend]: Front-end approach decision
[^touch]: Touch targets and gestures
[^mdn-reduced-motion]: MDN prefers-reduced-motion
