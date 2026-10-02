# Changelog

All notable changes to this project are documented here.

---

## 0.3.0 — 2026-10-02

### Highlights

- The package is now `@kud/opencode-sessions-cli` (formerly `@kud/opencode-switcher-cli`); reinstall with `npm install -g @kud/opencode-sessions-cli`, as the old package will be deprecated. ([16443d3](https://github.com/kud/opencode-sessions-cli/commit/16443d3f5712d9bb31e5e36695c78bb2435aab9b))
- New primary command `opencode-sessions` and `ocs`; the old `opencode-switcher` command is gone. ([16443d3](https://github.com/kud/opencode-sessions-cli/commit/16443d3f5712d9bb31e5e36695c78bb2435aab9b))
- The project is now described as a TUI session manager, and the GitHub repository moved to `kud/opencode-sessions-cli` (the old URL redirects). ([16443d3](https://github.com/kud/opencode-sessions-cli/commit/16443d3f5712d9bb31e5e36695c78bb2435aab9b))

---

## 0.2.1 — 2026-10-02

### Fixes

- `ocs --version` / `-v` and `--help` / `-h` now print their output instead of opening the TUI, which any flag used to do. ([879b7d7](https://github.com/kud/opencode-switcher-cli/commit/879b7d78a6a2122dcbb6ef5f2272f28bec3c3098))
- Unknown options or screens now exit with an error rather than launching the TUI. ([879b7d7](https://github.com/kud/opencode-switcher-cli/commit/879b7d78a6a2122dcbb6ef5f2272f28bec3c3098))

---

## 0.2.0 — 2026-10-02

### Highlights

- Idle sessions untouched for over 2 hours are now hidden by default, so the list shows what is live; busy, retrying and headless sessions always appear. ([7edac06](https://github.com/kud/opencode-switcher-cli/commit/7edac067faea1f09fa3ed638bd01bea417f54cb3))
- Press `a` to toggle between recent and all sessions; the header reads "N of M sessions" when filtered, and an empty filtered list hints at the toggle. ([7edac06](https://github.com/kud/opencode-switcher-cli/commit/7edac067faea1f09fa3ed638bd01bea417f54cb3))

### Fixes

- Background auto-refresh no longer flashes "↻ refreshing…"; only `r`, attach and stop show it. ([7edac06](https://github.com/kud/opencode-switcher-cli/commit/7edac067faea1f09fa3ed638bd01bea417f54cb3))
- A failed first load no longer leaves the refreshing status stuck on screen. ([7edac06](https://github.com/kud/opencode-switcher-cli/commit/7edac067faea1f09fa3ed638bd01bea417f54cb3))

---

## 0.1.0 — 2026-10-02

### Highlights

- Initial release: a session switcher that lists sessions across your running opencode servers, with `↵` to attach, `x` to stop a headless instance and `r` to refresh. ([84c23e2](https://github.com/kud/opencode-switcher-cli/commit/84c23e2c88f9775f624b90e726cd416bb8e66770))

---
