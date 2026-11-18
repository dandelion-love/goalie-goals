---
type: Research Finding
title: Design token tooling compared
description: Style Dictionary, Open Props, Radix Colors and the design tokens format compared for a small single-platform web app, and what each would cost and give.
tags: [visual-identity, design-tokens, css, tooling]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: sd-site, resource: https://styledictionary.com/, title: "Style Dictionary documentation" }
  - { id: sd-repo, resource: https://github.com/style-dictionary/style-dictionary, title: "Style Dictionary repository (Apache-2.0)" }
  - { id: op-site, resource: https://open-props.style/, title: "Open Props documentation" }
  - { id: op-repo, resource: https://github.com/argyleink/open-props, title: "Open Props repository (MIT)" }
  - { id: radix-scale, resource: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale, title: "Radix Colors: understanding the scale" }
  - { id: radix-install, resource: https://www.radix-ui.com/colors/docs/overview/installation, title: "Radix Colors: installation" }
  - { id: radix-repo, resource: https://github.com/radix-ui/colors, title: "Radix Colors repository (MIT)" }
  - { id: dtcg, resource: https://www.designtokens.org/tr/2025.10/, title: "Design Tokens Community Group: technical reports 2025.10" }
  - { id: dtcg-news, resource: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/, title: "W3C community group news: design tokens specification reaches first stable version" }
  - { id: leonardo, resource: https://github.com/adobe/leonardo, title: "Leonardo: contrast-based colour generation (Apache-2.0)" }
---

# The need

One web app, one platform, one stylesheet. Tokens must give a small named set of values
(type, spacing, radii, depth, colour roles, light and dark) that every component reads, so
no screen invents its own. Anything that adds a build step has to pay for itself.

# Table

| Tool | What it is | Licence (checked at source) | Light and dark | Cost here | Verdict |
|---|---|---|---|---|---|
| Plain CSS custom properties | `:root` variables, overridden under `prefers-color-scheme` and a `data-theme` attribute | none needed | yes, by override | none: the app already does this | **Use** |
| Style Dictionary | Build tool that turns token JSON into CSS, iOS, Android, JS and docs; forward-compatible with the design tokens format[^sd-site] | Apache-2.0[^sd-repo] | yes, by build | a build step and a JSON source | Not now; adopt if a second output appears (native widget, emails) |
| Design tokens format 2025.10 | The community group's first stable JSON format for tokens, with format, colour and resolver modules; not a W3C standard[^dtcg] [^dtcg-news] | W3C community group report | yes, resolver module | none until a tool reads it | Shape token names so a later move to it is mechanical |
| Open Props | A large set of ready CSS variables (sizes, radii, shadows, easing, type, colours) with a JIT PostCSS plugin that ships only the props used[^op-site] | MIT[^op-repo] | some props adapt | a dependency, and its scales are someone else's | Not a dependency; a useful reference for scale shapes |
| Radix Colors | Hand-tuned 12-step colour scales with dark and alpha variants; steps 9 and 10 are solids, 11 and 12 text[^radix-scale] [^radix-install] | MIT[^radix-repo] | yes, separate files | a dependency; the palette would be Radix's, not ours | Not used for the roles; its step model informs our role steps |
| Leonardo | Generates colours to hit a target contrast ratio against a background | Apache-2.0[^leonardo] | yes | a tool, not a runtime dependency | Same idea as our own script; not needed |

# Notes

- **Radix Colors' guarantees use APCA**, not WCAG 2.2 ratios: steps 11 and 12 meet APCA
  Lc 60 and Lc 90 on step 2.[^radix-scale] The app's contract is WCAG 2.2, so even Radix
  colours would need our own check.
- **Radix says its CDN is for prototyping only**, which matches the self-hosting rule.[^radix-install]
- **Open Props' JIT plugin** keeps bundle cost low, but the names (`--size-3`,
  `--radius-2`) say nothing about purpose; role names (`--action`, `--space-3`) keep the
  intent in the code.[^op-site]
- A token set of roughly 60 variables does not need a pipeline. The cost of adding one
  later is renaming, which role-based names keep small.

[^sd-site]: Style Dictionary documentation
[^sd-repo]: Style Dictionary repository
[^op-site]: Open Props documentation
[^op-repo]: Open Props repository
[^radix-scale]: Radix Colors scale
[^radix-install]: Radix Colors installation
[^radix-repo]: Radix Colors repository
[^dtcg]: Design tokens technical reports 2025.10
[^dtcg-news]: Design tokens stable version announcement
[^leonardo]: Leonardo
