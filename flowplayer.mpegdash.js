/*jslint browser: true, for: true */
/*global Dash, flowplayer, MediaPlayer, window */

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
    "use strict";
    var engineName = "mpegdash",
        mse = window.MediaSource,
        extend = flowplayer.extend,

        engineImpl = function mpegdashEngine(player, root) {
            var bean = flowplayer.bean,
                common = flowplayer.common,
                mediaPlayer,
                videoTag,
                context = new Dash.di.DashContext(),

                engine = {
                    engineName: engineName,

                    pick: function (sources) {
                        var i,
                            source;

                        for (i = 0; i < sources.length; i += 1) {
                            source = sources[i];
                            if (source.type === "application/dash+xml") {
                                return source;
                            }
                        }
                    },

                    load: function (video) {
                        var init = !mediaPlayer,
                            livestartpos = 0;

                        common.removeNode(common.findDirect("video", root)[0] || common.find(".fp-player > video", root)[0]);
                        videoTag = common.createElement("video", {
                            className: "fp-engine hlsjs-engine",
                            autoplay: player.conf.autoplay || !init
                        });
                        videoTag.setAttribute("x-webkit-airplay", "allow");

                        bean.on(videoTag, "play", function () {
                            player.trigger('resume', [player]);
                        });
                        bean.on(videoTag, "pause", function () {
                            player.trigger('pause', [player]);
                        });
                        bean.one(videoTag, "timeupdate.dashlivestart", function () {
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

                            // fix timing for poster class
                            var poster = "is-poster";
                            if (common.hasClass(root, poster)) {
                                player.on("stop.dashposter", function () {
                                    setTimeout(function () {
                                        common.addClass(root, poster);
                                        bean.one(videoTag, "play.dashposter", function () {
                                            common.removeClass(root, poster);
                                        });
                                    }, 0);
                                });
                            }

                            if (player.conf.autoplay || !init) {
                                // let the fp API take care of autoplay
                                // otherwise dash.js triggers play when seeking to
                                // unbuffered positions
                                videoTag.play();
                            }
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
                                    for (i = 1; i < buffered.length; i += 1) {
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
                            if (flowplayer.support.browser.safari && !player.conf.autoplay) {
                                bean.one(videoTag, "seeked.dashreplay", function () {
                                    if (!videoTag.currentTime) {
                                        videoTag.play();
                                    }
                                });
                            }
                        });
                        bean.on(videoTag, "volumechange", function () {
                            player.trigger('volume', [player, videoTag.volume]);
                        });

                        common.prepend(common.find(".fp-player", root)[0], videoTag);

                        if (mediaPlayer) {
                            mediaPlayer.reset();
                        }
                        mediaPlayer = new MediaPlayer(context);
                        mediaPlayer.startup();
                        mediaPlayer.attachView(videoTag);

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
                                default:
                                    fperr = 0;
                                }
                                break;
                            default:
                                fperr = 0;
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

                        player.on("error", function () {
                            mediaPlayer.reset();
                        });

                        mediaPlayer.attachSource(video.src);
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
                            common.removeNode(videoTag);
                            videoTag = 0;
                        }
                    }
                };

            return engine;
        };

    if (mse) {
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
            }, conf.dash, conf.clip.dash);

            return type === "application/dash+xml" &&
                    mse.isTypeSupported(dashconf.type + '; codecs="' + dashconf.codecs + '"');
        };

        // put on top of engine stack
        // so mpegedash is tested before html5
        flowplayer.engines.unshift(engineImpl);
    }

}());
