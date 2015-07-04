/*!

   MPEG-DASH engine plugin for Flowplayer HTML5 version 5.x

   requires:
   - Flowplayer HTML5 version 5.x
   - dash.js https://github.com/Dash-Industry-Forum/dash.js

*/

(function ($) {
  flowplayer.engine.dash = function(player, root) {
    var mediaPlayer,
    videoTag,
    context = new Dash.di.DashContext();

    return {
      pick: function(sources) {
        if (typeof window.MediaSource == "function" &&
            window.MediaSource.isTypeSupported('video/mp4; codecs="avc1.640029, mp4a.40.5"')) {
          var sources = $.grep(sources, function(src) {
            return src.type === 'application/dash+xml';
          });
          if (!sources.length) return;
          return sources[0];
        }
      },
      load: function(video) {
        root.find('video').remove();
        videoTag = document.createElement('video');
        videoTag.addEventListener('play', function() {
          root.trigger('resume', [player]);
        });
        videoTag.addEventListener('pause', function() {
          root.trigger('pause', [player]);
        });
        videoTag.addEventListener('timeupdate', function() {
          root.trigger('progress', [player, videoTag.currentTime]);
        });
        videoTag.addEventListener('loadedmetadata', function() {
          video.duration = video.seekable = videoTag.duration;
          root.trigger('ready', [player, video]);
        });
        videoTag.addEventListener('seeked', function() {
          root.trigger('seek', [player, videoTag.currentTime]);
        });
        videoTag.addEventListener('progress', function() {
          try {
            var buffered = videoTag.buffered,
                buffer = buffered.end(0), // first loaded buffer
                ct = videoTag.currentTime,
                buffend = 0,
                i;

            // buffered.end(null) will not always return the current buffer
            // so we cycle through the time ranges to obtain it
            if (ct) {
              for (i = 1; i < buffered.length; i++) {
                buffend = buffered.end(i);

                if (buffend >= ct && buffered.start(i) <= ct) {
                  buffer = buffend;
                }
              }
            }
            video.buffer = buffer;
          } catch (ignored) {}
          root.trigger('buffer', [player]);
        });
        videoTag.addEventListener('ended', function() {
          root.trigger('finish', [player]);
        });
        videoTag.addEventListener('volumechange', function() {
          root.trigger('volume', [player, videoTag.volume]);
        });


        videoTag.className = 'fp-engine dash-engine';
        root.prepend(videoTag);

        mediaPlayer = new MediaPlayer(context);
        mediaPlayer.setScheduleWhilePaused(true);
        mediaPlayer.setAutoPlay(player.conf.autoplay || player.conf.splash);
        mediaPlayer.startup();
        mediaPlayer.attachView(videoTag);
        mediaPlayer.attachSource(video.src);
      },
      resume: function() {
        var mplayer = mediaPlayer || videoTag;

        if (player.finished) {
          videoTag.currentTime = 0;
        }
        mplayer.play();
      },
      pause: function() {
        videoTag.pause();
      },
      seek: function(time) {
        if (videoTag.paused) {
          $(videoTag).one("seeked.dashpaused", function () {
            setTimeout(function () {
              videoTag.pause()
            }, 10);
          });
        }
        if (mediaPlayer) {
          mediaPlayer.seek(time);
        } else {
          videoTag.currentTime = time;
        }
      },
      volume: function(level) {
        if (videoTag !== undefined) {
          videoTag.volume = level;
        }
      },
      speed: function(val) {
        videoTag.playbackRate = val;
        root.trigger('speed', [player, val]);
      },
      unload: function() {
        if (mediaPlayer) {
          mediaPlayer.reset();
        }
        $(videoTag).remove();
        root.trigger("unload", [player]);
      }

    };
  };
}(jQuery));
