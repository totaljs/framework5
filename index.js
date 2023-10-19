'use strict';

const Os = require('os');
const Fs = require('fs');
const Zlib = require('zlib');
const Path = require('path');
const Crypto = require('crypto');
const Parser = require('url');
const Child = require('child_process');
const Http = require('http');
const Https = require('https');
const Worker = require('worker_threads');
const TRouting = require('./routing');
const TQueryBuilder = require('./querybuilder');
const TUtils = require('./utils');
const THttp = require('./http');
const TViewEngine = require('./viewengine');
const TBuilders = require('./builders');

const EMPTYOBJECT = {};
const EMPTYARRAY = [];

Object.freeze(EMPTYOBJECT);
Object.freeze(EMPTYARRAY);

// Globals
global.F = {};
global.CONF = {};
global.REPO = {};
global.MAIN = {};
global.TEMP = {};
global.FUNC = {};
global.PERF = {};
global.EMPTYBUFFER = Buffer.alloc(0);
global.EMPTYOBJECT = EMPTYOBJECT;
global.EMPTYARRAY = EMPTYARRAY;
global.DATA = new TQueryBuilder.Controller(true);
global.NOW = new Date();
global.DEF = {};

var PATHMODULES = require.resolve('./index');
PATHMODULES = PATHMODULES.substring(0, PATHMODULES.length - 8);

