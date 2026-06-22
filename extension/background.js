import { getSupportedHttpUrl, getUnsupportedUrlMessage } from "./url-policy.js";

const HOST_NAME = "com.forest.edge_to_atlas";
const OPEN_URL_MESSAGE = "openUrl";
const BADGE_RESET_MS = 1500;

chrome.action.onClicked.addListener((tab) => {
  void openTabInAtlas(tab);
});

async function openTabInAtlas(tab) {
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

    showBadge("OK", "Opened in ChatGPT Atlas.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to open tab in ChatGPT Atlas:", message);
    showBadge("ERR", message);
  }
}

function sendOpenUrlMessage(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(
      HOST_NAME,
      { type: OPEN_URL_MESSAGE, url },
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
