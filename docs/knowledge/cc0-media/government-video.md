---
type: Research Finding
title: Government video as private reference footage
description: Government video libraries and government channels on video platforms as private reference for the app's own figure, with the licence or statute as stated, the download terms, the made-by-the-publisher check and the rules for footage; the per-movement table is on its own page.
tags: [cc0-media, exercise-media, government, video, pose-reference, licensing]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T09:00:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: licences, resource: /cc0-media/government-licences.md, title: Government works and open government licences side by side }
  - { id: publications, resource: /cc0-media/government-exercise-publications.md, title: Government exercise publications checked for figures }
  - { id: video-coverage, resource: /cc0-media/government-video-coverage.md, title: Government reference video for each movement }
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
  - { id: nasa-media, resource: https://www.nasa.gov/nasa-brand-center/images-and-media/, title: "NASA Brand Center, images and media usage guidelines (checked 2026-11-18)" }
  - { id: dvids-copyright, resource: https://www.dvidshub.net/about/copyright, title: "DVIDS, copyright and use of visual information (checked 2026-11-18)" }
  - { id: dvids-faq, resource: https://dvidshub.net/about/faq, title: "DVIDS, frequently asked questions (checked 2026-11-18 by search snippet only)" }
  - { id: uk-defence-imagery, resource: https://www.gov.uk/guidance/defence-imagery, title: "GOV.UK, Defence imagery guidance (checked 2026-11-18)" }
  - { id: uk-mod-licensing, resource: https://www.gov.uk/government/publications/mod-copyright-licensing-information/ministry-of-defence-copyright-licensing-information, title: "Ministry of Defence copyright licensing information (checked 2026-11-18 by search snippet only)" }
  - { id: ca-dnd-copyright, resource: https://www.canada.ca/en/department-national-defence/corporate/intellectual-property/crown-copyright.html, title: "Crown copyright protected works managed by National Defence and the Canadian Armed Forces (checked 2026-11-18)" }
  - { id: au-defence-copyright, resource: https://www.defence.gov.au/copyright, title: "Australian Department of Defence, copyright page (checked 2026-11-18 by search snippet; the page timed out twice)" }
  - { id: nz-defence-copyright, resource: https://defence.govt.nz/about-this-site/copyright/, title: "New Zealand Ministry of Defence, Crown copyright page (checked 2026-11-18)" }
  - { id: esa-cc, resource: https://www.esa.int/Services/Creative_Commons_Attribution-ShareAlike_3.0_IGO_CC_BY-SA_3.0_IGO_licence, title: "ESA, CC BY-SA 3.0 IGO licence page (checked 2026-11-18 by search snippet only)" }
  - { id: youtube-terms, resource: "https://www.youtube.com/static?gl=GB&template=terms", title: "YouTube Terms of Service, dated 17 March 2025 (checked 2026-11-18)" }
  - { id: youtube-cc, resource: https://support.google.com/youtube/answer/2797468, title: "YouTube Help, Creative Commons on YouTube (checked 2026-11-18)" }
---

# Summary

US federal video is the one route that works now. US federal works have no copyright by
statute.[^licences] NASA and the Defense Department's library (DVIDS) both say so on their
own pages, and both offer their own download.[^nasa-media][^dvids-copyright] One Marine
Corps training command's 2017 exercise-demo series on DVIDS covers most of the cards in
short, single-exercise clips with technique cues, each labelled public domain.[^video-coverage]
The other four countries have defence image libraries too, but their terms are narrower.
The UK uses the Open Government Licence, but the MOD's guidance excludes identifiable
people from it. Canada allows only unaltered reproduction. Australia allows personal,
non-commercial use of unaltered copies. New Zealand licenses its defence website under
CC BY 4.0 but does not say whether video is included.[^uk-defence-imagery][^ca-dnd-copyright][^au-defence-copyright][^nz-defence-copyright]
None of them showed an exercise demo series in this pass. YouTube's terms forbid
downloading. Its Creative Commons mark is a reuse licence, not permission to download,
so government channels on YouTube are only a way to find clips.[^youtube-terms][^youtube-cc]
No goalkeeping technique was found in any government library.

The per-movement table is on [its own page](/cc0-media/government-video-coverage.md).

# Rules for reference footage

These hold for every source here, and for whatever the pose pipeline story (#88) builds.

1. **Reference only.** Footage is used to derive joint angles for the app's own
   parametric figure. It never enters the repo, the app, an issue, a comment or a PR,
   and neither do stills or frames cut from it. The repo holds the derived angles and a
   citation of the publisher page, nothing else.
2. **Never traced.** Footage of identifiable people is measured, never traced or
   redrawn as an outline, so the figure carries none of the person's likeness. NASA,
   DVIDS and the Canadian defence page all say that a person shown keeps their privacy
   and publicity rights.[^nasa-media][^dvids-copyright][^ca-dnd-copyright]
3. **Never the keeper or the family**, even as private reference, even once. This is
   the media Decision's hard rule.[^media-decision]
4. **Made by the publisher.** A clip counts only when the government publisher made it
   and credits no one else: the producing unit or office and a staff videographer, as
   on the DVIDS pages read here. A clip that credits a contractor, a partner company, a
   broadcaster or an outside programme is third-party work and is out, as the licence
   research already rules for figures.[^licences]
5. **Download only from the publisher.** A copy is taken only from the publisher's own
   download (an agency library's download button or file link). Never from a video
   platform whose terms forbid it, and never with a third-party downloader or a
   scraper. Where the only copy is on such a platform, the clip is watched there and
   measured from the playing video, or skipped.[^youtube-terms] DVIDS downloads need a
   free, validated account. Creating that account is the owner's step, not an
   agent's.[^dvids-copyright]
6. **No insignia, no doses.** Nothing about the uniform, unit, rank or badge carries
   into the figure, and no sets, reps, loads or test standards carry into the app.
   Adult and military guidance is not youth guidance. Clips that use a sled, kettlebell,
   dumbbell, ammo can or suspension trainer are measured for the body's positions only;
   the card's own load rule applies.[^licences]
7. **Local and private.** A downloaded original sits outside the repo, on the machine
   that runs the pipeline, and is deleted once its angles are recorded.

The media Decision lists photos and videos of other real people as never used.[^media-decision]
That rule is about what the app shows. Using footage only to measure angles is a
different use. When #88 is built, the Decision should say so in one line, so the two
rules do not seem to conflict.

# Agency video libraries with their own download

Each country's defence image library was checked, plus the space agency where one was
found. Health-agency video was not re-checked: the earlier figure research found the
NHS lists its exercise images and videos as not licensed for re-use, and the other health
agencies' exercise guidance used photographs.[^publications]

| Publisher | Library | Licence or statute, as stated | Download under the publisher's own terms | Made-by-the-publisher check | Checked |
|---|---|---|---|---|---|
| US, NASA | NASA Image and Video Library, and video pages on nasa.gov | NASA images, audio and video "generally are not subject to copyright in the United States". The insignia, logotype and identifiers are not public domain. Using third-party material needs its owner's permission. Commercial use must not imply NASA's endorsement. Identifiable people keep publicity rights[^nasa-media] | Yes. Video pages on nasa.gov link the file itself (the Train Like an Astronaut ARED clip does)[^video-coverage] | Read each item's description and credit. A partner agency, contractor or broadcaster credit puts it out | 2026-11-18 |
| US, Department of Defense (named Department of War on the page) | DVIDS | The visual information is "not eligible for copyright protection in the United States", but some of it may carry rights owned by non-department parties. It may be used, copied and distributed for non-commercial personal use and for historical and newsworthy purposes. Commercial use is allowed with a non-endorsement disclaimer, and commercial users are asked to obscure distinctive military markings. Names, insignia and seals may be trademarks. Publicity and privacy rights are not waived[^dvids-copyright] | Yes, from the asset page, for a registered and validated account. Each asset page shows a rights label (for example "Public Domain") beside the download[^dvids-copyright][^dvids-faq] | Each asset page names the producing unit and the videographer. Any non-government credit, or no public-domain label, puts it out | 2026-11-18 |
| UK, Ministry of Defence | Defence Imagery | "All content is available under the Open Government Licence v3.0", except where otherwise stated[^uk-defence-imagery]. The MOD's licensing guidance adds that the OGL does not allow reuse of imagery containing personal data, which includes identifiable people. Some imagery is under a narrower news and editorial licence. Imagery that cannot be shown to be MOD Crown copyright gets no licence, and older imagery passes to the Imperial War Museum[^uk-mod-licensing] | Yes: the site's news and downloadable sections offer files directly[^uk-defence-imagery]; the site asks users to accept its terms first[^uk-mod-licensing] | Crown copyright only; the file's own licence tag decides. No exercise-demo series was found in this pass | 2026-11-18 |
| Canada, National Defence and the Canadian Armed Forces | Combat Camera photos and videos | Crown copyright. Non-commercial reproduction "must remain as is, and must not be altered in any way", must show the title and the author organisation, and must make clear there is no affiliation or endorsement. Adapting needs permission. Personal data is excluded, and a release is needed to use an identifiable person's image publicly. Commercial use under a revenue threshold is permitted royalty-free with credit, excluding badges, crests and insignia[^ca-dnd-copyright] | Not stated on the page[^ca-dnd-copyright] | Crown copyright works held by the department only. No exercise-demo series was found in this pass; the forces' fitness preparation guide is marked all rights reserved[^publications] | 2026-11-18 |
| Australia, Department of Defence | Defence image galleries (Defence, Army, Navy and Air Force) | Commonwealth copyright. Material may be downloaded, displayed, printed and reproduced in unaltered form for personal and non-commercial use. Commercial video and imagery use needs a licence from the department; the Navy gallery asks users not to use images commercially[^au-defence-copyright] | Yes, after accepting the gallery's terms and conditions[^au-defence-copyright] | Commonwealth copyright works only. No exercise-demo series was found in this pass | 2026-11-18, by search snippet |
| New Zealand, Ministry of Defence and Defence Force | Ministry of Defence website; Defence Force imagery | The site and its contents, "including pages, documents, graphics, audio and video", are copyright of the Ministry or the Defence Force. "Website copyright work" is licensed under CC BY 4.0; the page does not say whether video is included. Third-party material is excluded, and flags, emblems and names fall under their own Act[^nz-defence-copyright] | Not stated[^nz-defence-copyright] | The Defence Force's own imagery library and its terms were not read in this pass | 2026-11-18 |
| ESA (intergovernmental, outside the five countries) | ESA multimedia and ESA TV | Only items expressly labelled CC BY-SA 3.0 IGO are under that licence; other items need ESA's terms, and third-party credits need their holder's approval[^esa-cc] | Not confirmed in this pass | Mission X children's activity clips are a lead; each clip's own label and credits decide | 2026-11-18, by search snippet |

For private measurement nothing is published, so the question per source is narrower than
#69's: may a copy be downloaded and kept privately under the publisher's terms, and was the
clip made by the publisher. DVIDS and NASA answer yes to both, item by item. The UK
answer turns on the personal-data exclusion. Canada and Australia allow copies but no
alteration, which measuring does not do, though the derived figure must still be the
app's own drawing. New Zealand is unclear for video.

# Government channels on video platforms

| Platform | Platform terms on downloading, as stated | Creative Commons option | What this means here | Checked |
|---|---|---|---|---|
| YouTube | You may "view or listen to Content for your personal, non-commercial use". You may not access, reproduce or download any part of the service or any content except as specifically permitted by the service, with YouTube's prior written permission, or as applicable law permits. Automated access such as scrapers is barred[^youtube-terms] | Uploaders can mark a video "Creative Commons - Attribution" (CC BY); viewers find such videos with the search filter. The help page grants reuse under CC BY and says nothing about downloading[^youtube-cc] | **Watch only.** A government channel on YouTube is a finding aid. A clip found there is fetched from the same publisher's own library if it is there, else watched on YouTube and measured from the playing video, or skipped. The CC BY mark is not read as permission to download | 2026-11-18 |
| Vimeo | Not read in this pass. The MOD's licensing guidance mentions MOD clips on Vimeo that say they may be downloaded and reused under the OGL[^uk-mod-licensing] | | A download the uploader enabled, on a clip whose description grants the OGL, would count as the publisher's own download; to confirm against Vimeo's terms | 2026-11-18, by search snippet |

The US military service sites (army.mil, marines.mil, navy.mil, af.mil) play DVIDS video
through their own players. They are the same assets, so the DVIDS page stays the record.

# Related

- [Government reference video for each movement](/cc0-media/government-video-coverage.md)
- [Government works and open government licences side by side](/cc0-media/government-licences.md)
- [Government and health-body figures for each exercise](/cc0-media/government-coverage.md)
- [Video and animation sources](/exercise-media/video-and-animation.md)
- [Exercise media](/decisions/exercise-media.md)

[^licences]: Government works and open government licences side by side
[^publications]: Government exercise publications checked for figures
[^video-coverage]: Government reference video for each movement
[^media-decision]: Exercise media decision
[^nasa-media]: NASA images and media usage guidelines
[^dvids-copyright]: DVIDS copyright page
[^dvids-faq]: DVIDS FAQ
[^uk-defence-imagery]: GOV.UK Defence imagery guidance
[^uk-mod-licensing]: MOD copyright licensing information
[^ca-dnd-copyright]: National Defence and CAF Crown copyright page
[^au-defence-copyright]: Australian Defence copyright page
[^nz-defence-copyright]: NZ Ministry of Defence copyright page
[^esa-cc]: ESA CC BY-SA 3.0 IGO licence page
[^youtube-terms]: YouTube Terms of Service, 17 March 2025
[^youtube-cc]: YouTube Help, Creative Commons
