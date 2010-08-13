
var bgport = chrome.extension.connect({ name : 'ui2bg' });

// This run first thing on TabSense's main tab, 
// so the selected tab will be it
chrome.tabs.getSelected(null, function(me) {
    bgport.postMessage({ name:'register', tabid : me.id });
});

bgport.onMessage.addListener(
    function(reply) {
        if(reply.name == 'listwindows') {
            process_windows(reply.windows);
        } else if(reply.name == 'listtabs') {
            process_tabs(reply.tabs);
            doneWindows++;
            if(doneWindows == UI.totalWindows) {
                UI.layout_windows();
            }
        } else if(reply.name == 'relisttabs') {
            reprocess_tabs(reply.tabs);
            UI.layout_windows();
        }
    }
);

chrome.extension.onConnect.addListener(
    function(port) {
        console.assert(port.name == 'bg2ui');
        port.onMessage.addListener(
            function(op) {
                console.debug('UI op : '+op.name);
                if(op.name == 'addtab') {
                    var wframe = UI.wMap[op.tab.wid];
                    bgport.postMessage(
                        { name:'relisttabs',
                            condition:'WHERE wid = '+op.tab.wid });
                } else if(op.name == 'removetab') {
                    var wframe = UI.wMap[op.tab.wid];
                    bgport.postMessage(
                        { name:'relisttabs',
                            condition:'WHERE wid = '+op.tab.wid });
                } else if(op.name == 'attachtab') {
                    UI.attach_tab(op.tab);
                } else if(op.name == 'detachtab') {
                    UI.detach_tab(op.tab);
                } else if(op.name == 'addwindow') {
                    UI.add_window(op.win);
                } else if(op.name == 'removewindow') {
                    UI.remove_window(op.win);
                }
            }
        );
    }
);

