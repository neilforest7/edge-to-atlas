#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { openInBrowser, resolveBrowserTarget } from "./browser-opener.js";
import {
  MAX_MESSAGE_BYTES,
  NATIVE_MESSAGE_HEADER_BYTES,
  NativeMessageError,
  decodeNativeMessage,
  encodeNativeMessage,
} from "./protocol.js";
import { normalizeSupportedUrl } from "./url-policy.js";

const OPEN_URL_MESSAGE = "openUrl";

export async function handleNativeMessage(message, options = {}) {
  const openUrl = options.openUrl ?? openInBrowser;

  if (!message || message.type !== OPEN_URL_MESSAGE) {
    return errorResponse("invalid_message", "Expected an openUrl message.");
  }

  const url = normalizeSupportedUrl(message.url);
  const target = await resolveBrowserTarget(message.target, message.source, {
    detectSourceBrowser: options.detectSourceBrowser,
  });

  if (!url) {
    return errorResponse("unsupported_url", "Only http and https URLs can be opened.");
  }

  if (!target) {
    return errorResponse("unsupported_target", "Expected target to be atlas, edge, or auto.");
  }

  try {
    await openUrl(url, target);
    return { ok: true, target, url };
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
    const input = await readNativeMessageFrame(stdin);
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

function readNativeMessageFrame(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;
    let expectedLength = null;
    let settled = false;

    const settle = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      stream.off("data", onData);
      stream.off("error", onError);
      stream.off("end", onEnd);
      callback(value);
    };

    const currentBuffer = () => Buffer.concat(chunks, totalLength);

    const onData = (chunk) => {
      chunks.push(Buffer.from(chunk));
      totalLength += chunk.length;

      if (expectedLength === null && totalLength >= NATIVE_MESSAGE_HEADER_BYTES) {
        const bodyLength = currentBuffer().readUInt32LE(0);

        if (bodyLength > MAX_MESSAGE_BYTES) {
          settle(reject, new NativeMessageError(
            "message_too_large",
            "Native message exceeds the 1 MB host limit.",
          ));
          return;
        }

        expectedLength = NATIVE_MESSAGE_HEADER_BYTES + bodyLength;
      }

      if (expectedLength !== null && totalLength >= expectedLength) {
        settle(resolve, currentBuffer().subarray(0, expectedLength));
      }
    };

    const onError = (error) => {
      settle(reject, error);
    };

    const onEnd = () => {
      settle(reject, new NativeMessageError(
        totalLength < NATIVE_MESSAGE_HEADER_BYTES ? "incomplete_header" : "incomplete_body",
        "Native message ended before a complete frame was available.",
      ));
    };

    stream.on("data", onData);
    stream.on("error", onError);
    stream.on("end", onEnd);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runNativeHost().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