(function(F) {

	F.$id = null; // F.id ==> property
	F.is5 = F.version = 5000;
	F.version_header = '5';
	F.version_node = process.version + '';
	F.syshash = (__dirname + '-' + Os.hostname() + '-' + Os.platform() + '-' + Os.arch() + '-' + Os.release() + '-' + Os.tmpdir() + JSON.stringify(process.versions)).md5();

	F.resources = {};      // Loaded resources
	F.connections = {};    // WebSocket connections
	F.schedules = {};      // Registered schedulers
	F.routing = TRouting.db;
	F.config = CONF;

	// Internal cache
	F.temporary = {
		path: {},
		shortcache: {},
		notfound: {},
		processing: {},
		range: {},
		views: {},
		versions: {},
		dependencies: {}, // temporary for module dependencies
		other: {},
		keys: {}, // for crypto keys
		internal: {}, // controllers/modules names for the routing
		ready: {},
		ddos: {},
		exec: {}, // a temporary cach for EXEC() method
		service: { redirect: 0, request: 0, file: 0, usage: 0 },
		pending: [],
		tmp: {}
	};

	// Internal stats
	F.stats = {

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

	// Node.js modules
	F.Zlib = Zlib;
	F.Fs = Fs;
	F.Path = Path;
	F.Http = Http;
	F.Https = Https;
	F.Worker = Worker;
	F.Crypto = Crypto;
	F.Child = Child;
	F.OS = Os;
	F.Url = Parser;
	F.TRouting = TRouting;
	F.TUtils = TUtils;
	F.TBuilders = TBuilders;
	F.TViewEngine = TViewEngine;

	F.directory = TUtils.$normalize(require.main ? Path.dirname(require.main.filename) : process.cwd());
	F.path = {};
	F.path.fs = Fs;
	F.path.root = path => Path.join(F.directory, path || '');
	F.path.public = path => Path.join(F.directory, 'public', path || '');
	F.path.databases = path => Path.join(F.directory, 'databases', path || '');
	F.path.flowstreams = path => Path.join(F.directory, 'flowstreams', path || '');
	F.path.plugins = path => Path.join(F.directory, 'plugins', path || '');
	F.path.private = path => Path.join(F.directory, 'private', path || '');
	F.path.tmp = F.path.temp = path => Path.join(F.directory, 'tmp', path || '');
	F.path.unlink = unlink;

})(global.F);

function unlink(arr, callback) {

	if (typeof(arr) === 'string')
		arr = [arr];

	if (!arr.length) {
		callback && callback();
		return;
	}

	var filename = arr.shift();
	if (filename)
		Fs.unlink(filename, () => unlink(arr, callback));
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
	CONF.secret_uid = F.syshash.substring(10);
	CONF.secret_encryption = null,
	CONF.secret_csrf = null,
	CONF.secret_tms = null,
	CONF.node_modules = 'node_modules',

	// all HTTP static request are routed to directory-public
	CONF.static_url = '';
	CONF.static_url_script = '/js/';
	CONF.static_url_style = '/css/';
	CONF.static_url_image = '/img/';
	CONF.static_url_video = '/videos/';
	CONF.static_url_font = '/fonts/';
	CONF.static_url_download = '/download/';
	CONF.static_url_components = '/components.';

	// 'static-accepts-custom' = [],
	CONF.default_crypto_iv = Buffer.from(F.syshash).slice(0, 16);
	CONF.default_xpoweredby = 'Total.js';
	CONF.default_layout = 'layout';
	CONF.default_theme = '';
	CONF.default_proxy = '';
	CONF.default_request_maxkeys = 33;
	CONF.default_request_maxkey = 25;
	CONF.default_cookies_samesite = 'Lax';
	CONF.default_cookies_secure = false;

	// default maximum request size / length
	// default 10 kB
	CONF.default_request_maxlength = 10;
	CONF.default_websocket_maxlength = 2;
	CONF.default_websocket_maxlatency = 2000;
	CONF.default_websocket_encodedecode = false;
	CONF.default_maxopenfiles = 100;
	CONF.default_timezone = 'utc';
	CONF.default_root = '';
	CONF.default_response_maxage = '11111111';
	CONF.default_errorbuilder_errors = false;
	CONF.default_errorbuilder_status = 400;
	CONF.default_errorbuilder_forxhr = true;
	CONF.default_tms_url = '/$tms/';
	CONF.default_tms_maxlength = 1024; // max. 1 MB

	// Default originators
	CONF.default_cors = null;

	// Seconds (2 minutes)
	CONF.default_cors_maxage = 120;
	CONF.default_csrf_maxage = '30 minutes';

	// in milliseconds
	CONF.default_request_timeout = 3000;
	CONF.default_restbuilder_timeout = 10000;

	// otherwise is used ImageMagick (Heroku supports ImageMagick)
	// gm = graphicsmagick or im = imagemagick or magick (new version of ImageMagick)
	CONF.default_image_converter = 'gm'; // command-line name;
	CONF.default_image_quality = 93;
	CONF.default_image_consumption = 0; // disabled because e.g. GM v1.3.32 throws some error about the memory
	CONF.default_tapi = 'eu';

	CONF.allow_tms = false;
	CONF.allow_totalapi = true;
	CONF.allow_totalapilogger = false;
	CONF.allow_static_encryption = false;
	CONF.allow_static_files = true;
	CONF.allow_gzip = true;
	CONF.allow_websocket = true;
	CONF.allow_websocket_compression = true;
	CONF.allow_compile = true;
	CONF.allow_compile_script = true;
	CONF.allow_compile_style = true;
	CONF.allow_compile_html = true;
	CONF.allow_localize = true;
	CONF.allow_stats_snapshot = true;
	CONF.allow_stats_status = true;
	CONF.allow_performance = false;
	CONF.allow_custom_titles = false;
	CONF.allow_cache_snapshot = false;
	CONF.allow_cache_cluster = false;
	CONF.allow_head = false;
	CONF.allow_filter_errors = true;
	CONF.allow_clear_temp = true;
	CONF.allow_ssc_validation = true;
	CONF.allow_workers_silent = false;
	CONF.allow_sessions_unused = '-20 minutes';
	CONF.allow_reqlimit = 0;
	CONF.allow_persistent_images = true;
	CONF.allow_check_upload = true;

	CONF.textdb_worker = false;
	CONF.textdb_inmemory = 0; // in MB

	CONF.mail_smtp_keepalive = '10 minutes';

	// Used in F.service()
	// All values are in minutes
	CONF.default_interval_clear_resources = 20;
	CONF.default_interval_clear_cache = 10;
	CONF.default_interval_clear_dnscache = 30;
	CONF.default_interval_websocket_ping = 2000;

	// New internal configuration
	CONF.$uploadsize = 1024;
	CONF.$uploadchecktypes = true;
	CONF.$cors = '';
	CONF.$root = '';
	CONF.$reqlimit = 0; // request limit per ip
	CONF.$httpcompress = true;
	CONF.$httpetag = '';
	CONF.$httpexpire = NOW.add('y', 1).toUTCString(); // must be refreshed every hour
	CONF.$httprangebuffer = 5120; // 5 MB
	CONF.$xpoweredby = 'Total.js';
	CONF.$localize = true;
	CONF.$static_accepts = { flac: true, jpg: true, jpeg: true, png: true, gif: true, ico: true, wasm: true, js: true, mjs: true, css: true, txt: true, xml: true, woff: true, woff2: true, otf: true, ttf: true, eot: true, svg: true, zip: true, rar: true, pdf: true, docx: true, xlsx: true, doc: true, xls: true, html: true, htm: true, appcache: true, manifest: true, map: true, ogv: true, ogg: true, mp4: true, mp3: true, webp: true, webm: true, swf: true, package: true, json: true, ui: true, md: true, m4v: true, jsx: true, heif: true, heic: true, ics: true, ts: true, m3u8: true, wav: true };

})(global.CONF);

(function(DEF) {

	DEF.blacklist = {};

})(global.DEF);

require('./global');

F.loadconfig = function(value) {

};

F.loadresource = function(name, value) {
	F.resources[name] = value.parseConfig();
};

F.loadenv = function(value) {

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

F.load = function() {

};

F.http = function(opt) {
	var server = Http.createServer(THttp.listen);
	server.listen(opt.port || 8000, opt.ip || '0.0.0.0');
};

ROUTE('GET /', function($) {
	$.success();
});

ROUTE('GET /products/{category}/', function($) {
	$.success();
	// $.invalid('@(Jebo z lesa)');
	// $.invalid(408);
});

F.http({});

// Clears pending requests
setInterval(function() {

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
				ctrl.system(408);
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