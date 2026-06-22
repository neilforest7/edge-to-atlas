const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

export function getSupportedHttpUrl(input) {
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

export function getUnsupportedUrlMessage(input) {
  if (typeof input !== "string" || input.length === 0) {
    return "No active tab URL was available.";
  }

  return "Only http and https pages can be opened in the paired browser.";
}
