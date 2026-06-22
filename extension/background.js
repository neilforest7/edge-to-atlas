import { getSupportedHttpUrl, getUnsupportedUrlMessage } from "./url-policy.js";

const HOST_NAME = "com.forest.edge_to_atlas";
const OPEN_URL_MESSAGE = "openUrl";
const OPEN_TARGET = "auto";
const SOURCE_BROWSER = detectSourceBrowser(navigator.userAgent);
const BADGE_RESET_MS = 1500;

chrome.action.onClicked.addListener((tab) => {
  void openTabInPairedBrowser(tab);
});

async function openTabInPairedBrowser(tab) {
  const url = getSupportedHttpUrl(tab?.url);

  if (!url) {
    showBadge("ERR", getUnsupportedUrlMessage(tab?.url));
    return;
  }

  try {
    const response = await sendOpenUrlMessage(url);

    if (!response?.ok) {
      throw new Error(response?.error?.message ?? "Native host rejected the URL.");
    }

    showBadge("OK", "Opened in paired browser.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to open tab in paired browser:", message);
    showBadge("ERR", message);
  }
}

function sendOpenUrlMessage(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(
      HOST_NAME,
      { type: OPEN_URL_MESSAGE, source: SOURCE_BROWSER, target: OPEN_TARGET, url },
      (response) => {
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(response);
      },
    );
  });
}

function detectSourceBrowser(userAgent) {
  if (/\bEdg\//.test(userAgent)) {
    return "edge";
  }

  if (/\bAtlas\//.test(userAgent) || /\bChatGPT Atlas\b/.test(userAgent)) {
    return "atlas";
  }

  return null;
}

function showBadge(text, title) {
  chrome.action.setBadgeBackgroundColor({
    color: text === "OK" ? "#166534" : "#991b1b",
  });
  chrome.action.setBadgeText({ text });
  chrome.action.setTitle({ title });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, BADGE_RESET_MS);
}
