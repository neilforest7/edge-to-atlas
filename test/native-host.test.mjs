import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";

import { handleNativeMessage, runNativeHost } from "../native-host/host.js";
import { decodeNativeMessage, encodeNativeMessage } from "../native-host/protocol.js";

test("handleNativeMessage opens supported URLs", async () => {
  const opened = [];
  const response = await handleNativeMessage(
    { type: "openUrl", url: "https://example.com/path" },
    { openUrl: async (url) => opened.push(url) },
  );

  assert.deepEqual(opened, ["https://example.com/path"]);
  assert.deepEqual(response, { ok: true, url: "https://example.com/path" });
});

test("handleNativeMessage rejects unsupported URLs before opening", async () => {
  const opened = [];
  const response = await handleNativeMessage(
    { type: "openUrl", url: "edge://settings" },
    { openUrl: async (url) => opened.push(url) },
  );

  assert.deepEqual(opened, []);
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "unsupported_url");
});

test("runNativeHost writes one encoded response", async () => {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const outputChunks = [];

  stdout.on("data", (chunk) => outputChunks.push(Buffer.from(chunk)));
  stdin.end(encodeNativeMessage({ type: "openUrl", url: "https://example.com/" }));

  await runNativeHost({
    stdin,
    stdout,
    stderr,
    openUrl: async () => {},
  });

  assert.deepEqual(decodeNativeMessage(Buffer.concat(outputChunks)), {
    ok: true,
    url: "https://example.com/",
  });
});

test("runNativeHost responds after one complete frame without waiting for stdin end", async () => {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const output = new Promise((resolve) => {
    stdout.once("data", (chunk) => resolve(Buffer.from(chunk)));
  });
  const runPromise = runNativeHost({
    stdin,
    stdout,
    stderr,
    openUrl: async () => {},
  });

  stdin.write(encodeNativeMessage({ type: "openUrl", url: "https://example.com/" }));

  assert.deepEqual(decodeNativeMessage(await output), {
    ok: true,
    url: "https://example.com/",
  });

  await runPromise;
  stdin.destroy();
});
