export const SCREENS = ["sessions"]

export const HELP = `Usage: ocs [options]

Lists the sessions of every running opencode server and attaches to one.

Options:
  --mock             render fixture sessions instead of live servers
  --screen <name>    open a screen (--screen list prints them)
  -v, --version      print the version
  -h, --help         print this help

Keys: ↑↓ move · ↵ attach · x stop (headless) · r refresh · a all/recent · q quit
`

export type Command =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "screens" }
  | { kind: "run"; mock: boolean }
  | { kind: "error"; message: string }

export const parseArgs = (argv: string[]): Command => {
  let mock = false
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === "-h" || arg === "--help") return { kind: "help" }
    if (arg === "-v" || arg === "--version") return { kind: "version" }
    if (arg === "--mock") {
      mock = true
      continue
    }
    if (arg === "--screen") {
      const screen = argv[++index]
      if (screen === "list") return { kind: "screens" }
      if (screen === undefined || !SCREENS.includes(screen)) {
        return { kind: "error", message: `unknown screen "${screen ?? ""}"` }
      }
      continue
    }
    return { kind: "error", message: `unknown option "${arg}"` }
  }
  return { kind: "run", mock }
}
