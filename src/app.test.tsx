import React from "react"
import { describe, expect, it } from "vitest"
import { render } from "ink-testing-library"
import { App } from "./app.js"
import { mockRows } from "./lib/mock.js"

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

describe("App", () => {
  it("shows a skeleton before the first load lands", () => {
    const { lastFrame, unmount } = render(
      <App load={() => new Promise(() => undefined)} autoRefresh={false} />,
    )
    expect(lastFrame()).toContain("opencode")
    expect(lastFrame()).toContain("█")
    unmount()
  })

  it("lists sessions with state, age and kind, busy first", async () => {
    const { lastFrame, unmount } = render(
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
      />,
    )
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
      />,
    )
    await settle()
    expect(lastFrame()).toContain("No opencode servers found")
    expect(lastFrame()).toContain("registered but not answering")
    unmount()
  })

  it("refuses to stop a window", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => ({
          rows: mockRows().filter((row) => row.kind === "window"),
          errors: [],
        })}
        autoRefresh={false}
      />,
    )
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
})
