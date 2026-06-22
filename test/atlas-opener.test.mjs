import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import {
  BROWSERS,
  OPEN_COMMAND,
  detectSourceBrowserFromCommand,
  normalizeBrowserTarget,
  openInBrowser,
} from "../native-host/browser-opener.js";
import { ATLAS_BUNDLE_ID, openInAtlas } from "../native-host/atlas-opener.js";

test("openInAtlas launches the Atlas bundle with the target URL", async () => {
  let invocation;

  await openInAtlas("https://example.com/", {
    spawnImpl(command, args, options) {
      invocation = { command, args, options };
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      setImmediate(() => child.emit("close", 0));
      return child;
    },
  });

  assert.deepEqual(invocation, {
    command: OPEN_COMMAND,
    args: ["-b", ATLAS_BUNDLE_ID, "https://example.com/"],
    options: { stdio: ["ignore", "ignore", "pipe"] },
  });
});

test("openInBrowser launches Microsoft Edge when requested", async () => {
  let invocation;

  await openInBrowser("https://example.com/", "edge", {
    spawnImpl(command, args, options) {
      invocation = { command, args, options };
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      setImmediate(() => child.emit("close", 0));
      return child;
    },
  });

  assert.deepEqual(invocation, {
    command: OPEN_COMMAND,
    args: ["-b", BROWSERS.edge.bundleId, "https://example.com/"],
    options: { stdio: ["ignore", "ignore", "pipe"] },
  });
});

test("normalizeBrowserTarget defaults to Atlas and rejects unknown targets", () => {
  assert.equal(normalizeBrowserTarget(undefined), "atlas");
  assert.equal(normalizeBrowserTarget(""), "atlas");
  assert.equal(normalizeBrowserTarget("auto"), "auto");
  assert.equal(normalizeBrowserTarget("edge"), "edge");
  assert.equal(normalizeBrowserTarget("safari"), null);
});

test("detectSourceBrowserFromCommand recognizes Edge and Atlas process names", () => {
  assert.equal(detectSourceBrowserFromCommand("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"), "edge");
  assert.equal(detectSourceBrowserFromCommand("/Applications/ChatGPT Atlas.app/Contents/MacOS/ChatGPT Atlas"), "atlas");
  assert.equal(detectSourceBrowserFromCommand("/Applications/Other.app/Contents/MacOS/Other"), null);
});

test("openInAtlas rejects when the open command fails", async () => {
  await assert.rejects(
    () => openInAtlas("https://example.com/", {
      spawnImpl() {
        const child = new EventEmitter();
        child.stderr = new EventEmitter();
        setImmediate(() => {
          child.stderr.emit("data", Buffer.from("missing app"));
          child.emit("close", 1);
        });
        return child;
      },
    }),
    /missing app/,
  );
});
