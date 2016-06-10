'use strict';


let StartupCacheQueue = {
  data: [],
  channel: new BroadcastChannel('browserAction'),

  listen: function() {
    this.channel.onmessage = (msg) => {
      this.data.push(msg);
    }
  },

  unlisten: function() {
    this.channel.close();
  }
};
StartupCacheQueue.listen();
