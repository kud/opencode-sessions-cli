#!/usr/bin/env node
import { readFileSync } from "node:fs"
import React from "react"
import { render } from "ink"
import { App } from "./app.js"
import { HELP, SCREENS, parseArgs } from "./lib/args.js"
import { mockRows } from "./lib/mock.js"

const readVersion = () => {
  const manifest = new URL("../package.json", import.meta.url)
  return JSON.parse(readFileSync(manifest, "utf8")).version as string
}

const command = parseArgs(process.argv.slice(2))

if (command.kind === "help") {
  process.stdout.write(HELP)
} else if (command.kind === "version") {
  process.stdout.write(readVersion() + "\n")
} else if (command.kind === "screens") {
  process.stdout.write(SCREENS.join("\n") + "\n")
} else if (command.kind === "error") {
  process.stderr.write(`error: ${command.message}\nRun ocs --help for usage.\n`)
  process.exit(1)
} else {
  render(
    command.mock ? (
      <App
        load={async () => ({ rows: mockRows(), errors: [] })}
        autoRefresh={false}
      />
    ) : (
      <App />
    ),
  )
}
