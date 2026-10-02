import { describe, expect, it } from "vitest"
import { basename, formatAge } from "./format.js"

const NOW = 1_000_000_000_000

describe("formatAge", () => {
  it.each([
    [30_000, "now"],
    [3 * 60_000, "3m"],
    [2 * 3_600_000, "2h"],
    [4 * 86_400_000, "4d"],
    [21 * 86_400_000, "3w"],
  ])("formats %i ms as %s", (elapsed, expected) => {
    expect(formatAge(NOW - elapsed, NOW)).toBe(expected)
  })

  it("never goes negative for a clock-skewed future time", () => {
    expect(formatAge(NOW + 5000, NOW)).toBe("now")
  })
})

describe("basename", () => {
  it("takes the last path segment", () => {
    expect(basename("/work/acme-api/")).toBe("acme-api")
    expect(basename("")).toBe("?")
  })
})
