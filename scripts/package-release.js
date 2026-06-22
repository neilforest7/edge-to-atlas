#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const distDir = path.join(projectRoot, "dist");
const version = packageJson.version;

const extensionArchive = `edge-atlas-bridge-extension-v${version}.zip`;
const releaseArchive = `edge-to-atlas-release-v${version}.zip`;

const extensionFiles = [
  "background.js",
  "manifest.json",
  "url-policy.js",
];

const releasePaths = [
  ".gitignore",
  "README.md",
  "docs",
  "extension",
  "native-host",
  "package.json",
  "scripts",
];

await mkdir(distDir, { recursive: true });
await rm(path.join(distDir, extensionArchive), { force: true });
await rm(path.join(distDir, releaseArchive), { force: true });

await zip(extensionArchive, extensionFiles, path.join(projectRoot, "extension"));
await zip(releaseArchive, releasePaths, projectRoot);

console.log(`Created ${path.join("dist", extensionArchive)}`);
console.log(`Created ${path.join("dist", releaseArchive)}`);

async function zip(archiveName, entries, cwd) {
  await execFileAsync("/usr/bin/zip", [
    "-X",
    "-r",
    "-q",
    path.join(distDir, archiveName),
    ...entries,
  ], {
    cwd,
  });
}
