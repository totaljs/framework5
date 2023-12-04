// Total.js framework
// The MIT License
// Copyright 2012-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const NODE_MODULES = { buffer: 1, child_process: 1, process: 1, fs: 1, events: 1, http: 1, https: 1, http2: 1, util: 1, net: 1, os: 1, path: 1, punycode: 1, readline: 1, repl: 1, stream: 1, string_decoder: 1, tls: 1, trace_events: 1, tty: 1, dgram: 1, url: 1, v8: 1, vm: 1, wasi: 1, worker_threads: 1, zlib: 1, crypto: 1, dns: 1 };
const EMPTYOBJECT = {};
const EMPTYARRAY = [];

const REG_SKIPERRORS = /epipe|invalid\sdistance|err_ipc_channel_closed/i;
const REG_HTTPHTTPS = /^(http|https):\/\//i;
const SOCKETWINDOWS = '\\\\?\\pipe';
const CLUSTER_STATS = { TYPE: 'stats' };
const IGNORE_AUDIT = { password: 1, token: 1, accesstoken: 1, access_token: 1, pin: 1 };

var CONCAT = new Array(2);

Object.freeze(EMPTYOBJECT);
Object.freeze(EMPTYARRAY);

// Globals
global.F = {};
global.DEBUG = true;
global.CONF = {};
global.REPO = {};
global.MAIN = {};
global.TEMP = {};
global.FUNC = {};
global.EMPTYOBJECT = EMPTYOBJECT;
global.EMPTYARRAY = EMPTYARRAY;
global.NOW = new Date();
global.DEF = {};

(function(F) {

	F.id = '';
	F.clusterid = '';
	F.is5 = F.version = 5000;
	F.isBundle = false;
	F.version_header = '5';
	F.version_node = process.version + '';
	F.EMPTYOBJECT = EMPTYOBJECT;
	F.EMPTYARRAY = EMPTYARRAY;

	F.resources = {};      // Loaded resources
	F.connections = {};    // WebSocket connections
	F.schedules = {};      // Registered schedulers
	F.modules = {};
	F.plugins = {};
	F.actions = {};
	F.apiservices = {};
	F.processing = {};
	F.transformations = {};
	F.consumption = {};
	F.flowstreams = {};
	F.filestorages = {};
	F.jsonschemas = {};
	F.querybuilders = {};
	F.workers = {};
	F.config = CONF;
	F.def = DEF;
	F.repo = REPO;
	F.timeouts = [];
	F.errors = [];
	F.paused = [];
	F.crons = [];

	F.internal = {
		ticks: 0,
		counter: 0,
		uid: 1,
		interval: null // setInterval identifier
	};

	F.routes = {
		fallback: {},
		virtual: {},
		api: {},
		routes: [],
		routescache: {},
		websockets: [],
		websocketscache: {},
		files: [],
		filescache: {},
		timeout: null,
		middleware: {},
		imagesmiddleware: {},
		proxies: []
	};

	// Internal cache
	F.temporary = {
		path: {},
		actions: {},
		cache: {},
		notfound: {},
		processing: {},
		views: {},
		viewscache: [],
		directories: {},
		versions: {},
		dependencies: {}, // temporary for module dependencies
		other: {},
		cryptokeys: {}, // for crypto keys
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
		bans: {},
		calls: {},
		utils: {},
		mail: {},
		images: {},
		querybuilders: {},
		templates: {},
		smtp: {},
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
	F.path.root = path => path ? F.path.$join(F.directory, path) : F.directory;
	F.path.logs = path => path ? F.path.$join(F.temporary.directories.logs, path) : F.temporary.directories.logs;
	F.path.public = path => path ? F.path.$join(F.temporary.directories.public, path) : F.temporary.directories.public;
	F.path.private = path => path ? F.path.$join(F.temporary.directories.private, path) : F.temporary.directories.private;
	F.path.databases = path => path ? F.path.$join(F.temporary.directories.databases, path) : F.temporary.directories.databases;
	F.path.plugins = path => path ? F.path.$join(F.temporary.directories.plugins, path) : F.temporary.directories.plugins;
	F.path.templates = path => path ? F.path.$join(F.temporary.directories.templates, path) : F.temporary.directories.templates;
	F.path.flowstreams = path => path ? F.path.$join(F.temporary.directories.flowstreams, path) : F.temporary.directories.flowstreams;
	F.path.directory = (type, path) => path ? F.path.$join(F.temporary.directories[type], path) : F.temporary.directories[type];
	F.path.tmp = F.path.temp = path => path ? F.path.$join(F.temporary.directories.tmp, path) : F.temporary.directories.tmp;
	F.path.exists = (path, callback) => callback ? (F.Fs.lstat(path, (err, stats) => callback(err ? false : true, stats ? stats.size : 0, stats ? stats.isFile() : false))) : new Promise(resolve => F.path.exists(path, resolve));

	F.path.$join = function(directory, path) {
		var key = '$' + directory;
		if (!F.temporary.path[key])
			F.path.verify(directory);
		return F.Path.join(directory, path || '');
	};

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

	F.path.unlink = unlink;
	F.path.rmdir = rmdir;
	F.path.verify = function(path) {

		var key = '$verify' + path;

		if (F.temporary.path[key])
			return;

		F.path.mkdir(path);
		F.temporary.path[key] = true;
	};

	F.path.mkdir = function(path) {
		try {
			if (!pathexists(path))
				F.Fs.mkdirSync(path, { recursive: true });
		} catch (e) {}
	};

})(global.F);

function mailsendforce(message) {
	message.send2();
}

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

	CONF.name = 'Total.js';
	CONF.version = '1.0.0';
	CONF.author = '';
	CONF.secret = F.syshash;
	CONF.secret_encryption = '';
	CONF.secret_totalapi = '';
	CONF.secret_csrf = '';
	CONF.secret_tapi = '';
	CONF.secret_tms = '';

	// New internal configuration
	CONF.$root = '';
	CONF.$cors = ''; // hostnames separated by comma
	CONF.$sourcemap = true;
	CONF.$httpreqlimit = 0; // request limit per ip
	CONF.$httpcompress = true;
	CONF.$httpetag = '';
	CONF.$httpmaxsize = 256; // 256 kB
	CONF.$httprangebuffer = 5120; // 5 MB
	CONF.$httptimeout = 5; // 5 seconds
	CONF.$httpfiles = { flac: true, jpg: true, jpeg: true, png: true, gif: true, ico: true, wasm: true, js: true, mjs: true, css: true, txt: true, xml: true, woff: true, woff2: true, otf: true, ttf: true, eot: true, svg: true, zip: true, rar: true, pdf: true, docx: true, xlsx: true, doc: true, xls: true, html: true, htm: true, appcache: true, manifest: true, map: true, ogv: true, ogg: true, mp4: true, mp3: true, webp: true, webm: true, swf: true, package: true, json: true, ui: true, md: true, m4v: true, jsx: true, heif: true, heic: true, ics: true, ts: true, m3u8: true, wav: true, xsd: true, xsl: true, xslt: true };
	CONF.$httpchecktypes = true; // for multipart data only
	CONF.$httpmaxage = 60; // in seconds
	CONF.$blacklist = '';
	CONF.$xpoweredby = 'Total.js';
	CONF.$maxopenfiles = 100;
	CONF.$minifyjs = true;
	CONF.$minifycss = true;
	CONF.$minifyhtml = true;
	CONF.$localize = true;
	CONF.$port = 'auto';
	CONF.$ip = '0.0.0.0';
	CONF.$unixsocket = '';
	CONF.$timezone = 'utc';
	CONF.$insecure = false;
	CONF.$performance = false;
	CONF.$filtererrors = true;
	CONF.$cleartemp = true;
	CONF.$customtitles = false;
	CONF.$version = '';
	CONF.$clearcache = 10;
	CONF.$imageconverter = 'gm';
	CONF.$imagememory = 0; // disabled because e.g. GM v1.3.32 throws some error about the memory
	CONF.$stats = true;

	CONF.$nodemodules = require.resolve('./index');
	CONF.$nodemodules = CONF.$nodemodules.substring(0, CONF.$nodemodules.length - (8 + 7));
	CONF.$npmcache = '/var/www/.npm';
	CONF.$python = 'python3';
	CONF.$wsmaxsize = 256; // 256 kB
	CONF.$wscompress = true;
	CONF.$wsencodedecode = false;
	CONF.$wsmaxlatency = 2000;
	CONF.$proxytimeout = 5; // 5 seconds
	CONF.$cookiesamesite = 'Lax';
	CONF.$cookiesecure = false;
	CONF.$csrfexpiration = '30 minutes';

	CONF.$tapi = true;
	CONF.$tapiurl = 'eu';
	CONF.$tapimail = false;
	CONF.$tapilogger = false;

	CONF.$tms = false;
	CONF.$tmsmaxsize = 256;
	CONF.$tmsurl = '/$tms/';
	CONF.$tmsclearblocked = 60; // in minutes

	process.env.TZ = CONF.$timezone;

})(global.CONF);

