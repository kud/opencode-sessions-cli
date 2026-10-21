import { describe, expect, it } from "vitest"
import { attachCommand } from "./attach.js"
import type { SessionRow } from "./sessions.js"

const row = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  key: "54021:ses_a",
  id: "ses_a",
  repo: "acme-api",
  title: "Add retry",
  state: "idle",
  updatedAt: 0,
  age: "now",
  kind: "headless",
  port: 54021,
  url: "http://127.0.0.1:54021",
  directory: "/work/acme-api",
  ...overrides,
})

describe("attachCommand", () => {
  it("connects to the row's server, session and directory", () => {
    expect(attachCommand(row()).args).toEqual([
      "--server",
      "http://127.0.0.1:54021",
      "--session",
      "ses_a",
      "/work/acme-api",
    ])
  })

  it("starts fresh in the server directory for a placeholder row", () => {
    expect(attachCommand(row({ id: "" })).args).toEqual([
      "--server",
      "http://127.0.0.1:54021",
      "/work/acme-api",
    ])
  })

  it("passes the server password through the environment only", () => {
    const command = attachCommand(row({ password: "pw-1" }))
    expect(command.env).toEqual({ OPENCODE_PASSWORD: "pw-1" })
    expect(command.args).not.toContain("pw-1")
    expect(attachCommand(row()).env).toEqual({})
  })
})
