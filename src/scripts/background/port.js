
var uitab = -1;
var uiport = null;

chrome.extension.onConnect.addListener(
    function(port) {
        console.assert(port.name == 'ui2bg');
        port.onMessage.addListener(
            function(op) {
                if(op.name == 'register') {
                    if(uitab >= 0) {
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
                } else if(op.name == 'listtabs') {
                    db.tab.get(op.condition, function(tx, results){
                            port.postMessage({ name:'listtabs',
                                    tabs:getTabs(results) });
                        });
                }
            }
        );
    }
);
