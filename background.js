const NEED_UI_DOWNLOAD = "NEED_UI_DOWNLOAD";
const DOWNLOADED = "DOWNLOADED";
const LINK_NOT_FOUND = "LINK_NOT_FOUND";
const DOWNLOAD_FAILED = "DOWNLOAD_FAILED";

const linkList = [];

async function canFetchVideo(url) {
  const response = await fetch(url, {
      method: 'GET'
  });
  return !!response.ok
}

async function downloadFile(url, filename) {
  const ableToDownload = await canFetchVideo(url);
  if (!ableToDownload) {
    return Promise.resolve({ status: NEED_UI_DOWNLOAD, url });
  }
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve({ status: DOWNLOADED });
      }
    });
  });
}

function sanitizeFilename(filename) {
  // Characters disallowed in Windows and Unix/Linux
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;

  // Replace invalid characters with an empty space
  let sanitized = filename.replace(invalidChars, "");

  // Further handling for Windows filenames
  // Trim spaces and periods at the end of the filename
  sanitized = sanitized.replace(/[\s.]+$/, "");

  return sanitized;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const link = details.url;
    if (
      (link.includes("douyinvod") || link.includes("zjcdn")) &&
      linkList.at(-1) !== link
    ) {
      if (linkList.length > 100) {
        linkList.shift();
      }
      linkList.push(link);
    }
  },
  { urls: ["https://*.douyinvod.com/*", "https://*.zjcdn.com/*"] }
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "direct_download") {
    const videoLink =
      request.videoLink ??
      linkList.find((link) => link.includes(request.videoId));
    
    if (!videoLink) { 
      sendResponse({ status: LINK_NOT_FOUND });
      return true;
    }

    const fileName = sanitizeFilename(request.fileName);

    downloadFile(videoLink, fileName)
      .then((response) => {
        sendResponse(response)
      })
      .catch((error) => {
        console.log("download error", error);
        sendResponse({ status: DOWNLOAD_FAILED });
      });

    // Return true to keep the message channel open
    return true;
  } else if (request.action === "delegate_download") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "delegate_download" });
    });
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tab.url && tab.url.includes("douyin.com")) {
    chrome.action.setPopup({ tabId: tabId, popup: "popup.html" });
  } else {
    chrome.action.setPopup({ tabId: tabId, popup: "" }); // No popup for other sites
  }
});
