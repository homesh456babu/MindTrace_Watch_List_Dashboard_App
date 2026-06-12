let startTime = Date.now();

function safeSendMessage(message) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (e) {
      console.warn(" Message failed:", e);
    }
  } else {
    console.warn("chrome.runtime not available");
  }
}

window.addEventListener("beforeunload", () => {
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  const isYouTube = window.location.hostname.includes("youtube.com");
  const title = document.title;
  const url = window.location.href;

  safeSendMessage({
    type: "SAVE_PAGE",
    data: {
      title,
      url,
      timeSpent,
      timestamp: new Date().toISOString(),
      content: title,
      isVideo: isYouTube
    }
  },100);
});
