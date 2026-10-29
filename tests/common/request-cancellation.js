'use strict';

const Test = require('node:test');
const Assert = require('node:assert/strict');
const Http = require('node:http');
const Net = require('node:net');
const Events = require('node:events');
const Zlib = require('node:zlib');
require('../../index');

var server;
var base;
var opened;
var disconnected;
var paths = [];

function gate(name) {
	var resolve;
	var promise = new Promise(function(done) {
		resolve = done;
	});
	return {
		resolve: resolve,
		wait: function() {
			var timer;
			return Promise.race([promise, new Promise((resolve, reject) => timer = setTimeout(() => reject(new Error('Test event timed out: ' + name)), 3000))]).finally(() => clearTimeout(timer));
		}
	};
}

function aborted(err) {
	return err instanceof Error && err.name === 'AbortError' && err.code === 'ABORT_ERR';
}

function pause(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

Test.before(async function() {
	server = Http.createServer(function(req, res) {
		paths.push(req.url);
		res.once('close', function() {
			disconnected && disconnected.resolve();
		});
		if (req.url === '/slow-ok') {
			opened.resolve();
			var delayed = setTimeout(function() {
				res.writeHead(200);
				res.end('complete');
			}, 50);
			res.once('close', () => clearTimeout(delayed));
			return;
		}
		if (req.url === '/redirect') {
			res.writeHead(302, { location: '/hang' });
			return res.end();
		}
		if (req.url === '/redirect-dns') {
			res.writeHead(302, { location: base.replace('127.0.0.1', 'redirect.test') + '/hang' });
			return res.end();
		}
		if (req.url === '/hang' || req.url === '/upload') {
			opened && opened.resolve();
			return;
		}
		if (req.url === '/body' || req.url === '/gzip') {
			var gzip = req.url === '/gzip' ? Zlib.createGzip() : null;
			res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': gzip ? 'gzip' : 'identity' });
			if (gzip)
				gzip.pipe(res);
			var output = gzip || res;
			output.write('first chunk');
			if (gzip)
				gzip.flush();
			var timer = setInterval(function() {
				output.write('next chunk');
				gzip && gzip.flush();
			}, 10);
			res.once('close', function() {
				clearInterval(timer);
				gzip && gzip.destroy();
			});
			return;
		}
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end('{"success":true}');
	});
	await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
	base = 'http://127.0.0.1:' + server.address().port;
});

Test.beforeEach(function() {
	opened = gate();
	disconnected = gate();
	paths = [];
});

Test.after(async function() {
	server.closeAllConnections();
	await new Promise(resolve => server.close(resolve));
	clearInterval(F.internal.interval);
});

Test.test('REQUEST keeps existing promise and callback returns; successful signals are detached', async function() {
	var control = new AbortController();
	var response = await REQUEST({ url: base + '/ok', signal: control.signal });
	Assert.equal(response.body, '{"success":true}');
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
	control.abort();
	await new Promise(function(resolve, reject) {
		var result = REQUEST({ url: base + '/ok' }, function(err, value) {
			err ? reject(err) : resolve(value);
		});
		Assert.equal(result, undefined);
	});
	Assert.equal((await REQUEST({ url: base + '/ok' })).status, 200);
});

Test.test('a signal already aborted rejects without sending or resolving DNS', async function() {
	var control = new AbortController();
	var reason = new Error('Stopped by the caller');
	control.abort(reason);
	await Assert.rejects(REQUEST({ url: base + '/ok', signal: control.signal }), function(err) {
		return aborted(err) && err.cause === reason;
	});
	Assert.deepEqual(paths, []);
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('abort before headers physically closes the request and finishes the callback once', async function() {
	var control = new AbortController();
	var calls = 0;
	var completed = new Promise(function(resolve, reject) {
		REQUEST({ url: base + '/hang', signal: control.signal }, function(err, response) {
			calls++;
			try {
				Assert.ok(aborted(err));
				Assert.equal(response.canceled, true);
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
	await opened.wait();
	control.abort();
	control.abort();
	await completed;
	await disconnected.wait();
	await pause(20);
	Assert.equal(calls, 1);
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('abort during delayed DNS prevents a late connection', async function() {
	var original = F.TUtils.resolve;
	var control = new AbortController();
	var pending;
	F.TUtils.resolve = function(url, callback, options) {
		pending = function() {
			callback(null, F.TUtils.parseURI(url), options, []);
		};
	};
	try {
		var request = REQUEST({ url: base.replace('127.0.0.1', 'delayed.test') + '/ok', resolve: true, signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		Assert.equal(typeof pending, 'function');
		control.abort();
		await rejected;
		pending();
		await pause(20);
		Assert.deepEqual(paths, []);
	} finally {
		F.TUtils.resolve = original;
	}
});

for (var path of ['/body', '/gzip']) {
	(function(path) {
		Test.test('abort after first decoded data closes ' + path, async function() {
			var control = new AbortController();
			var request = REQUEST({ url: base + path, signal: control.signal, ondata: function() { control.abort(); } });
			await Assert.rejects(request, aborted);
			await disconnected.wait();
			Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
		});
	})(path);
}

Test.test('custom streams remain abortable after callback delivery without a second callback', async function() {
	var control = new AbortController();
	var ready = gate();
	var failure = gate();
	var calls = 0;
	REQUEST({ url: base + '/body', custom: true, signal: control.signal }, function(err, response) {
		calls++;
		Assert.ifError(err);
		response.stream.once('error', failure.resolve);
		response.stream.once('data', function() {
			control.abort();
		});
		ready.resolve(response.stream);
	});
	var stream = await ready.wait();
	Assert.ok(aborted(await failure.wait()));
	await disconnected.wait();
	Assert.equal(stream.destroyed, true);
	Assert.equal(calls, 1);
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('one signal cancels concurrent requests, including a redirected request', async function() {
	var control = new AbortController();
	var first = REQUEST({ url: base + '/hang', signal: control.signal });
	var second = REQUEST({ url: base + '/redirect', signal: control.signal });
	var rejected = Promise.all([Assert.rejects(first, aborted), Assert.rejects(second, aborted)]);
		rejected.catch(NOOP);
	while (paths.filter(path => path === '/hang').length < 2)
		await pause(5);
	control.abort();
	await rejected;
	Assert.ok(paths.includes('/redirect'));
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('a multipart upload closes its owned file stream when aborted', async function() {
	var original = F.Fs.createReadStream;
	var file;
	var control = new AbortController();
	F.Fs.createReadStream = function() {
		file = new F.Stream.Readable({ read: function() { this.push(Buffer.alloc(1024)); } });
		return file;
	};
	try {
		var request = REQUEST({ url: base + '/upload', method: 'POST', files: [{ name: 'file', filename: 'audio.wav', path: '/synthetic/audio.wav' }], signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		await opened.wait();
		control.abort();
		await rejected;
		Assert.equal(file.destroyed, true);
		await disconnected.wait();
	} finally {
		F.Fs.createReadStream = original;
	}
});

Test.test('cancellation closes an HTTPS request during TLS handshake', async function() {
	var accepted = gate('accepted');
	var closed = gate('closed');
	var peer;
	var tls = Net.createServer(function(socket) {
		peer = socket;
		socket.on('data', NOOP);
		socket.once('close', closed.resolve);
		accepted.resolve();
	});
	await new Promise(resolve => tls.listen(0, '127.0.0.1', resolve));
	try {
		var control = new AbortController();
		var request = REQUEST({ url: 'https://127.0.0.1:' + tls.address().port, signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		await accepted.wait();
		control.abort();
		await rejected;
		await closed.wait();
	} finally {
		peer && peer.destroy();
		await new Promise(resolve => tls.close(resolve));
	}
});

Test.test('abort closes a pending HTTPS proxy CONNECT tunnel', async function() {
	var accepted = gate('accepted');
	var closed = gate('closed');
	var peer;
	var proxy = Http.createServer();
	proxy.on('connect', function(req, socket) {
		peer = socket;
		socket.on('data', NOOP);
		socket.once('end', () => socket.end());
		socket.on('error', NOOP);
		socket.once('close', closed.resolve);
		accepted.resolve();
	});
	await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
	try {
		var control = new AbortController();
		var request = REQUEST({ url: 'https://destination.test/ok', proxy: 'http://127.0.0.1:' + proxy.address().port, signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		await accepted.wait();
		control.abort();
		await rejected;
		await closed.wait();
	} finally {
		peer && peer.destroy();
		await new Promise(resolve => proxy.close(resolve));
	}
});

Test.test('signal listeners are detached on network failure and native timeout', async function() {
	var control = new AbortController();
	await Assert.rejects(REQUEST({ url: base + '/hang', timeout: 30, signal: control.signal }));
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
	var stopped = Http.createServer();
	await new Promise(resolve => stopped.listen(0, '127.0.0.1', resolve));
	var port = stopped.address().port;
	await new Promise(resolve => stopped.close(resolve));
	await Assert.rejects(REQUEST({ url: 'http://127.0.0.1:' + port, signal: control.signal }));
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('custom stream completion releases the signal without closing shared connections', async function() {
	var control = new AbortController();
	var response = await REQUEST({ url: base + '/ok', custom: true, signal: control.signal, keepalive: true });
	var size = 0;
	for await (var chunk of response.stream)
		size += chunk.length;
	Assert.ok(size > 0);
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
	control.abort();
	Assert.equal((await REQUEST({ url: base + '/ok', keepalive: true })).status, 200);
});

Test.test('abort from inside the stream callback does not deliver that callback twice', async function() {
	var control = new AbortController();
	var calls = 0;
	var completed = gate();
	REQUEST({ url: base + '/body', custom: true, signal: control.signal }, function(err, response) {
		calls++;
		Assert.ifError(err);
		response.stream.once('error', completed.resolve);
		control.abort();
	});
	Assert.ok(aborted(await completed.wait()));
	await disconnected.wait();
	Assert.equal(calls, 1);
});

Test.test('abort during redirect DNS does not open the destination', async function() {
	var original = F.TUtils.resolve;
	var control = new AbortController();
	var waiting = gate();
	var pending;
	F.TUtils.resolve = function(url, callback, options) {
		if (typeof url === 'string') {
			options.uri.hostname = '127.0.0.1';
			callback(null, { host: '127.0.0.1' }, options, []);
		} else {
			pending = () => callback(null, url, options, []);
			waiting.resolve();
		}
	};
	try {
		var request = REQUEST({ url: base.replace('127.0.0.1', 'origin.test') + '/redirect-dns', resolve: true, signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		await waiting.wait();
		control.abort();
		await rejected;
		pending();
		await pause(20);
		Assert.deepEqual(paths, ['/redirect-dns']);
	} finally {
		F.TUtils.resolve = original;
	}
});

Test.test('multipart cancellation also stops a remote file download', async function() {
	var control = new AbortController();
	var request = REQUEST({ url: base + '/upload', method: 'POST', files: [{ name: 'file', filename: 'audio.wav', url: base + '/body' }], signal: control.signal });
	var rejected = Assert.rejects(request, aborted);
	rejected.catch(NOOP);
	while (!paths.includes('/body'))
		await pause(5);
	control.abort();
	await rejected;
	Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
});

Test.test('RESTBuilder.signal is chainable and cancels promise mode before headers', async function() {
	var control = new AbortController();
	var builder = RESTBuilder.GET(base + '/hang');
	Assert.equal(builder.signal(control.signal), builder);
	var request = builder.promise();
	var rejected = Assert.rejects(request, aborted);
	rejected.catch(NOOP);
	await opened.wait();
	control.abort();
	await rejected;
	await disconnected.wait();
});

Test.test('RESTBuilder callbacks receive one AbortError and preserve response metadata', async function() {
	var control = new AbortController();
	var calls = 0;
	var completed = gate();
	RESTBuilder.GET(base + '/hang').signal(control.signal).exec(function(err, response, output) {
		calls++;
		completed.resolve({ err: err, output: output });
	});
	await opened.wait();
	control.abort();
	var result = await completed.wait();
	Assert.ok(aborted(result.err));
	Assert.equal(result.output.status, 0);
	await disconnected.wait();
	Assert.equal(calls, 1);
});

Test.test('RESTBuilder streams remain cancelable after receiving headers', async function() {
	var control = new AbortController();
	var completed = gate();
	var failure = gate();
	RESTBuilder.GET(base + '/body').signal(control.signal).stream(function(err, output) {
		Assert.ifError(err);
		output.stream.once('error', failure.resolve);
		output.stream.once('data', function() { control.abort(); });
		completed.resolve();
	});
	await completed.wait();
	Assert.ok(aborted(await failure.wait()));
	await disconnected.wait();
});

Test.test('invalid URL, body and request options do not leak signal listeners', async function() {
	for (var options of [{ url: 'invalid url' }, { url: base, method: 'POST', body: {} }, { url: base, method: 'INVALID METHOD' }]) {
		var control = new AbortController();
		await Assert.rejects(REQUEST({ ...options, signal: control.signal }));
		Assert.equal(Events.getEventListeners(control.signal, 'abort').length, 0);
	}
});

Test.test('aborting one request leaves another active request on the shared keep-alive agent intact', async function() {
	var control = new AbortController();
	var first = REQUEST({ url: base + '/hang', keepalive: true, signal: control.signal });
	var rejected = Assert.rejects(first, aborted);
	rejected.catch(NOOP);
	await opened.wait();
	opened = gate('second keep-alive request');
	var second = REQUEST({ url: base + '/slow-ok', keepalive: true });
	second.catch(NOOP);
	await opened.wait();
	control.abort();
	await rejected;
	Assert.equal((await second).body, 'complete');
});

Test.test('abort closes TLS negotiation after an HTTPS proxy CONNECT succeeds', async function() {
	var accepted = gate('accepted');
	var closed = gate('closed');
	var peer;
	var proxy = Http.createServer();
	proxy.on('connect', function(req, socket) {
		peer = socket;
		socket.on('data', NOOP);
		socket.once('end', () => socket.end());
		socket.on('error', NOOP);
		socket.once('close', closed.resolve);
		socket.once('data', accepted.resolve);
		socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
	});
	await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
	try {
		var control = new AbortController();
		var request = REQUEST({ url: 'https://destination.test/ok', proxy: 'http://127.0.0.1:' + proxy.address().port, signal: control.signal });
		var rejected = Assert.rejects(request, aborted);
		rejected.catch(NOOP);
		await accepted.wait();
		control.abort();
		await rejected;
		await closed.wait();
	} finally {
		peer && peer.destroy();
		await new Promise(resolve => proxy.close(resolve));
	}
});


Test.test('AbortSignal.timeout also cancels after the first response byte', async function() {
	var signal = AbortSignal.timeout(30);
	await Assert.rejects(REQUEST({ url: base + '/body', signal: signal }), function(err) {
		return aborted(err) && err.cause?.name === 'TimeoutError';
	});
	await disconnected.wait();
	Assert.equal(Events.getEventListeners(signal, 'abort').length, 0);
});

Test.test('RESTBuilder does not return a cached response for an already-aborted signal', async function() {
	var original = F.cache.read;
	var before = paths.length;
	F.cache.read = function() {
		return { value: { status: 200, value: { cached: true } } };
	};
	try {
		var control = new AbortController();
		control.abort();
		await Assert.rejects(RESTBuilder.GET(base + '/ok').cache('1 minute').signal(control.signal).promise(), aborted);
		Assert.equal(paths.length, before);
	} finally {
		F.cache.read = original;
	}
});
