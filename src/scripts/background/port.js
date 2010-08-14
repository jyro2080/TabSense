
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
                    db.window.get('',function(tx, results){
                            port.postMessage({ name:'listwindows',
                                    windows:getWindows(results) });
                        });
                } else if(op.name == 'listtabs' || op.name == 'relisttabs') {
                    db.tab.get(op.condition, function(tx, results){
                            port.postMessage({ name: op.name,
                                    tabs:getTabs(results) });
                        });
                } else if(op.name == 'tabmove') {
                    ignoreTabAttach = op.tid;
                    ignoreTabDetach = op.tid;
                    chrome.tabs.move(op.tid, { windowId:op.wid, index:100 });
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
                }
            }
        );
    }
);
