
chrome.browserAction.onClicked.addListener(
    function(tab) {
        chrome.tabs.create({url:
            chrome.extension.getURL('newtab.html')});
    }
);
/*
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        if(request.action == 'openui') {
            chrome.tabs.create({url:
                chrome.extension.getURL('newtab.html')});
        } else if(request.action == 'listwindows') {
            db.window.get('',function(tx, results){
                    sendResponse(getWindows(results));
                });
        } else if(request.action == 'listtabs') {
            db.tab.get(request.condition,function(tx, results){
                    sendResponse(getTabs(results));
                });
        } else if(request.action == 'tabmove') {
            ignoreTabAttach = request.tid;
            ignoreTabDetach = request.tid;
            chrome.tabs.move(request.tid, 
                { windowId : request.wid, index:100 });
            db.tab.update('wid = ? ', 'WHERE tid = ?',
                    [request.wid, request.tid]); 
        } else if(request.action == 'newwindowwithtab') {
            chrome.windows.create({url:chrome.extension.getURL('dummy.html')}, 
                function(win) {
                    chrome.tabs.move(request.tid,{ windowId:win.id, index:0 },
                        function() {
                            chrome.tabs.getAllInWindow(win.id, removeDummyTab);
                        }
                    );
                }
            );
        }
    }
);
*/

function removeDummyTab(tabs) {
    for(var i=0; i < tabs.length; i++) {
        if(/dummy.html/.test(tabs[i].url)) {
            chrome.tabs.remove(tabs[i].id);
        }
    }
}

var ignoreTabAttach = -1;
var ignoreTabDetach = -1;

function getWindows(results) {
    var warr = [];
    for(var i=0; i < results.rows.length; i++) {
        var w = results.rows.item(i);
        warr.push({
            wid : w.wid,
            title : w.title
        });
    }
    return warr;
}

function getTabs(results) {
    var tarr = [];
    for(var i=0; i < results.rows.length; i++) {
        var t = results.rows.item(i);
        tarr.push({
            tid : t.tid,
            wid : t.wid,
            title : t.title,
            url : t.url,
            faviconurl : t.faviconurl,
            index : t.index,
            parent : t.parent,
            depth : t.depth
        });
    }
    tarr.sort(function(a,b) {return (a.depth-b.depth)});
    var tree = [];
    for(var i=0; i<tarr.length; i++) {
        if(tarr[i].depth == 0) {
            tree.push(tarr[i]);
        } else {
            for(var j=0; j < tree.length; j++) {
                if(tree[j].tid == tarr[i].parent) {
                    tree.splice(j+1, 0, tarr[i]); // insert into tree at j+1
                    break;
                }
            }
        }
    }
    return tree;
}

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
        t.favIconUrl = sanitizeFavIcon(t.favIconUrl);
        db.put(new db.tab(t.id, t.title, t.url, t.favIconUrl, 
                            t.index, t.windowId));
    }
}
fallbackIcon = chrome.extension.getURL('images/icon28.png');
function sanitizeFavIcon(fi) {
    if(fi == undefined || fi == null || fi.length == 0) {
        return fallbackIcon;
    } else {
        return fi;
    }
}


var currentTab = null;
/*
 * Tab Event listeners
 */

chrome.tabs.onUpdated.addListener(
    // Update tab entry in our data model
    function(tid, changeInfo, tab) {
        tab.favIconUrl = sanitizeFavIcon(tab.favIconUrl);
        db.tab.update('url = ?, status =  ?, title = ?, faviconurl = ? ', 
                    'WHERE tid = ?',
                    [tab.url, tab.status, tab.title, tab.favIconUrl, tid]); 
        if(!/chrome-extension:\/\/.*\/newtab.html/.test(tab.url)) {
            //triggerUIRefresh();
        }
    }
);

chrome.tabs.onSelectionChanged.addListener(
    function(tid, selectInfo) {
        // Update the current selected tab. 
        // This will be the parent tab of newly created tabs
        db.tab.get('WHERE tid = '+tid, function(tx, r) {
                if(r.rows.length != 1) {
                    console.warn('Got '+r.rows.length+' tabs for '+tid);
                    return;
                }
                var t = r.rows.item(0);
                currentTab = {
                    tid : t.tid,
                    title : t.title,
                    url : t.url,
                    faviconurl : t.faviconurl,
                    index : t.index,
                    wid : t.wid,
                    parent : t.parent,
                    depth : t.depth
                }
            });
    }
);

function is_tabsense(tab) {
    return /chrome-extension:\/\/.*\/newtab.html/.test(tab.url);
}

function is_devtools(tab) {
    return /chrome:\/\/devtools\/devtools.html/.test(tab.url);
}
function is_newtab(tab) {
    return (tab.url == 'chrome://newtab/');
}

