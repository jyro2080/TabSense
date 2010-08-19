
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
    url : chrome.extension.getURL('attic.html')
  }, function(win) { atticId = win.id; callback(); });
}

function move_to_attic(tid) {
  $c.assert(atticId);
  ignoreTabAttach.push(tid);
  ignoreTabDetach.push(tid);
  chrome.tabs.move(tid, { windowId : atticId, index : 100 });
}

function move_from_attic(tid) {
  $c.assert(atticId);
  db.tab.get('WHERE tid='+tid, function(tx, results) {
    $c.assert(results.rows.length==1);
    var tab = results.rows.item(0);
    ignoreTabAttach.push(tid);
    ignoreTabDetach.push(tid);
    $c.log('Moving out of attic '+tid+' to '+tab.wid);
    chrome.tabs.move(tid, { windowId : tab.wid, index : 100 });
  });
}
