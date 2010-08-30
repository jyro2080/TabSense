var FACEBOOK_PAGE_HTML = '<iframe src="http://www.facebook.com/plugins/likebox.php?id=139713996058999&amp;width=500&amp;connections=10&amp;stream=true&amp;header=false&amp;height=555" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:500px; height:555px;" allowTransparency="true"></iframe>';
var BUYCOFFEE_HTML = ' <div id="buycoffee"> <form action="https://www.paypal.com/cgi-bin/webscr" method="post"> <div id="link">Buy me Coffee</div> <input type="hidden" name="cmd" value="_s-xclick"> <input type="hidden" name="hosted_button_id" value="KFWM98T9L78Y4"> <input type="image" src="images/coffee.png" border="0" name="submit" alt="PayPal - The safer, easier way to pay online."> <img alt="" border="0" src="https://www.paypal.com/en_GB/i/scr/pixel.gif" width="1" height="1"> </form> </div>'
var SOURCE_URL = 'http://github.com/jyro2080/TabSense';
var BUGS_URL = 'http://github.com/jyro2080/TabSense/issues';
var BAG_LEGACY_MSG = 'Thanks for being early adopter of TabSense.\n'+
          'New versions use different format to save data. You have saved windows from old version. They will now be opened. You can save them again, so that they get saved in new format.';

var CLOUD = 'http://192.168.1.100:8090';
//var CLOUD = 'http://tabsense.appspot.com';

var doneWindows = 0;
var dw, dh, winw;
var HMARGIN = 30;
var VMARGIN = 20;
var NUMCOL = 3;
var CEILING = 50;
var inPopup = false;

$c = console;

var ui;
$(document).ready(function() {
  var trys = 0;

  if(bgstatus == 'UNKNOWN') {
    setTimeout(decide_start, 50);
  } else {
    decide_start();
  }

  function decide_start() {
    if(bgstatus == 'READY') {
      startUI();
    } else if(bgstatus == 'NOTREADY') {
        ui = UI(); 
        $('body').append($('<div></div>')
                  .attr('class','errmsg')
                  .text('Background not initialized. Try again.'));
        $('#creator').css('top',(UI.dh-40)+'px');
        $('#creator').css('left',(UI.dw-120)+'px');
    } else { // STILL UNKNOWN
      if(trys++ < 10) {
        setTimeout(decide_start, 50);
      }
    }
  }
}
);

var credsOK = false;
var infoHtmlAdded = false;
var authUrl = null;

function startUI() {

  ui = UI(); 

  bgport.postMessage({ name:'listwindows' }); // trigger setup windows

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

  $('#creator').css('top',(UI.dh-40)+'px');
  $('#creator').css('left',(UI.dw-120)+'px');


  $.get(CLOUD+'/_chkcreds', function(data) {
    $c.log('got resp: '+data);
    var response = JSON.parse(data);
    credsOK = (response.result == 'SUCCESS');
    authUrl = CLOUD+response.authUrl;
  });

  $('.cloudpopup').css('left', (UI.dw-250)+'px');
  $('#topbar #cloud').mouseenter(function(ev) {
    if(credsOK) {
      var profile_name = window.localStorage.getItem(
          'tabsense-browser-profile');
      if(profile_name) 
      {
        $('#cloudpopupaction #currentprofile').text(profile_name);
        $('#cloudpopupaction #profileinput').hide();
      } else {
        $('#cloudpopupaction #currentprofile').hide();
        $('#cloudpopupaction #changeprofile').hide();
        $('#cloudpopupaction #nextpushmsg').hide();
        $('#cloudpopupaction #profileinput').show();
        $('#cloudpopupaction #profileinput').val('Profile name');
      }
    }
    credsOK ? $('#cloudpopupaction').show():
              $('#cloudpopuplogin').show();
  });
  $('.cloudpopup').mouseleave(function(ev) {
    credsOK ? $('#cloudpopupaction').hide():
              $('#cloudpopuplogin').hide();
  });
  $('#cloudpopuplogin #loginbutton').click(function(ev) {
      location.href = authUrl;
  });
  $('#cloudpopupaction #popupbutton').click(function(ev) {
      prepare_cloud_push();
  });
    /*
  $('#topbar #cloud').click(function(ev) {
    if(credsOK) {
      $c.log('preparing cloud push');
      prepare_cloud_push();
    } else {
      $c.log('Redir to '+authUrl);
      location.href = authUrl;
    }
  });
    */

  $('#topbar #info').click(function(ev) {
    if(!infoHtmlAdded) {
      $(BUYCOFFEE_HTML).insertAfter($('#infopanel #topline'));
      $(FACEBOOK_PAGE_HTML).insertAfter($('#infopanel #topline'));
      infoHtmlAdded = true;
    }
    $('#infopanel').show();
  });

  $('#infopanel').click(function() { 
    $(this).hide(); 
  });

  position_infopanel();

  $('#bagbar').css({
    'top' : (UI.dh-40)+'px',
    'width' : (UI.dw-140)+'px'
  })

  bgport.postMessage({ name:'listsavedwindows' });

  // open saved windows in legacy versions <1.6
  var oldwindows = Bag.list();
  if(oldwindows.length > 0) {
    alert(BAG_LEGACY_MSG);

    var winidArr = [];
    for(var i=0; i < oldwindows.length; i++) {
      chrome.windows.create(null, function(win) {
        winidArr.push(win.id);
        if(winidArr.length == oldwindows.length) {
          open_old_tabs();
        }
      });
    }
  }

  function open_old_tabs() {
    for(var i=0; i < oldwindows.length; i++) {
      var win = oldwindows[i];
      var winid = winidArr[i];
      for(var j=0; j < win.tabs.length; j++) {
        chrome.tabs.create({
          windowId : winid,
          url : win.tabs[j].url
        });
      }
      Bag.remove(win.id);
    }
  }

}

