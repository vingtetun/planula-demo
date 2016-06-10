
Components.utils.import('resource://gre/modules/Services.jsm');
let {setTimeout} = Components.utils.import("resource://gre/modules/Timer.jsm", {});

var EXPORTED_SYMBOLS = ['WindowUtils'];

const chromeURL = Services.prefs.getCharPref("browser.chromeURL");

let topWindowPromise = new Promise(done => {
  let obs = function (subject, topic, data) {
    let window = subject.defaultView;
    // Use startsWith as the url may be appended with some query parameters
    // Like ?url=http://command.line.site.com
    if (!window || !window.location.href.startsWith(chromeURL)) {
      return;
    }

    if (window.document.readyState === 'complete') {
      // Also overload the promise to resolve to new window being opened
      // when we reload the browser without restarting the process
      topWindowPromise = Promise.resolve(window);

      return done(window);
    }

    return new Promise(done => {
       Services.tm.mainThread.dispatch(function() {
         done(WindowUtils.getWindow());
       }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    });
  }
  Services.obs.addObserver(obs, 'content-document-loaded', false);
});


var WindowUtils = {
  emit: function(name, action, options) {
    this.getChannel(name).then(channel => {
      channel.postMessage({ action, options });
    });
  },

  on: function(name, action, callback) {
    this.getChannel(name).then(channel => {
      channel.addEventListener("message", function ({data}) {
        if (data.event == action) {
          callback(action, data);
        }
      });
    });
  },

  getWindow: function() {
    return topWindowPromise;
  },

  getChannel: function(name) {
    return this.getWindow().then(window => {
      // As window is an xray, attributes on it are not visible to the content
      let channel = window['WebExtHtml-' + name];
      if (!channel) {
        channel = window['WebExtHtml-' + name] = new window.BroadcastChannel(name);
      }
      return channel;
    });
  },

  getService: function(name) {
    return this.getWindow().then(window => window.wrappedJSObject.Services[name]);
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
