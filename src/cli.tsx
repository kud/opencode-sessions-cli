#!/usr/bin/env node
import React from "react"
import { render } from "ink"
import { App } from "./app.js"
import { mockRows } from "./lib/mock.js"

const SCREENS = ["sessions"]

const flagValue = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const screen = flagValue("--screen")

if (screen === "list") {
  process.stdout.write(SCREENS.join("\n") + "\n")
} else if (screen !== undefined && !SCREENS.includes(screen)) {
  process.stderr.write(`error: unknown screen "${screen}"\n`)
  process.exit(1)
} else {
  const mock = process.argv.includes("--mock")
  render(
    mock ? (
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
      />
    ) : (
      <App />
    ),
  )
}
