import { describe, expect, it } from "vitest"
import { parseArgs } from "./args.js"

describe("parseArgs", () => {
  it("runs the live session list with no arguments", () => {
    expect(parseArgs([])).toEqual({ kind: "run", mock: false })
  })

  it("runs on fixtures with --mock", () => {
    expect(parseArgs(["--mock"])).toEqual({ kind: "run", mock: true })
  })

  it("prints the version for --version and -v", () => {
    expect(parseArgs(["--version"])).toEqual({ kind: "version" })
    expect(parseArgs(["-v"])).toEqual({ kind: "version" })
  })

  it("prints help for --help and -h", () => {
    expect(parseArgs(["--help"])).toEqual({ kind: "help" })
    expect(parseArgs(["-h"])).toEqual({ kind: "help" })
  })

  it("lists screens and accepts a known one", () => {
    expect(parseArgs(["--screen", "list"])).toEqual({ kind: "screens" })
    expect(parseArgs(["--screen", "sessions"])).toEqual({
      kind: "run",
      mock: false,
    })
  })

  it("rejects unknown screens and options instead of opening the TUI", () => {
    expect(parseArgs(["--screen", "nope"])).toEqual({
      kind: "error",
      message: 'unknown screen "nope"',
    })
    expect(parseArgs(["--screen"]).kind).toBe("error")
    expect(parseArgs(["--verbose"])).toEqual({
      kind: "error",
      message: 'unknown option "--verbose"',
    })
  })
})
