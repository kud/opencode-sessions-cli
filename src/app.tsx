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
import { loadSnapshot, type SessionRow, type Snapshot, filterRows } from "./lib/sessions.js"
import { stopInstance, targetFromRow } from "./lib/stop.js"

const REFRESH_INTERVAL_MS = 3000

type Notice = { variant: StatusVariant; text: string }

type AppProps = {
  load?: () => Promise<Snapshot>
  autoRefresh?: boolean
  refreshIntervalMs?: number
  now?: () => number
}

export const App = ({ load = loadSnapshot, autoRefresh = true, refreshIntervalMs = REFRESH_INTERVAL_MS, now = Date.now }: AppProps) => {
  const { suspendTerminal } = useApp()
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>()
  const [snapshotTime, setSnapshotTime] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const [confirming, setConfirming] = useState<SessionRow | undefined>()
  const [notice, setNotice] = useState<Notice | undefined>()
  const [showAll, setShowAll] = useState(false)
  const paused = useRef(false)

  const allRows = snapshot?.rows ?? []
  const rows = filterRows(allRows, showAll, snapshotTime)
  const { cursor, setCursor } = useListCursor(rows.length, {
    isActive: !confirming,
  })
  const selected = rows[Math.min(cursor, rows.length - 1)]

  const refresh = useCallback(async (silent = false) => {
    if (paused.current) return
    if (!silent) setRefreshing(true)
    try {
      const snap = await load()
      setSnapshot(snap)
      setSnapshotTime(now())
    } catch (error) {
      setNotice({
        variant: "error",
        text: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setRefreshing(false)
    }
  }, [load, now])

  useEffect(() => {
    void refresh()
    if (!autoRefresh) return
    const timer = setInterval(() => void refresh(true), refreshIntervalMs)
    return () => clearInterval(timer)
  }, [refresh, autoRefresh, refreshIntervalMs])

  useEffect(() => {
    if (cursor > 0 && cursor >= rows.length) setCursor(rows.length - 1)
  }, [rows.length, cursor, setCursor])

  useEffect(() => {
    if (allRows.length > 0 && rows.length === 0) setCursor(0)
  }, [allRows.length, rows.length, setCursor])

  const attach = async (row: SessionRow) => {
    paused.current = true
    await suspendTerminal(async () => {
      const sessionArgs = row.id ? ["--session", row.id] : []
      spawnSync("opencode", ["attach", row.url, ...sessionArgs], {
        stdio: "inherit",
      })
    })
    paused.current = false
    await refresh(false)
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
    await refresh(false)
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
      if (input === "a") setShowAll((v) => !v)
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

  const isFiltered = allRows.length !== rows.length
  const count = snapshot ? rows.length : undefined
  const scope = isFiltered ? `${rows.length} of ${allRows.length} sessions` : undefined

  const hints: Hint[] = [
    ["↑↓", "move"],
    ["↵", "attach"],
    ...(selected?.kind === "headless" ? [["x", "stop"] as Hint] : []),
    ["r", "refresh"],
    ["a", showAll ? "recent" : "all"],
  ]

  return (
    <Page
      fill
      title="opencode"
      icon="◆"
      count={count}
      noun="session"
      scope={scope}
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
          allRowsCount={allRows.length}
          showAll={showAll}
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
