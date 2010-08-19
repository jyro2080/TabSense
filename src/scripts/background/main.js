var $c = console;

db.open();



/*
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
*/

load_database_windows();

var dbData = {}

function load_database_windows() {
    var donewl = 0;
    db.window.get('WHERE saved=0 ',
        function(tx, results) {
            var wl = results.rows.length;
            if(wl) {
                for(var i=0; i<results.rows.length; i++) {
                    var oldwid = results.rows.item(i).wid;
                    dbData[oldwid] = [];
                    db.tab.get('WHERE saved=0 and wid='+oldwid,
                        function(tx, results) {
                            for(var j=0; j<results.rows.length; j++) {
                                var wid = results.rows.item(j).wid;
                                var url = results.rows.item(j).url;
                                dbData[wid].push(url);
                            }
                            donewl++;
                            if(donewl == wl) {
                                chrome.windows.getAll(null, load_real_windows);
                            }
                        }
                    );
                }
            } else {
                chrome.windows.getAll(null, load_real_windows);
            }
        }
    );
}

var realData = {}
function load_real_windows(windows) {
    var donewl = 0;
    var wl = windows.length;
    for(var i=0; i < wl; i++) {
        var w = windows[i];
        realData[w.id] = [];
        if(w.type == 'app') { donewl++; continue; }

        chrome.tabs.getAllInWindow(w.id, function(tabs) {
            for(var i=0; i<tabs.length; i++) {
                var t = tabs[i];
                if(is_tabsense(t) || is_devtools(t)) continue;
                realData[t.windowId].push(t.url);
            }
            donewl++;
            if(donewl == wl) {
                match_db_real();
            }
        });
    }
}

function are_same_windows(db, realtabs) {
    for(var i in realtabs) {
        if(db.indexOf(realtabs[i]) < 0) return false;
    }
    return true;
}

function update_db_window(_old, _new) {
    console.log('Should update old '+_old+' to new '+_new);
}

function match_db_real() {
    for(var i in realData) {
        for(var j in dbData) {
            if(are_same_windows(dbData[j], realData[i])) {
                update_db_window(j, i);
                realData[i] = undefined;
                dbData[j] = undefined;
            }
        }
    }
    cleanup_old_windows();
    process_new_windows();
}

function cleanup_old_windows()
{
    for(var i in dbData) {
        if(dbData[i]) {
            db.window.del('WHERE wid = '+i);
        }
    }
}
function process_new_windows()
{
    chrome.windows.getAll(null, function(windows) {
        for(var i in windows) {
            var win = windows[i];
            if(win.type == 'app') continue;
            db.put(new db.window(win.id, null));
            chrome.tabs.getAllInWindow(win.id, function(tabs) {
                for(var i=0; i<tabs.length; i++) {
                    var t = tabs[i];
                    if(is_tabsense(t) || is_devtools(t)) continue;
                    t.favIconUrl = sanitizeFavIcon(t.favIconUrl);

                    db.put(new db.tab(t.id, t.title, t.url, 
                        t.favIconUrl, t.index, t.windowId));
                }
            });
        }
    });
}
