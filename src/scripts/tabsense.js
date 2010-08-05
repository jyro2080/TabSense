
function processTabs(realtabs) {
    var tl = realtabs.length;
    var wid;
    for(var j=0; j < tl; j++) {
        var rtab = realtabs[j];
        wid = rtab.windowId

        tabMap[rtab.id] = rtab;

        mtab = new Tab(rtab);

        windowMap[wid].append(mtab.elem);
    }
    $('.mtab:even',windowMap[wid]).css('background','#eeeeee');
    $('.mtab:odd',windowMap[wid]).css('background','#e0e0e0');

    $('.mtab', windowMap[wid]).css({'width': (winw-50)+'px'})
    $('.mtab > div', windowMap[wid]).css({'width': (winw-140)+'px'})

    $('.mtab:last', windowMap[wid]).css({
        '-webkit-border-bottom-left-radius':'15px',
        '-webkit-border-bottom-right-radius':'15px'
    });

    doneWindows.push({wid:wid,numtabs:tl});

    if(doneWindows.length == windowList.length) {
        layout_windows();
    }


    /*
    $('.mtab', windowMap[wid]).mousedown(function(ev) {
        /*
        var match = /tab_(\d+)/.exec($(this).attr('id'));
        if(match && match[1]) {
            tabOnMove = tabMap[parseInt(match[1])];

            tabOnMove = createTab(tabOnMove);
        }
        * /

        tabOnMove = $(this);
        console.log(tabOnMove.html());
        tabOnMove.css({
            'position' : 'absolute',
            'top' : ev.clientY+'px',
            'left' : ev.clientX+'px'
        });

        tabOnMove.detach();
        $('body').append(tabOnMove);
    });
    $(document).mouseup(function(ev) {
        tabOnMove = null;        
    });
    $(document).mousemove(function(ev) {
        if(tabOnMove) {
            tabOnMove.css({
                'top' : ev.clientY+'px',
                'left' : ev.clientX+'px'
            });
        }
    });
    */
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
            var mwin = windowMap[wid];
            mwin.css({
                'left' : (i * winw + (i+0.5) * HMARGIN)+'px',
                'top' : ceiling+'px'
            });
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

    function create_window_title(title) {
        return $('<div></div>')
            .text(title)
            .css({
                'color' : '#eee',
                'margin-top' : '5px',
                'text-align':'center'
            })
            .click(title_modifier);
    }

    function create_window_title_input() {
        var inp = $('<input></input>')
            .css({
                'height':'25px',
                'width':'300px',
                'text-align':'center',
                'color' : '#eee',
                'background-color' : '#777'
            });
        var inpw = $('<div></div>')
            .css({
                'margin-top' : '5px',
                'height':'25px',
                'text-align':'center'
            });
        inpw.append(inp);
        return { wrapper:inpw, inp:inp };
    }

    function title_modifier() {
        var p = $(this).parent();
        var oldtitle = $(this).text();
        $(this).remove();    

        var ninput = create_window_title_input();
        p.append(ninput.wrapper);
        ninput.inp.val(oldtitle);
        ninput.inp.focus();
        ninput.inp.blur(function() {
            var p = $(this).parent().parent();
            $(this).parent().remove();    
            var newtitle = $(this).val();
            if($.trim(newtitle) == '') {
                newtitle = oldtitle;
            }
            var wtitle = create_window_title(newtitle);
            var wid = p.parent().attr('id');
            window.localStorage.setItem(
                'window_title_'+wid, newtitle);
            p.prepend(wtitle);
        });
    }

    chrome.windows.getAll(null, 
        function(windows) {

            var wl = windows.length;
            for(var i=0; i < wl; i++) {

                var mwin = $('<div></div>')
                            .attr('class','mwin')
                            .attr('id', windows[i].id);
                var title_str = window.localStorage.getItem(
                                    'window_title_'+windows[i].id);
                if(title_str) {
                    var text = create_window_title(title_str);
                } else {
                    var text = create_window_title("Name this window");
                }
                var wtitle = $('<div></div>')
                    .attr('class','wtitle')
                    .css({
                        'color' : '#eee',
                        'height':'30px',
                        '-webkit-border-top-left-radius':'15px',
                        '-webkit-border-top-right-radius':'15px',
                        'text-align':'center'
                    })
                wtitle.append(text);
                mwin.append(wtitle);

                windowMap[windows[i].id] = mwin; 
                windowList[i] = mwin;

                $('body').append(mwin);

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
});

function blur_all_tabs(yes)
{
    if(yes) {
        even_color = '#f0f0f0';
        odd_color = '#e2e2e2';
        text_color = '#aaa';
    } else {
        even_color = '#eeeeee';
        odd_color = '#e0e0e0';
        text_color = '#000';
    }
    var wl = windowList.length;
    for(var i=0; i < wl; i++) {
        var win = windowList[i];
        $('.mtab:even',win).css('background', even_color);
        $('.mtab:odd',win).css('background', odd_color);
        $('.mtab',win).css('color', text_color);
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
                    $('#'+tab_selector, windowList[j]).css({
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
