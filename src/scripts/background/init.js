
chrome.browserAction.onClicked.addListener(
    function(tab) {
        chrome.tabs.create({url:
            chrome.extension.getURL('newtab.html')});
    }
);

function removeDummyTab(tabs) {
    for(var i=0; i < tabs.length; i++) {
        if(/dummy.html/.test(tabs[i].url)) {
            chrome.tabs.remove(tabs[i].id);
        }
    }
}

var ignoreWindowRemove = -1;
var ignoreTabAttach = -1;
var ignoreTabDetach = -1;
var nextNewWindowTitle = null;

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

function makeTabDb(t) {
    return {
        tid : t.tid,
        wid : t.wid,
        title : t.title,
        url : t.url,
        faviconurl : t.faviconurl,
        index : t.index,
        parent : t.parent,
        depth : t.depth,
        collapsed : t.collapsed,
        hidden : t.hidden
    };
}

function getTabs(results) {
    var tarr = [];
    for(var i=0; i < results.rows.length; i++) {
        var t = results.rows.item(i);
        tarr.push(makeTabDb(t));
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
    if(fi === undefined || fi === null || fi.length == 0) {
        return fallbackIcon;
    } else {
        return fi;
    }
}


var currentTab = null;
/*
 * Tab Event listeners
 */

var rotateFavIcon = chrome.extension.getURL('images/rotate.gif');

chrome.tabs.onUpdated.addListener(
    // Update tab entry in our data model
    function(tid, changeInfo, tab) {
        if(is_newtab(tab) || is_devtools(tab) || 
            is_tabsense(tab) || is_dummy(tab)) return;

        if(tab.status == 'loading') {
            tab.favIconUrl = rotateFavIcon;
        } else {
            tab.favIconUrl = sanitizeFavIcon(tab.favIconUrl);
        }

        db.tab.update('url = ?, status =  ?, title = ?, faviconurl = ? ', 
                    'WHERE tid = ?',
                    [tab.url, tab.status, tab.title, tab.favIconUrl, tid]); 

        db.tab.get('WHERE tid = '+tid,
            function(tx, r) {
                if(r.rows.length != 1) {
                    console.error('onUpdated '+r.rows.length);
                    return;
                }
                var tab = r.rows.item(0);
                if(uiport) {
                    uiport.postMessage({
                        name : 'updatetab',
                        tab : makeTabDb(tab)
                    });
                }
            }
        );
    }
);

chrome.tabs.onSelectionChanged.addListener(
    function(tid, selectInfo) {
        // Update the current selected tab. 
        // This will be the parent tab of newly created tabs
        db.tab.get('WHERE tid = '+tid, function(tx, r) {
                if(r.rows.length != 1) {
                    currentTab = null;
                    return;
                }
                var t = r.rows.item(0);
                if(is_newtab(t) || is_tabsense(t) || is_devtools(t)) {
                    currentTab = null;
                    return;
                }
                currentTab = makeTabDb(t);
            });
    }
);

function is_tabsense(tab) {
    return /chrome-extension:\/\/.*\/newtab.html/.test(tab.url);
}
function is_dummy(tab) {
    return /chrome-extension:\/\/.*\/dummy.html/.test(tab.url);
}

function is_devtools(tab) {
    return /chrome:\/\/devtools\/devtools.html/.test(tab.url);
}
function is_newtab(tab) {
    return (tab.url == 'chrome://newtab/');
}

chrome.tabs.onCreated.addListener(
    function(tab) {
        if(is_tabsense(tab) || is_devtools(tab) || is_dummy(tab)) {
            return;
        }

        if(is_newtab(tab) || 
            !currentTab || 
            currentTab.wid != tab.windowId) 
        {
            var t = new db.tab(
                tab.id, tab.title, tab.url, tab.favIconUrl, 
                tab.index, tab.windowId, 0, 0);
        } else {
            var t = new db.tab(
                tab.id, tab.title, tab.url, tab.favIconUrl, 
                tab.index, tab.windowId, 
                currentTab.tid, currentTab.depth+1); 
        }
        db.put(t);

        if(uiport) {
            uiport.postMessage({
                name : 'addtab',
                tab : makeTabDb(t) 
            });
        }
    }
);
chrome.tabs.onRemoved.addListener(
    function(tid) {

        db.tab.get('WHERE tid = '+tid,
            function(tx, r) {
                if(r.rows.length == 0) {
                    return;
                }
                var tab = r.rows.item(0);

                bubble_up_children(tab);
                unparent_children(tab);

                if(is_tabsense(tab) || is_devtools(tab) || is_dummy(tab)) {
                    return;
                }

                db.tab.del('WHERE saved = 0 AND tid = '+tid);

                if(uiport) {
                    uiport.postMessage({
                        name : 'removetab',
                        tab : makeTabDb(tab) 
                    });
                }

            }
        );
    }
);

function unparent_children(parnt) {
    db.tab.update('parent = ? ', 
        'WHERE parent = ?', [parnt.parent, parnt.tid]);
}

function bubble_up_children(parnt) {
    db.tab.get('WHERE parent = '+parnt.tid,
        function(tx, r) {
            for(var i=0; i < r.rows.length; i++)  {
                bubble_up_children(r.rows.item(i));
            }
        }
    );
    db.tab.update('depth = depth-1 ', 'WHERE parent = ?', [parnt.tid]);
}

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
            ignoreTabAttach = -1;
            return;
        }
        // Update our data model
        db.tab.update('wid = ?', 'WHERE tid = ?', 
            [attachInfo.newWindowId, tid]); 

        // Send UI update message
        db.tab.get('WHERE tid = '+tid, function(tx, results){
            if(results.rows.length != 1) {
                console.error('onAttached: '+results.rows.length);
                return;
            }
            var tab = results.rows.item(0);
            if(uiport) {
                uiport.postMessage({
                    name : 'addtab',
                    tab : makeTabDb(tab)
                });
            }
        });
    }
);
chrome.tabs.onDetached.addListener(
    function(tid, detachInfo) {
        if(tid == ignoreTabDetach) {
            ignoreTabDetach = -1;
            return;
        }
        // Update our data model
        db.tab.update('wid = ?, parent = ?, depth = ? ', 'WHERE tid = ?', 
                        [-1, 0, 0, tid]); 

        // Send UI update message
        db.tab.get('WHERE tid = '+tid, function(tx, results){
            if(results.rows.length != 1) {
                console.error('onDetached : '+results.rows.length);
                return;
            }
            var tab = results.rows.item(0);
            if(uiport) {
                uiport.postMessage({
                    name : 'removetab',
                    tab : makeTabDb(tab)
                });
            }
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
        if(wid == ignoreWindowRemove) {
            ignoreWindowRemove = -1;
            return;
        }

        db.window.del('WHERE wid = '+wid);
        db.tab.del('WHERE wid = '+wid);

        if(uiport) {
            uiport.postMessage({
                name : 'removewindow',
                win : { wid:wid }
            });
        }
    }
);
chrome.windows.onCreated.addListener(
    function(win) {
        if(win.type == 'app') {
            return;
        }

        db.put(new db.window(win.id, null));


        var w = { wid : win.id };
        if(nextNewWindowTitle) {
            w.title = nextNewWindowTitle;
            nextNewWindowTitle = null;
        }
        if(uiport) {
            uiport.postMessage({
                name : 'addwindow',
                win : w
            });
        }
    }
);
chrome.windows.onFocusChanged.addListener(
    function(wid) {
        chrome.tabs.getSelected(null, 
            function(tab) {
                db.tab.get('WHERE tid = '+tab.id, function(tx, r) {
                    if(r.rows.length != 1) {
                        currentTab = null;
                        return;
                    }
                    var t = r.rows.item(0);
                    if(is_newtab(t) || is_tabsense(t) || is_devtools(t)) {
                        currentTab = null;
                        return;
                    }
                    currentTab = makeTabDb(t);
                });
            }
        );
    }
);
