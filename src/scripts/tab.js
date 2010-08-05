function Tab(rtab) {
    this.elem = $('<div></div>').attr('class','mtab')
                .attr('id','rtab_'+rtab.id);

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

    this.elem.click(Tab.clicked);
    this.elem.mouseenter(this.mouseenter);
    this.elem.mouseleave(this.mouseleave);

    this.elem.append(rtabtitle);
}

Tab.fallbackIcon = chrome.extension.getURL('images/icon28.png');
Tab.starOn = chrome.extension.getURL('images/favon.png');
Tab.starOff = chrome.extension.getURL('images/favoff.png');

Tab.clicked = function() {
    var match = /tab_(\d+)/.exec($(this).attr('id'));
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

Tab.prototype = {
    mouseenter : function(ev) {
        $('.star', $(this)).show();
    },

    mouseleave : function(ev) {
        $('.star', $(this)).hide();
    }
}

