
function Fav() {}

Fav._cache = null;

Fav.list = function()
{
    if(!Fav._cache) Fav._load();
    return Fav._cache;
}

Fav.is = function(url)
{
    if(!Fav._cache) Fav._load();
    var fcl = Fav._cache.length;
    for(var i=0; i < fcl; i++) {
        if(Fav._cache[i].url == url) return true;
    }
    return false;
}

Fav.add = function(url, favIconUrl)
{
    if(!Fav._cache) Fav._load();
    if(Fav.is(url)) return;
    Fav._cache.push({url:url, favIconUrl:favIconUrl});
    Fav._save();
}

Fav.remove = function(url)
{
    if(!Fav._cache) Fav._load();
    var fcl = Fav._cache.length;
    for(var i=0; i < fcl; i++) {
        if(Fav._cache[i].url == url) break;
    }
    Fav._cache.splice(i,1);
    Fav._save();
}

Fav._load = function()
{
    var favstr = window.localStorage.getItem('tabsense_favorites');
    if(favstr) {
        Fav._cache = JSON.parse(favstr);
    } else {
        Fav._cache = [];
    }
}
Fav._save = function()
{
    var favstr = JSON.stringify(Fav._cache);
    window.localStorage.setItem('tabsense_favorites', favstr);
}
