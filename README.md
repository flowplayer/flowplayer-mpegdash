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

Plugin configuration
--------------------

The plugin provides the following [player option](https://flowplayer.org/docs/setup.html#player-options):

| option | type | description | html configurable |
| :----- | :--- | :---------- | :---------------- |
| `dash` | `object` | Signals the browser which playback capabilites are expected of its `MediaSource` implementation. | no |

The `dash` configuration object accepts the following parameters:

| option | default value | description |
| :----- | :------------ | :---------- |
| `type` | `video/mp4` | The video format the browser's `MediaSource` implementation should be able to play. |
| `codecs` | `avc1.42c01e, mp4a.40.2` | The codecs the browser's `MediaSource` implementation should be able to play. |

**Caveat:** codecs and even type feature detection and evaluation is broken in many browsers.
Changing the configuration may have no or misleading effects. Not useful in production, only to a
certain extent for debugging.

Demo
----

A fully documented demo can be found [here](http://demos.flowplayer.org/api/dash.html).

Features
--------

- packs a compatibility tested version - current:
  https://github.com/Dash-Industry-Forum/dash.js/commit/4af1b6203f20 - of
  [dash.js](https://github.com/Dash-Industry-Forum/dash.js) by the
  [Dash Industry Forum](http://dashif.org/software/)
- engine is only loaded if the client supports MPEG-DASH
- also available for Flowplayer version 5.x ([demo](http://demos.flowplayer.org/v5/api/dash.html))

Stream compatibility
--------------------

MPEG-DASH is not a fixed standard yet, but a moving target. As the plugin is based on dash.js stream
compatibility can be cross-checked in the latest
[dash.js sample player](http://dashif.org/reference/players/javascript/v1.5.0/samples/dash-if-reference-player/).

### GPAC

If [MP4Box](https://gpac.wp.mines-telecom.fr/mp4box/dash/) by
[GPAC](https://gpac.wp.mines-telecom.fr) is used to create the MPEG-DASH streams our current
recommendation is:

- `-bs-switching 'merge'` or `-bs-switching 'no'` should be used to make the streams work in Mac OS
  Safari and Windows Internet Explorer. These clients do not support the avc3 codec version
  resulting from the default `inband` value.

Disclaimer: The above recommendation is based on
`MP4Box - GPAC version 0.5.2-DEV-rev566-g4c06d0f-master`. Other versions may yield different results
with different consequences. They might also be affected by other members of a transcoding
toolchain.

Debugging
---------

A quick way to find out whether the currently packed version of dash.js is causing a problem is to
load the components separately using the latest development build or release from the dash.js CDN:

```html
<script src="//releases.flowplayer.org/6.0.3/flowplayer.min.js"></script>

<!-- load dash.js latest release -->
<!-- <script src="//cdn.dashjs.org/v1.5.0/dash.all.js"></script> -->

<!-- or load dash.js latest dev build -->
<script src="//cdn.dashjs.org/latest/dash.all.js"></script>

<!-- load latest plugin standalone -->
<script src="//releases.flowplayer.org/mpegdash/flowplayer.mpegdash.js"></script>
```

Conversely, to find out whether there's a problem with the actual plugin component can be tested by
exclusion with a simple page using bare dash.js, like:

```html
<!DOCTYPE html>
<html>
<head>

<script src="//releases.flowplayer.org/mpegdash/dash.all.js"></script>

<script>
window.onload = function () {
  Dash.createAll();
};
</script>

</head>
<body>

<video class="dashjs-player" controls>
  <source type="application/dash+xml" src="//example.com/testvideo.mpd">
</video>

</body>
</html>
```

Known issues
------------

- encrypted streams not yet supported
- `MediaSource` video type and codecs feature detection via JavaScript is broken in many clients in
  a similar fashion as for
  [SOURCE/VIDEO tag type attributes](http://demos.flowplayer.org/videotest/canplay.html).
