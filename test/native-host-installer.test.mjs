import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ATLAS_NATIVE_HOST_RELATIVE_DIR,
  EDGE_NATIVE_HOST_RELATIVE_DIR,
  HOST_NAME,
  buildNativeHostManifest,
  extensionIdFromPublicKey,
  getInstallPaths,
  installNativeHost,
  parseInstallArgs,
  readExtensionIdFromManifest,
  renderRunner,
} from "../scripts/install-native-host-lib.js";

const EXTENSION_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MANIFEST_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt7kTpbYTPjgZi7Tq5Arlp0hY4mlVxrFrNIuwELXZdNEoZWcPcXoKdld2h4/bASVRUrDo/2dEgVTV8D5219a3RQwCD6vbZq2z84p8UwG/u+hNemy9LMjyEhjNisr5yz3Cp83wBIK1ZcbzCxW/E1e2tbxehu05MzrC2VJAVHKZRxpd0/mwqRWkk7X6FYlBfnJTz4YRFze1wpFsP+K2XsP/0qUvsH6j+r2LGXc93hwx9hEtDb9umA915V4alJDOt6Ri5Lwe2kQNErs53vEPJkhMoz95WAk2F13+K3ONnv3OfDsAu82TVr+QirKxeT7BqW9leIrVYOL6Yl/2dmX4bRGbYQIDAQAB";
const MANIFEST_EXTENSION_ID = "pocicjaeampgbnhkkkhdmnnehdgjfmgk";

test("parseInstallArgs accepts optional, flag, and positional extension IDs", () => {
  assert.deepEqual(parseInstallArgs([]), {
    extensionId: undefined,
    dryRun: false,
  });
  assert.deepEqual(parseInstallArgs(["--extension-id", EXTENSION_ID]), {
    extensionId: EXTENSION_ID,
    dryRun: false,
  });
  assert.deepEqual(parseInstallArgs([EXTENSION_ID, "--dry-run"]), {
    extensionId: EXTENSION_ID,
    dryRun: true,
  });
});

test("buildNativeHostManifest rejects invalid extension IDs", () => {
  assert.throws(() => buildNativeHostManifest({
    extensionId: "not-an-id",
    runnerPath: "/tmp/runner",
  }), /32-character/);
});

test("buildNativeHostManifest renders native messaging metadata", () => {
  assert.deepEqual(
    buildNativeHostManifest({
      extensionId: EXTENSION_ID,
      runnerPath: "/Users/test/Library/Application Support/edge-to-atlas/edge-to-atlas-host",
    }),
    {
      name: HOST_NAME,
      description: "Open the current browser tab in the paired browser.",
      path: "/Users/test/Library/Application Support/edge-to-atlas/edge-to-atlas-host",
      type: "stdio",
      allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
    },
  );
});

test("getInstallPaths defaults to the repository root and both browser manifest dirs", () => {
  const paths = getInstallPaths({ home: "/Users/example" });

  assert.equal(
    paths.hostScriptPath,
    fileURLToPath(new URL("../native-host/host.js", import.meta.url)),
  );
  assert.equal(paths.edgeManifestPath, path.join(
    "/Users/example",
    EDGE_NATIVE_HOST_RELATIVE_DIR,
    `${HOST_NAME}.json`,
  ));
  assert.equal(paths.atlasManifestPath, path.join(
    "/Users/example",
    ATLAS_NATIVE_HOST_RELATIVE_DIR,
    `${HOST_NAME}.json`,
  ));
});

test("extensionIdFromPublicKey matches the checked-in manifest key", () => {
  assert.equal(extensionIdFromPublicKey(MANIFEST_PUBLIC_KEY), MANIFEST_EXTENSION_ID);
});

test("readExtensionIdFromManifest reads the checked-in development extension ID", async () => {
  assert.equal(
    await readExtensionIdFromManifest(fileURLToPath(new URL("../extension/manifest.json", import.meta.url))),
    MANIFEST_EXTENSION_ID,
  );
});

test("renderRunner shell-quotes Node and host paths", () => {
  assert.equal(
    renderRunner({
      nodePath: "/opt/node's/bin/node",
      hostScriptPath: "/tmp/edge to atlas/native-host/host.js",
    }),
    "#!/bin/sh\nexec '/opt/node'\\''s/bin/node' '/tmp/edge to atlas/native-host/host.js' \"$@\"\n",
  );
});

test("installNativeHost writes Edge and Atlas manifests with one executable runner", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "edge-to-atlas-"));
  const home = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  const hostScriptPath = path.join(projectRoot, "native-host", "host.js");
  const extensionManifestPath = path.join(projectRoot, "extension", "manifest.json");

  await mkdir(path.dirname(hostScriptPath), { recursive: true });
  await writeFile(hostScriptPath, "#!/usr/bin/env node\n", "utf8");
  await mkdir(path.dirname(extensionManifestPath), { recursive: true });
  await writeFile(extensionManifestPath, JSON.stringify({ key: MANIFEST_PUBLIC_KEY }), "utf8");

  const result = await installNativeHost({
    home,
    projectRoot,
    nodePath: "/usr/local/bin/node",
  });

  const edgeManifest = JSON.parse(await readFile(result.edgeManifestPath, "utf8"));
  const atlasManifest = JSON.parse(await readFile(result.atlasManifestPath, "utf8"));
  const runner = await readFile(result.runnerPath, "utf8");
  const runnerStat = await stat(result.runnerPath);

  assert.equal(edgeManifest.name, HOST_NAME);
  assert.equal(edgeManifest.path, result.runnerPath);
  assert.deepEqual(edgeManifest.allowed_origins, [`chrome-extension://${MANIFEST_EXTENSION_ID}/`]);
  assert.equal(atlasManifest.name, HOST_NAME);
  assert.equal(atlasManifest.path, result.runnerPath);
  assert.deepEqual(atlasManifest.allowed_origins, [`chrome-extension://${MANIFEST_EXTENSION_ID}/`]);
  assert.equal(runner, `#!/bin/sh\nexec '/usr/local/bin/node' '${hostScriptPath}' "$@"\n`);
  assert.equal((runnerStat.mode & 0o111) !== 0, true);
});
