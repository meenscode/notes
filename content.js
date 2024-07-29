const NEED_UI_DOWNLOAD = "NEED_UI_DOWNLOAD";
const DOWNLOADED = "DOWNLOADED";
const LINK_NOT_FOUND = "LINK_NOT_FOUND";
const DOWNLOAD_FAILED = "DOWNLOAD_FAILED";

const loadingdIconLink = chrome.runtime.getURL("assets/images/loading.png");
const downloadIconLink = chrome.runtime.getURL("assets/images/download.png");
const failedIconLink = chrome.runtime.getURL("assets/images/failed.png");

async function fetchVideoAndDownload(url, filename) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Referer': "https://www.douyin.com" 
    }
  });
  if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const sendDownloadMesssage = (targetDivDom, targetImageDom) => {
  let payload = null;
  if (targetDivDom) {
    const videoId = targetDivDom.getAttribute("data-e2e-vid");
    const videoLink = targetDivDom.querySelector("video")?.firstChild?.src;
    const fileName = targetDivDom.querySelector(
      '[data-e2e="video-desc"]'
    )?.innerText;

    payload = {
      action: "direct_download",
      videoId,
      videoLink,
      fileName: `${fileName}.mp4`,
    };
  } else {
    const videoInfo = document.querySelector('[data-e2e="detail-video-info"]');
    const fileName = videoInfo.innerText.split("\n")[0];
    const videoId = videoInfo.getAttribute("data-e2e-aweme-id");
    const videoLink = document.querySelector("video")?.firstChild?.src;
    payload = {
      action: "direct_download",
      videoId,
      videoLink,
      fileName: `${fileName}.mp4`,
    };
  }

  if (!payload.fileName) {
    return;
  }

  chrome.runtime.sendMessage(payload, async function (response) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
    } else {
      if (response.status === DOWNLOADED) {
        targetImageDom && (targetImageDom.src = downloadIconLink);
      } else if (response.status === NEED_UI_DOWNLOAD) { 
        await fetchVideoAndDownload(response.url, payload.fileName);
        targetImageDom && (targetImageDom.src = downloadIconLink);
      }else {
        targetImageDom && (targetImageDom.src = failedIconLink);
      }
    }
  });
};

const addDownloadDiv = () => {
  const targetDiv = Array.from(
    document.querySelectorAll('[data-e2e="feed-active-video"]')
  ).at(-1);

  if (!targetDiv) {
    return;
  }

  if (targetDiv?.querySelector(".addon-download")) {
    return;
  }

  const div = document.createElement("div");
  const image = document.createElement("img");
  image.src = downloadIconLink;
  image.style.width = "45px";
  image.style.height = "45px";
  image.className = "addon-download-image";
  div.className = "addon-download";
  div.appendChild(image);

  div.onclick = async () => {
    image.src = loadingdIconLink;
    sendDownloadMesssage(targetDiv, image);
  };

  const sideElement =
    targetDiv?.querySelector(
      ".immersive-player-switch-on-hide-interaction-area"
    ) || targetDiv?.querySelector("xg-controls")?.nextSibling?.firstChild;
  sideElement?.prepend(div);
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "delegate_download") {
    const targetDiv = Array.from(
      document.querySelectorAll('[data-e2e="feed-active-video"]')
    ).at(-1);
    sendDownloadMesssage(targetDiv);
  }
});

setInterval(addDownloadDiv, 1000);
