import assert from "node:assert/strict";
import { test } from "node:test";

import {
  NativeMessageError,
  decodeNativeMessage,
  encodeNativeMessage,
} from "../native-host/protocol.js";

test("encodes and decodes a native messaging payload", () => {
  const payload = { type: "openUrl", url: "https://example.com/" };
  const encoded = encodeNativeMessage(payload);

  assert.equal(encoded.readUInt32LE(0), Buffer.byteLength(JSON.stringify(payload)));
  assert.deepEqual(decodeNativeMessage(encoded), payload);
});

test("rejects malformed native messages", () => {
  assert.throws(
    () => decodeNativeMessage(Buffer.from([1, 2, 3])),
    (error) => error instanceof NativeMessageError && error.code === "incomplete_header",
  );

  const invalidJson = Buffer.concat([Buffer.from([1, 0, 0, 0]), Buffer.from("{")]);
  assert.throws(
    () => decodeNativeMessage(invalidJson),
    (error) => error instanceof NativeMessageError && error.code === "invalid_json",
  );
});
