import {
  OpenCode,
  type OpenCodeClient,
  type SessionInfo,
} from "@opencode/client"
import { basename, formatAge } from "./format.js"
import {
  authHeaders,
  discoverServers,
  type Server,
  type ServerKind,
} from "./discovery.js"
import { readRegistry } from "./registry.js"

export type RunState = "busy" | "idle"

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
  directory?: string
  password?: string
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
  active: string[]
}

const SHARED_SESSION_LIMIT = 40
const UNTITLED = "(untitled)"

export const RECENT_WINDOW_MS = 2 * 60 * 60 * 1000

export const filterRows = (
  rows: SessionRow[],
  showAll: boolean,
  now = Date.now(),
): SessionRow[] => {
  if (showAll) return rows
  return rows.filter((row) => {
    if (row.kind === "headless") return true
    if (row.state === "busy") return true
    return now - row.updatedAt <= RECENT_WINDOW_MS
  })
}

const STATE_ORDER: Record<RunState, number> = { busy: 0, idle: 1 }

const KIND_ORDER: Record<ServerKind, number> = {
  headless: 0,
  service: 1,
  window: 2,
}

export const sortRows = (rows: SessionRow[]) =>
  [...rows].sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.updatedAt - a.updatedAt,
  )

const preferredRow = (current: SessionRow, candidate: SessionRow) => {
  if (current.state !== candidate.state)
    return current.state === "busy" ? current : candidate
  return KIND_ORDER[candidate.kind] < KIND_ORDER[current.kind]
    ? candidate
    : current
}

export const dedupeRows = (rows: SessionRow[]) => {
  const byId = new Map<string, SessionRow>()
  const placeholders: SessionRow[] = []
  for (const row of rows) {
    if (row.id === "") {
      placeholders.push(row)
      continue
    }
    const current = byId.get(row.id)
    byId.set(row.id, current ? preferredRow(current, row) : row)
  }
  return [...byId.values(), ...placeholders]
}

const emptyServerRow = (server: Server): SessionRow => ({
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
  directory: server.directory,
  password: server.password,
  pid: server.pid,
  serverDirectory: server.directory,
})

const sessionRow = (
  server: Server,
  session: RawSession,
  active: Set<string>,
  now: number,
): SessionRow => {
  const directory = session.directory || server.directory
  return {
    key: `${server.port}:${session.id}`,
    id: session.id,
    repo: basename(directory ?? ""),
    title: session.title,
    state: active.has(session.id) ? "busy" : "idle",
    updatedAt: session.time.updated,
    age: formatAge(session.time.updated, now),
    kind: server.kind,
    port: server.port,
    url: server.url,
    directory,
    password: server.password,
    pid: server.pid,
    serverDirectory: server.directory,
  }
}

export const buildRows = (
  results: ServerSessions[],
  now = Date.now(),
): SessionRow[] =>
  sortRows(
    dedupeRows(
      results.flatMap(({ server, sessions, active }) => {
        if (sessions.length === 0 && server.kind === "headless")
          return [emptyServerRow(server)]
        const running = new Set(active)
        return sessions.map((session) =>
          sessionRow(server, session, running, now),
        )
      }),
    ),
  )

export const clientFor = (
  server: Pick<Server, "url" | "password">,
): OpenCodeClient =>
  OpenCode.make({
    baseUrl: server.url,
    headers: authHeaders(server.url, server.password),
  })

export const toRawSession = (session: SessionInfo): RawSession => ({
  id: session.id,
  title: session.title || UNTITLED,
  directory: session.location.directory,
  time: { created: session.time.created, updated: session.time.updated },
})

const listSessions = async (server: Server): Promise<RawSession[]> => {
  const client = clientFor(server)
  const { data } =
    server.kind === "headless"
      ? await client.session.list({
          directory: server.directory,
          parentID: null,
        })
      : await client.session.list({
          parentID: null,
          limit: SHARED_SESSION_LIMIT,
        })
  return data.map(toRawSession)
}

const listActive = async (server: Server) => {
  try {
    return Object.keys(await clientFor(server).session.active())
  } catch {
    return []
  }
}

const loadServer = async (server: Server): Promise<ServerSessions> => {
  const [sessions, active] = await Promise.all([
    listSessions(server),
    listActive(server),
  ])
  return { server, sessions, active }
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
