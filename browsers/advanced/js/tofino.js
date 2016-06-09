/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * tabstip.js
 *
 * This code controls the UI of the tabs.
 * A tab is: a favicon, a title and the close button.
 * The web content is *not* handled here, but in the
 * tabiframe.js file.
 *
 */


require(['js/tabiframedeck'], function(TabIframeDeck) {

  'use strict';

  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/tofinostrip.css';
  let defaultStyleSheet = document.querySelector('link[title=default]');
  document.head.insertBefore(link, defaultStyleSheet.nextSibling);

  // Build the container. A hbox on top of the deck.
  // <hbox class='tabstrip'></hbox>
  // Tabs will be appended in there.
  let tabstrip = document.createElement('hbox');
  tabstrip.className = 'tabstrip toolbar';
  let outervbox = document.querySelector('#outervbox');
  function waitForNavbar() {
    let navbar = document.querySelector('.navbar');
    if (navbar) {
      outervbox.insertBefore(tabstrip, outerhbox);
    } else {
      setTimeout(waitForNavbar, 10);
    }
  }
  waitForNavbar();

  // Where will store the tab objects, with their linked
  // <tab-iframe>
  const allTabs = new Map();

  // Tab JS object. This should use web components.
  // issue #64
  function Tab(tabIframe) {
    let hbox = document.createElement('hbox');
    hbox.className = 'tab';
    hbox.setAttribute('align', 'center');

    let throbber = document.createElement('div');
    throbber.className = 'throbber';

    let favicon = document.createElement('img');
    favicon.className = 'favicon';

    let title = document.createElement('hbox');
    title.className = 'title';

    let button = document.createElement('button');
    button.className = 'close-button';
    button.title = 'Close Tab';

    button.onmouseup = (event) => {
      if (event.button == 0) {
        event.stopPropagation();
        TabIframeDeck.remove(tabIframe);
      }
    };

    hbox.onmousedown = (event) => {
      if (event.button == 0) {
        TabIframeDeck.select(tabIframe);
      }
    };

    hbox.onmouseup = (event) => {
      if (event.button == 1) {
        event.stopPropagation();
        TabIframeDeck.remove(tabIframe);
      }
    }

    hbox.appendChild(throbber);
    hbox.appendChild(favicon);
    hbox.appendChild(title);
    hbox.appendChild(button);

    this._dom = hbox;

    this._tabIframe = tabIframe;
    this._trackTabIframe();

    tabstrip.appendChild(this._dom);

    this.updateDom();
  }

  Tab.prototype = {

    get tabIframe() {
      return this._tabIframe;
    },

    get dom() {
      return this._dom;
    },

    destroy: function() {
      this._untrackTabIframe();
      this._tabIframe = null;
      this.dom.remove();
    },

    select: function() {
      this.dom.classList.add('selected');
    },

    unselect: function() {
      this.dom.classList.remove('selected');
    },

    _eventsToTrack: [
      'mozbrowserloadstart',
      'mozbrowserloadend',
      'mozbrowsertitlechange',
      'mozbrowserlocationchange',
      'mozbrowsericonchange',
      'mozbrowsererror'
    ],

    _trackTabIframe: function() {
      this.updateDom = this.updateDom.bind(this);
      for (let e of this._eventsToTrack) {
        this.tabIframe.on(e, this.updateDom);
      }
    },

    _untrackTabIframe: function() {
      for (let e of this._eventsToTrack) {
        this.tabIframe.off(e, this.updateDom);
      }
    },

    updateDom: function() {
      if (this.tabIframe.loading) {
        this.dom.classList.add('loading');
      } else {
        this.dom.classList.remove('loading');
      }

      let title = this.tabIframe.title;
      if (!title) {
        if (this.tabIframe.location) {
          title = this.tabIframe.location;
        } else {
          title = 'New Tab';
        }
      }
      this.dom.querySelector('.title').textContent = title;
      this.dom.title = title;

      let faviconImg = this.dom.querySelector('.favicon');
      if (this.tabIframe.favicon) {
        faviconImg.src = this.tabIframe.favicon;
      } else {
        faviconImg.removeAttribute('src');
      }
    },
  };

  TabIframeDeck.on('add', (event, detail) => {
    let tabIframe = detail.tabIframe;
    let tab = new Tab(tabIframe);
    allTabs.set(tabIframe, tab);
    if (tabIframe == TabIframeDeck.getSelected()) {
      tab.select();
    }
  });

  TabIframeDeck.on('remove', (event, detail) => {
    let tab = allTabs.get(detail.tabIframe);
    if (tab) {
      tab.destroy();
      allTabs.delete(detail.tabIframe);
    }
  });

  TabIframeDeck.on('select', (event, detail) => {
    let tab = allTabs.get(detail.tabIframe);
    if (tab) {
      tab.select();
    }
  });

  TabIframeDeck.on('unselect', (event, detail) => {
    let tab = allTabs.get(detail.tabIframe);
    if (tab) {
      tab.unselect();
    }
  });

  for (let tabIframe of TabIframeDeck) {
    let tab = new Tab(tabIframe);
    allTabs.set(tabIframe, tab);
  }

  let tabIframe = TabIframeDeck.getSelected();
  if (tabIframe) {
    let tab = allTabs.get(tabIframe);
    tab.select();
  }

});
