Flowplayer dashjs plugin
===========================

This plugin provides the `dash` [engine](https://flowplayer.org/docs/api.html#engines) for
playback of [DASH](https://en.wikipedia.org/wiki/Dynamic_Adaptive_Streaming_over_HTTP) streams.

The plugin relies on the [dash.js](https://github.com/Dash-Industry-Forum/dash.js) client, courtesy
of the [DASH Industry Forum](http://dashif.org/).

Usage
-----

See: https://flowplayer.org/docs/plugins.html#dashjs

- [compatibility](https://flowplayer.org/docs/plugins.html#dashjs-compatibility)
- [loading the assets](https://flowplayer.org/docs/plugins.html#dashjs-assets)
- [configuration](https://flowplayer.org/docs/plugins.html#dashjs-configuration)
- [dash options](https://flowplayer.org/docs/plugins.html#dash-options)
- [dashjs API](https://flowplayer.org/docs/plugins.html#dashjs-api)

### CommonJS

The plugin can be used in a [browserify](http://browserify.org) and/or
[webpack](https://webpack.github.io/) environment with a
[commonjs](http://requirejs.org/docs/commonjs.html) loader:

```js
var flowplayer = require('flowplayer');
var engine = require('flowplayer-dashjs');
engine(flowplayer-dashjs); // plugin injects itself into flowplayer

flowplayer('#container', {
  clip: {
    sources: [{
      type: 'application/dash+xml',
      src: '//stream.flowplayer.org/bauhaus.mpd'
    }]
  }
});
```

Demo
----

A fully documented demo can be found [here](http://demos.flowplayer.org/api/dash.html).

Features
--------

- packs a compatibility tested version - current:
  [v2.3.0](https://github.com/Dash-Industry-Forum/dash.js/releases/tag/v2.3.0) - of
  [dash.js](https://github.com/Dash-Industry-Forum/dash.js) by the
  [Dash Industry Forum](http://dashif.org/software/)
- engine is only loaded if the client supports DASH in a MediaSource element, see also the `codecs`
  [option](https://flowplayer.org/docs/plugins.html#dashjs-configuration)
- also available for Flowplayer version 5.x ([demo](http://demos.flowplayer.org/v5/api/dash.html)) -
  not developed anymore, uses
  [v1.6.0](https://github.com/Dash-Industry-Forum/dash.js/releases/tag/v1.6.0) of dash.js

Stream compatibility
--------------------

DASH is not a fixed standard yet, but a moving target. As the plugin is based on dash.js stream
compatibility can be cross-checked in the latest
[dash.js sample player](http://dashif.org/reference/players/javascript/v2.3.0/samples/dash-if-reference-player/).

*Caveat:* WebM-DASH streams are extremely unlikely to work correctly with dash.js - or any other
available client library we know about. - Hence historically the name of the plugin Git repository.

Also test streams for conformance in [DASH validator](http://www.dashif.org/conformance.html).

### GPAC

If [MP4Box](https://gpac.wp.mines-telecom.fr/mp4box/dash/) by
[GPAC](https://gpac.wp.mines-telecom.fr) is used to create the MPEG-DASH streams our current
recommendation is:

- `-bs-switching 'merge'` or `-bs-switching 'no'` should be used to make the streams work in Mac OS
  Safari and Windows Internet Explorer. These clients do not support the avc3 codec version
  resulting from the default `inband` value.

Disclaimer: The above recommendation is based on
`MP4Box - GPAC version 0.6.2-DEV-rev261-gb07662c-master`. Other versions may yield different results
with different consequences. They might also be affected by other members of a transcoding
toolchain.

Debugging
---------

A quick way to find out whether the currently packed version of dash.js is causing a problem is to
load the components separately using the latest development build or release from the dash.js CDN:

```html
<script src="//releases.flowplayer.org/6.0.5/flowplayer.min.js"></script>

<!-- load dash.js latest release -->
<!-- <script src="//cdn.dashjs.org/v2.3.0/dash.all.min.js"></script> -->

<!-- or load dash.js latest dev build -->
<script src="//cdn.dashjs.org/latest/dash.all.min.js"></script>

<!-- load latest plugin standalone -->
<script src="//releases.flowplayer.org/dashjs/flowplayer.dashjs.js"></script>

<script>
// turn on dashjs debugging
flowplayer.conf.dash = {
  debug: true
};
</script>
```

Conversely, to find out whether there's a problem with the actual plugin component can be tested by
exclusion with a simple page using bare dash.js, like:

```html
<!DOCTYPE html>
<html>
<head>

<script src="//cdn.dashjs.org/v2.3.0/dash.all.min.js"></script>

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

### Building the plugin

Build requirement:

- [nodejs](https://nodejs.org) with [npm](https://www.npmjs.com)

```sh
cd flowplayer-mpegdash
make deps
make
```

Known issues
------------

- Android: Until
  [this bug fix](https://chromium.googlesource.com/chromium/src.git/+/0b5ec458acf03e3507a3737cfc483df0694cf803%5E!/)
  has propagated onto devices, streams with High profile AAC audio (`mp4a.40.5`) may not play.
- `MediaSource` video type and codecs feature detection via JavaScript is broken in many clients in
  a similar fashion as for
  [SOURCE/VIDEO tag type attributes](http://demos.flowplayer.org/videotest/canplay.html).
