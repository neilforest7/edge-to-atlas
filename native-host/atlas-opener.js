import { spawn } from "node:child_process";

export const ATLAS_BUNDLE_ID = "com.openai.atlas";
export const OPEN_COMMAND = "/usr/bin/open";

export function openInAtlas(url, options = {}) {
  const command = options.command ?? OPEN_COMMAND;
  const spawnImpl = options.spawnImpl ?? spawn;

  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, ["-b", ATLAS_BUNDLE_ID, url], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = stderr.trim();
      reject(new Error(details ? `open exited with code ${code}: ${details}` : `open exited with code ${code}`));
    });
  });
}
