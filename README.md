Flowplayer dashjs plugin
===========================

This plugin provides the `dash` [engine](https://flowplayer.org/docs/api.html#engines) for
playback of [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) streams.

Usage
-----

Load the latest plugin after the Flowplayer script:

```html
<script src="//releases.flowplayer.org/6.0.4/flowplayer.min.js"></script>
<script src="//releases.flowplayer.org/dashjs/flowplayer.dashjs.min.js"></script>
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

CORS
----

The DASH streams must be loaded from a server with a
[cross domain policy](https://flowplayer.org/docs/setup.html#cross-domain) permitting `GET`
requests.

Demo
----

A fully documented demo can be found [here](http://demos.flowplayer.org/api/dash.html).

Features
--------

- packs a compatibility tested version - current:
  [RC1_v.1.5.2](https://github.com/Dash-Industry-Forum/dash.js/commits/RC1_v.1.5.2) - of
  [dash.js](https://github.com/Dash-Industry-Forum/dash.js) by the
  [Dash Industry Forum](http://dashif.org/software/)
- engine is only loaded if the client supports MPEG-DASH, see also the `codecs`
  [option](#plugin-configuration)
- also available for Flowplayer version 5.x ([demo](http://demos.flowplayer.org/v5/api/dash.html))

Stream compatibility
--------------------

DASH is not a fixed standard yet, but a moving target. As the plugin is based on dash.js stream
compatibility can be cross-checked in the latest
[dash.js sample player](http://dashif.org/reference/players/javascript/v1.5.1/samples/dash-if-reference-player/).

*Caveat:* WebM-DASH streams are extremely unlikely to work correctly with dash.js - or any other
available client library we know about. - Hence historically the name of the plugin Git repository.

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
<script src="//releases.flowplayer.org/6.0.4/flowplayer.min.js"></script>

<!-- load dash.js latest release -->
<!-- <script src="//cdn.dashjs.org/v1.5.1/dash.all.js"></script> -->

<!-- or load dash.js latest dev build -->
<script src="//cdn.dashjs.org/latest/dash.all.js"></script>

<!-- load latest plugin standalone -->
<script src="//releases.flowplayer.org/dashjs/flowplayer.dashjs.js"></script>
```

Conversely, to find out whether there's a problem with the actual plugin component can be tested by
exclusion with a simple page using bare dash.js, like:

```html
<!DOCTYPE html>
<html>
<head>

<script src="//releases.flowplayer.org/dashjs/dash.all.js"></script>

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
- Android: Until
  [this bug fix](https://chromium.googlesource.com/chromium/src.git/+/0b5ec458acf03e3507a3737cfc483df0694cf803%5E!/)
  has propagated onto devices, streams with High profile AAC audio (`mp4a.40.5`) will not play.
- `MediaSource` video type and codecs feature detection via JavaScript is broken in many clients in
  a similar fashion as for
  [SOURCE/VIDEO tag type attributes](http://demos.flowplayer.org/videotest/canplay.html).
