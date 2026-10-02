import { describe, expect, it, vi } from "vitest"
import { stopInstance } from "./stop.js"

const target = { port: 54021, pid: 4242, directory: "/work/acme-api" }

const deps = (overrides: Record<string, unknown> = {}) => {
  const calls: string[] = []
  let open = true
  return {
    calls,
    deps: {
      busySessionIds: async () => ["ses_a", "ses_b"],
      abortSession: async (_t: unknown, id: string) => {
        calls.push(`abort ${id}`)
      },
      commandOf: () => "opencode serve --port 54021",
      kill: (pid: number, signal: string) => {
        calls.push(`kill ${pid} ${signal}`)
        open = false
      },
      isOpen: async () => open,
      deregister: (port: number) => {
        calls.push(`deregister ${port}`)
      },
      sleep: async () => undefined,
      ...overrides,
    },
  }
}

describe("stopInstance", () => {
  it("aborts busy sessions, signals the process group, deregisters and confirms", async () => {
    const { calls, deps: d } = deps()
    await expect(stopInstance(target, d)).resolves.toEqual({ ok: true })
    expect(calls).toEqual([
      "abort ses_a",
      "abort ses_b",
      "kill -4242 SIGTERM",
      "deregister 54021",
    ])
  })

  it("falls back to the pid when the group signal fails", async () => {
    const kill = vi.fn((pid: number) => {
      if (pid < 0) throw new Error("ESRCH")
    })
    const { deps: d } = deps({ kill, isOpen: async () => false })
    await stopInstance(target, d)
    expect(kill.mock.calls.map(([pid]) => pid)).toEqual([-4242, 4242])
  })

  it("never signals a process that is not opencode", async () => {
    const kill = vi.fn()
    const { deps: d } = deps({
      commandOf: () => "vim notes.md",
      kill,
      isOpen: async () => false,
    })
    await stopInstance(target, d)
    expect(kill).not.toHaveBeenCalled()
  })

  it("ignores abort errors", async () => {
    const { deps: d } = deps({
      abortSession: async () => {
        throw new Error("boom")
      },
    })
    await expect(stopInstance(target, d)).resolves.toEqual({ ok: true })
  })

  it("reports a port that stays open", async () => {
    vi.useFakeTimers()
    const { deps: d } = deps({
      kill: () => undefined,
      sleep: async () => {
        vi.advanceTimersByTime(1000)
      },
    })
    await expect(stopInstance(target, d)).resolves.toEqual({
      ok: false,
      reason: "port still open",
    })
    vi.useRealTimers()
  })
})