(function(DEF) {

	DEF.onSuccess = function(value) {
		return { success: true, value: value };
	};

	DEF.onCSRFcreate = function(ctrl) {
		var data = [ctrl.ip, (ctrl.headers['user-agent'] || '').hash(true), NOW.add(F.config.$csrfexpiration).getTime()];
		return F.config.secret_csrf ? JSON.stringify(data).encrypt(F.config.secret_csrf) : '';
	};

	DEF.onCSRFcheck = function(ctrl) {
		if (F.config.secret_csrf) {
			var token = ctrl.headers['x-csrf-token'] || ctrl.query.csrf;
			var is = false;
			if (token && token.length > 10) {
				var data = token.decrypt(F.config.secret_csrf);
				if (data)
					data = data.parseJSON();
				is = data && data[0] === ctrl.ip && data[2] >= NOW.getTime() && data[1] === (ctrl.headers['user-agent'] || '').hash(true) ? true : false;
			}
			return is;
		}
		return true;
	};

	DEF.onAudit = function(name, data) {
		F.stats.performance.open++;
		data.dtcreated = NOW = new Date();
		F.Fs.appendFile(F.path.logs((name || 'audit') + '.log'), JSON.stringify(data) + '\n', NOOP);
	};

	DEF.onMail = function(email, subject, body, callback, reply) {

		var tmp;

		if (typeof(callback) === 'string') {
			tmp = reply;
			reply = callback;
			callback = tmp;
		}

		var msg = new F.TMail.Message(subject, body);

		if (email.indexOf(',') !== -1)
			email = email.split(',').trim();

		if (email instanceof Array) {
			for (let m of email)
				msg.to(m);
		} else
			msg.to(email);

		msg.from(F.config.mail_from);
		callback && msg.callback(callback);

		if (reply)
			msg.reply(reply);
		else {
			tmp = F.config.mail_reply;
			if (tmp && tmp.length > 3)
				msg.reply(tmp);
		}

		tmp = F.config.mail_cc;
		if (tmp && tmp.length > 3)
			msg.cc(tmp);

		tmp = F.config.mail_bcc;
		if (tmp && tmp.length > 3)
			msg.bcc(tmp);

		msg.$sending = setImmediate(mailsendforce, msg);
		return msg;
	};

	DEF.onViewCompile = function(name, html) {
		return html;
	};

	DEF.onError = function(err, name, url) {

		NOW = new Date();

		if (err instanceof F.TBuilders.ErrorBuilder) {
			if (!name)
				name = err[0].name;
		} else if (!name && err.name)
			name = err.name;

		err = err.toString();
		console.log('ERROR ======= ' + (NOW.format('yyyy-MM-dd HH:mm:ss')) + ': ' + (name ? name + ' ---> ' : '') + err + (url ? (' (' + url + ')') : ''), err.stack ? err.stack : '');

		var obj = { error: err, name: name, url: url, date: NOW };

		if (F.errors.push(obj) > 10)
			F.errors.shift();

		F.$events.error && F.emit('error', obj);
		F.stats.error++;
	};

	DEF.helpers = {};
	DEF.currencies = {};

	DEF.parsers = {};
	DEF.parsers.json = value => value.parseJSON(true);
	DEF.parsers.urlencoded = value => value.parseEncoded();

	// Unused
	DEF.parsers.xml = value => value.parseXML(true);

	// Validators
	DEF.validators = {
		email: new RegExp('^[a-zA-Z0-9-_.+]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
		url: /^http(s)?:\/\/[^,{}\\]*$/i,
		phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,8}$/im,
		zip: /^[0-9a-z\-\s]{3,20}$/i,
		uid: /^\d{14,}[a-z]{3}[01]{1}|^\d{9,14}[a-z]{2}[01]{1}a|^\d{4,18}[a-z]{2}\d{1}[01]{1}b|^[0-9a-f]{4,18}[a-z]{2}\d{1}[01]{1}c|^[0-9a-z]{4,18}[a-z]{2}\d{1}[01]{1}d|^[0-9a-zA-Z]{5,10}\d{1}[01]{1}f|^[0-9a-zA-Z]{10}[A-J]{1}r$/,
		xss: /<.*>/,
		sqlinjection: /'(''|[^'])*'|\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b/
	};

})(global.DEF);

