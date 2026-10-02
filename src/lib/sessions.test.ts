import { describe, expect, it } from "vitest"
import { buildRows, filterRows, RECENT_WINDOW_MS, type ServerSessions, type SessionRow } from "./sessions.js"

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
    statuses: {},
  },
  {
    server: {
      port: 54021,
      url: "http://127.0.0.1:54021",
      kind: "headless",
      directory: "/work/acme-api",
      pid: 9,
    },
    sessions: [
      session("busy-old", "", 90),
      session("retrying", "/work/acme-api", 2),
    ],
    statuses: { "busy-old": { type: "busy" }, retrying: { type: "retry" } },
  },
]

const baseRows = buildRows(results, NOW)

describe("buildRows", () => {
  const rows = baseRows

  it("sorts busy first, then retry, then idle by recency", () => {
    expect(rows.map((row) => row.id)).toEqual([
      "busy-old",
      "retrying",
      "new-idle",
      "old-idle",
    ])
  })

  it("derives repo from the session directory, else the server's", () => {
    expect(rows.find((r) => r.id === "busy-old")?.repo).toBe("acme-api")
    expect(rows.find((r) => r.id === "old-idle")?.repo).toBe("acme-shop")
  })

  it("treats a missing status as idle and carries kind, port and age", () => {
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
          statuses: {},
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

describe("filterRows", () => {
  const twoHoursAgo = NOW - RECENT_WINDOW_MS
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

  it("keeps retry sessions older than 2h", () => {
    const rows = [makeRow({ id: "retry-old", state: "retry", updatedAt: threeHoursAgo, kind: "window" })]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["retry-old"])
  })

  it("hides idle sessions older than 2h", () => {
    const rows = [makeRow({ id: "idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "window" })]
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
      makeRow({ id: "retry-old", state: "retry", updatedAt: threeHoursAgo, kind: "window" }),
      makeRow({ id: "headless-idle-old", state: "idle", updatedAt: threeHoursAgo, kind: "headless" }),
    ]
    const filtered = filterRows(rows, false, NOW)
    expect(filtered.map((r) => r.id)).toEqual(["idle-recent", "busy-old", "retry-old", "headless-idle-old"])
  })
})
