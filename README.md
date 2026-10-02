<div align="center">

🔀

# opencode switcher

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**A terminal switcher for running opencode servers: list every session, attach with a keystroke, stop headless instances**

<a href="https://kud.io/projects/opencode-switcher-cli">Website</a> · <a href="https://kud.io/projects/opencode-switcher-cli/docs">Documentation</a>

</div>

## Features

- **Every session, one list** — sessions from every running [opencode](https://opencode.ai) server on your machine, busiest first, then most recently updated
- **Attach with a keystroke** — `↵` hands the terminal to `opencode attach`; quit opencode and you land back in the list
- **Headless and windows** — finds headless instances from the [`@kud/mcp-opencode`](https://github.com/kud/mcp-opencode) registry, plus any opencode server listening locally (found with `lsof`), shown as windows
- **Safe stop** — `x` stops a headless instance after a `y` confirmation; windows are never touched
- **Live state** — busy, idle or retry comes from each server's `session.status`, and the list refreshes every three seconds
- **Two names** — installs as `opencode-switcher` and the short alias `ocs`

## Install

```sh
npm install -g @kud/opencode-switcher-cli
```

Or run it once with `npx @kud/opencode-switcher-cli`.

## Usage

```console
$ ocs
```

One row per session: repo, title, state, age, and whether the server is a headless instance or a window, with its port.

| Key               | Action                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `↑` `↓` / `j` `k` | Move                                                             |
| `↵`               | Attach to the session; quitting opencode returns you to the list |
| `x`               | Stop a headless instance (asks for `y` to confirm)               |
| `r`               | Refresh                                                          |
| `q`               | Quit                                                             |

Demo flags:

```console
$ ocs --mock
$ ocs --screen list
sessions
$ ocs --screen sessions
```

`--mock` runs on fixtures with no live data, `--screen list` prints the screen names, and `--screen <name>` opens directly on one.

### Where it looks

- **Headless instances** are read from `~/.local/state/mcp-opencode/instances.json`, or from `$MCP_OPENCODE_STATE_DIR/instances.json` if you set it. A missing or unreadable file means no instances.
- **Windows** are any other opencode server that answers on a local port, including a long-running `opencode serve`. They are listed but never stopped from here.

### Stopping an instance

`x` on a headless row asks for `y`, then aborts its busy sessions, sends `SIGTERM` to the process (only if it really is opencode), removes its registry row, and waits up to five seconds for the port to close. On a window it says so and does nothing.

## Development

```sh
git clone https://github.com/kud/opencode-switcher-cli.git
cd opencode-switcher-cli
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
```

Built with [`@kud/ink-ui`](https://github.com/kud/ink-ui), [Ink](https://github.com/vadimdemedes/ink) and the [opencode SDK](https://www.npmjs.com/package/@opencode-ai/sdk).

📚 **Full documentation → [opencode-switcher-cli/docs](https://kud.io/projects/opencode-switcher-cli/docs)**
