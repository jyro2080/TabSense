var $c = console;

var NUMCOL = 1;
var bgport;
var inPopup = true;
var windb = null;

function open_channel() {
  bgport = chrome.extension.connect({ name:'pop2bg' });
  chrome.extension.sendRequest({name:'register'});

  bgport.onMessage.addListener(function(reply) {
    if(reply.name == 'getcurwindow') {
      windb = { wid : reply.wid, title : reply.title };
      bgport.postMessage({ name:'listtabs', wid:reply.wid });
    } else if(reply.name == 'listtabs') {
      $c.assert(windb);
      set_document_height(reply.tabs.length);

      wframe = new WinFrame({ wid:windb.wid, title:windb.title });
      wframe.addTabs(reply.tabs);
    }
  });
}

function set_document_height(numtabs) {
  var maxH = Math.min(screen.height - 100, 650);
  var h = 60 + numtabs*(UI.TAB_HEIGHT+2*UI.TAB_PADDING);
  while(h > maxH) {
    UI.scale--;
    UI.setSize();
    h = 60 + numtabs*(UI.TAB_HEIGHT+2*UI.TAB_PADDING);
  }
  $('body').css('font-size', UI.FONT_SIZE+'px');
  $('body').css('minHeight', Math.min(h, maxH)+'px');
}

$(document).ready(function(){
  open_channel();
  ui = UI();
  bgport.postMessage({ name:'getcurwindow' });
  $('#allwin a').click(function() {
    chrome.tabs.create({url:
      chrome.extension.getURL('newtab.html')});
  });
});
