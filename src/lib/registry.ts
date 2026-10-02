import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export type InstanceRecord = {
  runtime: "opencode"
  pid: number
  port: number
  directory: string
  startedAt: string
  mcpPid: number
  sessions: { id: string; title: string; model: string; startedAt: string }[]
}

export const stateDir = () =>
  process.env["MCP_OPENCODE_STATE_DIR"] ??
  join(homedir(), ".local", "state", "mcp-opencode")

export const registryPath = () => join(stateDir(), "instances.json")

const isInstanceRecord = (value: unknown): value is InstanceRecord => {
  if (typeof value !== "object" || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row["port"] === "number" &&
    typeof row["pid"] === "number" &&
    typeof row["directory"] === "string"
  )
}

export const parseRegistry = (raw: string): InstanceRecord[] => {
  try {
    const rows: unknown = JSON.parse(raw)
    return Array.isArray(rows) ? rows.filter(isInstanceRecord) : []
  } catch {
    return []
  }
}

export const readRegistry = (): InstanceRecord[] => {
  try {
    return parseRegistry(readFileSync(registryPath(), "utf8"))
  } catch {
    return []
  }
}

export const removeFromRegistry = (port: number) => {
  const remaining = readRegistry().filter((row) => row.port !== port)
  const tmp = `${registryPath()}.${process.pid}.tmp`
  mkdirSync(stateDir(), { recursive: true })
  writeFileSync(tmp, JSON.stringify(remaining, null, 2) + "\n")
  renameSync(tmp, registryPath())
}
