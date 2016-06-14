/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * tabiframe.js
 *
 * tabiframe implements the <tab-iframe> tab. It's a wrapper
 * around a <iframe mozbrowser>.
 *
 */

define(['js/eventemitter'], function(EventEmitter) {

  'use strict';

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;

  const IFRAME_EVENTS = [
    'mozbrowserasyncscroll', 'mozbrowserclose', 'mozbrowsercontextmenu',
    'mozbrowsererror', 'mozbrowsericonchange', 'mozbrowserloadend',
    'mozbrowserloadstart', 'mozbrowserlocationchange', 'mozbrowseropenwindow',
    'mozbrowsersecuritychange', 'mozbrowsershowmodalprompt', 'mozbrowsertitlechange',
    'mozbrowserusernameandpasswordrequired'
  ];

  // Non-Remote iframes may steal the focus :/
  const INPROCESS_URLS = [
       'about:addons'
     , 'about:config'
     , 'about:cache'
     , 'about:crashes'
     , 'about:debugging'
     , 'about:devtools-toolbox'
     , 'about:downloads'
     , 'about:healthreport'
     , 'about:networking'
     , 'about:newtab'
     , 'about:performance'
     , 'about:plugins'
     , 'about:preferences'
     , 'about:sharing'
     , 'about:support'
     , 'about:telemetry'
     , 'about:webrtc'
  ];

  let tabsChannel = new BroadcastChannel('tabs');
  let tabIframeProto = Object.create(HTMLElement.prototype);

  tabIframeProto.setLocation = function(url) {
    url = url || 'about:blank';
    if (!this._innerIframe) {
      let loadInParent = INPROCESS_URLS.includes(url) || url.startsWith("browserui://");
      this._createInnerIframe(!loadInParent);
    } else {
      this.updateRemoteNess(url);
    }

    if (window.IS_PRIVILEGED) {
      this._innerIframe.src = url;
    } else {
      this._innerIframe.src = 'data:,' + url;
    }
  };

  tabIframeProto.updateRemoteNess = function(url) {
    // We may have to reload the location in a new iframe if the remoteness
    // doesn't match.
    let loadInParent = INPROCESS_URLS.includes(url) || url.startsWith("browserui://");
    if ( (this._innerIframe.getAttribute("remote") && loadInParent) ||
         (!this._innerIframe.getAttribute("remote") && !loadInParent ) ) {
      this._innerIframe.remove();
      this._createInnerIframe(!loadInParent);
      if (window.IS_PRIVILEGED) {
        this._innerIframe.src = url;
      } else {
        this._innerIframe.src = 'data:,' + url;
      }
    }
  };

  tabIframeProto.willBeVisibleSoon = function() {
    if (window.IS_PRIVILEGED && this._innerIframe) {
      this._innerIframe.setVisible(true);
    }
  };

  tabIframeProto.show = function() {
    this.removeAttribute('hidden');
    if (window.IS_PRIVILEGED && this._innerIframe) {
      this._innerIframe.setVisible(true);
    }
    this.emit('visible');
    this._innerIframe.setAttribute('selected', 'true');
    tabsChannel.postMessage({ event: 'update', id: this.tabId, selected: true, active: true });
    tabsChannel.postMessage({ event: 'select', id: this.tabId });
  };

  tabIframeProto.hide = function() {
    this.setAttribute('hidden', 'true');
    if (window.IS_PRIVILEGED && this._innerIframe) {
      this._innerIframe.setVisible(false);
    }
    this._innerIframe.removeAttribute('selected');
    this.emit('hidden');
    tabsChannel.postMessage({ event: 'update', id: this.tabId, selected: false, active: false });
  };

  tabIframeProto.createdCallback = function() {
    this._zoom = 1;
    this._clearTabData();
    EventEmitter.decorate(this);
    tabsChannel.postMessage({ event: 'update', id: this.tabId, url: this._location });
  };

  tabIframeProto._createInnerIframe = function(remote) {
    let iframe = document.createElement('iframe');
    iframe.setAttribute('mozbrowser', 'true');
    iframe.setAttribute('flex', '1');
    if (remote) {
      iframe.setAttribute('remote', 'true');
    }
    iframe.setAttribute('mozallowfullscreen', 'true');
    // Set this attribute for web extension.
    iframe.setAttribute('data-tab-id', this.tabId);
    this.appendChild(iframe);
    for (let eventName of IFRAME_EVENTS) {
      iframe.addEventListener(eventName, this);
    }
    this._innerIframe = iframe;
    this._applyZoom();
  };

  tabIframeProto.attachedCallback = function() {
  };

  tabIframeProto.detachedCallback = function() {
    if (this._innerIframe) {
      for (let eventName of IFRAME_EVENTS) {
        this._innerIframe.removeEventListener(eventName, this);
      }
    }
  };

  tabIframeProto.zoomIn = function() {
    this._zoom += 0.1;
    this._zoom = Math.min(MAX_ZOOM, this._zoom);
    this._applyZoom();
  };

  tabIframeProto.zoomOut = function() {
    this._zoom -= 0.1;
    this._zoom = Math.max(MIN_ZOOM, this._zoom);
    this._applyZoom();
  };

  tabIframeProto.resetZoom = function() {
    this._zoom = 1;
    this._applyZoom();
  };

  tabIframeProto._applyZoom = function() {
    if (this._innerIframe && window.IS_PRIVILEGED) {
      this._innerIframe.zoom(this._zoom);
    }
  };

  tabIframeProto.reload = function() {
    if (this._innerIframe) this._innerIframe.reload();
  };

  tabIframeProto.stop = function() {
    if (this._innerIframe) this._innerIframe.stop();
  };

  tabIframeProto.goBack = function() {
    if (this._innerIframe) this._innerIframe.goBack();
  };

  tabIframeProto.goForward = function() {
    if (this._innerIframe) this._innerIframe.goForward();
  };

  tabIframeProto._clearTabData = function() {
    this._loading = false;
    this._title = '';
    this._location = '';
    this._favicon = '';
    this._securityState = 'insecure';
    this._securityExtendedValidation = false;
  };

  Object.defineProperty(tabIframeProto, 'loading', {
    get: function() {
      return this._loading;
    }
  });

  Object.defineProperty(tabIframeProto, 'title', {
    get: function() {
      return this._title;
    }
  });

  Object.defineProperty(tabIframeProto, 'location', {
    get: function() {
      return this._location;
    }
  });

  Object.defineProperty(tabIframeProto, 'favicon', {
    get: function() {
      return this._favicon;
    }
  });

  Object.defineProperty(tabIframeProto, 'securityState', {
    get: function() {
      return this._securityState;
    }
  });

  Object.defineProperty(tabIframeProto, 'securityExtendedValidation', {
    get: function() {
      return this._securityExtendedValidation;
    }
  });

  let idCount = 1;
  Object.defineProperty(tabIframeProto, 'tabId', {
    get: function() {
      if (!this._tabId) {
        this._tabId = idCount++;
      }
      return this._tabId;
    }
  });

  tabIframeProto.canGoBack = function() {
    return new Promise((resolve, reject) => {
      if (!this._innerIframe) {
        return resolve(false);
      }
      this._innerIframe.getCanGoBack().onsuccess = r => {
        return resolve(r.target.result);
      };
    });
  };

  tabIframeProto.canGoForward = function() {
    return new Promise((resolve, reject) => {
      if (!this._innerIframe) {
        return resolve(false);
      }
      this._innerIframe.getCanGoForward().onsuccess = r => {
        return resolve(r.target.result);
      };
    });
  };

  tabIframeProto.content = function() {
    return this._innerIframe;
  };

  tabIframeProto.focus = function() {
    if (this._innerIframe) {
      this._innerIframe.focus();
    }
  };

  tabIframeProto.userInput = '';

  tabIframeProto.handleEvent = function(e) {
    let somethingChanged = true;

    switch (e.type) {
      case 'mozbrowserloadstart':
        this._clearTabData();
        this._loading = true;
        tabsChannel.postMessage({ event: 'update', id: this.tabId, status: 'loading' });
        break;
      case 'mozbrowserloadend':
        this._loading = false;
        tabsChannel.postMessage({ event: 'update', id: this.tabId, status: 'complete' });
        break;
      case 'mozbrowsertitlechange':
        this._title = e.detail;
        tabsChannel.postMessage({ event: 'update', id: this.tabId, title: e.detail });
        break;
      case 'mozbrowserlocationchange':
        this.userInput = '';
        this._location = e.detail;
        this.updateRemoteNess(e.detail);
        tabsChannel.postMessage({ event: 'update', id: this.tabId, url: e.detail });
        break;
      case 'mozbrowsericonchange':
        this._favicon = e.detail.href;
        break;
      case 'mozbrowsererror':
        this._loading = false;
        break;
      case 'mozbrowsersecuritychange':
        this._securityState = e.detail.state;
        this._securityExtendedValidation = e.detail.extendedValidation;
        break;
      default:
        somethingChanged = false;
    }

    // Forward event
    this.emit(e.type, e, this);
  };

  let TabIframe = document.registerElement('tab-iframe', {prototype: tabIframeProto});
  return TabIframe;
});
