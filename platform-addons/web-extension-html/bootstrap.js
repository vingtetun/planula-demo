dump("bootstrap\n");

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");

function startup() {
  Cu.import("resource://gre/modules/ExtensionManagement.jsm");
  ExtensionManagement.registerScript("resource://webextensions/utils.js");

  // Ensure dispatching "browser-delayed-startup-finished" to not break marionette
  // GeckoDriver.prototype.newSession
  // in testing/marionette/driver.js
  // Note that it also starts devtools.
  Cu.import("resource://webextensions/glue.jsm");
  WindowUtils.getWindow().then(window => {
    Services.obs.notifyObservers(window, "browser-delayed-startup-finished", null);
  });

  // Init devtools so that about:devtools-toolbox works asap
  let { loader } = Cu.import("resource://devtools/shared/Loader.jsm", {});
  // Ensure loading main devtools module that hooks up into browser UI
  // and initialize all devtools machinery.
  loader.require("devtools/client/framework/devtools-browser");
}

function install() {
}

function shutdown() {
}
