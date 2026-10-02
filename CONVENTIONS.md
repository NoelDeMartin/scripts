# Project conventions

This document describes the tooling and principles I use in my projects.

## JavaScript

- **[Vite+](https://viteplus.dev) (`vp`)** is the single toolchain: installing dependencies, running the dev server, building apps and libraries, testing (Vitest), formatting (Oxfmt), linting and type checking (Oxlint).
- **pnpm**, through `vp`, with its settings and dependency catalogs in `pnpm-workspace.yaml`.
- **vue-tsc** in projects with Vue components, because Oxlint doesn't type-check `.vue` files (`vue-tsc --noEmit` for libraries, `vue-tsc --build --force` for apps with separate TypeScript projects).
- **Node.js and TypeScript**, kept on current versions and pinned per project (`.node-version`, `packageManager`).
- **GitHub Actions** for CI and publishing, using npm trusted publishing (no tokens).
- **ShellCheck and shfmt** for repositories that contain shell scripts, like this one.

Projects that deviate from these conventions explain how and why in their own `CONVENTIONS.md`.
