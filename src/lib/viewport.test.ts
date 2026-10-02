import { describe, expect, it } from "vitest"
import { viewportStart, visibleCapacity } from "./viewport.js"

describe("viewportStart", () => {
  it("starts at zero when everything fits", () => {
    expect(viewportStart(3, 5, 10)).toBe(0)
  })

  it("keeps the cursor inside the window at both ends", () => {
    expect(viewportStart(0, 40, 10)).toBe(0)
    expect(viewportStart(39, 40, 10)).toBe(30)
    expect(viewportStart(20, 40, 10)).toBe(15)
  })
})

describe("visibleCapacity", () => {
  it("shrinks for inline errors and never drops below a floor", () => {
    expect(visibleCapacity(30, 0)).toBe(22)
    expect(visibleCapacity(30, 2)).toBe(19)
    expect(visibleCapacity(6, 0)).toBe(3)
  })
})
