
Components.utils.import('resource://gre/modules/Services.jsm');

var EXPORTED_SYMBOLS = ['WindowUtils'];

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
          callback(action, data.args);
        }
      });
    });
  },

  ready: function() {
    return this.getWindow().then(window => {
      return window.wrappedJSObject.Services.ready;
    });
  },

  getWindow: function() {
    let window = Services.wm
                         .getMostRecentWindow(null);
    if (window) {
      if (window.document.readyState === 'complete') {
        return Promise.resolve(window);
      } else {
        return new Promise(done => {
          window.addEventListener("load", function onLoad() {
            window.removeEventListener("load", onLoad);
            done(WindowUtils.getWindow());
          }, true);
        });
      }
    }
    return new Promise(done => {
      Services.tm.mainThread.dispatch(function() {
        done(WindowUtils.getWindow());
      }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    });
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
