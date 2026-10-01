# Project conventions

This document describes the tooling and principles I use in my projects.

## Tooling

- **[Vite+](https://viteplus.dev) (`vp`)** is the single toolchain: installing dependencies, running the dev server, building apps and libraries, testing (Vitest), formatting (Oxfmt), linting and type checking (Oxlint).
- **pnpm**, through `vp`, with its settings and dependency catalogs in `pnpm-workspace.yaml`.
- **Node.js and TypeScript**, kept on current versions and pinned per project (`.node-version`, `packageManager`).
- **GitHub Actions** for CI and publishing, using npm trusted publishing (no tokens).
- **ShellCheck and shfmt** for repositories that contain shell scripts, like this one.
