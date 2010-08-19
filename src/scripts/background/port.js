
var uitab = -1;
var uiport = null;

chrome.extension.onConnect.addListener(
  function(port) {
    console.assert(port.name == 'ui2bg');
    port.onMessage.addListener(
      function(op) {
        if(op.name == 'register') {
          if(uitab >= 0 && uitab != op.tabid) {
            // close previously registered ui tab
            chrome.tabs.remove(uitab);
          }
          uitab = op.tabid;
          uiport = chrome.tabs.connect(uitab, { name:'bg2ui' });
        } else if(op.name == 'listwindows') {
          db.window.get('WHERE saved != 1 ',
            function(tx, results){
              port.postMessage({ name:'listwindows',
                  windows:getWindows(results) });
            });
        } else if(op.name == 'listtabs' || op.name == 'relisttabs') 
        {
          var condition = 'WHERE wid = '+op.wid;
          db.tab.get(condition, 
            function(tx, results){
              port.postMessage({ 
                name: op.name,
                wid: op.wid,
                tabs:getTabs(results) 
              });
            });
        } else if(op.name == 'tabmove') {
          ignoreTabAttach.push(op.tid);
          ignoreTabDetach.push(op.tid);
          chrome.tabs.move(op.tid, 
            { windowId:op.wid, index:100 });
          db.tab.update('wid = ?, parent = ?, depth = ? ',
            'WHERE tid = ?', [op.wid, 0, 0, op.tid]); 
        } else if(op.name == 'tabmovenew') {
          chrome.windows.create(
            { url:chrome.extension.getURL('dummy.html') }, 
            function(win) {
              ignoreTabDetach.push(op.tid);
              chrome.tabs.move(op.tid,
                { windowId:win.id, index:0 },
                function() {
                  chrome.tabs.getAllInWindow(
                    win.id, removeDummyTab);
                }
              );
            }
          );
        } else if(op.name == 'savewindowtitle') {
          db.window.update('title = ? ', 'WHERE wid = ?', 
                    [op.title, op.wid]);
        } else if(op.name == 'unsavewindow') {
          db.window.get('WHERE wid='+op.wid,
            function(tx, results){
              if(results.rows.length != 1) {
                console.error('unsavewindow '+results.rows.length);
              }
              // this window is the one with old wid
              db.window.del('WHERE wid = '+op.wid);
              var w = results.rows.item(0);
              var win = { };
              nextNewWindowTitle = w.title;
              db.tab.get('WHERE wid='+op.wid, 
                function(tx, results) {
                  win.tabs = getTabs(results);
                  // delete these tabs
                  db.tab.del('WHERE wid='+op.wid); 
                  port.postMessage({ 
                    name:'unsavewindow',
                    saved : win
                  });
                }
              );
            }
          );
        } else if(op.name == 'savewindow') {
          db.tab.update('saved = 1 ', 'WHERE wid = ?', [op.wid],
            function(tx, r) {
              db.window.update('saved = 1 ', 'WHERE wid = ?', [op.wid],
                function(tx, r) {

                  ignoreWindowRemove = op.wid;
                  port.postMessage({ 
                    name:'savewindow',
                    wid : op.wid
                  });
                }
              );
            }
          );
        } else if(op.name == 'listsavedwindows') {
          db.window.get('WHERE saved=1 ',
            function(tx, results){
              port.postMessage({ name:'listsavedwindows',
                  windows:getWindows(results) });
            }
          );
        }
      }
    );
  }
);
