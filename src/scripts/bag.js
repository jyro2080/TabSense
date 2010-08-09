function Bag() {}

Bag.generateId = function()
{
    var counter = -1;
    var cstr = window.localStorage.getItem('BagCounter');
    if(cstr) {
        counter = parseInt(cstr);
    }
    counter++;
    window.localStorage.setItem('BagCounter', counter);
    return counter;
}

Bag.list = function()
{
    var str = window.localStorage.getItem('WindowBag');
    if(str) {
        var savedWindowList = JSON.parse(str);
    } else {
        var savedWindowList = [];
    }

    var windows = [];
    for(var i=0; i < savedWindowList.length; i++) {
        var wid = savedWindowList[i];
        windows.push(JSON.parse(window.localStorage.getItem('Window_'+wid)));
    }
    return windows;
}

Bag.save = function(win, title)
{
    var id = Bag.generateId();
    if(!title) title = 'NoName';

    var str = window.localStorage.getItem('WindowBag');
    if(str) {
        var savedWindowList = JSON.parse(str);
    } else {
        var savedWindowList = [];
    }

    var tabs = [];
    for(var i=0; i < win.tabArray.length; i++) {
        var tab = win.tabArray[i].real;
        tabs.push({
            index : tab.index,
            selected : tab.selected,
            url : tab.url,
            title : tab.title,
            favIconUrl : tab.favIconUrl
        });
    }

    var window2Save = {
        id : id,
        title : title,
        tstamp : new Date().getTime(),
        tabs : tabs
    }

    savedWindowList.push(id);

    window.localStorage.setItem(
        'WindowBag', JSON.stringify(savedWindowList));

    window.localStorage.setItem(
        'Window_'+id, JSON.stringify(window2Save));
}

Bag.remove = function(winid)
{
    var str = window.localStorage.getItem('Window_'+winid);
    var win = JSON.parse(str);
    window.localStorage.removeItem('Window_'+winid);

    str = window.localStorage.getItem('WindowBag');
    if(str) {
        var savedWindowList = JSON.parse(str);
    } else {
        var savedWindowList = [];
    }
    var idx = -1;
    for(var i=0; i < savedWindowList.length; i++) {
        if(savedWindowList[i] == winid) {
            idx = i;
            break;
        }
    }
    savedWindowList.splice(idx, 1);
    window.localStorage.setItem(
        'WindowBag', JSON.stringify(savedWindowList));

    return win;
}
