import { getInsights } from './llama-api.js';

// Queue to handle concurrent updates to chrome.storage.local safely
const storageQueue = [];
let isProcessingQueue = false;

function enqueueStorageAction(actionFn) {
  return new Promise((resolve, reject) => {
    storageQueue.push({ actionFn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessingQueue) return;
  if (storageQueue.length === 0) return;

  isProcessingQueue = true;
  const { actionFn, resolve, reject } = storageQueue.shift();

  try {
    const result = await actionFn();
    resolve(result);
  } catch (err) {
    console.error("Queue process error:", err);
    reject(err);
  } finally {
    isProcessingQueue = false;
    processQueue();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_PAGE") {
    const pageData = message.data;

    enqueueStorageAction(async () => {
      const result = await chrome.storage.local.get({ history: [] });
      const history = result.history;

      // Check if already exists to prevent duplicate entries
      const exists = history.some(h => h.id === pageData.id);
      if (!exists) {
        history.push(pageData);
        await chrome.storage.local.set({ history });
        console.log("Saved page: ", pageData.title);
        
        // Start background LLM summarization asynchronously
        triggerBackgroundInsight(pageData.id, pageData.content || pageData.title);
      }
    });
  } else if (message.type === "UPDATE_TIME") {
    const { id, timeSpent } = message.data;

    enqueueStorageAction(async () => {
      const result = await chrome.storage.local.get({ history: [] });
      const history = result.history;
      const index = history.findIndex(h => h.id === id);
      if (index !== -1) {
        // Only update if the new time is larger
        if (timeSpent > history[index].timeSpent) {
          history[index].timeSpent = timeSpent;
          await chrome.storage.local.set({ history });
        }
      }
    });
  }
  
  // Return true to indicate we will send a response asynchronously if needed
  return true;
});

async function triggerBackgroundInsight(id, textContent) {
  try {
    const insight = await getInsights(textContent);
    
    await enqueueStorageAction(async () => {
      const result = await chrome.storage.local.get({ history: [] });
      const history = result.history;
      const index = history.findIndex(h => h.id === id);
      if (index !== -1) {
        history[index].insight = insight;
        await chrome.storage.local.set({ history });
        console.log("Updated insight for: ", history[index].title);
      }
    });
  } catch (err) {
    console.error("Error generating background insight:", err);
  }
}
