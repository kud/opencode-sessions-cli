import { describe, expect, it } from "vitest"
import {
  discoverServers,
  parseLsofPorts,
  type ProbeResult,
  type Server,
} from "./discovery.js"
import type { InstanceRecord } from "./registry.js"

const instance = (port: number, password?: string): InstanceRecord => ({
  runtime: "opencode",
  pid: 7,
  port,
  directory: "/work/acme-api",
  startedAt: "2026-10-02T10:00:00.000Z",
  mcpPid: 1,
  ...(password === undefined ? {} : { password }),
  sessions: [],
})

const service: Server = {
  port: 4096,
  url: "http://127.0.0.1:4096",
  kind: "service",
  password: "pw-2",
}

const portOf = (url: string) => Number(url.split(":").pop())

const probing =
  (results: Record<number, ProbeResult>) => async (url: string) =>
    results[portOf(url)] ?? "absent"

const deps = (overrides: Partial<Parameters<typeof discoverServers>[1]> = {}) => ({
  listPorts: async () => [],
  probe: probing({}),
  findService: async () => undefined,
  envPassword: () => undefined,
  ...overrides,
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
  it("lists the background service, registered ports as headless and other answering ports as windows", async () => {
    const { servers, errors } = await discoverServers(
      [instance(54021)],
      deps({
        findService: async () => service,
        listPorts: async () => [4096, 5000, 54021, 9999],
        probe: probing({ 5000: "open", 54021: "open" }),
      }),
    )
    expect(errors).toEqual([])
    expect(servers.map((s) => [s.port, s.kind])).toEqual([
      [4096, "service"],
      [5000, "window"],
      [54021, "headless"],
    ])
    expect(servers[2]?.directory).toBe("/work/acme-api")
  })

  it("probes a registered instance with its own password, others with the fallback", async () => {
    const seen: [number, string | undefined][] = []
    const { servers } = await discoverServers(
      [instance(54021, "pw-3")],
      deps({
        listPorts: async () => [5000, 54021],
        probe: async (url, password) => {
          seen.push([portOf(url), password])
          return "open"
        },
        envPassword: () => "pw-4",
      }),
    )
    expect(seen).toEqual([
      [5000, "pw-4"],
      [54021, "pw-3"],
    ])
    expect(servers.map((s) => s.password)).toEqual(["pw-4", "pw-3"])
  })

  it("reports a registered instance that no longer answers", async () => {
    const { servers, errors } = await discoverServers([instance(54021)], deps())
    expect(servers).toEqual([])
    expect(errors).toEqual(["port 54021: registered but not answering"])
  })

  it("reports a registered instance that refuses its password", async () => {
    const { errors } = await discoverServers(
      [instance(54021, "pw-5")],
      deps({ probe: probing({ 54021: "locked" }) }),
    )
    expect(errors).toEqual(["port 54021: registered but refused its password"])
  })

  it("groups unregistered servers it cannot unlock into one line", async () => {
    const { servers, errors } = await discoverServers(
      [],
      deps({
        listPorts: async () => [5000, 5001],
        probe: probing({ 5000: "locked", 5001: "locked" }),
      }),
    )
    expect(servers).toEqual([])
    expect(errors).toEqual([
      "ports 5000, 5001: need a password (set OPENCODE_PASSWORD)",
    ])
  })
})
