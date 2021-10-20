dist/index.html: src/index.html dist/index.js
	sed '\#<script data-src="index.js">#r dist/index.js' src/index.html > dist/index.html

dist/index.js: src/index.js src/lib/ethers.js
	mkdir -p dist/
	deno bundle src/index.js dist/index.js

.PHONY: host
host: dist/index.html
	(cd dist; python3 -m http.server)

.PHONY: ipfs
ipfs: dist/index.html
	curl -X POST -F file=@dist/index.html "https://ipfs.infura.io:5001/api/v0/add?pin=true"

.PHONY: clean
clean:
	rm -rf dist/
