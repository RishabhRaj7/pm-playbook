# The PM Playbook

A free, self-paced reference for people learning product management. It covers the job from discovery to launch, plus the frameworks PMs are expected to know. Every topic follows the same editorial shape, so learners always know where to look.

The site is set out like a broadsheet newspaper, with a day and a night edition. It has no accounts and no backend. Progress is saved in the reader's own browser.

## What's inside

**Twelve topics, in the order a product loop runs:**

| # | Topic | Interactive tool |
|---|---|---|
| 01 | Discovery & User Research | Interview practice |
| 02 | Strategy & Roadmapping | Strategy sort |
| 03 | Pricing & Packaging | Price vs. volume |
| 04 | Prioritisation & Trade-offs | RICE scorer |
| 05 | Specs, PRDs & Working with Engineers | Slice it thin |
| 06 | Analytics & Instrumentation | Identity stitching |
| 07 | Metrics & the North Star | Funnel |
| 08 | A/B Testing & Experimentation | Sample-size calculator |
| 09 | Launch, GTM & Adoption | Staged rollout |
| 10 | Frameworks — Diagnosis & Analysis | Five whys |
| 11 | Frameworks — Decide & Prioritise | OKRs |
| 12 | Frameworks — Structure, Measure & Change | Stakeholder map |

**Each topic page includes:**

- A framing idea.
- The key terms, with a "name that term" drill.
- A numbered process with a spine that fills as you read.
- Diagrams.
- Worked examples with the arithmetic shown.
- A searchable cheat sheet.
- A ten-question quiz.

**Across the site:**

- **Learning paths:** Start here (~2 weeks), Interview prep (~10 days), First 90 days (~3 weeks) and The full loop (~6 weeks).
- **The index:** an A–Z glossary of every term and framework, with deep links. Terms in the running text get a dotted underline; hovering or tapping one shows its definition in place.
- **Prep lab:** quiz review, weak-spot tracking and flashcards.
- **Search** across all topics.
- **Your desk:** resume where you left off, see your progress, and back up or restore it as a JSON file.

## Tech stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4 (design tokens in `src/index.css`)
- `motion` for UI transitions
- Canvas for the particle nameplate, the scroll-driven loop and the quarter engine
- `idb` (IndexedDB) for progress, and `localStorage` for preferences
- `vite-plugin-singlefile`: the build is one self-contained `index.html`

## Getting started

Requires Node 20 or later.

```bash
npm install
```

```bash
npm run dev
```

To type-check and build:

```bash
npx tsc -b
```

```bash
npm run build
```

The build writes a single `dist/index.html`. It inlines all JavaScript and CSS, so it can be hosted anywhere static, or opened straight from disk. `npm run preview` serves the build locally.

## Project structure

```
src/
  App.tsx              Masthead, contents drawer, hash router, colophon
  main.tsx             Entry point
  index.css            Theme tokens (day/night editions), editorial type and motion classes
  components/
    Home.tsx           Front page: nameplate, loop, editor's note, desk, curriculum, paths
    TopicPage.tsx      Topic layout, table of contents, mastery ring, reading position
    Sections.tsx       Section renderers: terms, steps, visuals, cases, cheat sheet, quiz, frameworks
    Viz.tsx            Topic diagrams
    Tools.tsx          Calculators and the lab registry
    Labs.tsx           The interactive labs
    Drills.tsx         "Name that term" drill
    Glossary.tsx       The A–Z index page
    GlossTip.tsx       Inline definition card
    Paths.tsx          Learning paths and the resume card
    Prep.tsx           Prep lab, progress, backup and restore
    Search.tsx         Site search
    ScrollLoop.tsx     Scroll-driven 3D helix on the front page
    QuarterEngine.tsx  Simulated quarter of ideas moving through the loop
    ParticleType.tsx   Particle nameplate (React wrapper)
    Glyphs.tsx         Shared SVG glyphs
  data/
    topics.json        All topic content: sections, terms, steps, cases, quizzes
    index.ts           Topic helpers, stages, accents, merged glossary, term of the day
    paths.ts           Learning path definitions
    prep.ts            Prep lab content
  lib/
    db.ts              IndexedDB schema, snapshot export/restore
    progress.tsx       Progress store (React context)
    hooks.ts           Hash routing, theme, scroll spy, safe localStorage wrapper
    gloss.ts           Inline glossary matcher
    particles.ts       Canvas particle field
  utils/cn.ts          Class name helper
```

## Editing content

All topic content is in `src/data/topics.json`. A topic is a list of `sections`, and each section's `type` picks the renderer in `Sections.tsx`. Strings may contain simple inline HTML such as `<b>` and `<em>`.

The glossary is built from the topics' terms and frameworks, so a new term appears in the index and in inline definitions automatically. Learning paths are defined in `src/data/paths.ts` by topic `id`.

## Routing

The site uses hash routes, so it works on any static host without rewrites:

- `#/` — front page
- `#/<topic-id>` — a topic, e.g. `#/metrics`
- `#/<topic-id>/<section>` — a section within a topic
- `#/glossary` — the index
- `#/prep` — the prep lab

## Deployment

The site is deployed on Vercel from `main`, which needs no configuration: Vercel detects Vite, runs `npm run build` and serves `dist/`.

## Privacy

Nothing leaves the browser. Reading progress, quiz history and flashcards are kept in IndexedDB, and the theme and accent choices in `localStorage`. The backup file from "Your desk" is the only way to move progress between devices.
