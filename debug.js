// Debug module (Watcher)
// The MIT License
// Copyright 2012-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

require('./index');

var Meta = {
	isWatcher: process.connected !== true,
	callback: null, // watcher callback
	delay: null
};

var first = process.argv.indexOf('--restart') === -1;
var options = null;

module.exports = function(opt) {

	options = opt || {};

	// options.ip = '127.0.0.1';
	// options.port = parseInt(process.argv[2]);
	// options.unixsocket = require('node:path').join(require('node:os').tmpdir(), 'app_name');
	// options.config = { name: 'Total.js' };
	// options.https = { key: Fs.readFileSync('keys/agent2-key.pem'), cert: Fs.readFileSync('keys/agent2-cert.pem')};
	// options.sleep = 3000;
	// options.inspector = 9229;
	// options.debugger = 40894;
	// options.watch = ['adminer'];
	// options.livereload = true;
	// options.cluster = 'auto' || or NUMBER
	// options.limit = 10;
	// options.timeout = 5000;
	// options.edit = 'wss://.....com/?id=myprojectname'

};

module.exports.watcher = function(callback) {
	Meta.delay && clearTimeout(Meta.delay);
	Meta.delay = null;
	Meta.callback = callback;
	runwatching();
};

function runapp() {
	!options && (options = {});
	if (options.servicemode) {
		var types = options.servicemode === true || options.servicemode === 1 ? '' : options.servicemode.split(',').trim();
		global.DEBUG = true;
		F.load(types);
	} else
		F.http(options);
}

