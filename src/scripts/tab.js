function Tab(rtab) {
    this.real = rtab;
    this.parent = null;
    this.elem = $('<div></div>').attr('class','mtab').attr('id','tab_'+rtab.id);
    var elem = this.elem;

    var favicon = $('<img/>');
    if(rtab.favIconUrl) {
        favicon.attr('src', rtab.favIconUrl).attr('class','favicon');
    } else {
        favicon.attr('src', Tab.fallbackIcon).attr('class','favicon');
    }
    this.elem.append(favicon);

    this.staricon = $('<img/>');
    if(Fav.is(rtab.url)) {
        this.staricon.attr('src', Tab.starOn);
    } else {
        this.staricon.attr('src', Tab.starOff);
    }
    this.staricon.attr('class','star');
    this.elem.append(this.staricon);
    this.staricon.hide();
    this.staricon.click(Tab.toggleFav);

    rtabtitle = $('<div></div>').attr('class','title').text(rtab.title);

    var tab = this;
    this.elem.mousedown(function(ev) { tab.pick(ev); });
    $(document).mousemove(function(ev) { tab.drag(ev); });
    $(document).mouseup(function(ev) { tab.drop(ev); });

    $('.favicon', this.elem).click(Tab.selectTab);

    this.elem.mouseenter(Tab.mouseenter);
    this.elem.mouseleave(Tab.mouseleave);

    this.elem.append(rtabtitle);
}

Tab.fallbackIcon = chrome.extension.getURL('images/icon28.png');
Tab.starOn = chrome.extension.getURL('images/favon.png');
Tab.starOff = chrome.extension.getURL('images/favoff.png');

Tab.selectTab = function() {
    var match = /tab_(\d+)/.exec($(this).parent().attr('id'));
    if(match && match[1]) {
        chrome.tabs.update(parseInt(match[1]), {selected : true});
    }
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
        this.elem.css({
            'position':'absolute',
            'top' : (ev.clientY - 15)+'px',
            'left' : (ev.clientX - winw/2)+'px'
            });
        this.elem.detach();
        $('body').append(this.elem);
        this.inTransit = true;
        this.parent.refreshStyle();
    },

    drag : function(ev) {
        if(this.inTransit) {
            this.elem.css({
                'top' : (ev.clientY - 15)+'px',
                'left' : (ev.clientX - winw/2)+'px'
            });
        }
    },

    drop : function(ev) {
        if(!this.inTransit) return;

        this.inTransit = false;

        // Check on which window are we dropping
        var wl = windowList.length;
        for(var i=0; i < wl; i++) {
            var win = windowList[i];
            if(win.contains(ev.clientX, ev.clientY)) {
                var title_str = window.localStorage.getItem(
                        'window_title_'+win.real.id);
                console.log(title_str);
                this.elem.css({
                    'position':'relative',
                    'top':'0px',
                    'left':'0px'
                    });
                win.addTab(this);
                win.refreshStyle();
                console.log('Moving '+this.real.id+' to '+win.real.id);
                chrome.tabs.move(this.real.id, 
                    { windowId : win.real.id, index:100 });
                break;
            }
        }
    },
}

