var $c = console;

db.open();

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
  setTimeout(function() {
    cleanup_old_windows();
    process_new_windows();
  }, 1000);
}

function are_same_windows(dbtabs, realtabs) {
  if(!dbtabs) return false;
  if(!realtabs) return false;
  for(var i in realtabs) {
    if(dbtabs.indexOf(realtabs[i]) < 0) return false;
  }
  for(var i in dbtabs) {
    if(realtabs.indexOf(dbtabs[i]) < 0) return false;
  }
  return true;
}

function update_db_window(_old, _new) {
  db.window.update('wid = '+_new, ' WHERE wid = '+_old);
  db.tab.update('wid = '+_new, ' WHERE wid = '+_old, null,
    function(){
      chrome.tabs.getAllInWindow(parseInt(_new), function(tabs) {
        for(var i=0; i<tabs.length; i++) {
          var tab = tabs[i];
          db.tab.update('parent = '+tab.id, 
            ' WHERE parent IN (SELECT tid FROM Tab WHERE url=?)', [tab.url]);
          db.tab.update('tid = '+tab.id, ' WHERE wid = ? and url = ?',
                        [_new, tab.url]);
        }
      });
    });

}

function cleanup_old_windows() {
  for(var i in dbData) {
    if(dbData[i]) {
      db.window.del('WHERE wid = '+i);
    }
  }
}

function process_new_windows() {
  chrome.windows.getAll(null, function(windows) {
    for(var i in windows) {
      var win = windows[i];
      if(win.type == 'app') continue;
      if(!realData[win.id]) continue; // already exists in DB
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
