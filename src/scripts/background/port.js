
var uiports = {};

chrome.extension.onConnect.addListener(
    function(port) {
        console.assert(port.name == 'ui2bg');
        port.onMessage.addListener(
            function(op) {
                if(op.name == 'register') {
                    console.log(op.tabid+' registered successfully');
                    uiports[op.tabid] = 
                        chrome.tabs.connect(op.tabid, { name:'bg2ui' });
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
