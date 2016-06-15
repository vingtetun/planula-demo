(function () {

let channel = new BroadcastChannel('browserUI');
channel.onmessage = function ({data}) {
  let { url } = data.options;
  let iframe = document.createElement('iframe');
  iframe.setAttribute('mozbrowser', 'true');
  iframe.id = 'tabs';
  iframe.setAttribute('src', url);
  document.body.insertBefore(iframe, document.getElementById('chrome'));
};

})()
