# SCORE Documentation & Benchmark Platform (`score-circuits.github.io`)

Public website and interactive benchmark exploration platform for the **SCORE (Survey & Dataset of Open-Source Chip Repositories)** project, hosted at:

👉 **[https://score-circuits.github.io](https://score-circuits.github.io)**

---

## Overview

This repository powers the official documentation and benchmarking portal for SCORE. It is built using [Astro](https://astro.build) and styled with the **"Warm Paper & Ink" Neo-Brutalist design system** (consistent with the [dataset-fundamentals](https://yongfu-li.github.io/dataset-fundamentals/) course platform).

### Features
- **51 Evaluated Architectures:** Detailed microarchitectural profiles across Categories 1 to 4 and infrastructure frameworks.
- **Interactive Leaderboard:** Empirical benchmark measurements (Level 1 MCU, Level 2 64-bit App, Level 3 Vector, Level 4 Full SoC Scaling).
- **One-Click LaTeX Export:** Instant export of LaTeX tables for direct inclusion in academic survey manuscripts.
- **Client-Side Search:** Real-time filtering by core name, ISA, bus protocol, language, or license.
- **Zero JavaScript Overhead:** Built with Astro static site generation for ultra-fast load times.

---

## Local Development

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```

Visit `http://localhost:4321` in your browser.

### Building Static Site
```bash
npm run build
```
The static HTML output is generated into the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

---

## Data Synchronization

The site renders from pre-computed structured databases in `src/data/`:
- `src/data/score_db.json`: Unified database of tools, categories, and benchmark runs.
- `src/data/registry.json`: Upstream architectural index.

To synchronize data from the parent `score` repository (when working in a monorepo checkout):
```bash
npm run sync
```

---

## Deployment

Pushes to the `main` branch trigger `.github/workflows/deploy.yml` which builds the static site and deploys directly to **GitHub Pages** at `https://score-circuits.github.io`.

---

## License

Hardware catalog metadata and documentation are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

