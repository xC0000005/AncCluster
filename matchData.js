// This is the match data script file.

function downloadFile(filename, data) {
    var blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}

// Assign the document listeners for the HTML elements.
document.addEventListener('DOMContentLoaded', function () {
    var downloadMatchListButton = document.getElementById('btnDownloadMatchList');
    downloadMatchListButton.addEventListener('click', function () {
        chrome.storage.local.get(['matchData'], function(data) {
            downloadFile("matchlist.csv", JSON.stringify(data.matchData));
        });
    });

    var refreshMatchListButton = document.getElementById('btnRefreshMatchList');
    refreshMatchListButton.addEventListener('click', function () {
        chrome.storage.local.get(['matchData'], function(data) {
            var nextGroup = 0;

            // Go through and add a group property.
            for (var propertyName in data.matchData.Matches) {
                if (data.matchData.Matches.hasOwnProperty(propertyName)) {
                    var singleMatch = data.matchData.Matches[propertyName];
                    singleMatch.Groups = [];
                }
            }

            // Now chew through and assign groups.
            for (var propertyName in data.matchData.Matches) {
                if (data.matchData.Matches.hasOwnProperty(propertyName)) {
                    var singleMatch = data.matchData.Matches[propertyName];
                    
                    // Assign a new group
                    if (singleMatch.Groups.length == 0) {
                        var groupId = nextGroup++;
                        singleMatch.Groups.push(groupId);
                        for (var propertyName in singleMatch.SharedMatches) {
                            if (singleMatch.SharedMatches.hasOwnProperty(propertyName)) {
                                data.matchData.Matches[propertyName].Groups.push(groupId);
                            }
                        }                                    
                    } 
                }
            }
            
            // Now that groups are assigned, let's go through and strip down the object
            // into groups.
            var groups = [];
            for (var i = 0; i < nextGroup; i++) {
                groups.push(new Object({ "ID": i, "Members": []}));
            }

            // Go through and add a group property.
            for (var propertyName in data.matchData.Matches) {
                if (data.matchData.Matches.hasOwnProperty(propertyName)) {
                    var singleMatch = data.matchData.Matches[propertyName];
                    for (var k = 0; k < singleMatch.Groups.length; k++) {
                        groups[singleMatch.Groups[k]].Members.push(singleMatch.Name);
                    }
                }
            }

            var textElement = document.getElementById("matchContent");
            textElement.innerHTML = JSON.stringify(groups, undefined, 2);
          });
        });
    }, false);