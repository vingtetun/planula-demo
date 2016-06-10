addEventListener("load", function () {
  preloadAddons();

  let group = document.querySelector(".group.addons");
  group.addEventListener("click", function(event) {
    let { id, path } = event.target.dataset;
    if (!id) return;
    if (event.target.classList.contains("keep-installed")) {
      disable(id).then(() => {
        event.target.classList.remove("enabled");
      });
    }
    event.target.classList.toggle("keep-installed");
  });

  group.addEventListener("mouseover", function(event) {
    let { id, path } = event.target.dataset;
    if (!id) return;
    enable(id).then(() => {
      event.target.classList.add("enabled");
    });
  });

  group.addEventListener("mouseout", function(event) {
    let { id, path } = event.target.dataset;
    if (!id) return;
    if (event.target.classList.contains("keep-installed")) {
      return;
    }
    disable(id).then(() => {
      event.target.classList.remove("enabled");
    });
  });
});

function preloadAddons() {
  for(let addon of document.querySelectorAll(".group.addons li")) {
    let extension = addon;
    let { id, path } = addon.dataset;
    maybeInstall(path, id).then((enabled) => {
      extension.classList.add("installed");
      extension.classList.toggle("enabled", enabled);
    });
  }
}

let am = navigator.mozAddonManager;

let cache = {};

function maybeInstall(path, id) {
  return new Promise(function(resolve, reject) {
    am.getAddonByID(id).then(
     function(addon) {
        if (addon) {
          resolve(addon.isEnabled);
        } else {
          install(path).then(() => {
            disable(id);
            resolve(false);
          });
        }
      }
    );
  });
}

function getAddonByID(id) {
  return new Promise(function(resolve, reject) {
    if (cache[id]) {
      resolve(cache[id]);
    }

    am.getAddonByID(id).then(
      function success(addon) {
        if (!addon) {
          resolve(null);
          return;
        }

        cache[id] = addon;
        resolve(cache[id]);
      },
      function failure() {
        reject();
      }
    );
  });
}

function install(path) {
  return new Promise(done => {
    let url = new URL(path, location);
    am.createInstall({url}).then(
      function success(installer) {

        let events = [
          "onDownloadStarted",
          "onDownloadProgress",
          "onDownloadEnded",
          "onDownloadCancelled",
          "onDownloadFailed",
          "onInstallStarted",
          "onInstallEnded",
          "onInstallCancelled",
          "onInstallFailed",
        ];

        events.forEach(function(name) {
          installer.addEventListener(name, function() {
            if (name == "onInstallEnded") done();
          });
        });

        installer.install();
      },
      function failure() {
        console.log('Failed to createInstall for: ', url);
      }
    );
  });
}

function uninstall(id) {
  getAddonByID(id).then(
    function succes(addon) {
      addon.uninstall().then(
        function success() {
          console.log('success to call uninstall for :', id);
        },
        function failure() {
          console.log('Fail to call uninstall for :', id);
        }
      );
    },

    function failure() {
      console.log('Fail to call getAddonById for :', id);
    }
  );
}

function disable(id) {
  return new Promise(done => {
    getAddonByID(id).then(
      function succes(addon) {
        addon.disable().then(
          function success() {
            done();
            console.log('success to call disable for :', id);
          },
          function failure() {
            console.log('Fail to call disable for :', id);
          }
        );
      },

      function failure() {
        console.log('Fail to call getAddonById for :', id);
      }
    );
  });
}

function enable(id) {
  return new Promise(done => {
    getAddonByID(id).then(
      function succes(addon) {
        addon.enable().then(
          function success() {
            done();
            console.log('success to call enable for :', id);
          },
          function failure() {
            console.log('Fail to call enable for :', id);
          }
        );
      },

      function failure() {
        console.log('Fail to call getAddonById for :', id);
      }
    );
  });
}
