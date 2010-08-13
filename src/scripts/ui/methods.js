
function UI() 
{
    UI.dw = $(document).width();
    UI.dh = $(document).height();

    UI.winw = parseInt(UI.dw/NUMCOL);

    UI.columns = new Array(NUMCOL);
}

UI.wMap = [];
UI.tMap = [];

UI.add_window = function(windb) {
    var wframe = new WinFrame(windb);
    UI.wMap[windb.wid] = wframe;
    $('body').append(wframe.elem);
}

UI.remove_window = function(windb) {
    var wframe = UI.wMap[windb.wid];
    if(!wframe) { console.error('No UI window for '+windb.wid); return; }
    wframe.destroy();
    UI.wMap[windb.wid] = undefined;
}

UI.restyle_window = function(wid) {
    UI.wMap[wid].refreshStyle();
}

UI.attach_tab = function(wid, tabdb) {
    var tab = UI.tMap[tabdb.tid];
    if(!tab) { console.error('No UI tab for '+tabdb.tid); return; }
    var wframe = UI.wMap[wid];
    if(!wframe) { console.error('No UI window for '+wid); return; }
    wframe.addTab(tab);
    wframe.refreshStyle();
}

UI.add_tab = function(tabdb) {
    var tab = new Tab(tabdb);
    UI.tMap[tabdb.tid] = tab;
    UI.attach_tab(tabdb.wid, tabdb);
}

UI.detach_tab = function(tabdb, ev) {
    var tab = UI.tMap[tabdb.tid];
    if(!tab) { console.error('No UI tab for '+tabdb.tid); return; }
    if(ev) {
        tab.detach(ev.clientY-15, ev.clientX - UI.winw/2);
    } else {
        tab.detach(0,0);
    }
    var wframe = UI.wMap[tabdb.wid];
    wframe.removeTab(tab);
    wframe.refreshStyle();
}

UI.remove_tab = function(tabdb) {
    var tab = UI.tMap[tabdb.tid];
    UI.detach_tab(tabdb);
    tab.elem.remove();
    UI.tMap[tabdb.tid] = undefined;
}

UI.update_tab = function(tabdb) {
    var tab = UI.tMap[tabdb.tid]; 
    if(!tab) { console.error('No tab in UI for '+tabdb.tid); return; }
    $('.favicon', tab.elem).attr('src', tabdb.faviconurl);
    $('.title', tab.elem).text(tabdb.title);
    tab.tabdb = tabdb;
}


UI.columnNumber = function(counter) {
    var r = parseInt(counter / NUMCOL);
    var c = counter % NUMCOL;
    return ( ((r % 2) == 0) ? c : (NUMCOL-1-c) );
}

UI.getColumnHeight = function(colNum) 
{
    var h = CEILING;
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
    for(i in wMapCopy) {

        colCount = UI.columnNumber(i);

        if(!wMapCopy[i]) continue;

        var wh = wMapCopy[i].elem.height();

        if(!UI.columns[colCount]) UI.columns[colCount] = [];

        wMapCopy[i].setLocation(
            UI.getColumnHeight(colCount),
            (colCount*wMapCopy[i].elem.width()+(colCount+0.5) * HMARGIN));

        UI.columns[colCount].push(wMapCopy[i]);
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
