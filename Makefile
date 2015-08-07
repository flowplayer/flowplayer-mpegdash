
DIST=dist
JS=$(DIST)/flowplayer.mpegdash

default:
	@ mkdir -p $(DIST)
	@ sed -ne '1,/^\*\// p' flowplayer.mpegdash.js > $(JS).min.js
	@ echo '' >> $(JS).min.js
	@ cat dash.all.js >> $(JS).min.js
	@ echo '' >> $(JS).min.js
	@ uglifyjs --no-copyright flowplayer.mpegdash.js >> $(JS).min.js

v5:
	@ mkdir -p $(DIST)
	@ sed -ne '1,/^\*\// p' flowplayer.mpegdash-v5.js > $(JS)-v5.min.js
	@ echo '' >> $(JS)-v5.min.js
	@ cat dash.all.js >> $(JS)-v5.min.js
	@ echo '' >> $(JS)-v5.min.js
	@ uglifyjs --no-copyright flowplayer.mpegdash-v5.js >> $(JS)-v5.min.js

all: default v5

dist: clean all
	@ cp dash.all.js flowplayer.mpegdash.js flowplayer.mpegdash-v5.js $(DIST)/

zip: clean dist
	@ cd $(DIST) && zip flowplayer.mpegdash.zip *.js

clean:
	@ rm -rf $(DIST)