function runwatching() {

	if (!options)
		options = {};

	var directory = process.cwd();
	var root = directory;

	var LIVERELOADCHANGE = '';

	const FILENAME = F.TUtils.getName(process.argv[1] || 'index.js');
	const VERSION = F.version_header;
	const REG_FILES = /(config|bundles\.debug|\.js|\.ts|\.flow|\.resource)+$/i;
	const REG_PUBLIC = /\/public\//i;
	const REG_INDEX = new RegExp(FILENAME.replace(/\.js$/, '') + '_.*?\\.js$');
	const REG_EXTENSION = /\.(js|ts|resource|package|bundle|build|flow|url)$/i;
	const REG_RELOAD = /\.(js|ts|css|html|htm|jpg|png|gif|ico|svg|resource)$/i;
	const isRELOAD = !!options.livereload;
	const SPEED = isRELOAD ? 1000 : 1500;
	const ARGV = F.TUtils.clone(process.argv);
	const PIDNAME = FILENAME.replace(/\.(js|ts)$/, '.pid');

	if (isRELOAD && typeof(options.livereload) === 'string')
		options.livereload = options.livereload.replace(/^(https|http):\/\//g, '');

	function copyFile(oldname, newname, callback) {
		var writer = F.Fs.createWriteStream(newname);
		callback && writer.on('finish', callback);
		F.Fs.createReadStream(oldname).pipe(writer);
	}

	function app() {

		if (!Meta.callback) {
			global.OBSOLETE = NOOP;
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
		}

		var skipbundle = false;
		F.directory = directory;

		try {
			if (F.Fs.readFileSync(F.path.join(directory, 'bundles.debug'))) {
				skipbundle = true;
				F.directory = directory = F.path.join(directory, '.src');
			}

		} catch(e) {}

		const fork = F.Child.fork;
		const directories = [
			F.Path.join(directory, 'controllers'),
			F.Path.join(directory, 'definitions'),
			F.Path.join(directory, 'extensions'),
			F.Path.join(directory, 'modules'),
			F.Path.join(directory, 'models'),
			F.Path.join(directory, 'schemas'),
			F.Path.join(directory, 'actions'),
			F.Path.join(directory, 'resources'),
			F.Path.join(directory, 'source'),
			F.Path.join(directory, 'workers'),
			F.Path.join(directory, 'middleware'),
			F.Path.join(directory, 'bundles'),
			F.Path.join(directory, 'flowstreams'),
			F.Path.join(directory, '/startup/'),
			F.Path.join(directory, '/plugins/')
		];

		const SRC = F.Path.join(directory, '.src');
		const prefix = '--------> ';

		if (options.watch) {
			for (let item of options.watch) {
				if (item[0] === '/')
					item = item.substring(1);
				if (item[item.length - 1] === '/')
					item = item.substring(0, item.length - 1);
				directories.push(F.Path.join(directory, item));
			}
		}

		var WS = null;
		var files = {};
		var force = false;
		var changes = [];
		var app = null;
		var status = Meta.callback ? 1 : 0;
		var pid = '';
		var isloaded = false;
		var skiprestart = false;
		var isbundle = false;
		var ignore = {};
		var counter = 0;
		var speed = isRELOAD ? 1000 : 4000;

		ignore['/' + PIDNAME] = 1;
		ignore['/debug.pid'] = 1;
		ignore['/debug.js'] = 1;
		ignore['/bundle.json'] = 1;
		ignore['/package.json'] = 1;
		ignore['/readme.md'] = 1;

		if (isRELOAD && !Meta.callback) {
			if (typeof(options.livereload) === 'string') {
				WEBSOCKETCLIENT(function(client) {
					client.options.type = 'text';
					client.on('open', () => WS = client);
					client.on('close', () => WS = null);
					client.connect('wss://livereload.totaljs.com/?hostname=' + encodeURIComponent(options.livereload));
				});
			} else {
				var tmppath = F.Path.join(F.Os.tmpdir(), 'total5livereload');
				F.Fs.mkdir(tmppath, function() {
					F.console = NOOP;
					F.route('SOCKET / @text', function($) {
						$.autodestroy(() => WS = null);
						WS = self;
					});
					var port = typeof(options.livereload) === 'number' ? options.livereload : 35729;
					F.directory = tmppath;
					F.http({ port: port });
					console.log('> Live reload: ws://127.0.0.1:' + port);
				});
			}
		}

		if (skipbundle) {
			try {
				F.Fs.statSync(F.path.root('bundles'));
				isbundle = true;
			} catch(e) {}
		}

		if (isbundle || isRELOAD) {
			directories.push(F.Path.join(directory, 'public'));
			directories.push(F.Path.join(directory, 'views'));
		}

		function onFilter(path, isdir) {
			var p = path.substring(directory.length);
			if (isbundle)
				return isdir ? SRC !== path : !ignore[p];
			if (isRELOAD)
				return isdir ? true : REG_RELOAD.test(path);
			if (isdir)
				return true;
			if (!REG_PUBLIC.test(path) && REG_EXTENSION.test(path))
				return true;
			return false;
		}

		function skiproot(filename) {
			if (filename.substring(filename.length - 3) === '.js') {
				for (var i = 0; i < filename.length - 3; i++) {
					if (filename[i] === '/' || filename[i] === '\\')
						return;
				}
				return true;
			}
		}

		function onComplete(f) {

			F.Fs.readdir(directory, function(err, arr) {

				var length = arr.length;
				for (var i = 0; i < length; i++) {
					var name = arr[i];
					if (name !== FILENAME && !REG_INDEX.test(name) && REG_FILES.test(name) && !skiproot(name))
						f.push(name);
				}

				length = f.length;

				for (var i = 0; i < length; i++) {
					var name = f[i];
					if (files[name] === undefined)
						files[name] = isloaded ? 0 : null;
				}

				refresh();
			});
		}

		function livereload(filename) {
			isRELOAD && setTimeout2('livereload', (filename) => WS && WS.send(filename || 'unknown'), 500, null, filename);
		}

		function isViewPublic(filename) {

			if (!isbundle && !isRELOAD)
				return false;

			var fn = filename.substring(directory.length);
			var index = fn.indexOf('/', 1);
			var dir = fn.substring(0, index + 1);

			if (dir === CONF.directory_themes) {
				index = fn.indexOf('/', index + 1);
				dir = fn.substring(index, fn.indexOf('/', index + 1) + 1);
			}

			return CONF.directory_views === dir || CONF.directory_public === dir ? fn : '';
		}

		function makestamp() {
			return '--- # --- [ ' + new Date().format('yyyy-MM-dd HH:mm:ss') + ' ] ';
		}

		function refresh() {

			var reload = false;
			LIVERELOADCHANGE = '';

			Object.keys(files).wait(function(filename, next) {

				F.Fs.stat(filename, function(err, stat) {
					var stamp = makestamp();
					if (err) {
						delete files[filename];
						var tmp = isViewPublic(filename);
						LIVERELOADCHANGE = normalize(filename.replace(directory, ''));
						var log = stamp.replace('#', 'REM') + prefix + LIVERELOADCHANGE;
						if (tmp) {
							if (isbundle) {
								F.Fs.unlinkSync(F.Path.join(SRC, tmp));
								console.log(log);
							}
							reload = true;
						} else {
							changes.push(log);
							force = true;
						}
					} else {

						var ticks = stat.mtime.getTime();
						if (files[filename] != null && files[filename] !== ticks) {

							if (filename.endsWith('.bundle') && files[filename.replace(/\.bundle$/, '.url')]) {
								// Bundle from URL address
								files[filename] = ticks;
								reload = true;
								next();
								return;
							}

							if (options.threads && filename.substring(directory.length).indexOf('/threads/') !== -1 && files[filename]) {
								files[filename] = ticks;
								next();
								return;
							}

							LIVERELOADCHANGE = normalize(filename.replace(directory, ''));

							var log = stamp.replace('#', files[filename] === 0 ? 'ADD' : 'UPD') + prefix + LIVERELOADCHANGE;
							if (files[filename]) {
								var tmp = isViewPublic(filename);
								if (tmp) {
									var skip = true;
									if (isbundle) {
										if (filename.lastIndexOf('--') === -1)
											copyFile(filename, F.Path.join(SRC, tmp));
										else
											skip = false;
									}
									if (skip) {
										files[filename] = ticks;
										reload = true;
										next();
										return;
									}
								}
							}

							changes.push(log);
							force = true;
						}
						files[filename] = ticks;
					}

					next();
				});
			}, function() {

				isloaded = true;

				if (status !== 1 || !force) {

					// Due to bundes/*.url
					if (status === 2) {
						status = 1;
						force = false;
						changes.length = 0;
					}

					reload && livereload(LIVERELOADCHANGE);
					if (counter % 150 === 0)
						speed = isRELOAD ? 3000 : 6000;
					setTimeout(refresh_directory, speed);
					return;
				}

				restart();
				counter = 0;
				speed = SPEED;
				setTimeout(refresh_directory, speed);

				var length = changes.length;
				for (var i = 0; i < length; i++)
					console.log(changes[i]);

				changes.length = 0;
				force = false;
			}, 3);
		}

		function refresh_directory() {
			counter++;
			F.TUtils.ls(directories, onComplete, onFilter);
		}

		function restart() {

			if (Meta.callback) {
				if (first)
					first = false;
				else
					Meta.callback(changes);
				return;
			}

			if (app !== null) {
				try
				{
					skiprestart = true;
					process.kill(app.pid);
					if (options.inspector) {
						setTimeout(restart, 1000);
						return;
					}
				} catch (err) {}
				app = null;
			}

			var arr = ARGV.slice(2);
			var port = arr.pop();

			if (process.execArgv.indexOf('--debug') !== -1 || options.debugger) {
				var key = '--debug=' + (options.debugger || 40894);
				process.execArgv.indexOf(key) === -1 && process.execArgv.push(key);
			}

			if (process.execArgv.indexOf('--inspect') !== -1 || options.inspector) {
				var key = '--inspect=' + (options.inspector || 9229);
				process.execArgv.indexOf(key) === -1 && process.execArgv.push(key);
			}

			if (first)
				first = false;
			else
				arr.push('--restart');

			port && arr.push(port);
			app = fork(F.Path.join(root, FILENAME), arr);

			app.on('message', function(msg) {
				switch (msg) {
					case 'total:eaddrinuse':
						process.exit(1);
						break;
					case 'total:restart':
						console.log(makestamp().replace('#', 'RES'));
						restart();
						break;
					case 'total:ready':
						if (status === 0)
							app.send('total:debug');
						status = 2;
						livereload(LIVERELOADCHANGE);
						break;
				}
			});

			app.on('exit', function() {

				// checks unexpected exit
				if (skiprestart === false) {
					app = null;
					process.exit(1);
					return;
				}

				skiprestart = false;
				if (status === 255)
					app = null;
			});

			F.emit('$watcher', app);
		}

		process.on('SIGTERM', end);
		process.on('SIGINT', end);
		process.on('exit', end);

		function end() {

			if (process.isending)
				return;

			process.isending = true;
			F.Fs.unlink(pid, noop);

			if (app === null) {
				process.exit(0);
				return;
			}

			skiprestart = true;
			process.kill(app.pid);
			app = null;
			process.exit(0);
		}

		function noop() {}

		if (process.pid > 0) {

			!Meta.callback && console.log(prefix.substring(8) + 'DEBUG PID: ' + process.pid + ' (v' + VERSION + ')');

			pid = F.Path.join(directory, PIDNAME);
			F.Fs.writeFileSync(pid, process.pid + '');

			setInterval(function() {
				F.Fs.stat(pid, function(err) {
					if (err) {
						F.Fs.unlink(pid, noop);
						if (app !== null) {
							skiprestart = true;
							process.kill(app.pid);
						}
						process.exit(0);
					}
				});
			}, 4000);
		}

		restart();
		refresh_directory();
	}

	var filename = F.Path.join(process.cwd(), PIDNAME);
	if (F.Fs.existsSync(filename)) {
		F.Fs.unlinkSync(filename);
		setTimeout(app, 3500);
	} else
		app();
}

function normalize(path) {
	return F.isWindows ? path.replace(/\\/g, '/') : path;
}

function init() {

	if (options.cluster) {
		options.count = options.cluster;
		F.TCluster.http(options);
		return;
	}

	process.on('uncaughtException', e => e.toString().indexOf('ESRCH') == -1 && console.log(e));
	process.title = 'total: debug';

	if (Meta.isWatcher) {
		if (options.edit) {
			require('./edit').init(options.edit.replace(/^http/, 'ws'));
			setTimeout(runwatching, 1000);
		} else
			setImmediate(runwatching);
	} else
		setImmediate(runapp);
}

Meta.delay = setTimeout(init, 100);