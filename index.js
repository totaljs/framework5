'use strict';

const NODE_MODULES = { buffer: 1, child_process: 1, process: 1, fs: 1, events: 1, http: 1, https: 1, http2: 1, util: 1, net: 1, os: 1, path: 1, punycode: 1, readline: 1, repl: 1, stream: 1, string_decoder: 1, tls: 1, trace_events: 1, tty: 1, dgram: 1, url: 1, v8: 1, vm: 1, wasi: 1, worker_threads: 1, zlib: 1, crypto: 1, dns: 1 };
const EMPTYOBJECT = {};
const EMPTYARRAY = [];

const REG_SKIPERRORS = /epipe|invalid\sdistance/i;
const REG_HTTPHTTPS = /^(http|https):\/\//i;

Object.freeze(EMPTYOBJECT);
Object.freeze(EMPTYARRAY);

// Globals
global.DEBUG = true;
global.F = {};
global.CONF = {};
global.REPO = {};
global.MAIN = {};
global.TEMP = {};
global.FUNC = {};
global.PERF = {};
// global.EMPTYBUFFER = Buffer.alloc(0);
global.EMPTYOBJECT = EMPTYOBJECT;
global.EMPTYARRAY = EMPTYARRAY;
global.NOW = new Date();
global.DEF = {};

