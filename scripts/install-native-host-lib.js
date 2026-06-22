import { createHash } from "node:crypto";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const HOST_NAME = "com.forest.edge_to_atlas";
export const EDGE_NATIVE_HOST_RELATIVE_DIR = path.join(
  "Library",
  "Application Support",
  "Microsoft Edge",
  "NativeMessagingHosts",
);
export const SUPPORT_RELATIVE_DIR = path.join("Library", "Application Support", "edge-to-atlas");

const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;
const DEFAULT_PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseInstallArgs(argv) {
  let extensionId;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--extension-id") {
      extensionId = argv[index + 1];
      index += 1;
      continue;
    }

    if (!arg.startsWith("-") && !extensionId) {
      extensionId = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { extensionId, dryRun };
}

export function validateExtensionId(extensionId) {
  if (!EXTENSION_ID_PATTERN.test(extensionId ?? "")) {
    throw new Error("Expected a 32-character Edge extension ID using letters a-p.");
  }
}

export function getInstallPaths(options = {}) {
  const home = options.home ?? homedir();
  const projectRoot = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const runnerPath = path.join(home, SUPPORT_RELATIVE_DIR, "edge-to-atlas-host");

  return {
    extensionManifestPath: path.join(projectRoot, "extension", "manifest.json"),
    hostScriptPath: path.join(projectRoot, "native-host", "host.js"),
    manifestPath: path.join(home, EDGE_NATIVE_HOST_RELATIVE_DIR, `${HOST_NAME}.json`),
    runnerPath,
  };
}

export async function readExtensionIdFromManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  if (typeof manifest.key !== "string" || manifest.key.length === 0) {
    throw new Error("extension/manifest.json must include a key or --extension-id must be provided.");
  }

  return extensionIdFromPublicKey(manifest.key);
}

export function extensionIdFromPublicKey(publicKeyBase64) {
  const publicKey = Buffer.from(publicKeyBase64, "base64");
  const digest = createHash("sha256").update(publicKey).digest().subarray(0, 16);

  return [...digest.toString("hex")]
    .map((char) => String.fromCharCode("a".charCodeAt(0) + Number.parseInt(char, 16)))
    .join("");
}

export function buildNativeHostManifest({ extensionId, runnerPath }) {
  validateExtensionId(extensionId);

  return {
    name: HOST_NAME,
    description: "Open the current Microsoft Edge tab in ChatGPT Atlas.",
    path: runnerPath,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
}

export function renderRunner({ nodePath, hostScriptPath }) {
  return `#!/bin/sh\nexec ${shellQuote(nodePath)} ${shellQuote(hostScriptPath)} "$@"\n`;
}

export async function installNativeHost(options) {
  const paths = getInstallPaths(options);
  const extensionId = options.extensionId ?? await readExtensionIdFromManifest(paths.extensionManifestPath);

  validateExtensionId(extensionId);

  const nodePath = options.nodePath ?? process.execPath;
  const manifest = buildNativeHostManifest({
    extensionId,
    runnerPath: paths.runnerPath,
  });
  const runner = renderRunner({
    nodePath,
    hostScriptPath: paths.hostScriptPath,
  });

  await access(paths.hostScriptPath);

  if (!options.dryRun) {
    await mkdir(path.dirname(paths.runnerPath), { recursive: true });
    await writeFile(paths.runnerPath, runner, "utf8");
    await chmod(paths.runnerPath, 0o755);
    await mkdir(path.dirname(paths.manifestPath), { recursive: true });
    await writeFile(paths.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return {
    ...paths,
    manifest,
    nodePath,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
