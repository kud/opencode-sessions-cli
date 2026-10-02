import { describe, expect, it } from "vitest"
import { discoverServers, parseLsofPorts } from "./discovery.js"
import type { InstanceRecord } from "./registry.js"

const instance = (port: number): InstanceRecord => ({
  runtime: "opencode",
  pid: 7,
  port,
  directory: "/work/acme-api",
  startedAt: "2026-10-02T10:00:00.000Z",
  mcpPid: 1,
  sessions: [],
})

describe("parseLsofPorts", () => {
  it("keeps local listeners, dedupes and sorts", () => {
    const output = [
      "p10",
      "f10",
      "n127.0.0.1:4096",
      "f11",
      "n[::1]:4098",
      "f12",
      "n*:4097",
      "f13",
      "n127.0.0.1:4096",
      "f14",
      "n192.168.1.4:5000",
      "",
    ].join("\n")
    expect(parseLsofPorts(output)).toEqual([4096, 4097, 4098])
  })

  it("returns nothing for empty output", () => {
    expect(parseLsofPorts("")).toEqual([])
  })
})

describe("discoverServers", () => {
  const answering = (open: number[]) => async (url: string) =>
    open.includes(Number(url.split(":").pop()))

  it("marks registered ports headless and every other answering port a window", async () => {
    const { servers, errors } = await discoverServers([instance(54021)], {
      listPorts: async () => [4096, 54021, 9999],
      probe: answering([4096, 54021]),
    })
    expect(errors).toEqual([])
    expect(servers.map((s) => [s.port, s.kind])).toEqual([
      [4096, "window"],
      [54021, "headless"],
    ])
    expect(servers[1]?.directory).toBe("/work/acme-api")
  })

  it("reports a registered instance that no longer answers", async () => {
    const { servers, errors } = await discoverServers([instance(54021)], {
      listPorts: async () => [],
      probe: answering([]),
    })
    expect(servers).toEqual([])
    expect(errors).toEqual(["port 54021: registered but not answering"])
  })
})
