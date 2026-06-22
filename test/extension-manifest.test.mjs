import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("extension manifest keeps the MVP permission surface narrow", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Open in Paired Browser");
  assert.deepEqual(manifest.permissions, ["activeTab", "nativeMessaging"]);
  assert.equal(manifest.host_permissions, undefined);
});
