
var fallbackIcon = chrome.extension.getURL('images/icon28.png');
var rotateFavIcon = chrome.extension.getURL('images/rotate.gif');

function sanitizeFavIcon(fi) {
  if(fi === undefined || fi === null || fi.length == 0) {
    return fallbackIcon;
  } else {
    return fi;
  }
}

var atticId = 0;

function create_attic(callback) {
  ignoreWindowCreate = true;
  chrome.windows.create({
    url : chrome.extension.getURL('attic.html'),
    width : 300,
    height : 400
  }, function(win) { atticId = win.id; callback(); });
}

function move_to_attic(tid) {
  $c.assert(atticId);
  ignoreTabAttach.push(tid);
  ignoreTabDetach.push(tid);
  chrome.tabs.move(tid, { windowId : atticId, index : 100 });
}

function move_from_attic(tid) {
  if(!atticId) {
    alert('Attic not found');
    return;
  }
  db.tab.get('WHERE tid='+tid, function(tx, results) {
    $c.assert(results.rows.length==1);
    var tab = results.rows.item(0);
    ignoreTabAttach.push(tid);
    ignoreTabDetach.push(tid);
    chrome.tabs.move(tid, { windowId : tab.wid, index : 100 });
  });
}

var expansionTabs = {};
var collapseTab = chrome.extension.getURL('collapse.html');

function create_expansion_tab(tid, children, callback) {
  db.tab.get('WHERE tid='+tid, function(tx, results) {
    $c.assert(results.rows.length==1);
    var tab = results.rows.item(0);

    chrome.tabs.getAllInWindow(parseInt(tab.wid), function(tabs) {
      if(tabs.length == 1) {
        // this is the last tab, show collapse tab
        chrome.tabs.create({
          windowId : tab.wid,
          url : collapseTab
        }, function(newtab) {
          expansionTabs[newtab.id] = { tabdb:tab, children:children };
          callback(tid);
        });
      } else {
        callback(tid);
      }
    });
  });
}

function expand_tab(ptid, children) {
  db.tab.update('collapsed=0', ' WHERE tid='+ptid);
  for(var i=0; i<children.length; i++) {
    var tid = children[i];
    db.tab.update('hidden=0, collapsed=0', ' WHERE tid='+tid);
    move_from_attic(tid);
  }
  move_from_attic(ptid);

  setTimeout(function() {
    for(var i in expansionTabs) {
      if(!expansionTabs[i]) continue;
      if(expansionTabs[i].tabdb.tid == parseInt(ptid)) {
        chrome.tabs.remove(parseInt(i));
        expansionTabs[i] = null;
      }
    }
  }, 1000);
}
