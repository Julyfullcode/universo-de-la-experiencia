"use strict";

// Publish the self-contained browser module from the pinned official package.
const fs = require("node:fs");
const path = require("node:path");
const entry = require.resolve("botid/client/core");
const source = entry.replace(/\.js$/, ".mjs");
const assets = path.resolve(__dirname, "../assets");
fs.mkdirSync(assets, { recursive: true });
fs.copyFileSync(source, path.join(assets, "botid-client.mjs"));
