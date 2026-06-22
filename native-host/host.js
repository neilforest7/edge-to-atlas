#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { openInAtlas } from "./atlas-opener.js";
import { encodeNativeMessage, decodeNativeMessage } from "./protocol.js";
import { normalizeSupportedUrl } from "./url-policy.js";

const OPEN_URL_MESSAGE = "openUrl";

export async function handleNativeMessage(message, options = {}) {
  const openUrl = options.openUrl ?? openInAtlas;

  if (!message || message.type !== OPEN_URL_MESSAGE) {
    return errorResponse("invalid_message", "Expected an openUrl message.");
  }

  const url = normalizeSupportedUrl(message.url);

  if (!url) {
    return errorResponse("unsupported_url", "Only http and https URLs can be opened in ChatGPT Atlas.");
  }

  try {
    await openUrl(url);
    return { ok: true, url };
  } catch (error) {
    return errorResponse("open_failed", error instanceof Error ? error.message : String(error));
  }
}

export async function runNativeHost(options = {}) {
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const openUrl = options.openUrl;

  let response;

  try {
    const input = await readStream(stdin);
    response = await handleNativeMessage(decodeNativeMessage(input), { openUrl });
  } catch (error) {
    response = errorResponse(
      error?.code ?? "native_host_error",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    stderr.write(`${response.error.code}: ${response.error.message}\n`);
  }

  stdout.write(encodeNativeMessage(response));
}

function errorResponse(code, message) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runNativeHost().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
