// Global variable for processing, moved into storage for background
// page to display.
var sharedMatchMapping = new Object();

// Handy sleep function for making sure we don't overload Ancestry's servers.
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

// Process the list of match data
// Read the match data, then filter each based on 
// minimum and maximum cm matches
function processMatchListData(matchData, match_id, minCM, maxCM) {
    // We have a full match list.
    // Now, let's build a reduced list of matches with only the test ID and the display name, and
    // only containing tests that fall in the CM range.

    var minMatchPassed = false;
    for (var i = 0; i < matchData.matchGroups.length; i++) {
        var currentMatchGroup = matchData.matchGroups[i];
        console.log("Processing Match Group " + currentMatchGroup.name.key);
        var k;
        for (k = 0; k < currentMatchGroup.matches.length; k++) {
            var currentMatch = currentMatchGroup.matches[k];
            if (currentMatch.relationship.sharedCentimorgans > maxCM) {
                    console.log("Match " + currentMatch.publicDisplayName + " ignored for  too high CM range " + currentMatch.relationship.sharedCentimorgans);
                    continue;
                }

            if (currentMatch.relationship.sharedCentimorgans < minCM) {
                minMatchPassed = true;
                console.log("Match " + currentMatch.publicDisplayName + " ignored for  too low CM range " + currentMatch.relationship.sharedCentimorgans);
                break;
                }
                
                var matchingData = null;
                
                if (match_id == "") {
                    matchingData = new Object({ "Name": currentMatch.publicDisplayName, "TestId": currentMatch.testGuid, "CM": currentMatch.relationship.sharedCentimorgans, "SharedMatches": new Object()});
                }
                else {
                    matchingData = new Object({ "Name": currentMatch.publicDisplayName });                    
                }
                if (match_id == "") {
                    sharedMatchMapping.Matches[currentMatch.testGuid] = matchingData;
                }
                else {
                    sharedMatchMapping.Matches[match_id].SharedMatches[currentMatch.testGuid] = matchingData;
                }
        }

        if (minMatchPassed) {
            break;
        }
    }

    // If there's more data and we haven't passed the min match, retrieve more.
    return (matchData.bookmarkData.moreMatchesAvailable && (minMatchPassed == false));
}

// Retrieves a single page of match data.
// and recursively calls to get more.
async function getMatchPage(fetchUrl, match_id, minCM, maxCM, page) { 
    // This is the call for the match list page - we need to replace the sample id (the guid).
    // We want to sort by relationship, because the most important relationships are listed first.
    //https://www.ancestry.com/discoveryui-matchesservice/api/samples/THE_GUID_OF_THE_SAMPLE/matches/list?page=1&sortby=RELATIONSHIP
    let fullFetchUrl = fetchUrl
    .replace('PAGE_NUMBER', page);

    fetch(fullFetchUrl).then(r => r.json()).then(result => {
        var moreData = processMatchListData(result, match_id, minCM, maxCM);
        if (moreData) {
\            // Do NOT overload the server - call carefully - this will produce a 2 -3 second delay
            // between paging calls.
            sleep(2000 + ((Math.floor(Math.random() * 10)) * 100));
            getMatchPage(fetchUrl, matches, minCM, maxCM, page + 1);
        }
        else {
            // Save the data in storage for the UI page.
            if (match_id == "") {
                alert("Match List complete.");
            }

            chrome.storage.local.set({'matchData': sharedMatchMapping});
        }

    })
}

// Call this to set the list of people we'll be matching against.
async function setMatchList(url) {
    // This is the format of the match list URL:
    // https://www.ancestry.com/discoveryui-matches/match-list/THE_GUID_OF_THE_SAMPLE
    // And the guid at the end is what matters.
    let sampleId = url.replace('https://www.ancestry.com/discoveryui-matches/match-list/', '');

    // First, let's get the min and max CM data from the controls.
    var txtMaxCM = document.getElementById('txtMaxCM');
    var maxCM = txtMaxCM.value;

    var txtMinCM = document.getElementById('txtMinCM');
    var minCM = txtMinCM.value;
    
    // Initialize the object.
    sharedMatchMapping = new Object({"PrimarySampleId": sampleId});
    sharedMatchMapping.Matches = new Object();
    sharedMatchMapping.minCM = minCM;
    sharedMatchMapping.maxCM = maxCM;

    // This is the call for the match list page - we need to replace the sample id (the guid).
    // We want to sort by relationship, because the most important relationships are listed first.
    //https://www.ancestry.com/discoveryui-matchesservice/api/samples/THE_GUID_OF_THE_SAMPLE/matches/list?page=1&sortby=RELATIONSHIP
    //https://www.ancestry.com/discoveryui-matchesservice/api/samples/THE_GUID_OF_THE_SAMPLE/matches/list?page=1&sortby=RELATIONSHIP

    let fetchUrl = 'https://www.ancestry.com/discoveryui-matchesservice/api/samples/SAMPLEID/matches/list?page=PAGE_NUMBER&sortby=RELATIONSHIP'
                    .replace('SAMPLEID', sampleId);

    await getMatchPage(fetchUrl, "", minCM, maxCM, 1);
}

