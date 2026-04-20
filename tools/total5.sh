#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT=$( cd "$DIR/.." && pwd )
OUTPUT="${1:-$ROOT/tools/total5.js}"

node - "$ROOT" "$OUTPUT" <<'NODE'
'use strict';

const Fs = require('node:fs');
const Path = require('node:path');

const root = Path.resolve(process.argv[2]);
const output = Path.resolve(process.argv[3]);
const outputName = Path.basename(output);
const errorHtml = Fs.readFileSync(Path.join(root, 'error.html'), 'utf8').replace(/\r\n/g, '\n');
const inlineErrorHtmlExpr = JSON.stringify(errorHtml);

const files = Fs.readdirSync(root, { withFileTypes: true })
	.filter(item => item.isFile() && item.name.endsWith('.js') && item.name !== outputName && item.name !== 'total5.js')
	.map(item => item.name)
	.sort((a, b) => a.localeCompare(b));

if (!files.length)
	throw new Error('No root .js files found');

if (!files.includes('index.js'))
	throw new Error('Missing root entry file: index.js');

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const flowstreamGuard = "if (process.argv[1].endsWith('flow-flowstream.js')) {";
const flowstreamReplacement = "if ((process.argv[1] && process.argv[1].endsWith('flow-flowstream.js')) || global.__TOTAL5_BUNDLE_FLOWSTREAM__) {";
const errorHtmlReadExpr = "F.Fs.readFileSync(F.Path.join(F.config.$total5, 'error.html'), 'utf8')";

const moduleEntries = [];

for (const file of files) {
	let source = Fs.readFileSync(Path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

	if (file === 'flow-flowstream.js')
		source = source.replace(new RegExp(escapeRegExp(flowstreamGuard), 'g'), flowstreamReplacement);
	else if (file === 'controller.js')
		source = source.replace(new RegExp(escapeRegExp(errorHtmlReadExpr), 'g'), inlineErrorHtmlExpr);

	moduleEntries.push(`\t\t'/${file}': ${JSON.stringify(source)}`);
}

const outputBody = `// Total.js v5 framework bundle
// Web: https://www.totaljs.com

'use strict';

(function(nativeRequire, entryModule, currentModule, bundleFilename, bundleDirname) {

\tconst Path = nativeRequire('node:path');
\tconst Module = nativeRequire('node:module');
\tconst WorkerThreads = (() => {
\t\ttry {
\t\t\treturn nativeRequire('node:worker_threads');
\t\t} catch (err) {
\t\t\treturn null;
\t\t}
\t})();

\tconst MODULES = {
${moduleEntries.join(',\n')}
\t};

\tconst CACHE = Object.create(null);
\tconst EXECUTORS = Object.create(null);
\tconst ENTRY = '/index.js';
\tconst FLOWSTREAM = '/flow-flowstream.js';

\tfunction resolveBundledId(request, parentId) {
\t\tif (!request)
\t\t\treturn null;

\t\tif (request[0] === '.') {
\t\t\tconst parentDir = parentId ? Path.posix.dirname(parentId) : '/';
\t\t\treturn resolveCandidate(Path.posix.normalize(Path.posix.join(parentDir, request)));
\t\t}

\t\tif (request[0] === '/')
\t\t\treturn resolveCandidate(request.replace(/\\\\/g, '/'));

\t\treturn null;
\t}

\tfunction resolveCandidate(value) {
\t\tconst normalized = Path.posix.normalize(value);
\t\tconst candidates = [normalized];

\t\tif (!normalized.endsWith('.js'))
\t\t\tcandidates.push(normalized + '.js');

\t\tcandidates.push(Path.posix.join(normalized, 'index.js'));

\t\tfor (const candidate of candidates) {
\t\t\tif (MODULES[candidate])
\t\t\t\treturn candidate;
\t\t}

\t\treturn null;
\t}

\tfunction moduleFilename(id) {
\t\tif (id === FLOWSTREAM)
\t\t\treturn bundleFilename;
\t\treturn Path.join(bundleDirname, id.substring(1));
\t}

\tfunction resolve(request, parentId) {
\t\tconst bundled = resolveBundledId(request, parentId);
\t\tif (bundled)
\t\t\treturn moduleFilename(bundled);
\t\treturn Module.createRequire(moduleFilename(parentId || ENTRY)).resolve(request);
\t}

\tfunction createRequire(parentId) {
\t\tconst fallbackRequire = Module.createRequire(moduleFilename(parentId || ENTRY));
\t\tconst localRequire = function(request) {
\t\t\treturn load(request, parentId, fallbackRequire);
\t\t};

\t\tlocalRequire.resolve = function(request) {
\t\t\treturn resolve(request, parentId);
\t\t};

\t\tlocalRequire.cache = CACHE;
\t\tlocalRequire.main = nativeRequire.main;
\t\treturn localRequire;
\t}

\tfunction load(request, parentId, fallbackRequire) {
\t\tconst bundled = resolveBundledId(request, parentId);
\t\tif (!bundled)
\t\t\treturn (fallbackRequire || nativeRequire)(request);

\t\tconst cached = CACHE[bundled];
\t\tif (cached)
\t\t\treturn cached.exports;

\t\tconst filename = moduleFilename(bundled);
\t\tconst localModule = {
\t\t\tid: bundled,
\t\t\tfilename,
\t\t\tloaded: false,
\t\t\tpath: Path.dirname(filename),
\t\t\texports: {},
\t\t\tchildren: [],
\t\t\tparent: null
\t\t};

\t\tCACHE[bundled] = localModule;

\t\tconst scope = Object.create(globalThis);
\t\tscope.require = createRequire(bundled);
\t\tscope.module = localModule;
\t\tscope.exports = localModule.exports;
\t\tscope.__filename = filename;
\t\tscope.__dirname = Path.dirname(filename);

\t\tlet executor = EXECUTORS[bundled];
\t\tif (!executor)
\t\t\texecutor = EXECUTORS[bundled] = new Function('scope', 'with (scope) {\\n' + MODULES[bundled] + '\\n}');

\t\texecutor(scope);
\t\tlocalModule.loaded = true;
\t\treturn localModule.exports;
\t}

\ttry {
\t\tif (entryModule === currentModule && (process.argv.includes('--fork') || !!(WorkerThreads && WorkerThreads.workerData))) {
\t\t\tglobal.__TOTAL5_BUNDLE_FLOWSTREAM__ = true;
\t\t\tcurrentModule.exports = load(FLOWSTREAM);
\t\t\treturn;
\t\t}

\t\tcurrentModule.exports = load(ENTRY);
\t} finally {
\t\tif (entryModule === currentModule)
\t\t\tdelete global.__TOTAL5_BUNDLE_FLOWSTREAM__;
\t}

})(require, require.main, module, __filename, __dirname);
`;

Fs.mkdirSync(Path.dirname(output), { recursive: true });
Fs.writeFileSync(output, outputBody, 'utf8');
console.log(`Created ${Path.relative(root, output) || outputName} from ${files.length} source files`);
NODE
