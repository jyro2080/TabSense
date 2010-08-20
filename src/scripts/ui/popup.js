var $c = console;

var NUMCOL = 1;
var wframe;
var bgport;

function open_channel() {
  bgport = chrome.extension.connect({ name:'ui2bg' });
  bgport.postMessage({ name:'register', tabid : -1 });

  bgport.onMessage.addListener(function(reply) {
    if(reply.name == 'getcurwindow') {
      wframe = new WinFrame({ wid:reply.wid, title:reply.title });
      bgport.postMessage({ name:'listtabs', wid:reply.wid });
    } else if(reply.name == 'listtabs') {
      $c.assert(wframe);
      wframe.addTabs(reply.tabs);
      set_document_height(reply.tabs.length);
    }
  });
}

function set_document_height(numtabs) {
  $('body').css('minHeight', (50+numtabs*45)+'px');
}

$(document).ready(function(){
  open_channel();
  ui = UI();
  bgport.postMessage({ name:'getcurwindow' });
});
