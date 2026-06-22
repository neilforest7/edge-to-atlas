import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { ATLAS_BUNDLE_ID, OPEN_COMMAND, openInAtlas } from "../native-host/atlas-opener.js";

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
