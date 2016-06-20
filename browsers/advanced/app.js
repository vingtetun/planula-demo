/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * app.js
 *
 * Firefox.html entry point.
 *
 */

// Detect Operating System

if (navigator.appVersion.indexOf('Win') >= 0) {
  window.OS = 'windows';
  document.documentElement.setAttribute('os', 'windows');
}
if (navigator.appVersion.indexOf('Mac') >= 0) {
  window.OS = 'osx';
  document.documentElement.setAttribute('os', 'osx');
}
if (navigator.appVersion.indexOf('X11') >= 0) {
  window.OS = 'linux';
  document.documentElement.setAttribute('os', 'linux');
}

// IS_PRIVILEGED is false if Firefox.html runs in a regular browser,
// with no Browser API.

window.IS_PRIVILEGED = !!HTMLIFrameElement.prototype.setVisible;

require.config({
  scriptType: 'text/javascript;version=1.8'
});

// Load custom tab strip via url query parameter
let url = new URL(location);
let tabsui = url.searchParams.get('tabsui') || 'tabstrip';
if (tabsui == 'tabstrip') {
  // These attributes have to be set before document load,
  // so we can't set them from tabstrip.js because requirejs
  // is much asynchronous
  document.documentElement.setAttribute("tabsintitlebar", "true");
  document.documentElement.setAttribute("chromemargin", "0,2,2,2");
}

require(['js/tabiframedeck'], function(TabIframeDeck) {

  'use strict';

  TabIframeDeck.on('selectedTabIframeUpdate', (tabIframe) => {
    document.title = 'Firefox - ' + tabIframe.title;
  });

  require([
    'js/' + tabsui,
    'js/navbar',
  ]);
})
