
// Total.js client for Proxy
// The MIT License
// Copyright 2017-2023 (c) Peter Širka <petersirka@gmail.com>

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

const Pending = {};

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

function connect(Source, Target) {

	F.websocketclient(function(client) {

		client.options.type = 'binary';
		client.connect(Target.replace(/^http/i, 'ws'));

		client.on('open', function() {
			log('\x1b[42m[OK]\x1b[0m', 'Proxy client successfully connected to \x1b[41m{0}\x1b[0m'.format(Target));
		});

		client.on('close', function() {
			log('\x1b[41m[NO]\x1b[0m', 'Proxy client is disconnected.');
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

					log('\x1b[43m[' + opt.method + ']\x1b[0m', '\x1b[34m' + tmp.ip + '\x1b[0m', opt.path);

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
	});
}

exports.init = function (endpoint, port) { 
    let Target = endpoint;
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

    connect(Source, Target);
};