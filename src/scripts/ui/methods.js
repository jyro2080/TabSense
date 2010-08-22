
function UI() 
{
  UI.dw = $(document).width();
  UI.dh = $(document).height();

  UI.winw = parseInt(UI.dw/NUMCOL);

  UI.columns = new Array(NUMCOL);

  UI.scale = 0;
  UI.setSize();

  UI.BAGBAR_HEIGHT = 40;
  UI.CEILING = 50;
  UI.DEPTH_STEP = 20;
}

UI.setSize = function() {
  UI.TAB_HEIGHT = 35 + UI.scale * 3;
  UI.TAB_PADDING = 5 + UI.scale * 1;
  UI.WTITLE_HEIGHT = 30 + UI.scale * 3;
  UI.WTITLE_INNER_HEIGHT = 25 + UI.scale * 3;
  UI.TAB_IMG_DIM = 24 + UI.scale * 3;
  UI.TAB_IMG_MARGIN = 8 + UI.scale * 1;
  UI.TAB_NODE_DIM = 12 + parseInt(UI.scale * 0.3);
  UI.TAB_NODE_MARGIN_TOP = 13 + UI.scale * 2;
  UI.TAB_NODE_MARGIN_BOTTOM = 15 + UI.scale * 2;
  UI.FONT_SIZE = 14 + parseInt(UI.scale * 0.5);
  UI.WTITLE_IMG_DIM = 24 + UI.scale * 3;
  UI.TAB_TITLE_PADDING_TOP = 10 + UI.scale * 2;
}

UI.wMap = [];
UI.tMap = [];

UI.columnNumber = function(counter) {
  var r = parseInt(counter / NUMCOL);
  var c = counter % NUMCOL;
  return ( ((r % 2) == 0) ? c : (NUMCOL-1-c) );
}

UI.getColumnHeight = function(colNum) 
{
  var h = UI.CEILING;
  for(var i=0; i < UI.columns[colNum].length; i++) {
    var w = UI.columns[colNum][i];
    var height = w.elem.height() + VMARGIN;
    h += height;
  }
  return h;
}

UI.layout_windows = function() {
  wMapCopy = UI.wMap.slice(0);
  wMapCopy.sort(function(a,b) { return (b.numTabs-a.numTabs); });
  for(var i=0; i<NUMCOL; i++) { UI.columns[i]=[]; }

  var colCount = 0;
  for(var i in wMapCopy) {

    colCount = UI.columnNumber(i);

    if(!wMapCopy[i]) continue;

    var wh = wMapCopy[i].elem.height();

    if(!UI.columns[colCount]) UI.columns[colCount] = [];

    wMapCopy[i].setLocation(
      UI.getColumnHeight(colCount),
      (colCount*wMapCopy[i].elem.width()+(colCount+0.5) * HMARGIN));

    UI.columns[colCount].push(wMapCopy[i]);
  }

  for(var i=0; i<NUMCOL; i++) {
    var ch = UI.getColumnHeight(i);
    if(ch > (UI.dh - UI.BAGBAR_HEIGHT)) {
      UI.scale--;
      UI.setSize();
      // remove all windows
      for(var j in UI.wMap) {
        if(UI.wMap[j]) UI.wMap[j].destroy();
      }

      // trigger setup windows
      bgport.postMessage({ name:'listwindows' }); 

      break;
    }
  }

  // Show all windows
  for(var i in UI.wMap) {
    if(UI.wMap[i]) UI.wMap[i].elem.show();
  }
}

UI.get_column = function(x) {
  var width;
  for(i in UI.wMap) {
    width = UI.wMap[i].elem.width();
    break;
  }
  return parseInt((x - 0.5*HMARGIN)/width);
}

UI.relayout_column = function(colnum) {
  var column = UI.columns[colnum];
  var wl = column.splice(0); // copy array and empty it
  for(var i=0; i < wl.length; i++) {
    var win = wl[i];
    win.setLocation(
      UI.getColumnHeight(colnum),
      colnum * win.elem.width() + (colnum+0.5) * HMARGIN);
    column.push(wl[i]);
  }
  
}
