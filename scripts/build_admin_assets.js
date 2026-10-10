"use strict";

// Publish only frontend files, plus the pinned official BotID browser module.
const fs = require("node:fs");
const path = require("node:path");
const entry = require.resolve("botid/client/core");
const source = entry.replace(/\.js$/, ".mjs");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "public");
fs.mkdirSync(output, { recursive: true });
const files = ["index.html", "admin.html", "texture-credits.html", "admin.css", "admin.js", "app.js",
  "styles.css", "launch-station.css", "launch-station.js", "orbital-3d.js", "planet-materials.js", "universe-map.css"];
for (const name of files) fs.copyFileSync(path.join(root, name), path.join(output, name));
for (const folder of ["assets", "vendor"]) {
  fs.cpSync(path.join(root, folder), path.join(output, folder), { recursive: true,
    filter: filename => !/\.(?:md|txt)$/i.test(filename) && !filename.endsWith("botid-client.mjs") });
}
fs.copyFileSync(source, path.join(output, "assets/botid-client.mjs"));