(function(F) {

	F.id = '';
	F.bundling = true;
	F.is5 = F.version = 5000;
	F.version_header = '5';
	F.version_node = process.version + '';

	F.resources = {};      // Loaded resources
	F.connections = {};    // WebSocket connections
	F.schedules = {};      // Registered schedulers
	F.modules = {};
	F.plugins = {};
	F.processing = {};
	F.config = CONF;
	F.def = DEF;
	F.errors = [];
	F.paused = [];
	F.crons = [];

	F.internal = {
		ticks: 0,
		counter: 0,
		uid: 1,
		timeouts: null // setInterval identifier
	};

	F.routes = {
		fallback: {},
		virtual: {},
		routes: [],
		routescache: {},
		websockets: [],
		websocketscache: {},
		files: [],
		filescache: {},
		timeout: null,
		middleware: {},
		proxies: []
	};

	// Internal cache
	F.temporary = {
		path: {},
		shortcache: {},
		notfound: {},
		processing: {},
		views: {},
		viewscache: [],
		versions: {},
		dependencies: {}, // temporary for module dependencies
		other: {},
		keys: {}, // for crypto keys
		internal: {}, // controllers/modules names for the routing
		ready: {},
		ddos: {},
		service: { redirect: 0, request: 0, file: 0, usage: 0 },
		pending: [],
		tmp: {},
		merged: {},
		minified: {},
		tmsblocked: {},
		dnscache: {},
		blocked: {},
		calls: {},
		utils: {},
		datetime: {} // date time formatters
	};

	// Internal stats
	F.stats = {

		compilation: 0,
		error: 0,

		performance: {
			publish: 0,
			subscribe: 0,
			calls: 0,
			download: 0,
			upload: 0,
			request: 0,
			message: 0,
			file: 0,
			open: 0,
			online: 0,
			usage: 0,
			mail: 0,
			dbrm: 0,
			dbwm: 0,
			external: 0
		},

		other: {
			websocketping: 0,
			websocketcleaner: 0,
			obsolete: 0,
			mail: 0
		},

		request: {
			request: 0,
			external: 0,
			pending: 0,
			web: 0,
			xhr: 0,
			file: 0,
			websocket: 0,
			get: 0,
			options: 0,
			head: 0,
			post: 0,
			put: 0,
			patch: 0,
			upload: 0,
			schema: 0,
			operation: 0,
			blocked: 0,
			'delete': 0,
			mobile: 0,
			desktop: 0,
			size: 0
		},
		response: {
			ddos: 0,
			html: 0,
			json: 0,
			websocket: 0,
			timeout: 0,
			custom: 0,
			binary: 0,
			pipe: 0,
			file: 0,
			image: 0,
			destroy: 0,
			stream: 0,
			streaming: 0,
			text: 0,
			empty: 0,
			redirect: 0,
			forward: 0,
			proxy: 0,
			notmodified: 0,
			sse: 0,
			errorbuilder: 0,
			error400: 0,
			error401: 0,
			error403: 0,
			error404: 0,
			error409: 0,
			error431: 0,
			error500: 0,
			error501: 0,
			error503: 0,
			size: 0
		}
	};

	F.path = {};
	F.path.root = path => F.Path.join(F.directory, path || '');
	F.path.public = path => F.Path.join(F.directory, 'public', path || '');
	F.path.databases = path => F.Path.join(F.directory, 'databases', path || '');
	F.path.views = path => F.Path.join(F.directory, 'views', path || '');
	F.path.flowstreams = path => F.Path.join(F.directory, 'flowstreams', path || '');
	F.path.plugins = path => F.Path.join(F.directory, 'plugins', path || '');
	F.path.private = path => F.Path.join(F.directory, 'private', path || '');

	F.path.route = function(path, directory = 'root') {

		// Absolute
		if (path[0] === '~')
			return path.substring(1);

		// Plugins
		if (path[0] === '_') {
			let tmp = path.substring(1);
			let index = tmp.indexOf('/', 1);
			return F.path.plugins(tmp.substring(0, index) + (directory === 'root' ? '' : ('/' + directory)) + '/' + tmp.substring(index + 2));
		}

		return F.path[directory](path);
	};

	F.path.tmp = F.path.temp = function(path) {
		if (!F.temporary.path.directory_tmp)
			F.path.verify('tmp');
		return F.Path.join(F.directory, 'tmp', path || '');
	};

	F.path.unlink = unlink;
	F.path.rmdir = rmdir;
	F.path.verify = function(name) {

		var key = 'directory_' + name;
		if (F.temporary.path[key])
			return;

		var dir = F.path.root(name);
		try {
			if (!pathexists(dir))
				F.Fs.mkdirSync(dir);
		} catch(e) {}
		F.temporary.path[key] = true;
	};

	F.path.mkdir = function(p, cache) {

		var key = '$directory_' + p;

		if (cache && F.temporary.path[key])
			return;

		F.temporary.path[key] = true;

		var is = F.isWindows;
		var s = '';

		if (p[0] === '/') {
			s = is ? '\\' : '/';
			p = p.substring(1);
		}

		var l = p.length - 1;
		var beg = 0;

		if (is) {
			if (p[l] === '\\')
				p = p.substring(0, l);

			if (p[1] === ':')
				beg = 1;

		} else {
			if (p[l] === '/')
				p = p.substring(0, l);
		}

		if (pathexists(p))
			return;

		var arr = is ? p.replace(/\//g, '\\').split('\\') : p.split('/');
		var directory = s;

		for (let i = 0; i < arr.length; i++) {
			let name = arr[i];
			if (is)
				directory += (i && directory ? '\\' : '') + name;
			else
				directory += (i && directory ? '/' : '') + name;

			if (i >= beg && !pathexists(directory))
				F.Fs.mkdirSync(directory);
		}
	};

})(global.F);

function pathexists(filename, isfile) {
	try {
		var val = F.Fs.statSync(filename);
		return val ? (isfile ? val.isFile() : true) : false;
	} catch (e) {
		return false;
	}
}

function rmdir(arr, callback) {

	if (typeof(arr) === 'string')
		arr = [arr];

	if (!arr.length) {
		callback && callback();
		return;
	}

	var path = arr.shift();
	if (path) {
		F.TUtils.ls(path, function(files, directories) {
			directories.reverse();
			directories.push(path);
			files.wait((item, next) => F.Fs.unlink(item, next), function() {
				directories.wait((item, next) => F.Fs.rmdir(item, next), () => rmdir(arr, callback));
			});
		});
	} else if (callback)
		callback();
}

function unlink(arr, callback) {

	if (typeof(arr) === 'string')
		arr = [arr];

	if (!arr.length) {
		callback && callback();
		return;
	}

	var filename = arr.shift();
	if (filename)
		F.Fs.unlink(filename, () => unlink(arr, callback));
	else if (callback)
		callback();
}

(function(CONF) {

	CONF.nowarnings = process.argv.indexOf('--restart') !== -1;
	CONF.nosourcemap = false;
	CONF.name = 'Total.js';
	CONF.version = '1.0.0';
	CONF.author = '';
	CONF.secret = F.syshash;
	CONF.secret_encryption = null,
	CONF.secret_csrf = null,
	CONF.secret_tms = null,
	CONF.node_modules = 'node_modules',

	// New internal configuration
	CONF.$cors = '';
	CONF.$root = '';
	CONF.$httpreqlimit = 0; // request limit per ip
	CONF.$httpcompress = true;
	CONF.$httpetag = '';
	CONF.$httpmaxsize = 256; // 256 kB
	CONF.$httprangebuffer = 5120; // 5 MB
	CONF.$httptimeout = 5; // 5 seconds
	CONF.$httpfiles = { flac: true, jpg: true, jpeg: true, png: true, gif: true, ico: true, wasm: true, js: true, mjs: true, css: true, txt: true, xml: true, woff: true, woff2: true, otf: true, ttf: true, eot: true, svg: true, zip: true, rar: true, pdf: true, docx: true, xlsx: true, doc: true, xls: true, html: true, htm: true, appcache: true, manifest: true, map: true, ogv: true, ogg: true, mp4: true, mp3: true, webp: true, webm: true, swf: true, package: true, json: true, ui: true, md: true, m4v: true, jsx: true, heif: true, heic: true, ics: true, ts: true, m3u8: true, wav: true };
	CONF.$httpchecktypes = true; // for multipart data only
	CONF.$blacklist = '';
	CONF.$xpoweredby = 'Total.js';
	CONF.$minifyjs = true;
	CONF.$minifycss = true;
	CONF.$minifyhtml = true;
	CONF.$localize = true;
	CONF.$port = 8000;
	CONF.$ip = '0.0.0.0';
	CONF.$unixsocket = '';
	CONF.$timezone = 'utc';
	CONF.$insecure = false;
	CONF.$performance = false;
	CONF.$filtererrors = true;
	CONF.$cleartemp = true;
	CONF.$customtitles = false;
	CONF.$version = '';
	CONF.$intervalclearcache = 10;

	CONF.$nodemodules = require.resolve('./index');
	CONF.$nodemodules = CONF.$nodemodules.substring(0, CONF.$nodemodules.length - (8 + 7));
	CONF.$npmcache = '/var/www/.npm';
	CONF.$python = 'python3';
	CONF.$wsmaxsize = 256; // 256 kB
	CONF.$wscompress = true;
	CONF.$wsencodedecode = false;
	CONF.$wsmaxlatency = 2000;
	CONF.$proxytimeout = 5; // 5 seconds

	process.env.TZ = CONF.$timezone;

})(global.CONF);

(function(DEF) {

	DEF.onView = function(name, html) {
		return html;
	};

	DEF.onError = function(err, name, url) {

		NOW = new Date();

		if (!name && err.name)
			name = err.name;

		err = err.toString();
		console.log('ERROR ======= ' + (NOW.format('yyyy-MM-dd HH:mm:ss')) + ': ' + (name ? name + ' ---> ' : '') + err + (url ? (' (' + url + ')') : ''), err.stack ? err.stack : '');

		var obj = { error: err, name: name, url: url, date: NOW };

		if (F.errors.push(obj) > 5)
			F.errors.shift();

		EMIT('error', obj);
		F.stats.error++;
	};

	DEF.helpers = {};
	DEF.currencies = {};

	DEF.parsers = {};
	DEF.parsers.json = value => value.parseJSON(true);
	DEF.parsers.urlencoded = value => value.parseEncoded();

	// Unused
	DEF.parsers.xml = value => value.parseXML(true);

})(global.DEF);

F.loadconfig = function(value) {

	var cfg = F.TUtils.parseconfig(value);

	for (let key in cfg) {

		let val = cfg[key];
		let tmp;

		switch (key) {
			case '$tms':
				break;
			case 'mail_from':
			case 'mail_options':
			case 'mail_smtp':
				break;
			case '$crypto_iv':
				break;
			case '$root':
				break;
			case '$port':
				cfg[key] = +val;
				break;
			case '$timezone':
				process.env.TZ = val;
				break;
			case '$httpfiles':
				tmp = val.split(',').trim();
				for (var m of tmp)
					F.config.$httpfiles[m] = true;
				continue;
		}

		F.config[key] = cfg[key];
	}

	if (!F.config.$secret_uid)
		F.config.$secret_uid = (F.config.name).crc32(true) + '';

	// CMD('refresh_tms');

	if (F.config.$performance)
		F.Http.globalAgent.maxSockets = 9999;

	if (!F.config.$httpetag)
		F.config.$httpetag = F.config.version.replace(/\.|\s/g, '');

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = F.config.$insecure ? '0' : '1';
	F.logger(F.config.$logger == true);
};

F.loadresource = function(name, value) {

	var lines = value.split('\n');
	var response = {};

	for (let line of lines) {

		if (!line || line[0] === '#' || line.substring(0, 2) === '//')
			continue;

		let index = line.indexOf(':');
		if (index === -1) {
			index = line.indexOf('\t:');
			if (index === -1)
				continue;
		}

		response[line.substring(0, index).trim()] = line.substring(index + 2).trim();
	}

	F.resources[name] = response;
};

F.loadenv = function(value) {
	var obj = value.parseEnv();
	for (var key in obj) {
		if (!process.env.hasOwnProperty(key))
			process.env[key] = obj[key];
	}
};

F.translate = function(language, value) {

	var index = -1;

	while (true) {

		index = value.indexOf('@(', index);

		if (index === -1)
			break;

		var counter = 0;
		for (let i = index + 2; i < value.length; i++) {

			var c = value[i];

			if (c == '(') {
				counter++;
			} else if (c === ')') {

				if (counter) {
					counter--;
					continue;
				}

				var text = value.substring(index, i + 1);
				var translate = text.substring(2, text.length - 1);
				var translated = F.resource(language, 'T' + translate.hash(true).toString(36));
				value = value.replaceAll(text, translated || translate);
				index += translated.length - 2;
				break;
			}
		}
	}

	return value;
};

F.resource = function(language, key) {
	var dict = F.resources[language];
	if (dict && dict[key])
		return dict[key];
	return language === 'default' ? '' : F.resource('default', key);
};

F.auth = function(fn) {
	DEF.onAuthorize = fn;
};

F.load = async function(types = [], callback) {

	var beg = Date.now();

	F.bundling = true;

	await F.clear(true);

	if (typeof(types) === 'string')
		types = types.split(',').trim();

	var list = async (path, extension) => new Promise(resolve => F.TUtils.ls(path, files => resolve(files), (isdir, path) => isdir ? true : path.indexOf('-bk') === -1 && path.indexOf('_bk') === -1 && F.TUtils.getExtension(path) === (extension || 'js')));
	var read = async (path) => new Promise(resolve => F.Fs.readFile(path, 'utf8', (err, response) => resolve(response ? response : '')));

	var update = function(type, arr) {
		for (let i = 0; i < arr.length; i++) {
			let id = '';
			if (type === 'modules')
				id = F.TUtils.getName(arr[i]).replace(/\.js$/, '');
			arr[i] = { id: id, type: type, filename: arr[i] };
		}
		return arr;
	};

	if (!types.length || types.includes('env')) {
		var env = await read(F.path.root('.env'));
		env && F.loadenv(env);
	}

	if (!types.length || types.includes('config')) {
		var config = await read(F.path.root('config'));
		config && F.loadconfig(config);
	}

	if (!types.length || types.includes('resources')) {
		var resources = await list(F.path.root('resources'), 'resource');
		for (let resource of resources)
			F.loadresource(F.TUtils.getName(resource).replace(/\.resource$/i, ''), await read(resource));
	}

	let loader = ['modules', 'controllers', 'actions', 'schemas', 'models', 'definitions', 'sources', 'flowstreams', 'middleware'];
	var files = [];
	var tmp;

	for (let type of loader) {
		if (!types.length || types.includes(type)) {
			tmp = await list(F.path.root(type), type === 'flowstreams' ? 'flow' : 'js');
			if (tmp.length)
				files.push.apply(files, update(type, tmp));
		}
	}

	if (!types.length || types.includes('plugins')) {
		var plugins = async () => new Promise(resolve => F.Fs.readdir(F.path.plugins(), (err, response) => resolve(response || [])));
		tmp = await plugins();

		for (let plugin of tmp) {

			if (plugin.indexOf('-bk') !== -1 || plugin.indexOf('_bk') !== -1)
				continue;

			files.push({ id: F.TUtils.getName(plugin).replace(/\.js$/, ''), type: 'plugins', filename: F.path.root('plugins/' + plugin + '/index.js') });

			let loader = ['controllers', 'actions', 'schemas', 'models', 'definitions', 'sources', 'flowstreams', 'middleware'];
			for (let type of loader) {
				tmp = await list(F.path.root('plugins/' + plugin + '/' + type), type === 'flowstreams' ? 'flow' : 'js');
				if (tmp.length)
					files.push.apply(files, update(type, tmp));
			}
		}
	}

	files.sort(function(a) {

		if (a.type === 'middleware')
			return 1;

		if (a.type === 'middleware')
			return -1;

		return 0;
	});

	for (let file of files) {

		let tmp = null;

		switch (file.type) {
			case 'modules':
				tmp = require(file.filename);

				if (!tmp.id)
					tmp.id = file.id;

				if (tmp.id)
					F.modules[tmp.id] = tmp;

				tmp.install && tmp.install();
				break;

			case 'plugins':
				tmp = require(file.filename);
				F.plugins[file.id] = tmp;
				tmp.install && tmp.install();
				break;

			case 'controllers':
			case 'schemas':
			case 'actions':
			case 'models':
			case 'definitions':
			case 'middleware':
				tmp = require(file.filename);
				tmp.install && tmp.install();
				break;

			case 'flowstreams':
				// @TODO: missing FlowStream implementation
				break;

		}

	}

	F.loadservices();
	F.stats.compilation = Date.now() - beg;
	F.isloaded = true;
	callback && callback();

};

F.require = function(name) {
	if (name.startsWith('node:'))
		return require(name);
	return NODE_MODULES[name] ? require('node:' + name) : require(F.Path.join(F.directory, name));
};

F.import = function(url, callback) {

	if (callback == null)
		return new Promise((resolve, reject) => F.import(url, (err, response) => err ? reject(err) : resolve(response)));

	var filename = F.path.tmp((F.id ? (F.id + '_') : '') + url.makeid() + '.js');

	if (F.temporary.dependencies[url]) {
		callback && callback(null, require(filename));
		return;
	}

	F.download(url, filename, function(err, response) {
		var m;
		if (!err) {
			m = require(filename);
			F.temporary.dependencies[url] = 1;
		}
		callback && callback(err, m, response);
	});
};

F.download = function(url, filename, callback, timeout) {

	if (!callback)
		return new Promise((resolve, reject) => F.download(url, filename, (err, response) => err ? reject(err) : resolve(response), timeout));

	var opt = {};

	if (typeof(url) === 'object')
		opt.unixsocket = url;
	else
		opt.url = framework_internal.preparepath(url);

	opt.custom = true;
	opt.resolve = true;
	opt.timeout = timeout;
	opt.callback = function(err, response) {

		if (response)
			response.filename = filename;

		if (err) {
			callback && callback(err, response);
			callback = null;
			return;
		}

		var stream = F.Fs.createWriteStream(filename);

		var done = function(err) {
			if (callback) {
				callback(err, response);
				callback = null;
			}
		};

		response.stream.pipe(stream);
		response.stream.on('error', done);
		stream.on('error', done);
		F.cleanup(stream, done);
	};

	REQUEST(opt);
};

F.cleanup = function(stream, callback) {

	if (!callback)
		return new Promise(resolve => F.cleanup(stream, resolve));

	F.TUtils.onfinished(stream, function() {
		F.TUtils.destroystream(stream);
		if (callback) {
			callback();
			callback = null;
		}
	});
};

F.python = function(filename, callback) {
	if (!callback)
		return new Promise((resolve, reject) => F.python(filename, (err, response) => err ? reject(err) : response));
	F.Child.exec(F.config.$python + ' ' + filename, { cwd: F.Path.dirname(filename) }, callback);
};

F.pipinstall = function(name, callback) {

	if (!callback)
		return new Promise((resolve, reject) => F.npminstall(name, err => err ? reject(err) : resolve()));

	var args = {};
	args.cwd = F.directory;
	F.Child.exec(F.config.$python + ' -m pip install ' + name, args, function(err, response, output) {
		callback && callback(err ? (output || err) : null, null);
	});

};

F.npminstall = function(name, callback) {

	if (!callback)
		return new Promise((resolve, reject) => F.npminstall(name, err => err ? reject(err) : resolve()));

	var path = F.config.$node_modules;
	F.path.mkdir(path, true);

	var index = name.lastIndexOf('@');
	var folder = index === -1 ? name : name.substring(0, index);

	F.Fs.readFile(F.path.join(path, folder, 'package.json'), 'utf8', function(err, response) {

		var is = false;

		if (response) {
			response = response.parseJSON();
			is = response && (index === -1 || response.version === name.substring(index + 1));
		}

		if (is) {
			callback && callback();
		} else {

			var args = {};

			if (process.getuid && process.getuid() === 33)
				args.env = { NPM_CONFIG_CACHE: F.config.$npmcache };

			args.cwd = path;

			F.Child.exec('npm install ' + name, args, function(err, response, output) {
				callback && callback(err ? (output || err) : null);
			});
		}
	});

};

F.shell = function(cmd, callback, cwd) {

	var args = {};

	if (typeof(callback) === 'string') {
		cwd = callback;
		callback = null;
	}

	args.cwd = cwd || F.directory;

	if (CONF.$shell)
		args.shell = CONF.$shell;

	if (callback)
		F.Child.exec(cmd, args, callback);
	else
		return new Promise((resolve, reject) => F.Child.exec(cmd, args, (err, response) => err ? reject(err) : resolve(response)));
};

F.console = function() {

	var memory = process.memoryUsage();

	print('====================================================');
	print('PID           : ' + process.pid);
	print('Node.js       : ' + process.version);
	print('Total.js      : v' + F.version);
	print('OS            : ' + F.Os.platform() + ' ' + F.Os.release());
	print('Memory        : ' + memory.heapUsed.filesize(2) + ' / ' + memory.heapTotal.filesize(2));
	print('User          : ' + F.Os.userInfo().username);
	print('====================================================');
	print('Name          : ' + F.config.name);
	print('Version       : ' + F.config.version);
	F.config.author && print('Author        : ' + F.config.author);
	print('Date (UTC)    : ' + NOW.format('yyyy-MM-dd HH:mm:ss'));
	print('Mode          : ' + (DEBUG ? 'debug' : 'release'));
	print('Compilation   : ' + F.stats.compilation + ' ms');
	// F.threads && print('Threads       : ' + Object.keys(F.threads).join(', '));
	// global.THREAD && print('Thread        : ' + global.THREAD);
	print('====================================================');
	F.config.$root && print('Root          : ' + F.config.$root);
	print('Directory     : ' + process.cwd());
	print('node_modules  : ' + F.config.$node_modules);
	print('====================================================\n');

	if (!F.isWorker) {

		var hostname = F.config.$unixsocket ? ('Socket: ' + F.config.$unixsocket) : '{2}://{0}:{1}/'.format(F.config.$ip, F.config.$port, F.isHTTPS ? 'https' : 'http');

		if (!F.unixsocket && F.ip === '0.0.0.0') {
			var ni = F.Os.networkInterfaces();
			if (ni.en0) {
				for (var i = 0; i < ni.en0.length; i++) {
					var nii = ni.en0[i];
					// nii.family === 'IPv6' ||
					if (nii.family === 'IPv4') {
						hostname += '\n{2}://{0}:{1}/'.format(nii.address, F.port, F.isHTTPS ? 'https' : 'http');
						break;
					}
				}
			}
		}

		print(hostname);
		print('');
	}
};

F.loadservices = function() {

	F.internal.timeouts && clearInterval(F.internal.timeouts);

	// This timer solving timeouts
	F.internal.timeouts = setInterval(function() {

		F.internal.ticks++;

		if (F.internal.ticks % 2 === 0)
			global.NOW = new Date();

		// 1 minute
		if (F.internal.ticks == 12) {
			F.internal.ticks = 0;
			F.internal.counter++;
			F.emit('service', F.internal.counter);
		}

		if (F.internal.ticks == 6 || F.internal.ticks == 12)
			F.TWebSocket.ping();

		if (!F.temporary.pending.length) {
			F.stats.request.pending = 0;
			return;
		}

		let index = 0;

		while (true) {
			let ctrl = F.temporary.pending[index];
			if (ctrl) {
				if (ctrl.destroyed) {
					F.temporary.pending.splice(index, 1);
				} else if (ctrl.timeout <= 0) {
					ctrl.fallback(408);
					F.temporary.pending.splice(index, 1);
				} else {
					F.stats.request.pending++;
					ctrl.timeout -= 5; // 5 seconds
					index++;
				}
			} else
				break;
		}

		F.stats.request.pending = F.temporary.pending.length;

	}, 5000);

};

F.http = function(opt) {

	if (!opt)
		opt = {};

	F.load([], function() {

		F.server = F.Http.createServer(F.THttp.listen);
		F.server.on('upgrade', F.TWebSocket.listen);
		F.server.listen(opt.port || F.config.$port, opt.ip || F.config.$ip);

		CONF.$performance && F.server.on('connection', httptuningperformance);

		if (!process.connected && F.console)
			F.console();

	});
};

F.logger = function(enable) {

	if (enable == null)
		enable = true;

	if (enable) {

		if (console.$backup)
			return;

	} else {

		if (!console.$backup)
			return;

		console.log = console.$backup.log;
		console.warn = console.$backup.warn;
		console.error = console.$backup.error;
		console.time = console.$backup.time;
		console.timeEnd = console.$backup.timeEnd;
		console.$backup = null;
		return;
	}

	var Console = require('node:console').Console;

	var path = F.path.root();

	if (path.substring(path.length - 5, path.length - 1) === '.src')
		path = F.Path.join(path.substring(0, path.length - 5), 'logs/');
	else
		path = F.Path.join(path, 'logs/');

	PATH.mkdir(path);

	var output = F.Fs.createWriteStream(F.Path.join(path, 'debug.log'), { flags: 'a' });
	var logger = new Console({ stdout: output, stderr: output });

	console.$backup = {};
	console.$backup.log = console.log;
	console.$backup.warn = console.warn;
	console.$backup.error = console.error;
	console.$backup.time = console.time;
	console.$backup.timeEnd = console.timeEnd;

	console.log = function() {
		logger.log.apply(logger, arguments);
	};

	console.warn = function() {
		logger.warn.apply(logger, arguments);
	};

	console.error = function() {
		logger.error.apply(logger, arguments);
	};

	console.time = function() {
		logger.time.apply(logger, arguments);
	};

	console.timeEnd = function() {
		logger.timeEnd.apply(logger, arguments);
	};
};


F.componentator = function(name, components, removeprev) {

	var meta = {};

	meta.components = components;
	meta.name = name;

	F.$events.componentator && F.emit('componentator', meta);

	var url = 'https://componentator.com/download.js?id=' + meta.components;
	var nameid = meta.name.slug();
	var relative = 'ui-' + (removeprev ? (nameid + '-') : '') + url.makeid() + '.min.js';
	var filename = F.path.public(relative);

	F.repo[meta.name] = '/' + relative;

	if (removeprev) {
		F.Fs.readdir(F.path.public(), function(err, files) {

			var rem = [];
			for (var m of files) {
				if (m !== relative && m.indexOf('ui-' + nameid + '-') !== -1)
					rem.push(F.path.public(m));
			}

			if (rem.length)
				F.path.unlink(rem);

		});
	}

	F.Fs.lstat(filename, function(err) {
		if (err)
			F.download(url, filename, F.error('COMPONENTATOR'));
	});

};

F.error = function(err, name, uri) {

	if (!arguments.length)
		return F.errorcallback;

	if (err)
		F.def.onError(err, name, uri);
};

F.errorcallback = function(err) {
	err && F.error(err);
};

F.merge = function(url) {

	var arr = [];

	for (let i = 1; i < arguments.length; i++) {
		let links = arguments[i];

		if (typeof(links) === 'string') {
			let tmp = links.split('+').trim();
			for (let link of tmp) {

				if (REG_HTTPHTTPS.test(link)) {
					arr.push(link);
					continue;
				}

				if (link[0] !== '~' && link[0] !== '_') {
					let ext = F.TUtils.getExtension(link);
					if (ext === 'js')
						link = F.path.public('/js/' + link);
					else
						link = F.path.public('/css/' + link);
					arr.push(link);
				} else
					arr.push(F.path.route(link, 'public'));
			}
			continue;
		}

		if (!(links instanceof Array))
			links = [links];
		for (let link of links)
			arr.push(link);
	}

	if (url[0] !== '/')
		url = '/' + url;

	url = url.toLowerCase();

	var ext = F.TUtils.getExtension(url);
	var key = url.substring(1).replace(/\//g, '-').replace(/\.(js|html|css)$/, '') + '-min.' + ext;
	var filename = F.path.tmp(F.id + 'merged_' + key);

	F.routes.virtual[url] = async function(ctrl) {
		if (DEBUG) {
			var buffer = await F.TMinificators.merge(true, arr);
			ctrl.binary(buffer, F.TUtils.contentTypes[ext] || F.TUtils.contentTypes.bin);
		} else {
			F.lock('merging_' + key, async function(next) {
				if (F.temporary.merged[key]) {
					if (F.temporary.notfound[url]) {
						ctrl.fallback(404);
						return;
					}
				} else {
					if (F.temporary.notfound[url])
						delete F.temporary.notfound[url];
					F.temporary.merged[key] = true;
					await F.TMinificators.merge(filename, arr);
				}
				ctrl.response.minify = false;
				ctrl.file(filename);
				next();
			});
		}
	};

	return url;
};

F.lock = function(key, callback) {
	if (F.processing[key]) {
		F.processing[key].push(callback);
	} else {
		F.processing[key] = [];
		callback(function() {
			var pending = F.processing[key];
			delete F.processing[key];
			for (let fn of pending)
				fn(F.TUtils.noop);
		});
	}
};

F.touch = function(url) {
	if (url) {
		delete F.temporary.minified[url];
		delete F.temporary.tmp[url];
		delete F.temporary.notfound[url];
	} else {
		F.temporary.minified = {};
		F.temporary.tmp = {};
		F.temporary.notfound = {};
	}
};

F.middleware = function(name, fn, assign) {

	if (fn == null) {
		delete F.routes.middleware[name];
		return;
	}

	F.routes.middleware[name] = fn;

	if (assign) {

		if (typeof(assign) === 'string')
			assign = assign.split(',').trim();

		var routes = ['routes', 'files', 'websockets'];

		for (let a of assign) {

			if (a === '*') {
				for (let type of routes) {
					for (let route of F.routes[type]) {
						if (!route.middleware.includes(name))
							route.middleware.push(name);
					}
				}
			} else {
				if (a === 'websocket' || a === 'file' || a === 'route')
					a += 's';
				let routes = F.routes[a];
				if (routes) {
					for (let route of routes) {
						if (!route.middleware.includes(name))
							route.middleware.push(name);
					}
				}
			}
		}
	}
};

F.pause = function(name, enable) {

	var index;

	if (enable !== undefined) {
		if (enable) {
			if (!F.paused.includes(name))
				F.paused.push(name);
		} else {
			index = F.paused.indexOf(name);
			if (index !== -1)
				F.paused.splice(index, 1);
		}
		return enable;
	}

	index = F.paused.indexOf(name);

	if (index != -1) {
		F.paused.splice(index, 1);
		enable = false;
	} else {
		F.paused.push(name);
		enable = true;
	}

	return enable === true;
};

F.uid = function() {
	let ts = Date.now() / 100;
	let h = F.TUtils.convert62(ts);
	let index = F.internal.uid++;
	return h + F.TUtils.convert62(index + 99) + F.internal.uidc + h.length + (index % 2 ? 1 : 0) + 'f'; // "f" version
};

F.cron = function(line, fn) {
	let obj = {};
	obj.check = F.TCron.make(line);
	obj.exec = fn;
	obj.remove = function() {
		let index = F.crons.indexOf(this);
		if (index !== -1)
			F.crons.splice(index, 0);
	};
	F.crons.push(obj);
	return obj;
};

// Service
F.service = function(count) {

	// clears short cahce temporary cache
	// F.temporary.shortcache = {};

	// clears temporary memory for non-exist files
	F.temporary.notfound = {};
	F.internal.uid = 1;
	F.internal.uidc = F.TUtils.random_text(1);

	if (F.config.$httpreqlimit)
		F.temporary.ddos = {};

	if (count % F.config.$intervalclearcache === 0) {
		F.temporary.path = {};
		F.temporary.views = {};
		F.temporary.utils = {};
		F.temporary.calls = {};
	}

	if (count % 5 === 0) {
		global.TEMP = {};
	}

	// Update expires date
	if (count % 60 === 0) {
		F.config.$httpexpire = NOW.add('y', 1).toUTCString();
		F.TImage.clear();
	}

	if (count % 1440 === 0)
		F.temporary.tmsblocked = {};

	if (count % 30 === 0) {
		// @TODO: clear DNS
	}

	let blocked = F.temporary.blocked;
	if (blocked.is) {
		blocked.is = false;
		for (let key in blocked) {
			if (key !== 'is') {
				let tmp = blocked[key];
				if (tmp.expire < NOW)
					delete blocked[key];
				else
					blocked.is = true;
			}
		}
	}

	// Exec crons
	for (let cron of F.crons) {
		if (cron.check(NOW))
			cron.exec(NOW);
	}

	if (count % 10 === 0 && global.gc)
		setTimeout(cleargc, 1000);
};

function cleargc() {
	global.gc();
}

F.clear = function(init = true, callback) {

	if (callback == null)
		return new Promise(resolve => F.clear(init, () => resolve()));

	var dir = F.path.tmp();
	var plus = F.id;

	if (dir[dir.length - 1] !== '/')
		dir += '/';

	if (F.isWindows)
		dir = dir.replaceAll('/', '\\');

	if (init) {

		if (!F.config.$cleartemp) {
			if (F.bundling) {
				// clears only JS and CSS files
				F.TUtils.ls(dir, function(files) {
					F.path.unlink(files, callback);
				}, function(filename, folder) {
					if (folder || (plus && !filename.substring(dir.length).startsWith(plus)))
						return false;
					var ext = F.TUtils.getExtension(filename);
					return ext === 'js' || ext === 'css' || ext === 'tmp' || ext === 'upload' || ext === 'html' || ext === 'htm';
				});
			}
			return;
		}
	}

	if (!pathexists(dir) || !F.bundling) {
		callback && callback();
		return;
	}

	F.TUtils.ls(dir, function(files, directories) {

		if (init) {
			var arr = [];
			for (let file of files) {
				var filename = file.substring(dir.length);
				if (plus && !filename.startsWith(plus))
					continue;

				if (filename.indexOf('/') === -1 && !filename.endsWith('.cache'))
					arr.push(file);
			}

			files = arr;
			directories = directories.remove(function(name) {
				name = F.TUtils.getName(name);
				return name[0] !== '~';
			});
		}

		F.path.unlink(files, () => F.path.rmdir(directories, callback));
	});

	if (!init)
		F.touch();
};

F.view = function(name, model, prepare) {
	var view = new F.TViewEngine.View();
	prepare && prepare(view);
	return view.render(name, model);
};

function httptuningperformance(socket) {
	socket.setNoDelay(true);
	socket.setKeepAlive(true, 10);
}

/*
process.on('unhandledRejection', function(e) {
	F.error(e, '');
});

process.on('uncaughtException', function(e) {

	var err = e + '';
	if (err.indexOf('listen EADDRINUSE') !== -1) {
		process.send && process.send('total:eaddrinuse');
		console.log('\nThe IP address and the PORT is already in use.\nYou must change the PORT\'s number or IP address.\n');
		process.exit(1);
		return;
	} else if (F.config.$filtererrors && REG_SKIPERRORS.test(err))
		return;
	F.error(e, '');
});
*/

(function(F) {

	// Node.js modules
	F.Zlib = F.require('zlib');
	F.Fs = F.require('fs');
	F.Path = F.require('path');
	F.Http = F.require('http');
	F.Https = F.require('https');
	F.Worker = F.require('worker_threads');
	F.Crypto = F.require('crypto');
	F.Child = F.require('child_process');
	F.Os = F.require('os');
	F.Dns = F.require('dns');
	F.Net = F.require('net');
	F.Url = F.require('url');
	F.Tls = F.require('tls');
	F.Stream = F.require('stream');

	// Total.js modules
	F.TUtils = require('./utils');
	F.TRouting = require('./routing');
	F.TBuilders = require('./builders');
	F.TViewEngine = require('./viewengine');
	F.TMinificators = require('./minificators');
	F.TWebSocket = require('./websocket');
	F.TQueryBuilder = require('./querybuilder');
	F.THttp = require('./http');
	F.TImage = require('./image');
	F.TCron = require('./cron');

	// Settings
	F.directory = F.TUtils.$normalize(require.main ? F.Path.dirname(require.main.filename) : process.cwd());
	F.isWindows = F.Os.platform().substring(0, 3).toLowerCase() === 'win';
	F.syshash = (__dirname + '-' + F.Os.hostname() + '-' + F.Os.platform() + '-' + F.Os.arch() + '-' + F.Os.release() + '-' + F.Os.tmpdir() + JSON.stringify(process.versions)).md5();

	F.path.fs = F.Fs;
	F.path.join = F.Path.join;

	F.TUtils.EventEmitter2.extend(F);

	F.on2 = F.on;
	F.on = function(name, fn) {
		if (name === 'ready' && F.isloaded)
			fn();
		else
			F.on2(name, fn);
	};

	// Configuration
	CONF.secret_uid = F.syshash.substring(10);
	CONF.$httpexpire = NOW.add('y', 1).toUTCString(); // must be refreshed every hour

	// Methods
	F.route = F.TRouting.route;
	F.newdb = F.TQueryBuilder.evaluate;
	F.internal.uidc = F.TUtils.random_text(1);

})(F);

require('./global');
require('./Tangular');