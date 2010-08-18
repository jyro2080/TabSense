
var fallbackIcon = chrome.extension.getURL('images/icon28.png');
var rotateFavIcon = chrome.extension.getURL('images/rotate.gif');

function sanitizeFavIcon(fi) {
    if(fi === undefined || fi === null || fi.length == 0) {
        return fallbackIcon;
    } else {
        return fi;
    }
}

