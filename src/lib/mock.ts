import { buildRows, type ServerSessions, type SessionRow } from "./sessions.js"

const MOCK_NOW = Date.UTC(2026, 9, 2, 12, 0, 0)

const minutesAgo = (minutes: number) => MOCK_NOW - minutes * 60_000

const mockResults: ServerSessions[] = [
  {
    server: {
      port: 54021,
      url: "http://127.0.0.1:54021",
      kind: "headless",
      directory: "/work/acme-api",
      pid: 41001,
    },
    sessions: [
      {
        id: "ses_mock_one",
        title: "Add retry to the payments client",
        directory: "/work/acme-api",
        time: { created: minutesAgo(30), updated: minutesAgo(1) },
      },
    ],
    statuses: { ses_mock_one: { type: "busy" } },
  },
  {
    server: { port: 4096, url: "http://127.0.0.1:4096", kind: "window" },
    sessions: [
      {
        id: "ses_mock_two",
        title: "Review the checkout flow",
        directory: "/work/acme-shop",
        time: { created: minutesAgo(900), updated: minutesAgo(180) },
      },
      {
        id: "ses_mock_three",
        title: "Tidy the release notes",
        directory: "/work/acme-docs",
        time: { created: minutesAgo(9000), updated: minutesAgo(5760) },
      },
    ],
    statuses: {},
  },
]

export const mockRows = (): SessionRow[] => buildRows(mockResults, MOCK_NOW)
