'use strict';

chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.update({url: 'http://yahoo.fr'});
});
