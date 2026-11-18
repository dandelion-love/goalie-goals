---
type: Research Finding
title: Open content on GitHub
description: Fifty-eight public GitHub repositories checked for exercise data, figures, anatomy, drills, UI, timers, icons, sounds, programme data and pose data, each with its code and content licences read apart, its last commit, whether it says where the content came from, and a grade; the top finds are mapped to the board's open gaps.
tags: [cc0-media, github, licensing, provenance, exercise-media, sound, icons, anatomy, pose-reference]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-11-18T07:30:00Z }
stale_after: 2027-05-18T00:00:00Z
sources:
  - { id: media-decision, resource: /decisions/exercise-media.md, title: Exercise media decision }
  - { id: databases, resource: /exercise-media/open-exercise-databases.md, title: Open exercise databases with media }
  - { id: open-apps, resource: /exercise-apps/open-source-apps.md, title: Open-source training apps and exercise datasets }
  - { id: mm-components, resource: /cc0-media/muscle-map-components.md, title: Open muscle-map components and their art }
  - { id: mm-recommendation, resource: /cc0-media/muscle-map-recommendation.md, title: Muscle map for exercise dossiers }
  - { id: coverage, resource: /cc0-media/coverage.md, title: CC0 figure coverage per exercise }
  - { id: gov-coverage, resource: /cc0-media/government-coverage.md, title: Government and health-body figures for each exercise }
  - { id: shortlist, resource: /cc0-media/shortlist.md, title: CC0 art shortlist for rewards and the path }
  - { id: art-recommendation, resource: /cc0-media/recommendation.md, title: One style for reward and path art }
  - { id: sound-shortlist, resource: /cc0-media/sound-shortlist.md, title: CC0 sound shortlist by app moment }
  - { id: rigged, resource: /cc0-media/rigged-characters.md, title: CC0 rigged characters and animation sets }
  - { id: pose-data, resource: /cc0-media/pose-data.md, title: Open 3D animation and motion data as pose references }
  - { id: dossier-sections, resource: /dossiers/sections.md, title: The sections of an exercise dossier }
  - { id: reuse-decision, resource: /decisions/exercise-content-reuse.md, title: Reuse of exercise content }
  - { id: progression-decision, resource: /decisions/progression-design.md, title: Progression design decision }
  - { id: credits-check, resource: https://github.com/dandelion-love/goalie-goals/blob/main/tools/credits_check.py, title: "credits_check.py, the licence list for content/" }
  - { id: gh-search, resource: https://docs.github.com/en/rest/search/search, title: "GitHub REST API, repository search (read without an account, 2026-11-18)" }
  - { id: wger, resource: https://github.com/wger-project/wger, title: "wger (checked 2026-11-18)" }
  - { id: everkinetic, resource: https://github.com/everkinetic/data, title: Everkinetic data }
  - { id: free-exercise-db, resource: https://github.com/yuhonas/free-exercise-db, title: free-exercise-db }
  - { id: exercises-json, resource: https://github.com/wrkout/exercises.json, title: exercises.json }
  - { id: exercemus, resource: https://github.com/exercemus/exercises, title: Exercemus exercises }
  - { id: hasaneyldrm, resource: https://github.com/hasaneyldrm/exercises-dataset, title: "exercises-dataset (hasaneyldrm), README licence section and NOTICE" }
  - { id: repdb, resource: https://github.com/RepDB/exercise-dataset, title: "RepDB exercise-dataset, README and LICENSE-DATA" }
  - { id: open-exercise-art, resource: https://github.com/AlexMollard/Open-Exercise-Art, title: "Open Exercise Art, README section on licences and origin" }
  - { id: flow-dataset, resource: https://github.com/ozansozuozgit/flow-exercise-dataset, title: "flow-exercise-dataset, README, ARTWORK-LICENSE and NOTICE" }
  - { id: workout-motion, resource: https://github.com/februarysea/workout-motion, title: "workout-motion, README licence section" }
  - { id: glowupp, resource: https://github.com/Glowupp-app/open-exercisedb, title: Open ExerciseDB (Glowupp) }
  - { id: body-muscles, resource: https://github.com/vulovix/body-muscles, title: body-muscles }
  - { id: rnbh, resource: https://github.com/HichamELBSI/react-native-body-highlighter, title: react-native-body-highlighter }
  - { id: swift-musclemap, resource: https://github.com/melihcolpan/MuscleMap, title: "MuscleMap (SwiftUI), README and LICENSE" }
  - { id: open-muscle-map, resource: https://github.com/PerspicaciousGuy/Open-Muscle-Map, title: "Open Muscle Map, README provenance section" }
  - { id: muscle-graph, resource: https://github.com/lilbuda/muscle-graph, title: "muscle-graph, README licence section" }
  - { id: anatome, resource: https://github.com/Rippy1911/anatome, title: "anatome, README licence and attribution section" }
  - { id: healthicons, resource: https://github.com/resolvetosavelives/healthicons, title: "Health Icons, README licence section" }
  - { id: z-anatomy, resource: https://github.com/LluisV/Z-Anatomy, title: "Z-Anatomy, README licence section" }
  - { id: soccer-drills, resource: https://github.com/markcaron/soccer-drills, title: "soccer-drills, README and drill files" }
  - { id: keeper-training, resource: https://github.com/hrother/keeper_training, title: keeper_training }
  - { id: gk-designer, resource: https://github.com/wellsclint387-hash/GK-training-designer, title: GK-training-designer }
  - { id: gk-app, resource: https://github.com/Pachix-Dev/goalkeeper-training-app, title: goalkeeper-training-app }
  - { id: training-ground, resource: https://github.com/Dukes0O/training-ground, title: training-ground }
  - { id: football-drills, resource: https://github.com/connorfryett136-bit/Football-drills, title: Football-drills }
  - { id: pitch-lines, resource: https://github.com/AndresGuido9820/react-pitch-lines, title: "react-pitch-lines, README and licence" }
  - { id: mplsoccer, resource: https://github.com/andrewRowlinson/mplsoccer, title: mplsoccer }
  - { id: fitness-flutter-ui, resource: https://github.com/codeforany/fitness_workout_app_flutter_3_ui, title: "fitness_workout_app_flutter_3_ui, README" }
  - { id: fitnestx, resource: https://github.com/Arman-Gilani/fitnestx, title: fitnestx }
  - { id: openhiit, resource: https://github.com/a-mabe/OpenHIIT, title: OpenHIIT }
  - { id: jawt, resource: https://github.com/blockbasti/just_another_workout_timer, title: just_another_workout_timer }
  - { id: flex, resource: https://github.com/brandonp2412/Flex, title: Flex }
  - { id: pwa-timer, resource: https://github.com/Pjaerr/PWA-Timer, title: PWA-Timer }
  - { id: tabler, resource: https://github.com/tabler/tabler-icons, title: Tabler Icons }
  - { id: lucide, resource: https://github.com/lucide-icons/lucide, title: "Lucide, LICENSE (ISC)" }
  - { id: phosphor, resource: https://github.com/phosphor-icons/core, title: Phosphor icons core }
  - { id: openmoji, resource: https://github.com/hfg-gmuend/openmoji, title: OpenMoji }
  - { id: twemoji, resource: https://github.com/jdecked/twemoji, title: "Twemoji (maintained fork), README licence section" }
  - { id: noto-emoji, resource: https://github.com/googlefonts/noto-emoji, title: "Noto Emoji, README licence section" }
  - { id: fluent-emoji, resource: https://github.com/microsoft/fluentui-emoji, title: Fluent Emoji }
  - { id: game-icons, resource: https://github.com/game-icons/icons, title: "game-icons, README and licence file" }
  - { id: nieobie, resource: https://github.com/Nieobie/game-icon-pack, title: "Game Icon Pack (Nieobie), README" }
  - { id: meta-sound, resource: https://github.com/facebookincubator/Meta-open-sound, title: "Meta open sound, README and Oculus Audio Pack README" }
  - { id: uisfx, resource: https://github.com/romainsimon/uisfx, title: "UI SFX, README licence and build sections" }
  - { id: plinkfx, resource: https://github.com/maximilianfeix/plinkfx, title: "plinkfx, README licence section" }
  - { id: sfx-kit, resource: https://github.com/wyzowl/sfx-kit, title: "SFX Kit, README on how the sounds were made" }
  - { id: octave, resource: https://github.com/scopegate/octave, title: "Octave, README and LICENSE.md" }
  - { id: soundcn, resource: https://github.com/kapishdima/soundcn, title: "soundcn, README licence section" }
  - { id: tiks, resource: https://github.com/rexa-developer/tiks, title: tiks }
  - { id: zzfx, resource: https://github.com/KilledByAPixel/ZzFX, title: ZzFX }
  - { id: jsfxr, resource: https://github.com/chr15m/jsfxr, title: jsfxr }
  - { id: prison-fitness, resource: https://github.com/Badcomput/PrisonFitness_app, title: PrisonFitness_app }
  - { id: makehuman, resource: https://github.com/makehumancommunity/makehuman, title: "MakeHuman, LICENSE.md (code AGPL, bundled assets CC0)" }
  - { id: bandai, resource: https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset, title: "Bandai Namco Research motion dataset, README licence section" }
  - { id: lafan, resource: https://github.com/ubisoft/ubisoft-laforge-animation-dataset, title: "Ubisoft La Forge animation dataset, README" }
  - { id: openpose, resource: https://github.com/CMU-Perceptual-Computing-Lab/openpose, title: "OpenPose, LICENSE" }
  - { id: mediapipe, resource: https://github.com/google-ai-edge/mediapipe, title: MediaPipe }
---

# Summary

Public GitHub repositories were searched on 2026-11-18 for nine topics: exercise datasets
with media, exercise and anatomy illustrations, muscle maps, goalkeeper and football drill
libraries, fitness UI kits, timers and workout players, icon and sound sets, youth training
programme data, and pose and skeleton data. 58 repositories are recorded. The strongest
new finds are in **sound** (three CC0 or CC BY sound sets whose origin is stated) and in
**reward glyphs** (Fluent Emoji under MIT, Twemoji under CC BY 4.0). Nothing new and clean
was found for **goalkeeper figures, drills or youth programme data**: those stay
project-made. Most new exercise-art repositories of 2026 are AI-generated (some say so,
some do not), sell a paid tier, or redistribute a commercial studio's media.

| Grade | Count |
|---|---|
| Usable as is | 14 |
| Usable with credit | 6 |
| Reference only | 12 |
| Rejected | 26 |
| **Total** | **58** |

# Method

- Searched with GitHub's public repository search, read without an account,[^gh-search]
  plus the repositories the earlier surveys named. Public repositories only; nothing
  private, no forks of private projects, nothing behind a sign-in.
- For each repository the **code licence** (its LICENSE file and GitHub's licence field)
  and the **content licence** (images, audio, data or text, from the README, a separate
  licence file or a NOTICE) were read apart. A repository whose LICENSE covers only code,
  and says nothing about the art, has no stated art licence.
- **Last commit** is the newest commit on the default branch, from the repository's
  public commit feed, read 2026-11-18. "Last push" marks the two where only the push date
  could be read.
- **Origin stated** is "yes" only when the README, a NOTICE or a per-file record says who
  made the content or where it came from. Art with only a licence badge is "no", whatever
  the badge says.
- Nothing was cloned or installed. Adopting anything is its own story.

## The grades

| Grade | Means |
|---|---|
| **Usable as is** | CC0 or public domain, or a permissive licence (MIT, Apache-2.0, ISC, Unlicense, OFL) whose only duty is keeping a notice; origin stated; no unflagged AI. A manifest entry is still written.[^media-decision] |
| **Usable with credit** | CC BY or CC BY-SA, kept in `content/` with a credits entry; share-alike files stay share-alike.[^credits-check] |
| **Reference only** | Read for ideas, structure or anatomy, never copied: AI-generated content that says so (the media Decision needs the owner's ruling per asset), copied coaching text, code in another stack, tools that analyse images of people. |
| **Rejected** | No licence; non-commercial or no-derivatives; a custom licence that forbids hosting or redistribution; scraped or unclear origin; photos of real people; AI-generated with no flag. |

The credits check admits CC0, CC BY 4.0, CC BY-SA 3.0 and 4.0, MIT, Apache-2.0, OGL v3.0
and US federal works.[^credits-check] Two finds below would need the list widened by its
own story before they enter `content/`: ISC (Lucide) and CC BY 3.0 (game-icons).

# Exercise datasets with media

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| wger-project/wger[^wger] | Exercise wiki: text, images, videos, muscles, variation groups | AGPL-3.0 | Per record and per file: CC0, CC BY 4.0, CC BY-SA 3.0 or 4.0, ODbL | 2026-11-17 | Yes, per file: author, licence, style, AI flag | **Usable with credit**, records with a named author, not photo-style, not AI, as the media Decision already says[^media-decision] |
| everkinetic/data[^everkinetic] | Start and end line drawings, SVG and PNG, short descriptions | CC BY-SA 4.0 (whole project) | CC BY-SA 4.0 | 2022-02-20 | Mostly; one folder is of unknown provenance[^databases] | **Usable with credit**, files of stated origin only |
| yuhonas/free-exercise-db[^free-exercise-db] | Exercise JSON, two photos each | Unlicense | Unlicense label; images scraped | 2026-09-27 | No; the maintainer does not know the images' source[^open-apps] | **Rejected**: scraped |
| wrkout/exercises.json[^exercises-json] | The parent of the above | Unlicense | Same; its guide says the images were taken from the internet | 2025-02-16 | No | **Rejected**: scraped |
| exercemus/exercises[^exercemus] | Merged list of the two above and wger | MIT | MIT label over CC BY-SA and scraped records | 2025-07-31 | No | **Rejected**: relabelled |
| hasaneyldrm/exercises-dataset[^hasaneyldrm] | Exercise JSON, animation GIFs and thumbnails | MIT (code, data, instruction text) | Media copyright of a commercial animation studio, redistributed with that studio's permission to this repository only | 2026-07-16 | Yes: a third-party commercial studio | **Rejected**: proprietary media; the permission does not reach us |
| RepDB/exercise-dataset[^repdb] | Exercise JSON, stills, a muscle heat-map layer | MIT (viewer) | Custom free tier: visible credit, no republishing the dataset, no use in generative-AI pipelines, paid previews not for use | 2026-11-15 | Yes: says original work made for the vendor | **Rejected**: custom licence forbids redistribution; a copy in this public repo would republish it; not on the credits list |
| AlexMollard/Open-Exercise-Art[^open-exercise-art] | 561 exercise illustrations, PNG and SVG, and a raster-to-vector toolchain | GPL-3.0-or-later (tools) | CC BY-SA 4.0 (art) | 2026-10-15 | Yes: the source PNGs were AI-generated for another app, reviewed by its owner, then vectorised | **Reference only**: AI-generated and flagged; any use needs the owner's per-asset ruling |
| ozansozuozgit/flow-exercise-dataset[^flow-dataset] | 1,324 records, 1,257 SVG animations | Not asserted | CC0 "to the extent of rights held" | 2026-09-13 | Partly: made from prompts, most of which are lost; the README disclaims a clean-room origin | **Rejected**: AI-generated with provenance admittedly incomplete |
| februarysea/workout-motion[^workout-motion] | Continuous SVG exercise animations | PolyForm Noncommercial 1.0.0 | Same | 2026-10-11 | Yes: says original | **Rejected**: non-commercial |
| Glowupp-app/open-exercisedb[^glowupp] | 300+ exercises as JSON text, no media | MIT | MIT | 2026-04-30 | No: "inspired by" a company's fitness content | **Reference only**: text of unclear origin |

# Exercise and anatomy illustrations, muscle maps

The muscle-map survey already covers the React and npm packages.[^mm-components] New here:

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| vulovix/body-muscles[^body-muscles] | Front and back muscle path data, 89 regions | Apache-2.0 | Apache-2.0, same file; NOTICE names the author | 2026-04-16 | Yes | **Usable as is**, keeping LICENSE and NOTICE; already recommended[^mm-recommendation] |
| HichamELBSI/react-native-body-highlighter[^rnbh] | Muscle map component | MIT | Not stated for the art; an open question asks | 2026-09-13 | No | **Rejected**: unclear origin[^mm-components] |
| melihcolpan/MuscleMap[^swift-musclemap] | SwiftUI muscle map with sub-groups | MIT | The MIT file; the README says nothing of where the body artwork came from | 2026-10-24 | No | **Rejected**: art origin unclear; also Swift, not our stack |
| PerspicaciousGuy/Open-Muscle-Map[^open-muscle-map] | Front and back SVG maps, two body types, 31 muscles, a verification log | MIT | MIT | 2026-10-17 | Yes: traced from an AI-generated reference image; the author warns it may hold third-party material | **Reference only**: flagged AI; its per-muscle verification log is a useful cross-check for the dossier vocabulary |
| lilbuda/muscle-graph[^muscle-graph] | Framework-free SVG muscle maps | MIT | MIT; artwork adapted from react-muscle-highlighter | 2026-11-12 | Yes, but to a source whose own origin is unclear | **Rejected**: the same unclear chain[^mm-components] |
| Rippy1911/anatome[^anatome] | Muscle-diagram image API and an exercise list | Apache-2.0 | Exercise metadata from exercises.json (its photos "not cleared"); skill guides CC BY 4.0; the body art's origin is not stated | 2026-10-20 | Partly | **Rejected**: hosted API, data of scraped lineage, art origin unclear |
| resolvetosavelives/healthicons[^healthicons] | Health icons incl. body parts, people, objects | MIT (site) | CC0 (icons and npm packages) | 2026-11-04 | Yes: a public-health not-for-profit hosts and commissions them | **Usable as is** |
| LluisV/Z-Anatomy[^z-anatomy] | A 3D anatomy atlas as a Unity project | CC BY-SA 4.0 | CC BY-SA 4.0 | 2024-12-25 | No source for the models in the README | **Reference only**: realistic anatomy, which the dossier map must not be |

# Goalkeeper and football drill libraries

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| markcaron/soccer-drills[^soccer-drills] | 11 drills as Markdown with a YAML schema (type, ages, level, skills, set-up, players, area); one goalkeeper game | None separate | CC BY-SA 4.0 | 2021-03-19 | Per drill an `author` field, but the goalkeeper game says "Unknown" and another drill is credited to a professional club | **Reference only**: coaching text copied from others; the YAML schema is a useful idea, not protected text |
| hrother/keeper_training[^keeper-training] | Goalkeeper session planner | None | None | 2026-03-09 | No | **Rejected**: no licence |
| wellsclint387-hash/GK-training-designer[^gk-designer] | Goalkeeper drill designer | None | None | 2026-08-29 (last push) | No | **Rejected**: no licence |
| Pachix-Dev/goalkeeper-training-app[^gk-app] | Goalkeeper session manager with a tactics editor | None | None | 2026-01-13 | No | **Rejected**: no licence |
| Dukes0O/training-ground[^training-ground] | Youth drill designer and animator, SVG tactics board | None | None | 2026-09-29 | No | **Rejected**: no licence |
| connorfryett136-bit/Football-drills[^football-drills] | A list of 220 drills | None | None | 2025-09-23 | No | **Rejected**: no licence, coaching text of unknown origin |
| AndresGuido9820/react-pitch-lines[^pitch-lines] | A React SVG pitch that draws its markings, no dependencies | MIT | MIT (the pitch is drawn by code) | 2026-11-01 | Yes: the author's code | **Usable as is** |
| andrewRowlinson/mplsoccer[^mplsoccer] | Pitch plotting for Python | MIT | MIT | 2026-09-14 | Yes | **Reference only**: Python; useful for pitch dimensions |

No open goalkeeper drill library with a licence and stated origin was found. The earlier
finding stands: goalkeeper content is built here.[^open-apps][^reuse-decision]

# Fitness UI kits and components

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| codeforany/fitness_workout_app_flutter_3_ui[^fitness-flutter-ui] | Flutter screens copied from a third-party Figma design | None | None | 2023-06-05 | Partly: names a design made by someone else | **Rejected**: no licence, someone else's design |
| Arman-Gilani/fitnestx[^fitnestx] | Flutter fitness UI after the same kind of design | None | None | 2025-09-07 (last push) | No | **Rejected**: no licence |

No fitness-specific UI kit with a licence was found; the search turned up course projects
and Figma conversions. The app's own tokens and components stay the source.

# Timers and workout players

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| a-mabe/OpenHIIT[^openhiit] | HIIT and Tabata interval timer with audio and visual cues | MIT | MIT | 2026-08-08 | Yes | **Reference only**: Flutter; cue and timer patterns |
| blockbasti/just_another_workout_timer[^jawt] | Workout timer | MIT | MIT | 2024-07-06 | Yes | **Reference only**: Flutter |
| brandonp2412/Flex[^flex] | Offline-first workout tracker with rest timers | MIT | MIT | 2026-11-16 | Yes | **Reference only**: another stack, and tracking features the app does not want |
| Pjaerr/PWA-Timer[^pwa-timer] | Stopwatch PWA with interval reminders | Unlicense | Unlicense | 2018-05-11 | Yes | **Reference only**: old and small; nothing worth copying |

# Icon and emoji sets

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| tabler/tabler-icons[^tabler] | 6,500+ line icons | MIT | MIT | 2026-11-16 | Yes | **Usable as is**; already the interface set[^media-decision] |
| lucide-icons/lucide[^lucide] | 2,000+ line icons | ISC | ISC | 2026-11-17 | Yes | **Usable as is**; ISC is not yet on the credits list |
| phosphor-icons/core[^phosphor] | Icons in several weights | MIT | MIT | 2026-01-06 | Yes | **Usable as is** |
| hfg-gmuend/openmoji[^openmoji] | Emoji, colour and outline SVG | CC BY-SA 4.0 | CC BY-SA 4.0 | 2026-11-04 | Yes | **Usable with credit**; already chosen for playful glyphs[^media-decision] |
| jdecked/twemoji[^twemoji] | Emoji SVG | MIT | CC BY 4.0 (graphics) | 2026-06-01 | Yes | **Usable with credit** |
| googlefonts/noto-emoji[^noto-emoji] | Emoji font and images | Apache-2.0 (tools, most images) | OFL 1.1 (fonts), Apache-2.0 (most images) | 2026-10-26 | Yes | **Usable as is** |
| microsoft/fluentui-emoji[^fluent-emoji] | Emoji in several styles, including flat SVG | MIT | MIT | 2026-08-24 | Yes | **Usable as is** |
| game-icons/icons[^game-icons] | Single-colour game glyphs (trophies, laurels, shields, flames) | Not asserted | CC BY 3.0 per author folder, a few CC0 | 2026-04-23 | Yes: a folder and credit per author | **Usable with credit**; CC BY 3.0 needs adding to the credits list first |
| Nieobie/game-icon-pack[^nieobie] | 800+ rounded game icons | CC0 | CC0 | 2026-08-02 | No: nothing says who drew them or how | **Rejected**: unclear origin |

# Sound sets and generators

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| facebookincubator/Meta-open-sound[^meta-sound] | Piano and guitar samples; the Oculus Audio Pack: UI sets in seven themes, musical stings, foley | CC0 (repository) | CC0 (instruments); CC BY 4.0 (Oculus pack, a credit line given) | 2026-11-12 | Yes: the publisher's own; the pack's files are byte-identical renamed copies | **Usable with credit** (Oculus pack); the CC0 instruments are usable as is |
| romainsimon/uisfx[^uisfx] | 936 interface sounds in twelve packs: success, complete, level-up, warning and more | MIT | CC0 (audio and pack art) | 2026-09-08 | Yes: rendered from deterministic synthesis recipes in the repository | **Usable as is** |
| maximilianfeix/plinkfx[^plinkfx] | 274 game sounds as code: countdown, level-complete, achievement, victory | MIT | CC0 (sounds) | 2026-11-15 | Yes: synthesis parameters in the repository | **Usable as is** |
| wyzowl/sfx-kit[^sfx-kit] | 320 sound effects with placement data | CC0 | CC0 | 2026-10-20 | Yes: synthesised by code an AI model wrote, each sound approved by a person | **Reference only**: flagged AI; owner's ruling needed |
| scopegate/octave[^octave] | 48 hand-made iOS UI sounds | Not asserted | Custom: free use, no credit needed, but the set may not be sold, hosted or rented | 2014-11-06 | Yes | **Rejected**: a public repo would host it |
| kapishdima/soundcn[^soundcn] | 700+ UI sounds for a component CLI | MIT | Mostly CC0 from Kenney; one collection is a game publisher's property, not free | 2026-06-09 | Partly | **Rejected** as a source: mixed and partly proprietary; take Kenney files from Kenney[^sound-shortlist] |
| rexa-developer/tiks[^tiks] | UI sounds synthesised at runtime, no files | MIT | No audio files | 2026-09-06 | Yes | **Usable as is** |
| KilledByAPixel/ZzFX[^zzfx] | Tiny sound generator | MIT | Sounds are the user's own | 2026-11-03 | Yes | **Usable as is** |
| chr15m/jsfxr[^jsfxr] | sfxr sound generator in JavaScript | Unlicense | Sounds are the user's own | 2026-05-05 | Yes | **Usable as is** |

# Youth training programme data

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| Badcomput/PrisonFitness_app[^prison-fitness] | Bodyweight progression ladders from a commercial training book | None | None | 2026-10-04 | Yes: a commercial book | **Rejected**: no licence, copied programme |

No open youth programme or progression data was found. Searches for youth training
programmes, training-plan JSON, bodyweight progressions and plyometric training returned
personal trackers without licences, course projects and research code. The progression
ladders stay authored here from the cited youth guidance.[^progression-decision]

# Pose and skeleton data

| Repository | Holds | Code licence | Content licence | Last commit | Origin stated | Grade |
|---|---|---|---|---|---|---|
| makehumancommunity/makehuman[^makehuman] | Parametric human figure tool with base mesh, proxies, targets and clothes | AGPL-3.0 | CC0 (bundled assets) | 2024-06-26 | Yes | **Usable as is**, as an offline rig to pose; nothing it renders ships unless a story says so |
| BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset[^bandai] | Motion capture of three professional actors, BVH | MIT (Blender utilities) | CC BY-NC 4.0 | 2023-07-04 | Yes | **Rejected**: non-commercial |
| ubisoft/ubisoft-laforge-animation-dataset[^lafan] | Motion capture, BVH | Not asserted | CC BY-NC-ND 4.0 | 2021-11-22 | Yes | **Rejected**: non-commercial, no derivatives |
| CMU-Perceptual-Computing-Lab/openpose[^openpose] | Keypoint detection | Non-commercial research licence | Same | 2024-08-03 | Yes | **Rejected**: non-commercial |
| google-ai-edge/mediapipe[^mediapipe] | Pose and hand landmark models | Apache-2.0 | Apache-2.0 | 2026-11-17 | Yes | **Reference only**: it analyses camera images of a person, which the app never does with the keeper |
| A mannequin pose library (not linked) | 280 mannequin poses in line art, plus photo-like renders | Apache-2.0 | CC0 (images) | 2026-11-14 | Yes: made with image generators, the renders "AI-generated adults"; one series is suggestive | **Rejected**: AI-generated, and unsuited to a teen-facing project |

The CMU motion database, Quaternius and Kenney rigs are covered elsewhere.[^pose-data][^rigged]

# Top finds against the open gaps

The gaps are the figure coverage tables (17 of 27 rows with no CC0 figure),[^coverage][^gov-coverage]
the dossier items #71 (sections and claim rules), #72 (muscle map) and #73 (the dossier
Decision and clip links),[^dossier-sections][^mm-recommendation] the reward-art
shortlist,[^shortlist] the sound shortlist,[^sound-shortlist] and the progression ladders.

| Find | Grade | Gap it would fill | Notes |
|---|---|---|---|
| Fluent Emoji[^fluent-emoji] | Usable as is | Reward art: flame, star, trophy, medal, moon for the rest day | Flat style as a base to redraw in the app's tokens; the art recommendation keeps one family, so it is a base, not a second style.[^art-recommendation] |
| UI SFX[^uisfx] | Usable as is | Sound shortlist: Set done, XP gain, Session done, Pause | Named success, complete and level-up cues in one coherent pack; a second source beside Kenney. |
| plinkfx[^plinkfx] | Usable as is | Sound shortlist: 3-2-1 (countdown), Session done (level-complete, victory) | Synthesis parameters can be re-rendered to the stored format. |
| Oculus Audio Pack in Meta open sound[^meta-sound] | Usable with credit | Sound shortlist: Switch and Rest (UI themes, stings) | CC BY 4.0, a credit line given; replaces the Rest candidate whose origin is still unconfirmed if a person prefers it. |
| ZzFX and jsfxr[^zzfx][^jsfxr] | Usable as is | Sound shortlist: 3-2-1 beeps made by the app itself | The "sounds the app makes" option, with no audio files. |
| MakeHuman CC0 assets[^makehuman] | Usable as is | Figure coverage: goalkeeper moves with no figure (set stance, crossover step, dives from kneeling and crouch) | An offline rig with human proportions, beside the Kenney and Quaternius rigs.[^rigged] |
| Health Icons[^healthicons] | Usable as is | Dossier #71: section icons (body part, safety, equipment); empty states | CC0, already a second-choice interface set. |
| game-icons[^game-icons] | Usable with credit | Reward art: laurels, shields and trophy glyphs for level badges | Needs CC BY 3.0 on the credits list first. |
| Twemoji[^twemoji] | Usable with credit | Reward art: an alternative glyph family | Only if Fluent's style does not fit. |
| react-pitch-lines[^pitch-lines] | Usable as is | Set-up diagrams for goalkeeper moves (goal area, six-yard box) | Code, not a dependency: the markings are simple geometry. |
| Everkinetic[^everkinetic] | Usable with credit | Figure coverage: general moves (squat, split squat, push-up, bridge), to be checked file by file | Already in the media Decision; still the best licensed exercise drawings. |
| Open Muscle Map[^open-muscle-map] | Reference only | Dossier #72: a cross-check of the muscle vocabulary | Its verification log, not its art. |
| wger records[^wger] | Usable with credit | Dossier #71: cues and notes to adapt under CC BY-SA | Already set by the reuse Decision.[^reuse-decision] |
| soccer-drills schema[^soccer-drills] | Reference only | Progression ladders and drill set-up: the idea of age band, level, players and area as fields | The text is not used. |

Nothing found fills dossier #73 (clip links are links, not content) or the youth
programme data.

# What this changes

- No Decision changes here. The media Decision's never-used list holds; the finds above
  that are rejected (scraped, proprietary, AI-made without a ruling, non-commercial) fit
  its existing rows.[^media-decision]
- Adopting any find is its own story: a manifest entry, the licence on the credits list,
  and the owner's ruling for anything AI-made.

[^media-decision]: Exercise media decision
[^databases]: Open exercise databases with media
[^open-apps]: Open-source training apps and exercise datasets
[^mm-components]: Open muscle-map components and their art
[^mm-recommendation]: Muscle map for exercise dossiers
[^coverage]: CC0 figure coverage per exercise
[^gov-coverage]: Government and health-body figures for each exercise
[^shortlist]: CC0 art shortlist for rewards and the path
[^art-recommendation]: One style for reward and path art
[^sound-shortlist]: CC0 sound shortlist by app moment
[^rigged]: CC0 rigged characters and animation sets
[^pose-data]: Open 3D animation and motion data as pose references
[^dossier-sections]: The sections of an exercise dossier
[^reuse-decision]: Reuse of exercise content
[^progression-decision]: Progression design decision
[^credits-check]: credits_check.py, the licence list for content/
[^gh-search]: GitHub REST API, repository search
[^wger]: wger
[^everkinetic]: Everkinetic data
[^free-exercise-db]: free-exercise-db
[^exercises-json]: exercises.json
[^exercemus]: Exercemus exercises
[^hasaneyldrm]: exercises-dataset (hasaneyldrm)
[^repdb]: RepDB exercise-dataset
[^open-exercise-art]: Open Exercise Art
[^flow-dataset]: flow-exercise-dataset
[^workout-motion]: workout-motion
[^glowupp]: Open ExerciseDB (Glowupp)
[^body-muscles]: body-muscles
[^rnbh]: react-native-body-highlighter
[^swift-musclemap]: MuscleMap (SwiftUI)
[^open-muscle-map]: Open Muscle Map
[^muscle-graph]: muscle-graph
[^anatome]: anatome
[^healthicons]: Health Icons
[^z-anatomy]: Z-Anatomy
[^soccer-drills]: soccer-drills
[^keeper-training]: keeper_training
[^gk-designer]: GK-training-designer
[^gk-app]: goalkeeper-training-app
[^training-ground]: training-ground
[^football-drills]: Football-drills
[^pitch-lines]: react-pitch-lines
[^mplsoccer]: mplsoccer
[^fitness-flutter-ui]: fitness_workout_app_flutter_3_ui
[^fitnestx]: fitnestx
[^openhiit]: OpenHIIT
[^jawt]: just_another_workout_timer
[^flex]: Flex
[^pwa-timer]: PWA-Timer
[^tabler]: Tabler Icons
[^lucide]: Lucide
[^phosphor]: Phosphor icons core
[^openmoji]: OpenMoji
[^twemoji]: Twemoji
[^noto-emoji]: Noto Emoji
[^fluent-emoji]: Fluent Emoji
[^game-icons]: game-icons
[^nieobie]: Game Icon Pack (Nieobie)
[^meta-sound]: Meta open sound
[^uisfx]: UI SFX
[^plinkfx]: plinkfx
[^sfx-kit]: SFX Kit
[^octave]: Octave
[^soundcn]: soundcn
[^tiks]: tiks
[^zzfx]: ZzFX
[^jsfxr]: jsfxr
[^prison-fitness]: PrisonFitness_app
[^makehuman]: MakeHuman
[^bandai]: Bandai Namco Research motion dataset
[^lafan]: Ubisoft La Forge animation dataset
[^openpose]: OpenPose
[^mediapipe]: MediaPipe
