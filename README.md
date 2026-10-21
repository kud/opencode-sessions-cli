<div align="center">

🔀

# opencode sessions

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**A TUI session manager for running opencode servers: list every session, attach with a keystroke, stop headless instances**

<a href="https://kud.io/projects/opencode-sessions-cli">Website</a> · <a href="https://kud.io/projects/opencode-sessions-cli/docs">Documentation</a>

</div>

## Features

- **Every session, one list** — sessions from every running [opencode](https://opencode.ai) server on your machine, busiest first, then most recently updated
- **Focused by default** — shows only busy and recently updated (≤ 2 h) sessions; headless instances always show all their sessions
- **Attach with a keystroke** — `↵` hands the terminal to `opencode --server … --session …`; quit opencode and you land back in the list
- **Service, headless and windows** — finds the opencode v2 background service, headless instances from the [`@kud/mcp-opencode`](https://github.com/kud/mcp-opencode) registry, and any other opencode server listening locally (found with `lsof`), shown as windows
- **Safe stop** — `x` stops a headless instance after a `y` confirmation; the service and windows are never touched
- **Live state** — busy or idle comes from each server's active sessions, and the list refreshes every three seconds
- **Two names** — installs as `opencode-sessions` and the short alias `ocs`

## Install

Needs [opencode](https://opencode.ai) v2. v1 servers are not supported; stay on 0.x of this package for those.


```sh
npm install -g @kud/opencode-sessions-cli
```

Or run it once with `npx @kud/opencode-sessions-cli`.

## Usage

```console
$ ocs
```

One row per session: repo, title, state, age, and whether the server is the background service, a headless instance or a window, with its port.

| Key               | Action                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `↑` `↓` / `j` `k` | Move                                                             |
| `↵`               | Attach to the session; quitting opencode returns you to the list |
| `x`               | Stop a headless instance (asks for `y` to confirm)               |
| `r`               | Refresh                                                          |
| `a`               | Toggle all sessions / recent only                                |
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

- **The background service** is found through `$XDG_STATE_HOME/opencode/service.json` (`~/.local/state/opencode/service.json` by default), which also holds its password.
- **Headless instances** are read from `~/.local/state/mcp-opencode/instances.json`, or from `$MCP_OPENCODE_STATE_DIR/instances.json` if you set it. A missing or unreadable file means no instances. A record's `password`, when present, is used to reach that instance.
- **Windows** are any other opencode server that answers on a local port, including a long-running `opencode serve`. They are listed but never stopped from here.

### Passwords

opencode v2 servers ask for a password. The service's and registered instances' passwords are picked up on their own; for any other server, set `OPENCODE_PASSWORD` (or `OPENCODE_SERVER_PASSWORD`). A server it cannot open shows as a warning under the list, never as a crash.

### Stopping an instance

`x` on a headless row asks for `y`, then interrupts its active sessions, sends `SIGTERM` to the process (only if it really is opencode), removes its registry row, and waits up to five seconds for the port to close. On the service or a window it says so and does nothing.

## Development

```sh
git clone https://github.com/kud/opencode-sessions-cli.git
cd opencode-sessions-cli
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
```

Built with [`@kud/ink-ui`](https://github.com/kud/ink-ui), [Ink](https://github.com/vadimdemedes/ink) and the [opencode v2 client](https://www.npmjs.com/package/@opencode/client).

📚 **Full documentation → [opencode-sessions-cli/docs](https://kud.io/projects/opencode-sessions-cli/docs)**
