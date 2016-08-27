window.onload = function() {
  var video = document.querySelector("video");
  var videos = document.getElementById("videos");
  var socket = io();
  
  var emitCurrentTime = function() {
    socket.emit('seeking', {
      'time': video.currentTime,
      'paused': video.paused
    });
  };

  var emitCurrentVideo = function() {
    socket.emit('video-select',
      {'video': videos.options[videos.selectedIndex].value});
  };

  var emitSeeked = function() {
    socket.emit('seeked');
  };

  var updateVideos = function(data) {
    videos.removeEventListener('change', emitCurrentVideo, false);
    while (videos.options.length > 0) {
        videos.remove(0);
    }
    var option = document.createElement("option");
    videos.add(option);
    var selectedIndex = -1;
    for (var i = 0; i < data.videos.length; i++) {
      option = document.createElement("option");
      option.text = option.value = data.videos[i];
      if (data.videos[i] == data.video) option.selected = true;
      videos.add(option);
    }
    videos.addEventListener('change', emitCurrentVideo);
  };

  var updateSeekTime = function(data, cb) {
    if (Math.abs(data.time - video.currentTime) < 10) {
      if (cb) cb();
      return;
    }
    video.removeEventListener('timeupdate', emitCurrentTime, false);
    video.currentTime = data.time;
    video.addEventListener('timeupdate', emitCurrentTime);
    if (cb) cb();
  };

  var pauseVideo = function(data, update) {
    if (video.paused) return;
    video.removeEventListener('timeupdate', emitCurrentTime, false);
    video.pause();
    if (update) updateSeekTime(data);
    video.addEventListener('timeupdate', emitCurrentTime);
  };

  var playVideo = function(data, update) {
    if (!video.paused) return;
    video.removeEventListener('timeupdate', emitCurrentTime, false);
    setTimeout(function() {
      if (video.paused) {
        if (update) updateSeekTime(data);
        video.play();
        video.addEventListener('timeupdate', emitCurrentTime, false);
      }
    }, 500);
  };

  socket.on('pause',  function(data) {
    pauseVideo(data, true);
  });

  socket.on('play', function(data) {
    playVideo(data, true);
  });

  socket.on('seek', function(data) {
    updateSeekTime(data, emitSeeked);
  });

  socket.on('update', function(data) {
    updateSeekTime(data, function() {
      if (data.paused) {
        pauseVideo(data);
      } else {
        playVideo(data);
      }
    });
  });

  socket.on('change-video', function(data) {
    pauseVideo();
    video.setAttribute('src', data.video);
    video.setAttribute('type', data.mime_type);
    video.load();
    pauseVideo(data, true);
  });

  socket.on('init', function(data) {
    updateVideos(data);
  });

  video.addEventListener('timeupdate', emitCurrentTime);
};
