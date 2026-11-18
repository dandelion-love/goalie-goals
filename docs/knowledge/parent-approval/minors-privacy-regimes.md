---
type: Research Finding
title: Privacy rules for minors' data, compared
description: A side-by-side reference of major regimes for children's and teens' data (US, UK, EU, Canada, Australia) and the common baseline the app meets.
tags: [parent-approval, privacy, minors, reference]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T03:45:00Z }
stale_after: 2027-05-17T00:00:00Z
sources:
  - { id: coppa-faq, resource: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions, title: "US FTC: Complying with COPPA, frequently asked questions" }
  - { id: coppa-2025, resource: https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data, title: "US FTC: final changes to the children's privacy rule (2025)" }
  - { id: ico-aadc, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/, title: "UK ICO: Age appropriate design code" }
  - { id: ico-std11, resource: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/11-parental-controls/, title: "UK ICO: Age appropriate design code, standard 11 parental controls" }
  - { id: gdpr-art8, resource: https://gdpr-info.eu/art-8-gdpr/, title: "EU GDPR Article 8: child's consent for online services" }
  - { id: gdpr-art2, resource: https://gdpr-info.eu/art-2-gdpr/, title: "EU GDPR Article 2: material scope" }
  - { id: opc-consent, resource: https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/, title: "Canada OPC: Guidelines for obtaining meaningful consent" }
  - { id: opc-youth, resource: https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_231005_01/, title: "Canadian privacy commissioners: joint resolution on young people's privacy (2023)" }
  - { id: oaic-code, resource: https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code, title: "Australia OAIC: Children's Online Privacy Code" }
  - { id: oaic-draft, resource: https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code, title: "Australia OAIC: exposure draft of the Children's Online Privacy Code (2026)" }
---

This is a reference survey, not legal advice, and it does not say which regime governs any
particular household. The app is built to the common baseline below, which holds across
all of them.

# Side by side

| Regime | Who it protects | Key points for this app |
| --- | --- | --- |
| US: COPPA | under 13 | covers commercial services directed to children or with actual knowledge of them; not teens;[^coppa-faq] 2025 amendments add separate parental consent for third-party disclosure and limit retention[^coppa-2025] |
| UK: Age Appropriate Design Code | under 18 | 15 standards: best interests, data minimisation, high-privacy defaults, geolocation and profiling off, no nudges;[^ico-aadc] a clear sign to the child when parental monitoring is on[^ico-std11] |
| EU: GDPR | under 16 by default (member states may lower to 13) | where a service relies on consent, a parent gives or authorises it, with reasonable verification;[^gdpr-art8] purely personal or household activity is out of scope[^gdpr-art2] |
| Canada: federal guidance and commissioners' resolution | minors | parent consent under 13 in all but exceptional cases, then capacity by maturity;[^opc-consent] best interests, privacy by default, obvious monitoring, strict minimisation, a retention limit[^opc-youth] |
| Australia: Children's Online Privacy Code | children | required under the federal Privacy Act, to be registered by December 2026;[^oaic-code] exposure draft published for consultation in 2026[^oaic-draft] |

# Common baseline the app meets

1. **Best interests first** in every design choice.[^ico-aadc][^opc-youth]
2. **Parent consent and control** for the keeper's account and anything risky, with the
   keeper told in plain words.[^gdpr-art8][^coppa-faq][^opc-consent]
3. **Visible oversight:** the keeper sees what the parent sees and when monitoring is
   active.[^ico-std11][^opc-youth]
4. **Data minimisation:** only what training needs; pain reports hold a body area, a score
   and a short note, not medical records.[^ico-aadc][^opc-youth]
5. **Private by default:** no location, no profiling, no ads, no third-party analytics, and
   no sharing or leaderboards unless approved.[^ico-aadc][^coppa-2025][^opc-youth]
6. **No nudges** toward more training or less privacy.[^ico-aadc][^opc-youth]
7. **Retention limit, delete and export** on request; data kept only while the account is
   used.[^coppa-2025][^ico-aadc][^opc-youth]

[^coppa-faq]: US FTC, COPPA FAQ.
[^coppa-2025]: US FTC, January 2025 press release on the final COPPA rule changes.
[^ico-aadc]: UK ICO, Age appropriate design code.
[^ico-std11]: UK ICO, standard 11 parental controls.
[^gdpr-art8]: EU GDPR, Article 8.
[^gdpr-art2]: EU GDPR, Article 2(2)(c).
[^opc-consent]: Canada OPC, Guidelines for obtaining meaningful consent.
[^opc-youth]: Canadian commissioners' 2023 joint resolution on young people's privacy.
[^oaic-code]: Australia OAIC, Children's Online Privacy Code page.
[^oaic-draft]: Australia OAIC, exposure draft release.
