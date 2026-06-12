chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_PAGE") {
    chrome.storage.local.get({ history: [] }, (result) => {
      const history = result.history;
      history.push(message.data);  // Add new page visit
      chrome.storage.local.set({ history });  // Save back
    });
  }
});
