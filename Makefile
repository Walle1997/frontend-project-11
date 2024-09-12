develop:
	npx webpack serve

install:
	npm ci

build:
	NODE_ENV=production npx webpack

test:
	npm test

lint:
	npx eslint .
	
lint-fix:
	npx eslint . --fix

.PHONY: test
