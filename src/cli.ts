#!/usr/bin/env node
// React picks its development or production build from NODE_ENV when it is
// first loaded, so set it before the app (and with it react and ink) is imported.
process.env.NODE_ENV ??= "production"

await import("./main.js")
