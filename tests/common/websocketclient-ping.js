/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8485;
const PORT_SERVER = 8486;
const Net = require('net');
const Crypto = require('crypto');

CONF.$imprint = false;

F.run({ port: PORT, release: true, watcher: false });

// The first connection gets the WebSocket handshake and then no answer (no PONG),
// the next connections are accepted and never answered (the reconnect hangs like on a dead network)
var connections = 0;
var sockets = [];
var server = Net.createServer(function(socket) {
	var index = ++connections;
	sockets.push(socket);
	socket.on('error', NOOP);
	socket.once('data', function(data) {
		if (index === 1) {
			var key = (/sec-websocket-key: (.+)\r\n/i).exec(data.toString('utf8'))[1];
			var accept = Crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
			socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
		}
	});
});

ON('ready', function() {

	Test.push('WebSocketClient ping', function(next) {

		var client = F.websocketclient();
		var events = [];
		var arr = [];

		client.options.reconnect = 500;
		client.options.reconnectserver = true;
		client.on('open', () => events.push('open'));
		client.on('close', () => events.push('close'));
		client.on('error', err => events.push('error:' + err.message));

		arr.push(resume => server.listen(PORT_SERVER, resume));

		arr.push(function(resume) {
			client.connect('ws://127.0.0.1:' + PORT_SERVER + '/');
			setTimeout(resume, 300);
		});

		// A ping without an answer: the client gets the error and the "close" event
		arr.push(function(resume) {
			client.ping(300);
			setTimeout(function() {
				Test.print('A ping without an answer emits "error" and "close"', events.join(',') === 'open,error:Timeout,close' ? null : 'Unexpected events: ' + events.join(','));
				resume();
			}, 600);
		});

		// The client is reconnecting (without a socket): a ping must not throw
		arr.push(function(resume) {
			setTimeout(function() {
				var err = null;
				try {
					client.ping(300);
				} catch (e) {
					err = e;
				}
				Test.print('A ping while the client is reconnecting does nothing', !err && connections === 2 && !client.socket && !client.isclosed ? null : err ? err.message : ('Unexpected state, connections: ' + connections + ', socket: ' + (client.socket ? 'yes' : 'no') + ', isclosed: ' + client.isclosed));
				resume();
			}, 500);
		});

		arr.async(function() {
			client.destroy();
			for (var socket of sockets)
				socket.destroy();
			server.close();
			next();
		});
	});

	Test.run();
});
