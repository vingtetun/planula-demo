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
  let chromeURL = Services.prefs.getCharPref("browser.chromeURL");
  let channel = BroadcastChannelFor(chromeURL, "addons");
  channel.addEventListener("message", ({ data }) => {
    if (data.event == "install") {
      installAddon(data);
      Addons.push(data);
      channel.postMessage({ event: "installed", id: data.id });
    }
    else if (data.event == "uninstall") {
      Addons = Addons.filter(a => a.id != data.id);
      let addon = AddonInstances.get(data.id);
      if (addon) {
        addon.shutdown();
        AddonInstances.delete(data.id);
      }
      channel.postMessage({ event: "uninstalled", id: data.id });
    }
    else if (data.event == "isInstalled") {
      let isInstalled = AddonInstances.has(data.id);
      channel.postMessage({ event: "isInstalledResponse", isInstalled, id: data.id });
    }
    Services.prefs.setCharPref("webextensions.list", JSON.stringify(Addons));
    Services.prefs.savePrefFile(null)
  });

  Addons.forEach(installAddon);
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
