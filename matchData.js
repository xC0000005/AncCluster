// This is the match data script file.

// Assign the document listeners for the HTML elements.
document.addEventListener('DOMContentLoaded', function () {
    var refreshMatchListButton = document.getElementById('btnRefreshMatchList');
    refreshMatchListButton.addEventListener('click', function () {
        chrome.storage.local.get(['matchData'], function(data) {
            var textElement = document.getElementById("matchContent");
            textElement.innerHTML = JSON.stringify(data.matchData);
          });
        });
    }, false);