/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

CONF.$imprint = false;
CONF.mail_from = 'from@example.com';
CONF.mail_from_name = 'Test';

F.run({ port: 8401, release: true, watcher: false });

ON('ready', () => F.config.smtp = { server: '127.0.0.1', port: 8403 });

const net = require('net');
const tls = require('tls');
const http = require('http');

// An HTTP server that records the last request; it also stands in for a proxy
var last = null;
const web = http.createServer(function(req, res) {
	const buffer = [];
	req.on('data', chunk => buffer.push(chunk));
	req.on('end', function() {
		last = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(buffer).toString('utf8') };
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end('{"ok":true}');
	});
});

// A tiny SMTP server that records the messages
const received = [];
const smtp = net.createServer(function(socket) {
	let data = false;
	let buffer = '';
	let current = '';
	socket.write('220 localhost ready\r\n');
	socket.on('data', function(chunk) {
		buffer += chunk.toString('utf8');
		let index;
		while ((index = buffer.indexOf('\r\n')) !== -1) {
			const line = buffer.substring(0, index);
			buffer = buffer.substring(index + 2);
			if (data) {
				if (line === '.') {
					data = false;
					received.push(current);
					current = '';
					socket.write('250 queued\r\n');
				} else
					current += line + '\n';
				continue;
			}
			const command = line.substring(0, 4).toUpperCase();
			if (command === 'EHLO' || command === 'HELO')
				socket.write('250 localhost\r\n');
			else if (command === 'DATA') {
				data = true;
				socket.write('354 go on\r\n');
			} else if (command === 'QUIT') {
				socket.write('221 bye\r\n');
				socket.end();
			} else
				socket.write('250 ok\r\n');
		}
	});
});

// A TLS server with a self-signed certificate (for the test only)
const KEY = '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgQhFpkWUfj56vEHNg\n1aikSjBWO5iw0UwEah6B6dE8tcqhRANCAATDQ+T8zlD5OPELFjVUAtbctd+HZ5K4\nubBOBJquP4rmHwLNZ/hDrpwObwRKMBqlibO6RG8aawiblTnNEJb33ubL\n-----END PRIVATE KEY-----\n';
const CERT = '-----BEGIN CERTIFICATE-----\nMIIBXjCCAQSgAwIBAgIUb994S1uPbtS2+QWcRC+fms/Q554wCgYIKoZIzj0EAwIw\nFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTExNjE3MjIyMFoYDzIxMjYxMDIz\nMTcyMjIwWjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO\nPQMBBwNCAATDQ+T8zlD5OPELFjVUAtbctd+HZ5K4ubBOBJquP4rmHwLNZ/hDrpwO\nbwRKMBqlibO6RG8aawiblTnNEJb33ubLozIwMDAdBgNVHQ4EFgQUBcjvoE+IpbA9\nReakkeZzYX789iUwDwYDVR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiAI\nUT9PSY4zKulj4PESs3//gpIow7X24Qqi+m8RJC4ZvgIhAPnQ6r1bMzwmfL/Zte7x\nWwSyWhBEJZcrHkLowRTbX3QV\n-----END CERTIFICATE-----\n';
const secure = tls.createServer({ key: KEY, cert: CERT }, socket => socket.end('hello'));

// Runs one check: "fn(done)" calls "done(error)" once, a check that does not finish fails
function check(name, fn) {
	return function(resume) {
		let finished = false;
		const done = function(err) {
			if (finished)
				return;
			finished = true;
			clearTimeout(timeout);
			Test.print(name, err || null);
			resume();
		};
		const timeout = setTimeout(() => done('The check did not finish'), 3000);
		try {
			fn(done);
		} catch (e) {
			done(e + '');
		}
	};
}

NEWACTION('HttpFixCacheA', {
	name: 'Cache A',
	cache: { expire: '1 minute' },
	action: $ => $.callback({ name: 'A' })
});

NEWACTION('HttpFixCacheB', {
	name: 'Cache B',
	cache: { expire: '1 minute' },
	action: $ => $.callback({ name: 'B' })
});

NEWACTION('HttpFixCacheC', {
	name: 'Cache C',
	cache: { expire: '1 minute', id: 'httpfixc' },
	action: $ => $.callback({ items: [1] })
});

