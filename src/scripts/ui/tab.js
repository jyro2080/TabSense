function consume(ev) { return false; }

function Tab(tabdb, title, favIconUrl) {
    this.parent = null;
    this.tabdb = tabdb;
    this.elem = $('<div></div>').attr('class','mtab').attr('id','tab_'+tabdb.tid);
    var elem = this.elem;

    var favicon = $('<img/>');
    if(favIconUrl) {
        favicon.attr('src', favIconUrl).attr('class','favicon');
    } else if(tabdb.faviconurl) {
        favicon.attr('src', tabdb.faviconurl).attr('class','favicon');
    } else {
        favicon.attr('src', Tab.fallbackIcon).attr('class','favicon');
    }
    this.elem.append(favicon);

    this.staricon = $('<img/>');
    if(Fav.is(tabdb.url)) {
        this.staricon.attr('src', Tab.starOn);
    } else {
        this.staricon.attr('src', Tab.starOff);
    }
    this.staricon.attr('class','star');
    this.elem.append(this.staricon);
    this.staricon.hide();
    this.staricon.click(Tab.toggleFav).mousedown(consume).mouseup(consume);

    if(title) {
        rtabtitle = $('<div></div>').attr('class','title').text(title);
    } else {
        rtabtitle = $('<div></div>').attr('class','title').text(tabdb.title);
    }

    var tab = this;
    this.elem.mousedown(function(ev) { tab.pick(ev); });
    $(document).mousemove(function(ev) { tab.drag(ev); });
    $(document).mouseup(function(ev) { tab.drop(ev); });

    $('.favicon', this.elem).click(Tab.selectTab)
        .mousedown(consume).mouseup(consume).mousemove(consume);

    this.elem.mouseenter(Tab.mouseenter);
    this.elem.mouseleave(Tab.mouseleave);

    this.elem.append(rtabtitle);

    var STEP = 20;
    this.elem.css({
        'margin-left' : (STEP*tabdb.depth)+'px',
        'width' : (UI.winw-50-STEP*tabdb.depth)+'px'
    });
    $('div', this.elem).css({
        'width' : (UI.winw-140-STEP*tabdb.depth)+'px'
    });
        //$('.mtab', this.elem).css({'width': (UI.winw-50)+'px'})
        //$('.mtab > div', this.elem).css({'width': (UI.winw-140)+'px'})
}

Tab.fallbackIcon = chrome.extension.getURL('images/icon28.png');
Tab.starOn = chrome.extension.getURL('images/favon.png');
Tab.starOff = chrome.extension.getURL('images/favoff.png');

Tab.selectTab = function() {
    var match = /tab_(\d+)/.exec($(this).parent().attr('id'));
    if(match && match[1]) {
        chrome.tabs.update(parseInt(match[1]), {selected : true});
    }
    return false;
}

Tab.toggleFav = function() {
    var p = $(this).parent();
    var match = /tab_(\d+)/.exec(p.attr('id'));
    if(match && match[1]) {
        var tab = tabMap[parseInt(match[1])];
        if(Fav.is(tab.url)) {
            Fav.remove(tab.url);
            $(this).attr('src', Tab.starOff);
        } else {
            var fi = $(this).siblings('.favicon');
            Fav.add(tab.url, fi.attr('src'));
            $(this).attr('src', Tab.starOn);
        }
        refresh_favorites();
    } else {
        alert('Error recognizing the tab');
    }
    return false;
}

Tab.mouseenter = function(ev) {
    $('.star', $(this)).show();
},

Tab.mouseleave = function(ev) {
    $('.star', $(this)).hide();
}

Tab.prototype = {
    pick : function(ev) {
        UI.detach_tab(this);
        UI.relayout_column(UI.get_column(ev.clientX));
    },

    detach : function(top, left) {
        this.elem.css({
            'position':'absolute',
            'top' : top+'px',
            'left' : left+'px',
            '-webkit-box-shadow' : 'rgba(20,20,20,1) 1px 1px 5px'
            });
        this.inTransit = true;
    },

    drag : function(ev) {
        if(this.inTransit) {
            this.elem.css({
                'top' : (ev.clientY - 15)+'px',
                'left' : (ev.clientX - UI.winw/2)+'px'
            });
        }
    },

    attach : function() {
        this.inTransit = false;

        this.elem.css({
            'position':'relative',
            '-webkit-box-shadow' : null,
            'top':'0px',
            'left':'0px'
            });
    },

    drop : function(ev) {
        if(!this.inTransit) return;

        this.attach();

        // Check on which window are we dropping
        for(i in UI.wMap) {
            var win = UI.wMap[i];
            if(win.contains(ev.clientX, ev.clientY)) {
                win.addTab(this);
                win.refreshStyle();
                //chrome.tabs.move(this.tabdb.tid, 
                //    { windowId : win.windb.wid, index:100 });
                UI.relayout_column(UI.get_column(ev.clientX));
                return;
            }
        }

        /*
        // Not dropped on a window, create a new one
        var thistab = this;
        var dropcol = get_column(ev.clientX);

        function removeAllButThisTab(tabs) {
            for(var i=0; i < tabs.length; i++) {
                if(tabs[i].id != thistab.tabdb.tid) {
                    chrome.tabs.remove(tabs[i].id);
                }
            }
             
        }

        chrome.windows.create(null, 
            function(win) {

                var wf = new WinFrame(win);
                windowMap[win.id] = wf;
                windowList.push(wf);

                $('body').append(wf.elem);
                wf.addTab(thistab);
                wf.refreshStyle();
                winColumns[dropcol].push(wf);
                relayout_column(dropcol);

                chrome.tabs.move(thistab.tabdb.tid,
                    { windowId : win.id, index:0 },
                    function() {
                        chrome.tabs.getAllInWindow(
                            win.id, removeAllButThisTab);
                    });
            }
        );
        */
    },
}

