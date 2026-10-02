import React from "react"
import { Box, Text, useWindowSize } from "ink"
import {
  SelectableRow,
  SkeletonRows,
  StatusMessage,
  colors,
} from "@kud/ink-ui"
import type { RunState, SessionRow } from "../lib/sessions.js"
import { viewportStart, visibleCapacity } from "../lib/viewport.js"
import {
  AGE_WIDTH,
  KIND_WIDTH,
  REPO_WIDTH,
  STATE_WIDTH,
  kindLabel,
  titleWidth,
} from "../lib/layout.js"

const STATE_GLYPH: Record<RunState, string> = {
  busy: "●",
  retry: "↻",
  idle: "○",
}

const STATE_COLOR: Record<RunState, string | undefined> = {
  busy: colors.info,
  retry: colors.warning,
  idle: undefined,
}

type SessionListProps = {
  rows: SessionRow[]
  cursor: number
  loaded: boolean
  errors: string[]
}

const Cell = ({
  width,
  children,
  ...text
}: { width: number; children: string } & React.ComponentProps<typeof Text>) => (
  <Box width={width} flexShrink={0} marginRight={1}>
    <Text wrap="truncate-end" {...text}>
      {children}
    </Text>
  </Box>
)

const SessionRowView = ({
  row,
  active,
  columns,
}: {
  row: SessionRow
  active: boolean
  columns: number
}) => (
  <SelectableRow active={active}>
    <Cell width={REPO_WIDTH} bold={active}>
      {row.repo}
    </Cell>
    <Cell width={titleWidth(columns)} bold={active}>
      {row.title}
    </Cell>
    <Cell
      width={STATE_WIDTH}
      color={STATE_COLOR[row.state]}
      bold={row.state !== "idle"}
      dimColor={row.state === "idle"}
    >
      {`${STATE_GLYPH[row.state]} ${row.state}`}
    </Cell>
    <Cell width={AGE_WIDTH} dimColor>
      {row.age}
    </Cell>
    <Cell width={KIND_WIDTH} dimColor>
      {kindLabel(row.kind, row.port)}
    </Cell>
  </SelectableRow>
)

export const SessionList = ({
  rows,
  cursor,
  loaded,
  errors,
}: SessionListProps) => {
  const { columns, rows: terminalRows } = useWindowSize()
  const capacity = visibleCapacity(terminalRows, errors.length)
  const start = viewportStart(cursor, rows.length, capacity)

  return (
    <Box flexDirection="column" flexGrow={1}>
      {!loaded ? (
        <SkeletonRows
          rows={6}
          widths={[0.8, 0.6, 0.7, 0.5, 0.65, 0.55]}
          indent={4}
        />
      ) : rows.length === 0 ? (
        <Box paddingLeft={4}>
          <Text dimColor>
            No opencode servers found. Start one with `opencode` or ask an
            agent to, and it will turn up here.
          </Text>
        </Box>
      ) : (
        rows.slice(start, start + capacity).map((row, offset) => (
          <SessionRowView
            key={row.key}
            row={row}
            active={start + offset === cursor}
            columns={columns}
          />
        ))
      )}
      {errors.length > 0 ? (
        <Box flexDirection="column" marginTop={1} paddingLeft={4}>
          {errors.map((message) => (
            <StatusMessage key={message} variant="warning">
              {message}
            </StatusMessage>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
