/*jslint browser: true, for: true */
/*global Dash, flowplayer, jQuery, MediaPlayer, window */

/*!

   MPEG-DASH engine plugin for Flowplayer HTML5 version 5.x

   Copyright 2015 Flowplayer Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Includes dash.all.js:
   Copyright (c) 2015, Dash Industry Forum. **All rights reserved.
   https://github.com/Dash-Industry-Forum/dash.js/blob/master/LICENSE.md

   requires:
   - Flowplayer HTML5 version 5.x
   - dash.js https://github.com/Dash-Industry-Forum/dash.js
   revision: $GIT_ID$

*/

(function ($) {
    "use strict";
    if (!flowplayer.support.video || !window.MediaSource) {
        return;
    }

    flowplayer.engine.mpegdash = function (player, root) {
        var mediaPlayer,
            videoTag,
            context = new Dash.di.DashContext();

        return {
            pick: function (sources) {
                var i;

                for (i = 0; i < sources.length; i += 1) {
                    if (sources[i].type.toLowerCase() === "application/dash+xml") {
                        return sources[i];
                    }
                }
            },
            load: function (video) {
                var livestartpos = 0;

                root.find('video').remove();
                videoTag = $("<video/>")[0];
                $(videoTag).on('play', function () {
                    root.trigger('resume', [player]);
                });
                $(videoTag).on('pause', function () {
                    root.trigger('pause', [player]);
                });
                $(videoTag).one('timeupdate.dashlivestart', function () {
                    if (player.conf.live || root.hasClass("is-live")) {
                        livestartpos = videoTag.currentTime;
                    }
                });
                $(videoTag).on('timeupdate', function () {
                    root.trigger('progress', [player, videoTag.currentTime - livestartpos]);
                });
                $(videoTag).on('loadeddata', function () {
                    video.duration = video.seekable = videoTag.duration;
                    root.trigger('ready', [player, video]);

                    // fix timing for poster class
                    var poster = "is-poster";
                    if (root.hasClass(poster)) {
                        player.bind("stop.dashposter", function () {
                            setTimeout(function () {
                                root.addClass(poster);
                                $(videoTag).one("play.dashposter", function () {
                                    root.removeClass(poster);
                                });
                            }, 0);
                        });
                    }

                    if (player.conf.autoplay) {
                        // let the fp API take care of autoplay
                        // otherwise dash.js triggers play when seeking to
                        // unbuffered positions
                        videoTag.play();
                    }
                });
                $(videoTag).on('seeked', function () {
                    root.trigger('seek', [player, videoTag.currentTime]);
                });
                $(videoTag).on('progress', function (e) {
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
                    root.trigger('buffer', [player, e]);
                });
                $(videoTag).on('ended', function () {
                    root.trigger('finish', [player]);
                    if (!player.conf.autoplay) {
                        // replay fix for Safari
                        $(videoTag).one("seeked.dashreplay", function () {
                            if (!videoTag.currentTime) {
                                videoTag.play();
                            }
                        });
                    }
                });
                $(videoTag).on('volumechange', function () {
                    root.trigger('volume', [player, videoTag.volume]);
                });


                videoTag.className = 'fp-engine dash-engine';
                root.prepend(videoTag);

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
                            errobj.video = $.extend(video, {
                                src: video.src,
                                url: e.event.url || video.src
                            });
                        }
                        player.trigger('error', [player, errobj]);
                    }
                }, false);

                player.bind("error", function () {
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
                root.trigger('speed', [player, val]);
            },
            unload: function () {
                if (player.conf.live || root.hasClass("is-live")) {
                    videoTag.play();
                }
                root.trigger("unload", [player]);
                if (mediaPlayer) {
                    mediaPlayer.reset();
                }
            }

        };

    };

    $(function () {
        // hack: globally force dash engine, but allow other global config
        flowplayer.conf.engine = "mpegdash";
    });

}(jQuery));
