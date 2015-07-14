/*!

   MPEG-DASH engine plugin for Flowplayer HTML5

   requires:
   - Flowplayer HTML5 version 6.x or greater
   - dash.js https://github.com/Dash-Industry-Forum/dash.js

*/

(function () {
    var win = window,
        clientSupport = flowplayer.support.video &&
                // work around Mac OS Yosemite issue
                // https://github.com/Dash-Industry-Forum/dash.js/issues/492
                typeof win.MediaSource == "function" &&
                win.MediaSource.isTypeSupported('video/mp4; codecs="avc1.640029, mp4a.40.5"'),

        engineImpl = function mpegdashEngine(player, root) {
            var bean = flowplayer.bean,
                common = flowplayer.common,
                mediaPlayer,
                videoTag,
                posterClass = "is-poster",
                poster = false,
                dashstop = false,
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
                            player.trigger('resume', [player]);
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

                            poster = common.hasClass(root, posterClass);
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
                    },

                    resume: function () {
                        if (player.finished) {
                            videoTag.currentTime = 0;
                        }
                        videoTag.play();
                    },

                    pause: function () {
                        videoTag.pause();
                    },

                    seek: function (time) {
                        if (videoTag.paused) {
                            // dash.js always resumes playback after seek
                            // see also stop handle below
                            bean.one(videoTag, "seeked.dashpaused", function () {
                                setTimeout(function () {
                                    videoTag.pause();
                                    if (dashstop) {
                                        bean.one(videoTag, "play.dashstop", function () {
                                            common.removeClass(root, posterClass);
                                        });
                                        common.addClass(root, posterClass);
                                        dashstop = false;
                                    }
                                }, 0);
                            });
                        }
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

            player.on("stop", function () {
                // work around delayed pause on seek
                dashstop = poster;
            });

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
