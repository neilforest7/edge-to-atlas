import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSupportedHttpUrl,
  getUnsupportedUrlMessage,
} from "../extension/url-policy.js";

test("accepts http and https URLs", () => {
  assert.equal(getSupportedHttpUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(getSupportedHttpUrl("http://example.com"), "http://example.com/");
});

test("rejects non-web URLs", () => {
  assert.equal(getSupportedHttpUrl("edge://settings"), null);
  assert.equal(getSupportedHttpUrl("file:///tmp/example.html"), null);
  assert.equal(getSupportedHttpUrl(""), null);
});

test("describes unsupported URL failures", () => {
  assert.equal(getUnsupportedUrlMessage(""), "No active tab URL was available.");
  assert.equal(
    getUnsupportedUrlMessage("edge://settings"),
    "Only http and https pages can be opened in ChatGPT Atlas.",
  );
});
