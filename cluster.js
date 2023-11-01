// Total.js Cluster
// The MIT License
// Copyright 2018-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const MAXTHREADLATENCY = 70;
const FORKS = [];

var OPTIONS = {};
var THREADS = 0;
var MASTER = null;
var CONTINUE = false;
var STATS = [];
var TIMEOUTS = {};

exports.http = function(opt) {

	process.env.TZ = (opt ? opt.tz : '') || 'utc';

	// Fork will obtain options automatically via event
	if (F.Cluster.isPrimary) {
		master(opt);
	} else
		fork();
};

exports.restart = function(index) {
	if (index == null) {
		for (var i = 0; i < THREADS; i++)
			setTimeout(index => exports.restart(index), i * 2000, i);
	} else {
		var fork = FORKS[index];
		if (fork) {
			fork.$ready = false;
			fork.removeAllListeners();
			fork.kill(0);
			setTimeout(index => exec(index), 500, index);
		} else
			exec(index);

		if (!DEBUG)
			console.log('======= ' + (new Date().format('yyyy-MM-dd HH:mm:ss')) + ': restarted thread with index "{0}"'.format(index));
	}
};

function master(opt) {

	if (!opt.count)
		opt.count = F.Os.cpus().length;

	opt.auto = opt.count === 'auto';

	if (opt.auto)
		opt.count = 1;

	OPTIONS = opt;

	var memory = process.memoryUsage();

	if (!process.connected || opt.logs === 'isolated') {
		console.log('==================== CLUSTER =======================');
		console.log('PID           : ' + process.pid);
		console.log('Node.js       : ' + process.version);
		console.log('Total.js      : v' + F.version_header);
		console.log('OS            : ' + F.Os.platform() + ' ' + F.Os.release());
		console.log('Memory        : ' + memory.heapUsed.filesize(2) + ' / ' + memory.heapTotal.filesize(2));
		console.log('User          : ' + F.Os.userInfo().username);
		console.log('OS            : ' + F.Os.platform() + ' ' + F.Os.release());
		console.log('====================================================');
		console.log('Thread count  : {0}'.format(opt.auto ? 'auto' : opt.count));
		console.log('Date          : ' + new Date().format('yyyy-MM-dd HH:mm:ss'));
		console.log('Mode          : ' + (opt.release ? 'release' : 'debug'));
		console.log('====================================================\n');
	}

	if (!opt.release)
		require('./debug').watcher(() => exports.restart());

	THREADS = opt.count;

	var check = function(callback) {
		if (CONTINUE)
			callback();
		else
			setTimeout(check, 500, callback);
	};

	var arr = [];

	for (let i = 0; i < opt.count; i++)
		arr.push(i);

	arr.wait(function(index, next) {
		exec(Math.abs(index - THREADS));
		check(next);
	}, function() {
		opt.callback && opt.callback(FORKS);
	});

	process.title = 'total: cluster';

	var filename = F.path.join(process.cwd(), 'restart');
	var restart = function(err) {
		if (!err) {
			F.Fs.unlink(filename, NOOP);
			if (!F.restarting) {
				exports.restart();
				F.restarting = true;
				setTimeout(() => F.restarting = false, 30000);
			}
		}
	};

	var killme = fork => fork.kill();

	var counter = 0;
	var main = {};
	main.pid = process.pid;
	main.version = {};
	main.version.node = process.version;
	main.version.total = F.version_header;
	main.version.app = CONF.version;

	setInterval(function() {

		counter++;

		if (counter % 10 === 0) {
			main.date = new Date();
			main.threads = THREADS;
			var memory = process.memoryUsage();
			main.memory = (memory.heapUsed / 1024 / 1024).floor(2);
			main.stats = STATS;
			F.Fs.writeFile(process.mainModule.filename + '.json', JSON.stringify(main, null, '  '), NOOP);
		}

		F.Fs.stat(filename, restart);

		// Ping
		if (!opt.auto)
			return;

		var isfree = false;
		var isempty = false;
		var sum = 0;

		// Auto-ping
		for (var i = 0; i < FORKS.length; i++) {
			var fork = FORKS[i];
			if (fork) {

				if (fork.$pingoverload)
					fork.$pingoverload--;

				if (fork.$ping) {
					sum += fork.$ping;
					if (fork.$ping < MAXTHREADLATENCY)
						isfree = true;
				} else
					isempty = true;

				fork.$pingts = Date.now();
				fork.send('total:ping');
			}
		}

		if (isfree || isempty) {

			if (counter % 5 === 0 && !isempty && THREADS > 1) {

				// try to remove last
				var lastindex = FORKS.length - 1;
				var last = FORKS[lastindex];
				if (last == null) {
					TIMEOUTS[lastindex] && clearTimeout(TIMEOUTS[lastindex]);
					FORKS.splice(lastindex, 1);
					STATS.splice(lastindex, 1);
					THREADS = FORKS.length;
					return;
				}

				for (var i = 0; i < STATS.length; i++) {
					if (STATS[i].id === last.$id) {
						if (STATS[i].pending < 2) {
							// nothing pending
							fork.$ready = false;
							fork.removeAllListeners();
							fork.kill(0);
							setTimeout(killme, 1000, fork);
							FORKS.splice(lastindex, 1);
							STATS.splice(lastindex, 1);
						}
						break;
					}
				}
				THREADS = FORKS.length;
			}

		} else if (!opt.limit || THREADS < opt.limit) {
			var avg = (sum / FORKS.length).floor(3);
			if (avg > MAXTHREADLATENCY)
				exec(THREADS++);
		}

	}, 5000);
}

