var express = require('express');
var mime = require('mime');

var fs = require('fs');
var config = require('./config');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var curr = {
  "time": 0,
  "video": "",
  "mime_type": "",
  "paused": false,
  "videos": fs.readdirSync('./videos')
};

app.use(express.static('public'));
app.use(express.static('videos'));
app.get('/', function (req, res) {
  res.sendFile('/index.html');
});

http.listen(config.port, function(){
  console.log('Listening on port ' + config.port);
});

var numSocketsRemaining;
var updated;
var currentlySeeking = false;
io.on('connection', function(socket) {
  if (currentlySeeking) {
    numSocketsRemaining++;
    socket.emit('seek', curr);
  }
  console.log('Someone connected!');
  var me = socket.request.connection.remoteAddress == '::ffff:127.0.0.1';

  // Broadcast the seek to all sockets if not currently seeking
  function broadcastSeek() {
    currentlySeeking = true;
    numSocketsRemaining = io.engine.clientsCount;
    console.log('Broadcasting seek to ' + numSocketsRemaining + ' clients');
    updated = new Set();
    io.emit('seek', curr);
  }

  // TODO: Should clients that aren't the owner be able to skip around in the
  // video when it is paused?
  // Emit current time to socket if it isn't the host (return true if emitted)
  function emitIfNotMe() {
    return config.only_me && !me;
    if (config.only_me && !me) {
      console.log("Client can't update video, changing back to original state");
      // Delay update so that it comes after client's html5 video player update
      setTimeout(function() {
        socket.emit('update', curr);
      }, 500);
      return true;
    }
    return false;
  }

  function syncEveryone() {
    if (numSocketsRemaining === 0) {
      console.log('Everyone synced...playing');
      curr.paused = false;
      io.emit('play', curr);
      currentlySeeking = false;
    }
  }

  socket.on('disconnect', function() {
    console.log('Someone disconnected!');
    if (currentlySeeking) numSocketsRemaining--;
    syncEveryone();
  });

  // Initial emit (when client first connects)
  socket.emit('init', curr);

  // Only play all videos when everyone has synced
  socket.on('seeked', function() {
    if (!numSocketsRemaining || !currentlySeeking) return;
    console.log(socket.id + ' updated');
    if (!updated.has(socket.id)) numSocketsRemaining--;
    updated.add(socket.id);
    syncEveryone();
  });

  // Emit new video name and reset time to 0
  socket.on('video-select', function (data) {
    if (data.video == curr.video) return;
    if (emitIfNotMe()) return;
    var files = fs.readdirSync('./videos');
    console.log('New video selected ' + data.video);
    if (data.video && files && files.indexOf(data.video) > -1) {
      console.log('Changing video from ' + curr.video + ' to ' + data.video);
      curr.time = 0;
      curr.video = data.video;
      curr.mime_type = mime.lookup(data.video);
      io.emit('change-video', curr);
    }
  });


  // This is how often the client syncs with servers
  // Lower value = syncs more often
  socket.throttle = 20;

  // Used to determine if it's time to sync
  socket.emitTries = 0;

  // Emit new seek time to all other sockets
  socket.on('seeking', function (data) {
    if (emitIfNotMe()) return;
    if (currentlySeeking) return socket.emit('update', curr);
    console.log('Seeking video from ' + curr.time + ' to ' + data.time);
    curr.time = data.time;
    curr.paused = data.paused;
    if (curr.paused) {
      console.log('Pausing video');
      io.emit('pause', curr);
    } else {
      socket.emitTries++;
      if (socket.emitTries%socket.throttle > 0) return;
      console.log('Broadcasting seek');
      broadcastSeek();
    }
  });

  socket.on('play', function(data) {
    if (emitIfNotMe()) return;
    console.log('Playing video from ' + data.time);
    curr.time = data.time;
    curr.paused = false;
    io.emit('play', curr);
  });

});
