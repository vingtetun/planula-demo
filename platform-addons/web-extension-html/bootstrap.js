dump("bootstrap\n");

const Cu = Components.utils;
const Ci = Components.interfaces;

// Register the manifest early, so the override in chrome.manifest
// takes effect before web extensions scripts are inserted into the
// addon scope.
(function loadManifest() {
  Cu.import("resource://gre/modules/Services.jsm");
  let manifest = Services.dirsvc.get('ProfD', Ci.nsIFile);
  manifest.append('extensions');
  manifest.append('zyzzyva');
  Components.manager.addBootstrappedManifestLocation(manifest);
})();

function waitForWindow() {
  let window = Services.wm
                       .getMostRecentWindow(null);
  if (window) {
    return Promise.resolve(window);
  }
  return new Promise(done => {
    Services.wm.addListener({
      onOpenWindow: function(aXULWindow) {
        Services.wm.removeListener(this);
        // We have to wait for a tick for getMostRecentWindow to return the window
        Services.tm.mainThread.dispatch(function() {
          done(waitForWindow());
        }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
      }
    });
  });
}

function startup() {
  Cu.import("resource://gre/modules/ExtensionManagement.jsm");
  ExtensionManagement.registerScript("resource://webextensions/utils.js");

  // Ensure dispatching "browser-delayed-startup-finished" to not break marionette
  // GeckoDriver.prototype.newSession
  // in testing/marionette/driver.js
  // Note that it also starts devtools.
  Cu.import("resource://webextensions/glue.jsm");
  // We wait for the window to be opened to register the devtools and especially
  // its about:devtools-toolbox URI.
  waitForWindow().then(window => {
    Services.obs.notifyObservers(window, "browser-delayed-startup-finished", null);
  });
}

function install() {
}

function shutdown() {
  (function unloadManifest() {
    Cu.import("resource://gre/modules/Services.jsm");
    let manifest = Services.dirsvc.get('ProfD', Ci.nsIFile);
    manifest.append('extensions');
    manifest.append('zyzzyva');
    Components.manager.removeBootstrappedManifestLocation(manifest);
  })();
}
