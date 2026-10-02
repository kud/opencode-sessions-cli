import { describe, expect, it } from "vitest"
import { buildRows, type ServerSessions } from "./sessions.js"

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

describe("buildRows", () => {
  const rows = buildRows(results, NOW)

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
