/*jslint browser: true, for: true */
/*global Dash, flowplayer, MediaPlayer, window */

/*!

   MPEG-DASH engine plugin for Flowplayer HTML5

   Copyright (c) 2015, Flowplayer Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Includes dash.all.js:
   Copyright (c) 2015, Dash Industry Forum. **All rights reserved.
   https://github.com/Dash-Industry-Forum/dash.js/blob/master/LICENSE.md

   requires:
   - Flowplayer HTML5 version 6.x or greater
   - dash.js https://github.com/Dash-Industry-Forum/dash.js
   revision: $GIT_ID$

*/

(function () {
    "use strict";
    var engineName = "dash",
        mse = window.MediaSource,
        common = flowplayer.common,
        extend = flowplayer.extend,

        isDashType = function (typ) {
            return typ.toLowerCase() === "application/dash+xml";
        },

        engineImpl = function mpegdashEngine(player, root) {
            var bean = flowplayer.bean,
                mediaPlayer,
                videoTag,
                context,

                engine = {
                    engineName: engineName,

                    pick: function (sources) {
                        var i,
                            source;

                        for (i = 0; i < sources.length; i += 1) {
                            source = sources[i];
                            if (isDashType(source.type)
                                    && (!source.engine || source.engine === engineName)) {
                                if (typeof source.src === 'string') {
                                    source.src = common.createAbsoluteUrl(source.src);
                                }
                                return source;
                            }
                        }
                    },

                    load: function (video) {
                        var init = !context,
                            conf = player.conf,
                            livestartpos = 0;

                        if (init) {
                            context = new Dash.di.DashContext();

                            common.removeNode(common.findDirect("video", root)[0]
                                    || common.find(".fp-player > video", root)[0]);
                            videoTag = common.createElement("video", {
                                className: "fp-engine " + engineName + "-engine",
                                autoplay: conf.autoplay
                                    ? "autoplay"
                                    : false
                            });
                            videoTag.setAttribute("x-webkit-airplay", "allow");
                        } else {
                            mediaPlayer.reset();
                        }

                        bean.on(videoTag, "play", function () {
                            player.trigger('resume', [player]);
                        });
                        bean.on(videoTag, "pause", function () {
                            player.trigger('pause', [player]);
                        });
                        bean.one(videoTag, "timeupdate." + engineName, function () {
                            if (video.live) {
                                livestartpos = videoTag.currentTime;
                            }
                        });
                        bean.on(videoTag, "timeupdate", function () {
                            player.trigger('progress', [player, videoTag.currentTime - livestartpos]);
                        });
                        bean.on(videoTag, "loadeddata", function () {
                            extend(video, {
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
                            var ct = videoTag.currentTime,
                                buffer = 0,
                                buffend,
                                buffered,
                                last,
                                i;

                            try {
                                buffered = videoTag.buffered;
                                last = buffered.length - 1;
                                buffend = 0;
                                // cycle through time ranges to obtain buffer
                                // nearest current time
                                if (ct) {
                                    for (i = last; i > -1; i -= 1) {
                                        buffend = buffered.end(i);

                                        if (buffend >= ct) {
                                            buffer = buffend;
                                        }
                                    }
                                }
                            } catch (ignored) {}

                            video.buffer = buffer;
                            player.trigger('buffer', [player, e]);
                        });
                        bean.on(videoTag, "ended", function () {
                            player.trigger('finish', [player]);

                            bean.one(videoTag, "seeked." + engineName, function () {
                                if (!videoTag.currentTime) {
                                    videoTag.play();
                                }
                            });
                        });
                        bean.on(videoTag, "volumechange", function () {
                            player.trigger('volume', [player, videoTag.volume]);
                        });

                        mediaPlayer = new MediaPlayer(context);
                        mediaPlayer.startup();

                        // caching can cause failures in playlists
                        // for the moment disable entirely
                        mediaPlayer.enableLastBitrateCaching(false);
                        // handled by fp API
                        mediaPlayer.setAutoPlay(false);
                        // for seeking in paused state
                        mediaPlayer.setScheduleWhilePaused(true);

                        mediaPlayer.addEventListener("error", function (e) {
                            var fperr,
                                errobj;

                            switch (e.error) {
                            case "download":
                                fperr = 4;
                                break;
                            case "manifestError":
                                fperr = 5;
                                break;
                            case "mediasource":
                                switch (e.event) {
                                case "MEDIA_ERR_DECODE":
                                    fperr = 3;
                                    break;
                                case "MEDIA_ERR_SRC_NOT_SUPPORTED":
                                    fperr = 5;
                                    break;
                                case "MEDIA_ERR_NETWORK":
                                    fperr = 2;
                                    break;
                                case "MEDIA_ERR_ABORTED":
                                    fperr = 1;
                                    break;
                                }
                                break;
                            }
                            if (fperr) {
                                errobj = {code: fperr};
                                if (fperr > 2) {
                                    errobj.video = extend(video, {
                                        src: video.src,
                                        url: e.event.url || video.src
                                    });
                                }
                                player.trigger('error', [player, errobj]);
                            }
                        }, false);

                        if (init) {
                            common.prepend(common.find(".fp-player", root)[0], videoTag);
                        }

                        mediaPlayer.attachView(videoTag);
                        mediaPlayer.attachSource(video.src);

                        if (videoTag.paused && (video.autoplay || conf.autoplay)) {
                            bean.on(videoTag, "loadeddata." + engineName, function () {
                                videoTag.play();
                            });
                        }
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
                            mediaPlayer = 0;
                            context = 0;
                            bean.off(videoTag);
                            common.removeNode(videoTag);
                            videoTag = 0;
                        }
                    }
                };

            return engine;
        };

    if (mse && flowplayer.version.indexOf("5.") !== 0) {
        // only load engine if it can be used
        engineImpl.engineName = engineName; // must be exposed
        engineImpl.canPlay = function (type, conf) {
            /*
              WARNING: MediaSource.isTypeSupported very inconsistent!
              e.g. Safari ignores codecs entirely, even bogus, like codecs="XYZ"
              example avc3 main level 3.1 + aac_he: avc3.4d401f; mp4a.40.5
              example avc1 high level 4.1 + aac_lc: avc1.640029; mp4a.40.2
              default: avc1 baseline level 3.0 + aac_lc
            */
            // inject dash conf at earliest opportunity
            var dashconf = extend({
                type: "video/mp4",
                codecs: "avc1.42c01e, mp4a.40.2"
            }, flowplayer.conf[engineName], conf[engineName], conf.clip[engineName]);

            return isDashType(type) &&
                    mse.isTypeSupported(dashconf.type + '; codecs="' + dashconf.codecs + '"');
        };

        // put on top of engine stack
        // so mpegedash is tested before html5
        flowplayer.engines.unshift(engineImpl);

    }

}());