function message(m) {

	if (m === 'total:init') {
		OPTIONS.id = this.$id;
		this.send({ TYPE: 'init', bundling: !CONTINUE, id: this.$id, release: !!OPTIONS.release, options: OPTIONS, index: this.$index });
		return;
	}

	if (m === 'total:ready') {
		CONTINUE = true;
		this.$ready = true;
		return;
	}

	if (m === 'total:ping') {
		this.$ping = Date.now() - this.$pingts;
		return;
	}

	if (m === 'total:update') {
		for (let i = 1; i < FORKS.length; i++)
			FORKS[i] && FORKS[i].$ready && FORKS[i].send(m);
		return;
	}

	if (m === 'total:overload') {
		if (this.$pingoverload) {
			this.$ping = MAXTHREADLATENCY + 1;
			this.$pingoverload = 3; // waits 15 seconds
		}
		return;
	}

	if (m.TYPE === 'master') {
		if (MASTER && MASTER[m.name]) {
			for (let i = 0, length = MASTER[m.name].length; i < length; i++)
				MASTER[m.name][i](m.a, m.b, m.c, m.d, m.e);
		}
	} else if (m.TYPE === 'stats') {
		let is = false;
		for (let i = 0; i < STATS.length; i++) {
			if (STATS[i].id === m.data.id) {
				m.data.ping = this.$ping;
				STATS[i] = m.data;
				is = true;
				break;
			}
		}
		!is && STATS.push(m.data);
	} else {

		if (m.TYPE === 'total:emit') {
			if (process.send)
				process.send(m);
			else {
				m.TYPE = 'emit';
				for (let i = 0; i < FORKS.length; i++)
					FORKS[i] && FORKS[i].$ready && FORKS[i].send(m);
			}
			return;
		}

		if (m.target === 'master') {
			exports.res(m);
		} else {
			for (let i = 0; i < FORKS.length; i++)
				FORKS[i] && FORKS[i].$ready && FORKS[i].send(m);
		}
	}
}

function exec(index) {

	if (TIMEOUTS[index]) {
		clearTimeout(TIMEOUTS[index]);
		delete TIMEOUTS[index];
	}

	let fork = F.Cluster.fork();
	fork.$id = index.toString();
	fork.$index = index;
	fork.on('message', message);
	fork.on('exit', function() {
		FORKS[index] = null;
		TIMEOUTS[index] = setTimeout(exports.restart, 1000, index);
	});

	if (FORKS[index] === undefined)
		FORKS.push(fork);
	else
		FORKS[index] = fork;

}

function fork() {
	F.on('$message', oninit);
}

function oninit(msg) {
	if (msg.TYPE === 'init') {
		OPTIONS = msg.options;
		THREADS = msg.threads;
		msg.options.bundling = msg.bundling;
		F.isCluster = true;
		F.id = msg.id;
		F.clusterid = msg.id;
		global.DEBUG = msg.release != true;
		OPTIONS.load = '';
		F.http(OPTIONS);
		F.off(msg.TYPE, oninit);
	}
}