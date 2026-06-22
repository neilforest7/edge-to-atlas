import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

export const HOST_NAME = "com.forest.edge_to_atlas";
export const EDGE_NATIVE_HOST_RELATIVE_DIR = path.join(
  "Library",
  "Application Support",
  "Microsoft Edge",
  "NativeMessagingHosts",
);
export const SUPPORT_RELATIVE_DIR = path.join("Library", "Application Support", "edge-to-atlas");

const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

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

  validateExtensionId(extensionId);
  return { extensionId, dryRun };
}

export function validateExtensionId(extensionId) {
  if (!EXTENSION_ID_PATTERN.test(extensionId ?? "")) {
    throw new Error("Expected a 32-character Edge extension ID using letters a-p.");
  }
}

export function getInstallPaths(options = {}) {
  const home = options.home ?? homedir();
  const projectRoot = options.projectRoot ?? process.cwd();
  const runnerPath = path.join(home, SUPPORT_RELATIVE_DIR, "edge-to-atlas-host");

  return {
    hostScriptPath: path.join(projectRoot, "native-host", "host.js"),
    manifestPath: path.join(home, EDGE_NATIVE_HOST_RELATIVE_DIR, `${HOST_NAME}.json`),
    runnerPath,
  };
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
  validateExtensionId(options.extensionId);

  const paths = getInstallPaths(options);
  const nodePath = options.nodePath ?? process.execPath;
  const manifest = buildNativeHostManifest({
    extensionId: options.extensionId,
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
