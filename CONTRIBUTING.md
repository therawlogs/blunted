# Contributing

Small, offline, honest. Ground rules:

1. **Engine first.** Behaviour changes land in `src/engine/` with fixtures in
   `tests/` before any UI polish.
2. **No runtime dependencies** in `dist/index.html`. The builder
   (`scripts/build.mjs`) rejects remote refs. Shell/dev tooling may be pinned
   and documented, but never leaks into the artifact.
3. **Offsets are sacred.** Issues use half-open UTF-16 indices into the
   original string. Display counts may use graphemes; editor offsets may not.
4. **Review, not wrong.** Highlights advise; only an exceeded character budget
   is `limit`-level, and nothing ever blocks Copy/Download.
5. **No scope creep.** Non-goals (AI, grammar checking, sync, publishing,
   analytics, updaters) need owner approval, not a PR surprise.
6. **Handoff honesty.** Report tests run, tests not run, known detector
   errors, artifact paths, signing state, and measured sizes. Never say
   “done” when only the web demo works.

Run `npm test` and `npm run build` before pushing.
