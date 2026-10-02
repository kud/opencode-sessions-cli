import { execFileSync } from "node:child_process"
import { answersAsOpencode, serverUrl } from "./discovery.js"
import { removeFromRegistry } from "./registry.js"
import { clientFor, type SessionRow } from "./sessions.js"

const STOP_DEADLINE_MS = 5000
const POLL_INTERVAL_MS = 200

export type StopTarget = {
  port: number
  pid: number
  directory: string
}

export type StopResult = { ok: true } | { ok: false; reason: string }

type StopDeps = {
  busySessionIds: (target: StopTarget) => Promise<string[]>
  abortSession: (target: StopTarget, sessionID: string) => Promise<void>
  commandOf: (pid: number) => string
  kill: (pid: number, signal: NodeJS.Signals) => void
  isOpen: (port: number) => Promise<boolean>
  deregister: (port: number) => void
  sleep: (ms: number) => Promise<void>
}

const defaultDeps: StopDeps = {
  busySessionIds: async (target) => {
    const client = clientFor(
      { port: target.port, url: serverUrl(target.port), kind: "headless" },
      target.directory,
    )
    const { data } = await client.session.status({
      directory: target.directory,
    })
    return Object.entries(data ?? {})
      .filter(([, status]) => status.type === "busy" || status.type === "retry")
      .map(([id]) => id)
  },
  abortSession: async (target, sessionID) => {
    const client = clientFor(
      { port: target.port, url: serverUrl(target.port), kind: "headless" },
      target.directory,
    )
    await client.session.abort({ sessionID, directory: target.directory })
  },
  commandOf: (pid) => {
    try {
      return execFileSync("ps", ["-p", String(pid), "-o", "command="], {
        encoding: "utf8",
      })
    } catch {
      return ""
    }
  },
  kill: (pid, signal) => process.kill(pid, signal),
  isOpen: (port) => answersAsOpencode(serverUrl(port)),
  deregister: removeFromRegistry,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

export const targetFromRow = (row: SessionRow): StopTarget | undefined =>
  row.pid === undefined || row.serverDirectory === undefined
    ? undefined
    : { port: row.port, pid: row.pid, directory: row.serverDirectory }

const abortBusySessions = async (target: StopTarget, deps: StopDeps) => {
  try {
    const ids = await deps.busySessionIds(target)
    await Promise.all(
      ids.map((id) => deps.abortSession(target, id).catch(() => undefined)),
    )
  } catch {
    return
  }
}

const terminate = (pid: number, deps: StopDeps) => {
  try {
    deps.kill(-pid, "SIGTERM")
    return
  } catch {
    deps.kill(pid, "SIGTERM")
  }
}

const waitUntilClosed = async (port: number, deps: StopDeps) => {
  const deadline = Date.now() + STOP_DEADLINE_MS
  while (Date.now() < deadline) {
    if (!(await deps.isOpen(port))) return true
    await deps.sleep(POLL_INTERVAL_MS)
  }
  return !(await deps.isOpen(port))
}

export const stopInstance = async (
  target: StopTarget,
  deps: StopDeps = defaultDeps,
): Promise<StopResult> => {
  await abortBusySessions(target, deps)

  if (deps.commandOf(target.pid).includes("opencode")) {
    try {
      terminate(target.pid, deps)
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "could not signal it",
      }
    }
  }

  deps.deregister(target.port)
  const closed = await waitUntilClosed(target.port, deps)
  return closed ? { ok: true } : { ok: false, reason: "port still open" }
}
