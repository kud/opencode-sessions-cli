import { describe, expect, it } from "vitest"
import type { SessionInfo } from "@opencode/client"
import {
  buildRows,
  dedupeRows,
  filterRows,
  RECENT_WINDOW_MS,
  toRawSession,
  type ServerSessions,
  type SessionRow,
} from "./sessions.js"

const NOW = 1_000_000_000_000
const session = (id: string, directory: string, updatedMinutesAgo: number) => ({
  id,
  title: `title ${id}`,
  directory,
  time: { created: NOW - 1e7, updated: NOW - updatedMinutesAgo * 60_000 },
})

const results: ServerSessions[] = [
  {
    server: {
      port: 4096,
      url: "http://127.0.0.1:4096",
      kind: "window",
    },
    sessions: [
      session("old-idle", "/work/acme-shop", 300),
      session("new-idle", "/work/acme-docs", 5),
    ],
    active: [],
  },
  {
    server: {
      port: 54021,
      url: "http://127.0.0.1:54021",
      kind: "headless",
      directory: "/work/acme-api",
      password: "pw-3",
      pid: 9,
    },
    sessions: [
      session("busy-old", "", 90),
      session("idle-api", "/work/acme-api", 2),
    ],
    active: ["busy-old"],
  },
]

const baseRows = buildRows(results, NOW)

describe("buildRows", () => {
  const rows = baseRows

  it("sorts busy first, then idle by recency", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "busy-old",
      "idle-api",
      "new-idle",
      "old-idle",
    ])
  })

  it("derives repo and directory from the session, else the server's", () => {
    expect(rows.find((r) => r.id === "busy-old")).toMatchObject({
      repo: "acme-api",
      directory: "/work/acme-api",
    })
    expect(rows.find((r) => r.id === "old-idle")?.repo).toBe("acme-shop")
  })

  it("treats a session missing from active as idle and carries kind, port, password and age", () => {
    const idle = rows.find((r) => r.id === "new-idle")!
    expect(idle).toMatchObject({
      state: "idle",
      kind: "window",
      port: 4096,
      age: "5m",
    })
    expect(rows.find((r) => r.id === "busy-old")).toMatchObject({
      state: "busy",
      kind: "headless",
      password: "pw-3",
      pid: 9,
    })
  })
})

describe("buildRows with an idle headless server", () => {
  it("keeps a placeholder row so the instance can still be stopped", () => {
    const rows = buildRows(
      [
        {
          server: {
            port: 54022,
            url: "http://127.0.0.1:54022",
            kind: "headless",
            directory: "/work/acme-api",
            pid: 11,
          },
          sessions: [],
          active: [],
        },
      ],
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: "",
      repo: "acme-api",
      port: 54022,
      serverDirectory: "/work/acme-api",
    })
  })
})

describe("dedupeRows", () => {
  const shared = session("ses_shared", "/work/acme-api", 3)
  const serverOf = (port: number, kind: "service" | "headless" | "window") => ({
    port,
    url: `http://127.0.0.1:${port}`,
    kind,
  })

  it("keeps one row per session, on the server running it", () => {
    const rows = buildRows(
      [
        { server: serverOf(4096, "service"), sessions: [shared], active: [] },
        {
          server: serverOf(5000, "window"),
          sessions: [shared],
          active: ["ses_shared"],
        },
      ],
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ port: 5000, state: "busy" })
  })

  it("prefers headless, then the service, then a window when nothing runs it", () => {
    const rows = buildRows(
      [
        { server: serverOf(5000, "window"), sessions: [shared], active: [] },
        { server: serverOf(4096, "service"), sessions: [shared], active: [] },
        { server: serverOf(54021, "headless"), sessions: [shared], active: [] },
      ],
      NOW,
    )
    expect(rows.map((row) => row.port)).toEqual([54021])
  })

  it("never merges placeholder rows", () => {
    const placeholder = { ...baseRows[0]!, id: "", key: "1:" }
    expect(dedupeRows([placeholder, { ...placeholder, key: "2:" }])).toHaveLength(2)
  })
})

describe("toRawSession", () => {
  it("reads the directory from the session location and names untitled sessions", () => {
    const info = {
      id: "ses_x",
      projectID: "p",
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: 1, updated: 2 },
      location: { directory: "/work/acme-api" },
    } as unknown as SessionInfo
    expect(toRawSession(info)).toEqual({
      id: "ses_x",
      title: "(untitled)",
      directory: "/work/acme-api",
      time: { created: 1, updated: 2 },
    })
  })
})

describe("filterRows", () => {
  const threeHoursAgo = NOW - RECENT_WINDOW_MS - 60 * 60 * 1000
  const fiveMinutesAgo = NOW - 5 * 60 * 1000

  const makeRow = (overrides: Partial<SessionRow>): SessionRow => ({
    key: "test",
    id: "test",
    repo: "test",
    title: "test",
    state: "idle",
    updatedAt: NOW,
    age: "now",
    kind: "window",
    port: 4096,
    url: "http://127.0.0.1:4096",
    ...overrides,
  })

  it("showAll returns all rows", () => {
    const filtered = filterRows(baseRows, true, NOW)
    expect(filtered).toHaveLength(baseRows.length)
  })

  it("keeps busy sessions older than 2h", () => {
    const rows = [makeRow({ id: "busy-old", state: "busy", updatedAt: threeHoursAgo, kind: "window" })]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["busy-old"])
  })

  it("hides idle sessions older than 2h, on the service too", () => {
    const rows = [
      makeRow({ id: "idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "window" }),
      makeRow({ id: "service-old", state: "idle", updatedAt: threeHoursAgo, kind: "service" }),
    ]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered).toHaveLength(0)
  })

  it("keeps idle sessions within 2h", () => {
    const rows = [makeRow({ id: "idle-recent", state: "idle", updatedAt: fiveMinutesAgo, kind: "window" })]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["idle-recent"])
  })

  it("always shows headless sessions regardless of age or state", () => {
    const rows = [
      makeRow({ id: "headless-idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "headless" }),
      makeRow({ id: "headless-busy-old", state: "busy", updatedAt: threeHoursAgo, kind: "headless" }),
    ]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["headless-idle-old", "headless-busy-old"])
  })

  it("filters mixed rows correctly", () => {
    const rows = [
      makeRow({ id: "idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "window" }),
      makeRow({ id: "idle-recent", state: "idle", updatedAt: fiveMinutesAgo, kind: "window" }),
      makeRow({ id: "busy-old", state: "busy", updatedAt: threeHoursAgo, kind: "window" }),
      makeRow({ id: "headless-idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "headless" }),
    ]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["idle-recent", "busy-old", "headless-idle-old"])
  })
})
