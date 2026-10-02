import React, { useCallback, useEffect, useRef, useState } from "react"
import { Box, useApp, useInput } from "ink"
import { spawnSync } from "node:child_process"
import {
  Page,
  StatusMessage,
  useAppKeys,
  useListCursor,
  type Hint,
  type PageStatus,
  type StatusVariant,
} from "@kud/ink-ui"
import { SessionList } from "./components/session-list.js"
import { loadSnapshot, type SessionRow, type Snapshot } from "./lib/sessions.js"
import { stopInstance, targetFromRow } from "./lib/stop.js"

const REFRESH_INTERVAL_MS = 3000

type Notice = { variant: StatusVariant; text: string }

type AppProps = {
  load?: () => Promise<Snapshot>
  autoRefresh?: boolean
}

export const App = ({ load = loadSnapshot, autoRefresh = true }: AppProps) => {
  const { suspendTerminal } = useApp()
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>()
  const [refreshing, setRefreshing] = useState(false)
  const [confirming, setConfirming] = useState<SessionRow | undefined>()
  const [notice, setNotice] = useState<Notice | undefined>()
  const paused = useRef(false)

  const rows = snapshot?.rows ?? []
  const { cursor, setCursor } = useListCursor(rows.length, {
    isActive: !confirming,
  })
  const selected = rows[Math.min(cursor, rows.length - 1)]

  const refresh = useCallback(async () => {
    if (paused.current) return
    setRefreshing(true)
    try {
      setSnapshot(await load())
    } catch (error) {
      setNotice({
        variant: "error",
        text: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useEffect(() => {
    void refresh()
    if (!autoRefresh) return
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh, autoRefresh])

  useEffect(() => {
    if (cursor > 0 && cursor >= rows.length) setCursor(rows.length - 1)
  }, [rows.length, cursor, setCursor])

  const attach = async (row: SessionRow) => {
    paused.current = true
    await suspendTerminal(async () => {
      const sessionArgs = row.id ? ["--session", row.id] : []
      spawnSync("opencode", ["attach", row.url, ...sessionArgs], {
        stdio: "inherit",
      })
    })
    paused.current = false
    await refresh()
  }

  const stop = async (row: SessionRow) => {
    const target = targetFromRow(row)
    if (!target) return
    paused.current = true
    setNotice({ variant: "info", text: `Stopping :${row.port}…` })
    const result = await stopInstance(target)
    paused.current = false
    setNotice(
      result.ok
        ? { variant: "success", text: `Stopped :${row.port}` }
        : { variant: "error", text: `:${row.port}: ${result.reason}` },
    )
    await refresh()
  }

  const requestStop = (row: SessionRow) => {
    if (row.kind !== "headless") {
      setNotice({ variant: "warning", text: "Windows can't be stopped here" })
      return
    }
    setNotice(undefined)
    setConfirming(row)
  }

  useAppKeys({
    isActive: !confirming,
  })

  useInput(
    (input, key) => {
      if (key.return && selected) void attach(selected)
      if (input === "x" && selected) requestStop(selected)
      if (input === "r") void refresh()
    },
    { isActive: !confirming },
  )

  useInput(
    (input) => {
      const row = confirming
      setConfirming(undefined)
      if (row && input.toLowerCase() === "y") void stop(row)
    },
    { isActive: confirming !== undefined },
  )

  const status: PageStatus | undefined = refreshing
    ? { text: "↻ refreshing…", tone: "busy" }
    : undefined

  const hints: Hint[] = [
    ["↑↓", "move"],
    ["↵", "attach"],
    ...(selected?.kind === "headless" ? [["x", "stop"] as Hint] : []),
    ["r", "refresh"],
  ]

  return (
    <Page
      fill
      title="opencode"
      icon="◆"
      count={snapshot ? rows.length : undefined}
      noun="session"
      status={status}
      counter={
        selected ? `${Math.min(cursor, rows.length - 1) + 1} of ${rows.length}` : undefined
      }
      hints={hints}
      help={false}
    >
      <Box flexDirection="column" flexGrow={1}>
        <SessionList
          rows={rows}
          cursor={cursor}
          loaded={snapshot !== undefined}
          errors={snapshot?.errors ?? []}
        />
        {confirming ? (
          <Box paddingLeft={4}>
            <StatusMessage variant="warning">
              {`Stop :${confirming.port} (${confirming.repo})? Press y to confirm, any other key cancels.`}
            </StatusMessage>
          </Box>
        ) : notice ? (
          <Box paddingLeft={4}>
            <StatusMessage variant={notice.variant}>{notice.text}</StatusMessage>
          </Box>
        ) : null}
      </Box>
    </Page>
  )
}
