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
  frame = document.createElement("iframe");
  frame.id = "devtools";
  frame.target = document.getElementById("content");
  frame.setAttribute("mozbrowser", "true");
  frame.setAttribute("src", "about:devtools-toolbox?target");
  document.body.appendChild(frame);
}
