#!/usr/bin/env node
import process from "node:process";

import { auditCookieBridge } from "./audit-cookie-bridge-lib.js";

try {
  const report = await auditCookieBridge();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
