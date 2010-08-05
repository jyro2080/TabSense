
function WinFrame(rwindow) { 

    this.elem = $('<div></div>').attr('class','mwin').attr('id', ''+rwindow.id);

    var title_str = window.localStorage.getItem('window_title_'+rwindow.id);
    if(title_str) {
        var text = WinFrame.createTitle(title_str);
    } else {
        var text = WinFrame.createTitle("Name this window");
    }
    var wtitle = $('<div></div>').attr('class','wtitle');
    wtitle.append(text);
    this.elem.append(wtitle);
}

WinFrame.createTitle = function(title) {
    return $('<div></div>').attr('class','text').text(title)
        .click(WinFrame.editTitle);
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
        p.prepend(wtitle);
    });
}
