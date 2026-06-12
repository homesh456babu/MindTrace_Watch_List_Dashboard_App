let accumulatedTime = 0;
let lastVisibleTime = Date.now();
let saved = false;
let currentUrl = window.location.href;
let pageId = Math.random().toString(36).substring(2, 9) + Date.now(); // Unique ID for this tab session
let isVideo = checkIfVideo(currentUrl);

function safeSendMessage(message) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (e) {
      // Suppress normal extension context invalidation warnings during developer reloads
    }
  }
}

function checkIfVideo(url) {
  const hostname = window.location.hostname;
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return url.includes("/watch") || url.includes("/shorts") || url.includes("/embed/");
  }
  return false;
}

function extractPageContent() {
  if (!document.body) return "";
  
  // Clone body to avoid mutating the live DOM
  const bodyClone = document.body.cloneNode(true);
  
  // Remove scripts, styles, navs, footers, headers
  const selectorsToRemove = ["script", "style", "nav", "footer", "header", "noscript", "iframe"];
  selectorsToRemove.forEach(selector => {
    bodyClone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Get text, replace multiple whitespace with a single space
  let text = bodyClone.innerText || bodyClone.textContent || "";
  text = text.replace(/\s+/g, " ").trim();
  
  // Truncate to 2000 characters
  return text.substring(0, 2000);
}

function isValidPage(url, title, content, isVideo) {
  // Exclude search engines
  const searchRegex = /(google\.com\/search|bing\.com\/search|yahoo\.com\/search|duckduckgo\.com)/i;
  if (searchRegex.test(url)) return false;
  
  // Exclude login/signup/auth pages
  const authRegex = /(login|signin|signup|register|logout|signout|auth|accounts\.google\.com)/i;
  if (authRegex.test(url)) return false;
  
  // Exclude YouTube non-video pages (homepage, feed, trending, subscriptions, etc.)
  const hostname = window.location.hostname;
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    if (!isVideo) return false;
  }
  
  // Exclude empty pages
  if (!title || title.trim() === "") return false;
  
  // If it's a video (like YouTube watch/shorts), we always allow it (it doesn't need text content)
  if (isVideo) return true;
  
  // For articles/reading, we require content to be > 100 characters
  if (content.length <= 100) return false;
  
  return true;
}

function getActiveTime() {
  let sessionTime = 0;
  if (document.visibilityState === "visible") {
    sessionTime = Math.floor((Date.now() - lastVisibleTime) / 1000);
  }
  return accumulatedTime + sessionTime;
}

function updateActiveTime() {
  const now = Date.now();
  if (document.visibilityState === "visible") {
    // If it became visible, reset the visible start time
    lastVisibleTime = now;
  } else {
    // If it became hidden, accumulate the visible duration
    accumulatedTime += Math.floor((now - lastVisibleTime) / 1000);
  }
}

function handleUrlChange() {
  const newUrl = window.location.href;
  if (newUrl !== currentUrl) {
    // Send final update for the previous URL if it was saved
    if (saved) {
      safeSendMessage({
        type: "UPDATE_TIME",
        data: {
          id: pageId,
          timeSpent: getActiveTime()
        }
      });
    }

    // Reset tracking state for new URL
    currentUrl = newUrl;
    pageId = Math.random().toString(36).substring(2, 9) + Date.now();
    isVideo = checkIfVideo(newUrl);
    saved = false;
    accumulatedTime = 0;
    lastVisibleTime = Date.now();
  }
}

// Monitor visibility state
document.addEventListener("visibilitychange", () => {
  updateActiveTime();
  checkAndSave();
});

// Check and save page
function checkAndSave() {
  // First check if the SPA URL changed
  handleUrlChange();
  
  const timeSpent = getActiveTime();
  
  if (timeSpent >= 4 && !saved) {
    const content = extractPageContent();
    const title = document.title;
    const url = window.location.href;

    if (isValidPage(url, title, content, isVideo)) {
      saved = true;
      safeSendMessage({
        type: "SAVE_PAGE",
        data: {
          id: pageId,
          title,
          url,
          timeSpent,
          timestamp: new Date().toISOString(),
          content: isVideo ? "YouTube Video: " + title : content,
          isVideo,
          insight: null // Mark that LLM needs to run
        }
      });
    }
  } else if (saved) {
    // If already saved, send updates of timeSpent
    safeSendMessage({
      type: "UPDATE_TIME",
      data: {
        id: pageId,
        timeSpent
      }
    });
  }
}

// Periodic check (every 2 seconds) to see if we reached the 4s threshold or to update timeSpent
const intervalId = setInterval(() => {
  checkAndSave();
}, 2000);

// Send final time update when page is closed or hidden
window.addEventListener("pagehide", () => {
  clearInterval(intervalId);
  updateActiveTime();
  if (saved) {
    safeSendMessage({
      type: "UPDATE_TIME",
      data: {
        id: pageId,
        timeSpent: getActiveTime()
      }
    });
  }
});
