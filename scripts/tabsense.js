
function processTabs(tabs) {
    var tl = tabs.length;
    for(var j=0; j < tl; j++) {
        var tab = tabs[j];
        var wid = tab.windowId
        var tid = tab.id;

        var mtab = $('<div></div>').attr('class','mtab')
                    .attr('id','tab_'+tid);

        var favicon = $('<img/>');
        if(tab.favIconUrl) {
            favicon.attr('src', tab.favIconUrl)
                        .attr('class','favicon')
                        .width('24px')
                        .height('24px');
        } else {
            favicon.attr('src', chrome.extension.getURL('images/icon.png'))
                        .attr('class','favicon')
                        .width('24px')
                        .height('24px');
        }
            mtab.append(favicon);

        tabtitle = $('<div></div>')
                .attr('class','title').text(tab.title);
        mtab.append(tabtitle);

        windowMap[wid].append(mtab);
    }
    $('.mtab:even',windowMap[wid]).css('background','#eee');
    $('.mtab:odd',windowMap[wid]).css('background','#ddd');
    $('.mtab', windowMap[wid]).click(function(ev) {
        var match = /tab_(\d+)/.exec($(this).attr('id'));
        if(match && match[1]) {
            chrome.tabs.update(parseInt(match[1]), {selected : true});
        }
    });
}

var windowMap = [];

$(document).ready(function(){

    chrome.windows.getAll(null, 
        function(windows) {

            var wl = windows.length;
            for(var i=0; i < wl; i++) {

                var mwin = $('<div></div>').attr('class','mwin')
                            .text(''+windows[i].id);
                windowMap[windows[i].id] = mwin; 
                $('body').append(mwin);

                chrome.tabs.getAllInWindow(windows[i].id, processTabs);
            }
        }
    );
    
    $('#creator').css('top',($(document).height()-50)+'px');
    $('#creator').css('left',($(document).width()-140)+'px');
});
