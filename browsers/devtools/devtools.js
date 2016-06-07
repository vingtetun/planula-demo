// Create an iframe for the devtools toolbox
let devtools = document.createElement('iframe');
devtools.id = 'devtools';
// `target` attribute is used to tell which document to debug
devtools.target = document.getElementById('content');
// This url loads a devtools toolbox. The `target` parameter allows
// to request the toolbox to look for the JS `target` attribute on the
// iframe.
devtools.setAttribute('src', 'about:devtools-toolbox?target');
devtools.setAttribute('style', 'flex-grow: 1;');
document.body.appendChild(devtools);
