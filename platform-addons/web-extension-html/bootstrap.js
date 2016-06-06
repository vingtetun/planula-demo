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

function startup() {
  Cu.import("resource://gre/modules/ExtensionManagement.jsm");
  ExtensionManagement.registerScript("resource://webextensions/utils.js");

  // Ensure dispatching "browser-delayed-startup-finished" to not break marionette
  // GeckoDriver.prototype.newSession
  // in testing/marionette/driver.js
  // Note that it also starts devtools.
  Cu.import("resource://webextensions/glue.jsm");
  // No idea why but WindowUtils.getWindow() only resolves if we wait for a 1s
  // before calling it :/
  let {setTimeout} = Cu.import("resource://gre/modules/Timer.jsm", {});
  setTimeout(function () {
    WindowUtils.getWindow().then(function (window) {
      Services.obs.notifyObservers(window, "browser-delayed-startup-finished", null);
    });
  }, 1000);
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
