/*jslint browser: true, for: true */
/*global dashjs, flowplayer, MediaPlayer, window */

/*!

   DASH engine plugin for Flowplayer HTML5

   Copyright (c) 2015-2017, Flowplayer Drive Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Includes dash.js
   Copyright (c) 2015, Dash Industry Forum. All rights reserved.
   https://github.com/Dash-Industry-Forum/dash.js/blob/master/LICENSE.md

   Requires Flowplayer HTML5 version 6.x
   $GIT_DESC$

*/
(function () {
    "use strict";
    var extension = function (dashjs, flowplayer) {
        var engineName = "dash",
            mse = window.MediaSource || window.WebKitMediaSource,
            UA = navigator.userAgent,
            common = flowplayer.common,
            extend = flowplayer.extend,
            version = flowplayer.version,
            coreV6 = version.indexOf("6.") === 0,
            dashconf,

            dashCanPlay = function (sourceType, dashType, dashCodecs) {
                return sourceType.toLowerCase() === "application/dash+xml" &&
                        mse.isTypeSupported(dashType + ';codecs="' + dashCodecs + '"') &&
                        // Android MSE advertises he-aac, but fails
                        (dashCodecs.indexOf("mp4a.40.5") < 0 || UA.indexOf("Android") < 0);
            },

            engineImpl = function dashjsEngine(player, root) {
                var bean = flowplayer.bean,
                    support = flowplayer.support,
                    brwsr = support.browser,
                    desktopSafari = brwsr.safari && support.dataload, // exclude IEMobile
                    mediaPlayer,
                    videoTag,
                    handleError = function (errorCode, src, url) {
                        var errobj = {code: errorCode};

                        if (errorCode > 2) {
                            errobj.video = extend(player.video, {
                                src: src,
                                url: url || src
                            });
                        }
                        return errobj;
                    },

                    lastSelectedQuality = -1,
                    initQualitySelection = function (dashQualitiesConf, initialVideoQuality, data) {
                        // multiperiod not supported
                        var vsets = [],
                            qualities,
                            audioBandwidth = 0,
                            getLevel = function (q) {
                                return isNaN(Number(q))
                                    ? q.level
                                    : q;
                            },
                            setInitialVideoQuality = function (initialVideoQuality, vsets, qsel) {
                                initialVideoQuality = Math.min(initialVideoQuality, vsets.length - 1);
                                mediaPlayer.setAutoSwitchQualityFor("video", false);
                                mediaPlayer.setInitialBitrateFor("video", vsets[initialVideoQuality].bandwidth / 1000);
                                if (qsel) {
                                    player.video.quality = -1;
                                }
                                player.one("progress." + engineName, function () {
                                    mediaPlayer.setAutoSwitchQualityFor("video", true);
                                });
                            },
                            qselConf = dashQualitiesConf && support.inlineVideo &&
                                    data.Period_asArray.length === 1 &&
                                    (!desktopSafari || (desktopSafari && dashconf.qualitiesForSafari));

                        if (!qselConf && initialVideoQuality < 0) {
                            return;
                        }

                        data.Period_asArray[0].AdaptationSet_asArray.forEach(function (aset) {
                            var representations = aset.Representation_asArray,
                                mimeType = aset.mimeType || representations[0].mimeType;

                            if (mimeType.indexOf("video/") === 0) {
                                vsets = vsets.concat(representations.filter(function (repr) {
                                    var codecs = (repr.mimeType || mimeType) + ";codecs=" + repr.codecs;

                                    return mse.isTypeSupported(codecs);
                                }));
                            } else if (mimeType.indexOf("audio/") === 0 && !audioBandwidth) {
                                // too simple: audio tracks may have different bitrates
                                audioBandwidth = representations[0].bandwidth;
                            }
                        });
                        if (vsets.length < 2) {
                            return;
                        }

                        vsets.sort(function (a, b) {
                            return a.bandwidth - b.bandwidth;
                        });

                        if (!qselConf) {
                            setInitialVideoQuality(initialVideoQuality, vsets);
                            return;
                        }

                        switch (typeof dashQualitiesConf) {
                        case "object":
                            qualities = dashQualitiesConf.map(getLevel);
                            break;
                        case "string":
                            qualities = dashQualitiesConf.split(/\s*,\s*/).map(Number);
                            break;
                        default:
                            qualities = vsets.map(function (_repr, i) {
                                return i;
                            });
                            qualities.unshift(-1);
                        }
                        qualities = qualities.filter(function (q) {
                            return q < vsets.length && q > -2;
                        });

                        if (qualities.length < 2) {
                            return;
                        }

                        player.video.qualities = qualities.map(function (idx) {
                            var level = vsets[idx],
                                q = typeof dashQualitiesConf === "object"
                                    ? dashQualitiesConf.filter(function (q) {
                                        return getLevel(q) === idx;
                                    })[0]
                                    : idx,
                                label = q.label || (idx < 0
                                    ? "Auto"
                                    : Math.min(level.width, level.height) + "p " +
                                            "(" + Math.round((level.bandwidth + audioBandwidth) / 1000) + "k)");

                            return {value: idx, label: label};
                        });

                        if (lastSelectedQuality < 0 && initialVideoQuality > -1) {
                            setInitialVideoQuality(initialVideoQuality, vsets, true);
                        } else if (qualities.indexOf(lastSelectedQuality) > -1) {
                            mediaPlayer.setAutoSwitchQualityFor("video", lastSelectedQuality < 0);
                            if (lastSelectedQuality > -1) {
                                mediaPlayer.setInitialBitrateFor("video", vsets[lastSelectedQuality].bandwidth / 1000);
                            }
                            player.video.quality = lastSelectedQuality;
                        } else {
                            player.video.quality = -1;
                        }
                    },
                    keySystem,

                    bc,
                    has_bg,

                    engine = {
                        engineName: engineName,

                        pick: function (sources) {
                            var source = sources.filter(function (s) {
                                var dashType = s.dashType || dashconf.type,
                                    dashCodecs = s.dashCodecs || dashconf.codecs;

                                return dashCanPlay(s.type, dashType, dashCodecs);
                            })[0];

                            if (typeof source.src === 'string') {
                                source.src = common.createAbsoluteUrl(source.src);
                            }
                            return source;
                        },

                        load: function (video) {
                            var conf = player.conf,
                                dashUpdatedConf = extend(dashconf, conf.dash, video.dash),
                                dashQualitiesConf = video.dashQualities || conf.dashQualities,
                                EVENTS = {
                                    ended: "finish",
                                    loadeddata: "ready",
                                    pause: "pause",
                                    play: "resume",
                                    progress: "buffer",
                                    ratechange: "speed",
                                    seeked: "seek",
                                    timeupdate: "progress",
                                    volumechange: "volume",
                                    error: "error"
                                },
                                DASHEVENTS = dashjs.MediaPlayer.events,
                                protection = video.dash && video.dash.protection,
                                autoplay = !!video.autoplay || !!conf.autoplay || !!conf.splash,
                                posterClass = "is-poster",
                                livestartpos = 0;

                            if (video.dashQualities === false || coreV6) {
                                dashQualitiesConf = false;
                            } else if (dashQualitiesConf === undefined) {
                                dashQualitiesConf = true;
                            }

                            if (!mediaPlayer) {
                                videoTag = common.findDirect("video", root)[0]
                                        || common.find(".fp-player > video", root)[0];

                                if (videoTag) {
                                    // destroy video tag
                                    // otherwise <video autoplay> continues to play
                                    common.find("source", videoTag).forEach(function (source) {
                                        source.removeAttribute("src");
                                    });
                                    videoTag.removeAttribute("src");
                                    videoTag.load();
                                    common.removeNode(videoTag);
                                }

                                // dash.js enforces preload="auto" and
                                // autoplay depending on initialization
                                // so setting the attributes here will have no effect
                                videoTag = common.createElement("video", {
                                    "class": "fp-engine " + engineName + "-engine"
                                });
                                if (support.mutedAutoplay && !conf.splash && autoplay) {
                                    videoTag.muted = true;
                                }

                                Object.keys(EVENTS).forEach(function (key) {
                                    var flow = EVENTS[key],
                                        type = key + "." + engineName,
                                        arg;

                                    bean.on(videoTag, type, function (e) {
                                        if (conf.debug && flow.indexOf("progress") < 0) {
                                            console.log(type, "->", flow, e.originalEvent);
                                        }

                                        var vct = videoTag.currentTime,
                                            ct = (mediaPlayer.time && mediaPlayer.time()) || vct,
                                            dur = mediaPlayer.duration(),
                                            buffered = videoTag.buffered,
                                            buffends = [],
                                            i,
                                            updatedVideo = player.video,
                                            src = updatedVideo.src,
                                            errorCode;

                                        switch (flow) {
                                        case "ready":
                                            arg = extend(updatedVideo, {
                                                duration: dur,
                                                seekable: dur,
                                                width: videoTag.videoWidth,
                                                height: videoTag.videoHeight,
                                                url: src
                                            });
                                            break;
                                        case "resume":
                                            if (coreV6 && player.poster) {
                                                common.removeClass(root, posterClass);
                                                player.poster = false;
                                            }
                                            break;
                                        case "seek":
                                            arg = ct;
                                            break;
                                        case "progress":
                                            if (player.live && !player.dvr) {
                                                if (!livestartpos && vct) {
                                                    livestartpos = vct;
                                                }
                                                arg = vct - livestartpos;
                                            } else {
                                                arg = ct;
                                            }
                                            break;
                                        case "speed":
                                            // dash.js often triggers playback rate changes
                                            // when adapting bit rate
                                            // except when in debug mode, only
                                            // trigger explicit events via speed method
                                            if (!dashUpdatedConf.debug) {
                                                e.preventDefault();
                                                return;
                                            }
                                            arg = videoTag.playbackRate;
                                            break;
                                        case "volume":
                                            arg = videoTag.volume;
                                            break;
                                        case "buffer":
                                            for (i = 0; i < buffered.length; i += 1) {
                                                buffends.push(buffered.end(i));
                                            }
                                            arg = buffends.filter(function (b) {
                                                return b >= ct;
                                            }).sort()[0];
                                            updatedVideo.buffer = arg;
                                            break;
                                        case "error":
                                            errorCode = videoTag.error && videoTag.error.code;
                                            arg = handleError(errorCode, src);
                                            break;
                                        }

                                        player.trigger(flow, [player, arg]);
                                    });
                                });

                                player.on("error." + engineName, function () {
                                    if (mediaPlayer) {
                                        player.engine.unload();
                                    }
                                });

                                if (!coreV6) {
                                    player.on("quality." + engineName, function (_e, _api, q) {
                                        mediaPlayer.setAutoSwitchQualityFor("video", q < 0);
                                        if (q > -1) {
                                            mediaPlayer.setQualityFor("video", q);
                                        }
                                        lastSelectedQuality = q;
                                    });

                                } else if (conf.poster) {
                                    var posterHack = function (e) {
                                        if (e.type === "stop" || !autoplay) {
                                            setTimeout(function () {
                                                if (!player.poster) {
                                                    common.addClass(root, posterClass);
                                                    player.poster = true;
                                                }
                                            });
                                        }
                                    };

                                    player.one("ready." + engineName, posterHack).on("stop." + engineName, posterHack);
                                }

                                common.prepend(common.find(".fp-player", root)[0], videoTag);

                            } else {
                                mediaPlayer.reset();
                            }

                            mediaPlayer = dashjs.MediaPlayer().create();
                            player.engine[engineName] = mediaPlayer;

                            if (protection) {
                                mediaPlayer.setProtectionData(protection);
                                mediaPlayer.on(dashjs.Protection.events.KEY_SYSTEM_SELECTED, function (e) {
                                    keySystem = e.data.keySystem.systemString;
                                });
                            }
                            // caching can cause failures in playlists
                            // for the moment disable entirely
                            mediaPlayer.enableLastBitrateCaching(false);
                            // for seeking in paused state
                            mediaPlayer.setScheduleWhilePaused(true);
                            mediaPlayer.setFastSwitchEnabled(UA.indexOf("Trident/7") < 0);
                            mediaPlayer.getDebug().setLogToBrowserConsole(dashUpdatedConf.debug);
                            // live
                            if (typeof dashUpdatedConf.liveDelay === "number") {
                                mediaPlayer.setLiveDelay(dashUpdatedConf.liveDelay);
                            }
                            if (typeof dashUpdatedConf.liveDelayFragmentCount === "number") {
                                mediaPlayer.setLiveDelayFragmentCount(dashUpdatedConf.liveDelayFragmentCount);
                            }
                            mediaPlayer.useSuggestedPresentationDelay(dashUpdatedConf.useSuggestedPresentationDelay);

                            if (dashUpdatedConf.xhrWithCredentials && dashUpdatedConf.xhrWithCredentials.length) {
                                dashUpdatedConf.xhrWithCredentials.forEach(function (requestType) {
                                    mediaPlayer.setXHRWithCredentialsForType(requestType, true);
                                });
                            }

                            Object.keys(DASHEVENTS).forEach(function (key) {
                                var etype = DASHEVENTS[key],
                                    fpEventType = engineName + etype.charAt(0).toUpperCase() + etype.slice(1),
                                    listeners = dashUpdatedConf.listeners,
                                    expose = listeners && listeners.indexOf(fpEventType) > -1;

                                mediaPlayer.on(etype, function (e) {
                                    var src = player.video.src,
                                        videoDashConf = player.video.dash,
                                        loadingClass = "is-loading",
                                        errors = player.conf.errors,
                                        protectionError = "None of the protection key systems supported. Try a different browser.",
                                        fperr,
                                        errobj;

                                    switch (key) {
                                    case "MANIFEST_LOADED":
                                        if (brwsr.chrome && videoDashConf && videoDashConf.protectionLevel) {
                                            mediaPlayer.getProtectionController().setRobustnessLevel(videoDashConf.protectionLevel);
                                        }
                                        initQualitySelection(dashQualitiesConf,
                                                dashUpdatedConf.initialVideoQuality, e.data);
                                        break;
                                    case "CAN_PLAY":
                                        if (desktopSafari && autoplay) {
                                            // hack to avoid "heaving" in Safari
                                            // at least in splash setups and playlist transitions
                                            common.addClass(root, loadingClass);
                                            bean.one(videoTag, "timeupdate." + engineName, function () {
                                                setTimeout(function () {
                                                    common.removeClass(root, loadingClass);
                                                });
                                            });
                                        }
                                        break;
                                    case "BUFFER_LEVEL_STATE_CHANGED":
                                        common.toggleClass(root, "is-seeking", e.state === "bufferStalled");
                                        break;
                                    case "ERROR":
                                        switch (e.error) {
                                        case "capability":
                                            if (e.event === "encryptedmedia" && protection && !keySystem) {
                                                errors.push(protectionError);
                                                fperr = errors.length - 1;
                                            } else {
                                                fperr = 5;
                                            }
                                            break;
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
                                        default:
                                            fperr = 5;
                                        }
                                        errobj = handleError(fperr, src, e.event.url);
                                        player.trigger('error', [player, errobj]);
                                        break;
                                    }

                                    if (expose) {
                                        player.trigger(fpEventType, [player, e]);
                                    }
                                });
                            });

                            keySystem = null;

                            // update video object before ready
                            player.video = video;

                            mediaPlayer.initialize(videoTag, video.src, autoplay);

                            if (!support.firstframe && support.dataload && !brwsr.mozilla &&
                                    autoplay && videoTag.paused) {
                                videoTag.load();
                            }
                        },

                        resume: function () {
                            mediaPlayer.play();
                        },

                        pause: function () {
                            mediaPlayer.pause();
                        },

                        seek: function (time) {
                            mediaPlayer.seek(time);
                        },

                        volume: function (level) {
                            if (videoTag) {
                                videoTag.volume = level;
                            }
                        },

                        speed: function (val) {
                            videoTag.playbackRate = val;
                            // see ratechange/speed event
                            player.trigger('speed', [player, val]);
                        },

                        unload: function () {
                            if (mediaPlayer) {
                                var listeners = "." + engineName;

                                mediaPlayer.reset();
                                mediaPlayer = 0;
                                player.off(listeners);
                                bean.off(root, listeners);
                                bean.off(videoTag, listeners);
                                common.removeNode(videoTag);
                                videoTag = 0;
                            }
                        }
                    };

                // pre 6.0.4: no boolean api.conf.poster and no poster with autoplay
                if (/^6\.0\.[0-3]$/.test(version) &&
                        !player.conf.splash && !player.conf.poster && !player.conf.autoplay) {
                    bc = common.css(root, 'backgroundColor');
                    // spaces in rgba arg mandatory for recognition
                    has_bg = common.css(root, 'backgroundImage') !== "none" ||
                            (bc && bc !== "rgba(0, 0, 0, 0)" && bc !== "transparent");
                    if (has_bg) {
                        player.conf.poster = true;
                    }
                }

                return engine;
            };

        if (mse && typeof mse.isTypeSupported === "function" && version.indexOf("5.") !== 0) {
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
                dashconf = extend({
                    type: "video/mp4",
                    codecs: "avc1.42c01e,mp4a.40.2",
                    initialVideoQuality: -1,
                    qualitiesForSafari: true
                }, conf[engineName], conf.clip[engineName]);

                return dashCanPlay(type, dashconf.type, dashconf.codecs);
            };

            // put on top of engine stack
            // so mpegedash is tested before html5
            flowplayer.engines.unshift(engineImpl);

        }

    };
    if (typeof module === 'object' && module.exports) {
        module.exports = extension.bind(undefined, require('dashjs'));
    } else if (window.dashjs && window.flowplayer) {
        extension(window.dashjs, window.flowplayer);
    }
}());
