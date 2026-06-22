const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

export function normalizeSupportedUrl(input) {
  if (typeof input !== "string" || input.length === 0) {
    return null;
  }

  try {
    const url = new URL(input);
    return SUPPORTED_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
