
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
var ignoreWindowCreate = false;
var ignoreTabAttach = [];
var ignoreTabDetach = [];
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
    hidden : t.hidden,
    isparent : t.isparent
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


var currentTab = null;
/*
 * Tab Event listeners
 */
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
          console.error('onUpdated '+r.rows.length+' for '+tid);
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
        if(is_tabsense(t) || is_devtools(t)) {
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
function is_attic(tab) {
  return /chrome-extension:\/\/.*\/attic.html/.test(tab.url);
}
function is_newtab(tab) {
  return (tab.url == 'chrome://newtab/');
}

chrome.tabs.onCreated.addListener(
  function(tab) {
    if(is_tabsense(tab) || is_devtools(tab) || 
        is_dummy(tab) || is_attic(tab)) return;

    tab.favIconUrl = sanitizeFavIcon(tab.favIconUrl);
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
      db.tab.update('isparent=1','WHERE tid='+currentTab.tid);
      if(currentTab.collapsed) {
        expand_tab(currentTab.tid);
      }
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

        // check if the parent has any other children and update its
        // isparent flag accordingly
        db.tab.get('WHERE parent = '+tab.parent, function(tx, r) {
          if(r.rows.length > 0) {
            // there are other children of this parent
            // do nothing
          } else {
            // this was the last child of its parent, mark its
            // isparent to 0
            db.tab.update('isparent=0','WHERE tid='+tab.parent);
          }
        })
          

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
    if(ignoreTabAttach.indexOf(tid) >= 0) {
      ignoreTabAttach.splice(ignoreTabAttach.indexOf(tid), 1);
      return;
    }
    // Update our data model
    db.tab.update('wid = ?', 'WHERE tid = ?', 
      [attachInfo.newWindowId, tid]); 

    // Send UI update message
    db.tab.get('WHERE tid = '+tid, function(tx, results){
      if(results.rows.length != 1) {
        console.error('onAttached: '+results.rows.length+' for '+tid);
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
    if(ignoreTabDetach.indexOf(tid) >= 0) {
      ignoreTabDetach.splice(ignoreTabDetach.indexOf(tid), 1);
      return;
    }
    // Update our data model
    db.tab.update('wid = ?, parent = ?, depth = ? ', 'WHERE tid = ?', 
            [-1, 0, 0, tid]); 

    // Send UI update message
    db.tab.get('WHERE tid = '+tid, function(tx, results){
      if(results.rows.length != 1) {
        console.error('onDetached : '+results.rows.length+' for '+tid);
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

    if(wid == atticId) {
      atticId = 0;
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

    if(ignoreWindowCreate) {
      ignoreWindowCreate = false;
      return;
    }

    var w = { wid : win.id };
    if(nextNewWindowTitle) {
      w.title = nextNewWindowTitle;
      nextNewWindowTitle = null;
    }

    db.put(new db.window(win.id, w.title));

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
          if(is_newtab(t) || is_tabsense(t) || 
            is_devtools(t) || is_attic(t)) 
          {
            currentTab = null;
            return;
          }
          currentTab = makeTabDb(t);
        });
      }
    );
  }
);
