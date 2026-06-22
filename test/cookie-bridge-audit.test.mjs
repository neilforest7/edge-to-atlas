import assert from "node:assert/strict";
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  extractCookieColumns,
  findBrowserArtifacts,
  getDefaultBrowserRoots,
  summarizeCookieSchema,
} from "../scripts/audit-cookie-bridge-lib.js";

const COOKIE_SCHEMA = "CREATE TABLE cookies(creation_utc INTEGER NOT NULL,host_key TEXT NOT NULL,encrypted_value BLOB NOT NULL, browser_provenance INTEGER DEFAULT 0);\nCREATE UNIQUE INDEX cookies_unique_index ON cookies(host_key);";

test("getDefaultBrowserRoots points at Edge and Atlas support directories", () => {
  const roots = getDefaultBrowserRoots("/Users/example");

  assert.equal(
    roots.edge,
    "/Users/example/Library/Application Support/Microsoft Edge",
  );
  assert.equal(
    roots.atlas,
    "/Users/example/Library/Application Support/com.openai.atlas/browser-data/host",
  );
});

test("extractCookieColumns returns column names without row data", () => {
  assert.deepEqual(extractCookieColumns(COOKIE_SCHEMA), [
    "creation_utc",
    "host_key",
    "encrypted_value",
    "browser_provenance",
  ]);
});

test("summarizeCookieSchema reports encryption and Edge-only columns", () => {
  assert.deepEqual(summarizeCookieSchema(COOKIE_SCHEMA), {
    columns: ["creation_utc", "host_key", "encrypted_value", "browser_provenance"],
    hasEncryptedValue: true,
    hasEdgeLegacyColumns: true,
    hasUniqueIndex: true,
  });
});

test("findBrowserArtifacts discovers profile files without opening databases", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "edge-to-atlas-cookie-audit-"));
  const edgeDefault = path.join(root, "edge", "Default");
  const atlasUser = path.join(root, "atlas", "user-abc");

  await mkdir(edgeDefault, { recursive: true });
  await mkdir(atlasUser, { recursive: true });
  await writeFile(path.join(edgeDefault, "Cookies"), "", "utf8");
  await writeFile(path.join(edgeDefault, "Bookmarks"), "", "utf8");
  await writeFile(path.join(atlasUser, "History"), "", "utf8");

  assert.deepEqual(await findBrowserArtifacts({
    roots: {
      edge: path.join(root, "edge"),
      atlas: path.join(root, "atlas"),
    },
  }), [
    {
      browser: "edge",
      profile: "Default",
      root: path.join(root, "edge"),
      artifacts: {
        bookmarks: path.join(edgeDefault, "Bookmarks"),
        cookies: path.join(edgeDefault, "Cookies"),
      },
    },
    {
      browser: "atlas",
      profile: "user-abc",
      root: path.join(root, "atlas"),
      artifacts: {
        history: path.join(atlasUser, "History"),
      },
    },
  ]);
});
