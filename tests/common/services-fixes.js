/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

// Removes a temporary folder; on Windows a file may still be open for a moment (EBUSY), so it retries and never throws
function remove(path) {
	try {
		require('fs').rmSync(path, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	} catch (e) {}
}

const Net = require('net');
const PORT = 8461;
const PORT_RAW = 8462;

CONF.$imprint = false;

AUTH(function($) {
	if ($.query.token === 'ok')
		$.success({ id: 'user' });
	else
		$.invalid();
});

ROUTE('SOCKET /binary/ @binary', function($) {
	$.on('open', client => client.send(Buffer.from('hello')));
});

ROUTE('+SOCKET /private/', function($) {});

var deflateerror = {};

ROUTE('SOCKET /deflateerror/ @binary', function($) {
	$.on('error', err => deflateerror.reported = err);
	$.on('open', function(client) {
		try {
			client.send({ invalid: true });
		} catch (e) {
			deflateerror.thrown = e;
		}
	});
});

NEWACTION('ServicesFixes|crash', {
	name: 'Crash',
	mcp: true,
	action: function($) {
		throw new Error('Exception inside the action');
	}
});

F.run({ port: PORT, release: true, watcher: false });

// Opens a raw WebSocket connection and returns the HTTP status line and the first frame
function rawsocket(path, compress, callback) {

	var socket = Net.connect(PORT, '127.0.0.1');
	var chunks = [];
	var done = false;

	var finish = function() {
		if (done)
			return;
		done = true;
		socket.destroy();
		var buffer = Buffer.concat(chunks);
		var index = buffer.indexOf('\r\n\r\n');
		if (index === -1) {
			callback(null);
			return;
		}
		var frame = buffer.slice(index + 4);
		var output = {};
		output.status = buffer.slice(0, index).toString('utf8').split('\r\n')[0];
		output.opcode = frame.length ? frame[0] & 0x0F : -1;
		output.rsv1 = frame.length ? (frame[0] & 0x40) !== 0 : false;
		output.payload = frame.length > 1 ? frame.slice(2, 2 + (frame[1] & 0x7F)) : Buffer.alloc(0);
		callback(output);
	};

	socket.on('data', chunk => chunks.push(chunk));
	socket.on('error', NOOP);
	socket.on('close', finish);
	socket.write('GET ' + path + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n' + (compress ? 'Sec-WebSocket-Extensions: permessage-deflate\r\n' : '') + '\r\n');
	setTimeout(finish, 1500);
}

function mcpcall(body, callback) {
	var $ = {};
	var timer = setTimeout(() => callback(null), 3000);
	$.body = body;
	$.query = {};
	$.response = { status: 200 };
	$.json = function(response) {
		clearTimeout(timer);
		callback(response);
	};
	$.plain = () => $.json(null);
	Total.mcp.exec($);
}

ON('ready', function() {

	Test.push('Services fixes', function(next) {

		var arr = [];

		arr.push(resume => setTimeout(resume, 500));

		// #15 WebSocket: a binary message with compression goes out as a binary frame
		arr.push(function(resume) {
			rawsocket('/binary/', true, function(output) {
				Test.print('WebSocket: a compressed binary message is a binary frame', output && output.opcode === 2 && output.rsv1 ? null : 'Expected opcode 2 with rsv1, got ' + JSON.stringify(output && { opcode: output.opcode, rsv1: output.rsv1 }));
				resume();
			});
		});

		// #16 WebSocket: a client rejected by the authorization gets the close code 4001
		arr.push(function(resume) {
			var client = WEBSOCKETCLIENT();
			var timer = setTimeout(function() {
				client.destroy();
				Test.print('WebSocket: an unauthorized client gets the close code 4001', 'The client was not closed');
				resume();
			}, 4000);
			client.options.reconnect = 0;
			client.on('error', NOOP);
			client.on('close', function(code) {
				clearTimeout(timer);
				client.destroy();
				Test.print('WebSocket: an unauthorized client gets the close code 4001', code === 4001 ? null : 'Expected the close code 4001, got ' + code);
				resume();
			});
			client.connect('ws://127.0.0.1:' + PORT + '/private/');
		});

		// #20 FILESTORAGE: clone() without "newid" as a promise
		arr.push(function(resume) {
			var directory = PATH.join(PATH.root(), 'tmp-services-fixes-' + Date.now());
			var fs = FILESTORAGE('servicesfixes');
			var timer = setTimeout(function() {
				Test.print('FILESTORAGE: clone() without a new id as a promise', 'The promise was not settled');
				resume();
			}, 3000);
			fs.storage(directory);
			fs.save('n1', 'hello.txt', Buffer.from('hello'), function(err) {
				fs.clone('n1').then(function(meta) {
					clearTimeout(timer);
					remove(directory);
					Test.print('FILESTORAGE: clone() without a new id as a promise', !err && meta && meta.id && meta.id !== 'n1' ? null : 'Expected a clone with a new id');
					resume();
				}, function(err) {
					clearTimeout(timer);
					remove(directory);
					Test.print('FILESTORAGE: clone() without a new id as a promise', err);
				});
			});
		});

		// #23 TMS: "$tms : false" removes the route
		arr.push(function(resume) {
			var has = () => F.routes.websockets.some(route => route.url2 === '/$tms/');
			var url = CONF.$tmsurl;
			CONF.$tms = true;
			F.emit('$tms');
			var enabled = has();
			CONF.$tms = false;
			F.emit('$tms');
			var disabled = has();
			Test.print('TMS: "$tms : false" removes the route', enabled && !disabled && url === CONF.$tmsurl ? null : 'Expected the route to be removed, enabled: ' + enabled + ', disabled: ' + disabled);
			resume();
		});

		// #28 MCP: an exception inside the action gets an answer
		arr.push(function(resume) {
			Total.mcp.refreshforce();
			mcpcall({ jsonrpc: '2.0', id: 28, method: 'tools/call', params: { name: 'ServicesFixes_crash', arguments: {} } }, function(response) {
				Test.print('MCP: an exception inside a tool gets an error answer', response && response.id === 28 && response.result && response.result.isError === true ? null : 'Expected an error answer, got ' + JSON.stringify(response));
				resume();
			});
		});

		// #30 AIPARSER('ollama'): tool calls in separate chunks
		arr.push(function(resume) {
			var parser = AIPARSER('ollama');
			parser.write({ message: { role: 'assistant', content: '', tool_calls: [{ function: { index: 0, name: 'lookup', arguments: { query: 'one' } } }] }, done: false });
			parser.write({ message: { role: 'assistant', content: '', tool_calls: [{ function: { index: 1, name: 'weather', arguments: { city: 'Rome' } } }] }, done: false });
			var tools = parser.end().tools;
			Test.print('AIPARSER(ollama): tool calls in separate chunks', tools.length === 2 && tools[0].name === 'lookup' && tools[1].name === 'weather' && tools[1].arguments.city === 'Rome' ? null : 'Expected two calls, got ' + JSON.stringify(tools));
			resume();
		});

		// #31 AIPARSER(generic): tool calls without id in separate chunks
		arr.push(function(resume) {
			var parser = AIPARSER('generic');
			parser.write({ tool_calls: [{ function: { name: 'lookup', arguments: { query: 'one' } } }] });
			parser.write({ tool_calls: [{ function: { name: 'weather', arguments: { city: 'Rome' } } }] });
			var tools = parser.end().tools;
			var fragments = AIPARSER('generic');
			fragments.write({ tool_calls: [{ function: { name: 'lookup', arguments: '{"query":' } }] });
			fragments.write({ tool_calls: [{ function: { arguments: '"one"}' } }] });
			var joined = fragments.end().tools;
			Test.print('AIPARSER(generic): tool calls without id in separate chunks', tools.length === 2 && tools[0].arguments.query === 'one' && tools[1].arguments.city === 'Rome' && joined.length === 1 && joined[0].arguments.query === 'one' ? null : 'Expected two calls and one joined call, got ' + JSON.stringify(tools) + ' ' + JSON.stringify(joined));
			resume();
		});

		// #29 edit-mcp: App_mkdir in the project, App_read with the revision, the proxy lists the tools
		arr.push(function(resume) {

			var editmcp = require('../../edit-mcp');
			var name = 'tmp-services-fixes-' + Date.now();
			var revisions = PATH.root('revisions');
			var hasrevisions = F.Fs.existsSync(revisions);

			var cleanup = function() {
				remove(PATH.root(name));
				!hasrevisions && remove(revisions);
			};

			(async function() {
				try {
					await ACTION('App_mkdir', { path: '/' + name }).promise();
					var created = F.Fs.existsSync(PATH.root(name));
					await ACTION('App_write', { path: '/' + name + '/file.txt', content: 'x' }).promise();
					var read = await ACTION('App_read', { paths: ['/' + name + '/file.txt'] }).promise();
					editmcp.proxy({ on: NOOP });
					Total.mcp.refreshforce();
					var listed = Total.mcp.tools.filter(tool => tool.name.startsWith('App_')).length;
					cleanup();
					Test.print('edit-mcp: App_mkdir, App_read revision and the tools of the proxy', created && read.items[0].revision === 1 && listed === 12 ? null : 'Expected the folder in the project, revision 1 and 12 tools, got ' + created + ', ' + read.items[0].revision + ', ' + listed);
					resume();
				} catch (e) {
					cleanup();
					Test.print('edit-mcp: App_mkdir, App_read revision and the tools of the proxy', e);
				}
			})();
		});

		// WebSocket: an error of the compression is reported to the "error" event
		arr.push(function(resume) {
			rawsocket('/deflateerror/', true, function() {
				Test.print('WebSocket: a compression error goes to the "error" event', !deflateerror.thrown && deflateerror.reported instanceof TypeError ? null : 'Expected a TypeError in the "error" event, got ' + (deflateerror.thrown || deflateerror.reported));
				resume();
			});
		});

		// WEBSOCKETCLIENT: a frame in the same packet as the 101 answer
		arr.push(function(resume) {
			var server = Net.createServer(function(socket) {
				socket.on('error', NOOP);
				socket.once('data', function(chunk) {
					var key = (/Sec-WebSocket-Key: (.*)\r\n/i).exec(chunk.toString())[1];
					var accept = F.Crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
					var payload = Buffer.from('hello');
					var frame = Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
					socket.write(Buffer.concat([Buffer.from('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n'), frame]));
				});
			});
			server.listen(PORT_RAW, function() {
				var client = WEBSOCKETCLIENT();
				var finish = function(err) {
					clearTimeout(timer);
					client.destroy();
					server.close();
					Test.print('WEBSOCKETCLIENT: a frame together with the 101 answer', err);
					resume();
				};
				var timer = setTimeout(finish, 2000, 'The message was not received');
				client.options.type = 'text';
				client.options.reconnect = 0;
				client.on('error', NOOP);
				client.on('message', msg => finish(msg === 'hello' ? null : 'Expected "hello", got ' + msg));
				client.connect('ws://127.0.0.1:' + PORT_RAW + '/');
			});
		});

		// FILESTORAGE: clone(), copy() and readbuffer() while the storage is paused
		arr.push(function(resume) {
			var directory = PATH.join(PATH.root(), 'tmp-services-fixes-paused-' + Date.now());
			var fs = FILESTORAGE('servicesfixespaused');
			var output = {};
			fs.storage(directory);
			fs.save('p1', 'hello.txt', Buffer.from('hello'), function() {
				fs.pause = true;
				fs.clone('p1', 'p2', err => output.clone = err ? err + '' : 'ok');
				fs.copy('p1', PATH.join(directory, 'copy.txt'), err => output.copy = err ? err + '' : 'ok');
				fs.readbuffer('p1', (err, buffer) => output.readbuffer = err ? err + '' : buffer.toString());
				setTimeout(() => fs.pause = false, 100);
				setTimeout(function() {
					remove(directory);
					Test.print('FILESTORAGE: clone(), copy() and readbuffer() while paused', output.clone === 'ok' && output.copy === 'ok' && output.readbuffer === 'hello' ? null : 'Expected all three to finish, got ' + JSON.stringify(output));
					resume();
				}, 1500);
			});
		});

		arr.async(next);
	});

	Test.run();
});
