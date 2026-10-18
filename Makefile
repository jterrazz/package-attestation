.PHONY: install build lint fix test test-network mutation check

node_modules/.install: package-lock.json $(wildcard .artifacts/packages/*.tgz)
	npm ci
	@touch node_modules/.install

install: node_modules/.install

build: node_modules/.install
	npm run build

# invariant: the Publish (packaging) pass of the check reads dist/.
lint: build
	npm run lint

fix: node_modules/.install
	npx typescript fix

# invariant: the specs install the tarball npm pack writes from dist/.
test: build
	npm test

# outside: reaches the live OpenTimestamps calendars, so `check` never calls it.
test-network: build
	npm run test:network

mutation: build
	npx typescript mutation

check: lint test mutation
