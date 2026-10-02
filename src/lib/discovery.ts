import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { InstanceRecord } from "./registry.js"

const run = promisify(execFile)

const LOCAL_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost", "*"])
const PROBE_TIMEOUT_MS = 300

export type ServerKind = "headless" | "window"

export type Server = {
  port: number
  url: string
  kind: ServerKind
  directory?: string
  pid?: number
}

export type Discovery = {
  servers: Server[]
  errors: string[]
}

export const serverUrl = (port: number) => `http://127.0.0.1:${port}`

export const parseLsofPorts = (output: string) => {
  const ports = output
    .split("\n")
    .filter((line) => line.startsWith("n"))
    .map((line) => {
      const address = line.slice(1)
      const separator = address.lastIndexOf(":")
      return {
        host: address.slice(0, separator),
        port: Number(address.slice(separator + 1)),
      }
    })
    .filter(({ host, port }) => LOCAL_HOSTS.has(host) && port > 0)
    .map(({ port }) => port)
  return [...new Set(ports)].sort((a, b) => a - b)
}

export const listeningOpencodePorts = async () => {
  try {
    const { stdout } = await run("lsof", [
      "-nP",
      "-a",
      "-c",
      "opencode",
      "-iTCP",
      "-sTCP:LISTEN",
      "-Fn",
    ])
    return parseLsofPorts(stdout)
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout
    return typeof stdout === "string" ? parseLsofPorts(stdout) : []
  }
}

export const answersAsOpencode = async (url: string) => {
  try {
    const response = await fetch(`${url}/session`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return response.ok && Array.isArray(await response.json())
  } catch {
    return false
  }
}

type DiscoveryDeps = {
  listPorts: () => Promise<number[]>
  probe: (url: string) => Promise<boolean>
}

const defaultDeps: DiscoveryDeps = {
  listPorts: listeningOpencodePorts,
  probe: answersAsOpencode,
}

export const discoverServers = async (
  registry: InstanceRecord[],
  deps: DiscoveryDeps = defaultDeps,
): Promise<Discovery> => {
  const registered = new Map(registry.map((row) => [row.port, row]))
  const listening = await deps.listPorts()
  const ports = [...new Set([...listening, ...registered.keys()])].sort(
    (a, b) => a - b,
  )
  const answering = await Promise.all(
    ports.map((port) => deps.probe(serverUrl(port))),
  )

  const servers: Server[] = []
  const errors: string[] = []
  ports.forEach((port, index) => {
    const record = registered.get(port)
    if (!answering[index]) {
      if (record) errors.push(`port ${port}: registered but not answering`)
      return
    }
    servers.push(
      record
        ? {
            port,
            url: serverUrl(port),
            kind: "headless",
            directory: record.directory,
            pid: record.pid,
          }
        : { port, url: serverUrl(port), kind: "window" },
    )
  })
  return { servers, errors }
}
