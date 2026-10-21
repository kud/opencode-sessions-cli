import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { Service } from "@opencode/client/service"
import type { InstanceRecord } from "./registry.js"

const run = promisify(execFile)

const LOCAL_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost", "*"])
const PROBE_TIMEOUT_MS = 300
const USERNAME = "opencode"

export type ServerKind = "service" | "headless" | "window"

export type Server = {
  port: number
  url: string
  kind: ServerKind
  password?: string
  directory?: string
  pid?: number
}

export type Discovery = {
  servers: Server[]
  errors: string[]
}

export type ProbeResult = "open" | "locked" | "absent"

export const serverUrl = (port: number) => `http://127.0.0.1:${port}`

export const envPassword = () =>
  process.env["OPENCODE_PASSWORD"] ?? process.env["OPENCODE_SERVER_PASSWORD"]

export const authHeaders = (url: string, password?: string) =>
  Service.headers({
    url,
    auth:
      password === undefined
        ? undefined
        : { type: "basic", username: USERNAME, password },
  })

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

const isServerInfo = (body: unknown) =>
  typeof body === "object" &&
  body !== null &&
  typeof (body as { version?: unknown }).version === "string"

export const probeServer = async (
  url: string,
  password?: string,
): Promise<ProbeResult> => {
  try {
    const response = await fetch(`${url}/api/info`, {
      headers: authHeaders(url, password),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (response.status === 401) return "locked"
    return response.ok && isServerInfo(await response.json())
      ? "open"
      : "absent"
  } catch {
    return "absent"
  }
}

export const findBackgroundService = async (): Promise<Server | undefined> => {
  try {
    const endpoint = await Service.discover()
    if (!endpoint) return undefined
    const url = endpoint.url.replace(/\/+$/, "")
    const { password } = endpoint.auth ?? {}
    return { port: Number(new URL(url).port), url, kind: "service", password }
  } catch {
    return undefined
  }
}

type DiscoveryDeps = {
  listPorts: () => Promise<number[]>
  probe: (url: string, password?: string) => Promise<ProbeResult>
  findService: () => Promise<Server | undefined>
  envPassword: () => string | undefined
}

const defaultDeps: DiscoveryDeps = {
  listPorts: listeningOpencodePorts,
  probe: probeServer,
  findService: findBackgroundService,
  envPassword,
}

const lockedMessage = (ports: number[]) =>
  `${ports.length === 1 ? "port" : "ports"} ${ports.join(", ")}: ${
    ports.length === 1 ? "needs" : "need"
  } a password (set OPENCODE_PASSWORD)`

export const discoverServers = async (
  registry: InstanceRecord[],
  deps: DiscoveryDeps = defaultDeps,
): Promise<Discovery> => {
  const [service, listening] = await Promise.all([
    deps.findService(),
    deps.listPorts(),
  ])
  const registered = new Map(registry.map((row) => [row.port, row]))
  const ports = [...new Set([...listening, ...registered.keys()])]
    .filter((port) => port !== service?.port)
    .sort((a, b) => a - b)
  const passwords = ports.map(
    (port) => registered.get(port)?.password ?? deps.envPassword(),
  )
  const probes = await Promise.all(
    ports.map((port, index) => deps.probe(serverUrl(port), passwords[index])),
  )

  const servers: Server[] = service ? [service] : []
  const errors: string[] = []
  const locked: number[] = []
  ports.forEach((port, index) => {
    const record = registered.get(port)
    const probe = probes[index]
    if (probe === "absent") {
      if (record) errors.push(`port ${port}: registered but not answering`)
      return
    }
    if (probe === "locked") {
      if (record)
        errors.push(`port ${port}: registered but refused its password`)
      else locked.push(port)
      return
    }
    const password = passwords[index]
    servers.push(
      record
        ? {
            port,
            url: serverUrl(port),
            kind: "headless",
            password,
            directory: record.directory,
            pid: record.pid,
          }
        : { port, url: serverUrl(port), kind: "window", password },
    )
  })
  if (locked.length > 0) errors.push(lockedMessage(locked))
  return { servers, errors }
}
