import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  parseRegistry,
  readRegistry,
  registryPath,
  removeFromRegistry,
  type InstanceRecord,
} from "./registry.js"

const record = (port: number): InstanceRecord => ({
  runtime: "opencode",
  pid: 1000 + port,
  port,
  directory: "/work/acme-api",
  startedAt: "2026-10-02T10:00:00.000Z",
  mcpPid: 1,
  sessions: [],
})

describe("registry", () => {
  let dir: string
  const previous = process.env["MCP_OPENCODE_STATE_DIR"]

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "opencode-sessions-"))
    process.env["MCP_OPENCODE_STATE_DIR"] = dir
  })

  afterEach(() => {
    if (previous === undefined) delete process.env["MCP_OPENCODE_STATE_DIR"]
    else process.env["MCP_OPENCODE_STATE_DIR"] = previous
  })

  it("treats a missing file as no instances", () => {
    expect(readRegistry()).toEqual([])
  })

  it("treats unparseable content and non-arrays as no instances", () => {
    expect(parseRegistry("{nope")).toEqual([])
    expect(parseRegistry('{"port":1}')).toEqual([])
  })

  it("drops rows without a port, pid and directory", () => {
    const raw = JSON.stringify([record(4101), { port: "x" }, null])
    expect(parseRegistry(raw)).toEqual([record(4101)])
  })

  it("removes a row by port and leaves the others, atomically", () => {
    writeFileSync(registryPath(), JSON.stringify([record(4101), record(4102)]))
    removeFromRegistry(4101)
    expect(JSON.parse(readFileSync(registryPath(), "utf8"))).toEqual([
      record(4102),
    ])
    expect(readdirSync(dir)).toEqual(["instances.json"])
  })

  it("removing from a missing registry writes an empty one", () => {
    removeFromRegistry(4101)
    expect(readRegistry()).toEqual([])
  })
})
