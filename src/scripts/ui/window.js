
function WinFrame(windb, title_str) { 
  this.tabArray = [];
  this.numTabs = 0;
  this.windb = windb;
  this.elem = $('<div></div>').attr('class','mwin');
  if(this.windb) this.elem.attr('id', ''+windb.wid);

  if(!title_str && windb) {
    title_str = windb.title;
  }
  if(title_str) {
    var text = WinFrame.createTitle(title_str);
  } else {
    var text = WinFrame.createTitle("Name this window");
  }

  var wtitle = $('<div></div>').attr('class','wtitle')
                .css({
                  'height' : UI.WTITLE_HEIGHT+'px'
                });
  if(!inPopup) {
    var email_icon = $('<a></a>')
            .attr('class','mailtolink')
            .attr('href','')
            .append(
              $('<img/>')
              .attr('class','emailicon')
              .css({
                'height' : UI.WTITLE_IMG_DIM+'px',
                'width' : UI.WTITLE_IMG_DIM+'px'
              })
              .attr('src', WinFrame.emailIcon));

    var save_icon = $('<img/>').attr('class','saveicon')
          .css({
            'height' : UI.WTITLE_IMG_DIM+'px',
            'width' : UI.WTITLE_IMG_DIM+'px'
          })
          .attr('src', WinFrame.saveIcon)
          .click(WinFrame.saveWindow);

    wtitle.append(email_icon);
    wtitle.append(save_icon);
  }

  wtitle.append(text);
  this.elem.append(wtitle);

  $('body').append(this.elem);
}

WinFrame.saveIcon = chrome.extension.getURL('images/save.png');
WinFrame.emailIcon = chrome.extension.getURL('images/email.png');

WinFrame.saveWindow = function(ev) {
  var wid = $(this).parent().parent().attr('id');
  bgport.postMessage({
    name : 'savewindow',
    wid : wid,
  });
}

WinFrame.createTitle = function(title) {
  return $('<div></div>').attr('class','text').text(title)
    .click(WinFrame.editTitle)
    .css('width',(UI.winw-150)+'px')
    .css('height', UI.WTITLE_INNER_HEIGHT+'px')
}

WinFrame.createTitleInput = function() {
  var inp = $('<input></input>')
    .css('height', UI.WTITLE_INNER_HEIGHT+'px');
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
    bgport.postMessage({ 
      name : 'savewindowtitle',
      wid : wid,
      title : newtitle
    });
    /*
    window.localStorage.setItem(
      'window_title_'+wid, newtitle);
      */
    p.append(wtitle);
  });
}

