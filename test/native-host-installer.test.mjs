import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  HOST_NAME,
  buildNativeHostManifest,
  installNativeHost,
  parseInstallArgs,
  renderRunner,
} from "../scripts/install-native-host-lib.js";

const EXTENSION_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("parseInstallArgs accepts flag and positional extension IDs", () => {
  assert.deepEqual(parseInstallArgs(["--extension-id", EXTENSION_ID]), {
    extensionId: EXTENSION_ID,
    dryRun: false,
  });
  assert.deepEqual(parseInstallArgs([EXTENSION_ID, "--dry-run"]), {
    extensionId: EXTENSION_ID,
    dryRun: true,
  });
});

test("parseInstallArgs rejects invalid extension IDs", () => {
  assert.throws(() => parseInstallArgs(["not-an-id"]), /32-character/);
});

test("buildNativeHostManifest renders Edge native messaging metadata", () => {
  assert.deepEqual(
    buildNativeHostManifest({
      extensionId: EXTENSION_ID,
      runnerPath: "/Users/test/Library/Application Support/edge-to-atlas/edge-to-atlas-host",
    }),
    {
      name: HOST_NAME,
      description: "Open the current Microsoft Edge tab in ChatGPT Atlas.",
      path: "/Users/test/Library/Application Support/edge-to-atlas/edge-to-atlas-host",
      type: "stdio",
      allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
    },
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

test("installNativeHost writes user-level Edge manifest and executable runner", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "edge-to-atlas-"));
  const home = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  const hostScriptPath = path.join(projectRoot, "native-host", "host.js");

  await mkdir(path.dirname(hostScriptPath), { recursive: true });
  await writeFile(hostScriptPath, "#!/usr/bin/env node\n", "utf8");

  const result = await installNativeHost({
    extensionId: EXTENSION_ID,
    home,
    projectRoot,
    nodePath: "/usr/local/bin/node",
  });

  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
  const runner = await readFile(result.runnerPath, "utf8");
  const runnerStat = await stat(result.runnerPath);

  assert.equal(manifest.name, HOST_NAME);
  assert.equal(manifest.path, result.runnerPath);
  assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${EXTENSION_ID}/`]);
  assert.equal(runner, `#!/bin/sh\nexec '/usr/local/bin/node' '${hostScriptPath}' "$@"\n`);
  assert.equal((runnerStat.mode & 0o111) !== 0, true);
});
