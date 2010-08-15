
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
                    db.tab.get(op.condition, 
                        function(tx, results){
                            port.postMessage({ name: op.name,
                                    tabs:getTabs(results) });
                        });
                } else if(op.name == 'tabmove') {
                    ignoreTabAttach = op.tid;
                    ignoreTabDetach = op.tid;
                    chrome.tabs.move(op.tid, 
                        { windowId:op.wid, index:100 });
                    db.tab.update('wid = ?, parent = ?, depth = ? ',
                        'WHERE tid = ?', [op.wid, 0, 0, op.tid]); 
                } else if(op.name == 'tabmovenew') {
                    chrome.windows.create(
                        { url:chrome.extension.getURL('dummy.html') }, 
                        function(win) {
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
                    console.debug('unsavewindow '+op.wid);
                    db.window.get('WHERE wid='+op.wid,
                        function(tx, results){
                            console.log('++>>'+results.rows);
                            if(results.rows.length != 1) {
                                console.error('Found '+results.rows.length+
                                    ' saved windows');
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
                    console.debug('Save window '+op.wid);
                    db.tab.update('saved = 1 ', 'WHERE wid = ?', [op.wid],
                        function(tx, r) {
                            db.window.update('saved = 1 ', 'WHERE wid = ?', [op.wid],
                                function(tx, r) {
                                    console.debug('savewindow returning');

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
                    console.debug('Listing saved windows');
                    db.window.get('WHERE saved=1 ',
                        function(tx, results){
                            console.debug('Found saved windows '+results);
                            port.postMessage({ name:'listsavedwindows',
                                    windows:getWindows(results) });
                        }
                    );
                }
            }
        );
    }
);
