let buttons = new Map();

let channel = new BroadcastChannel("browserAction");
channel.onmessage = function ({data}) {
  if (data.action == "openPopup") {
    let { id, popup } = data.options;
    let btn = buttons.get(id);
    PopupHelper.open({
      url: popup,
      type: PopupHelper.Popup,
      anchor: btn
    });
  } else if (data.action == "shutdown") {
    let btn = buttons.get(data.options.id);
    btn.remove();
  } else if (data.action == "update") {
    data = data.options;

    let btn;
    if (!buttons.has(data.id)) {
      // Create the bare DOM
      btn = document.createElement("button");
      btn.className = "extension-button";
      btn.addEventListener("click", onClick);
      btn.dataset.id = data.id;
      let extensionsbar = document.getElementById("navbar-extensions");
      extensionsbar.appendChild(btn);
      buttons.set(data.id, btn);
    } else {
      btn = buttons.get(data.id);
    }

    // Update its state
    btn.setAttribute("title", data.title || "");
    let badge = btn.querySelector(".button-badge");
    if (data.badgeText) {
      if (!badge) {
        let badge = btn.ownerDocument.createElement("div");
        badge.className = "button-badge";
        badge.setAttribute("style", "position: absolute; bottom: 0; right: 0px; border: 1px solid black; border-radius: 5px;");
        btn.appendChild(badge);
      }
      badge.textContent = this.data.badgeText;
      badge.style.backgroundColor = this.badgeBackgroundColor || "#e0e0e0";
    } else {
      if (badge) {
        badge.remove();
      }
    }
    if (data.icon) {
      btn.innerHTML = "<img src='"+data.icon[Object.keys(data.icon)[0]]+"' />";
    } else {
      btn.innerHTMl = "";
    }
  }
};

function onClick(event) {
  let id = event.target.dataset.id;
  channel.postMessage({ event: "click", args: { buttonId: id } });
}
