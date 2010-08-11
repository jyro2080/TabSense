
chrome.browserAction.onClicked.addListener(
    function(tab) {
        chrome.tabs.create({url:
            chrome.extension.getURL('newtab.html')});
    }
);
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        chrome.tabs.create({url:
            chrome.extension.getURL('newtab.html')});
    }
);

/*
 * Create initial data structure
 */

db.open();
db.clear();
chrome.windows.getAll(null, processWindows);

function processWindows(windows) {
    var wl = windows.length;
    for(var i=0; i < wl; i++) {
        var w = windows[i];

        db.put(new db.window(w.id, null));

        chrome.tabs.getAllInWindow(w.id, processTabs);
    }
}

function processTabs(tabs) {
    var tl = tabs.length;
    for(var i=0; i < tl; i++) {
        var t = tabs[i];
        db.put(new db.tab(t.id, t.title, t.url, t.favIconUrl, 
                            t.index, t.windowId));
    }
}

/*
 * Tab Event listeners
 */

chrome.tabs.onUpdated.addListener(
    function(tid, changeInfo, tab) {
        // Update tab entry in our data model
    }
);

chrome.tabs.onSelectionChanged.addListener(
    function(tid, selectInfo) {
        // Update the current selected tab. 
        // This will be the parent tab of newly created tabs
    }
);


chrome.tabs.onCreated.addListener(
    function(tab) {
        // Is this a new tab or has a URL already?
        // If it's a new tab: its depth is zero (root tab)
        // else: it's a child of currently (or previously) selected tab
    }
);
chrome.tabs.onRemoved.addListener(
    function(tid) {
        // Update our data model
    }
);


chrome.tabs.onAttached.addListener(
    function(tid, attachInfo) {
        // Update our data model
    }
);
chrome.tabs.onDetached.addListener(
    function(tid, detachInfo) {
        // Update our data model
    }
);
chrome.tabs.onMoved.addListener(
    function(tid, moveInfo) {
        // Update our data model
    }
);

