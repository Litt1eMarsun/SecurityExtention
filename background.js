chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateScore") {
      chrome.storage.local.set({score: request.score});
    }
  });