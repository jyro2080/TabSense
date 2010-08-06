var FACEBOOK_PAGE_HTML = '<iframe src="http://www.facebook.com/plugins/likebox.php?id=139713996058999&amp;width=500&amp;connections=10&amp;stream=true&amp;header=false&amp;height=555" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:555px;" allowTransparency="true"></iframe>';
var SOURCE_URL = 'http://github.com/jyro2080/TabSense'
var BUGS_URL = 'http://github.com/jyro2080/TabSense/issues'


function processTabs(realtabs) {
    var tl = realtabs.length;
    var wid;
    for(var j=0; j < tl; j++) {
        var rtab = realtabs[j];
        wid = rtab.windowId

        tabMap[rtab.id] = rtab;

        mtab = new Tab(rtab);

        windowMap[wid].addTab(mtab);
    }

    windowMap[wid].refreshStyle();

    doneWindows.push({wid:wid,numtabs:tl});

    if(doneWindows.length == windowList.length) {
        layout_windows();
    }
}

var tabOnMove = null;

function layout_windows() {
    var total_tabs = 0;
    for(var i=0; i < doneWindows.length; i++) {
        total_tabs += doneWindows[i].numtabs;
    }
    tabs_per_col = parseInt(total_tabs/NUMCOL);
    doneWindows.sort(function(a,b) { return (a.numtabs-b.numtabs); });

    columns = new Array(NUMCOL);
    for(var i=0; i < NUMCOL; i++) {
        columns[i] = [];
        columntabs = 0;
        for(j=0; j < doneWindows.length; j++) {
            if(!doneWindows[j]) continue;

            if(doneWindows[j].numtabs + columntabs <= tabs_per_col ||
                i == (NUMCOL-1))
            {
                columns[i].push(doneWindows[j].wid);
                columntabs += doneWindows[j].numtabs;
                doneWindows[j] = null;
            }
        }
    }
    columns.sort(function(a,b) { return b.length-a.length; });
    for(var i=0; i < NUMCOL; i++) {
        var ceiling = CEILING;
        for(var j=0; j < columns[i].length; j++) {
            var wid = columns[i][j];
            windowMap[wid].setLocation(ceiling, (i*winw+(i+0.5) * HMARGIN));
            var mwin = windowMap[wid].elem;
            ceiling += mwin.height() + VMARGIN;
        }
    }
}

var tabMap = [];
var windowMap = [];
var windowList = [];
var doneWindows = [];
var dw, dh, winw;
var HMARGIN = 20;
var VMARGIN = 20;
var NUMCOL = 3;
var CEILING = 50;

$(document).ready(function(){

    dw = $(document).width();
    dh = $(document).height();

    winw = parseInt((dw/NUMCOL) - HMARGIN);

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

    $('#creator').css('top',(dh-50)+'px');
    $('#creator').css('left',(dw-140)+'px');

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

});

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
                console.log(tabTitle);
                tab_selector = 'tab_'+tabMap[i].id;
                console.log(tab_selector);
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
