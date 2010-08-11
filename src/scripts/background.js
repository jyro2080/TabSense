
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
    // Update tab entry in our data model
    function(tid, changeInfo, tab) {
        console.log('Updating '+tab.favIconUrl);
        db.tab.update('url = ?, status =  ?, title = ?, faviconurl = ? ', 
                    'WHERE tid = ?',
                    [tab.url, tab.status, tab.title, tab.favIconUrl, tid]); 
        if(!/chrome-extension:\/\/.*\/newtab.html/.test(tab.url)) {
            console.log('trigger UI refresh');
            triggerUIRefresh();
        }
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
        db.put(new db.tab(tab.id, tab.title, tab.url, tab.favIconUrl, 
                            tab.index, tab.windowId));
        if(!/chrome-extension:\/\/.*\/newtab.html/.test(tab.url)) {
            triggerUIRefresh();
        }
    }
);
chrome.tabs.onRemoved.addListener(
    function(tid) {
        db.tab.del('WHERE tid = '+tid);
        triggerUIRefresh();
    }
);

function triggerUIRefresh() {
    db.tab.get('WHERE url LIKE \'chrome-extension://%/newtab.html\'',
        function(tx, r) {
            for(var i=0; i < r.rows.length; i++) {
                var tab = r.rows.item(i);
                chrome.tabs.sendRequest(tab.tid, { msg: "RELOAD" });
            }
        }
    );
}


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


/*
 * Window event listeners
 */
chrome.windows.onRemoved.addListener(
    function(wid) {
        db.window.del('WHERE wid = '+wid);
        db.tab.del('WHERE wid = '+wid);
    }
);
