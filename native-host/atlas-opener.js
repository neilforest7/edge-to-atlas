import { BROWSERS, OPEN_COMMAND, openInBrowser } from "./browser-opener.js";

export const ATLAS_BUNDLE_ID = BROWSERS.atlas.bundleId;
export { OPEN_COMMAND };

export function openInAtlas(url, options = {}) {
  return openInBrowser(url, "atlas", options);
}
