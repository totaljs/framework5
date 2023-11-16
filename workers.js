// Total.js Workers
// The MIT License
// Copyright 2020-2023 (c) Peter Širka <petersirka@gmail.com>

const HEADER = { cwd: '' };

function process_thread() {

	if (F.worker)
		return F.worker;

	F.dir(process.cwd());

	const Port = F.Worker.parentPort;

	F.worker = {};
	F.worker.data = Port ? F.Worker.workerData : {};
	F.worker.message = NOOP;
	F.worker.isfork = !!Port;
	F.worker.is = process.argv.indexOf('--worker') !== -1;
	F.worker.setTimeout = function(timeout) {
		F.worker.$timeout && clearTimeout(F.worker.$timeout);
		F.worker.$timeout = setTimeout(() => F.worker.exit(1), timeout);
	};

	F.worker.postMessage = F.worker.send = function() {
		if (Port)
			Port.postMessage.apply(Port, arguments);
		else
			process.send.apply(process, arguments);
	};

	F.worker.exit = F.worker.kill = F.worker.close = function(code) {
		process.exit(code || 0);
	};

	var onmessage = function() {
		F.worker.message && F.worker.message.apply(this, arguments);
	};

	if (Port)
		Port.on('message', onmessage);
	else
		process.on('message', onmessage);

	return F.worker;
}

exports.createthread = function(name, data) {
	if (!name)
		return process_thread();
	var filename = name[0] === '~' ? name.substring(1) : F.path.root('workers/' + name + '.js');
	var worker = new F.Worker.Worker(filename, { workerData: data, cwd: HEADER, argv: ['--worker'] });
	worker.kill = worker.exit = () => worker.terminate();
	return worker;
};

exports.createfork = function(name) {

	if (!name)
		return process_thread();

	var filename = name[0] === '~' ? name.substring(1) : F.path.root('workers/' + name + '.js');
	var fork = new F.Child.fork(filename, { cwd: HEADER, argv: ['--worker'] });
	fork.postMessage = fork.send;
	fork.terminate = () => fork.kill('SIGTERM');
	return fork;
};

exports.createpool = function(name, count, isfork) {

	var pool = {};
	pool.workers = [];
	pool.pending = [];
	pool.count = pool;
	pool.next = function() {
		for (let worker of pool.workers) {
			if (worker.$released) {
				let fn = pool.pending.shift();
				if (fn) {
					worker.removeAllListeners('message');
					worker.$released = false;
					fn.call(worker, worker, worker.release);
				} else
					break;
			}
		}
	};

	F.workers[name] = pool;

	var release = function(worker) {
		worker.on('exit', function() {
			let index = pool.workers.indexOf(worker);
			pool.workers.splice(index, 1);
			let worker = isfork ? exports.createfork(name) : exports.createthread(name);
			worker.$pool = pool;
			worker.release = release(worker);
		});

		return function() {
			worker.$released = true;
			worker.$pool.next();
		};

	};

	for (var i = 0; i < count; i++) {
		var worker = isfork ? exports.createfork(name) : exports.createthread(name);
		worker.$pool = pool;
		worker.$released = true;
		worker.release = release(worker);
		pool.workers.push(worker);
	}

	pool.exec = function(fn) {
		if (fn) {
			pool.pending.push(fn);
			pool.next();
		} else {
			return new Promise(function(resolve) {
				pool.pending.push(resolve);
				pool.next();
			});
		}
	};

	return pool;
};