ON('ready', function() {

	Test.push('HTTP fixes', function(next) {

		const arr = [];
		const tapi = F.apiservices.tapi;

		arr.push(resume => web.listen(8402, '127.0.0.1', resume));
		arr.push(resume => smtp.listen(8403, '127.0.0.1', resume));
		arr.push(resume => secure.listen(8404, '127.0.0.1', resume));

		// #1 CONF.$tapimail sends the email to the Total API (a fake "TAPI" service here)
		arr.push(check('$tapimail sends the email through the Total API', function(done) {
			let called = null;
			NEWAPI('TAPI', function(opt, next) {
				called = opt;
				next(null, { success: true });
			});
			F.config.$tapi = true;
			F.config.$tapimail = true;
			HTMLMAIL('to@example.com', 'TAPI test', '<p>Hello</p>', function(err) {
				done(!err && called && called.schema === 'mail' && called.data.subject === 'TAPI test' ? null : 'Unexpected call: ' + (err || JSON.stringify(called && called.schema)));
			});
		}));

		// #2 high() and confidential() write their headers over SMTP
		arr.push(check('high() and confidential() write X-Priority and Sensitivity', function(done) {
			F.apiservices.tapi = tapi;
			F.config.$tapimail = false;
			const before = received.length;
			const message = HTMLMAIL('to@example.com', 'Priority test', '<p>Hello</p>', function(err) {
				setTimeout(function() {
					const raw = received[before] || '';
					done(!err && raw.indexOf('X-Priority: 1') !== -1 && raw.indexOf('Sensitivity: Company-Confidential') !== -1 ? null : 'The headers are missing');
				}, 200);
			});
			message.high().confidential();
		}));

		// #3 the "writer" option of REQUEST() writes the body
		arr.push(check('REQUEST() with "writer" sends the written body', function(done) {
			last = null;
			REQUEST({ url: 'http://127.0.0.1:8402/writer/', method: 'POST', writer: req => req.end('X'), callback: function(err) {
				done(!err && last && last.body === 'X' ? null : 'The body is: ' + (err || JSON.stringify(last && last.body)));
			}});
		}));

		// #4 RESTBuilder.API().get() sends the query inside the API body
		arr.push(check('RESTBuilder.API().get() sends the query with the data', function(done) {
			last = null;
			RESTBuilder.API('http://127.0.0.1:8402/api/', 'products_list', { a: 1 }).get({ q: 1 }).callback(function(err) {
				const body = last && last.body.parseJSON();
				done(!err && last.method === 'POST' && body && body.schema === 'products_list' && body.data.a === 1 && body.query.q === 1 ? null : 'Unexpected request: ' + (err || JSON.stringify(last)));
			});
		}));

		// #5 compress() of RESTBuilder.API() leaves out the null values
		arr.push(check('RESTBuilder.API().compress() leaves out null values', function(done) {
			last = null;
			RESTBuilder.API('http://127.0.0.1:8402/api/', 'products_save', { a: 1, b: null }).compress().callback(function(err) {
				done(!err && last && last.body.indexOf('"a":1') !== -1 && last.body.indexOf('"b"') === -1 ? null : 'The body is: ' + (err || (last && last.body)));
			});
		}));

		// #19 U.set() creates an object after an index
		arr.push(check('U.set() creates an object after an index', function(done) {
			const obj = {};
			U.set(obj, 'items[0].name', 'x');
			done(obj.items instanceof Array && obj.items[0] && !(obj.items[0] instanceof Array) && obj.items[0].name === 'x' ? null : 'The result is: ' + JSON.stringify(obj));
		}));

		// #26 the "cache" option of NEWACTION(): a key per action and a copy of the response
		arr.push(check('NEWACTION() "cache" keeps a copy per action', function(done) {
			ACTION('HttpFixCacheA').callback(function(err, a) {
				ACTION('HttpFixCacheB').callback(function(err, b) {
					ACTION('HttpFixCacheC').callback(function(err, c1) {
						c1.items.push(2);
						ACTION('HttpFixCacheC').callback(function(err, c2) {
							done(a.name === 'A' && b.name === 'B' && c2.items.length === 1 ? null : 'Responses: ' + JSON.stringify([a, b, c2]));
						});
					});
				});
			});
		}));

		// #36 the "tls" option of U.connect() upgrades the socket
		arr.push(check('U.connect() with "tls" upgrades the socket', function(done) {
			U.connect({ host: '127.0.0.1', port: 8404, tls: { rejectUnauthorized: false } }, function(err, meta) {
				if (err) {
					done(err + '');
					return;
				}
				const socket = meta.socket;
				if (!socket.encrypted) {
					meta.close();
					done('The socket is not encrypted');
					return;
				}
				meta.ondata(function(chunk) {
					meta.close();
					done(chunk.toString('utf8') === 'hello' ? null : 'Unexpected data');
				});
			});
		}));

		// #37 credentials in the URL: U.parseURI(), REQUEST() and a proxy
		arr.push(check('credentials in the URL work for REQUEST() and a proxy', function(done) {
			const uri = U.parseURI('http://us%40er:p%3Ass@127.0.0.1:8402/');
			if (uri.auth !== 'us@er:p:ss') {
				done('U.parseURI() auth: ' + uri.auth);
				return;
			}
			last = null;
			REQUEST({ url: 'http://user:pass@127.0.0.1:8402/auth/', callback: function(err) {
				const auth = last && last.headers.authorization;
				if (err || auth !== 'Basic ' + Buffer.from('user:pass').toString('base64')) {
					done('Authorization: ' + (err || auth));
					return;
				}
				last = null;
				REQUEST({ url: 'http://example.test/proxied/', proxy: 'http://proxyuser:proxypass@127.0.0.1:8402', callback: function(err) {
					const auth = last && last.headers['proxy-authorization'];
					done(!err && last.url === 'http://example.test/proxied/' && auth === 'Basic ' + Buffer.from('proxyuser:proxypass').toString('base64') ? null : 'Proxy-Authorization: ' + (err || auth));
				}});
			}});
		}));

		arr.async(function() {
			web.close();
			smtp.close();
			secure.close();
			next();
		});
	});

	Test.run();
});