WinFrame.prototype = {

  addTabs : function(tabdbarr) {
    for(var i=0; i<tabdbarr.length; i++) {
      var t = new Tab(tabdbarr[i]);

      UI.tMap[t.tabdb.tid] = t;
      t.attach();
      this.addTab(t);

      if(t.tabdb.hidden) {
        t.elem.hide();
        t.elem.detach();
      }
    }
    this.refreshStyle();
  },
  
  addTab : function(tab) {
    this.elem.append(tab.elem);
    this.tabArray.push(tab);
    tab.parent = this;
    tab.tabdb.wid = this.windb.wid;
    this.numTabs++;
    this.updateMailToLink();
  },

  toggleTree : function(tab) {
    tab.tabdb.collapsed ? this.expandTab(tab) : this.collapseTab(tab);
  },

  expandTab : function(tab) {
    var idx = this.tabArray.indexOf(tab);
    var last = tab;
    var children = [];
    for(var i=idx+1; i < this.tabArray.length; i++) {
      var t = this.tabArray[i];
      if(t.tabdb.depth <= tab.tabdb.depth) break;
      t.elem.insertAfter(last.elem);
      t.elem.show();
      last = t;
      children.push(t.tabdb.tid);
      t.tabdb.hidden = 0;
      t.tabdb.collapsed = 0;
      t.setNodeIcon();
    }
    this.refreshStyle();
    tab.tabdb.collapsed = 0;

    bgport.postMessage({
      name : 'expandtab',
      tid : tab.tabdb.tid,
      children : children
    });
  },

  collapseTab : function(tab) {
    var idx = this.tabArray.indexOf(tab);
    var numCollapse = this.tabArray.length-idx-1;
    var wframe = this;
    var children = [];
    tab.tabdb.collapsed = 1;
    /*
    tab.elem.css({
        'zIndex' : 1
    });
    */
    for(var i=idx+1; i < this.tabArray.length; i++) {
      var t = this.tabArray[i];
      if(t.tabdb.depth <= tab.tabdb.depth) break;

      t.elem.hide();
      t.elem.detach();
      t.tabdb.hidden = 1;
      children.push(t.tabdb.tid);
      //this.removeTab(t);
      
      /*
      var distance = 45*(i-idx);
      var time = 100*(i-idx);
      t.elem.css({
        'zIndex' : 0
      });
      t.elem.animate({
        'top' : '-'+distance+'px'
      }, 
      {
        duration : time,
        complete : function() {
          wframe.removeTab(t); 
          t.elem.hide()
          numCollapse--;
          console.log('numCollapse '+numCollapse);

          if(numCollapse == 0) {
            wframe.refreshStyle();
          }
        }
      });
      */
    }
    this.refreshStyle();
    tab.tabdb.collapsed = 1;
    bgport.postMessage({
      name : 'collapsetab',
      tid : tab.tabdb.tid,
      children : children
    });
  },

  removeTab : function(tab) {
    tab.elem.detach();
    $('body').append(tab.elem);
    this.numTabs--;

    if(this.numTabs == 0) {
      this.destroy();
    } else {
      this.updateMailToLink();
    }
  },

  addTabSubtree : function(carrier) {
    var subtree = carrier.data('subtree');

    var idlist = [];

    for(var i=0; i<subtree.length; i++) {
      var t = subtree[i];
      this.elem.append(t.elem);
      this.tabArray.push(t);
      t.parent = this;
      if(this.windb) t.tabdb.wid = this.windb.wid;
      this.numTabs++;
      idlist.push(t.tabdb);
    }
    this.updateMailToLink();
    return idlist;
  },

  removeTabSubtree : function(tab) {
    var carrier = $('<div></div>').attr('class','tabcarrier');

    // make the topmost node root
    depth_offset = tab.tabdb.depth;
    tab.tabdb.parent = 0;

    var idx = this.tabArray.indexOf(tab);
    var subtree = [];
    var i=idx;
    for(; i < this.tabArray.length; i++) {
      var t = this.tabArray[i];
      t.tabdb.depth -= depth_offset;
      if(t.tabdb.depth <= 0 && i>idx) break;

      t.refresh_depth();
      t.elem.detach();
      carrier.append(t.elem);
      subtree.push(t);
      this.numTabs--;
    }
    carrier.css('height', ((idx-i+1)*45)+'px');
    carrier.data('subtree', subtree);
    $('body').append(carrier);

    if(this.numTabs == 0) {
      this.destroy();
    } else {
      this.updateMailToLink();
    }

    return carrier;
  },

  empty : function() {
    $('.mtab', this.elem).remove();
    this.tabArray.splice(0);
    this.numTabs = 0;
  },

  destroy : function() {
    this.elem.detach();
    UI.wMap[this.windb.wid] = undefined;

    for(var i=0; i < UI.columns.length; i++) {
      var tmp = UI.columns[i].indexOf(this);
      if(tmp >= 0) {
        UI.columns[i].splice(tmp, 1);
        break;
      }
    }
  },

  refreshStyle : function() {
    $('.mtab:even',this.elem).css('background','#eeeeee');
    $('.mtab:odd',this.elem).css('background','#e0e0e0');

    //$('.mtab', this.elem).css({'width': (winw-50)+'px'})
    //$('.mtab > div', this.elem).css({'width': (winw-140)+'px'})

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
  },

  updateMailToLink : function() {
    if(this.windb) var title = this.windb.title;
    if(!title) {
      var subject = 'TabSense Summary';
      var body = 'TabSense Summary\n\n';
    } else {
      var subject = '[TabSense] '+title;
      var body = 'TabSense Summary of "'+title+'"\n\n';
    }
    for(var i=0; i<this.numTabs; i++) {
      var tabdb = this.tabArray[i].tabdb;
      body += tabdb.title+'\n[ '+tabdb.url+' ]\n\n';
    }
    $('.mailtolink', this.elem).attr('href', 
      'mailto:?subject='+encodeURIComponent(subject)+
      '&body='+encodeURIComponent(body));
  },

  updateGMailLink : function() {
    if(this.windb) var title = this.windb.title;
    if(!title) {
      var subject = 'TabSense Summary';
      var body = 'TabSense Summary\n\n';
    } else {
      var subject = '[TabSense] '+title;
      var body = 'TabSense Summary of "'+title+'"\n\n';
    }
    for(var i=0; i<this.numTabs; i++) {
      var tabdb = this.tabArray[i].tabdb;
      body += tabdb.title+'\n[ '+tabdb.url+' ]\n\n';
    }

    $('.mailtolink', this.elem).attr('href', 
      'https://mail.google.com/?view=cm&fs=1&tf=1&'+
      'source=mailto&su='+encodeURIComponent(subject)+
      '&body='+encodeURIComponent(body));
  }
}
