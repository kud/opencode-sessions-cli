const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export const formatAge = (updatedAt: number, now = Date.now()) => {
  const elapsed = Math.max(0, now - updatedAt)
  if (elapsed < MINUTE) return "now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`
  if (elapsed < WEEK * 2) return `${Math.floor(elapsed / DAY)}d`
  return `${Math.floor(elapsed / WEEK)}w`
}

export const basename = (path: string) => {
  const trimmed = path.replace(/\/+$/, "")
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed || "?"
}
