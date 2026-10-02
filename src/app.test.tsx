import React from "react"
import { describe, expect, it } from "vitest"
import { render } from "ink-testing-library"
import { App } from "./app.js"
import { mockRows } from "./lib/mock.js"
import type { SessionRow } from "./lib/sessions.js"

const MOCK_NOW = Date.UTC(2026, 9, 2, 12, 0, 0)

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

describe("App", () => {
  it("shows a skeleton before the first load lands", () => {
    const { lastFrame, unmount } = render(
      <App load={() => new Promise(() => undefined)} autoRefresh={false} now={() => MOCK_NOW} />,
    )
    expect(lastFrame()).toContain("opencode")
    expect(lastFrame()).toContain("█")
    unmount()
  })

  it("lists sessions with state, age and kind, busy first", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    stdin.write("a")
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("acme-api")
    expect(frame).toContain("busy")
    expect(frame).toContain("headless :54021")
    expect(frame).toContain("window :4096")
    expect(frame).toContain("3h")
    expect(frame.indexOf("acme-api")).toBeLessThan(frame.indexOf("acme-shop"))
    expect(frame).toContain("attach")
    expect(frame).toContain("stop")
    unmount()
  })

  it("says so when no servers are found, and shows server errors inline", async () => {
    const { lastFrame, unmount } = render(
      <App
        load={async () => ({
          rows: [],
          errors: ["port 54021: registered but not answering"],
        })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    expect(lastFrame()).toContain("No opencode servers found")
    expect(lastFrame()).toContain("registered but not answering")
    unmount()
  })

  it("refuses to stop a window", async () => {
    // Use showAll to see the window sessions (they're older than 2h)
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => ({
          rows: mockRows().filter((row) => row.kind === "window"),
          errors: [],
        })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    // Need to press 'a' to show all sessions first
    stdin.write("a")
    await settle()
    stdin.write("x")
    await settle()
    expect(lastFrame()).toContain("Windows can't be stopped here")
    unmount()
  })

  it("asks for confirmation before stopping a headless instance", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    stdin.write("x")
    await settle()
    expect(lastFrame()).toContain("Stop :54021")
    stdin.write("n")
    await settle()
    expect(lastFrame()).not.toContain("Stop :54021")
    unmount()
  })

  it("toggles all/recent with 'a' key: footer hint and hidden rows", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    // Default: shows 1 of 3 (filtered), hint says "a all"
    let frame = lastFrame() ?? ""
    expect(frame).toContain("1 of 3 sessions")
    expect(frame).toContain("a all")
    // Press 'a' to show all
    stdin.write("a")
    await settle()
    frame = lastFrame() ?? ""
    expect(frame).toContain("3 sessions") // scope shows plain count when not filtered
    expect(frame).toContain("a recent")
    expect(frame).toContain("window :4096")
    // Press 'a' again to go back to recent
    stdin.write("a")
    await settle()
    frame = lastFrame() ?? ""
    expect(frame).toContain("1 of 3 sessions")
    expect(frame).toContain("a all")
    unmount()
  })

  it("shows plain count when not filtered", async () => {
    // All sessions are recent (within 2h) so no filtering occurs
    const recentRows = mockRows().map((row) => ({
      ...row,
      updatedAt: MOCK_NOW - 60_000, // 1 minute ago
      age: "1m",
    }))
    const { lastFrame, unmount } = render(
      <App
        load={async () => ({ rows: recentRows, errors: [] })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    const frame = lastFrame() ?? ""
    // Scope should show plain count without " of "
    expect(frame).toContain("3 sessions")
    // The " of " only appears in scope when filtered, not in the whole frame
    // Check that scope doesn't contain " of " by verifying the specific format
    expect(frame).not.toMatch(/sessions  ·  \d+ of \d+/)
    unmount()
  })

  it("shows empty filtered state with hint", async () => {
    // Only old idle window sessions - filtered out in default view
    const oldRows = mockRows().filter((row) => row.kind === "window")
    const { lastFrame, unmount } = render(
      <App
        load={async () => ({ rows: oldRows, errors: [] })}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    // Wait for initial load to complete
    await new Promise((r) => setTimeout(r, 100))
    await settle()
    const frame = lastFrame() ?? ""
    expect(frame).toContain("nothing recent")
    expect(frame).toContain("a shows all")
    unmount()
  })

  it("polls silently but shows the status on a manual refresh", async () => {
    let calls = 0
    const load = () => {
      calls += 1
      return calls === 1
        ? Promise.resolve({ rows: mockRows(), errors: [] })
        : new Promise<never>(() => undefined)
    }
    const { lastFrame, stdin, unmount } = render(
      <App load={load} refreshIntervalMs={10} now={() => MOCK_NOW} />,
    )
    await settle()
    await settle()
    expect(calls).toBeGreaterThan(1)
    expect(lastFrame()).not.toContain("refreshing")
    stdin.write("r")
    await settle()
    expect(lastFrame()).toContain("refreshing")
    unmount()
  })

  it("clears the status when the first load fails", async () => {
    const { lastFrame, unmount } = render(
      <App
        load={() => Promise.reject(new Error("registry unreadable"))}
        autoRefresh={false}
        now={() => MOCK_NOW}
      />,
    )
    await settle()
    expect(lastFrame()).toContain("registry unreadable")
    expect(lastFrame()).not.toContain("refreshing")
    unmount()
  })
})
