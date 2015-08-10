Flowplayer MPEG-DASH plugin
===========================

This plugin provides the `mpegdash` [engine](https://flowplayer.org/docs/api.html#engines) for
playback of [MPEG-DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) streams.

Usage
-----

Load the latest plugin after the Flowplayer script:

```html
<script src="//releases.flowplayer.org/6.0.3/flowplayer.min.js"></script>
<script src="//releases.flowplayer.org/mpegdash/flowplayer.mpegdash.min.js"></script>
```

Sources configuration:

```js
clip: {
   sources: [
        { type: "application/dash+xml",  src: "//example.com/video.mpd" },
        { type: "application/x-mpegurl", src: "//example.com/video.m3u8" },
        { type: "video/webm",            src: "//example.com/video.webm" },
        { type: "video/mp4",             src: "//example.com/video.mp4" }
   ]
}
```

Demo
----

A fully documented demo can be found [here](http://demos.flowplayer.org/api/dash.html).

Features
--------

- packs a compatibility tested version of
  [dash.js](https://github.com/Dash-Industry-Forum/dash.js) by the
  [Dash Industry Forum](http://dashif.org/software/)
- seeking in paused state does not resume like dash.js vanilla
- engine is only loaded if the client supports MPEG-DASH
- also available for Flowplayer version 5.x ([demo](http://demos.flowplayer.org/v5/api/dash.html))

Known issues
------------

- does not support live streams yet
- Mac OS Safari does not detect end of video properly - see:
  https://github.com/Dash-Industry-Forum/dash.js/issues/694
