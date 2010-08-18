
db.open();
db.clear();
chrome.windows.getAll(null, processWindows);

function processWindows(windows) {
    var wl = windows.length;
    for(var i=0; i < wl; i++) {
        var w = windows[i];

        if(w.type == 'app') continue;

        db.put(new db.window(w.id, null));

        chrome.tabs.getAllInWindow(w.id, processTabs);
    }
}

function processTabs(tabs) {
    var tl = tabs.length;
    for(var i=0; i < tl; i++) {
        var t = tabs[i];
        if(is_tabsense(t) || is_devtools(t)) continue;
        t.favIconUrl = sanitizeFavIcon(t.favIconUrl);
        db.put(new db.tab(t.id, t.title, t.url, t.favIconUrl, 
                            t.index, t.windowId));
    }
}
