import { execFile } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ARTIFACT_FILES = {
  bookmarks: "Bookmarks",
  cookies: "Cookies",
  history: "History",
  loginData: "Login Data",
};

export function getDefaultBrowserRoots(home = homedir()) {
  return {
    atlas: path.join(home, "Library", "Application Support", "com.openai.atlas", "browser-data", "host"),
    edge: path.join(home, "Library", "Application Support", "Microsoft Edge"),
  };
}

export async function findBrowserArtifacts(options = {}) {
  const roots = options.roots ?? getDefaultBrowserRoots(options.home);
  const results = [];

  for (const [browser, root] of Object.entries(roots)) {
    for (const profile of await listProfileDirectories(root)) {
      const artifacts = await findProfileArtifacts(path.join(root, profile.name));

      if (Object.keys(artifacts).length > 0) {
        results.push({
          browser,
          profile: profile.name,
          root,
          artifacts,
        });
      }
    }
  }

  return results;
}

export async function auditCookieBridge(options = {}) {
  const sqlitePath = options.sqlitePath ?? "sqlite3";
  const profiles = await findBrowserArtifacts(options);

  return {
    generatedAt: new Date().toISOString(),
    readonly: true,
    profiles: await Promise.all(
      profiles.map(async (profile) => ({
        ...profile,
        cookieSchema: profile.artifacts.cookies
          ? await readCookieSchemaSummary(profile.artifacts.cookies, sqlitePath)
          : null,
      })),
    ),
  };
}

export async function readCookieSchemaSummary(cookieDbPath, sqlitePath = "sqlite3") {
  try {
    const { stdout } = await execFileAsync(sqlitePath, [
      "-readonly",
      cookieDbPath,
      ".schema cookies",
    ], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });

    return {
      ok: true,
      ...summarizeCookieSchema(stdout),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function summarizeCookieSchema(schema) {
  const columns = extractCookieColumns(schema);

  return {
    columns,
    hasEncryptedValue: columns.includes("encrypted_value"),
    hasEdgeLegacyColumns: columns.includes("is_edgelegacycookie") || columns.includes("browser_provenance"),
    hasUniqueIndex: /CREATE UNIQUE INDEX cookies_unique_index/i.test(schema),
  };
}

export function extractCookieColumns(schema) {
  const tableMatch = schema.match(/CREATE TABLE cookies\(([\s\S]*?)\);/i);

  if (!tableMatch) {
    return [];
  }

  return tableMatch[1]
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function listProfileDirectories(root) {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("."));
  } catch {
    return [];
  }
}

async function findProfileArtifacts(profilePath) {
  const artifacts = {};

  await Promise.all(
    Object.entries(ARTIFACT_FILES).map(async ([key, fileName]) => {
      const artifactPath = path.join(profilePath, fileName);

      try {
        await access(artifactPath);
        artifacts[key] = artifactPath;
      } catch {
        // Missing browser artifacts are expected across non-profile directories.
      }
    }),
  );

  return artifacts;
}
