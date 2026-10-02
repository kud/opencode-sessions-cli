# Changelog

All notable changes to this project are documented here.

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
