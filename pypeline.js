'use strict';

function Pypeline(filename) {

	let t = this;

	t.socket = PATH.tmp('pypeline_' + HASH(filename).toString(36) + '.socket');
	t.filename = filename;
	t.callbacks = {};
	t.sockets = [];
	t.processes = [];
	t.current = 0;
	t.counter = 0;
	t.type = 'json';
	t.threads = 1;
	t.pending = [];

	// this.server {Server}
	// this.process {ChildProcess}

}

Pypeline.prototype.init = function() {
	let t = this;

	t.server = Total.Net.createServer(function(socket) {

		t.sockets.push(socket);

		let buffer = Buffer.alloc(0);
		let arr = [];

		socket.on('data', function(chunk) {

			arr[0] = buffer;
			arr[1] = chunk;
			buffer = Buffer.concat(arr);

			while (buffer.length >= 4) {
				let length = buffer.readUInt32BE(0);
				if (buffer.length >= length + 4) {

					let buf = buffer.subarray(4, 4 + length);

					if (t.type === 'json')
						buf = buf.toString('utf8').parseJSON(true);
					else if (t.type === 'text')
						buf = buf.toString('utf8');

					t.emit('data', buf);
					buffer = buffer.subarray(4 + length);
				} else
					break;
			}

		});

		socket.on('end', function() {

			for (let key in t.callbacks) {
				let callback = t.callbacks[key];
				if (callback.socket === socket) {
					try {
						callbacks.fn('Disconnected');
					} catch {}
					delete t.callbacks[key];
				}
			}

			let index = t.sockets.indexOf(socket);
			if (index !== -1)
				t.sockets.splice(index);

		});

		let pending = t.pending.splice(0);
		for (let data of pending)
			t.send(data);

		t.emit('open');

	});

	Total.Fs.unlink(t.socket, function() {
		t.server.listen(t.socket, function() {
			console.log('Pypeline connected:', t.name);
			t.run();
		});
	});
};

Pypeline.prototype.close = function() {

	let t = this;
	t.autorestart = false;

	for (let m of t.sockets) {
		m.removeAllListeners('end');
		try {
			m.close();
		} catch {}
	}

	try {
		t.server.close();
	} catch {}

	try {
		t.process.removeAllListeners('close');
		t.process.kill(9);
	} catch {}

	for (let key in t.callbacks) {
		let callback = t.callbacks[key];
		try {
			callbacks.fn('Disconnected');
		} catch {}
	}

	t.callbacks = null;
	return t;
};

Pypeline.prototype.send = function(data) {

	let t = this;
	let client = t.sockets[0];

	if (!client) {
		t.pending.push(data);
		return;
	}

	/*
	let client = t.sockets[t.current++];
	if (t.current > t.sockets.length)
		t.current = 0;
	*/

	let buffer = data instanceof Buffer ? data : Buffer.from(typeof(data) === 'object' ? JSON.stringify(data) : data.toString(), 'utf8');
	let size = Buffer.alloc(4);

	size.writeUInt32BE(buffer.length);
	client.write(Buffer.concat([size, buffer]));
	return t;
};

Pypeline.prototype.run = function() {

	let t = this;

	if (t.process) {
		try {
			t.skip = true;
			t.process.removeAllListeners('close');
			t.process.kill(9);
			t.process = null;
		} catch {}
	}

	t.process = Total.Child.spawn('python3', ['-u', t.filename, t.socket], { cwd: PATH.root(), stdio: ['inherit', 'inherit', 'inherit'] });

	t.process.on('close', function() {
		if (t.autorestart) {
			t.run();
			t.emit('restart');
		} else {
			t.server.close();
			t.emit('close');
		}
	});

};

exports.init = function(filename, options) {

	if (!options)
		options = EMPTYOBJECT;

	let pypeline = new Pypeline(filename);
	Utils.EventEmitter2(pypeline);

	pypeline.autorestart = options.autorestart != true;

	if (options.threads)
		pypeline.threads = options.threads;

	if (options.type)
		pypeline.type = options.type;

	setImmediate(pypeline => pypeline.init(), pypeline);
	return pypeline;
};