
var port = chrome.extension.connect({ name : 'ui2bg' });

// This run first thing on TabSense's main tab, 
// so the selected tab will be it
chrome.tabs.getSelected(null, function(me) {
    port.postMessage({ name:'register', tabid : me.id });
});

port.onMessage.addListener(
    function(reply) {
        if(reply.name == 'listwindows') {
            process_windows(reply.windows);
        } else if(reply.name == 'listtabs') {
            process_tabs(reply.tabs);
        }
    }
);

chrome.extension.onConnect.addListener(
    function(port) {
        console.assert(port.name == 'bg2ui');
        port.onMessage.addListener(
            function(op) {
                if(op.name == 'tabadd') {
                } else if(op.name == 'tabremove') {
                } else if(op.name == 'winadd') {
                } else if(op.name == 'winremove') {
                }
            }
        );
    }
);

