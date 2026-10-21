import { execFileSync } from "node:child_process"
import { probeServer, serverUrl } from "./discovery.js"
import { removeFromRegistry } from "./registry.js"
import { clientFor, type SessionRow } from "./sessions.js"

const STOP_DEADLINE_MS = 5000
const POLL_INTERVAL_MS = 200

export type StopTarget = {
  port: number
  pid: number
  directory: string
  password?: string
}

export type StopResult = { ok: true } | { ok: false; reason: string }

type StopDeps = {
  activeSessionIds: (target: StopTarget) => Promise<string[]>
  interruptSession: (target: StopTarget, sessionID: string) => Promise<void>
  commandOf: (pid: number) => string
  kill: (pid: number, signal: NodeJS.Signals) => void
  isOpen: (target: StopTarget) => Promise<boolean>
  deregister: (port: number) => void
  sleep: (ms: number) => Promise<void>
}

const clientForTarget = (target: StopTarget) =>
  clientFor({ url: serverUrl(target.port), password: target.password })

const defaultDeps: StopDeps = {
  activeSessionIds: async (target) =>
    Object.keys(await clientForTarget(target).session.active()),
  interruptSession: async (target, sessionID) => {
    await clientForTarget(target).session.interrupt({ sessionID })
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
  isOpen: async (target) =>
    (await probeServer(serverUrl(target.port), target.password)) !== "absent",
  deregister: removeFromRegistry,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

export const targetFromRow = (row: SessionRow): StopTarget | undefined =>
  row.pid === undefined || row.serverDirectory === undefined
    ? undefined
    : {
        port: row.port,
        pid: row.pid,
        directory: row.serverDirectory,
        password: row.password,
      }

const interruptActiveSessions = async (target: StopTarget, deps: StopDeps) => {
  try {
    const ids = await deps.activeSessionIds(target)
    await Promise.all(
      ids.map((id) => deps.interruptSession(target, id).catch(() => undefined)),
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

const waitUntilClosed = async (target: StopTarget, deps: StopDeps) => {
  const deadline = Date.now() + STOP_DEADLINE_MS
  while (Date.now() < deadline) {
    if (!(await deps.isOpen(target))) return true
    await deps.sleep(POLL_INTERVAL_MS)
  }
  return !(await deps.isOpen(target))
}

export const stopInstance = async (
  target: StopTarget,
  deps: StopDeps = defaultDeps,
): Promise<StopResult> => {
  await interruptActiveSessions(target, deps)

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
  const closed = await waitUntilClosed(target, deps)
  return closed ? { ok: true } : { ok: false, reason: "port still open" }
}
