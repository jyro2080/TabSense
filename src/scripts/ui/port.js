
var bgport = chrome.extension.connect({ name : 'ui2bg' });

// This run first thing on TabSense's main tab, 
// so the selected tab will be it
//chrome.tabs.getSelected(null, function(me) {
//  bgport.postMessage({ name:'register', tabid : me.id });
//});

bgport.postMessage({ name:'register' });

var bgstatus = 'UNKNOWN';

bgport.onMessage.addListener(
  function(reply) {
    if(reply.name == 'register') {

      if(reply.response == 'SUCCESS') {
        bgstatus = 'READY'; 
      } else {
        bgstatus = 'NOTREADY'; 
      }

    } else if(reply.name == 'listwindows') {

      doneWindows = 0;
      $('body').css('font-size', UI.FONT_SIZE+'px');

      UI.totalWindows = reply.windows.length;
      for(var i=0; i < UI.totalWindows; i++) {
        var windb = reply.windows[i];
        var wframe = new WinFrame(windb);

        // hide all windows to avoid flashing if resize required
        wframe.elem.hide(); 

        UI.wMap[windb.wid] = wframe;

        bgport.postMessage({ name:'listtabs', 
          wid:windb.wid });
      }

    } else if(reply.name == 'listtabs') {

      var wframe = UI.wMap[reply.wid];
      wframe.addTabs(reply.tabs);
      doneWindows++;
      if(doneWindows == UI.totalWindows) {
        UI.layout_windows();
      }

    } else if(reply.name == 'relisttabs') {

      var wframe = UI.wMap[reply.wid]; 
      if(wframe) {
        wframe.empty();
        wframe.addTabs(reply.tabs);
        UI.layout_windows();
      } else {
        $c.debug('Skipping relisttabs for '+reply.wid+' (likely saved/closed)');
      }

    } else if(reply.name == 'listsavedwindows') {
      load_bag(reply.windows);
    } else if(reply.name == 'unsavewindow') {
      openSavedWindow(reply.saved);
    } else if(reply.name == 'savewindow') {
      var wframe = UI.wMap[reply.wid]; 
      $c.assert(wframe, 'savewindow wframe not found '+reply.wid);
      wframe.destroy();

      chrome.windows.remove(parseInt(reply.wid));
      bgport.postMessage({ name:'listsavedwindows' });
    } else if(reply.name == 'tabmovenew') {
      $c.assert(UI.pendingWin);
      UI.pendingWin.windb = { wid : reply.wid, title : null };
      UI.wMap[reply.wid] = UI.pendingWin;
      UI.pendingWin.elem.attr('id', ''+reply.wid);
      for(var i in UI.pendingWin.tabArray) {
        UI.pendingWin.tabArray[i].tabdb.wid = reply.wid;
      }
      UI.layout_windows();
      UI.pendingWin = null;
    } 
  }
);

chrome.extension.onConnect.addListener(
  function(port) {
    console.assert(port.name == 'bg2ui');
    port.onMessage.addListener(
      function(op) {
        if(op.name == 'addtab') {
          var wframe = UI.wMap[op.tab.wid];
          bgport.postMessage(
            { name:'relisttabs',
              wid : op.tab.wid });
        } else if(op.name == 'removetab') {
          var wframe = UI.wMap[op.tab.wid];
          bgport.postMessage(
            { name:'relisttabs',
              wid : op.tab.wid });
        } else if(op.name == 'updatetab') {

          var tab = UI.tMap[op.tab.tid]; console.assert(tab);
          $('.favicon', tab.elem)
            .attr('src', op.tab.faviconurl);
          $('.title', tab.elem)
            .text(op.tab.title);
          tab.tabdb = op.tab;

        } else if(op.name == 'addwindow') {
          var wframe = new WinFrame(op.win);
          UI.wMap[op.win.wid] = wframe;
        } else if(op.name == 'removewindow') {
          var wframe = UI.wMap[op.win.wid]; 
          if(wframe) wframe.destroy();
        } else {
          console.error('Unknown command : '+op.name);
        }
      }
    );
  }
);

