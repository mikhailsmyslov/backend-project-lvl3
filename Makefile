install:
	npm install

start:
	npx babel-node src/bin/gendiff.js

build:
	rm -rf dist
	npm run build

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	DEBUG=page-loader npm test

test-coverage:
	npm test -- --coverage

test-watch:
	npm test -- --watch
