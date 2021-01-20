// Background scripts for the Ancestry extension
// This script is responsible for collection and collating data.
// The UI is responsible for displaying it.
chrome.runtime.onMessage.addListener(function(message, callback) {
    if (message.data == "setMatchList") {
      chrome.alarms.create({delayInMinutes: 5})
    } else if (message.data == "addSharedMatches") {
      chrome.tabs.executeScript({file: 'logic.js'});
    } else if (message.data == "clearSharedMatches") {
      chrome.tabs.executeScript(
          {code: 'document.body.style.backgroundColor="orange"'});
    };

    return true;
  });
  