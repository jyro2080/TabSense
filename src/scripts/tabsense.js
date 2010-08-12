var FACEBOOK_PAGE_HTML = '<iframe src="http://www.facebook.com/plugins/likebox.php?id=139713996058999&amp;width=500&amp;connections=10&amp;stream=true&amp;header=false&amp;height=555" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:555px;" allowTransparency="true"></iframe>';
var SOURCE_URL = 'http://github.com/jyro2080/TabSense'
var BUGS_URL = 'http://github.com/jyro2080/TabSense/issues'

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

function setup_windows() {
    chrome.extension.sendRequest( {action:'listwindows'}, 
        function(results) { 
            for(var i=0; i < results.length; i++) {
                var w = results[i];
                var wf = new WinFrame(w);
                windowMap[w.wid] = wf;
                windowList[i] = wf;
                $('body').append(wf.elem);
                chrome.extension.sendRequest(
                    { action:'listtabs', condition:'WHERE wid = '+w.wid }, 
                    function(results) {
                        var t;
                        for(var i=0; i < results.length; i++) {
                            t = results[i];
                            tabMap[t.tid] = t;
                            windowMap[t.wid].addTab(new Tab(t));
                        }
                        windowMap[t.wid].refreshStyle();

                        doneWindows++;
                        if(doneWindows == windowList.length) {
                            layout_windows();
                        }
                    }
                );
            }
        }
    );
}
$(document).ready(function(){
    dw = $(document).width();
    dh = $(document).height();

    winw = parseInt(dw/NUMCOL);

    setup_windows();

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

    chrome.extension.onRequest.addListener(
        function(request, sender, sendResponse) {
            console.log(sender.tab ?
                        "from a content script:" + sender.tab.url :
                        "from the extension");
            if (request.msg == "RELOAD") {
                window.location.reload();
            }
        }
    );
});

function load_bag() {
    var bagWinList = Bag.list();
    $('#bagbar').empty();
    var bagl = bagWinList.length;
    if(bagl > 0) {
        $('#bagbar').append($('<img/>').attr('src', WinFrame.saveIcon));
    }
    for(var i=0; i < bagl; i++) {
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
            var wf = new WinFrame(win, saved.title);
            windowMap[win.id] = wf;
            windowList.push(wf);
            $('body').append(wf.elem);

            var totalTabs = saved.tabs.length;
            var tabTitleMap = {};
            var tabFavIconMap = {};

            for(var i=0; i<totalTabs; i++) {
                var t = saved.tabs[i];
                tabTitleMap[t.url] = t.title;
                tabFavIconMap[t.url] = t.favIconUrl;
                chrome.tabs.create({
                    windowId : win.id,
                    index : t.index,
                    url : t.url,
                    selected : t.selected
                }, 
                function(tab) {
                    var title = tabTitleMap[tab.url];
                    var favIconUrl = tabFavIconMap[tab.url];
                    wf.addTab(new Tab(tab, title, favIconUrl));
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
                tab_selector = 'tab_'+tabMap[i].tid;
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
