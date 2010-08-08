
function WinFrame(rwindow) { 
    this.tabArray = [];
    this.numTabs = 0;
    this.real = rwindow;
    this.elem = $('<div></div>').attr('class','mwin').attr('id', ''+rwindow.id);

    var title_str = window.localStorage.getItem('window_title_'+rwindow.id);
    if(title_str) {
        var text = WinFrame.createTitle(title_str);
    } else {
        var text = WinFrame.createTitle("Name this window");
    }

    var save_icon = $('<img/>').attr('class','saveicon')
                .attr('src', WinFrame.saveIcon)
                .click(WinFrame.saveWindow);

    var wtitle = $('<div></div>').attr('class','wtitle');
    wtitle.append(save_icon);
    wtitle.append(text);
    this.elem.append(wtitle);
}

WinFrame.saveIcon = chrome.extension.getURL('images/save.png');

WinFrame.saveWindow = function(ev) {
    var wid = $(this).parent().parent().attr('id');
    var title = window.localStorage.getItem('window_title_'+wid);
    var win = windowMap[wid];
    Bag.save(win, title);
    win.destroy();
    chrome.windows.remove(win.real.id);
    load_bag();
}

WinFrame.createTitle = function(title) {
    return $('<div></div>').attr('class','text').text(title)
        .click(WinFrame.editTitle)
        .css('width',(winw-100)+'px');
}

WinFrame.createTitleInput = function() {
    var inp = $('<input></input>');
    var inpw = $('<div></div>');
    inpw.append(inp);
    return { wrapper:inpw, inp:inp };
}

WinFrame.editTitle = function() {
    var p = $(this).parent();
    var oldtitle = $(this).text();
    $(this).remove();    

    var ninput = WinFrame.createTitleInput();
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
        var wtitle = WinFrame.createTitle(newtitle);
        var wid = p.parent().attr('id');
        window.localStorage.setItem(
            'window_title_'+wid, newtitle);
        p.append(wtitle);
    });
}

WinFrame.prototype = {
    
    addTab : function(tab) {
        this.elem.append(tab.elem);
        this.tabArray.push(tab);
        tab.parent = this;
        this.numTabs++;
    },

    removeTab : function(tab) {
        tab.elem.detach();
        $('body').append(tab.elem);
        this.numTabs--;

        if(this.numTabs == 0) {
            this.destroy();
        }
    },

    destroy : function() {
        this.elem.detach();
        windowMap.splice(this.real.id, 1);
        var idx = windowList.indexOf(this);
        windowList.splice(idx, 1);

        for(var i=0; i < winColumns.length; i++) {
            var tmp = winColumns[i].indexOf(this);
            if(tmp >= 0) {
                winColumns[i].splice(tmp, 1);
                break;
            }
        }
    },

    refreshStyle : function() {
        $('.mtab:even',this.elem).css('background','#eeeeee');
        $('.mtab:odd',this.elem).css('background','#e0e0e0');

        $('.mtab', this.elem).css({'width': (winw-50)+'px'})
        $('.mtab > div', this.elem).css({'width': (winw-140)+'px'})

        $('.mtab:not(:last)', this.elem).css({
            '-webkit-border-bottom-left-radius':null,
            '-webkit-border-bottom-right-radius':null
        });
        $('.mtab:last', this.elem).css({
            '-webkit-border-bottom-left-radius':'15px',
            '-webkit-border-bottom-right-radius':'15px'
        });
    },

    setLocation : function(top, left) {
        this.elem.css({
            'left' : left+'px',
            'top' : top+'px'
        });
    },

    blurTabs : function() {
        var even_color = '#f0f0f0';
        var odd_color = '#e2e2e2';
        var text_color = '#aaa';
        $('.mtab:even', this.elem).css('background', even_color);
        $('.mtab:odd', this.elem).css('background', odd_color);
        $('.mtab', this.elem).css('color', text_color);
    },

    unblurTabs : function() {
        var even_color = '#eeeeee';
        var odd_color = '#e0e0e0';
        var text_color = '#000';
        $('.mtab:even', this.elem).css('background', even_color);
        $('.mtab:odd', this.elem).css('background', odd_color);
        $('.mtab', this.elem).css('color', text_color);
    },

    contains : function(x, y) {
        var t = parseInt(/(\d+)px/.exec(this.elem.css('top'))[1]);
        var l = parseInt(/(\d+)px/.exec(this.elem.css('left'))[1]);
        var b = t + this.elem.height();
        var r = l + this.elem.width();

        return ( (x>l) && (x<r) && (y>t) && (y<b) );
    }
}
