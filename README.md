# opencode-ink

A terminal switcher for running [opencode](https://opencode.ai) servers. It lists every session across every server on your machine, and `↵` hands the terminal to `opencode attach`.

## Install

```sh
npm install -g @kud/opencode-ink
```

This gives you `opencode-ink` and the short alias `ocs`.

## Use

```sh
ocs
```

One row per session: repo, title, state (busy, idle or retry), age, and whether the server is a headless instance or a window, with its port. Busy sessions come first, then the most recently updated.

| Key | Action |
| --- | --- |
| `↑` `↓` / `j` `k` | Move |
| `↵` | Attach to the session; quitting opencode returns you to the list |
| `x` | Stop a headless instance (asks first) |
| `r` | Refresh |
| `q` | Quit |

The list refreshes itself every three seconds.

## Where it looks

- **Headless instances** are the per-job servers that [`@kud/mcp-opencode`](https://github.com/kud/mcp-opencode) starts. They are read from `~/.local/state/mcp-opencode/instances.json`, or from `$MCP_OPENCODE_STATE_DIR/instances.json` if you set it. A missing or unreadable file means no instances.
- **Windows** are any other opencode server that answers on a local port, found with `lsof`. That includes a long-running `opencode serve`. They are listed but never stopped from here.

Busy and idle come from each server's `session.status`, never from the registry file.

## Stopping an instance

`x` on a headless row asks for `y` to confirm, then aborts its busy sessions, sends `SIGTERM` to the process (only if it really is opencode), removes its registry row, and waits up to five seconds for the port to close. On a window it says so and does nothing.

## Demo flags

```sh
ocs --mock              # fixtures only, no live data
ocs --screen list       # print screen names
ocs --screen sessions   # open directly on a screen
```

## Development

```sh
npm run dev
npm run typecheck
npm test
npm run build
```

Built with [`@kud/ink-ui`](https://github.com/kud/ink-ui) and the [opencode SDK](https://www.npmjs.com/package/@opencode-ai/sdk) (v2 client).

## Licence

MIT
