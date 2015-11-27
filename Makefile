
DIST=dist
JS=$(DIST)/flowplayer.dashjs

GIT_ID=${shell git rev-parse --short HEAD }

default:
	@ mkdir -p $(DIST)
	@ sed -ne 's/\$$GIT_ID\$$/$(GIT_ID)/; /^\/\*!/,/^\*\// p' flowplayer.dashjs.js > $(JS).min.js
	@ cat dash.all.js >> $(JS).min.js
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
	@ cp dash.all.js $(DIST)/
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs.js > $(JS).js
	@ sed -e 's/\$$GIT_ID\$$/$(GIT_ID)/' flowplayer.dashjs-v5.js > $(JS)-v5.js

all: default v5

dist: clean all debug

zip: clean dist
	@ cd $(DIST) && zip flowplayer.dashjs.zip *.js

clean:
	@ rm -rf $(DIST)
