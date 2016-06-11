
Components.utils.import('resource://gre/modules/Services.jsm');
let {setTimeout} = Components.utils.import("resource://gre/modules/Timer.jsm", {});

var EXPORTED_SYMBOLS = ['WindowUtils'];

const chromeURL = Services.prefs.getCharPref("browser.chromeURL");

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

var WindowUtils = {
  emit: function(name, action, options) {
    getWindow().then(window => {
      let channel = this.getChannel(window, name);
      channel.postMessage({ action, options });
    });
  },

  on: function(name, action, callback, doNotCache) {
    onWindow(window => {
      let channel = this.getChannel(window, name);
      channel.addEventListener("message", function ({data}) {
        if (data.event == action) {
          callback(action, data);
        }
      });
    });
  },

  getChannel: function(window, name) {
    // As window is an xray, attributes on it are not visible to the content
    let channel = window['WebExtHtml-' + name];
    if (!channel) {
      channel = window['WebExtHtml-' + name] = new window.BroadcastChannel(name);
    }
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
};
