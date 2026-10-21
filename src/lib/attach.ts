import type { SessionRow } from "./sessions.js"

export type AttachCommand = {
  args: string[]
  env: Record<string, string>
}

export const attachCommand = (row: SessionRow): AttachCommand => ({
  args: [
    "--server",
    row.url,
    ...(row.id ? ["--session", row.id] : []),
    ...(row.directory ? [row.directory] : []),
  ],
  env: row.password === undefined ? {} : { OPENCODE_PASSWORD: row.password },
})
