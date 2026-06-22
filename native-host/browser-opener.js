import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

export const OPEN_COMMAND = "/usr/bin/open";
const execFileAsync = promisify(execFile);

export const BROWSERS = {
  atlas: {
    bundleId: "com.openai.atlas",
    label: "ChatGPT Atlas",
  },
  edge: {
    bundleId: "com.microsoft.edgemac",
    label: "Microsoft Edge",
  },
};

export function normalizeBrowserTarget(input) {
  if (input === undefined || input === null || input === "") {
    return "atlas";
  }

  if (input === "auto") {
    return "auto";
  }

  return Object.hasOwn(BROWSERS, input) ? input : null;
}

export function normalizeSourceBrowser(input) {
  return Object.hasOwn(BROWSERS, input) ? input : null;
}

export function getPairedBrowserTarget(sourceBrowser) {
  if (sourceBrowser === "edge") {
    return "atlas";
  }

  if (sourceBrowser === "atlas") {
    return "edge";
  }

  return null;
}

export async function resolveBrowserTarget(messageTarget, messageSource, options = {}) {
  const target = normalizeBrowserTarget(messageTarget);

  if (target !== "auto") {
    return target;
  }

  const source = normalizeSourceBrowser(messageSource)
    ?? await (options.detectSourceBrowser ?? detectSourceBrowserFromParent)();

  return getPairedBrowserTarget(source);
}

export async function detectSourceBrowserFromParent(options = {}) {
  const ppid = options.ppid ?? process.ppid;
  const execFileImpl = options.execFileImpl ?? execFileAsync;

  try {
    const { stdout } = await execFileImpl("/bin/ps", ["-p", String(ppid), "-o", "command="], {
      timeout: 2000,
      maxBuffer: 1024 * 1024,
    });
    return detectSourceBrowserFromCommand(stdout);
  } catch {
    return null;
  }
}

export function detectSourceBrowserFromCommand(command) {
  if (/Microsoft Edge/.test(command)) {
    return "edge";
  }

  if (/ChatGPT Atlas|com\.openai\.atlas/i.test(command)) {
    return "atlas";
  }

  return null;
}

export function openInBrowser(url, target = "atlas", options = {}) {
  const browser = BROWSERS[target];

  if (!browser) {
    return Promise.reject(new Error(`Unsupported browser target: ${target}`));
  }

  const command = options.command ?? OPEN_COMMAND;
  const spawnImpl = options.spawnImpl ?? spawn;

  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, ["-b", browser.bundleId, url], {
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
