var FACEBOOK_PAGE_HTML = '<iframe src="http://www.facebook.com/plugins/likebox.php?id=139713996058999&amp;width=500&amp;connections=10&amp;stream=true&amp;header=false&amp;height=555" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:555px;" allowTransparency="true"></iframe>';
var SOURCE_URL = 'http://github.com/jyro2080/TabSense'
var BUGS_URL = 'http://github.com/jyro2080/TabSense/issues'


/*
function layout_windows() {
    windowMap.sort(function(a,b) { return (b.numTabs-a.numTabs); });
    for(var i=0; i<NUMCOL; i++) {winColumns[i]=[];}

    function columnNumber(counter) {
        var r = parseInt(counter / NUMCOL);
        var c = counter % NUMCOL;
        return ( ((r % 2) == 0) ? c : (NUMCOL-1-c) );
    }


    var colCount = 0;
    for(i in windowMap) {

        colCount = columnNumber(i);

        var wh = windowMap[i].elem.height();

        if(!winColumns[colCount]) winColumns[colCount] = [];

        windowMap[i].setLocation(
            getColumnHeight(colCount),
            (colCount*windowMap[i].elem.width()+(colCount+0.5) * HMARGIN));

        winColumns[colCount].push(windowMap[i]);
    }
}
*/

function get_column(x) {
    var width;
    for(i in windowMap) {
        width = windowMap[i].elem.width();
        break;
    }
    return parseInt((x - 0.5*HMARGIN)/width);
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
var doneWindows = 0;
var dw, dh, winw;
var HMARGIN = 30;
var VMARGIN = 20;
var NUMCOL = 3;
var CEILING = 50;

var total_window = 0;

function process_windows(windows) {
    UI.totalWindows = windows.length;
    for(var i=0; i < UI.totalWindows; i++) {
        var w = windows[i];
        UI.add_window(w);

        bgport.postMessage({ name:'listtabs',condition:'WHERE wid = '+w.wid });
    }
}

function process_tabs(tabs) {
    var t = null;
    for(var i=0; i < tabs.length; i++) {
        t = tabs[i];
        UI.add_tab(t);
    }
    if(t) { UI.restyle_window(t.wid); }
    else { console.warn('No tab for window restyle'); }

}

function reprocess_tabs(tabs) {
    if(tabs.length == 0) {
        console.warn('No tabs to reprocess'); return;
    }
    var wframe = UI.wMap[tabs[0].wid];
    $('.mtab', wframe.elem).remove();
    process_tabs(tabs);
}

var ui;
$(document).ready(function(){

    ui = UI(); 

    bgport.postMessage({ name:'listwindows' }); // trigger setup windows

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

    $('#creator').css('top',(UI.dh-40)+'px');
    $('#creator').css('left',(UI.dw-120)+'px');

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
        'top' : (UI.dh-40)+'px',
        'width' : (UI.dw-140)+'px'
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
    var left = (UI.dw - ipw)/2;
    var top = (UI.dh - iph)/2;
    $('#infopanel').css({
        'left' : left+'px',
        'top' : top+'px'
    });
}

function blur_all_tabs(yes)
{
    for(i in windowMap) {
        var win = windowMap[i];
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
                for(j in windowMap) {
                    $('#'+tab_selector, windowMap[j].elem).css({
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
