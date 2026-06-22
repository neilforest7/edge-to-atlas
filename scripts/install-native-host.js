#!/usr/bin/env node
import process from "node:process";

import { installNativeHost, parseInstallArgs } from "./install-native-host-lib.js";

const USAGE = `Usage:
  npm run install:native-host
  npm run install:native-host -- --extension-id <edge-extension-id>
  node scripts/install-native-host.js <edge-extension-id>
`;

try {
  const options = parseInstallArgs(process.argv.slice(2));
  const result = await installNativeHost(options);

  console.log(`Native host manifest: ${result.manifestPath}`);
  console.log(`Native host runner: ${result.runnerPath}`);
  console.log(`Allowed extension: ${result.manifest.allowed_origins[0]}`);
  if (options.dryRun) {
    console.log("Dry run only; no files were written.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exitCode = 1;
}
