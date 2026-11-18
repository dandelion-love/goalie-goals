---
type: Research Finding
title: Government works and open government licences side by side
description: How five national governments and one international health body license their publications, each read from the publisher's own page, with the licence id, the stated path into CC BY-SA 4.0 content, the third-party and insignia exclusions, and a verdict.
tags: [cc0-media, exercise-media, licensing, government, attribution]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T06:25:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: usc-105, resource: https://www.copyright.gov/title17/92chap1.html, title: "US Copyright Act, chapter 1, section 105: United States Government works (checked 2026-11-18)" }
  - { id: odphp-copyright, resource: https://odphp.health.gov/index.php/copyright-policy, title: "US Office of Disease Prevention and Health Promotion, copyright policy (checked 2026-11-18)" }
  - { id: ogl-uk-3, resource: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/, title: "Open Government Licence v3.0, The National Archives (checked 2026-11-18)" }
  - { id: nhs-terms, resource: https://www.nhs.uk/our-policies/terms-and-conditions/, title: "NHS website terms and conditions, content licence (checked 2026-11-18)" }
  - { id: ogl-ca-2, resource: https://open.canada.ca/en/open-government-licence-canada, title: "Open Government Licence - Canada 2.0 (checked 2026-11-18)" }
  - { id: canada-terms, resource: https://www.canada.ca/en/transparency/terms.html, title: "Canada.ca terms and conditions, reproduction (checked 2026-11-18)" }
  - { id: au-health-copyright, resource: https://www.health.gov.au/using-our-websites/copyright, title: "Australian Government Department of Health, copyright page (checked 2026-11-18 by search snippet; the page timed out)" }
  - { id: nzgoal-2, resource: https://data.govt.nz/toolkit/policies/nzgoal/nzgoal-version-2, title: "NZGOAL version 2, New Zealand Government Open Access and Licensing framework (checked 2026-11-18)" }
  - { id: who-copyright, resource: https://www.who.int/about/policies/publishing/copyright, title: "WHO copyright, licensing and permissions (checked 2026-11-18)" }
  - { id: cc-faq, resource: https://creativecommons.org/faq/, title: "Creative Commons FAQ: CC BY material in CC BY-SA works (checked 2026-11-18)" }
  - { id: spdx-ogl, resource: https://spdx.org/licenses/OGL-UK-3.0.html, title: "SPDX licence list entry OGL-UK-3.0" }
  - { id: spdx-ogl-ca, resource: https://spdx.org/licenses/OGL-Canada-2.0.html, title: "SPDX licence list entry OGL-Canada-2.0" }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
---

# Summary

The app's exercise content is CC BY-SA 4.0, so a government figure can enter it only if
its terms allow an adaptation under CC BY-SA 4.0.[^media-decision] Two routes pass: a
work that has no copyright by statute (US federal works) and a licence whose publisher
states a path to CC BY 4.0, which Creative Commons says CC BY-SA works may
include (the UK OGL v3.0, and CC BY 4.0 itself in Australia and New Zealand).[^cc-faq]
Canada's open licence states no such path, and WHO's licence is non-commercial, so
neither is used. Passing the licence test is not the same as passing for figures: in
practice most of these publishers exclude images, photographs, logos, crests and
third-party material from the grant, and each figure has to clear that exclusion on its
own page.

All pages were read on 2026-11-18.

# Side by side

| Publisher | Legal basis, as stated | Licence id for `credits.json` | Stated path into CC BY-SA 4.0 | What the grant excludes | Verdict |
|---|---|---|---|---|---|
| US federal government | Statute: "Copyright protection under this title is not available for any work of the United States Government"[^usc-105] | `PD-USGov` (added to the check by this research) | None needed: no copyright to license. The statute covers works made by federal employees in their duties; it does not cover works a contractor or private partner made, or works the government holds by assignment.[^usc-105] | Anything the publication credits to someone else; agencies also warn that some images on their sites are licensed stock[^odphp-copyright] | **Passes**, per figure, when the publication credits no one else for it |
| United Kingdom | Crown copyright, released under the Open Government Licence v3.0[^ogl-uk-3] | `OGL-UK-3.0` (SPDX id[^spdx-ogl]; added to the check by this research) | The licence states its terms "are compatible with the Creative Commons Attribution License 4.0", and that adapting and licensing under CC BY 4.0 satisfies the OGL's conditions.[^ogl-uk-3] CC BY material may be included in CC BY-SA works.[^cc-faq] | Personal data; logos, crests and the Royal Arms; military insignia; third-party rights; other IP such as trade marks and design rights[^ogl-uk-3] | **Passes** as a licence. The NHS website adds its own terms on top of the OGL and excludes many images (see the [publications](/cc0-media/government-exercise-publications.md))[^nhs-terms] |
| Canada | Crown copyright; the open licence applies only to information released under it[^ogl-ca-2] | `OGL-Canada-2.0` (SPDX id[^spdx-ogl-ca]); **not added** | None stated: the licence page says nothing about Creative Commons or any other licence.[^ogl-ca-2] Content on Canada.ca outside that licence may be reproduced for non-commercial purposes only.[^canada-terms] | Personal information; third-party rights; names, crests, logos and official symbols; trade marks and official marks[^ogl-ca-2] | **Not used**: no stated compatibility path; Canada.ca terms are non-commercial |
| Australia | Commonwealth copyright; departments license publications under CC BY 4.0 with listed exclusions[^au-health-copyright] | `CC-BY-4.0` (already on the list) | CC BY 4.0 itself; CC BY material may be included in CC BY-SA works[^cc-faq] | The health department lists the Coat of Arms, logos and trade marks, photographs and images, signatures and third-party material[^au-health-copyright] | **Passes** as a licence, but its usual image exclusion leaves few figures in scope |
| New Zealand | Crown copyright; NZGOAL v2 makes CC BY 4.0 the default for government copyright works[^nzgoal-2] | `CC-BY-4.0` (already on the list) | As for Australia[^cc-faq] | Agencies may exclude named works or categories; third-party material must be excluded; attribution must not use the government logo or an emblem[^nzgoal-2] | **Passes** as a licence, per work |
| World Health Organization | WHO copyright, published under CC BY-NC-SA 3.0 IGO[^who-copyright] | `CC-BY-NC-SA-3.0-IGO`; **not added** | None: non-commercial, and permission is required for commercial use[^who-copyright] | Third-party materials, and the WHO logo, which needs written authorisation[^who-copyright] | **Near miss**: the NC term conflicts with CC BY-SA 4.0 |

# Rules this research applies

- **Read the work's own page.** A publisher's default licence says what usually applies;
  the work's own copyright page says what applies to it. Several Australian and UK
  documents carve out images, and Canadian and military fitness guides are "all rights
  reserved".
- **Third-party exclusion.** Any figure that the publication credits to another author,
  publisher or company, or that a credits, acknowledgements or permissions line names,
  is outside the grant and outside the statute. That includes figures "adapted with
  permission" from a book.
- **Insignia exclusion.** No crest, coat of arms, logo, service mark, rank badge, unit
  patch or uniform insignia is taken, even where a licence would allow it as part of a
  document. A figure is redrawn without them.
- **Statute is not worldwide.** Section 105 removes copyright under US law. Other
  countries may treat a US federal work differently, so the app still credits each
  figure with its publication and agency, as the media Decision does for CC0 art.
- **No stated path, no use.** A licence without a stated route into CC BY-SA 4.0 is not
  used, however open it looks.
- **Illustrations only.** No doses, sets, programmes or test standards are taken from
  these works: adult and military guidance is not youth guidance.

# Related

- [Publications checked](/cc0-media/government-exercise-publications.md)
- [Health organisations and physio sheets](/cc0-media/health-organisation-sources.md)
- [Coverage of the exercise cards](/cc0-media/government-coverage.md)
- [Open art that is not CC0](/cc0-media/non-cc0-near-misses.md)

[^usc-105]: 17 U.S.C. section 105
[^odphp-copyright]: ODPHP copyright policy
[^ogl-uk-3]: Open Government Licence v3.0
[^nhs-terms]: NHS website terms and conditions
[^ogl-ca-2]: Open Government Licence - Canada 2.0
[^canada-terms]: Canada.ca terms and conditions
[^au-health-copyright]: Australian Department of Health copyright page
[^nzgoal-2]: NZGOAL version 2
[^who-copyright]: WHO copyright and licensing
[^cc-faq]: Creative Commons FAQ
[^spdx-ogl]: SPDX OGL-UK-3.0
[^spdx-ogl-ca]: SPDX OGL-Canada-2.0
[^media-decision]: Exercise media decision
