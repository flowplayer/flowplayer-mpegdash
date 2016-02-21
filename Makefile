SHELL := /bin/bash
export PATH := ./node_modules/.bin/:$(PATH)

DIST=dist
JS=$(DIST)/flowplayer.dashjs
DASHJSMOD=node_modules/dashjs

GIT_ID=${shell git rev-parse --short HEAD }

webpack:
	@ npm run build

v5:
	@ mkdir -p $(DIST)
	@ sed -ne 's/\$$GIT_ID\$$/$(GIT_ID)/; /^\/\*!/,/^\*\// p' flowplayer.dashjs-v5.js > $(JS)-v5.min.js
	@ cat dash.all.js >> $(JS)-v5.min.js
	@ echo '' >> $(JS)-v5.min.js
	@ npm run -s mini5 >> $(JS)-v5.min.js

debug:
	@ mkdir -p $(DIST)
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs.js > $(JS).js
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs-v5.js > $(JS)-v5.js

all: webpack v5

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
