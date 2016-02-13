SHELL := /bin/bash
export PATH := ./node_modules/.bin/:$(PATH)

DIST=dist
JS=$(DIST)/flowplayer.dashjs
DASHJSMOD=node_modules/dashjs

GIT_ID=${shell git rev-parse --short HEAD }

default:
	@ mkdir -p $(DIST)
	@ sed -ne 's/\$$GIT_ID\$$/$(GIT_ID)/; /^\/\*!/,/^\*\// p' flowplayer.dashjs.js > $(JS).min.js
	@ cat $(DASHJSMOD)/dist/dash.mediaplayer.min.js >> $(JS).min.js
	@ echo '' >> $(JS).min.js
	@ sed -e '/"use strict";/ d' flowplayer.dashjs.js | uglifyjs --mangle -c >> $(JS).min.js

v5:
	@ mkdir -p $(DIST)
	@ sed -ne 's/\$$GIT_ID\$$/$(GIT_ID)/; /^\/\*!/,/^\*\// p' flowplayer.dashjs-v5.js > $(JS)-v5.min.js
	@ cat dash.all.js >> $(JS)-v5.min.js
	@ echo '' >> $(JS)-v5.min.js
	@ sed -e '/"use strict";/ d' flowplayer.dashjs-v5.js | uglifyjs --mangle -c >> $(JS)-v5.min.js

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
	@ rm -rf $(DASHJSMOD) && npm install && npm run prepare