F.loadconfig = function(value) {

	var cfg = F.TUtils.parseConfig(value);
	var smtp = null;

	for (let key in cfg) {

		let val = cfg[key];
		let tmp;

		switch (key) {
			case 'totalapi':
				key = '$tapi';
				break;
			case '$tms':
				break;
			case 'smtp':
			case 'mail':
				if (typeof(val) === 'string')
					val = new Function('return ' + val)();
				smtp = val || {};
				if (!smtp.server)
					smtp.server = smtp.smtp || smtp.host || smtp.hostname || smtp.url;
				break;
			case 'mail_smtp':
				if (!smtp)
					smtp = {};
				smtp.server = val;
				break;
			case 'mail_smtp_options':

				if (typeof(val) === 'string')
					val = new Function('return ' + val)();

				if (!smtp)
					smtp = {};

				for (let k in val)
					smtp[k] = val[k];

				break;
			case '$cryptoiv':
				cfg[key] = val ? Buffer.from(val, 'hex') : null;
				break;
			case 'mail_from':
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

	if (!F.config.secret_uid)
		F.config.secret_uid = (F.config.name).crc32(true) + '';

	if (F.config.$performance)
		F.Http.globalAgent.maxSockets = 9999;

	if (!F.config.$httpetag)
		F.config.$httpetag = F.config.version.replace(/\.|\s/g, '');

	if (smtp)
		F.config.smtp = smtp;

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = F.config.$insecure ? '0' : '1';
	F.logger(F.config.$logger == true);
	F.dir();
	F.emit('$tms');
	F.emit('$reconfigure');
};

F.loadresource = function(name, value) {

	if (value == null) {
		// download
		RESTBuilder.GET(name).callback(function(err, response) {

			if (err)
				throw new Error(err.toString());

			if (response && (response instanceof Array || typeof(response) === 'object')) {
				if (response instanceof Array) {
					for (let item of response)
						F.loadresource(item.id || item.key || item.code || item.language, item.value || item.name || item.text || item.body);
				} else {
					for (let key in response)
						F.loadresource(key, response[key]);
				}
			}

		});
		return;
	}

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

F.localize = function(fn) {
	F.def.onLocalize = fn;
};

F.auth = function(fn) {
	if (typeof(fn) === 'object')
		F.TBuilders.builtinauth(fn);
	else
		F.def.onAuthorize = fn;
};

F.load = async function(types, callback) {

	var beg = Date.now();

	F.dir();

	await F.TBundles.extract();
	await F.clear(true);

	process.send && process.send('total:ready');

	if (typeof(types) === 'string')
		types = types.split(',').trim();

	var list = async (path, extension = 'js') => new Promise(resolve => F.TUtils.ls(path, files => resolve(files), (path, isdir) => isdir ? true : (path.indexOf('-bk') === -1 && path.indexOf('_bk') === -1 && F.TUtils.getExtension(path) === extension)));
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

	if (!types.length || types.includes('stats')) {
		F.config.$stats = false;
		F.config.$sourcemap = false;
	}

	if (!types.length || types.includes('env')) {
		let env = await read(F.path.root('.env'));
		env && F.loadenv(env);
	}

	if (!types.length || types.includes('config')) {
		let config = await read(F.path.root('config'));
		config && F.loadconfig(config);
	}

	if (!types.length || types.includes('resources')) {
		let resources = await list(F.path.root('resources'), 'resource');
		for (let resource of resources)
			F.loadresource(F.TUtils.getName(resource).replace(/\.resource$/i, ''), await read(resource));
	}

	if (!types.length || types.includes('jsonschemas')) {
		let jsonschemas = await list(F.path.root('jsonschemas'), 'json');
		for (let jsonschema of jsonschemas) {
			let json = await read(jsonschema);
			json = json.parseJSON();
			json && F.newjsonschema(F.TUtils.getName(jsonschema).replace(/\.json$/i, ''), json);
		}
		jsonschemas = await list(F.path.root('jsonschemas'), 'txt');
		for (let jsonschema of jsonschemas) {
			let txt = await read(jsonschema);
			txt && F.newjsonschema(F.TUtils.getName(jsonschema).replace(/\.txt$/i, ''), txt);
		}
	}

	let loader = ['modules', 'controllers', 'actions', 'schemas', 'models', 'definitions', 'sources', 'middleware'];
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
		var plugins = async () => new Promise(resolve => F.Fs.readdir(F.path.directory('plugins'), (err, response) => resolve(response || [])));
		tmp = await plugins();

		for (let plugin of tmp) {

			if (plugin.indexOf('-bk') !== -1 || plugin.indexOf('_bk') !== -1)
				continue;

			files.push({ id: F.TUtils.getName(plugin).replace(/\.js$/, ''), type: 'plugins', filename: F.path.directory('plugins', plugin + '/index.js') });

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
				if (!tmp.id)
					tmp.id = file.id;
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
		}
	}

	if (!types.length || types.includes('flowstreams'))
		F.TFlow.init();

	if (!types.length || types.includes('stats'))
		F.loadstats();

	F.loadservices();
	F.stats.compilation = Date.now() - beg;
	F.stats.compiled = files.length;
	F.isloaded = true;
	DEBUG && F.TSourceMap.refresh();
	callback && callback();

	F.emit('ready');
	F.emit('load');
};

F.require = function(name) {
	if (name.startsWith('node:'))
		return require(name);
	return NODE_MODULES[name] ? require('node:' + name) : require(F.Path.join(F.directory, name));
};

F.import = function(url, callback) {

	if (callback == null)
		return new Promise((resolve, reject) => F.import(url, (err, response) => err ? reject(err) : resolve(response)));

	var filename = F.path.tmp(F.clusterid + url.makeid() + '.js');

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
		opt.url = url;

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

	if (F.config.$shell)
		args.shell = F.config.$shell;

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
	print('Date ({0})    : '.format(process.env.TZ) + NOW.format('yyyy-MM-dd HH:mm:ss'));
	print('Mode          : ' + (DEBUG ? 'debug' : 'release'));
	print('Compiled      : ' + F.stats.compiled + ' files (' + F.stats.compilation + 'ms)');
	// F.threads && print('Threads       : ' + Object.keys(F.threads).join(', '));
	// global.THREAD && print('Thread        : ' + global.THREAD);
	print('====================================================');
	F.config.$root && print('Root          : ' + F.config.$root);
	print('Directory     : ' + process.cwd());
	print('node_modules  : ' + F.config.$nodemodules);
	print('====================================================\n');

	if (!F.isWorker) {

		var hostname = F.unixsocket ? ('Socket: ' + F.unixsocket) : '{2}://{0}:{1}/'.format(F.config.$ip, F.config.$port, F.isHTTPS ? 'https' : 'http');

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

	F.internal.interval && clearInterval(F.internal.timeouts);

	// This timer solving timeouts
	F.internal.interval = setInterval(function() {

		F.internal.ticks++;
		global.NOW = new Date();

		for (let key in F.flowstreams)
			F.flowstreams[key].service(F.internal.ticks);

		// 1 minute
		if (F.internal.ticks == 12) {
			F.internal.ticks = 0;
			F.internal.counter++;
			F.service(F.internal.counter);
			F.$events.service && F.emit('service', F.internal.counter);
		}

		if (F.internal.ticks == 6 || F.internal.ticks == 12)
			F.TWebSocket.ping();

		F.TFlow.ping();

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

					F.stats.response.timeout++;

					if (F.timeouts.push((NOW = new Date()).toJSON() + ' ' + ctrl.url) > 5)
						F.timeouts.shift();

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

	// opt.unixsocket {String}
	// opt.ip {String}
	// opt.port {Number}

	// opt.load {String}
	// config, env, modules, controllers, actions, schemas, models, definitions, sources, middleware, resources, plugins, stats
	// none - loads only web server

	if (opt.config) {
		let cfg = [];
		for (let key in opt.config)
			cfg.push({ id: key, value: opt.config[key] });
		F.loadconfig(cfg);
	}

	F.load(opt.load || opt.type || '', function() {

		F.server = F.Http.createServer(F.THttp.listen);
		F.server.on('upgrade', F.TWebSocket.listen);

		var unixsocket = opt.unixsocket || F.config.$unixsocket;

		if (unixsocket) {

			try {
				F.Fs.unlinkSync(unixsocket);
			} catch (e) {}

			if (F.isWindows && unixsocket.indexOf(SOCKETWINDOWS) === -1)
				unixsocket = F.Path.join(SOCKETWINDOWS, unixsocket);

			F.unixsocket = unixsocket;

			var listen = function(count) {
				F.server.listen(unixsocket, function() {

					// Check if the socket exists
					if (F.isWindows)
						return;

					F.Fs.lstat(unixsocket, function(err) {

						if (count > 9)
							throw new Error('HTTP server can not listen the path "{0}"'.format(unixsocket));

						if (err)
							setTimeout(listen, 500, count + 1);
						else if (opt.unixsocket777)
							F.Fs.chmodSync(unixsocket, 0o777);
					});

				});
			};

			listen(1);

		} else {

			if (opt.port)
				F.config.$port = opt.port;

			if (F.config.$port === 'auto') {
				let port = process.env.PORT;
				if (!port) {
					for (let arg of process.argv) {
						if ((/^\d{3,5}$/).test(arg)) {
							port = arg;
							break;
						}
					}
				}
				if (port)
					port = +port;
				if (isNaN(port))
					port = 8000;
				F.config.$port = port;
			}

			if (opt.ip)
				F.config.$ip = opt.ip;

			F.server.listen(F.config.$port, F.config.$ip);
		}

		F.config.$performance && F.server.on('connection', httptuningperformance);

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

	F.path.mkdir(path);

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


F.componentator = function(name, components, removeprev = true) {

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
			F.download(url, filename, err => err ? F.error(err, 'COMPONENTATOR') : null);
	});

};

F.error = function(err, name, url) {

	if (!arguments.length)
		return F.errorcallback;

	if (err)
		F.def.onError(err, name, url);
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
	var filename = F.path.tmp(F.clusterid + 'merged_' + key);

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

F.unauthorized = function($) {

	var user = $.user;
	if (user) {

		if (user.sa || user.su)
			return false;

		var compare = user.permissions || user.roles;
		var args = arguments;

		if (compare) {
			if (compare instanceof Array) {
				for (let i = 0; i < compare.length; i++) {
					for (let j = 1; j < args.length; j++) {
						if (args[j] === compare[i])
							return false;
					}
				}
			} else {
				for (let j = 1; j < args.length; j++) {
					if (compare[args[j]])
						return false;
				}
			}
		}
	}

	$.invalid(401);
	return true;
};

F.middleware = function(name, fn, assign) {

	if (!fn) {
		let types = ['routes', 'files', 'websockets'];
		for (let type of types) {
			for (let route of F.routes[type]) {
				let index = route.middleware.indexOf(name);
				if (index !== -1)
					route.middleware.splice(index, 1);
			}
		}
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

F.pauseserver = function(name, enable) {

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

	// Clears expired cache
	F.cache.refresh();

	// Clears temporary memory for non-exist files
	F.temporary.notfound = {};

	// UID state
	F.internal.uid = 1;
	F.internal.uidc = F.TUtils.random_text(1);

	if (F.config.$httpreqlimit)
		F.temporary.ddos = {};

	if (count % F.config.$clearcache === 0) {

		F.temporary.actions = {};
		F.temporary.path = {};
		F.temporary.views = {};
		F.temporary.utils = {};
		F.temporary.calls = {};
		F.temporary.images = {};
		F.temporary.templates = {};
		F.temporary.querybuilders = {};

		for (let key in F.filestorages)
			F.filestorages[key].cache = {};
	}

	if (count % 5 === 0) {
		global.TEMP = {};
		F.TMail.refresh();
	}

	// Bans
	for (let key in F.temporary.bans) {
		if (key !== 'is') {
			let tmp = F.temporary.bans[key];
			if (tmp.expire < NOW)
				delete F.temporary.bans[key];
			else
				F.temporary.bans.is = true;
		}
	}

	// Update expires date
	if (count % 60 === 0)
		F.config.$httpexpire = NOW.add('y', 1).toUTCString();

	if (count % F.config.$tmsclearblocked === 0)
		F.temporary.tmsblocked = {};

	if (count % 30 === 0)
		F.temporary.dnscache = {};

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

	F.temporary.service.publish = F.stats.performance.publish;
	F.temporary.service.subscribe = F.stats.performance.subscribe;
	F.temporary.service.call = F.stats.performance.call;
	F.temporary.service.request = F.stats.performance.request;
	F.temporary.service.file = F.stats.performance.file;
	F.temporary.service.message = F.stats.performance.message;
	F.temporary.service.mail = F.stats.performance.mail;
	F.temporary.service.open = F.stats.performance.open;
	F.temporary.service.dbrm = F.stats.performance.dbrm;
	F.temporary.service.dbwm = F.stats.performance.dbwm;
	F.temporary.service.external = F.stats.performance.external;
	F.temporary.service.upload = F.stats.performance.upload;
	F.temporary.service.download = F.stats.performance.download;

	F.stats.request.size += F.stats.performance.download;
	F.stats.response.size += F.stats.performance.upload;
	F.stats.performance.publish = 0;
	F.stats.performance.subscribe = 0;
	F.stats.performance.call = 0;
	F.stats.performance.upload = 0;
	F.stats.performance.download = 0;
	F.stats.performance.external = 0;
	F.stats.performance.dbrm = 0;
	F.stats.performance.dbwm = 0;
	F.stats.performance.request = 0;
	F.stats.performance.file = 0;
	F.stats.performance.open = 0;
	F.stats.performance.message = 0;
	F.stats.performance.mail = 0;

	F.usage && F.usage();
	F.temporary.service.usage = 0;
};

function cleargc() {
	global.gc();
}

F.clear = function(init = true, callback) {

	if (callback == null)
		return new Promise(resolve => F.clear(init, () => resolve()));

	var dir = F.path.tmp();
	var plus = F.clusterid;

	if (dir[dir.length - 1] !== '/')
		dir += '/';

	if (F.is)
		dir = dir.replaceAll('/', '\\');

	if (init) {

		if (!F.config.$cleartemp) {
			// clears only JS and CSS files
			F.TUtils.ls(dir, function(files) {
				F.path.unlink(files, callback);
			}, function(filename, folder) {
				if (folder || (plus && !filename.substring(dir.length).startsWith(plus)))
					return false;
				var ext = F.TUtils.getExtension(filename);
				return ext === 'js' || ext === 'css' || ext === 'tmp' || ext === 'upload' || ext === 'html' || ext === 'htm';
			});
			return;
		}
	}

	if (!pathexists(dir)) {
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

F.memorize = function(name, delay, skip) {

	if (!name)
		name = '';

	if (delay && typeof(delay) !== 'number') {
		var tmp;
		tmp = skip;
		skip = delay;
		delay = tmp;
	}

	var data = {};
	var filename = F.path.databases('memorize' + (name ? ('_' + name) : '') + '.json');

	try {
		data = F.Fs.readFileSync(filename, 'utf8').parseJSON(true);
	} catch (e) {}

	var replacer;
	var timeout;
	var ignore = {};

	if (skip) {
		if (typeof(skip) === 'string')
			skip = skip.split(',').trim();
		for (var m of skip)
			ignore[m] = 1;
		replacer = (key, value) => ignore[key] ? undefined : value;
	}

	var save = () => F.Fs.writeFile(filename, replacer ? JSON.stringify(data, replacer, '\t') : JSON.stringify(data, null, '\t'), ERROR('MEMORIZE(\'' + name + '\').save()'));

	data.save = function() {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(save, delay || 10000);
	};

	data.set = function(key, value) {
		data[key] = value;
		data.save();
	};

	return data;
};

F.newjsonschema = function(name, obj) {
	var type = typeof(name);

	if (type === 'string' && typeof(obj) === 'string') {
		obj = obj.toJSONSchema();
		obj.$id = name;
	} else if (type === 'string') {
		if (obj == null) {
			obj = name.toJSONSchema();
			name = obj.$id;
		}
	} else if (type === 'object') {
		obj = name;
		name = obj.$id;
	}

	F.jsonschemas[name] = F.jsonschemas[obj.$id] = obj;
	obj.transform = F.TUtils.jsonschematransform;
	return obj;
};

F.newtransform = function(name, action, id) {
	if (action == null) {
		let items = F.transformations[name];
		let index = items.findIndex('id', id);
		if (index !== -1) {
			items.splice(index, 1);
			if (!items.length)
				delete F.transformations[name];
		}
	} else {
		let obj = {};
		obj.id = id;
		obj.action = action;

		if (F.transformations[name])
			F.transformations[name].push(obj);
		else
			F.transformations[name] = [obj];
	}
};

function transform(items, opt, index) {
	var t = items[index];
	if (t) {
		t.action(opt, opt.value);
		t.next = () => transform(items, opt, index + 1);
	} else
		opt.$callback(opt.error.items.length ? opt.error : null, opt.value);
}

F.transform = function(name, value, callback, controller) {

	if (typeof(callback) !== 'function')
		return new Promise((resolve, reject) => F.transform(name, value, (err, response) => err ? reject(err) : resolve(response), controller));

	var items = F.transformations[name];
	if (items) {
		let opt = new F.TBuilders.Options(controller, new F.TBuilders.ErrorBuilder());
		opt.value = value;
		opt.$callback = callback;
		transform(items, opt, 0);
	} else
		callback(null, value);
};

function auditjsonserialization(key, value) {
	if (!IGNORE_AUDIT[key] && value != null && value !== '')
		return value;
}

F.audit = function(name, $, message, type) {

	if (typeof(name) === 'object') {
		type = message;
		message = $;
		$ = name;
		name = null;
	}

	var data = {};

	if ($.user) {
		data.userid = $.user.id;
		data.username = $.user.name || $.user.nick || $.user.alias;
	}

	if ($.controller) {
		if ($.controller.sessionid)
			data.sessionid = $.controller.sessionid;
		data.ua = $.ua;
		data.ip = $.ip;
		data.url = $.url;
	}

	if (type)
		data.type = type || 'info';

	if ($.id)
		data.schema = $.id;

	if ($.model)
		data.data = JSON.stringify({ params: $.params, query: $.query, model: $.model }, auditjsonserialization);

	if (F.clusterid)
		data.instance = F.clusterid;

	if (message)
		data.message = message;

	data.app = F.config.url || F.config.name;

	if (F.config.$tapilogger && F.config.$tapi && F.config.secret_totalapi)
		API('TAPI/logger', data).callback(ERROR('totalapi'));
	else
		F.def.onAudit(name, data, $);
};

F.restore = function(filename, target, callback, filter) {

	if (!callback)
		return new Promise((resolve, reject) => F.restore(filename, target, (err, response) => err ? reject(err) : resolve(response), filter));

	var buffer_key = Buffer.from(':');
	var buffer_new = Buffer.from('\n');
	var buffer_dir = Buffer.from('#');
	var cache = {};
	var data = null;
	var type = 0;
	var item = null;
	var stream = typeof(filename) === 'string' ? F.Fs.createReadStream(filename) : filename;
	var index = 0;
	var parser = {};
	var open = {};
	var pending = 0;
	var end = false;
	var output = {};
	var concat = [];

	output.files = 0;
	output.size = 0;
	output.path = target;

	parser.parse_key = function() {
		index = data.indexOf(buffer_key);
		if (index !== -1) {
			index++;
			item = data.slice(0, index - 1).toString('utf8').trim();
			data = data.slice(index + (data[index] === 32 ? 1 : 0));
			type = 1;
			parser.next();
		}
	};

	parser.parse_meta = function() {

		var path = F.Path.join(target, item);

		// Is directory?
		if (data[0] === buffer_dir[0]) {
			if (!cache[path]) {
				cache[path] = true;
				if (!filter || filter(item, true) !== false)
					F.path.mkdir(path);
			}
			type = 3;
			parser.next();
			return;
		}

		let filename = null;

		if (!cache[path]) {

			cache[path] = true;

			var npath = path.substring(0, path.lastIndexOf(F.is ? '\\' : '/'));
			filename = filter && filter(item, false);

			if (!filter || filename || filename == null) {
				F.path.mkdir(npath);
			} else {
				type = 5; // skip
				parser.next();
				return;
			}
		}

		if (typeof(filename) === 'string')
			path = F.Path.join(target, filename);

		// File
		type = 2;
		var tmp = open[item] = {};
		tmp.path = path;
		tmp.name = item;
		tmp.writer = F.Fs.createWriteStream(path);
		tmp.zlib = F.Zlib.createGunzip();
		tmp.zlib.$self = tmp;
		pending++;
		output.files++;

		tmp.zlib.on('error', function(e) {
			pending--;
			let tmp = this.$self;
			tmp.writer.end();
			tmp.writer = null;
			tmp.zlib = null;
			delete open[tmp.name];
			F.error(e, 'bundling', path);
		});

		tmp.zlib.on('data', function(chunk) {
			output.size += chunk.length;
			this.$self.writer.write(chunk);
		});

		tmp.zlib.on('end', function() {
			pending--;
			let tmp = this.$self;
			tmp.writer.end();
			tmp.writer = null;
			tmp.zlib = null;
			delete open[tmp.name];
		});

		parser.next();
	};

	parser.parse_dir = function() {
		index = data.indexOf(buffer_new);
		if (index !== -1) {
			data = data.slice(index + 1);
			type = 0;
		}
		parser.next();
	};

	parser.parse_data = function() {

		index = data.indexOf(buffer_new);

		var skip = false;

		if (index !== -1)
			type = 0;

		if (type) {
			var remaining = data.length % 4;
			if (remaining) {
				open[item].zlib.write(Buffer.from(data.slice(0, data.length - remaining).toString('ascii'), 'base64'));
				data = data.slice(data.length - remaining);
				skip = true;
			} else {
				open[item].zlib.write(Buffer.from(data.toString('ascii'), 'base64'));
				data = null;
			}
		} else {
			open[item].zlib.end(Buffer.from(data.slice(0, index).toString('ascii'), 'base64'));
			data = data.slice(index + 1);
		}

		!skip && data && data.length && parser.next();
	};

	parser.next = function() {
		switch (type) {
			case 0:
				parser.parse_key();
				break;
			case 1:
				parser.parse_meta();
				break;
			case 2:
				parser.parse_data();
				break;
			case 3:
				parser.parse_dir();
				break;
			case 5:
				index = data.indexOf(buffer_new);
				if (index === -1)
					data = null;
				else {
					data = data.slice(index + 1);
					type = 0;
					parser.next();
				}
				break;
		}

		end && !data.length && callback && callback(null, output);
	};

	parser.end = function() {
		if (callback) {
			if (pending)
				setTimeout(parser.end, 100);
			else if (end && !data.length)
				callback(null, output);
		}
	};

	stream.on('data', function(chunk) {

		if (data) {
			concat[0] = data;
			concat[1] = chunk;
			data = Buffer.concat(concat);
		} else
			data = chunk;

		parser.next();
	});

	CLEANUP(stream, function() {
		end = true;
		parser.end();
	});

	stream.resume();

};

F.backup = function(filename, files, callback, filter) {

	if (!callback)
		return new Promise((resolve, reject) => F.backup(filename, files, (err, response) => err ? reject(err) : resolve(response), filter));

	var padding = 100;
	var path = files instanceof Array ? F.path.root() : files;

	if (!(files instanceof Array))
		files = [''];

	var counter = 0;
	var totalsize = 0;
	var unlink = typeof(filename) === 'string' ? F.Fs.unlink : (filename, callback) => callback();
	var concat = [];
	var gzipoptions = { memLevel: 9 };

	unlink(filename, function() {

		files.sort(function(a, b) {
			let ac = a.split('/');
			let bc = b.split('/');
			if (ac.length < bc.length)
				return -1;
			else if (ac.length > bc.length)
				return 1;
			return a.localeCompare(b);
		});

		var clean = function(path, files) {
			let index = 0;
			while (true) {
				let filename = files[index];
				if (!filename)
					break;
				if (filename.substring(0, path.length) === path)
					files.splice(index, 1);
				else
					index++;
			}
		};

		var writer = typeof(filename) === 'string' ? F.Fs.createWriteStream(filename) : filename;

		writer.on('finish', function() {
			callback && callback(null, { filename: filename, files: counter, size: totalsize });
		});

		var lastchar = path[path.length - 1];
		var cleanpath = lastchar === '/' || lastchar === '\\' ? path.substring(0, path.length - 1) : path;

		files.wait(function(item, next) {

			var file = F.Path.join(path, item);

			if (F.is)
				item = item.replace(/\\/g, '/');

			if (item[0] !== '/')
				item = '/' + item;

			F.Fs.stat(file, function(err, stats) {

				if (err) {
					F.error(err, 'F.backup()', filename);
					next();
					return;
				}

				if (stats.isSocket()) {
					next();
					return;
				}

				if (stats.isDirectory()) {

					var dir = item.replace(/\\/g, '/');
					if (dir[dir.length - 1] !== '/')
						dir += '/';

					if (filter && !filter(dir, true))
						return next();

					F.TUtils.ls(file, function(f, d) {

						var length = path.length;
						if (path[path.length - 1] === '/')
							length--;

						var processdir = function() {

							var dir = d.shift();
							if (dir == null) {
								for (var i = 0; i < f.length; i++)
									files.push(f[i].substring(length));
								next();
								return;
							}

							if (filter && !filter(dir.substring(length), true)) {
								clean(dir, f, true);
								clean(dir, d, true);
							} else {
								var tmp = Buffer.from(dir.substring(length).padRight(padding) + ': #\n', 'utf8');
								writer.write(tmp);
								totalsize += tmp.length;
							}

							processdir();
						};

						processdir();

					});
					return;
				}

				if (filter && !filter(file.substring(cleanpath.length), false)) {
					next();
					return;
				}

				var data = Buffer.alloc(0);
				var tmp = Buffer.from(item.padRight(padding) + ': ');

				totalsize += tmp.length;
				writer.write(tmp);

				F.Fs.createReadStream(file).pipe(F.Zlib.createGzip(gzipoptions)).on('data', function(chunk) {

					concat[0] = data;
					concat[1] = chunk;
					data = Buffer.concat(concat);

					let remaining = data.length % 3;
					if (remaining) {
						let tmp = data.slice(0, data.length - remaining).toString('base64');
						writer.write(tmp, 'utf8');
						data = data.slice(data.length - remaining);
						totalsize += tmp.length;
					}

				}).on('end', function() {
					let tmp = data.length ? data.toString('base64') : '';
					data.length && writer.write(tmp);
					writer.write('\n', 'utf8');
					totalsize += tmp.length + 1;
					counter++;
					setImmediate(next);
				}).on('error', function(err) {
					F.error(err, 'F.backup()', file);
					setImmediate(next);
				});

			});
		}, () => writer.end());
	});
};

F.restart = function() {
	process.send && process.send('total:restart');
};

F.exit = function(signal = 15) {

	if (F.isexited)
		return;

	F.isexited = true;

	for (let m in F.workers) {
		let worker = F.workers[m];
		try {
			worker && worker.kill && worker.kill(signal);
		} catch (e) {}
	}

	let key = 'exit';

	F.$events[key] && F.emit(key, signal);

	if (!F.isWorker && process.send && process.connected) {
		try {
			process.send('total:stop');
		} catch (e) {}
	}

	F.internal.timeouts && clearInterval(F.internal.timeouts);
	F.internal.timeouts = null;

	if (F.server) {
		F.server.setTimeout(1);
		F.server.close();
	}

	setTimeout(() => process.exit(1), 300);
};

F.filestorage = function(name) {
	if (F.filestorages[name])
		return F.filestorages[name];
	var fs = F.TFileStorage.create(name);
	F.filestorages[name] = fs;
	return fs;
};

F.encryptreq = function(ctrl, val, key, strict) {
	var obj = {};
	obj.ua = ctrl.ua;
	if (strict)
		obj.ip = ctrl.ip;
	obj.data = val;
	return F.encrypt(obj, key);
};

F.decryptreq = function(ctrl, val, key) {
	if (!val)
		return;
	var obj = F.decrypt(val, key || '', true);
	if (!obj || (obj.ip && obj.ip !== ctrl.ip) || (obj.ua !== ctrl.ua))
		return;
	return obj.data;
};

F.encrypt = function(value, key, unique) {

	if (value == null)
		return '';

	value = JSON.stringify(value);

	if (F.config.$crypto) {
		if (!F.temporary.cryptokeys[key])
			F.temporary.cryptokeys[key] = Buffer.from(key);
		var cipher = F.Crypto.createCipheriv(F.config.$crypto, F.temporary.cryptokeys[key], F.config.$cryptoiv);
		CONCAT[0] = cipher.update(value);
		CONCAT[1] = cipher.final();
		return Buffer.concat(CONCAT).toString('hex');
	}

	return value.encrypt(F.config.secret + '=' + key, unique);
};

F.decrypt = function(value, key, tojson = true) {

	var response;

	if (F.config.$crypto) {

		if (!F.temporary.cryptokeys[key])
			F.temporary.cryptokeys[key] = Buffer.from(key);

		var decipher = F.Crypto.createDecipheriv(F.config.$crypto, F.temporary.cryptokeys[key], F.config.$cryptoiv);
		try {
			CONCAT[0] = decipher.update(Buffer.from(value || '', 'hex'));
			CONCAT[1] = decipher.final();
			response = Buffer.concat(CONCAT).toString('utf8');
		} catch (e) {
			response = null;
		}
	} else
		response = (value || '').decrypt(F.config.secret + '=' + key);

	return response ? (tojson ? (response.isJSON() ? response.parseJSON(true) : null) : response) : null;
};

F.dir = function(val) {

	if (val)
		F.directory = val;

	var dirs = ['public', 'tmp', 'logs', 'databases', 'controllers', 'resources', 'plugins', 'views', 'definitions', 'schemas', 'models', 'flowstreams', 'bundles', 'actions', 'extensions', 'source', 'services', 'updates', 'templates', 'private'];

	for (let dir of dirs) {
		var cfg = F.config['$dir' + dir];
		F.temporary.directories[dir] = cfg || F.Path.join(F.directory, dir);
	}

};

F.run = function(opt) {
	var type = opt.release ? 'release' : 'debug';
	require('./' + type)(opt);
};

F.logmail = function(email, subject, body, callback) {

	if (typeof(body) === 'function') {
		callback = body;
		body = subject;
		subject = null;
	} else if (body === undefined) {
		body = subject;
		subject = null;
	}

	if (!subject)
		subject = F.config.name;

	var body = '<!DOCTYPE html><html><head><title>' + subject + '</title><meta charset="utf-8" /></head><body><pre style="max-width:600px;font-size:13px;line-height:16px;white-space:pre-line">' + (typeof(body) === 'object' ? JSON.stringify(body).escape() : body) + '</pre></body></html>';
	return F.def.onMail(email, subject, body, callback);
};

F.mail = function(email, subject, name, model, language, callback) {

	if (typeof(language) === 'function') {
		let tmp = language;
		language = callback;
		callback = tmp;
	}

	// Localization
	if (typeof(language) === 'string') {
		if (subject.includes('@('))
			subject = TRANSLATE(language, subject);
	}

	let body = F.view(name, model, view => view.language = language || '');
	return F.def.onMail(email, subject, body, callback);
};

F.htmlmail = function(email, subject, body, language, callback) {

	if (typeof(language) === 'function') {
		let tmp = language;
		language = callback;
		callback = tmp;
	}

	// Localization
	if (typeof(language) === 'string') {
		if (subject.includes('@('))
			subject = TRANSLATE(language, subject);
		if (body.includes('@('))
			body = TRANSLATE(language, body);
	}

	body = body.indexOf('<body>') === -1 ? ('<!DOCTYPE html><html><head><title>' + subject + '</title><meta charset="utf-8" /></head><body style="padding:0;margin:0;font-family:Arial;font-size:14px;font-weight:normal">' + body + '</body></html>') : body;
	return F.def.onMail(email, subject, body, callback);
};

F.readfile = function(path, type = null) {
	return new Promise(resolve => F.Fs.readFile(path, type, (err, response) => err ? resolve(null) : resolve(response)));
};

F.loadstats = function() {

	var main = {};
	var stats = F.consumption;
	var lastwarning = 0;

	stats.id = F.clusterid;
	stats.version = {};
	stats.version.node = process.version;
	stats.version.total = F.version_header;
	stats.version.build = F.version;
	stats.version.app = F.config.version;
	stats.pid = process.pid;
	stats.thread = global.THREAD;
	stats.mode = DEBUG ? 'debug' : 'release';
	stats.overload = 0;

	main.pid = process.pid;
	main.date = NOW;
	main.port = F.port;
	main.ip = F.ip;
	main.stats = [stats];

	F.usage = function() {

		var memory = process.memoryUsage();
		stats.date = NOW;

		if (stats.id != F.clusterid)
			stats.id = F.clusterid;

		stats.memory = (memory.heapUsed / 1024 / 1024).floor(2);
		stats.rm = F.temporary.service.request || 0;      // request min
		stats.fm = F.temporary.service.file || 0;         // files min
		stats.wm = F.temporary.service.message || 0;      // websocket messages min
		stats.em = F.temporary.service.external || 0;     // external requests min
		stats.mm = F.temporary.service.mail || 0;         // mail min
		stats.om = F.temporary.service.open || 0;         // open files min
		stats.dm = (F.temporary.service.download || 0).floor(3);       // downloaded MB min
		stats.um = (F.temporary.service.upload || 0).floor(3);         // uploaded MB min
		stats.pm = F.temporary.service.publish || 0;      // publish messages min
		stats.sm = F.temporary.service.subscribe || 0;    // subscribe messages min
		stats.cm = F.temporary.service.call || 0;         // calls messages min
		stats.dbrm = F.temporary.service.dbrm || 0;       // db read
		stats.dbwm = F.temporary.service.dbwm || 0;       // db write
		stats.usage = F.temporary.service.usage.floor(2); // app usage in % min
		stats.requests = F.stats.request.request;
		stats.pending = F.stats.request.pending;
		stats.external = F.stats.request.external || 0;
		stats.errors = F.stats.error;
		stats.timeouts = F.stats.response.timeout;
		stats.online = F.stats.performance.online;
		stats.uptime = F.cache.count;
		stats.download = F.stats.request.size.floor(3);
		stats.upload = F.stats.response.size.floor(3);

		var err = F.errors[F.errors.length - 1];
		var timeout = F.timeouts[F.timeouts.length - 1];

		stats.lasterror = err ? (err.date.toJSON() + ' '  + (err.name ? (err.name + ' - ') : '') + err.error) : undefined;
		stats.lasttimeout = timeout;

		if ((stats.usage > 80 || stats.memory > 600 || stats.pending > 1000) && lastwarning !== NOW.getHours()) {
			lastwarning = NOW.getHours();
			stats.overload++;
		}

		if (F.isWorker) {
			if (process.connected) {
				CLUSTER_STATS.data = stats;
				process.send(CLUSTER_STATS);
			}
		} else if (F.config.$stats) {
			try {
				F.Fs.writeFile(process.mainModule.filename + '.json', JSON.stringify(main, null, '\t'), NOOP);
			} catch (e) {
				// readonly or something else
				F.usage = null;
				console.log(e);
			}
		}

		F.$events.$stats && F.emit('$stats', stats);

	};

};

function httptuningperformance(socket) {
	socket.setNoDelay(true);
	socket.setKeepAlive(true, 10);
}

process.on('unhandledRejection', function(e) {
	F.error(e.stack, '');
});

process.on('uncaughtException', function(e) {
	var err = e + '';
	if (err.indexOf('listen EADDRINUSE') !== -1) {
		console.log('\nThe IP address and the PORT is already in use.\nYou must change the PORT\'s number or IP address.\n');
		process.send && process.send('total:eaddrinuse');
		process.exit(1);
		return;
	} else if (F.config.$filtererrors && REG_SKIPERRORS.test(err))
		return;
	F.error(e.stack, '');
});

function ping() {
	process.connected && process.send('total:ping');
}

process.on('message', function(msg, h) {

	let key;

	if (msg === 'total:debug')
		F.TUtils.wait(() => F.isloaded, F.console, 10000, 500);
	else if (msg === 'total:ping')
		setImmediate(ping);
	else if (msg === 'total:update') {
		key = '$update';
		F.$events[key] && F.emit(key);
	} else if (msg === 'stop' || msg === 'exit' || msg === 'kill')
		F.exit();

	F.$events.$message && F.emit('$message', msg, h);
});

(function(F) {

	// Node.js modules
	F.Zlib = F.require('node:zlib');
	F.Fs = F.require('node:fs');
	F.Path = F.require('node:path');
	F.Http = F.require('node:http');
	F.Https = F.require('node:https');
	F.Worker = F.require('node:worker_threads');
	F.Crypto = F.require('node:crypto');
	F.Child = F.require('node:child_process');
	F.Os = F.require('node:os');
	F.Dns = F.require('node:dns');
	F.Net = F.require('node:net');
	F.Url = F.require('node:url');
	F.Tls = F.require('node:tls');
	F.Stream = F.require('node:stream');
	F.Cluster = require('node:cluster');

	// Total.js modules
	F.TUtils = require('./utils');
	F.TRouting = require('./routing');
	F.TBuilders = require('./builders');
	F.TViewEngine = require('./viewengine');
	F.TMinificators = require('./minificators');
	F.TWebSocket = require('./websocket');
	F.TQueryBuilder = require('./querybuilder');
	F.THttp = require('./http');
	F.TJSONSchema = require('./jsonschema');
	F.TCron = require('./cron');
	F.TApi = require('./api');
	F.TBundles = require('./bundles');
	F.TFileStorage = require('./filestorage');
	F.TTemplates = require('./templates');
	F.TSourceMap = require('./sourcemap');
	F.TMail = require('./mail');
	F.TWorkers = require('./workers');
	F.TFlowStream = require('./flowstream');
	F.TCluster = require('./cluster');

	// Settings
	F.directory = F.TUtils.$normalize(require.main ? F.Path.dirname(require.main.filename) : process.cwd());
	F.is = F.Os.platform().substring(0, 3).toLowerCase() === 'win';
	F.isWorker = process.env.PASSENGER_APP_ENV ? false : F.Cluster.isWorker;
	F.syshash = (__dirname + '-' + F.Os.hostname() + '-' + F.Os.platform() + '-' + F.Os.arch() + '-' + F.Os.release() + '-' + F.Os.tmpdir() + JSON.stringify(process.versions)).md5();
	F.isLE = F.Os.endianness ? F.Os.endianness() === 'LE' : true;

	F.cache = require('./cache');
	F.TImages = require('./images');
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
	CONF.$cryptoiv = Buffer.from(F.syshash).slice(0, 16);

	// Methods
	F.route = F.TRouting.route;
	F.newdb = F.TQueryBuilder.create;
	F.newflowstream = F.TFlowStream.create;
	F.internal.uidc = F.TUtils.random_text(1);
	F.ErrorBuilder = F.TBuilders.ErrorBuilder;
	F.newaction = F.TBuilders.newaction;
	F.action = F.TBuilders.action;
	F.api = F.TApi.exec;
	F.newapi = F.TApi.newapi;
	F.template = F.TTemplates.render;
	F.websocketclient = F.TWebSocket.createclient;
	F.image = F.TImages.load;
	F.sourcemap = F.TSourceMap.create;
	F.tmpdir = F.Os.tmpdir();
	F.proxy = F.TRouting.proxy;

	// Needed "F"
	F.TFlow = require('./flow');
	F.TTMS = require('./tms');
	F.TCMS = require('./cms');
	F.TNoSQL = require('./nosql');
	F.TUIBuilder = require('./uibuilder');

})(F);

process.connected && setTimeout(() => process.send('total:init'), 100);

require('./global');
require('./tangular');
require('./markdown');

// Init directories
F.dir();

module.exports = F;