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
  let { getWindow } = Cu.import("resource://webextensions/glue.jsm", {});
  getWindow().then(window => {
    Services.obs.notifyObservers(window, "browser-delayed-startup-finished", null);
  });

  // Init devtools so that about:devtools-toolbox works asap
  let { loader } = Cu.import("resource://devtools/shared/Loader.jsm", {});
  // Ensure loading main devtools module that hooks up into browser UI
  // and initialize all devtools machinery.
  loader.require("devtools/client/framework/devtools-browser");

  setupAddons();
}

function install() {
}

function shutdown() {
  let { WindowUtils } = Cu.import("resource://webextensions/glue.jsm", {});
  WindowUtils.destroy();
}

let Addons = [];
let AddonInstances = new Map();
try {
  Addons = JSON.parse(Services.prefs.getCharPref("webextensions.list"));
  if (!Addons || !Array.isArray(Addons)) {
    Addons = [];
  }
} catch(e) {}


let windows = [];
function BroadcastChannelFor(uri, name) {
  let baseURI = Services.io.newURI(uri, null, null);
  let principal = Services.scriptSecurityManager.createCodebasePrincipal(baseURI, {inIsolatedMozBrowser:true});

  let chromeWebNav = Services.appShell.createWindowlessBrowser(true);
  // XXX: Keep a ref to the window otherwise it is garbaged and BroadcastChannel stops working.
  windows.push(chromeWebNav);
  let interfaceRequestor = chromeWebNav.QueryInterface(Ci.nsIInterfaceRequestor);
  let docShell = interfaceRequestor.getInterface(Ci.nsIDocShell);
  docShell.createAboutBlankContentViewer(principal);
  let window = docShell.contentViewer.DOMDocument.defaultView;
  return new window.BroadcastChannel(name);
}
function setupAddons() {
  let { WindowUtils } = Cu.import("resource://webextensions/glue.jsm", {});
  WindowUtils.on("addons", "install", (action, data, channel) => {
    if (AddonInstances.has(data.id)) {
      return;
    }
    installAddon(data);
    Addons.push(data);
    saveAddonList();
    channel.postMessage({ event: "installed", id: data.id });
  }, true);

  WindowUtils.on("addons", "uninstall", (action, data, channel) => {
    Addons = Addons.filter(a => a.id != data.id);
    let addon = AddonInstances.get(data.id);
    if (addon) {
      addon.shutdown();
      AddonInstances.delete(data.id);
    }
    saveAddonList();
    channel.postMessage({ event: "uninstalled", id: data.id });
  }, true);

  WindowUtils.on("addons", "isInstalled", (action, data, channel) => {
    let isInstalled = AddonInstances.has(data.id);
    channel.postMessage({ event: "isInstalledResponse", isInstalled, id: data.id });
  }, true);

  Addons.forEach(installAddon);
}
function saveAddonList() {
  Services.prefs.setCharPref("webextensions.list", JSON.stringify(Addons));
  Services.prefs.savePrefFile(null)
}

let {Extension} = Components.utils.import("resource://gre/modules/Extension.jsm", {});
function installAddon(addon) {
  let data = {
    id: addon.id,
    resourceURI: Services.io.newURI(addon.url, null, null)
  };
  let extension = new Extension(data);
  extension.startup();
  AddonInstances.set(addon.id, extension);
}

// This isn't specific to Addons/WebExtensions
[
  'document-element-inserted',
].forEach(function(name) {
  Services.obs.addObserver(function(subject, topic, data) {
    if (subject.defaultView instanceof Ci.nsIDOMChromeWindow &&
        subject.location.href.startsWith(Services.prefs.getCharPref('browser.chromeURL'))) {
      let window = subject.defaultView;
      let windowUtils = window.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindowUtils);
      // Allow the page to call window.close() to close the top level browser window.
      windowUtils.allowScriptsToClose();

      //subject.documentElement.setAttribute("width", "800");
      //subject.documentElement.setAttribute("height", "600");
    }
  }, name, false);
});