function prepare_cloud_push() {
  bgport.postMessage({ name : 'tabdata2push' });
}

function push_to_cloud(tabdata) {
  $.post(CLOUD+'/_save', { tabdata : tabdata },
    function(data) {
      var response = JSON.parse(data);
      if(response.result != 'SUCCESS') {
        alert(response.result);
      }
    }
  );
}


function load_bag(windows) {
  $('#bagbar').empty();
  if(!windows) return;
  var bagl = windows.length;
  if(bagl > 0) {
    $('#bagbar').append($('<img/>').attr('src', WinFrame.hddIcon));
  }
  for(var i=0; i < bagl; i++) {
    var w = windows[i];
    if(!w.title) w.title = 'NoName';
    var entry = $('<div></div>')
        .attr('class','winentry')
        .attr('id', w.wid)
        .text(w.title)
        .click(bagEntryClicked);
    $('#bagbar').append(entry);
  }
}

function bagEntryClicked(ev) {
  var wid = $(this).attr('id');

  bgport.postMessage({ name:'unsavewindow', wid:wid });
}

function openSavedWindow(saved) {
  chrome.windows.create(
    { url: chrome.extension.getURL('dummy.html') },
    function(win) {
      var totalTabs = saved.tabs.length;

      for(var i=0; i<totalTabs; i++) {
        var t = saved.tabs[i];
        chrome.tabs.create({
          windowId : win.id,
          index : t.index,
          url : t.url,
          selected : t.selected
        }); 
      }
      chrome.tabs.getAllInWindow(win.id, removeDummyTab);
    }
  );

  bgport.postMessage({ name:'listsavedwindows' });
}

function removeDummyTab(tabs) {
  for(var i=0; i < tabs.length; i++) {
    if(/dummy.html/.test(tabs[i].url)) {
      chrome.tabs.remove(tabs[i].id);
    }
  }
}

function position_infopanel() {
  var ipw = 550;
  var iph = 600;
  var left = (UI.dw - ipw)/2;
  var top = (UI.dh - iph)/2;
  $('#infopanel').css({
    'left' : left+'px',
    'top' : top+'px'
  });
}

function blur_all_tabs(yes)
{
  for(i in UI.wMap) {
    var win = UI.wMap[i];
    if(!win) continue;
    (yes ? win.blurTabs : win.unblurTabs)();
  }
}

function run_query(query)
{
  blur_all_tabs(true);
  if($.trim(query) != '') {
    query = query.toLowerCase();
    for (i in UI.tMap) {
      var tabTitle = UI.tMap[i].tabdb.title;
      if(tabTitle && tabTitle.toLowerCase().indexOf(query) >= 0) {
        tab_selector = 'tab_'+UI.tMap[i].tabdb.tid;
        for(j in UI.wMap) {
          $('#'+tab_selector, UI.wMap[j].elem).css({
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
