dump("bootstrap\n");

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");

let CHROME_PREF = "browser.chromeURL";
let addonChannel;

function startup() {
  Cu.import("resource://gre/modules/ExtensionManagement.jsm");
  ExtensionManagement.registerScript("resource://webextensions/utils.js");

  // Init devtools so that about:devtools-toolbox works asap
  let { loader } = Cu.import("resource://devtools/shared/Loader.jsm", {});
  // Ensure loading main devtools module that hooks up into browser UI
  // and initialize all devtools machinery.
  loader.require("devtools/client/framework/devtools-browser");

  setupAddons();

  Services.prefs.addObserver(CHROME_PREF, chromePrefObserver, false);
  chromePrefObserver();
  Services.obs.addObserver(onDocumentLoaded, "content-document-loaded", false);
}

function install() {
}

function shutdown() {
  let { WindowUtils } = Cu.import("resource://webextensions/glue.jsm", {});
  WindowUtils.destroy();
  addonChannel.destroy();
  Services.prefs.removeObserver(CHROME_PREF, chromePrefObserver);
  Services.obs.removeObserver(onDocumentLoaded, "content-document-loaded", false);

  AddonInstances.forEach(addon => addon.shutdown());
}

function onDocumentLoaded(subject, topic, data) {
  let window = subject.defaultView;
  // Use startsWith as the url may be appended with some query parameters
  // Like ?url=http://command.line.site.com
  let chromeURL = Services.prefs.getCharPref("browser.chromeURL");
  if (!window || !window.location.href.startsWith(chromeURL) || chromeURL.startsWith("chrome:")) {
    return;
  }

  function onLoaded() {
    // Update both channels origin, but only when the page is loaded
    // so that we don't send message before the browser ui is ready
    let { WindowUtils } = Cu.import("resource://webextensions/glue.jsm", {});
    WindowUtils.setOrigin(chromeURL);
    addonChannel.setOrigin(chromeURL);

    // Ensure dispatching "browser-delayed-startup-finished" to not break marionette
    // GeckoDriver.prototype.newSession
    // in testing/marionette/driver.js
    // Note that it also starts devtools.
    Services.obs.notifyObservers(window, "browser-delayed-startup-finished", null);
  }

  if (window.document.readyState === "complete") {
    onLoaded();
  } else {
    window.addEventListener("load", function onLoad() {
      window.removeEventListener("load", onLoad);
      onLoaded();
    }, true);
  }
}

function chromePrefObserver(subj, topic, data) {
  // Reset the channels if we switch back to browser.xul
  let { WindowUtils } = Cu.import("resource://webextensions/glue.jsm", {});
  let chromeURL = Services.prefs.getCharPref(CHROME_PREF);
  if (chromeURL.startsWith("chrome:")) {
    WindowUtils.off();
    addonChannel.off();
  }
}

let Addons = [];
let AddonInstances = new Map();
try {
  Addons = JSON.parse(Services.prefs.getCharPref("webextensions.list"));
  if (!Addons || !Array.isArray(Addons)) {
    Addons = [];
  }
} catch(e) {}


function setupAddons() {
  let { Channel, onWindow } = Cu.import("resource://webextensions/glue.jsm", {});
  addonChannel = new Channel(true);

  addonChannel.on("addons", "install", (action, data, channel) => {
    if (AddonInstances.has(data.id)) {
      return;
    }
    installAddon(data);
    Addons.push(data);
    saveAddonList();
    channel.postMessage({ event: "installed", id: data.id });
  }, true);

  addonChannel.on("addons", "uninstall", (action, data, channel) => {
    Addons = Addons.filter(a => a.id != data.id);
    let addon = AddonInstances.get(data.id);
    if (addon) {
      addon.shutdown();
      AddonInstances.delete(data.id);
    }
    saveAddonList();
    channel.postMessage({ event: "uninstalled", id: data.id });
  }, true);

  addonChannel.on("addons", "isInstalled", (action, data, channel) => {
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
