var FACEBOOK_PAGE_HTML = '<iframe src="http://www.facebook.com/plugins/likebox.php?id=139713996058999&amp;width=500&amp;connections=10&amp;stream=true&amp;header=false&amp;height=555" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:555px;" allowTransparency="true"></iframe>';
var SOURCE_URL = 'http://github.com/jyro2080/TabSense'
var BUGS_URL = 'http://github.com/jyro2080/TabSense/issues'


function processTabs(realtabs) {
    var tl = realtabs.length;
    var wid;
    for(var j=0; j < tl; j++) {
        var rtab = realtabs[j];
        wid = rtab.windowId;

        tabMap[rtab.id] = rtab;

        mtab = new Tab(rtab);

        windowMap[wid].addTab(mtab);
    }

    windowMap[wid].refreshStyle();

    doneWindows++;

    if(doneWindows == windowList.length) {
        layout_windows();
    }
}

var tabOnMove = null;

function getColumnHeight(colNum) {
    var h = CEILING;
    for(var i=0; i < winColumns[colNum].length; i++) {
        var w = winColumns[colNum][i];
        var height = w.elem.height() + VMARGIN;
        h += height;
    }
    return h;
}

function layout_windows() {
    windowList.sort(function(a,b) { return (b.numTabs-a.numTabs); });
    for(var i=0; i<NUMCOL; i++) {winColumns[i]=[];}

    function columnNumber(counter) {
        var r = parseInt(counter / NUMCOL);
        var c = counter % NUMCOL;
        return ( ((r % 2) == 0) ? c : (NUMCOL-1-c) );
    }


    var colCount = 0;
    for(var i=0; i < windowList.length; i++) {

        colCount = columnNumber(i);

        var wh = windowList[i].elem.height();

        if(!winColumns[colCount]) winColumns[colCount] = [];

        windowList[i].setLocation(
            getColumnHeight(colCount),
            (colCount*windowList[i].elem.width()+(colCount+0.5) * HMARGIN));

        winColumns[colCount].push(windowList[i]);
    }
}

function get_column(x) {
    return parseInt((x - 0.5*HMARGIN)/windowList[0].elem.width());
}
function relayout_column(colnum) {
    var column = winColumns[colnum];
    var wl = column.splice(0); // copy array and empty it
    for(var i=0; i < wl.length; i++) {
        var win = wl[i];
        win.setLocation(
            getColumnHeight(colnum),
            colnum * win.elem.width() + (colnum+0.5) * HMARGIN);
        column.push(wl[i]);
    }
    
}

var winColumns = new Array(NUMCOL);

var tabMap = [];
var windowMap = [];
var windowList = [];
var doneWindows = 0;
var dw, dh, winw;
var HMARGIN = 30;
var VMARGIN = 20;
var NUMCOL = 3;
var CEILING = 50;

$(document).ready(function(){

    dw = $(document).width();
    dh = $(document).height();

    winw = parseInt(dw/NUMCOL);

    chrome.windows.getAll(null, 
        function(windows) {

            var wl = windows.length;
            for(var i=0; i < wl; i++) {

                var mwin = new WinFrame(windows[i]);

                windowMap[windows[i].id] = mwin;
                windowList[i] = mwin;

                $('body').append(mwin.elem);

                chrome.tabs.getAllInWindow(windows[i].id, processTabs);
            }
        }
    );
    refresh_favorites();
    
    $('#topbar #search').focus(function() {
        run_query('');
    });
    $('#topbar #search').blur(function() {
        blur_all_tabs(false);
    });

    $('#topbar #search').keyup(function() {
        run_query($(this).val());
    });

    $('#creator').css('top',(dh-40)+'px');
    $('#creator').css('left',(dw-120)+'px');

    $('#topbar #info').click(function(ev) {
        if($.trim($('#infopanel').html()) === '') {

            var topline = $('<div></div>').attr('id','topline')
                .append('<a href="'+SOURCE_URL+'">Source</a>'+
                    '&nbsp;&nbsp;&nbsp;'+
                    '<a href="'+BUGS_URL+'">Bugs/Features</a>'+
                    '&nbsp;&nbsp;&nbsp;'+
                    '<a id="close" href="#">Close</a>');
            
            $('#infopanel')
                .append(topline)
                .append(FACEBOOK_PAGE_HTML);
        }
        $('#infopanel').show();
    });

    $('#infopanel #close').click(function() { 
        $(this).hide(); 
    });
    $('#infopanel').click(function() { 
        $(this).hide(); 
    });

    position_infopanel();

    $('#bagbar').css({
        'top' : (dh-40)+'px',
        'width' : (dw-140)+'px'
    })

    load_bag();
});

function load_bag() {
    var bagWinList = Bag.list();
    $('#bagbar').empty();
    for(var i=0; i < bagWinList.length; i++) {
        var w = bagWinList[i];
        var entry = $('<div></div>')
                .attr('class','winentry')
                .attr('id', w.id)
                .text(w.title)
                .click(bagEntryClicked);
        $('#bagbar').append(entry);
    }
}

function bagEntryClicked(ev) {
    var id = $(this).attr('id');
    var saved = Bag.remove(id); 

    chrome.windows.create(null,
        function(win) {
            var wf = new WinFrame(win);
            windowMap[win.id] = wf;
            windowList.push(wf);
            $('body').append(wf.elem);

            var totalTabs = saved.tabs.length;

            for(var i=0; i<totalTabs; i++) {
                var t = saved.tabs[i];
                chrome.tabs.create({
                    windowId : win.id,
                    index : t.index,
                    url : t.url,
                    selected : t.selected
                }, 
                function(tab) {
                    wf.addTab(new Tab(tab));
                    if(wf.tabArray.length == totalTabs) {
                        wf.refreshStyle();
                        layout_windows();
                    }
                });
            }

        }
    );

    load_bag();
}

function position_infopanel() {
    var ipw = 550;
    var iph = 600;
    var left = (dw - ipw)/2;
    var top = (dh - iph)/2;
    $('#infopanel').css({
        'left' : left+'px',
        'top' : top+'px'
    });
}

function blur_all_tabs(yes)
{
    var wl = windowList.length;
    for(var i=0; i < wl; i++) {
        var win = windowList[i];
        (yes ? win.blurTabs : win.unblurTabs)();
    }
}

function run_query(query)
{
    blur_all_tabs(true);
    if($.trim(query) != '') {
        query = query.toLowerCase();
        for (i in tabMap) {
            var tabTitle = tabMap[i].title;
            if(tabTitle && tabTitle.toLowerCase().indexOf(query) >= 0) {
                tab_selector = 'tab_'+tabMap[i].id;
                var wl = windowList.length;
                for(var j=0; j < wl; j++) {
                    $('#'+tab_selector, windowList[j].elem).css({
                        'color':'#000'
                    });
                }
            }
        }
    }

}

function refresh_favorites()
{
    // Load favorite favicons
    var favlist = Fav.list();
    var fll = favlist.length;
    var favbar = $('#topbar #favbar');
    favbar.empty();
    for(var i=0; i < fll; i++) {
        if(favlist[i].favIconUrl) {
            var img = $('<img/>').attr('src',favlist[i].favIconUrl)
                                .width('24px')
                                .height('24px');
            var link = $('<a></a>').attr('href', favlist[i].url);
            link.append(img);
            favbar.append(link);
        }
    }
}
