// Total.js client for Proxy
// The MIT License
// Copyright 2017-2026 (c) Peter Širka <petersirka@gmail.com>

// Client implementation
(function() {

	const BUFFER_INIT = Buffer.alloc(1);
	BUFFER_INIT.writeUInt8(0);

	const BUFFER_DATA = Buffer.alloc(1);
	BUFFER_DATA.writeUInt8(1);

	const BUFFER_END = Buffer.alloc(1);
	BUFFER_END.writeUInt8(2);

	const BUFFER_ERROR = Buffer.alloc(1);
	BUFFER_END.writeUInt8(3);

	const BUFFER_ABORT = Buffer.alloc(1);
	BUFFER_END.writeUInt8(4);

	const REG_ANSI = /\x1B\[[0-?]*[ -/]*[@-~]/g;
	const Pending = {};
	const EnabledColors = process.stdout.isTTY && process.stdout.hasColors();

	function help() {
		console.log('Proxy client arguments:');
		console.log('client [WSS proxy server] [port or ip:port]');
	}

	function log() {

		let arr = [new Date().format('yyyy-MM-dd HH:mm:ss')];

		for (let index in arguments)
			arr.push(arguments[index]);

		console.log.apply(console, arr);
	}

	function connect(Source, Target, logger) {

		let client = F.websocketclient();

		client.options.type = 'binary';
		client.connect(Target.replace(/^http/i, 'ws'));

		client.on('open', function() {
			logger && logger('[OK]', 'Proxy client successfully connected to ' + Target);
		});

		client.on('close', function() {
			logger && logger('[NO]', 'Proxy client is disconnected.');
		});

		client.on('message', function(msg) {

			let type = msg.readInt8(0);
			let id = msg.readInt32BE(1);
			let data = msg.slice(5);
			let req = Pending[id];

			switch (type) {
				case 0: // init

					let tmp = JSON.parse(data.toString('utf8'));
					let opt = {};
					opt.hostname = Source[0];
					opt.port = Source[1];
					opt.headers = tmp.headers;
					opt.headers['x-proxy'] = 'Total.js';
					opt.headers.host = Source[0] + ':' + Source[1];
					opt.method = tmp.method;
					opt.path = tmp.url;

					logger && logger('[' + opt.method + ']',tmp.ip, opt.path);

					req = Total.Http.request(opt);
					req.ID = Buffer.alloc(4);
					req.ID.writeUInt32BE(id);

					Pending[id] = req;

					req.on('error', function(err) {
						delete Pending[id];
						client.send(Buffer.concat([BUFFER_ERROR, req.ID, Buffer.from(err.toString(), 'utf8')]));
					});

					req.on('abort', function() {
						delete Pending[id];
						client.send(Buffer.concat([BUFFER_ABORT, req.ID]));
					});

					req.on('response', function(res) {

						let obj = {};
						obj.status = res.statusCode;
						obj.headers = res.headers;

						delete Pending[id];
						res.req = req;
						client.send(Buffer.concat([BUFFER_INIT, req.ID, Buffer.from(JSON.stringify(obj))]));
						res.on('data', chunk => client.send(Buffer.concat([BUFFER_DATA, req.ID, chunk])));

						res.on('error', function(err) {
							delete Pending[id];
							client.send(Buffer.concat([BUFFER_ERROR, req.ID, Buffer.from(err.toString(), 'utf8')]));
						});

						res.on('abort', function() {
							delete Pending[id];
							client.send(Buffer.concat([BUFFER_ABORT, req.ID]));
						});

						res.on('end', () => client.send(Buffer.concat([BUFFER_END, req.ID])));
					});
					break;

				case 1: // data
					req && req.write(data);
					break;

				case 2: // end
					req && req.end();
					break;
			}

		});

		return client;
	}

	exports.client = function (proxyserver, port, logger = log) {

		let Target = proxyserver;
		let Source = port;

		if (!Target || !Source) {
			help();
			return;
		}

		Source = Source.split(':');

		if (!Source[1]) {
			Source[1] = +Source[0];
			Source[0] = '127.0.0.1';
		}

		return connect(Source, Target, logger);
	};

})();

// Server implementation
(function() {

	const BUFFER_INIT = Buffer.alloc(1);
	BUFFER_INIT.writeUInt8(0);

	const BUFFER_DATA = Buffer.alloc(1);
	BUFFER_DATA.writeUInt8(1);

	const BUFFER_END = Buffer.alloc(1);
	BUFFER_END.writeUInt8(2);

	var Messages = 0;
	var Client = null;
	var Pending = {};
	var Logger = null;

	function log() {
		let arr = [new Date().format('yyyy-MM-dd HH:mm:ss')];
		for (let index in arguments)
			arr.push(arguments[index]);
		console.log.apply(console, arr);
	}

	// Handles communication between the server and proxy client
	function socket($) {

		$.autodestroy();

		$.on('open', function(client) {
			if (Client) {
				let err = 'Proxy client is already in use';
				Logger && Logger('[OK]', err);
				Client.close(4001, err);
			} else {
				Logger && Logger('[OK]', 'Proxy client is connected');
				Client = client;
			}
		});

		$.on('close', function(client) {
			if (Client == client) {
				Client = null;
				Logger && Logger('[NO]', 'Proxy client is disconnected.');
			}
		});

		$.on('message', function(client, msg) {

			let id = msg.readInt32BE(1);
			let type = msg.readInt8(0);
			let data = msg.slice(5);
			let ctrl = Pending[id];

			switch (type) {
				case 0: // init
					let tmp = JSON.parse(data.toString('utf8'));
					delete tmp.headers.connection;
					delete tmp.headers['content-length'];
					ctrl.res.writeHead(tmp.status, tmp.headers);
					break;
				case 1: // data
					ctrl.res.write(data);
					break;
				case 2: // end
					delete Pending[id];
					ctrl.res.end();
					break;
				case 3: // error
					delete Pending[id];
					ctrl.res.end();
					break;
				case 4: // abort
					delete Pending[id];
					ctrl.res.end();
					break;
			}

		});
	}

	// Handles communication between the client and server
	function proxy(ctrl) {

		if (!Client) {
			ctrl.invalid('Not yet available.');
			return;
		}

		var obj = {};
		obj.headers = ctrl.req.headers;
		obj.url = ctrl.req.url;
		obj.method = ctrl.req.method;
		obj.ip = ctrl.ip;

		let buffer = Buffer.from(JSON.stringify(obj), 'utf8');
		let id = Buffer.alloc(4);
		let index = Messages++;

		// For answer
		Pending[index] = ctrl;

		// Write request id
		id.writeUInt32BE(index);

		// Sent initial data
		Client.send(Buffer.concat([BUFFER_INIT, id, buffer]));

		// Send data
		ctrl.req.on('data', chunk => Client.send(Buffer.concat([BUFFER_DATA, id, chunk])));

		// Send empty buffer
		ctrl.req.on('end', () => Client.send(Buffer.concat([BUFFER_END, id])));
	}

	exports.server = function(endpoint = '/', socketendpoint = '/', logger = log) {
		PROXY(endpoint, proxy).check(ctrl => ctrl.method !== 'SOCKET');
		ROUTE('SOCKET {0} @binary <100MB'.format(socketendpoint), socket);
		Logger = logger;
	};

})();