chrome.tabs.onCreated.addListener(
    function(tab) {
        if(is_tabsense(tab) || is_devtools(tab)) {
            console.debug('Ignoring create:'+tab.url);
            return;
        }

        console.debug('Creating new tab : '+tab.url+' currentTab '+currentTab);

        // Is this a new tab or has a URL already?
        // If it's a new tab: its depth is zero (root tab)
        // else: it's a child of currently (or previously) selected tab
        if(is_newtab(tab)) {
            var t = new db.tab(tab.id, tab.title, tab.url, tab.favIconUrl, 
                            tab.index, tab.windowId, 0, 0);
        } else {
            var t = new db.tab(tab.id, tab.title, tab.url, tab.favIconUrl, 
                            tab.index, tab.windowId, 
                            currentTab.tid, currentTab.depth+1); 
        }
        db.put(t, function(tx, r) { console.debug('Tab put DB: '+tab.url); });

        uiport.postMessage({
            name : 'addtab',

            tab : {
                tid : t.tid,
                title : t.title,
                url : t.url,
                faviconurl : t.faviconurl,
                index : t.index,
                wid : t.wid,
                parent : t.parent,
                depth : t.depth
            }
        });
    }
);
chrome.tabs.onRemoved.addListener(
    function(tid) {

        db.tab.get('WHERE tid = '+tid,
            function(tx, r) {
                if(r.rows.length == 0) {
                    console.error('No tab in DB for '+tid);
                    return;
                }
                var tab = r.rows.item(0);
                uiport.postMessage({
                    name : 'removetab',
                    tab : {
                        tid : tab.tid,
                        wid : tab.wid,
                        title : tab.title,
                        url : tab.url,
                        faviconurl : tab.faviconurl,
                        index : tab.index,
                        parent : tab.parent,
                        depth : tab.depth
                    }
                });

                db.tab.del('WHERE tid = '+tid,
                    function(tx, r) { console.log('Tab del : '+tid); });
            }
        );
    }
);

/*
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
*/


chrome.tabs.onAttached.addListener(
    function(tid, attachInfo) {
        if(tid == ignoreTabAttach) {
            console.log('ATTACH: ignoring '+tid);
            ignoreTabAttach = -1;
            return;
        }
        // Update our data model
        db.tab.update('wid = ?', 'WHERE tid = ?', 
            [attachInfo.newWindowId, tid]); 

        // Send UI update message
        db.tab.get('WHERE tid = '+tid, function(tx, results){
            if(results.rows.length != 1) {
                console.error('after attach tabs found '+results.rows.length);
                return;
            }
            tab = results.rows.item(0);
            uiport.postMessage({
                name : 'addtab',
                tab : {
                    tid : tab.tid,
                    wid : tab.wid,
                    title : tab.title,
                    url : tab.url,
                    faviconurl : tab.faviconurl,
                    index : tab.index,
                    parent : tab.parent,
                    depth : tab.depth
                }
            });
        });
    }
);
chrome.tabs.onDetached.addListener(
    function(tid, detachInfo) {
        if(tid == ignoreTabDetach) {
            console.log('DETACH: ignoring '+tid);
            ignoreTabDetach = -1;
            return;
        }
        // Update our data model
        db.tab.update('wid = ?', 'WHERE tid = ?', 
            [-1, tid]); 

        // Send UI update message
        db.tab.get('WHERE tid = '+tid, function(tx, results){
            if(results.rows.length != 1) {
                console.error('after attach tabs found '+results.rows.length);
                return;
            }
            tab = results.rows.item(0);
            uiport.postMessage({
                name : 'removetab',
                tab : {
                    tid : tab.tid,
                    wid : detachInfo.oldWindowId,
                    title : tab.title,
                    url : tab.url,
                    faviconurl : tab.faviconurl,
                    index : tab.index,
                    parent : tab.parent,
                    depth : tab.depth
                }
            });
        });
    }
);
chrome.tabs.onMoved.addListener(
    function(tid, moveInfo) {
    }
);


/*
 * Window event listeners
 */
chrome.windows.onRemoved.addListener(
    function(wid) {
        db.window.del('WHERE wid = '+wid);
        db.tab.del('WHERE wid = '+wid);

        uiport.postMessage({
            name : 'removewindow',
            win : { wid:win.id }
        });
    }
);
chrome.windows.onCreated.addListener(
    function(win) {
        if(win.type == 'app') {
            console.debug('Ignoring app window');
            return;
        }

        db.put(new db.window(win.id, null));

        uiport.postMessage({
            name : 'addwindow',
            win : { wid:win.id }
        });
    }
);
