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

- packs a compatibility tested version - current:
  https://github.com/Dash-Industry-Forum/dash.js/commit/653a32bca9ce - of
  [dash.js](https://github.com/Dash-Industry-Forum/dash.js) by the
  [Dash Industry Forum](http://dashif.org/software/)
- seeking in paused state does not resume like dash.js vanilla
- engine is only loaded if the client supports MPEG-DASH
- also available for Flowplayer version 5.x ([demo](http://demos.flowplayer.org/v5/api/dash.html))

Stream compatibility
--------------------

MPEG-DASH is not a fixed standard yet, but a moving target. As the plugin is based on dash.js stream
compatibility can be cross-checked in the latest
[dash.js sample player](http://dashif.org/reference/players/javascript/index.html).

GPAC
----

If [MP4Box](https://gpac.wp.mines-telecom.fr/mp4box/dash/) by
[GPAC](https://gpac.wp.mines-telecom.fr) is used to create the MPEG-DASH streams our current
recommendations are:

- do not use the `-segment-timeline` option, it may result in end of video detection issues with
  dash.js
- set `-bs-switching 'no'` if you want the streams to work in Safari

Disclaimer: The above recommendations are based on
`MP4Box - GPAC version 0.5.2-DEV-rev566-g4c06d0f-master`. Other versions may yield different results
with different consequences. They might also be affected by other members of a transcoding
toolchain.

Known issues
------------

- encrypted streams not yet supported
