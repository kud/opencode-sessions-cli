import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { basename, formatAge } from "./format.js"
import { discoverServers, type Server, type ServerKind } from "./discovery.js"
import { readRegistry } from "./registry.js"

export type RunState = "busy" | "retry" | "idle"

export type RawSession = {
  id: string
  title: string
  directory: string
  time: { created: number; updated: number }
}

export type SessionRow = {
  key: string
  id: string
  repo: string
  title: string
  state: RunState
  updatedAt: number
  age: string
  kind: ServerKind
  port: number
  url: string
  pid?: number
  serverDirectory?: string
}

export type Snapshot = {
  rows: SessionRow[]
  errors: string[]
}

export type ServerSessions = {
  server: Server
  sessions: RawSession[]
  statuses: Record<string, { type: string }>
}

const WINDOW_SESSION_LIMIT = 40

const toState = (type: string | undefined): RunState =>
  type === "busy" || type === "retry" ? type : "idle"

const STATE_ORDER: Record<RunState, number> = { busy: 0, retry: 1, idle: 2 }

export const sortRows = (rows: SessionRow[]) =>
  [...rows].sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      b.updatedAt - a.updatedAt,
  )

const emptyServerRow = (server: Server, now: number): SessionRow => ({
  key: `${server.port}:`,
  id: "",
  repo: basename(server.directory ?? ""),
  title: "(no sessions yet)",
  state: "idle",
  updatedAt: 0,
  age: "–",
  kind: server.kind,
  port: server.port,
  url: server.url,
  pid: server.pid,
  serverDirectory: server.directory,
})

export const buildRows = (
  results: ServerSessions[],
  now = Date.now(),
): SessionRow[] =>
  sortRows(
    results.flatMap(({ server, sessions, statuses }) =>
      sessions.length === 0 && server.kind === "headless"
        ? [emptyServerRow(server, now)]
        : sessions.map((session) => ({
        key: `${server.port}:${session.id}`,
        id: session.id,
        repo: basename(session.directory || server.directory || ""),
        title: session.title,
        state: toState(statuses[session.id]?.type),
        updatedAt: session.time.updated,
        age: formatAge(session.time.updated, now),
        kind: server.kind,
        port: server.port,
        url: server.url,
        pid: server.pid,
        serverDirectory: server.directory,
      })),
    ),
  )

export const clientFor = (server: Server, directory?: string) =>
  createOpencodeClient({ baseUrl: server.url, directory })

const listSessions = async (server: Server): Promise<RawSession[]> => {
  if (server.kind === "headless") {
    const client = clientFor(server, server.directory)
    const { data } = await client.session.list({
      directory: server.directory,
      roots: true,
    })
    return data ?? []
  }
  const client = clientFor(server)
  try {
    const { data } = await client.experimental.session.list({
      roots: true,
      limit: WINDOW_SESSION_LIMIT,
    })
    if (data) return data
  } catch {
  }
  const { data } = await client.session.list({
    roots: true,
    limit: WINDOW_SESSION_LIMIT,
  })
  return data ?? []
}

const listStatuses = async (server: Server, sessions: RawSession[]) => {
  const directories =
    server.kind === "headless"
      ? [server.directory]
      : [...new Set(sessions.map((session) => session.directory))]
  const maps = await Promise.all(
    directories.map(async (directory) => {
      try {
        const { data } = await clientFor(server, directory).session.status({
          directory,
        })
        return data ?? {}
      } catch {
        return {}
      }
    }),
  )
  return Object.assign({}, ...maps) as Record<string, { type: string }>
}

const loadServer = async (server: Server): Promise<ServerSessions> => {
  const sessions = await listSessions(server)
  const statuses = await listStatuses(server, sessions)
  return { server, sessions, statuses }
}

export const loadSnapshot = async (): Promise<Snapshot> => {
  const discovery = await discoverServers(readRegistry())
  const settled = await Promise.allSettled(discovery.servers.map(loadServer))
  const results: ServerSessions[] = []
  const errors = [...discovery.errors]
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") results.push(outcome.value)
    else
      errors.push(
        `port ${discovery.servers[index]!.port}: ${
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason)
        }`,
      )
  })
  return { rows: buildRows(results), errors }
}
