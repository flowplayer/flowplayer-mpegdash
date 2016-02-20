SHELL := /bin/bash
export PATH := ./node_modules/.bin/:$(PATH)

DIST=dist
JS=$(DIST)/flowplayer.dashjs
DASHJSMOD=node_modules/dashjs

GIT_ID=${shell git rev-parse --short HEAD }

default:
	@ mkdir -p $(DIST)
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' -e '/"use strict";/d' flowplayer.dashjs.js | \
		npm run minify > $(JS).min.js
	@ sed -e '/sourceMappingURL=dash/d' $(DASHJSMOD)/dist/dash.mediaplayer.min.js >> $(JS).min.js

v5:
	@ mkdir -p $(DIST)
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' -e '/"use strict";/d' flowplayer.dashjs-v5.js | \
		npm run minify > $(JS)-v5.min.js
	@ cat dash.all.js >> $(JS)-v5.min.js

debug:
	@ mkdir -p $(DIST)
	@ cp $(DASHJSMOD)/dist/dash.mediaplayer.debug.js dash.all.js $(DIST)/
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs.js > $(JS).js
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs-v5.js > $(JS)-v5.js

all: default v5

dist: clean all debug
	@ cp LICENSE.md $(DIST)/

zip: clean dist
	@ cd $(DIST) && zip flowplayer.dashjs.zip *.js LICENSE.md

clean:
	@ rm -rf $(DIST)

lint:
	@ npm run -s lint

deps:
	@ npm install
