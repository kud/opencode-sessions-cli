# @kud/opencode-sessions-cli

An Ink TUI that lists every running opencode server's sessions and attaches to one with `↵`.

## Terminal UI

The TUI is built with [`@kud/ink-ui`](https://github.com/kud/ink-ui), the house Ink design system.

**Before writing or changing any UI component, read `node_modules/@kud/ink-ui/AGENTS.md`.** The exhaustive component surface is `node_modules/@kud/ink-ui/dist/index.d.ts`. Never hand-roll a component without checking there first. Colour comes from the `colors` token object, never a string literal.

## Layout

Logic stays out of components: `src/lib/` holds registry, discovery, sessions, stop, format, layout and viewport; `src/app.tsx` and `src/components/` only render and bind keys.

## Safety

Never stop, abort or modify an opencode server or session you did not start. To exercise `x`, start a throwaway opencode v2 `opencode serve --hostname 127.0.0.1 --port 0` in a scratch directory with `OPENCODE_SERVER_PASSWORD` set and its own `HOME`/`XDG_*` dirs, and register it (with that `password`) in a scratch registry pointed at by `MCP_OPENCODE_STATE_DIR`. The background service and windows (any server not in the registry) are never stoppable.

## Keys

`useAppKeys` owns `q`, once, at the root. The app binds `↵`, `x` and `r` itself, and gives `useAppKeys` and the list cursor `isActive: false` while the stop confirmation is open.
