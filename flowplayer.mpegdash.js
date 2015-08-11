/*!

   MPEG-DASH engine plugin for Flowplayer HTML5

   Copyright (c) 2015, Flowplayer Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Includes dash.all.js:
   Copyright (c) 2015, Dash Industry Forum. **All rights reserved.
   https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md

   requires:
   - Flowplayer HTML5 version 6.x or greater
   - dash.js https://github.com/Dash-Industry-Forum/dash.js

*/

(function () {
    var win = window,
        clientSupport = flowplayer.support.video &&
                win.MediaSource &&
                win.MediaSource.isTypeSupported('video/mp4; codecs="avc1.640029, mp4a.40.5"'),

        engineImpl = function mpegdashEngine(player, root) {
            var bean = flowplayer.bean,
                common = flowplayer.common,
                mediaPlayer,
                videoTag,
                preventDashResume = false,
                context = new Dash.di.DashContext(),

                engine = {
                    engineName: engineImpl.engineName,

                    pick: function (sources) {
                        var i,
                            source;

                        for (i = 0; i < sources.length; i = i + 1) {
                            source = sources[i];
                            if (source.type == "application/dash+xml") {
                                return source;
                            }
                        }
                    },

                    load: function (video) {
                        common.removeNode(common.findDirect("video", root)[0] || common.find(".fp-player > video", root)[0]);
                        videoTag = common.createElement("video");

                        bean.on(videoTag, "play", function () {
                            if (preventDashResume) {
                                // doing this here using variable
                                // avoids resume firing
                                videoTag.pause();
                                preventDashResume = false;
                            } else {
                                player.trigger('resume', [player]);
                            }
                        });
                        bean.on(videoTag, "pause", function () {
                            player.trigger('pause', [player]);
                        });
                        bean.on(videoTag, "timeupdate", function () {
                            player.trigger('progress', [player, videoTag.currentTime]);
                        });
                        bean.on(videoTag, "loadeddata", function () {
                            flowplayer.extend(video, {
                                duration: videoTag.duration,
                                seekable: videoTag.seekable.end(null),
                                width: videoTag.videoWidth,
                                height: videoTag.videoHeight,
                                url: videoTag.currentSrc
                            });
                            player.trigger('ready', [player, video]);
                        });
                        bean.on(videoTag, "seeked", function () {
                            player.trigger('seek', [player, videoTag.currentTime]);
                        });
                        bean.on(videoTag, "progress", function (e) {
                            try {
                                var buffered = videoTag.buffered,
                                    buffer = buffered.end(0), // first loaded buffer
                                    ct = videoTag.currentTime,
                                    buffend = 0,
                                    i;

                                // buffered.end(null) will not always return the current buffer
                                // so we cycle through the time ranges to obtain it
                                if (ct) {
                                    for (i = 1; i < buffered.length; i = i + 1) {
                                        buffend = buffered.end(i);

                                        if (buffend >= ct && buffered.start(i) <= ct) {
                                            buffer = buffend;
                                        }
                                    }
                                }
                                video.buffer = buffer;
                            } catch (ignored) {}
                            player.trigger('buffer', [player, e]);
                        });
                        bean.on(videoTag, "ended", function () {
                            player.trigger('finish', [player]);
                        });
                        bean.on(videoTag, "volumechange", function () {
                            player.trigger('volume', [player, videoTag.volume]);
                        });

                        videoTag.className = 'fp-engine mpegdash-engine';
                        common.prepend(common.find(".fp-player", root)[0], videoTag);

                        mediaPlayer = new MediaPlayer(context);
                        mediaPlayer.setAutoPlay(player.conf.autoplay || player.conf.splash);
                        mediaPlayer.setScheduleWhilePaused(true);
                        mediaPlayer.startup();
                        mediaPlayer.attachView(videoTag);
                        mediaPlayer.attachSource(video.src);

                        player.on("beforeseek", function () {
                            preventDashResume = player.conf.autoplay && player.paused;
                        });
                    },

                    resume: function () {
                        videoTag.play();
                    },

                    pause: function () {
                        videoTag.pause();
                    },

                    seek: function (time) {
                        videoTag.currentTime = time;
                    },

                    volume: function (level) {
                        if (videoTag) {
                            videoTag.volume = level;
                        }
                    },

                    speed: function (val) {
                        videoTag.playbackRate = val;
                        player.trigger('speed', [player, val]);
                    },

                    unload: function () {
                        if (mediaPlayer) {
                            mediaPlayer.reset();
                        }
                        common.removeNode(videoTag);
                        player.trigger('unload', [player]);
                    }
                };

            return engine;
        };


    engineImpl.engineName = 'mpegdash';
    engineImpl.canPlay = function (type) {
        return type == "application/dash+xml";
    };
    // only load engine if it can be used
    if (clientSupport) {
        flowplayer.engines.push(engineImpl);
    }

}());
