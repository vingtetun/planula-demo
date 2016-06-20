
let Ci = Components.interfaces;
Components.utils.import('resource://gre/modules/Services.jsm');
let {setTimeout} = Components.utils.import("resource://gre/modules/Timer.jsm", {});

var EXPORTED_SYMBOLS = ['WindowUtils'];

let topWindow;

let windowListeners = new Set();
// Register a function called on the already loaded window
// but also on the next browser loads
function onWindow(callback) {
  if (topWindow) {
    callback(topWindow);
  }
  windowListeners.add(callback);
}
// Returns a promise resolved on the next loaded browser window
function getWindow() {
  if (topWindow) {
    return Promise.resolve(topWindow);
  }
  return new Promise(done => {
    let callback = window => {
      windowListeners.delete(callback);
      done(window);
    };
    windowListeners.add(callback);
  });
}

let obs = function (subject, topic, data) {
  let window = subject.defaultView;
  // Use startsWith as the url may be appended with some query parameters
  // Like ?url=http://command.line.site.com
  let chromeURL = Services.prefs.getCharPref("browser.chromeURL");
  if (!window || !window.location.href.startsWith(chromeURL)) {
    return;
  }

  function onLoaded() {
    topWindow = window;
    for(let listener of windowListeners) {
      listener(window);
    }
  }

  if (window.document.readyState === 'complete') {
    onLoaded();
  } else {
    window.addEventListener("load", function onLoad() {
      window.removeEventListener("load", onLoad);
      onLoaded();
    }, true);
  }
}
Services.obs.addObserver(obs, 'content-document-loaded', false);

let channels = new Map();
let contentChannels = new Map();
onWindow(() => {
  WindowUtils.destroy();
});

let windows = [];
function BroadcastChannelFor(uri, name, content) {
  let baseURI = Services.io.newURI(uri, null, null);
  let principal = Services.scriptSecurityManager.createCodebasePrincipal(baseURI, content ? {inIsolatedMozBrowser:true} : {});

  let chromeWebNav = Services.appShell.createWindowlessBrowser(true);
  // XXX: Keep a ref to the window otherwise it is garbaged and BroadcastChannel stops working.
  windows.push(chromeWebNav);
  let interfaceRequestor = chromeWebNav.QueryInterface(Ci.nsIInterfaceRequestor);
  let docShell = interfaceRequestor.getInterface(Ci.nsIDocShell);
  docShell.createAboutBlankContentViewer(principal);
  let window = docShell.contentViewer.DOMDocument.defaultView;
  return new window.BroadcastChannel(name);
}

var WindowUtils = {
  emit: function(name, action, options) {
    getWindow().then(window => {
      let channel = this.getChannel(window, name);
      channel.postMessage({ action, options });
    });
  },

  on: function(name, action, callback, content) {
    onWindow(window => {
      let channel = this.getChannel(window, name, content);
      channel.addEventListener("message", function ({data}) {
        if (data.event == action) {
          callback(action, data, channel);
        }
      });
    });
  },

  getChannel: function(window, name, content) {
    let registry = content ? contentChannels : channels;
    let channel = registry.get(name);
    if (channel) {
      return channel;
    }
    let chromeURL = Services.prefs.getCharPref("browser.chromeURL");
    channel = BroadcastChannelFor(chromeURL, name, content);
    registry.set(name, channel);
    return channel;
  },

  cloneFunction: function(obj) {
    return WindowUtils.getWindow().then(window => {
      return Components.utils.cloneInto(obj, window, {
        cloneFunctions: true
      });
    });
  },

  cloneInto: function(obj) {
    return WindowUtils.getWindow().then(window => {
      return Components.utils.cloneInto(obj, window);
    });
  },

  destroy: function () {

    channels.forEach(channel => {
      try {
        channel.close();
      } catch(e) {}
    });
    channels.clear();
    contentChannels.forEach(channel => {
      try {
        contentChannel.close();
      } catch(e) {}
    });
    contentChannels.clear();
    windows = [];
  }
};
