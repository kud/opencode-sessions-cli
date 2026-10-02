const FRAME_AND_FOOTER = 8
const MIN_VISIBLE = 3

export const visibleCapacity = (terminalRows: number, errorCount: number) =>
  Math.max(
    MIN_VISIBLE,
    terminalRows - FRAME_AND_FOOTER - (errorCount > 0 ? errorCount + 1 : 0),
  )

export const viewportStart = (
  cursor: number,
  total: number,
  capacity: number,
) => {
  if (total <= capacity) return 0
  const centred = cursor - Math.floor(capacity / 2)
  return Math.min(total - capacity, Math.max(0, centred))
}
