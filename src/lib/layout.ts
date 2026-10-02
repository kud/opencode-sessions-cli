export const REPO_WIDTH = 18
export const STATE_WIDTH = 8
export const AGE_WIDTH = 5
export const KIND_WIDTH = 16
const GUTTER = 4
const FRAME = 4
const COLUMN_GAPS = 4

export const titleWidth = (columns: number) =>
  Math.max(
    12,
    columns -
      FRAME -
      GUTTER -
      REPO_WIDTH -
      STATE_WIDTH -
      AGE_WIDTH -
      KIND_WIDTH -
      COLUMN_GAPS,
  )

export const kindLabel = (kind: "headless" | "window", port: number) =>
  `${kind === "headless" ? "headless" : "window"} :${port}`
