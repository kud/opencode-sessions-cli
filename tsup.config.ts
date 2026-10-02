import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/cli.tsx"],
  format: ["esm"],
  clean: true,
  target: "node20",
})
