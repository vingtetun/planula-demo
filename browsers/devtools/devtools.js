window.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key == "i") {
    toggleDevtools();
  }
});

function toggleDevtools() {
  let frame = document.getElementById("devtools");
  if (frame) {
    frame.remove();
    return;
  }
  // Create an iframe for the devtools toolbox
  frame = document.createElement("iframe");
  frame.id = "devtools";
  // `target` attribute is used to tell which document to debug
  frame.target = document.getElementById("content");
  // This url loads a devtools toolbox. The `target` parameter allows
  // to request the toolbox to look for the JS `target` attribute on the
  // iframe.
  frame.setAttribute("src", "about:devtools-toolbox?target");
  frame.setAttribute('style', 'flex-grow: 1;');
  document.body.appendChild(frame);
}
