
var uiport = null;

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    $c.assert(sender.tab);
    uiport = chrome.tabs.connect(sender.tab.id, { name:'bg2ui' });
    sendResponse({ bgstatus : inited ? 'SUCCESS' : 'NOT_INIT' });
  });

chrome.extension.onConnect.addListener(
  function(port) {
    port.onMessage.addListener(
      function(op) {
        if(op.name == 'getcurwindow') {

          chrome.windows.getCurrent(function(win) {
            db.window.get('WHERE wid='+win.id, function(tx, r) {
              $c.assert(r.rows.length == 1);
              port.postMessage({
                name : 'getcurwindow',
                wid : win.id,
                title : r.rows.item(0).title
              });
            });
          });

        } else if(op.name == 'listwindows') {
          db.window.get('WHERE saved != 1 ',
            function(tx, results){
              port.postMessage({ name:'listwindows',
                  windows:getWindows(results) });
            });
        } else if(op.name == 'listtabs' || op.name == 'relisttabs') {

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

          for(var i=0; i<op.tabdblist.length; i++) {
            var tabdb = op.tabdblist[i];
            ignoreTabAttach.push(tabdb.tid);
            ignoreTabDetach.push(tabdb.tid);
            if(!tabdb.hidden) {
              chrome.tabs.move(tabdb.tid, 
                { windowId:op.wid, index:100 });
            }
            db.tab.update('wid = ?, parent = ?, depth = ?',
              'WHERE tid = ?', [op.wid, tabdb.parent, tabdb.depth, tabdb.tid]); 
          }

        } else if(op.name == 'tabmovenew') {

          ignoreWindowCreate = true;
          chrome.windows.create(
            { url:chrome.extension.getURL('dummy.html') }, 
            function(win) {
              db.put(new db.window(win.id, null));
              for(var i=0; i < op.tabdblist.length; i++) {

                var tabdb = op.tabdblist[i];
                ignoreTabAttach.push(tabdb.tid);
                ignoreTabDetach.push(tabdb.tid);

                if(!tabdb.hidden) {
                  chrome.tabs.move(tabdb.tid,
                    { windowId:win.id, index:0 });
                }
                db.tab.update('wid = ?, parent = ?, depth = ?',
                  'WHERE tid = ?', 
                  [win.id, tabdb.parent, tabdb.depth, tabdb.tid]); 
              }
              port.postMessage({
                name : 'tabmovenew',
                wid : win.id
              });
              chrome.tabs.getAllInWindow(win.id, removeDummyTab);
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
        } else if(op.name == 'collapsetab') {
          db.tab.update('collapsed=1', ' WHERE tid='+op.tid);
          collapsedChildren[op.tid] = op.children;
          function move_tabs_to_attic() {
            for(var i=0; i<op.children.length; i++) {
              var tid = op.children[i];
              db.tab.update('hidden=1', ' WHERE tid='+tid);
              move_to_attic(tid);
            }
          }
          if(atticId) {
            move_tabs_to_attic();
          } else {
            create_attic(move_tabs_to_attic);
          }
        } else if(op.name == 'expandtab') {
          expand_tab(op.tid, op.children);
        } else if(op.name == 'tabdata2push') {
          tabdata = {};
          tabdata.format = 'plain';
          tabdata.profile = 'Home';
          tabdata.windows = [];
          db.window.get('', function(tx, results) {
            var numWindows = results.rows.length;
            var doneWindows = 0;

            for(var i=0; i<numWindows; i++) {
              var win = results.rows.item(i);
              var w = { 
                      id : win.id, 
                      title : win.title, 
                      tabs : [],
                      saved : win.saved 
                    };
              tabdata.windows.push(w);
              get_tabs(win, w);
            }

            function get_tabs(win, w) {
              db.tab.get('WHERE wid='+win.wid, function(tx, results) {
                var numtabs = results.rows.length;
                for(var i=0; i<numtabs; i++) {
                  var tab = results.rows.item(i);
                  w.tabs.push({
                      id : tab.id, 
                      url : tab.url, 
                      faviconurl : tab.faviconurl,
                      index : tab.idx,
                      saved : tab.saved 
                  });
                }

                if(++doneWindows == numWindows) {
                  port.postMessage({
                    name : 'tabdata2push',
                    tabdata : JSON.stringify(tabdata)
                  });
                }
              });
            }
          });
        }
      }
    );
  }
);