// Call this to set the list of people we'll be matching against.
async function gatherSharedMatches(url) {
    var progressDiv = document.getElementById("divMatchingProgress");
    progressDiv.hidden = false;

    var progressBar = document.getElementById("prgMatchGathering");

    var count = 0;
    for (var propertyName in sharedMatchMapping.Matches) {
        if (sharedMatchMapping.Matches.hasOwnProperty(propertyName)) {
          count++;
        }
      }

    progressBar.max = count;

    count = 0;
    // This is the format of the match list URL:
    // Getting the shared matches for a single match:
    // https://www.ancestry.com/discoveryui-matchesservice/api/samples/THE_PERSONS_TESTID/matches/list?page=1&relationguid=SHAREDMATCH_TEST_ID&sortby=RELATIONSHIP
    for (var propertyName in sharedMatchMapping.Matches) {
        if (sharedMatchMapping.Matches.hasOwnProperty(propertyName)) {
          count++;
        
        progressBar.value = count;
        var testId = sharedMatchMapping.Matches[propertyName].TestId;
        let fullFetchUrl = 'https://www.ancestry.com/discoveryui-matchesservice/api/samples/SAMPLEID/matches/list?page=PAGE_NUMBER&relationguid=SHAREDMATCH_TEST_ID&sortby=RELATIONSHIP'
            .replace('SAMPLEID', sharedMatchMapping.PrimarySampleId)
            .replace('SHAREDMATCH_TEST_ID', testId);

        await getMatchPage(fullFetchUrl, testId, sharedMatchMapping.minCM, sharedMatchMapping.maxCM, 1);
        }
    }

    progressDiv.hidden = true;       
}

// Used to only open one instance of the matchd data.
function getOwnTabs() {
    return Promise.all(
        chrome.extension.getViews({ type: 'tab' })
            .map(view =>
                new Promise(resolve =>
                    view.chrome.tabs.getCurrent(tab =>
                        resolve(Object.assign(tab, { url: view.location.href }))))));
}

// Opens the match tab, unless it's already open.
async function openMatchTab(url) {
    const ownTabs = await getOwnTabs();
    const tab = ownTabs.find(tab => tab.url.includes(url));
    if (tab) {
        chrome.tabs.update(tab.id, { active: true });
    } else {
        chrome.tabs.create({ url });
    }
}

// This is the primary hook for the popup document.
// Assign the document listeners for the HTML elements.
document.addEventListener('DOMContentLoaded', function () {
    var setMatchListButton = document.getElementById('btnSetMatchList');
    setMatchListButton.addEventListener('click', function () {

        chrome.tabs.getSelected(null, function (tab) {
            setMatchList(tab.url);
        });
    }, false);

    var getSharedMatchesButton = document.getElementById('btnGetSharedMatches');
    getSharedMatchesButton.addEventListener('click', function () {

        chrome.tabs.getSelected(null, function (tab) {
            gatherSharedMatches(tab.url);
        });
    }, false);

    var clearMatchDataButton = document.getElementById('btnClearMatchData');
    clearMatchDataButton.addEventListener('click', function () {
        chrome.tabs.getSelected(null, function (tab) {
            chrome.storage.local.clear(function() {
                var error = chrome.runtime.lastError;
                  if (error) {
                    console.error(error);
                  }
               })
            alert("Match Data Cleared.");
        });
    }, false);


    var showMatchesButton = document.getElementById('btnShowSharedMatches');
    showMatchesButton.addEventListener('click', function () {

        chrome.tabs.getSelected(null, function (tab) {
            openMatchTab('matchData.html');
        });
    }, false);

}, false);