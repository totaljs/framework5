'use strict';

const Os = require('os');
const Fs = require('fs');
const Zlib = require('zlib');
const Path = require('path');
const Crypto = require('crypto');
const Parser = require('url');
const Child = require('child_process');
const Util = require('util');
const Http = require('http');
const Https = require('https');
const Worker = require('worker_threads');
const Routing = require('./routing');

const COMPRESS = { gzip: 1, deflate: 1 };
const ENCODING = 'utf8';
const HEADER_CACHE = 'Cache-Control';
const HEADER_TYPE = 'Content-Type';
const HEADER_LENGTH = 'Content-Length';
const CT_TEXT = 'text/plain';
const CT_HTML = 'text/html';
const CT_JSON = 'application/json';
const COMPRESSION = { 'text/plain': true, 'text/javascript': true, 'text/css': true, 'text/jsx': true, 'application/javascript': true, 'application/x-javascript': true, 'application/json': true, 'text/xml': true, 'image/svg+xml': true, 'text/x-markdown': true, 'text/html': true };
const COMPRESSIONSPECIAL = { js: 1, css: 1, mjs: 1 };
const RESPONSENOCACHE = { zip: 1, rar: 1 };
const REG_TEMPORARY = /\//g;
const REG_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
const REG_ROBOT = /search|agent|bot|crawler|spider/i;
const REG_VERSIONS = /(href|src)="[a-zA-Z0-9/:\-._]+\.(jpg|js|css|png|apng|gif|svg|html|ico|json|less|sass|scss|swf|txt|webp|heif|heic|jpeg|woff|woff2|xls|xlsx|xml|xsl|xslt|zip|rar|csv|doc|docx|eps|gzip|jpe|jpeg|manifest|mov|mp3|flac|mp4|ogg|package|pdf)"/gi;
const REG_COMPILECSS = /url\(.*?\)/g;
const REG_ROUTESTATIC = /^(\/\/|https:|http:)+/;
const REG_RANGE = /bytes=/;
const REG_EMPTY = /\s/g;
const REG_ACCEPTCLEANER = /\s|\./g;
const REG_SANITIZE_BACKSLASH = /\/\//g;
const REG_WEBSOCKET_ERROR = /ECONNRESET|EHOSTUNREACH|EPIPE|is closed/i;
const REG_WINDOWSPATH = /\\/g;
const REG_HTTPHTTPS = /^(\/)?(http|https):\/\//i;
const REG_NOCOMPRESS = /[.|-]+min(@[a-z0-9]*)?\.(css|js)$/i;
const REG_WWW = /^www\./i;
const REG_TEXTAPPLICATION = (/text|application\/(json|xml)/);
const REG_ENCODINGCLEANER = /[;\s]charset=utf-8/g;
const REG_SKIPERROR = /epipe|invalid\sdistance/i;
//const REG_UTF8 = /[^\x20-\x7E]+/;
const REG_EMPTYBUFFER = /\0|%00|\\u0000/g;
const REG_EMPTYBUFFER_TEST = /\0|%00|\\u0000/;
const EMPTYARRAY = [];
const EMPTYOBJECT = {};
const EMPTYREQUEST = { uri: {}, headers: {} };
const ATTR_END = '"';
const ETAG = '858';
const CONCAT = [null, null];
const CLUSTER_CACHE_SET = { TYPE: 'cache', method: 'set' };
const CLUSTER_CACHE_REMOVE = { TYPE: 'cache', method: 'remove' };
const CLUSTER_CACHE_REMOVEALL = { TYPE: 'cache', method: 'removeAll' };
const CLUSTER_CACHE_CLEAR = { TYPE: 'cache', method: 'clear' };
const CLUSTER_SNAPSHOT = { TYPE: 'snapshot' };
const GZIPFILE = { memLevel: 9 };
const GZIPSTREAM = { memLevel: 1 };
const MODELERROR = {};
const IMAGES = { jpg: 1, png: 1, gif: 1, apng: 1, jpeg: 1, heif: 1, heic: 1, webp: 1 };
const KEYSLOCALIZE = { html: 1, htm: 1 };
const PROXYOPTIONS = { end: true };
const PROXYKEEPALIVE = new Http.Agent({ keepAlive: true, timeout: 60000 });
const PROXYKEEPALIVEHTTPS = new Https.Agent({ keepAlive: true, timeout: 60000 });
const JSFILES = { js: 1, mjs: 1 };
const BLACKLIST_AUDIT = { password: 1, token: 1, accesstoken: 1, access_token: 1, pin: 1 };
const isTYPESCRIPT = (/\.ts$/).test(process.argv[1]);
const SOCKETWINDOWS = '\\\\?\\pipe';
const SESSIONSEPARATOR = '\0';
const CALLMETHOD = { POST: '+', PUT: '+', PATCH: '#' };
const QB = require('./querybuilder');
const Api = require('./api');

var TIMEOUTS = [];
var PREFFILE = 'preferences.json';
var WSCLIENTSID = 0;
var SCRIPTEXT = '.js';

var PATHMODULES = require.resolve('./index');
PATHMODULES = PATHMODULES.substring(0, PATHMODULES.length - 8);

Object.freeze(EMPTYOBJECT);
Object.freeze(EMPTYARRAY);
Object.freeze(EMPTYREQUEST);

global.DB = global.DATABASE = function() {
	return new QB.Controller();
};
global.NEWDB = QB.evaluate;

global.REQUIRE = function(path) {
	return require(F.directory + '/' + path);
};

global.NEWJSONSCHEMA = function(name, value) {
	if (typeof(name) === 'object') {
		F.jsonschemas[name.$id] = name;
	} else {
		if (value == null)
			delete F.jsonschemas[name];
		else
			F.jsonschemas[name] = value.indexOf(':') === 1 ? value : value.toJSONSchema(name);
	}
};

global.MEMORIZE = function(name, delay, skip) {

	if (!name)
		name = '';

	if (delay && typeof(delay) !== 'number') {
		var tmp;
		tmp = skip;
		skip = delay;
		delay = tmp;
	}

	var data = {};
	var filename = PATH.databases('memorize' + (name ? ('_' + name) : '') + '.json');

	try {
		data = F.Fs.readFileSync(filename).toString('utf8').parseJSON(true);
	} catch (e) {}

	var blacklist = {};
	var timeout;
	var replacer;

	if (skip) {
		if (typeof(skip) === 'string')
			skip = skip.split(',').trim();
		for (var m of skip)
			blacklist[m] = 1;
		replacer = (key, value) => blacklist[key] ? undefined : value;
	}

	var save = function() {
		F.Fs.writeFile(filename, replacer ? JSON.stringify(data, replacer, '\t') : JSON.stringify(data, null, '\t'), ERROR('MEMORIZE(\'' + name + '\').save()'));
	};

	data.save = function() {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(save, delay || 10000);
	};

	return data;
};

function registerjsonschema(name, schema) {

	var schemaid;
	var tmp;

	if (typeof(schema) === 'object') {
		F.jsonschemas[schema.$id] = schema;
		schemaid = schema.$id;
	} else if (schema.indexOf('-->') !== -1) {
		schema = schema.split('-->').trim()[0];
		if (schema[0] === '+' || schema[0] === '-' || schema[0] === '#')
			schema = schema.substring(1);
	}
	// Inline schema object
	if (!schemaid && typeof(schema) === 'string') {
		if ((/:|,/).test(schema)) {
			var tmp = schema.toJSONSchema(name);
			schemaid = name + HASH(schema);
			F.jsonschemas[schemaid] = tmp;
		} else if (!F.jsonschemas[schema]) {
			// Tries to create from the Total.js Schema
			tmp = GETSCHEMA(schema);
			if (tmp)
				tmp.toJSONSchema();
			else
				throw new Error('JSON schema "' + schema + '" not found.');
			schemaid = schema;
		} else
			schemaid = schema;
	}

	return schemaid;
}

global.NEWPUBLISH = function(name, value) {

	if (!value) {
		delete F.tms.publish_cache[name];
		tmsrefresh_delay();
		return;
	}

	var schemaid = registerjsonschema(name, value);

	if (!F.tms.publish_cache[name])
		F.tms.publish_cache[name] = schemaid;

	tmsrefresh_delay();
};

global.NEWCALL = function(name, schema, callback) {

	if (schema == null) {
		delete F.tms.calls[name];
		tmsrefresh_delay();
		return;
	}

	if (typeof(schema) === 'function') {
		var tmp = callback;
		callback = schema;
		schema = tmp;
	}

	var schemaid = registerjsonschema(name, schema);
	var path;

	if (!callback && schema.indexOf('-->') !== -1) {
		path = schema;
		callback = (data, callback, client) => EXEC(path, data, callback, client);
	} else if (typeof(callback) === 'string') {
		// operation
		path = callback;
		callback = (data, callback, client) => OPERATION(path, data, callback, null, client);
	}

	if (callback)
		F.tms.calls[name] = { schema: schemaid, callback: callback };
	else
		delete F.tms.calls[name];

	tmsrefresh_delay();
};

global.NEWSUBSCRIBE = function(name, value, callback) {

	if (value) {
		var schemaid = registerjsonschema(name, value);
		if (!F.tms.subscribe_cache[name])
			F.tms.subscribe_cache[name] = schemaid;
	} else
		delete F.tms.subscribe_cache[name];

	tmsrefresh_delay();

	if (callback && typeof(callback) === 'function')
		SUBSCRIBE(name, callback);

};

global.PUBLISH = function(name, value) {
	if (F.tms.socket && F.tms.publish_cache[name] && F.tms.publishers[name]) {
		F.stats.performance.publish++;
		F.tms.socket.send({ type: 'publish', id: name, data: value }, client => client.tmsready);
	}
};

var tmssubscribers = {};

global.SUBSCRIBE = function(name, callback, client) {
	if (client) {
		var arr = tmssubscribers[name];
		if (arr) {
			for (var i = 0; i < arr.length; i++)
				arr[i](callback, client);
		}
	} else {
		if (tmssubscribers[name])
			tmssubscribers[name].push(callback);
		else
			tmssubscribers[name] = [callback];
		F.tms.subscribers[name] = 1;
		tmsrefresh_delay();
	}
};

global.UNSUBSCRIBE = function(name, callback) {
	if (tmssubscribers[name]) {
		tmsrefresh_delay();
		if (callback) {
			var index = tmssubscribers[name].indexOf(callback);
			if (index !== -1)
				tmssubscribers[name].splice(index, 1);
			if (!tmssubscribers[name].length)
				delete tmssubscribers[name];
			if (tmssubscribers[name])
				F.tms.subscribers[name] = 1;
			else
				delete F.tms.subscribers[name];
			return index !== -1;
		} else {
			delete tmssubscribers[name];
			delete F.tms.subscribers[name];
			return true;
		}
	}
	return false;
};

global.SHELL = function(cmd, callback, cwd) {

	var args = {};

	if (typeof(callback) === 'string') {
		cwd = callback;
		callback = null;
	}

	args.cwd = cwd || F.directory;

	if (CONF.default_shell)
		args.shell = CONF.default_shell;

	if (callback)
		F.Child.exec(cmd, args, callback);
	else
		return new Promise((resolve, reject) => F.Child.exec(cmd, args, (err, response) => err ? reject(err) : resolve(response)));
};

global.NPMINSTALL = function(name, callback) {

	var path = CONF.node_modules[0] === '~' ? CONF.node_modules.substring(1) : Path.join(directory, CONF.node_modules);

	PATH.mkdir(path);

	var index = name.lastIndexOf('@');
	var folder = index === -1 ? name : name.substring(0, index);

	Fs.readFile(PATH.join(path, folder, 'package.json'), function(err, response) {

		var is = false;

		if (response) {
			response = response.toString('utf8').parseJSON();
			is = response && (index === -1 || response.version === name.substring(index + 1));
		}

		if (is) {
			callback && callback();
		} else {

			var args = {};

			if (process.getuid && process.getuid() === 33)
				args.env = { NPM_CONFIG_CACHE: '/var/www/.npm' };

			args.cwd = path;

			F.Child.exec('npm install ' + name, args, function(err, response, output) {
				callback && callback(err ? (output || err) : null);
			});
		}
	});

};

var BLOCKEDB = {};
var TMSBLOCKED = {};

global.LDAP = function(opt, callback) {
	if (!opt.ldap.port)
		opt.ldap.port = 389;
	var ldap = require('./ldap');
	if (callback)
		ldap.load(opt, callback);
	else
		return new Promise((resolve, reject) => ldap.load(opt, (err, res) => err ? reject(err) : resolve(res)));
};

global.UNAUTHORIZED = function($) {
	var user = $.user;
	if (user) {

		if (user.sa || user.su)
			return false;

		var compare = user.permissions || user.roles;
		var args = arguments;

		if (compare) {
			if (compare instanceof Array) {
				for (var i = 0; i < compare.length; i++) {
					for (var j = 1; j < args.length; j++) {
						if (args[j] === compare[i])
							return false;
					}
				}
			} else {
				for (var j = 1; j < args.length; j++) {
					if (compare[args[j]])
						return false;
				}
			}
		}
	}

	$.invalid(401);
	return true;
};

global.BLOCKED = function($, limit, expiration) {

	var key = $.ip;

	if (limit === -1 || limit === null) {
		delete BLOCKEDB[key];
		return;
	}

	if (!limit)
		limit = 5;

	var item = BLOCKEDB[key];
	if (item) {
		if (item.count > limit)
			return true;
		item.count++;
	} else {
		item = BLOCKEDB[key] = {};
		item.expire = NOW.add(expiration || '15 minutes');
		item.count = 1;
	}

	BLOCKEDB.is = true;
};

global.NEWCOMMAND = function(name, fn) {

	if (fn === null) {
		delete F.commands[name];
		return;
	}

	if (F.commands[name])
		F.commands[name].push(fn);
	else
		F.commands[name] = [fn];
};

function flowwrapper(name, errorhandler) {
	if (!name)
		name = 'default';
	return F.flows[name] ? F.flows[name] : F.flows[name] = framework_flow.make(name, errorhandler);
}

global.FLOWSTREAM = function(name, errorhandler) {
	global.framework_flow = require('./flowstream');
	global.FLOW = flowwrapper;
	return flowwrapper(name, errorhandler);
};

var DEF = global.DEF = {};

DEF.currencies = {};
DEF.blacklist = {};

DEF.parsers = {};
DEF.parsers.json = function(body) {
	return body.parseJSON(true);
};

DEF.parsers.xml = function(body) {
	return body.parseXML(true);
};

DEF.parsers.urlencoded = function(body) {
	return body.parseEncoded();
};

DEF.helpers = {};
DEF.validators = {
	email: new RegExp('^[a-zA-Z0-9-_.+]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
	url: /^http(s)?:\/\/[^,{}\\]*$/i,
	phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,8}$/im,
	zip: /^[0-9a-z\-\s]{3,20}$/i,
	uid: /^\d{14,}[a-z]{3}[01]{1}|^\d{9,14}[a-z]{2}[01]{1}a|^\d{4,18}[a-z]{2}\d{1}[01]{1}b|^[0-9a-f]{4,18}[a-z]{2}\d{1}[01]{1}c|^[0-9a-z]{4,18}[a-z]{2}\d{1}[01]{1}d|^[0-9a-zA-Z]{5,10}\d{1}[01]{1}f|^[0-9a-zA-Z]{10}[A-J]{1}r$/
};

var PROTORES, PROTOREQ;
var RANGE = { start: 0, end: 0 };
var HEADERS = {};
var SUCCESSHELPER = { success: true };

// Cached headers for repeated usage
HEADERS.responseCode = {};
HEADERS.responseCode[HEADER_TYPE] = CT_TEXT;
HEADERS.redirect = {};
HEADERS.redirect[HEADER_TYPE] = CT_HTML + '; charset=utf-8';
HEADERS.redirect[HEADER_LENGTH] = '0';
HEADERS.sse = {};
HEADERS.sse[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.sse.Pragma = 'no-cache';
HEADERS.sse.Expires = '-1';
HEADERS.sse[HEADER_TYPE] = 'text/event-stream';
HEADERS.sse['X-Powered-By'] = 'Total.js';
HEADERS.file_lastmodified = {};
HEADERS.file_lastmodified['Access-Control-Allow-Origin'] = '*';
HEADERS.file_lastmodified[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.file_lastmodified['X-Powered-By'] = 'Total.js';
HEADERS.file_release_compress = {};
HEADERS.file_release_compress[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.file_release_compress.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_release_compress['Access-Control-Allow-Origin'] = '*';
HEADERS.file_release_compress['Last-Modified'] = 'Mon, 01 Jan 2001 08:00:00 GMT';
HEADERS.file_release_compress['Content-Encoding'] = 'gzip';
HEADERS.file_release_compress['X-Powered-By'] = 'Total.js';
HEADERS.file_release_compress_range = {};
HEADERS.file_release_compress_range['Accept-Ranges'] = 'bytes';
HEADERS.file_release_compress_range[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.file_release_compress_range.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_release_compress_range['Access-Control-Allow-Origin'] = '*';
HEADERS.file_release_compress_range['Last-Modified'] = 'Mon, 01 Jan 2001 08:00:00 GMT';
HEADERS.file_release_compress_range['Content-Encoding'] = 'gzip';
HEADERS.file_release_compress_range[HEADER_LENGTH] = '0';
HEADERS.file_release_compress_range['Content-Range'] = '';
HEADERS.file_release_compress_range['X-Powered-By'] = 'Total.js';
HEADERS.file_release = {};
HEADERS.file_release[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.file_release.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_release['Access-Control-Allow-Origin'] = '*';
HEADERS.file_release['Last-Modified'] = 'Mon, 01 Jan 2001 08:00:00 GMT';
HEADERS.file_release['X-Powered-By'] = 'Total.js';
HEADERS.file_release_range = {};
HEADERS.file_release_range['Accept-Ranges'] = 'bytes';
HEADERS.file_release_range[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.file_release_range.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_release_range['Access-Control-Allow-Origin'] = '*';
HEADERS.file_release_range['Last-Modified'] = 'Mon, 01 Jan 2001 08:00:00 GMT';
HEADERS.file_release_range[HEADER_LENGTH] = '0';
HEADERS.file_release_range['Content-Range'] = '';
HEADERS.file_release_range['X-Powered-By'] = 'Total.js';
HEADERS.file_debug_compress = {};
HEADERS.file_debug_compress[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.file_debug_compress.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_debug_compress['Access-Control-Allow-Origin'] = '*';
HEADERS.file_debug_compress.Pragma = 'no-cache';
HEADERS.file_debug_compress.Expires = '-1';
HEADERS.file_debug_compress['Content-Encoding'] = 'gzip';
HEADERS.file_debug_compress['X-Powered-By'] = 'Total.js';
HEADERS.file_debug_compress_range = {};
HEADERS.file_debug_compress_range['Accept-Ranges'] = 'bytes';
HEADERS.file_debug_compress_range[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.file_debug_compress_range.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_debug_compress_range['Access-Control-Allow-Origin'] = '*';
HEADERS.file_debug_compress_range['Content-Encoding'] = 'gzip';
HEADERS.file_debug_compress_range.Pragma = 'no-cache';
HEADERS.file_debug_compress_range.Expires = '-1';
HEADERS.file_debug_compress_range[HEADER_LENGTH] = '0';
HEADERS.file_debug_compress_range['Content-Range'] = '';
HEADERS.file_debug_compress_range['X-Powered-By'] = 'Total.js';
HEADERS.file_debug = {};
HEADERS.file_debug[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.file_debug.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_debug.Pragma = 'no-cache';
HEADERS.file_debug.Expires = '-1';
HEADERS.file_debug['Access-Control-Allow-Origin'] = '*';
HEADERS.file_debug['X-Powered-By'] = 'Total.js';
HEADERS.file_debug_range = {};
HEADERS.file_debug_range['Accept-Ranges'] = 'bytes';
HEADERS.file_debug_range[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.file_debug_range.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.file_debug_range['Access-Control-Allow-Origin'] = '*';
HEADERS.file_debug_range.Pragma = 'no-cache';
HEADERS.file_debug_range.Expires = '-1';
HEADERS.file_debug_range[HEADER_LENGTH] = '0';
HEADERS.file_debug_range['Content-Range'] = '';
HEADERS.file_debug_range['X-Powered-By'] = 'Total.js';
HEADERS.content_mobile_release = {};
HEADERS.content_mobile_release[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.content_mobile_release.Vary = 'Accept-Encoding, User-Agent';
HEADERS.content_mobile_release['Content-Encoding'] = 'gzip';
HEADERS.content_mobile_release.Expires = '-1';
HEADERS.content_mobile_release['X-Powered-By'] = 'Total.js';
HEADERS.content_mobile = {};
HEADERS.content_mobile[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.content_mobile.Vary = 'Accept-Encoding, User-Agent';
HEADERS.content_mobile.Expires = '-1';
HEADERS.content_mobile['X-Powered-By'] = 'Total.js';
HEADERS.content_compress = {};
HEADERS.content_compress[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.content_compress.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.content_compress['Content-Encoding'] = 'gzip';
HEADERS.content_compress.Expires = '-1';
HEADERS.content_compress['X-Powered-By'] = 'Total.js';
HEADERS.content = {};
HEADERS.content[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.content.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
HEADERS.content.Expires = '-1';
HEADERS.content['X-Powered-By'] = 'Total.js';
HEADERS.stream_release_compress = {};
HEADERS.stream_release_compress[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.stream_release_compress['Access-Control-Allow-Origin'] = '*';
HEADERS.stream_release_compress['Content-Encoding'] = 'gzip';
HEADERS.stream_release_compress['X-Powered-By'] = 'Total.js';
HEADERS.stream_release = {};
HEADERS.stream_release[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.stream_release['Access-Control-Allow-Origin'] = '*';
HEADERS.stream_release['X-Powered-By'] = 'Total.js';
HEADERS.stream_debug_compress = {};
HEADERS.stream_debug_compress[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.stream_debug_compress.Pragma = 'no-cache';
HEADERS.stream_debug_compress.Expires = '-1';
HEADERS.stream_debug_compress['Access-Control-Allow-Origin'] = '*';
HEADERS.stream_debug_compress['Content-Encoding'] = 'gzip';
HEADERS.stream_debug_compress['X-Powered-By'] = 'Total.js';
HEADERS.stream_debug = {};
HEADERS.stream_debug[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.stream_debug.Pragma = 'no-cache';
HEADERS.stream_debug.Expires = '-1';
HEADERS.stream_debug['Access-Control-Allow-Origin'] = '*';
HEADERS.stream_debug['X-Powered-By'] = 'Total.js';
HEADERS.binary_compress = {};
HEADERS.binary_compress[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.binary_compress['Content-Encoding'] = 'gzip';
HEADERS.binary_compress['X-Powered-By'] = 'Total.js';
HEADERS.binary = {};
HEADERS.binary[HEADER_CACHE] = 'public';
HEADERS.binary['X-Powered-By'] = 'Total.js';
HEADERS.authorization = { user: '', password: '', empty: true };
HEADERS.fsStreamRead = { flags: 'r', mode: '0666', autoClose: true };
HEADERS.fsStreamReadRange = { flags: 'r', mode: '0666', autoClose: true, start: 0, end: 0 };
HEADERS.responseLocalize = {};
HEADERS.responseLocalize['Access-Control-Allow-Origin'] = '*';
HEADERS.responseNotModified = {};
HEADERS.responseNotModified[HEADER_CACHE] = 'public, max-age=11111111';
HEADERS.responseNotModified['X-Powered-By'] = 'Total.js';
HEADERS.response503 = {};
HEADERS.response503[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.response503[HEADER_TYPE] = CT_HTML;
HEADERS.response503['X-Powered-By'] = 'Total.js';
HEADERS.response503ddos = {};
HEADERS.response503ddos[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
HEADERS.response503ddos[HEADER_TYPE] = CT_TEXT;
HEADERS.response503ddos['X-Powered-By'] = 'Total.js';

Object.freeze(HEADERS.authorization);

var CURRENT_OWNER = '';

// GO ONLINE MODE
!global.framework_internal && (global.framework_internal = require('./internal'));
!global.framework_builders && (global.framework_builders = require('./builders'));
!global.framework_utils && (global.framework_utils = require('./utils'));
!global.framework_jsonschema && (global.framework_jsonschema = require('./jsonschema'));
!global.framework_mail && (global.framework_mail = require('./mail'));
!global.framework_image && (global.framework_image = require('./image'));

require('./tangular');
require('./test');
require('./templates');

function countuploadstats(chunk) {
	F.stats.performance.upload += chunk.length / 1024 / 1024;
}

global.LOADRESOURCE = function(name, value) {

	if (value == null) {
		// multiple
		RESTBuilder.GET(name).callback(function(err, response) {

			if (err)
				throw new Error(err.toString());

			if (response && (response instanceof Array || typeof(response) === 'object')) {
				if (response instanceof Array) {
					for (let item of response)
						LOADRESOURCE(item.id || item.key || item.code || item.language, item.value || item.name || item.text || item.body);
				} else {
					for (let key in response)
						LOADRESOURCE(key, response[key]);
				}
			}
		});
		return;
	}

	var filename = PATH.temp(name + '.resource');

	if (typeof(value) === 'string') {

		if (REG_HTTPHTTPS.test(value)) {
			// http or https
			RESTBuilder.GET(value).callback(function(err, response) {

				if (err)
					throw new Error(err.toString());

				if (response && (response instanceof Array || typeof(response) === 'object'))
					LOADRESOURCE(name, response);
			});
			return;
		}

		Fs.writeFile(filename, value, function() {
			delete F.resources[name];
		});

		return;
	}

	var builder = [];

	if (value instanceof Array) {
		for (let item of value) {
			let key = item.id || item.key || item.code || item.language;
			let val = item.value || item.name || item.text || item.body;
			if (val)
				builder.push(key.padRight(25, ' ') + ': ' + val);
		}
	} else {
		for (let key in value) {
			let val = value[key];
			if (val)
				builder.push(key.padRight(25, ' ') + ': ' + val);
		}
	}

	Fs.writeFile(filename, builder.join('\n'), function() {
		delete F.resources[name];
	});
};

global.JSONSCHEMA = function(id, value, callback, error) {

	if (typeof(id) === 'string')
		id = F.jsonschemas[id];

	if (!error)
		error = new ErrorBuilder();

	if (callback) {
		if (id) {
			var response = framework_jsonschema.transform(id, error, value);
			callback(error.items.length ? error : null, response);
		} else {
			error.push(404);
			callback(error);
		}
	} else {
		if (id) {
			var response = framework_jsonschema.transform(id, error, value);
			return new Promise((resolve, reject) => error.items.length ? reject(error) : resolve(response));
		} else {
			error.push(404);
			return new Promise((resolve, reject) => reject(error));
		}
	}

};

global.LOADCONFIG = function(value) {
	var config = value;
	var tmp;

	if (typeof(value) === 'string') {
		config = value.parseConfig();
	} else if (value instanceof Array) {
		config = {};
		for (var i = 0; i < value.length; i++) {
			var item = value[i];
			var key = item.id || item.key || item.name;
			var val = item.value || item.body;
			if (item.type) {

				var type = typeof(val);

				if (type === 'string' && val) {
					var from = 0;
					if (val.substring(0, 4) === 'hex ')
						from = 4;
					else if (val.substring(0, 7) === 'base64 ')
						from = 7;
					if (from)
						val = Buffer.from(val.substring(from).trim(), 'hex').toString('utf8');
				}

				switch (item.type.toLowerCase()) {
					case 'number':
						if (type !== 'number') {
							if (type === 'string')
								val = val.parseFloat();
							else
								val = 0;
						}
						break;
					case 'boolean':
					case 'bool':
						if (type !== 'boolean')
							val = type === 'string' ? (val === 'true' || val === 'on' || val === '1' || val === 't') : val ? true : false;
						break;
					case 'json':
					case 'object':
						if (type === 'string')
							val = val.parseJSON(true);
						break;
					case 'date':
						if (!(val instanceof Date)) {
							if (type === 'string')
								val = val.parseDate();
							else if (type === 'number')
								val = new Date(val);
							else
								val = null;
						}
						break;
					case 'string':
						if (type !== 'string') {
							if (val)
								val = val + '';
							else
								val = '';
						}
						break;
					case '[string]':
						if (type !== 'string') {
							if (val)
								val = val + '';
							else
								val = '';
						}
						val = val.split(',').trim();
						break;
					case '[number]':
						if (type === 'string') {
							val = val.split(',');
							tmp = [];
							for (var i = 0; i < val.length; i++)
								tmp.push(val[i].trim().parseInt());
							val = tmp;
						} else
							val = [];
						break;
					case '[date]':
						if (type === 'string') {
							val = val.split(',');
							tmp = [];
							for (var i = 0; i < val.length; i++)
								tmp.push(val[i].trim().parseInt());
							val = tmp;
						} else
							val = [];
						break;
					case '[boolean]':
					case '[bool]':
						if (type === 'string') {
							val = val.split(',');
							tmp = [];
							for (var i = 0; i < val.length; i++) {
								var v = val[i].trim();
								tmp.push(v === 'true' || v === 'on' || v === '1' || v === 't');
							}
							val = tmp;
						} else
							val = [];
						break;
				}
			}
			config[key] = val;
		}
	}

	if (config.mail_smtp || config.mail_smtp_options)
		delete F.temporary.mail_settings;

	if (config.root)
		config.default_root = config.root;

	if (config.default_root) {
		if (config.default_root[0] !== '/')
			config.default_root = '/' + config.default_root;
		config.default_root = U.path(config.default_root);
	}

	for (var m in config)
		CONF[m] = config[m];

	CMD('refresh_tms');
};

var TMPENV = framework_utils.copy(process.env);
TMPENV.istotaljsworker = true;

HEADERS.workers = { cwd: '', silent: false, env: TMPENV };
HEADERS.worker_threads = { cwd: '' };
HEADERS.workers2 = { cwd: '', silent: true, env: TMPENV };

global.Builders = framework_builders;
var U = global.Utils = global.utils = global.U = global.framework_utils;
global.Mail = framework_mail;

var prefid;

global.PREF = {};
global.PREF.inc = function(name, value) {

	if (value == null)
		value = 1;

	if (F.pref[name] == null)
		PREF.set(name, value);
	else {
		value = F.pref[name] + value;
		PREF.set(name, value);
	}

	return value;
};

global.PREF.rem = function(name) {
	PREF.set(name, null);
};

global.PREF.set = function(name, value) {

	if (value === undefined)
		return F.pref[name];

	if (value === null) {
		delete F.pref[name];
	} else
		F.pref[name] = global.PREF[name] = value;

	prefid && clearTimeout(prefid);
	prefid = setTimeout(DEF.onPrefSave, 1000, F.pref);
	return value;
};

global.FINISHED = framework_internal.onFinished;
global.DESTROY = framework_internal.destroyStream;

function filestoragewrapper(name) {
	var key = 'fs_' + name;
	return F.databases[key] ? F.databases[key] : (F.databases[key] = require('./filestorage').FileDB(name, PATH.filestorage(name)));
}

global.FILESTORAGE = function(name) {
	global.FILESTORAGE = filestoragewrapper;
	return filestoragewrapper(name);
};

global.UID = function(type, date) {

	if (CONF.default_uid === 'r')
		return UIDR(); // "r" version

	var index;

	if (type) {
		if (UIDGENERATOR.types[type])
			index = UIDGENERATOR.types[type] = UIDGENERATOR.types[type] + 1;
		else {
			UIDGENERATOR.multiple = true;
			index = UIDGENERATOR.types[type] = 1;
		}
	} else
		index = UIDGENERATOR.index++;

	var ts = (date ? date.getTime() : Date.now()) / 100;
	var h = U.convert62(ts);
	return h + U.convert62(index + 99) + F.uidc + h.length + (index % 2 ? 1 : 0) + 'f'; // "f" version
};

global.ERROR = function(name) {
	return name == null ? F.errorcallback : function(err) {
		err && F.error(err, name);
	};
};

var authbuiltin = function(opt) {

	// opt.secret {String}
	// opt.ddos {Number}
	// opt.expire {String}
	// opt.cookie {String} A cookie name
	// opt.header {String} A header name
	// opt.options {Object} A cookie options
	// opt.strict {Boolean}

	if (opt.strict == null)
		opt.strict = true;

	// Delegates
	// opt.onddos = function($)
	// opt.onread = function({ sessionid: String, userid: String, ua: String }, callback(USER_DATA), $)
	// opt.onfree = function({ sessions: Array, users: Array })
	// opt.onlogout = function(sessionid, userid)
	// opt.onauthorize = function($) must return true for canceling of processing

	opt.sessions = {};
	opt.blocked = {};
	opt.pending = {};

	if (!opt.cleaner)
		opt.cleaner = 5;

	if (!opt.secret)
		opt.secret = F.secret;

	opt.logout = function($) {

		var id = $;

		if (typeof(id) === 'object')
			id = $.sessionid;

		if (id) {
			for (var key in opt.sessions) {
				var session = opt.sessions[key];
				if (session.sessionid === id) {
					delete opt.sessions[key];
					opt.onlogout && opt.onlogout(session);
					opt.cookie && $.cookie && $.cookie(opt.cookie, '', '-1 year', opt.options);
					return true;
				}
			}
		}
	};

	opt.update = function(userid, fn) {
		var count = 0;
		for (var key in opt.sessions) {
			var session = opt.sessions[key];
			if (session.userid === userid) {
				count++;
				fn(session.data, session);
			}
		}
		return count;
	};

	opt.refresh = function(userid, exceptsessionid) {
		var count = 0;
		for (var key in opt.sessions) {
			var session = opt.sessions[key];
			if (session.userid === userid && session.sessionid !== exceptsessionid) {
				count++;
				delete opt.sessions[key];
			}
		}
		return count;
	};

	opt.sign = function(sessionid, userid) {
		return (sessionid + SESSIONSEPARATOR + userid + SESSIONSEPARATOR + Date.now().toString(36)).encrypt(opt.secret);
	};

	opt.authcookie = function($, sessionid, userid, expiration, options) {
		if (!options)
			options = opt.options;
		$.cookie && $.cookie(opt.cookie, opt.sign(sessionid, userid), expiration, options);
	};

	if (!opt.expire)
		opt.expire = '5 minutes';

	var callpending = function(pending, data) {
		for (var i = 0; i < pending.length; i++) {
			if (data)
				pending[i].success(data);
			else
				pending[i].invalid();
		}
	};

	opt.auth = function($) {

		if (opt.onauthorize && opt.onauthorize($))
			return;

		var sessionid = opt.cookie ? $.cookie(opt.cookie) : null;
		if (!sessionid && opt.header)
			sessionid = $.headers[opt.header];

		if (!sessionid) {

			if (opt.locale)
				$.req.$language = opt.locale(null, $.req);

			$.invalid();
			return;
		}

		var id = sessionid.decrypt(opt.secret);
		if (id) {

			id = id.split(SESSIONSEPARATOR);

			if (!id[0] || !id[1] || !id[2])
				id = null;

			if (id) {
				var session = opt.sessions[id[0]];
				if (session && session.data) {
					if (!opt.strict || session.ua === $.ua) {
						$.req.session = session;
						$.req.sessionid = session.sessionid;
						if (!opt.onsession || !opt.onsession(session, $)) {
							if (opt.locale)
								$.req.$language = opt.locale(session.data, $.req);
							$.success(session.data);
						}
					} else {

						if (opt.locale)
							$.req.$language = opt.locale(null, $.req);

						$.invalid();
						sessionid = null;
					}
					return;
				}
			}
		}

		if (opt.ddos && opt.blocked[$.ip] > opt.ddos) {
			opt.onddos && opt.onddos($);
			$.invalid();
			return;
		}

		if (!id) {

			if (opt.ddos) {
				if (opt.blocked[$.ip])
					opt.blocked[$.ip]++;
				else
					opt.blocked[$.ip] = 1;
			}

			opt.cookie && $.res && $.res.cookie && $.res.cookie(opt.cookie, '', '-1 year', opt.options);
			$.invalid();
			return;
		}

		var meta = { ip: $.req.ip, ua: $.ua, sessionid: id[0], userid: id[1] };

		if (opt.pending[meta.sessionid]) {
			opt.pending[meta.sessionid].push($);
			return;
		}

		opt.pending[meta.sessionid] = [];
		opt.onread(meta, function(err, data) {

			var pending = opt.pending[meta.sessionid];
			delete opt.pending[meta.sessionid];

			if (!err && data) {

				$.req.session = opt.sessions[meta.sessionid] = { sessionid: meta.sessionid, userid: meta.userid, data: data, ua: $.ua, expire: NOW.add(opt.expire) };
				$.req.sessionid = meta.sessionid;

				if (opt.locale)
					$.req.$language = opt.locale(data, $.req);

				if (!opt.onsession || !opt.onsession($.req.session, $, true))
					$.success(data);

				if (pending.length)
					setImmediate(callpending, pending, data);

			} else {

				if (opt.ddos) {
					if (opt.blocked[$.ip])
						opt.blocked[$.ip]++;
					else
						opt.blocked[$.ip] = 1;
				}

				opt.cookie && $.res.cookie && $.res.cookie(opt.cookie, '', '-1 year', opt.options);
				$.invalid();

				if (pending.length)
					setImmediate(callpending, pending);
			}

		}, $);

	};

	DEF.onAuthorize = framework_builders.AuthOptions.wrap(opt.auth);

	ON('service', function(counter) {

		if (counter % opt.cleaner)
			return;

		var expired = [];
		var users_expired = {};
		var users_live = {};

		for (var key in opt.sessions) {
			var session = opt.sessions[key];
			if (session.expire < NOW) {
				expired.push(key);
				delete opt.sessions[key];
				users_expired[session.userid] = 1;
			} else
				users_live[session.userid] = 1;
		}

		if (expired.length) {
			for (var key in users_expired) {
				if (users_live[key])
					delete users_expired[key];
			}
		}

		if (expired.length && opt.onfree) {
			var meta = {};
			meta.sessions = expired;
			meta.users = expired.length ? Object.keys(users_expired) : null;
			opt.onfree && opt.onfree(meta);
		}

		opt.blocked = {};

	});

	return opt;
};

global.AUTH = function(fn) {
	if (typeof(fn) === 'function')
		DEF.onAuthorize = framework_builders.AuthOptions.wrap(fn);
	else
		authbuiltin(fn);
};

global.OPENCLIENT = function(url, id) {
	return require('./openclient').create(url, id);
};

global.TMSCLIENT = function(url, token, callback) {
	return require('./tmsclient').create(url, token, callback);
};

global.WEBSOCKETCLIENT = function(callback) {
	var ws = require('./websocketclient').create();
	callback && callback.call(ws, ws);
	return ws;
};

global.OFF = function() {
	return arguments.length > 1 ? F.removeListener.apply(F, arguments) : F.removeAllListeners.apply(F, arguments);
};

global.NEWSCHEMA = function(name, make) {

	if (typeof(name) === 'function') {
		make = name;
		name = 'Schema' + U.random_string(5);
	}

	// Remove schema
	if (make === null) {
		framework_builders.remove(name);
		return;
	}

	var schema = framework_builders.newschema(name);
	make && make.call(schema, schema);
	F.makesourcemap();
	return schema;
};

global.CLEANUP = function(stream, callback) {

	if (!callback)
		return new Promise(resolve => CLEANUP(stream, resolve));

	FINISHED(stream, function() {
		DESTROY(stream);
		if (callback) {
			callback();
			callback = null;
		}
	});
};

global.SUCCESS = function(success, value) {

	if (typeof(success) === 'function')
		return (err, value) => success(err, SUCCESS(err, value));

	var err;

	if (success instanceof Error) {
		err = (success + '');
		success = false;
	} else if (success instanceof framework_builders.ErrorBuilder) {
		if (success.hasError()) {
			err = success.output();
			success = false;
		} else
			success = true;
	} else if (success == null)
		success = true;

	SUCCESSHELPER.success = !!success;
	SUCCESSHELPER.value = value === SUCCESSHELPER ? value.value : value == null ? undefined : (value && value.$$schema ? value.$clean() : value);
	SUCCESSHELPER.error = err ? err : undefined;
	return SUCCESSHELPER;
};

global.DEBUG = false;
global.RELEASE = false;

var directory = U.$normalize(require.main ? Path.dirname(require.main.filename) : process.cwd());

// F.service() changes the values below:
var DATE_EXPIRES = new Date().add('y', 1).toUTCString();

const WEBSOCKET_COMPRESS = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
const WEBSOCKET_COMPRESS_OPTIONS = { windowBits: Zlib.Z_DEFAULT_WINDOWBITS };
var UIDGENERATOR = { types: {}, typesnumber: {} };

function UIDGENERATOR_DATE(date) {
	return Math.round((((date.getTime ? date.getTime() : date) - 1580511600000) / 1000 / 60));
}

function UIDGENERATOR_REFRESH() {

	var dt = UIDGENERATOR_DATE(NOW);

	UIDGENERATOR.date = dt + '';
	UIDGENERATOR.index = 1;

	F.uidc = U.random_text(1);

	if (!UIDGENERATOR.instance)
		UIDGENERATOR.instance = U.random_string(2);

	if (UIDGENERATOR.multiple) {
		for (var key in UIDGENERATOR.types)
			UIDGENERATOR.types[key] = 0;
	}

	if (UIDGENERATOR.multiplenumber) {
		for (var key in UIDGENERATOR.typesnumber)
			UIDGENERATOR.typesnumber[key] = 0;
	}
}

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
global.NOW = new Date();
global.THREAD = '';
global.isWORKER = false;
global.DATA = new QB.Controller(true);

(function(F) {

	F.$id = null; // F.id ==> property
	F.is5 = F.version = 5000;
	F.version_header = '5';
	F.version_node = process.version + '';
	F.syshash = (__dirname + '-' + Os.hostname() + '-' + Os.platform() + '-' + Os.arch() + '-' + Os.release() + '-' + Os.tmpdir() + JSON.stringify(process.versions)).md5();

	F.resources = {};      // Loaded resources
	F.connections = {};    // WebSocket connections
	F.schedules = {};      // Registered schedulers

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
		service: { redirect: 0, request: 0, file: 0, usage: 0 }
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
			view: 0,
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
			plain: 0,
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
	// F.path.fs = Fs;

})(global.F);

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

	CONF['security.txt'] = 'Contact: mailto:support@totaljs.com\nContact: https://www.totaljs.com/contact/';
	CONF.etag_version = '';
	CONF.directory_src = '/.src/';
	CONF.directory_bundles = '/bundles/';
	CONF.directory_controllers = '/controllers/';
	CONF.directory_templates = '/templates/';
	CONF.directory_views = '/views/';
	CONF.directory_definitions = '/definitions/';
	CONF.directory_plugins = '/plugins/';
	CONF.directory_temp = '/tmp/';
	CONF.directory_models = '/models/';
	CONF.directory_actions = '/actions/';
	CONF.directory_schemas = '/schemas/';
	CONF.directory_flowstreams = '/flowstreams/';
	CONF.directory_extensions = '/extensions/';
	CONF.directory_resources = '/resources/';
	CONF.directory_public = '/public/';
	CONF.directory_modules = '/modules/';
	CONF.directory_logs = '/logs/';
	CONF.directory_tests = '/tests/';
	CONF.directory_databases = '/databases/';
	CONF.directory_workers = '/workers/';
	CONF.directory_private = '/private/';
	CONF.directory_configs = '/configs/';
	CONF.directory_services = '/services/';
	CONF.directory_themes = '/themes/';
	CONF.directory_updates = '/updates/';

	// all HTTP static request are routed to directory-public
	CONF.static_url = '';
	CONF.static_url_script = '/js/';
	CONF.static_url_style = '/css/';
	CONF.static_url_image = '/img/';
	CONF.static_url_video = '/videos/';
	CONF.static_url_font = '/fonts/';
	CONF.static_url_download = '/download/';
	CONF.static_url_components = '/components.';
	CONF.static_accepts = { flac: true, jpg: true, jpeg: true, png: true, gif: true, ico: true, wasm: true, js: true, mjs: true, css: true, txt: true, xml: true, woff: true, woff2: true, otf: true, ttf: true, eot: true, svg: true, zip: true, rar: true, pdf: true, docx: true, xlsx: true, doc: true, xls: true, html: true, htm: true, appcache: true, manifest: true, map: true, ogv: true, ogg: true, mp4: true, mp3: true, webp: true, webm: true, swf: true, package: true, json: true, ui: true, md: true, m4v: true, jsx: true, heif: true, heic: true, ics: true, ts: true, m3u8: true, wav: true };

	// 'static-accepts-custom' = [],
	CONF.default_crypto_iv = Buffer.from(self.syshash).slice(0, 16);
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

})(global.CONF);


function Framework() {

	self.$bundling = true;
	self.versions = null;

	self.isLoaded = false;
	self.isWorker = true;
	self.isCluster = process.env.PASSENGER_APP_ENV ? false : require('cluster').isWorker;

	self.routes = {
		all: {},
		sitemap: null,
		api: {},
		web: [],
		webcached: {},
		system: {},
		files: [],
		filesfallback: null,
		filescached: {},
		cors: [],
		corsall: false,
		websockets: [],
		websocketscached: {},
		middleware: {},
		redirects: {},
		resize: {},
		request: [],
		request_dynamic: [],
		request_static: [],
		request_socket: [],
		views: {},
		merge: {},
		mapping: {},
		packages: {},
		blocks: {},
		proxies: [],
		resources: {}
	};

	self.modificators = null;
	self.modificators2 = null;
	global.MODS = self.modules = {};
	global.PLUGINS = self.plugins = {};
	self.models = {};
	self.builds = {};
	self.transformations = {};
	self.extensions = [];
	self.sources = {};
	self.operations = {};
	self.tasks = {};
	self.controllers = {};
	self.dependencies = {};
	self.pending = [];
	self.components = { has: false, css: false, js: false, views: {}, instances: {}, version: null, links: '', groups: {}, files: {} };
	self.tests = [];
	self.convertors = {};
	self.errors = [];
	self.timeouts = [];
	self.server = null;
	self.port = 0;
	self.ip = '';
	self.workers = {};
	self.workerspool = {};
	self.sessions = {};
	self.flows = {};
	self.status = {};
	self.openclients = {};
	self.ui = {};
	self.jsonschemas = {};
	self.actions = {};
	self.tms = { subscribers: {}, publish_cache: {}, subscribe_cache: {}, publishers: {}, calls: {} };
	self.databases = {};
	self.directory = HEADERS.workers2.cwd = HEADERS.workers.cwd = HEADERS.worker_threads.cwd = directory;
	self.isLE = Os.endianness ? Os.endianness() === 'LE' : true;
	self.isHTTPS = false;

	// Fix for workers crash (port in use) when debugging main process with --inspect or --debug
	// See: https://github.com/nodejs/node/issues/14325 and https://github.com/nodejs/node/issues/9435
	for (var i = 0; i < process.execArgv.length; i++) {
		// Setting inspect/debug port to random unused
		if ((/inspect|debug/).test(process.execArgv[i])) {
			process.execArgv[i] = '--inspect=0';
			break;
		}
	}

	HEADERS.workers.execArgv = process.execArgv;

	// It's hidden
	// self.waits = {};

	// intialize cache
	self.cache = new FrameworkCache();
	self.path = global.PATH = new FrameworkPath();

	self._request_check_redirect = false;
	self._request_check_referer = false;
	self._request_check_POST = false;
	self._request_check_robot = false;
	self._request_check_mobile = false;
	self._request_check_proxy = 0;
	self._length_request_middleware = 0;
	self._length_request_middleware_dynamic = 0;
	self._length_request_middleware_static = 0;
	self._length_request_middleware_socket = 0;
	self._length_files = 0;
	self._length_wait = 0;
	self._length_themes = 0;
	self._length_cors = 0;
	self._length_subdomain_web = 0;
	self._length_subdomain_websocket = 0;
	self._length_convertors = 0;

	self.isTheme = false;
	self.isWindows = Os.platform().substring(0, 3).toLowerCase() === 'win';

	self.$events = {};
	self.commands = { reload_preferences: [loadpreferences] };
}

// ======================================================
// PROTOTYPES
// ======================================================

Framework.prototype = {
	get datetime() {
		return global.NOW;
	},
	set datetime(val) {
		global.NOW = val;
	},
	get cluster() {
		return require('./cluster');
	},
	get clusterid() {
		return F.$id ? ('cluster_' + F.$id + '_') : '';
	},
	get id() {
		return F.$id;
	},
	set id(value) {
		CLUSTER_CACHE_SET.ID = value;
		CLUSTER_CACHE_REMOVE.ID = value;
		CLUSTER_CACHE_REMOVEALL.ID = value;
		CLUSTER_CACHE_CLEAR.ID = value;
		F.$id = value;
	}
};

var framework = new Framework();
global.framework = global.F = module.exports = framework;

global.CMD = function(key, a, b, c, d) {
	if (F.commands[key]) {
		for (var i = 0; i < F.commands[key].length; i++)
			F.commands[key][i](a, b, c, d);
	}
};

F.callback_redirect = function(url) {
	this.url = url;
};

var modules = { buffer: 1, child_process: 1, process: 1, fs: 1, events: 1, http: 1, https: 1, http2: 1, util: 1, net: 1, os: 1, path: 1, punycode: 1, readline: 1, repl: 1, stream: 1, string_decoder: 1, tls: 1, trace_events: 1, tty: 1, dgram: 1, url: 1, v8: 1, vm: 1, wasi: 1, worker_threads: 1, zlib: 1, crypto: 1 };

F.require = function(path) {
	if (path.startsWith('node:'))
		return require(path);
	return modules[path] ? require(path) : CONF.node_modules && CONF.node_modules[0] === '~' ? require(Path.join(CONF.node_modules.substring(1), path)) : require(Path.join(F.directory, CONF.node_modules, path));
};

F.dir = function(path) {
	F.directory = HEADERS.workers2.cwd = HEADERS.workers.cwd = HEADERS.worker_threads.cwd = path;
	directory = path;
};

F.runscript = function(filename) {
	F.Fs.readFile(filename, function(err, data) {
		if (data) {
			var scr = data.toString('utf8').trim();
			var fn;
			if (data) {
				try {
					fn = new Function('require', scr);
				} catch (e) {
					console.error(e);
				}
				fn && fn(require);
			}
		}
	});
};

F.debugger = function() {
	F.runscript(PATH.root('debugger.js'));
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

	var Console = require('console').Console;

	var path = PATH.root();

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

F.refresh = function() {

	NOW = new Date();

	F.$events.clear && EMIT('clear', 'temporary', F.temporary);
	F.temporary.path = {};
	F.temporary.range = {};
	F.temporary.views = {};
	F.temporary.other = {};
	F.temporary.exec = {};
	F.temporary.keys = {};
	global.$VIEWCACHE && global.$VIEWCACHE.length && (global.$VIEWCACHE = []);

	// Clears command cache
	Image.clear();

	for (var key in F.temporary.internal)
		if (!F.temporary.internal[key])
			delete F.temporary.internal[key];

	F.resources = {};
	F.$events.clear && EMIT('clear', 'dns');
	CMD('clear_dnscache');
};

F.prototypes = function(fn) {
	var proto = {};
	proto.Controller = Controller.prototype;
	proto.ErrorBuilder = framework_builders.ErrorBuilder.prototype;
	proto.HttpFile = framework_internal.HttpFile.prototype;
	proto.HttpRequest = PROTOREQ;
	proto.HttpResponse = PROTORES;
	proto.Image = framework_image.Image.prototype;
	proto.Message = Mail.Message.prototype;
	proto.MiddlewareOptions = MiddlewareOptions.prototype;
	proto.OperationOptions = framework_builders.OperationOptions.prototype;
	proto.SchemaOptions = framework_builders.SchemaOptions.prototype;
	proto.TaskOptions = framework_builders.TaskBuilder.prototype;
	proto.AuthOptions = framework_builders.AuthOptions.prototype;
	proto.Page = framework_builders.Page.prototype;
	proto.Pagination = framework_builders.Pagination.prototype;
	proto.RESTBuilder = framework_builders.RESTBuilder.prototype;
	proto.RESTBuilderResponse = framework_builders.RESTBuilderResponse.prototype;
	proto.UrlBuilder = framework_builders.UrlBuilder.prototype;
	proto.WebSocket = WebSocket.prototype;
	proto.WebSocketClient = WebSocketClient.prototype;
	fn.call(proto, proto);
};

global.ON = function(name, fn) {

	if (name === 'init' || name === 'ready' || name === 'load') {
		if (F.isLoaded) {
			fn.call(F);
			return;
		}
	} else if (name.indexOf('#') !== -1) {
		var arr = name.split('#');
		switch (arr[0]) {
			case 'middleware':
				F.temporary.ready[name] && fn.call(F);
				break;
			case 'component':
				F.temporary.ready[name] && fn.call(F);
				break;
			case 'model':
				F.temporary.ready[name] && fn.call(F, F.models[arr[1]]);
				break;
			case 'source':
				F.temporary.ready[name] && fn.call(F, F.sources[arr[1]]);
				break;
			case 'module':
				F.temporary.ready[name] && fn.call(F, F.modules[arr[1]]);
				break;
			case 'controller':
				F.temporary.ready[name] && fn.call(F, F.controllers[arr[1]]);
				break;
		}
	}

	if (CURRENT_OWNER)
		fn.$owner = CURRENT_OWNER;

	if (isWORKER && name === 'service' && !F.cache.interval)
		F.cache.init_timer();

	if (F.$events[name])
		F.$events[name].push(fn);
	else
		F.$events[name] = [fn];
};

global.EMIT = function(name, a, b, c, d, e, f, g) {

	var evt = F.$events[name];
	if (evt) {

		var clean = false;

		for (var i = 0; i < evt.length; i++) {
			if (evt[i].$once)
				clean = true;
			evt[i].call(F, a, b, c, d, e, f, g);
		}

		if (clean) {
			evt = evt.remove(n => n.$once);
			if (evt.length)
				F.$events[name] = evt;
			else
				F.$events[name] = undefined;
		}
	}
};

F.OFF = function(name, fn) {
	var evt = F.$events[name];
	if (evt) {

		if (fn == null) {
			delete F.$events[name];
			return;
		}

		evt = evt.remove(n => n === fn);
		if (evt.length)
			F.$events[name] = evt;
		else
			delete F.$events[name];
	}
};

F.$owner = function(val) {
	if (val)
		return CURRENT_OWNER = val;
	return CURRENT_OWNER;
};

Mail.use = function(smtp, options, callback) {

	if (typeof(options) === 'function') {
		callback = options;
		options = undefined;
	}

	Mail.try(smtp, options, function(err) {

		if (!err) {
			delete F.temporary.mail_settings;
			CONF.mail_smtp = smtp;
			CONF.mail_smtp_options = options;
		}

		if (callback)
			callback(err);
		else if (err)
			F.error(err, 'Mail.use()', null);
	});
};

F.routes_sort = function(type) {

	if (routes_sort_id) {
		clearTimeout(routes_sort_id);
		routes_sort_id = null;
	}

	F.routes.web.sort((a, b) => a.priority > b.priority ? -1 : a.priority < b.priority ? 1 : 0);
	F.routes.websockets.sort((a, b) => a.priority > b.priority ? -1 : a.priority < b.priority ? 1 : 0);

	var wcache = {};
	var cache = {};
	var length = F.routes.web.length;
	var url;
	var tmp;
	var key;

	for (var i = 0; i < length; i++) {

		var route = F.routes.web[i];
		var name = F.temporary.internal[route.controller];
		if (name)
			route.controller = name;

		// Missing subdomain routing
		key = route.method;
		tmp = wcache[key];
		if (!tmp)
			tmp = wcache[key] = {};

		var u = [];
		for (var j = 0; j < route.url.length; j++)
			u.push(route.url[j].replace(/\{.*?\}/g, '{}'));

		if (route.isWILDCARD)
			u.push('*');

		var k = u.join('/').replace(/\/\//g, '/');

		if (k.indexOf('{') !== -1)
			k = 'D';

		if (tmp[k])
			tmp[k].push(route);
		else
			tmp[k] = [route];
	}

	F.routes.webcached = wcache;

	for (var i = 0; i < length; i++) {
		var route = F.routes.web[i];
		if (route.isMOBILE || route.isUPLOAD || route.isXHR || route.isJSON || route.isSYSTEM || route.isXML || route.flags.indexOf('get') === -1)
			continue;
		url = route.url.join('/');
		route.isMOBILE_VARY = cache[url] === true;
	}

	(!type || type === 1) && F.routes.web.forEach(function(route) {
		var tmp = F.routes.web.findItem(item => item.hash === route.hash && item !== route);
		route.isUNIQUE = tmp == null;
	});

	wcache = {};
	length = F.routes.websockets.length;

	for (var i = 0; i < length; i++) {

		var route = F.routes.websockets[i];
		var name = F.temporary.internal[route.controller];
		if (name)
			route.controller = name;

		tmp = wcache;

		var u = [];
		for (var j = 0; j < route.url.length; j++)
			u.push(route.url[j].replace(/\{.*?\}/g, '{}'));

		if (route.isWILDCARD)
			u.push('*');

		var k = u.join('/').replace(/\/\//g, '/');

		if (k.indexOf('{') !== -1)
			k = 'D';

		if (tmp[k])
			tmp[k].push(route);
		else
			tmp[k] = [route];
	}

	F.routes.websocketscached = wcache;

	// Clears cache
	for (key in F.temporary.other) {
		if (key[0] === '1')
			delete F.temporary.other[key];
	}

	F.makesourcemap();
};

F.parseComponent = parseComponent;

function nosqlwrapper(name) {

	var key = 'nosql_' + name;
	var db = F.databases[key];
	if (db)
		return db;

	var onetime = name[0] === '~';
	var path = onetime ? name.substring(1) : PATH.databases(name + '.nosql');

	if (!onetime)
		PATH.verify('databases');

	if (!F.textdbworker && Worker.isMainThread && CONF.textdb_worker && F.port)
		F.textdbworker = require('./textdb-process').init(PATH.databases());

	var instance = require('./textdb-wrapper').make('nosql', F.textdbworker ? name : path, onetime, null, F.textdbworker);
	if (!onetime)
		F.databases[key] = instance;

	return instance;
}

global.CMSCOMPILER = function(html, widgets, used) {
	return require('./cms').compile(html, widgets, used);
};

global.NOSQL = function(name) {
	global.NOSQL = nosqlwrapper;
	return nosqlwrapper(name);
};

global.API = function(name, schema, data, $) {
	return Api.make(name, schema, data, $);
};

global.NEWAPI = function(name, callback) {
	Api.evaluate(name, callback);
};

F.stop = F.kill = function(signal) {

	if (F.isKilled)
		return;

	F.isKilled = true;

	if (!signal)
		signal = 'SIGTERM';

	for (var m in F.workers) {
		var worker = F.workers[m];
		try {
			worker && worker.kill && worker.kill(signal);
		} catch (e) {}
	}

	for (var m in F.threads) {
		var thread = F.threads[m];
		try {
			thread && thread.kill && thread.kill(signal);
		} catch (e) {}
	}

	EMIT('exit', signal);

	if (!F.isWorker && process.send && process.connected) {
		try {
			process.send('total:stop');
		} catch (e) {}
	}

	F.cache.stop();

	if (F.server) {
		F.server.setTimeout(1);
		F.server.close();
	}

	setTimeout(() => process.exit(1), 300);
};

global.PROXY = function(url, target, copypath, before, after, check, timeout) {

	if (typeof(check) === 'number') {
		timeout = check;
		check = null;
	}

	url = url.toLowerCase();

	if (target === null) {
		F.routes.proxies = F.routes.proxies.remove('url', url);
		F._request_check_proxy = F.routes.proxies.length;
		return;
	}

	if (typeof(copypath) == 'function') {
		after = before;
		before = copypath;
		copypath = null;
	}

	if ((/^(https|http):\/\//).test(target))
		target = Parser.parse(target);
	else
		target = { socketPath: target };

	if ((copypath === true || copypath === 'replace') && target.pathname.length > 1)
		copypath = 'extend';

	var obj = { url: url, uri: target, before: before, after: after, check: check, copypath: copypath, timeout: timeout ? (timeout / 1000) : 10 };

	if (target.href) {
		var index = target.href.indexOf('?');
		if (index !== -1)
			obj.query = target.href.substring(index + 1);
		obj.path = target.pathname[target.pathname.length - 1] === '/' ? target.pathname.substring(0, target.pathname.length - 1) : target.pathname;
	}

	F._request_check_proxy = F.routes.proxies.push(obj);
};

global.REDIRECT = function(host, newHost, withPath, permanent) {

	var external = host.startsWith('http://') || host.startsWith('https');
	if (external) {

		if (host[host.length - 1] === '/')
			host = host.substring(0, host.length - 1);

		if (newHost[newHost.length - 1] === '/')
			newHost = newHost.substring(0, newHost.length - 1);

		F.routes.redirects[host] = { url: newHost, path: withPath, permanent: permanent };
		F._request_check_redirect = true;
		return;
	}

	if (host[0] !== '/')
		host = '/' + host;

	var flags;

	if (withPath instanceof Array) {
		flags = withPath;
		withPath = permanent === true;
	} else if (permanent instanceof Array) {
		flags = permanent;
		withPath = withPath === true;
	} else
		withPath = withPath === true;

	permanent = withPath;

	if (U.isStaticFile(host)) {
		F.routefile(host, function(req, res) {
			if (newHost.startsWith('http://') || newHost.startsWith('https://'))
				res.redirect(newHost, permanent);
			else
				res.redirect(newHost[0] !== '/' ? '/' + newHost : newHost, permanent);
		});
	} else {
		ROUTE(host, function() {
			if (newHost.startsWith('http://') || newHost.startsWith('https://')) {
				this.redirect(newHost + this.href(), permanent);
				return;
			}
			if (newHost[0] !== '/')
				newHost = '/' + newHost;
			this.redirect(newHost + this.href(), permanent);
		}, flags);
	}
};

global.SCHEDULE = function(date, repeat, fn) {

	if (fn === undefined) {
		fn = repeat;
		repeat = false;
	}

	var type = typeof(date);
	var cron = null;

	if (type === 'string') {

		if (date.indexOf(' ') !== -1) {
			cron = require('./cron').make(date);
		} else {
			date = date.parseDate().toUTC();
			repeat && date < NOW && (date = date.add(repeat));
		}

	} else if (type === 'number')
		date = new Date(date);

	var sum = cron ? 0 : date.getTime();

	if (repeat)
		repeat = repeat.replace('each', '1');

	var id = U.GUID(5);
	var item = { id: id, expire: sum, cron: cron, fn: fn, repeat: repeat, owner: CURRENT_OWNER };
	F.schedules[id] = item;

	item.remove = function() {

		if (item.cron)
			delete item.cron;

		delete F.schedules[id];
	};

	item.exec = function() {
		item.fn();
	};

	return item;
};

global.CORS = function(url, flags, credentials) {

	var route = {};

	if (url && (/^http(s)?:\/\//).test(url)) {
		F.routes.corsall = true;
		F.routes.corsallorigins = url.split(',').trim();
		PERF.OPTIONS = true;
		route.url = '*';
		route.hash = 1;
		route.remove = function() {
			F.routes.corsall = false;
			if (!F._length_cors)
				delete PERF.OPTIONS;
		};
		return route;
	}

	F.routes.corsallorigins = null;

	if (!arguments.length) {
		F.routes.corsall = true;
		PERF.OPTIONS = true;
		route.url = '*';
		route.hash = 1;
		route.remove = function() {
			F.routes.corsall = false;
			if (!F._length_cors)
				delete PERF.OPTIONS;
		};
		return route;
	}

	if (flags === true) {
		credentials = true;
		flags = null;
	}

	var origin = [];
	var methods = [];
	var headers = [];
	var age;
	var id;

	if (flags instanceof Array) {
		for (var i = 0, length = flags.length; i < length; i++) {
			var flag = flags[i];
			var type = typeof(flag);

			if (type === 'string')
				flag = flag.toLowerCase();
			else if (type === 'number') {
				age = flag;
				continue;
			}

			if (type === 'boolean' || flag.startsWith('credential')) {
				credentials = true;
				continue;
			}

			if (flag.substring(0, 2) === '//') {
				origin.push(flag.substring(2));
				continue;
			}

			if (flag.startsWith('http://') || flag.startsWith('https://')) {
				origin.push(flag.substring(flag.indexOf('/') + 2));
				continue;
			}

			if (flag.substring(0, 3) === 'id:') {
				id = flag.substring(3);
				continue;
			}

			switch (flag) {
				case 'post':
				case 'put':
				case 'delete':
				case 'options':
				case 'patch':
				case 'head':
				case 'get':
					methods.push(flag.toUpperCase());
					break;
				default:
					headers.push(flags[i].toLowerCase());
					break;
			}
		}
	}

	if (!methods.length)
		methods = 'POST,PUT,GET,DELETE,PATCH,GET,HEAD'.split(',');

	if (!origin.length && CONF.default_cors)
		origin = CONF.default_cors;

	route.isWILDCARD = url.lastIndexOf('*') !== -1;

	var index = url.indexOf('{');
	if (index !== -1) {
		route.isWILDCARD = true;
		url = url.substring(0, index);
	}

	if (route.isWILDCARD)
		url = url.replace('*', '');

	if (url[url.length - 1] !== '/')
		url += '/';

	url = framework_internal.preparepath(framework_internal.encodeUnicodeURL(url.trim()));
	route.hash = url.hash(true);
	route.owner = CURRENT_OWNER;
	route.url = framework_internal.routesplitcreate(url);
	route.origin = origin.length ? origin : null;
	route.methods = methods.length ? methods : null;
	route.headers = headers.length ? headers : null;
	route.credentials = credentials;
	route.age = age || CONF.default_cors_maxage;

	var e = F.routes.cors.findItem('hash', route.hash);
	if (e) {

		// Extends existing
		if (route.origin && e.origin)
			corsextend(route.origin, e.origin);
		else if (e.origin && !route.origin)
			e.origin = null;

		if (route.methods && e.methods)
			corsextend(route.methods, e.methods);

		if (route.headers && e.headers)
			corsextend(route.headers, e.headers);

		if (route.credentials && !e.credentials)
			e.credentials = true;

		if (route.isWILDCARD && !e.isWILDCARD)
			e.isWILDCARD = true;

	} else {
		F.routes.cors.push(route);
		route.id = id;
	}

	F._length_cors = F.routes.cors.length;
	F.routes.cors.sort(function(a, b) {
		var al = a.url.length;
		var bl = b.url.length;
		return al > bl ? - 1 : al < bl ? 1 : a.isWILDCARD && b.isWILDCARD ? 1 : 0;
	});

	PERF.OPTIONS = true;

	route.remove = function() {
		var index = F.routes.cors.indexOf(this);
		if (index !== -1) {
			F.routes.cors.splice(index, 1);
			F._length_cors = F.routes.cors.length;
			if (!F._length_cors && !F.routes.corsall)
				delete PERF.OPTIONS;
		}
	};

	return route;
};

function corsextend(a, b) {
	for (var i = 0; i < a.length; i++)
		b.indexOf(a[i]) === -1 && b.push(a[i]);
}

var routes_sort_worker = function() {
	routes_sort_id = null;
	F.routes_sort();
	F.makesourcemap();
};

var routes_sort_id;

global.ROUTE = Routing.route;

global.MERGE = function(url) {

	F.temporary.other['merge_' + url] = 1;

	var tmp = F.$version(url);
	if (tmp !== 'auto')
		url = tmp;

	url = framework_internal.preparepath(url);

	var arr = [];

	for (var i = 1; i < arguments.length; i++) {

		var items = arguments[i];
		if (!(items instanceof Array))
			items = [items];

		for (let fn of items)
			arr.push(fn);
	}

	if (url[0] !== '/')
		url = '/' + url;

	var key = createTemporaryKey(url);
	var filename = PATH.temp(F.clusterid + 'merged_' + key);
	F.routes.merge[url] = { filename: filename.replace(/\.(js|css)$/g, ext => '.min' + ext), files: arr, auto: tmp === 'auto' };
	Fs.unlink(F.routes.merge[url].filename, NOOP);
	delete F.temporary.notfound[key];
};

global.PAUSE = function(value) {
	F.paused = !!value;
};

global.NEWMIDDLEWARE = function(name, fn, assign, first) {

	var route;

	// Removes middleware
	if (fn == null) {

		delete F.routes.middleware[name];
		delete F.dependencies['middleware_' + name];

		var index = F.routes.request.indexOf(name);
		if (index !== -1) {
			F.routes.request.splice(index, 1);
			F._length_request_middleware = F.routes.request.length;
		}

		index = F.routes.request_static.indexOf(name);
		if (index !== -1) {
			F.routes.request_static.splice(index, 1);
			F._length_request_middleware_static = F.routes.request_static.length;
		}

		index = F.routes.request_dynamic.indexOf(name);
		if (index !== -1) {
			F.routes.request_dynamic.splice(index, 1);
			F._length_request_middleware_dynamic = F.routes.request_dynamic.length;
		}

		index = F.routes.request_socket.indexOf(name);
		if (index !== -1) {
			F.routes.request_socket.splice(index, 1);
			F._length_request_middleware_socket = F.routes.request_socket.length;
		}

		for (var i = 0; i < F.routes.web.length; i++) {
			route = F.routes.web[i];
			if (route.middleware) {
				index = route.middleware.indexOf(name);
				if (index !== -1)
					route.middleware.splice(index, 1);
				if (!route.middleware.length)
					route.middleware = null;
			}
		}

		for (var i = 0; i < F.routes.files.length; i++) {
			route = F.routes.files[i];
			if (route.middleware) {
				index = route.middleware.indexOf(name);
				if (index !== -1)
					route.middleware.splice(index, 1);
				if (!route.middleware.length)
					route.middleware = null;
			}
		}

		for (var i = 0; i < F.routes.websockets.length; i++) {
			route = F.routes.websockets[i];
			if (route.middleware) {
				index = route.middleware.indexOf(name);
				if (index !== -1)
					route.middleware.splice(index, 1);
				if (!route.middleware.length)
					route.middleware = null;
			}
		}

		return;
	}

	fn.$owner = CURRENT_OWNER;
	F.routes.middleware[name] = fn;
	F.dependencies['middleware_' + name] = fn;
	assign && F.use(name, '', assign, first);
};

F.initwebsocket = function() {
	if (((F.routes.websockets.length && CONF.allow_websocket) || (F._request_check_proxy)) && F.server) {
		F.server.on('upgrade', F.$upgrade);
		F.initwebsocket = null;
	}
};

global.LOCALIZE = function(callback) {
	DEF.onLocale = callback;
};

F.$filelocalize = function(req, res, nominify) {

	// options.filename
	// options.code
	// options.callback
	// options.headers
	// options.download

	if (CONF.secret_encryption && CONF.allow_static_encryption)
		req.$bodyencrypt = true;

	DEF.onLocale && (req.$language = DEF.onLocale(req, res, req.isStaticFile));

	var key = 'locate_' + (req.$language ? req.$language : 'default') + '_' + (req.$key || req.url);
	var output = F.temporary.other[key];

	if (output) {
		if (!F.$notModified(req, res, output.$mtime)) {
			HEADERS.responseLocalize['Last-Modified'] = output.$mtime;
			res.options.body = output;
			res.options.type = U.getContentType(req.extension);
			res.$text();
		}
		return;
	}

	var filename = (res.options ? res.options.filename : null) || DEF.onMapping(req.uri.pathname, req.uri.pathname, true, true);

	Fs.readFile(filename, function(err, content) {

		if (err) {
			if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
				res.throw404();
			return;
		}

		content = framework_internal.markup(TRANSLATOR(req.$language, framework_internal.modificators(content.toString(ENCODING), filename, 'static')), filename);

		Fs.lstat(filename, function(err, stats) {

			var mtime = stats.mtime.toUTCString();

			if (!res.nocompress && CONF.allow_compile_html && CONF.allow_compile && !nominify && (req.extension === 'html' || req.extension === 'htm'))
				content = framework_internal.compile_html(content, filename, true);

			if (!DEBUG) {
				F.temporary.other[key] = Buffer.from(content);
				F.temporary.other[key].$mtime = mtime;
				if (F.$notModified(req, res, mtime))
					return;
			}

			HEADERS.responseLocalize['Last-Modified'] = mtime;
			res.options.body = content;
			res.options.type = U.getContentType(req.extension);
			res.options.headers = HEADERS.responseLocalize;
			res.$text();

		});
	});
};

F.$notModified = function(req, res, date) {
	if (date === req.headers['if-modified-since']) {
		HEADERS.responseNotModified['Last-Modified'] = date;
		res.success = true;
		res.writeHead(304, HEADERS.responseNotModified);
		res.end();
		F.stats.response.notmodified++;
		req.bodydata = null;
		return true;
	}
};

F.error = function(err, name, uri) {
	if (!arguments.length)
		return F.errorcallback;
	err && DEF.onError(err, name, uri);
};

F.errorcallback = function(err) {
	err && F.error(err);
};

global.MODIFY = function(filename, fn) {

	if (typeof(filename) === 'function') {
		fn = filename;
		filename = null;
	}

	if (filename) {
		if (!F.modificators2)
			F.modificators2 = {};
		if (F.modificators2[filename])
			F.modificators2[filename].push(fn);
		else
			F.modificators2[filename] = [fn];
	} else {
		if (!F.modificators)
			F.modificators = [];
		F.modificators.push(fn);
	}

	fn.$owner = CURRENT_OWNER;
};

F.$bundle = function(callback, skip) {

	if (skip) {
		callback();
		return;
	}

	try {
		if (Fs.readFileSync('bundles.debug')) {
			F.isBundle = true;
			F.directory = HEADERS.workers.cwd = directory = PATH.root(CONF.directory_src);
			callback();
			return;
		}
	} catch (e) {}

	var bundledir = PATH.root(CONF.directory_bundles);

	var makebundle = function() {

		var arr = Fs.readdirSync(bundledir);
		var url = [];

		for (var i = 0; i < arr.length; i++) {
			if (arr[i].endsWith('.url'))
				url.push(arr[i]);
		}

		url.wait(function(item, next) {
			var filename = PATH.root(CONF.directory_bundles) + item.replace('.url', '.bundle');
			var link = Fs.readFileSync(PATH.root(CONF.directory_bundles) + item).toString(ENCODING).trim();
			DOWNLOAD(link, filename, function(err) {
				err && F.error(err, 'Bundle: ' + link);
				next();
			});
		}, function() {
			require('./bundles').make(function() {
				F.isBundle = true;
				F.directory = HEADERS.workers.cwd = directory = PATH.root(CONF.directory_src);
				callback();
			});
		});
	};

	try {
		Fs.statSync(bundledir);
		if (F.$bundling) {
			makebundle();
			return;
		} else {
			F.isBundle = true;
			F.directory = HEADERS.workers.cwd = directory = PATH.root(CONF.directory_src);
		}
	} catch(e) {}
	callback();
};

function tmsrefresh_delay() {
	setTimeout2('tmsrefresh', tmsrefresh, 1000);
}

function tmsrefresh(client) {

	if (F.tms.socket) {

		var subscribed = [];
		var published = [];

		for (var key in F.tms.publish_cache) {
			var schema = F.jsonschemas[F.tms.publish_cache[key]];
			published.push({ id: key, schema: schema });
		}

		for (var key in F.tms.subscribe_cache) {
			var schema = F.jsonschemas[F.tms.subscribe_cache[key]];
			subscribed.push({ id: key, schema: schema });
		}

		var calls = [];
		for (var key in F.tms.calls)
			calls.push({ id: key, schema: F.jsonschemas[F.tms.calls[key].schema] });

		var msg = { type: 'meta', name: CONF.name, subscribe: subscribed, publish: published, subscribers: Object.keys(F.tms.subscribers), call: calls };
		if (client)
			client.send(msg);
		else
			F.tms.socket.send(msg);
	}
}

function tmscontroller() {

	var $ = this;

	F.tms.socket = $;

	$.autodestroy(function() {
		F.tms.socket = null;
	});

	$.on('open', function(client) {

		if (TMSBLOCKED[client.ip] > 5) {
			client.close(4001);
			return;
		}

		if (CONF.secret_tms) {
			var token = client.headers['x-token']; // || client.query.token;
			if (token != CONF.secret_tms) {
				if (TMSBLOCKED[client.ip])
					TMSBLOCKED[client.ip]++;
				else
					TMSBLOCKED[client.ip] = 1;
				client.close(4001);
				return;
			}
		}

		delete TMSBLOCKED[client.ip];
		F.tms.publishers = {};
		client.tmsready = true;
		tmsrefresh(client);
	});

	$.on('message', function(client, msg) {

		// msg.type {String}
		// msg.data {Object}

		if (client.tmsready) {
			if (msg.type === 'ping') {
				msg.type = 'pong';
				client.send(msg);
			} else if (msg.type === 'subscribe' && msg.id) {
				F.stats.performance.subscribe++;
				var schema = F.tms.subscribe_cache[msg.id];
				if (schema) {
					JSONSCHEMA(schema, msg.data, function(err, response) {
						if (!err)
							SUBSCRIBE(msg.id, response, client);
					});
				}
			} else if (msg.type === 'subscribers' && msg.subscribers instanceof Array) {
				F.tms.publishers = {};
				for (var i = 0; i < msg.subscribers.length; i++)
					F.tms.publishers[msg.subscribers[i]] = 1;
			} else if (msg.type === 'call' && msg.id) {
				var tmp = F.tms.calls[msg.id];
				if (tmp) {
					F.stats.performance.call++;
					JSONSCHEMA(tmp.schema, msg.data, function(err, response) {
						if (err) {
							msg.data = err instanceof ErrorBuilder ? err._prepare().items : err.toString();
							msg.error = true;
							client.send(msg);
						} else {
							tmp.callback(response, function(err, response) {
								if (err) {
									msg.error = true;
									if (err instanceof ErrorBuilder)
										msg.data = err._prepare().items;
									else
										msg.data = [{ error: err + '' }];
								} else {
									msg.success = true;
									msg.data = response;
								}
								if (client && !client.isClosed)
									client.send(msg);
							}, client);
						}
					});
				} else {
					msg.error = true;
					msg.data = new ErrorBuilder.push(404)._prepare().items;
					client.send(msg);
				}
			}
		}
	});
}

F.serverless = function(req, res, callback, types, cwd) {

	if (!cwd)
		cwd = process.env.CWD || process.cwd();

	if (cwd && cwd[0] === '.' && cwd.length < 4)
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));
	else if (cwd)
		F.directory = directory = U.$normalize(cwd);
	else if (process.env.istotaljsworker)
		F.directory = process.cwd();
	else if ((/\/scripts\/.*?.js/).test(process.argv[1]))
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));

	if (typeof(types) === 'string')
		types = types.split(/\s|,/).trim();

	if (!types)
		types = ['nobundles', 'nopackages', 'nocomponents', 'nothemes'];

	if (cwd && cwd[0] === '.' && cwd.length < 4)
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));
	else if (cwd)
		F.directory = directory = U.$normalize(cwd);
	else if (process.env.istotaljsworker)
		F.directory = process.cwd();
	else if ((/\/scripts\/.*?.js/).test(process.argv[1]))
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));

	var isdebug = types instanceof Array ? types.indexOf('debug') !== -1 : false;

	global.totalserverless = true;
	F.isWorker = false;
	global.isWORKER = false;
	global.DEBUG = isdebug;

	var isno = true;

	if (types) {
		for (var i = 0; i < types.length; i++) {
			if (types[i].substring(0, 2) !== 'no') {
				isno = false;
				break;
			}
		}
	}

	var can = function(type) {
		if (!types)
			return true;
		if (types.indexOf('no' + type) !== -1)
			return false;
		return isno ? true : types.indexOf(type) !== -1;
	};

	F.$bundle(function() {

		configure_env();
		configure_configs();

		if (isTYPESCRIPT)
			SCRIPTEXT = '.ts';

		var noservice = true;
		for (var i = 0; i < types.length; i++) {
			switch(types[i]) {
				case 'service':
				case 'services':
					noservice = false;
					break;
			}
			if (!noservice)
				break;
		}

		F.cache.init(noservice);
		EMIT('init');

		F.$load(types, directory, function() {

			F.isLoaded = true;

			if (F.pending) {
				for (var fn of F.pending)
					fn();
				delete F.pending;
			}

			try {
				EMIT('load');
				EMIT('ready');
			} catch (err) {
				F.error(err, 'ON("load/ready")');
			}

			callback && callback();

			if (req && res) {
				extend_request(req);
				extend_response(res);
				setImmediate(F.listener, req, res);
			}

		});
	}, can('bundles'));

};

F.$load = function(types, targetdirectory, callback) {

	var arr = [];
	var dir = '';

	if (!targetdirectory)
		targetdirectory = directory;

	targetdirectory = '~' + targetdirectory;

	function listing(directory, level, output, extension, isTheme) {

		if (!existsSync(dir))
			return;

		if (!extension)
			extension = '.js';

		var files = Fs.readdirSync(directory);
		for (var o of files) {
			var isDirectory = Fs.statSync(Path.join(directory, o)).isDirectory();

			if (isDirectory && isTheme) {
				output.push({ name: o });
				continue;
			}

			if (isDirectory) {

				if (extension === '.package' && o.endsWith(extension)) {
					var name = o.substring(0, o.length - extension.length);
					output.push({ name: name[0] === '/' ? name.substring(1) : name, filename: Path.join(dir, o), is: true });
					continue;
				}

				level++;
				listing(Path.join(directory, o), level, output, extension);
				continue;
			}

			var ext = U.getExtension(o);
			if (ext)
				ext = '.' + ext;

			if (ext !== extension || o[0] === '.' || o.endsWith('-bk' + extension) || o.endsWith('_bk' + extension)) {
				if (extension === '.js' && isTYPESCRIPT) {
					extension = '.ts';
					if (ext !== extension || o[0] === '.' || o.endsWith('-bk' + extension) || o.endsWith('_bk' + extension))
						continue;
				} else
					continue;
			}

			if ((DEBUG && (/(-|_)+release/).test(o)) || (RELEASE && (/(-|_)+debug/).test(o)))
				continue;

			var name = (level ? U.$normalize(directory).replace(dir, '') + '/' : '') + o.substring(0, o.length - ext.length);
			output.push({ name: name[0] === '/' ? name.substring(1) : name, filename: Path.join(dir, name) + extension });
		}
	}

	try {
		// Reads name of resources
		F.temporary.internal.resources = Fs.readdirSync(PATH.resources()).map(n => n.substring(0, n.lastIndexOf('.')));
	} catch (e) {
		F.temporary.internal.resources = [];
	}

	var dependencies = [];
	var operations = [];
	var isPackage = targetdirectory.indexOf('.package') !== -1;
	var isNo = true;

	if (types) {
		for (var i = 0; i < types.length; i++) {
			if (types[i].substring(0, 2) !== 'no') {
				isNo = false;
				break;
			}
		}
	}

	var can = function(type) {

		if (types === EMPTYARRAY)
			return false;

		if (!types)
			return true;
		if (types.indexOf('no' + type) !== -1)
			return false;
		return isNo ? true : types.indexOf(type) !== -1;
	};

	if (can('modules') && CONF.directory_modules) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/modules/' : CONF.directory_modules);
			arr = [];
			listing(dir, 0, arr, '.js');
			arr.forEach(item => dependencies.push(next => install('module', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('models') && CONF.directory_models) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/models/' : CONF.directory_models);
			arr = [];
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('model', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('schemas') && CONF.directory_schemas) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/schemas/' : CONF.directory_schemas);
			arr = [];
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('schema', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('actions') && CONF.directory_actions) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/actions/' : CONF.directory_actions);
			arr = [];
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('action', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('definitions') && CONF.directory_definitions) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/definitions/' : CONF.directory_definitions);
			arr = [];
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('definition', item.name, item.filename, next)));
			resume();
		});
	}

	// Controllers are skipped for threads
	if (can('controllers') && !global.THREAD && CONF.directory_controllers) {
		operations.push(function(resume) {
			arr = [];
			dir = U.combine(targetdirectory, isPackage ? '/controllers/' : CONF.directory_controllers);
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('controller', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('extensions') && CONF.directory_extensions) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/extensions/' : CONF.directory_extensions);
			arr = [];
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install_extension(item.filename, next)));
			resume();
		});
	}

	if (can('plugins') && CONF.directory_plugins) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/plugins/' : CONF.directory_plugins);
			arr = [];
			Fs.readdir(dir, function(err, items) {

				if (err) {
					resume();
					return;
				}

				items.wait(function(plugin, next) {

					if (plugin.indexOf('.html') !== -1) {
						dependencies.push(next => install('plugin', plugin.replace(/\.html$/g, ''), Path.join(dir, plugin), next));
						next();
						return;
					}

					var pluginfilename = Path.join(dir, plugin, 'index.js');

					Fs.lstat(pluginfilename, function(err) {

						// The plugin does not exist
						if (err) {
							next();
							return;
						}

						dependencies.push(next => install('plugin', plugin, pluginfilename, next));

						var path = PATH.root('plugins/' + plugin + CONF.directory_definitions);
						U.ls(path, function(items) {

							if (items) {
								items.forEach(function(item) {
									if (item.substring(item.length - 3) === SCRIPTEXT)
										dependencies.push(next => install('definition', U.getName(item).replace(/\.js$/i, ''), item, next));
								});
							}

							path = PATH.root('plugins/' + plugin + CONF.directory_operations);
							U.ls(path, function(items) {

								if (items) {
									items.forEach(function(item) {
										if (item.substring(item.length - 3) === SCRIPTEXT)
											dependencies.push(next => install('operation', U.getName(item).replace(/\.js$/i, ''), item, next));
									});
								}

								path = PATH.root('plugins/' + plugin + CONF.directory_actions);
								U.ls(path, function(items) {

									if (items) {
										items.forEach(function(item) {
											if (item.substring(item.length - 3) === SCRIPTEXT)
												dependencies.push(next => install('action', U.getName(item).replace(/\.js$/i, ''), item, next));
										});
									}

									path = PATH.root('plugins/' + plugin + CONF.directory_schemas);
									U.ls(path, function(items) {

										if (items) {
											items.forEach(function(item) {
												if (item.substring(item.length - 3) === SCRIPTEXT)
													dependencies.push(next => install('schema', U.getName(item).replace(/\.js$/i, ''), item, next));
											});
										}

										path = PATH.root('plugins/' + plugin + CONF.directory_tasks);
										U.ls(path, function(items) {

											if (items) {
												items.forEach(function(item) {
													if (item.substring(item.length - 3) === SCRIPTEXT)
														dependencies.push(next => install('task', U.getName(item).replace(/\.js$/i, ''), item, next));
												});
											}

											path = PATH.root('plugins/' + plugin + CONF.directory_flowstreams);
											U.ls(path, function(items) {
												if (items.length) {
													dependencies.push(function(next) {
														require('./flow').init(path);
														next();
													});
												}
												next();

											});

										});
									});
								});
							});
						});

					});
				}, resume);
			});
		});
	}

	if (can('flowstreams') && CONF.directory_flowstreams) {
		operations.push(function(resume) {
			dir = U.combine(targetdirectory, isPackage ? '/flowstreams/' : CONF.directory_flowstreams);
			arr = [];
			listing(dir, 0, arr, '.flow');
			arr.length && dependencies.push(function(next) {
				require('./flow').init(dir);
				next();
			});
			resume();
		});
	}

	var thread = global.THREAD;
	if (thread) {

		// Updates PREF file
		PREFFILE = PREFFILE.replace('.json', '_' + thread + '.json');

		operations.push(function(resume) {
			arr = [];
			dir = '/threads/' + thread;

			configure_env(dir + '/.env');
			configure_configs(dir + '/config');
			if (isTYPESCRIPT)
				SCRIPTEXT = '.ts';

			dir = U.combine(targetdirectory, '/threads/' + thread);
			listing(dir, 0, arr);
			arr.forEach(item => dependencies.push(next => install('thread', item.name, item.filename, next)));
			resume();
		});
	}

	if (can('preferences')) {
		operations.push(function(resume) {
			if (DEF.onPrefLoad)
				loadpreferences(resume);
			else
				resume();
		});
	}

	operations.async(function() {
		var old = DEF.onPrefLoad;
		dependencies.async(function() {
			types && types.indexOf('service') === -1 && F.cache.stop();
			F.routes_sort();
			if (DEF.onPrefLoad === old)
				callback && callback();
			else
				loadpreferences(callback);
		});
	});
};

function loadpreferences(callback) {
	DEF.onPrefLoad(function(value) {
		if (value) {
			for (var key in value)
				F.pref[key] = global.PREF[key] = value[key];
		}
		callback && callback();
	});
}

function internal_next(next) {
	if (F.paused)
		setTimeout(internal_next, 100, next);
	else
		setImmediate(next);
}

function install_extension(filename, next) {
	F.Fs.readFile(filename, function(err, buffer) {
		if (buffer) {
			NEWEXTENSION(buffer.toString('utf8'), function(err) {
				err && F.error(err, 'Extension: ' + err);
				next();
			});
		} else
			next();
	});
}

function install(type, name, filename, next) {

	var key = type + '_' + name;
	var files;

	if (type === 'plugin' && filename.indexOf('.html') !== -1) {

		var code = F.Fs.readFileSync(filename).toString('utf8');
		var index = 0;
		var fileid = filename.makeid();
		files = {};

		while (true) {
			index = code.indexOf('<file ', index);
			if (index === -1) {
				break;
			} else {
				var tmp = code.indexOf('>', index + 8);
				var end = code.indexOf('</file>', tmp);
				var tmpfilename = code.substring(index + 8, tmp).trim();
				var body = code.substring(tmp + 1, end).trim();
				tmp = tmpfilename.indexOf('"');
				tmpfilename = tmpfilename.substring(tmp + 1, tmpfilename.lastIndexOf('"'));
				files[tmpfilename] = PATH.tmp('plugin_' + fileid + '_' + tmpfilename);
				F.Fs.writeFileSync(files[tmpfilename], body);
				code = code.substring(0, index) + code.substring(end + 9);
			}
		}

		var parsed = code.parseComponent({ be: '<script total>' });
		code = parsed.be || '';
		filename = PATH.tmp('plugin_' + fileid + '.js');
		F.Fs.writeFileSync(filename, cleancodetabs(code));
	}

	var m = require(filename);
	var opt = CONF[key];

	CURRENT_OWNER = key;
	CURRENT_CONTROLLER = '';
	F.dependencies[key] = m;

	switch (type) {
		case 'plugin':
			m.id = name;
			F.plugins[name] = m;
			m.files = files;
			break;
		case 'module':
			if (m.id)
				F.modules[m.id] = m;
			m.id = name;
			F.modules[name] = m;
			break;
		case 'controller':
			CURRENT_CONTROLLER = name;
			m.id = name;
			F.controllers[name] = m;
			break;
	}

	if (m.install) {
		m.install(opt);
		delete m.install;
	}

	if (type !== 'model' && type !== 'schema' && type !== 'action' && type !== 'middleware' && type !== 'operation' && type !== 'task' && type !== 'definition')
		F.routes_sort();

	next && internal_next(next);
	F.temporary.ready[key] = NOW;
	EMIT(key, m);
	EMIT('install', type, name, m);
}

/**
 * Register internal mapping (e.g. Resource)
 * @param {String} path
 * @return {Framework}
 */
F.register = function(path) {

	var key;
	var extension = '.' + U.getExtension(path);
	var name = U.getName(path);
	var c = path[0];

	if (c === '@')
		path = PATH.package(path.substring(1));
	else if (c === '=') {
		if (path[1] === '?')
			PATH.themes(CONF.default_theme + path.substring(2));
		else
			path = PATH.themes(path.substring(1));
	}

	switch (extension) {
		case '.resource':
			key = name.replace(extension, '');
			if (F.routes.resources[key])
				F.routes.resources[key].push(path);
			else
				F.routes.resources[key] = [path];
			// clears cache
			delete F.resources[key];
			break;

		default:
			throw new Error('Not supported registration type "' + extension + '".');
	}
};

var BUILDERRORS = {};

function appenderror(err, name, uri) {
	var obj = { error: err, name: name, url: uri, date: NOW };
	if (F.errors.push(obj) > 5)
		F.errors.shift();
	EMIT('error', obj);
}

/**
 * Error handler
 * @param {Error} err
 * @param {String} name
 * @param {Object} uri URI address, optional.
 * @return {Framework}
 */
DEF.onError = function(err, name, uri) {

	NOW = new Date();

	if (uri) {
		if (typeof(uri) !== 'string')
			uri = Parser.format(uri);
	}

	F.stats.error++;

	if (F.buildserrorhandling && err.stack) {
		var str = (err.stack.split('\n')[1] || '').trim();
		if (str && str.lastIndexOf('.build.js') !== -1) {

			var index = str.lastIndexOf('(');
			var filename = str.substring(index + 1, str.length - 1).trim().replace(/^at\s/, '');
			var key = filename;

			if (BUILDERRORS[key]) {
				console.log(BUILDERRORS[key]);
				appenderror(BUILDERRORS[key], name, uri);
				return;
			}

			index = filename.indexOf(':', filename.length - 20);
			var info = filename.substring(index + 1).split(':');
			filename = filename.substring(0, index);

			info[0] = +info[0];
			info[1] = +info[1];

			var buildname = U.getName(filename).replace(/\.js/g, '');

			Fs.readFile(filename, function(e, response) {

				if (e) {
					// unhandled error
					return;
				}

				var lines = response.toString('utf8').split('\n');

				var f = info[0];
				var name;
				var minus = 1;

				while (f > 0) {

					var line = lines[f--].trim();

					if (line.substring(0, 7) === '//@code') {
						minus = f + 1;
						continue;
					}

					if (line.substring(0, 9) === '//@build ') {
						// name
						name = line.substring(9).trim();
						minus++;
						break;
					}
				}

				var msg = 'ERROR ======= ' + (NOW.format('yyyy-MM-dd HH:mm:ss')) + ': ERROR builds/' + buildname +  ' ' + name + ' line: ' + (info[0] - minus) + ' "' + err.message + '"' + (uri ? (' (' + uri + ')') : '');
				BUILDERRORS[key] = msg;
				console.log(msg);
				appenderror(msg, name, uri);
			});

			return;
		}
	}

	appenderror(err.stack ? err.stack : err, name, uri);

	if (!name && err.name)
		name = err.name;

	console.log('ERROR ======= ' + (NOW.format('yyyy-MM-dd HH:mm:ss')) + ': ' + (name ? name + ' ---> ' : '') + (err + '') + (uri ? (' (' + uri + ')') : ''), err.stack ? err.stack : '');
};

DEF.onCSRFcreate = function(req) {
	var data = [req.ip, (req.headers['user-agent'] || '').hash(true), NOW.add(CONF.default_csrf_maxage).getTime()];
	return CONF.secret_csrf ? JSON.stringify(data).encrypt(CONF.secret_csrf) : '';
};

DEF.onCSRFcheck = function(req) {
	if (CONF.secret_csrf) {
		var token = req.headers['x-csrf-token'] || req.query.csrf;
		var is = false;
		if (token && token.length > 10) {
			var data = token.decrypt(CONF.secret_csrf);
			if (data)
				data = data.parseJSON();
			is = data && data[0] === req.ip && data[2] >= NOW.getTime() && data[1] === (req.headers['user-agent'] || '').hash(true) ? true : false;
		}
		return is;
	}
	return true;
};

/*
	Authorization handler
	@req {Request}
	@res {Response} OR {WebSocketClient}
	@flags {String array}
	@callback {Function} - @callback(Boolean), true is [authorize]d and false is [unauthorize]d
*/
DEF.onAuthorize = null;

/*
	Sets the current language for the current request
	@req {Request}
	@res {Response} OR {WebSocketClient}
	@return {String}
*/
DEF.onLocale = null;

/**
 * Sets theme to controller
 * @controller {Controller}
 * @return {String}
 */
DEF.onTheme = null;

/*
	Versioning static files (this delegate call LESS CSS by the background property)
	@name {String} :: name of static file (style.css or script.js)
	return {String} :: return new name of static file (style-new.css or script-new.js)
*/
DEF.onVersion = null;

/**
 * On mapping static files
 * @param {String} url
 * @param {String} def Default value.
 * @return {String}
 */
DEF.onMapping = function(url, def, ispublic, encode) {

	if (url[0] !== '/')
		url = '/' + url;

	var tmp = url;

	if (CONF.default_root)
		tmp = tmp.substring(CONF.default_root.length - 1);

	// component files
	switch(tmp[1]) {
		case '~':
			var index = tmp.indexOf('/', 2);
			var name = tmp.substring(2, index);
			return F.components.files[name] && F.components.files[name][tmp.substring(index + 1)] ? (PATH.temp() + tmp.substring(1)) : null;
		case '_':
			var index = tmp.indexOf('/', 2);
			var name = tmp.substring(2, index);
			var filename = tmp.substring(index + 1);
			if (F.plugins[name])
				return F.plugins[name].files ? F.plugins[name].files[filename] : PATH.root('/plugins/' + name + '/public/' + filename);
			break;
		case '-':
			var index = tmp.indexOf('/', 2);
			var name = tmp.substring(2, index);
			var filename = tmp.substring(index + 1);
			for (var ext of F.extensions) {
				if (ext.id === name)
					return ext.files[filename];
			}
			break;
	}

	if (F.routes.mapping[url])
		return F.routes.mapping[url];

	if (F._length_themes) {
		var index = tmp.indexOf('/', 2);
		if (index !== -1) {
			var themeName = tmp.substring(1, index);
			if (F.themes[themeName])
				return F.themes[themeName] + 'public' + tmp.substring(index);
		}
	}

	def = framework_internal.preparepath(def, true);

	if (encode)
		def = $decodeURIComponent(def);

	if (ispublic)
		def = PATH.public_cache(def);
	else
		def = def[0] === '~' ? def.substring(1) : def[0] === '.' ? def : PATH.public_cache(def);

	return def;
};

global.DOWNLOAD = function(url, filename, callback, timeout) {

	if (!callback) {
		// Promise
		return new Promise(function(resolve, reject) {
			DOWNLOAD(url, filename, function(err, response) {
				if (err)
					reject(err);
				else
					resolve(response);
			}, timeout);
		});
	}

	if (!F.isLoaded && url[0] === '/') {
		setTimeout(global.DOWNLOAD, 200, url, filename, callback, timeout);
		return;
	}

	var opt = {};

	if (typeof(url) === 'object')
		opt.unixsocket = url;
	else
		opt.url = framework_internal.preparepath(url);

	if (!opt.unixsocket && !REG_HTTPHTTPS.test(opt.url)) {

		if (url[0] !== '/')
			url = '/' + url;

		if (F.isWorker)
			throw new Error('Worker can\'t create a snapshot from the relative URL address "{0}".'.format(url));

		// Maybe unixsocket
		if (F.unixsocket)
			opt.unixsocket = { socket: opt.unixsocket, path: url };
		else
			opt.url = 'http://' + (F.ip === 'auto' ? '0.0.0.0' : F.ip) + ':' + F.port + url;
	}

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

		var stream = Fs.createWriteStream(filename);

		var done = function(err) {
			if (callback) {
				callback(err, response);
				callback = null;
			}
		};

		response.stream.pipe(stream);
		response.stream.on('error', done);
		stream.on('error', done);
		CLEANUP(stream, done);
	};

	REQUEST(opt);
};

/**
 * Find WebSocket connection
 * @param {String/RegExp} path
 * @return {WebSocket}
 */
F.findConnection = function(path) {
	var is = path && path.test; // is regexp?
	for (var key in F.connections) {
		if (is) {
			if (path.test(key))
				return F.connections[key];
		} else {
			if (key.indexOf(path) !== -1)
				return F.connections[key];
		}
	}
};

/**
 * Find WebSocket connections
 * @param {String/RegExp} path
 * @return {WebSocket Array}
 */
F.findConnections = function(path) {
	var is = path && path.test; // is regexp?
	var output = [];
	for (var key in F.connections) {
		if (!path)
			output.push(F.connections[key]);
		else if (is)
			path.test(key) && output.push(F.connections[key]);
		else
			key.indexOf(path) !== -1 && output.push(F.connections[key]);
	}
	return output;
};

var onmailsendforce = message => message.send2();

/**
 * Mail delegate
 * @param {String or Array String} address
 * @param {String} subject
 * @param {String} body
 * @param {Function(err)} callback
 * @param {String} replyTo
 * @return {MailMessage}
 */
DEF.onMail = function(address, subject, body, callback, replyTo) {

	var tmp;

	if (typeof(callback) === 'string') {
		tmp = replyTo;
		replyTo = callback;
		callback = tmp;
	}

	var message = Mail.create(subject, body);

	if (address instanceof Array) {
		for (let m of address)
			message.to(m);
	} else
		message.to(address);

	message.from(CONF.mail_from || CONF.mail_address_from || '', CONF.name);
	callback && message.callback(callback);

	if (replyTo)
		message.reply(replyTo);
	else {
		tmp = CONF.mail_reply || CONF.mail_address_reply;
		tmp && tmp.length > 3 && message.reply(tmp);
	}

	tmp = CONF.mail_bcc || CONF.mail_address_copy;
	tmp && tmp.length > 3 && message.bcc(tmp);

	tmp = CONF.mail_cc;
	tmp && tmp.length > 3 && message.cc(tmp);

	message.$sending = setImmediate(onmailsendforce, message);
	return message;
};

DEF.onMeta = function() {

	var builder = '';
	var length = arguments.length;
	var self = this;

	for (var i = 0; i < length; i++) {

		var arg = U.encode(arguments[i]);
		if (arg == null || !arg.length)
			continue;

		switch (i) {
			case 0:
				builder += '<title>' + (arg + (F.url !== '/' && !CONF.allow_custom_titles ? ' - ' + CONF.name : '')) + '</title>';
				break;
			case 1:
				builder += '<meta name="description" content="' + arg + '" />';
				break;
			case 2:
				builder += '<meta name="keywords" content="' + arg + '" />';
				break;
			case 3:
				var tmp = arg.substring(0, 6);
				var img = tmp === 'http:/' || tmp === 'https:' || arg.substring(0, 2) === '//' ? arg : self.hostname(self.public_image(arg));
				builder += '<meta property="og:image" content="' + img + '" /><meta name="twitter:image" content="' + img + '" />';
				break;
		}
	}

	return builder;
};

function auditjsonserialization(key, value) {
	if (!BLACKLIST_AUDIT[key] && value != null && value !== '')
		return value;
}

global.AUDIT = function(name, $, message, type) {

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

	if ($.req) {
		if ($.req.sessionid)
			data.sessionid = $.req.sessionid;
		data.ua = $.req.ua;
		data.ip = $.ip;
		data.url = $.url;
	}

	if ($.id)
		data.reference = $.id;

	if (type)
		data.type = type || 'info';

	if (name)
		data.schema = name;
	else if ($.ID)
		data.schema = $.ID;

	if ($.model)
		data.data = JSON.stringify({ params: $.params, query: $.query, model: $.model }, auditjsonserialization);

	if (F.id)
		data.instance = F.id;

	if (global.THREAD)
		data.thread = global.THREAD;

	if (message)
		data.message = message;

	if (CONF.allow_totalapilogger && (CONF.totalapi || CONF.secret_totalapi)) {
		data.sessionid = data.thread = undefined;
		data.app = CONF.url || CONF.name;
		TotalAPI('logger', data, ERROR('totalapi'));
	} else
		DEF.onAudit(name, data, $);
};

global.LOGGER = function() {
	NOW = new Date();
	var dt = NOW.getFullYear() + '-' + ((NOW.getMonth() + 1) + '').padLeft(2, '0') + '-' + (NOW.getDate() + '').padLeft(2, '0') + ' ' + (NOW.getHours() + '').padLeft(2, '0') + ':' + (NOW.getMinutes() + '').padLeft(2, '0') + ':' + (NOW.getSeconds() + '').padLeft(2, '0');
	var str = '';
	var length = arguments.length;
	var name = arguments[0];

	for (var i = 1; i < length; i++) {
		var val = arguments[i];
		if (val === undefined)
			val = 'undefined';
		else if (val === null)
			val = 'null';
		else if (typeof(val) === 'object')
			val = Util.inspect(val);
		str += (str ? ' ' : '') + val;
	}

	PATH.verify('logs');
	U.queue('LOGGER', 5, function(next) {
		F.stats.performance.open++;
		Fs.appendFile(U.combine(CONF.directory_logs, name + '.log'), dt + ' | ' + str + '\n', next);
	});
};

global.LOGMAIL = function(address, subject, body, callback) {

	if (typeof(body) === 'function') {
		callback = body;
		body = subject;
		subject = null;
	} else if (body === undefined) {
		body = subject;
		subject = null;
	}

	if (!subject)
		subject = CONF.name + ' v' + CONF.version;

	var body = '<!DOCTYPE html><html><head><title>' + subject + '</title><meta charset="utf-8" /></head><body><pre style="max-width:600px;font-size:13px;line-height:16px;white-space:pre-line">' + (typeof(body) === 'object' ? JSON.stringify(body).escape() : body) + '</pre></body></html>';
	return DEF.onMail(address, subject, body, callback);
};

DEF.onPrefSave = function(val) {
	Fs.writeFile(PATH.databases(PREFFILE), JSON.stringify(val, null, '\t'), ERROR('DEF.onPrefSave'));
};

DEF.onPrefLoad = function(next) {
	Fs.readFile(U.combine(CONF.directory_databases, PREFFILE), function(err, data) {
		if (data)
			next(data.toString(ENCODING).parseJSON(true));
		else
			next();
	});
};

DEF.onAudit = function(name, data) {
	PATH.verify('logs');
	U.queue('LOGGER', 5, function(next) {
		F.stats.performance.open++;
		data.dtcreated = NOW = new Date();
		Fs.appendFile(U.combine(CONF.directory_logs, (name || 'audit') + '.log'), JSON.stringify(data) + '\n', next);
	});
};

DEF.onCompileView = function(name, html) {
	return html;
};

DEF.onCompileStyle = null;
DEF.onCompileScript = null;

function compile_file(res) {
	fsFileRead(res.options.filename, function(err, buffer) {

		var req = res.req;
		var uri = req.uri;

		if (err) {
			F.error(err, res.options.filename, uri);
			F.temporary.notfound[req.$key] = true;
			delete F.temporary.processing[req.$key];
			res.$file();
			return;
		}

		var file = PATH.temp(F.clusterid + createTemporaryKey(uri.pathname));
		PATH.verify('temp');
		Fs.writeFileSync(file, compile_content(req.extension, framework_internal.parseBlock(F.routes.blocks[uri.pathname], buffer.toString(ENCODING)), res.options.filename), ENCODING);
		var stats = Fs.statSync(file);
		var tmp = [file, stats.size, stats.mtime.toUTCString()];
		compile_gzip(tmp, function(tmp) {
			F.temporary.path[req.$key] = tmp;
			delete F.temporary.processing[req.$key];
			res.$file();
		});
	});
}

function compile_merge(res, repeated) {

	var req = res.req;
	var uri = req.uri;

	var merge = F.routes.merge[uri.pathname];
	var filename = merge.filename;

	if (!DEBUG && existsSync(filename)) {
		var stats = Fs.statSync(filename);
		var tmp = [filename, stats.size, stats.mtime.toUTCString()];
		compile_gzip(tmp, function(tmp) {
			delete F.temporary.processing[req.$key];
			F.temporary.path[req.$key] = tmp;
			res.$file();
		});
		return;
	}

	var writer = Fs.createWriteStream(filename);
	var index = 0;
	var remove = null;

	merge.files.wait(function(filename, next) {

		var block;

		if (filename.startsWith('http://') || filename.startsWith('https://')) {

			var opt = {};
			opt.resolve = true;
			opt.url = filename;

			opt.callback = function(err, response) {

				var output = compile_content(req.extension, framework_internal.parseBlock(block, response.body), filename);
				if (JSFILES[req.extension]) {
					if (output[output.length - 1] !== ';')
						output += ';';
				} else if (req.extension === 'html') {
					if (output[output.length - 1] !== NEWLINE)
						output += NEWLINE;
				}

				DEBUG && merge_debug_writer(writer, filename, req.extension, index++, block);
				writer.write(output);
				next();
			};

			REQUEST(opt);
			return;
		}

		if (filename[0] !== '~') {
			var tmp = PATH.public(filename);
			filename = tmp;
		} else
			filename = filename.substring(1);

		var indexer = filename.indexOf('*');
		if (indexer !== -1) {

			var tmp = filename.substring(indexer + 1).toLowerCase();
			var len = tmp.length;
			!remove && (remove = []);

			// Remove directory for all future requests
			remove.push(arguments[0]);

			U.ls(filename.substring(0, indexer), function(files) {
				for (var j = 0, l = files.length; j < l; j++)
					merge.files.push('~' + files[j]);
				next();
			}, (path, isDirectory) => isDirectory ? true : path.substring(path.length - len).toLowerCase() === tmp);
			return;
		}

		fsFileRead(filename, function(err, buffer) {

			if (err) {
				F.error(err, merge.filename, uri);
				next();
				return;
			}

			var output = compile_content(req.extension, framework_internal.parseBlock(block, buffer.toString(ENCODING)), filename);
			if (JSFILES[req.extension]) {
				if (output[output.length - 1] !== ';')
					output += ';' + NEWLINE;
			} else if (req.extension === 'html') {
				if (output[output.length - 1] !== NEWLINE)
					output += NEWLINE;
			}

			DEBUG && merge_debug_writer(writer, filename, req.extension, index++, block);
			writer.write(output);
			next();
		});

	}, function() {

		CLEANUP(writer, function() {

			var stats;

			try {
				stats = Fs.statSync(filename);
			} catch (e) {

				e && F.error(e, 'compile_merge' + (repeated ? ' - repeated' : ''), req.url);

				// Try it again
				if (repeated) {
					delete F.temporary.processing[req.$key];
					if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
						res.throw404();
				} else
					compile_merge(res, true);

				return;
			}

			var tmp = [filename, stats.size, stats.mtime.toUTCString()];
			compile_gzip(tmp, function(tmp) {
				F.temporary.path[req.$key] = tmp;
				delete F.temporary.processing[req.$key];
				res.$file();
			});
		});

		writer.end();

		// Removes all directories from merge list (because the files are added into the queue)
		if (remove) {
			for (var i = 0, length = remove.length; i < length; i++)
				merge.files.splice(merge.files.indexOf(remove[i]), 1);
		}
	});
}

function merge_debug_writer(writer, filename, extension, index, block) {
	var plus = '===========================================================================================';
	var beg = JSFILES[extension] ? '/*\n' : extension === 'css' ? '/*!\n' : '<!--\n';
	var end = JSFILES[extension] || extension === 'css' ? '\n */' : '\n-->';
	var mid = extension !== 'html' ? ' * ' : ' ';
	writer.write((index > 0 ? '\n\n' : '') + beg + mid + plus + '\n' + mid + 'MERGED: ' + filename + '\n' + (block ? mid + 'BLOCKS: ' + block + '\n' : '') + mid + plus + end + '\n\n', ENCODING);
}

function compile_check(res) {

	var req = res.req;
	var uri = req.uri;

	if (F.routes.merge[uri.pathname]) {
		compile_merge(res);
		return;
	}

	fsFileExists(res.options.filename, function(e, size, sfile, stats) {

		if (e) {

			if (!res.nocompress && COMPRESSIONSPECIAL[req.extension] && CONF.allow_compile && !REG_NOCOMPRESS.test(res.options.filename))
				return compile_file(res);

			var tmp = [res.options.filename, size, stats.mtime.toUTCString()];
			if (CONF.allow_gzip && COMPRESSION[U.getContentType(req.extension)]) {
				compile_gzip(tmp, function(tmp) {
					F.temporary.path[req.$key] = tmp;
					res.$file();
					delete F.temporary.processing[req.$key];
				});
			} else {
				F.temporary.path[req.$key] = tmp;
				res.$file();
				delete F.temporary.processing[req.$key];
			}

		} else {
			F.temporary.notfound[req.$key] = true;
			delete F.temporary.processing[req.$key];
			res.$file();
		}
	});
}

function compile_gzip(arr, callback) {

	// GZIP compression

	var filename = PATH.temp('file' + (arr[0].hash(true).toString(36) + '').replace('-', '0') + '.gz');
	arr.push(filename);

	F.stats.performance.open++;
	var reader = Fs.createReadStream(arr[0]);
	var writer = Fs.createWriteStream(filename);

	CLEANUP(writer, function() {
		fsFileExists(filename, function(e, size) {
			arr.push(size);
			callback(arr);
		});
	});

	reader.pipe(Zlib.createGzip(GZIPFILE)).pipe(writer);
	CLEANUP(reader);
}

function compile_content(extension, content, filename) {

	if (filename && REG_NOCOMPRESS.test(filename))
		return content;

	switch (extension) {
		case 'js':
		case 'mjs':
			return CONF.allow_compile_script ? framework_internal.compile_javascript(content, filename) : content;

		case 'css':
			content = CONF.allow_compile_style ? framework_internal.compile_css(content, filename) : content;
			var matches = content.match(REG_COMPILECSS);
			if (matches) {
				for (var i = 0, length = matches.length; i < length; i++) {
					var key = matches[i];
					var url = key.substring(4, key.length - 1);
					content = content.replace(key, 'url(' + F.$version(url, true) + ')');
				}
			}
			return content;
	}

	return content;
}

global.RESTORE = function(filename, target, callback, filter) {

	var buffer_key = Buffer.from(':');
	var buffer_new = Buffer.from('\n');
	var buffer_dir = Buffer.from('#');
	var cache = {};
	var data = null;
	var type = 0;
	var item = null;
	var stream = typeof(filename) === 'string' ? Fs.createReadStream(filename) : filename;
	var index = 0;
	var parser = {};
	var open = {};
	var pending = 0;
	var end = false;
	var output = {};

	output.files = 0;
	output.size = 0;
	output.path = target;

	parser.parse_key = function() {

		index = data.indexOf(buffer_key);
		if (index === -1)
			return;

		index++;
		item = data.slice(0, index - 1).toString(ENCODING).trim();
		data = data.slice(index + (data[index] === 32 ? 1 : 0));
		type = 1;
		parser.next();
	};

	parser.parse_meta = function() {
		var path = Path.join(target, item);

		// Is directory?
		if (data[0] === buffer_dir[0]) {
			if (!cache[path]) {
				cache[path] = true;
				if (!filter || filter(item, true) !== false)
					PATH.mkdir(path);
			}
			type = 3;
			parser.next();
			return;
		}

		if (!cache[path]) {
			cache[path] = true;

			var npath = path.substring(0, path.lastIndexOf(F.isWindows ? '\\' : '/'));

			var filename = filter && filter(item, false);

			if (!filter || filename || filename == null)
				PATH.mkdir(npath);
			else {
				type = 5; // skip
				parser.next();
				return;
			}
		}

		if (typeof(filename) === 'string')
			path = Path.join(target, filename);

		// File
		type = 2;
		var tmp = open[item] = {};
		tmp.path = path;
		tmp.name = item;
		tmp.writer = Fs.createWriteStream(path);
		tmp.zlib = Zlib.createGunzip();
		tmp.zlib.$self = tmp;
		pending++;

		output.files++;

		tmp.zlib.on('error', function(e) {
			pending--;
			var tmp = this.$self;
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
			var tmp = this.$self;
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
			CONCAT[0] = data;
			CONCAT[1] = chunk;
			data = Buffer.concat(CONCAT);
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

global.BACKUP = function(filename, filelist, callback, filter) {

	var padding = 100;
	var path = filelist instanceof Array ? PATH.root() : filelist;

	if (!(filelist instanceof Array))
		filelist = [''];

	var counter = 0;
	var totalsize = 0;
	var unlink = typeof(filename) === 'string' ? Fs.unlink : (filename, callback) => callback();

	unlink(filename, function() {

		filelist.sort(function(a, b) {
			var ac = a.split('/');
			var bc = b.split('/');
			if (ac.length < bc.length)
				return -1;
			else if (ac.length > bc.length)
				return 1;
			return a.localeCompare(b);
		});

		var clean = function(path, files) {
			var index = 0;
			while (true) {
				var filename = files[index];
				if (!filename)
					break;
				if (filename.substring(0, path.length) === path)
					files.splice(index, 1);
				else
					index++;
			}
		};

		var writer = typeof(filename) === 'string' ? Fs.createWriteStream(filename) : filename;

		writer.on('finish', function() {
			callback && callback(null, { filename: filename, files: counter, size: totalsize });
		});

		var lastchar = path[path.length - 1];
		var cleanpath = lastchar === '/' || lastchar === '\\' ? path.substring(0, path.length - 1) : path;

		filelist.wait(function(item, next) {

			var file = Path.join(path, item);

			if (F.isWindows)
				item = item.replace(/\\/g, '/');

			if (item[0] !== '/')
				item = '/' + item;

			Fs.stat(file, function(err, stats) {

				if (err) {
					F.error(err, 'BACKUP()', filename);
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

					U.ls(file, function(f, d) {

						var length = path.length;
						if (path[path.length - 1] === '/')
							length--;

						var processdir = function() {

							var dir = d.shift();
							if (dir == null) {
								for (var i = 0; i < f.length; i++)
									filelist.push(f[i].substring(length));
								next();
								return;
							}

							if (filter && !filter(dir.substring(length), true)) {
								clean(dir, f, true);
								clean(dir, d, true);
							} else {
								var tmp = Buffer.from(dir.substring(length).padRight(padding) + ': #\n', ENCODING);
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

				Fs.createReadStream(file).pipe(Zlib.createGzip(GZIPFILE)).on('data', function(chunk) {

					CONCAT[0] = data;
					CONCAT[1] = chunk;
					data = Buffer.concat(CONCAT);

					var remaining = data.length % 3;
					if (remaining) {
						var tmp = data.slice(0, data.length - remaining).toString('base64');
						writer.write(tmp, ENCODING);
						data = data.slice(data.length - remaining);
						totalsize += tmp.length;
					}

				}).on('end', function() {
					var tmp = data.length ? data.toString('base64') : '';
					data.length && writer.write(tmp);
					writer.write('\n', ENCODING);
					totalsize += tmp.length + 1;
					counter++;
					setImmediate(next);
				}).on('error', function(err) {
					F.error(err, 'BACKUP("' + file + '")');
					setImmediate(next);
				});

			});
		}, () => writer.end());
	});
};

F.exists = function(req, res, max, callback) {

	if (typeof(max) === 'function') {
		callback = max;
		max = 10;
	}

	var name = req.$key = createTemporaryKey(req);
	var filename = PATH.temp(name);
	var httpcachevalid = DEBUG ? false : (req.headers['if-none-match'] === (ETAG + CONF.etag_version));

	if (F.isProcessed(name) || httpcachevalid) {
		res.options.filename = filename;
		res.$file();
		return;
	}

	U.queue('F.exists', max, function(next) {
		F.stats.performance.open++;
		fsFileExists(filename, function(e) {
			if (e) {
				res.options.filename = filename;
				res.options.callback = next;
				res.$file();
			} else
				callback(next, filename, req, res);
		});
	});
};

/**
 * Is processed static file?
 * @param {String / Request} filename Filename or Request object.
 * @return {Boolean}
 */
F.isProcessed = function(filename) {

	if (filename.url) {
		var name = filename.url;
		var index = name.indexOf('?');
		if (index !== -1)
			name = name.substring(0, index);
		filename = PATH.public($decodeURIComponent(name));
	}

	return !F.temporary.notfound[filename] && F.temporary.path[filename] !== undefined;
};

/**
 * Processing
 * @param {String / Request} filename Filename or Request object.
 * @return {Boolean}
 */
F.isProcessing = function(filename) {

	if (!filename.url)
		return !!F.temporary.processing[filename];

	var name = filename.url;
	var index = name.indexOf('?');

	if (index !== -1)
		name = name.substring(0, index);

	filename = U.combine(CONF.directory_public, $decodeURIComponent(name));
	return !!F.temporary.processing[filename];
};

global.TOUCH = function(url) {
	if (url) {
		var key = createTemporaryKey(url);
		delete F.temporary.path[key];
		delete F.temporary.notfound[key];
	} else {
		F.temporary.path = {};
		F.temporary.notfound = {};
	}
};

F.response503 = function(req, res) {
	res.options.code = 503;
	res.options.headers = HEADERS.response503;
	res.options.body = VIEW('.' + PATHMODULES + res.options.code, F.waits);
	res.$text();
};

F.restart = function() {
	process.send && process.send('total:restart');
};

function loadframework(types, cwd, ready) {

	var isdebug = types instanceof Array ? types.indexOf('debug') !== -1 : false;
	if (isdebug)
		types = types.remove('debug');

	if (!types)
		types = ['nobundles', 'nopackages', 'nocomponents', 'nothemes'];

	if (cwd && cwd[0] === '.' && cwd.length < 4)
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));
	else if (cwd)
		F.directory = directory = U.$normalize(cwd);
	else if (process.env.istotaljsworker)
		F.directory = process.cwd();
	else if ((/\/scripts\/.*?.js/).test(process.argv[1]))
		F.directory = directory = U.$normalize(Path.normalize(directory + '/..'));


	F.isWorker = true;
	global.isWORKER = true;
	global.DEBUG = isdebug;
	CONF.nosourcemap = true;
	CONF.allow_stats_snapshot = false;

	var isno = true;

	if (types) {
		for (var i = 0; i < types.length; i++) {
			if (types[i].substring(0, 2) !== 'no') {
				isno = false;
				break;
			}
		}
	}

	var can = function(type) {
		if (!types)
			return true;
		if (types.indexOf('no' + type) !== -1)
			return false;
		return isno ? true : types.indexOf(type) !== -1;
	};

	F.$bundle(function() {

		configure_env();
		configure_configs();

		if (isTYPESCRIPT)
			SCRIPTEXT = '.ts';

		var noservice = true;
		for (var i = 0; i < types.length; i++) {
			switch(types[i]) {
				case 'service':
				case 'services':
					noservice = false;
					break;
			}
			if (!noservice)
				break;
		}

		F.cache.init(noservice);
		EMIT('init');

		F.$load(types, directory, function() {

			F.isLoaded = true;

			if (F.pending) {
				for (var fn of F.pending)
					fn();
				delete F.pending;
			}

			// if (process.send && process.argv.indexOf('--worker') === -1)
			// 	process.send('total:ready');

			process.send && process.send('total:ready');

			setTimeout(function() {

				try {
					EMIT('load');
					EMIT('ready');
				} catch (err) {
					F.error(err, 'ON("load/ready")');
				}

				ready && ready();

				F.removeAllListeners('load');
				F.removeAllListeners('ready');

				F.$snapshot && F.$snapshot();

			}, 500);

		});
	}, can('bundles'));
}

global.LOAD = F.load = function(types, cwd, ready) {

	if (typeof(types) === 'function') {
		ready = types;
		types = null;
	}

	if (typeof(cwd) === 'function') {
		ready = cwd;
		cwd = null;
	}

	if (typeof(types) === 'string')
		types = types.split(/\s|,/).trim();

	if (ready)
		loadframework(types, cwd, ready);
	else
		return new Promise(resolve => loadframework(types, cwd, () => resolve()));
};

F.initialize = function(http, debug, options, callback) {

	if (!options)
		options = {};

	var port = options.port;
	var ip = options.ip;
	var unixsocket = options.unixsocket;

	if (options.thread)
		global.THREAD = options.thread;

	if (!debug)
		CONF.nosourcemap = true;

	options.config && U.extend_headers2(CONF, options.config);
	F.isHTTPS = Http.STATUS_CODES === undefined;

	if (isNaN(port) && typeof(port) !== 'string')
		port = null;

	if (options.id)
		F.id = options.id;

	if (options.bundling != null)
		F.$bundling = options.bundling == true;

	global.DEBUG = debug;

	F.$bundle(function() {

		configure_env();
		configure_configs();

		if (isTYPESCRIPT)
			SCRIPTEXT = '.ts';

		F.cache.init();

		EMIT('init');

		if (!port) {
			if (CONF.default_port === 'auto') {
				var envPort = +(process.env.PORT || '');
				if (!isNaN(envPort))
					port = envPort;
			} else
				port = CONF.default_port;
		}

		F.port = port || 8000;

		if (ip !== null) {
			F.ip = ip || CONF.default_ip || '0.0.0.0';
			if (F.ip === 'null' || F.ip === 'undefined' || F.ip === 'auto')
				F.ip = null;
		} else
			F.ip = undefined;

		if (F.ip == null)
			F.ip = '0.0.0.0';

		!unixsocket && (unixsocket = CONF.default_unixsocket);

		if (F.isWindows && unixsocket && unixsocket.indexOf(SOCKETWINDOWS) === -1)
			unixsocket = F.Path.join(SOCKETWINDOWS, unixsocket);

		F.unixsocket = unixsocket;

		if (F.server) {
			F.server.removeAllListeners();
			for (var key in F.connections) {
				var item = F.connections[key];
				if (item) {
					item.removeAllListeners();
					item.close();
				}
			}
			F.server.close();
		}

		var listen = function(count) {

			F.server && F.server.close(NOOP);

			if (options.https) {

				var meta = options.https;

				if (typeof(meta.key) === 'string') {
					if (meta.key.indexOf('.') === -1)
						meta.key = Buffer.from(meta.key, 'base64');
					else
						meta.key = Fs.readFileSync(meta.key);
				}

				if (typeof(meta.cert) === 'string') {
					if (meta.cert.indexOf('.') === -1)
						meta.cert = Buffer.from(meta.cert, 'base64');
					else
						meta.cert = Fs.readFileSync(meta.cert);
				}

				if (http)
					F.server = http.createServer(meta, F.listener);

			} else if (http)
				F.server = http.createServer(F.listener);

			CONF.allow_performance && F.server.on('connection', connection_tunning);
			F.initwebsocket && F.initwebsocket();

			if (F.server) {
				if (unixsocket) {
					F.server.listen(unixsocket, function() {

						// Check if the socket exists
						if (!F.isWindows) {
							Fs.lstat(unixsocket, function(err) {

								if (count > 9)
									throw new Error('HTTP server can not listen the path "{0}"'.format(unixsocket));

								if (err)
									setTimeout(listen, 500, (count || 1) + 1);
								else if (options.unixsocket777)
									Fs.chmodSync(unixsocket, 0o777);
							});
						}

					});
				} else
					F.server.listen(F.port, F.ip);
			}
		};

		setInterval(clear_pending_requests, 5000);

		// clears static files
		F.clear(function() {
			F.$load(undefined, directory, function() {

				F.isLoaded = true;

				if (options.threads)
					loadthreads(options);
				else
					process.send && process.send('total:ready');

				if (options.middleware)
					options.middleware(listen);
				else
					listen();

				if (!options.threads && !process.connected)
					F.console();

				setTimeout(function() {

					if (F.pending) {
						for (var fn of F.pending)
							fn();
						delete F.pending;
					}

					callback && callback();

					try {
						EMIT('load');
						EMIT('ready');
					} catch (err) {
						F.error(err, 'ON("load/ready")');
					}

					F.removeAllListeners('load');
					F.removeAllListeners('ready');

					F.$snapshot && F.$snapshot();

				}, 500);
			});

		}, true);
	});
};

/**
 * Initialize framework
 * @param  {Object} http
 * @param  {Boolean} debug
 * @param  {Object} options
 * @return {Framework}
 */
F.frameworkless = function(debug, options, callback) {

	extend_request(Http.IncomingMessage.prototype);
	extend_response(Http.ServerResponse.prototype);

	if (typeof(debug) === 'string')
		debug = debug !== 'release';

	if (!options)
		options = {};

	var port = options.port;
	var ip = options.ip;
	var unixsocket = options.unixsocket;

	CONF.nosourcemap = true;

	options.config && U.extend_headers2(CONF, options.config);
	F.isHTTPS = false;

	if (isNaN(port) && typeof(port) !== 'string')
		port = null;

	if (options.id)
		F.id = options.id;

	global.DEBUG = debug;

	if (isTYPESCRIPT)
		SCRIPTEXT = '.ts';

	F.cache.init();
	EMIT('init');

	if (!port) {
		if (CONF.default_port === 'auto') {
			var envPort = +(process.env.PORT || '');
			if (!isNaN(envPort))
				port = envPort;
		} else
			port = CONF.default_port;
	}

	F.port = port || 8000;

	if (ip !== null) {
		F.ip = ip || CONF.default_ip || '0.0.0.0';
		if (F.ip === 'null' || F.ip === 'undefined' || F.ip === 'auto')
			F.ip = null;
	} else
		F.ip = undefined;

	if (F.ip == null)
		F.ip = '0.0.0.0';

	!unixsocket && (unixsocket = CONF.default_unixsocket);

	if (F.isWindows && unixsocket && unixsocket.indexOf(SOCKETWINDOWS) === -1)
		unixsocket = F.Path.join(SOCKETWINDOWS, unixsocket);

	F.unixsocket = unixsocket;

	if (F.server) {
		F.server.removeAllListeners();
		for (var key in F.connections) {
			var item = F.connections[key];
			if (item) {
				item.removeAllListeners();
				item.close();
			}
		}
		F.server.close();
	}

	var listen = function(count) {
		F.server && F.server.close();
		F.server = Http.createServer(F.listener);
		CONF.allow_performance && F.server.on('connection', connection_tunning);
		F.initwebsocket && F.initwebsocket();
		if (F.server) {
			if (unixsocket) {
				F.server.listen(unixsocket, function() {
					// Check if the socket exists
					if (!F.isWindows) {
						Fs.lstat(unixsocket, function(err) {
							if (count > 9)
								throw new Error('HTTP server can not listen the path "{0}"'.format(unixsocket));
							if (err)
								setTimeout(listen, 500, (count || 1) + 1);
							else if (options.unixsocket777)
								Fs.chmodSync(unixsocket, 0o777);
						});
					}
				});
			} else
				F.server.listen(F.port, F.ip);
		}
	};

	setInterval(clear_pending_requests, 5000);

	// clears static files
	F.isLoaded = true;

	if (options.middleware)
		options.middleware(listen);
	else
		listen();

	if (!process.connected)
		F.console();

	setTimeout(function() {

		if (F.pending) {
			for (var fn of F.pending)
				fn();
			delete F.pending;
		}

		callback && callback();

		try {
			EMIT('load');
			EMIT('ready');
		} catch (err) {
			F.error(err, 'ON("load/ready")');
		}

		F.removeAllListeners('load');
		F.removeAllListeners('ready');

		F.$snapshot && F.$snapshot();

	}, 500);

};

function loadthreads(options) {

	if (options.threads === true)
		options.threads = '';

	Fs.readdir(PATH.root('/threads/'), function(err, items) {

		F.threads = {};

		var tmp = Os.tmpdir();
		var id = Date.now().toString(36);
		var runscript = U.getName(process.argv[1] || 'index.js').replace(/\.js$/g, '');

		if (!items)
			items = [];

		items.wait(function(item, next) {

			var socket = Path.join(tmp, F.directory.makeid() + '_' + item.makeid() + GUID(5) + '_' + id);
			var url = ('/' + options.threads + '/' + item + '/').replace(/\/{2,}/g, '/');

			if (F.isWindows)
				socket = (SOCKETWINDOWS + '\\totalpipe') + socket.md5();

			PROXY(url, socket, 'replace', null, null, options.timeout);

			var isolated = options.logs === 'isolated';
			var scr = `const options = {};
options.cluster = {3};
options.thread = '{2}';
options.unixsocket = '{0}';
options.unixsocket777 = true;
require('total4/{1}')(options);`.format(socket.replace(/\\/g, '\\\\'), DEBUG ? 'debug' : 'release', item, (options.cluster === 'auto' ? '\'auto\'' : options.cluster) || 0);

			var filename = PATH.root(runscript + '_' + item + SCRIPTEXT);
			var logdir = PATH.root('/threads/' + item + '/logs/');
			PATH.mkdir(logdir);

			var logname = Path.join(logdir, 'debug.log');

			// Tries to remove log
			if (isolated && (!DEBUG || process.argv.indexOf('--restart') === -1))
				Fs.unlink(logname, NOOP);

			Fs.writeFile(filename, scr, function() {
				F.threads[item] = Child.fork(filename, { silent: isolated });
				isolated && F.threads[item].stdout.on('data', chunk => Fs.appendFile(logname, chunk, NOOP));
				F.threads[item].on('message', threadforkmessage);
				next();
			});

		}, function() {
			if (process.send)
				process.send('total:ready');
			else
				F.console();
		});

	});
}

function threadforkmessage(m) {
	if (m && m.TYPE === 'total:emit' && m.name) {
		EMIT(m.name, m.a, m.b, m.c, m.d, m.e);
		if (F.threads) {
			for (var key in F.threads)
				F.threads[key].send(m);
		}
	}
}

function connection_tunning(socket) {
	socket.setNoDelay(true);
	socket.setKeepAlive(true, 10);
}

function extendinitoptions(options) {

	var val;
	var tmp;

	for (var i = 2; i < process.argv.length; i++) {
		if (process.argv[i].substring(0, 2) !== '--') {
			val = process.argv[i];
			break;
		}
	}

	if (val) {
		if (val.substring(0, 7) === 'http://') {
			tmp = Parser.parse(val);
			if (!options.ip)
				options.ip = tmp.host;
			if (options.port)
				options.port = +(tmp.port || '80');
		} else if ((/^\d+$/).test(val)) {
			if (!options.port)
				options.port = +val;
		} else if (!options.unixsocket)
			options.unixsocket = val;
	}
}

function clear_pending_requests() {

	F.stats.request.pending = 0;

	if (!TIMEOUTS.length)
		return;

	var index = 0;

	while (true) {
		var req = TIMEOUTS[index];
		if (req) {
			if (req.success || req.res.success) {
				TIMEOUTS.splice(index, 1);
			} else if (req.$total_timeout <= 0) {
				req.controller && req.controller.precache && req.controller.precache(null, null, null);
				req.$total_cancel();
				TIMEOUTS.splice(index, 1);
			} else {
				F.stats.request.pending++;
				req.$total_timeout -= 5; // 5 seconds
				index++;
			}
		} else
			return;
	}
}

global.HTTP = F.http = function(mode, options, middleware) {

	if (typeof(options) === 'function') {
		middleware = options;
		options = null;
	}

	if (!options)
		options = {};

	extendinitoptions(options);

	if (typeof(middleware) === 'function')
		options.middleware = middleware;

	if (options.bundling != null)
		F.$bundling = options.bundling;

	extend_request(Http.IncomingMessage.prototype);
	extend_response(Http.ServerResponse.prototype);
	F.mode(Http, mode, options);
};

global.HTTPS = F.https = function(mode, options, middleware) {

	if (typeof(options) === 'function') {
		middleware = options;
		options = null;
	}

	if (!options)
		options = {};

	extendinitoptions(options);

	if (typeof(middleware) === 'function')
		options.middleware = middleware;

	extend_request(Http.IncomingMessage.prototype);
	extend_response(Http.ServerResponse.prototype);
	F.mode(Https, mode, options);
};

F.mode = function(http, name, options) {

	var debug = false;

	if (options.directory)
		F.directory = directory = options.directory;

	if (typeof(http) === 'string') {
		switch (http) {
			case 'debug':
			case 'development':
				debug = true;
				break;
		}
		global.DEBUG = debug;
		return;
	}

	F.isWorker = false;

	switch (name.toLowerCase().replace(/\.|\s/g, '-')) {
		case 'release':
			break;
		case 'debug':
			debug = true;
			break;
	}

	F.initialize(http, debug, options);
};

F.custom = function(mode, http, request, response, options, callback) {

	if (typeof(options) === 'function') {
		callback = options;
		options = null;
	}

	var debug = false;

	if (!options)
		options = {};

	if (options.directory)
		F.directory = directory = options.directory;

	extend_request(request);
	extend_response(response);

	switch (mode.toLowerCase().replace(/\.|\s/g, '-')) {
		case 'release':
		case 'prod':
		case 'production':
			break;
		case 'debug':
		case 'dev':
			debug = true;
			break;
	}

	F.initialize(http, debug, options, callback);
};

F.console = function() {

	var memory = process.memoryUsage();

	console.log('====================================================');
	console.log('PID           : ' + process.pid);
	console.log('Node.js       : ' + process.version);
	console.log('Total.js      : v' + F.version);
	console.log('OS            : ' + Os.platform() + ' ' + Os.release());
	console.log('Memory        : ' + memory.heapUsed.filesize(2) + ' / ' + memory.heapTotal.filesize(2));
	console.log('User          : ' + Os.userInfo().username);
	console.log('====================================================');
	console.log('Name          : ' + CONF.name);
	console.log('Version       : ' + CONF.version);
	CONF.author && console.log('Author        : ' + CONF.author);
	console.log('Date          : ' + NOW.format('yyyy-MM-dd HH:mm:ss'));
	console.log('Mode          : ' + (DEBUG ? 'debug' : 'release'));
	F.threads && console.log('Threads       : ' + Object.keys(F.threads).join(', '));
	global.THREAD && console.log('Thread        : ' + global.THREAD);
	console.log('====================================================');
	CONF.default_root && console.log('Root          : ' + CONF.default_root);
	console.log('Directory     : ' + process.cwd());
	console.log('node_modules  : ' + PATHMODULES);
	console.log('====================================================\n');

	if (!F.isWorker) {

		var hostname = F.unixsocket ? ('Socket: ' + F.unixsocket) : '{2}://{0}:{1}/'.format(F.ip, F.port, F.isHTTPS ? 'https' : 'http');

		if (!F.unixsocket && F.ip === '0.0.0.0') {
			var ni = Os.networkInterfaces();
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

		console.log(hostname);
		console.log('');
	}
};

F.usagesnapshot = function(filename) {
	Fs.writeFile(filename || PATH.root('usage' + (F.id ? ('-' + F.id) : '') + '.log'), JSON.stringify(F.usage(true), null, '\t'), NOOP);
};

/**
 * Re-connect server
 * @return {Framework}
 */
F.reconnect = function() {
	if (CONF.default_port !== undefined)
		F.port = CONF.default_port;
	if (CONF.default_ip !== undefined)
		F.ip = CONF.default_ip;
	F.server.close(() => F.server.listen(F.port, F.ip));
};

function cleargc() {
	global.gc();
}

var websocketpingerenabled = false;

function websocketpinger() {
	if (!websocketpingerenabled && CONF.default_websocket_maxlatency) {
		websocketpingerenabled = true;
		setInterval(function() {
			for (var item in F.connections) {
				var conn = F.connections[item];
				if (conn && conn.keys.length) {
					conn.check();
					conn.ping();
				}
			}
		}, CONF.default_interval_websocket_ping < 1000 ? 20000 : CONF.default_interval_websocket_ping);
	}
}

F.service = function(count) {

	UIDGENERATOR_REFRESH();

	var releasegc = false;
	var keys;

	// clears short cahce temporary cache
	F.temporary.shortcache = {};

	// clears temporary memory for non-exist files
	F.temporary.notfound = {};

	if (CONF.allow_reqlimit)
		F.temporary.ddos = {};

	// every 10 minutes (default) service clears static cache
	if (count % CONF.default_interval_clear_cache === 0) {

		F.$events.clear && EMIT('clear', 'temporary', F.temporary);
		F.temporary.path = {};
		F.temporary.range = {};
		F.temporary.views = {};
		F.temporary.other = {};
		F.temporary.exec = {};
		F.convertors = {};

		global.TEMP = {};
		global.$VIEWCACHE && global.$VIEWCACHE.length && (global.$VIEWCACHE = []);

		// Clears command cache
		Image.clear();
		releasegc = true;

		for (var key in F.temporary.internal) {
			if (!F.temporary.internal[key])
				delete F.temporary.internal[key];
		}

		// Clears released sessions
		for (var key in F.sessions) {
			if (F.sessions[key]) {
				F.sessions[key].clean();
				CONF.allow_sessions_unused && F.sessions[key].releaseunused(CONF.allow_sessions_unused);
			}
		}
	}

	// Clears expired operations
	for (var key in F.operations) {
		if (F.operations[key].expire && F.operations[key].expire < NOW) {
			if (F.operations[key].uninstall) {
				try {
					F.operations[key].uninstall();
				} catch (e) {}
			}
			delete F.operations[key];
		}
	}

	// Clears expired tasks
	for (var key in F.tasks) {
		if (F.tasks[key].expire && F.tasks[key].expire < NOW) {
			if (F.tasks[key].uninstall) {
				try {
					F.tasks[key].uninstall();
				} catch (e) {}
			}
			delete F.tasks[key];
		}
	}

	if (count % 1440 === 0)
		TMSBLOCKED = {};

	if (count % CONF.default_interval_clear_dnscache === 0) {
		F.$events.clear && EMIT('clear', 'dns');
		CMD('clear_dnscache');
	}

	// every 20 minutes (default) service clears resources
	if (count % CONF.default_interval_clear_resources === 0) {
		F.$events.clear && EMIT('clear', 'resources');
		F.resources = {};
		releasegc = true;
	}

	// Session DDOS cleaner
	if (F.sessionscount && count % 15 === 0) {
		for (var key in F.sessions) {
			var session = F.sessions[key];
			if (session.ddosis) {
				session.ddos = {};
				session.ddosis = false;
			}
		}
	}

	// Update expires date
	if (count % 1000 === 0)
		DATE_EXPIRES = NOW.add('y', 1).toUTCString();

	F.$events.service && EMIT('service', count);

	releasegc && global.gc && setTimeout(cleargc, 1000);

	if (WORKERID > 9999999999)
		WORKERID = 0;

	if (BLOCKEDB.is) {
		BLOCKEDB.is = false;
		for (var key in BLOCKEDB) {
			if (key !== 'is') {
				var tmp = BLOCKEDB[key];
				if (tmp.expire < NOW)
					delete BLOCKEDB[key];
				else
					BLOCKEDB.is = true;
			}
		}
	}

	// Run schedules
	keys = Object.keys(F.schedules);

	if (!keys.length)
		return;

	var expire = NOW.getTime();

	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var schedule = F.schedules[key];

		if (schedule.cron) {
			if (schedule.cron(NOW))
				schedule.fn();
			continue;
		}

		if (schedule.expire <= expire) {
			if (schedule.repeat)
				schedule.expire = NOW.add(schedule.repeat);
			else
				delete F.schedules[key];
			schedule.fn();
		}
	}
};

F.listener = function(req, res) {

	req.options = res.options = {};
	res.req = req;
	req.res = res;

	if (F._length_wait)
		return F.response503(req, res);
	else if (!req.host) // HTTP 1.0 without host
		return res.throw400();

	if (DEF.blacklist[req.ip]) {
		F.stats.request.blocked++;
		req.destroy();
		return;
	}

	F.stats.request.request++;

	if (CONF.allow_reqlimit) {
		var ip = req.ip;
		if (F.temporary.ddos[ip] > CONF.allow_reqlimit) {
			F.stats.response.ddos++;
			res.options.code = 503;
			res.options.headers = HEADERS.response503ddos;
			res.options.body = '503 Service Unavailable';
			res.$text();
			return;
		}
		if (F.temporary.ddos[ip])
			F.temporary.ddos[ip]++;
		else
			F.temporary.ddos[ip] = 1;
	}

	if (!req.url)
		req.url = '/';

	var headers = req.headers;
	req.$protocol = ((req.connection && req.connection.encrypted) || ((headers['x-forwarded-proto'] || ['x-forwarded-protocol']) === 'https')) ? 'https' : 'http';
	req.uri = framework_internal.parseURI(req);

	if (F._request_check_proxy) {
		var url = req.url.toLowerCase();
		for (var i = 0; i < F.routes.proxies.length; i++) {
			var proxy = F.routes.proxies[i];
			var u = url.substring(0, proxy.url.length);

			if (u[u.length - 1] !== '/')
				u += '/';

			if (u === proxy.url && (!proxy.check || proxy.check(req, res))) {
				F.stats.response.proxy++;
				makeproxy(proxy, req, res);
				return;
			}
		}
	}

	F.$events.request && EMIT('request', req, res);

	if (F._request_check_redirect) {
		var redirect = F.routes.redirects[req.$protocol + '://' + req.host];
		if (redirect) {
			F.stats.response.forward++;
			res.options.url = redirect.url + (redirect.path ? req.url : '');
			res.options.permanent = redirect.permanent;
			res.$redirect();
			return;
		}
	}

	req.path = framework_internal.routesplit(req.uri.pathname);
	req.processing = 0;
	req.isAuthorized = true;
	req.xhr = headers['x-requested-with'] === 'XMLHttpRequest';
	res.success = false;
	req.user = req.session = null;
	req.isStaticFile = CONF.allow_static_files && U.isStaticFile(req.uri.pathname);

	if (req.isStaticFile) {
		req.extension = U.getExtension(req.uri.pathname);
		if (DEF.onLocale)
			req.$language = DEF.onLocale(req, res, true);
	}

	req.on('close', onrequesterror);
	req.on('aborted', onrequesterror);

	if (F._length_request_middleware) {
		async_middleware(0, req, res, F.routes.request, requestcontinue_middleware);
	} else {
		if (req.isStaticFile && F._length_request_middleware_static)
			async_middleware(0, req, res, F.routes.request_static, requestcontinue_middleware2);
		else
			F.$requestcontinue(req, res, headers);
	}
};

function requestcontinue_middleware(req, res)  {

	if (req.$total_middleware)
		req.$total_middleware = null;

	if (req.isStaticFile && F._length_request_middleware_static)
		async_middleware(0, req, res, F.routes.request_static, requestcontinue_middleware2);
	else
		F.$requestcontinue(req, res, req.headers);
}

function requestcontinue_middleware2(req, res)  {
	req.$total_middleware = null;
	F.$requestcontinue(req, res, req.headers);
}

function onrequesterror() {
	if (!this.success) {
		this.success = true;
		if (this.res)
			this.res.$aborted = true;
	}
}

function makeproxyheadersws(header, headers) {

	var output = [];

	for (var key in headers) {
		var value = headers[key];
		if (value instanceof Array) {
			for (var item of value)
				output.push(key + ': ' + item);
		} else
			output.push(key + ': ' + value);
	}

	output.unshift(header);
	return output.join(NEWLINE) + NEWLINE + NEWLINE;
}

function makeproxy(proxy, req, res, wshead) {

	var secured = proxy.uri.protocol === 'https:';
	var uri = {};

	if (proxy.uri.host) {
		uri.host = proxy.uri.host;
		uri.hostname = proxy.uri.hostname;
	} else
		uri.socketPath = proxy.uri.socketPath;

	var tmp;

	uri.method = req.method;
	uri.headers = req.headers;

	if (uri.socketPath) {
		uri.path = proxy.copypath == false || proxy.copypath === 'replace' ? req.url.substring(proxy.url.length - 1) : req.uri.path;
	} else {

		if (proxy.copypath === false) {
			uri.path = proxy.uri.path;
		} else if (proxy.copypath === 'replace')
			uri.path = req.url.substring(proxy.url.length - 1);
		else if (proxy.copypath === 'extend') {
			tmp = req.uri.path.substring(proxy.url.length);
			uri.path = proxy.path + (tmp ? ((tmp[0] === '/' ? '' : '/') + tmp) : '') + (proxy.query ? (req.uri.query ? ('&' + proxy.query) : proxy.query) : '');
		} else {
			tmp = req.uri.path;
			uri.path = proxy.path + (tmp ? ((tmp[0] === '/' ? '' : '/') + tmp) : '') + (proxy.query ? (req.uri.query ? ('&' + proxy.query) : proxy.query) : '');
		}

		if (proxy.uri.port)
			uri.port = proxy.uri.port;
	}

	if (!wshead && uri.headers.connection)
		delete uri.headers.connection;

	uri.headers['x-forwarded-for'] = req.ip;
	uri.headers['x-forwarded-url'] = req.url;
	uri.headers['x-forwarded-host'] = req.headers.host;
	uri.agent = secured ? PROXYKEEPALIVEHTTPS : PROXYKEEPALIVE;

	delete uri.headers.host;

	proxy.before && proxy.before(uri, req, res);
	F.stats.performance.external++;
	F.stats.request.external++;

	if (res.headersSent || res.success)
		return;

	var get = uri.method === 'GET' || uri.method === 'HEAD' || uri.method === 'OPTIONS';
	var kind = secured ? Https : Http;
	var request = get && !wshead ? kind.get(uri, makeproxycallback) : kind.request(uri, makeproxycallback);

	request.on('error', makeproxyerror);
	request.on('abort', makeproxyerror);
	request.on('aborted', makeproxyerror);

	request.$res = res;
	request.$proxy = proxy;
	request.iswebsocket = !!wshead;

	if (!wshead && proxy.timeout) {
		req.$total_timeout = proxy.timeout;
		TIMEOUTS.push(req);
		FINISHED(res, () => req && (req.success = true));
	}

	if (wshead) {

		res.setTimeout(0);
		res.setNoDelay(true);
		res.setKeepAlive(true, 0);

		wshead && wshead.length && res.unshift(wshead);

		request.on('response', function (proxyres) {
			if (!proxyres.upgrade) {
				res.write(makeproxyheadersws('HTTP/' + proxyres.httpVersion + ' ' + proxyres.statusCode + ' ' + proxyres.statusMessage, proxyres.headers));
				proxyres.pipe(res);
			}
		});

		request.on('upgrade', function(proxyres, proxysocket, proxyhead) {
			if (proxyhead && proxyhead.length)
				proxysocket.unshift(proxyhead);
			res.write(makeproxyheadersws('HTTP/1.1 101 Switching Protocols', proxyres.headers));
			proxysocket.pipe(res).pipe(proxysocket);
		});

	}

	if (get)
		request.end();
	else
		req.pipe(request, PROXYOPTIONS);
}

function makeproxyerror(err) {

	if (this.success)
		return;

	MODELERROR.code = 503;
	MODELERROR.status = U.httpstatus(503, false);
	MODELERROR.error = err + '';
	this.success = true;

	if (this.$res.writeHead)
		this.$res.writeHead(503, HEADERS.response503);

	this.$res.end(VIEW('.' + PATHMODULES + 'error', MODELERROR));
}

function makeproxycallback(response) {
	this.$proxy.after && this.$proxy.after(response);
	this.$res.writeHead && this.$res.writeHead(response.statusCode, response.headers);
	response.pipe(this.$res, PROXYOPTIONS);
}

const TRAVELCHARS = { e: 1, E: 1 };

/**
 * Continue to process
 * @private
 * @param {Request} req
 * @param {Response} res
 * @param {Object} headers
 * @param {String} protocol [description]
 * @return {Framework}
 */
F.$requestcontinue = function(req, res, headers) {

	if (!req || !res || res.headersSent || res.success)
		return;

	var tmp;
	var isCORS = (F._length_cors || F.routes.corsall) && req.headers.origin != null;

	// Validates if this request is the file (static file)
	if (req.isStaticFile) {

		tmp = F.temporary.shortcache[req.uri.pathname];
		F.stats.performance.file++;

		if (!tmp) {
			// Stops path travelsation outside of "public" directory
			// A potential security issue
			for (var i = 0; i < req.uri.pathname.length - 1; i++) {
				var c = req.uri.pathname[i];
				var n = req.uri.pathname[i + 1];
				if ((c === '.' && (n === '/' || n === '%')) || (c === '%' && n === '2' && TRAVELCHARS[req.uri.pathname[i + 2]])) {
					F.temporary.shortcache[req.uri.pathname] = 2;
					req.$total_status(404);
					return;
				}
			}
			F.temporary.shortcache[req.uri.pathname] = 1;
		} else if (tmp === 2) {
			req.$total_status(404);
			return;
		}

		if (isCORS) {
			F.$cors_static(req, res, cors_callbackfiles);
		} else {
			F.stats.request.file++;
			if (F._length_files)
				req.$total_file();
			else
				res.continue();
		}

		return;
	}

	F.stats.performance.request++;

	if (!PERF[req.method]) {
		req.$total_status(404);
		return;
	}

	if (req.uri.search) {
		tmp = F.temporary.shortcache[req.uri.search];

		if (!tmp) {
			tmp = 1;
			for (var i = 1; i < req.uri.search.length - 2; i++) {
				if (req.uri.search[i] === '%' && req.uri.search[i + 1] === '0' && req.uri.search[i + 2] === '0') {
					tmp = 2;
					break;
				}
			}
			F.temporary.shortcache[req.uri.search] = tmp;
		}

		if (tmp === 2) {
			req.$total_status(404);
			return;
		}
	}

	F.stats.request.web++;
	req.body = EMPTYOBJECT;
	req.files = EMPTYARRAY;
	req.bodyexceeded = false;
	req.bodyhas = false;

	var multipart;

	if (F._request_check_mobile && req.mobile)
		F.stats.request.mobile++;
	else
		F.stats.request.desktop++;

	req.$type = 0;

	var method = req.method;
	var first = method[0];

	if (first === 'P' || first === 'D') {

		multipart = req.headers['content-type'] || '';
		req.bodydata = Buffer.alloc(0);

		var index = multipart.indexOf(';', 6);
		var tmp = multipart;
		if (index !== -1)
			tmp = tmp.substring(0, index);

		switch (tmp.substring(tmp.length - 4)) {
			case 'json':
				req.$type = 1;
				multipart = '';
				break;
			case 'oded':
				req.$type = 3;
				multipart = '';
				break;
			case 'data':
				req.$upload = true;
				break;
			case '/xml':
				req.$type = 2;
				multipart = '';
				break;
			default:
				if (multipart) {
					// 'undefined' DATA
					multipart = '';
				} else {
					req.$type = 3;
					multipart = '';
				}
				break;
		}
	}

	if (headers.accept === 'text/event-stream')
		req.$sse = true;

	if (req.xhr)
		F.stats.request.xhr++;

	F.$events.request_begin && EMIT('request_begin', req, res);

	switch (first) {
		case 'G':
			F.stats.request.get++;
			if (isCORS)
				F.$cors(req, res, cors_callback0);
			else
				req.$total_end();
			return;

		case 'O':
			F.stats.request.options++;
			if (isCORS)
				F.$cors(req, res, cors_callback0);
			else
				req.$total_end();
			return;

		case 'H':
			F.stats.request.head++;
			if (isCORS)
				F.$cors(req, res, cors_callback0);
			else
				req.$total_end();
			return;

		case 'D':
			F.stats.request['delete']++;
			if (isCORS)
				F.$cors(req, res, cors_callback1);
			else
				req.$total_urlencoded();
			return;

		case 'P':
			if (F._request_check_POST) {
				if (multipart) {
					if (isCORS)
						F.$cors(req, res, cors_callback_multipart, multipart);
					else
						req.$total_multipart(multipart);
				} else {
					if (method === 'PUT')
						F.stats.request.put++;
					else if (method === 'PATCH')
						F.stats.request.patch++;
					else
						F.stats.request.post++;
					if (isCORS)
						F.$cors(req, res, cors_callback1);
					else
						req.$total_urlencoded();
				}
				return;
			}
			break;
	}

	req.$total_status(404);
};

function cors_callbackfiles(req) {
	F.stats.request.file++;
	if (F._length_files)
		req.$total_file();
	else
		req.res.continue();
}

function cors_callback0(req) {
	req.$total_end();
}

function cors_callback1(req) {
	req.$total_urlencoded();
}

function cors_callback_multipart(req, res, multipart) {
	req.$total_multipart(multipart);
}

F.$cors = function(req, res, fn, arg) {

	var isAllowed = F.routes.corsall;
	var cors, origin;
	var headers = req.headers;
	var key;

	if (isAllowed && F.routes.corsallorigins)
		isAllowed = F.routes.corsallorigins.includes(headers.origin);
	else
		isAllowed = F.routes.corsall;

	if (!isAllowed) {

		for (var i = 0; i < F._length_cors; i++) {
			cors = F.routes.cors[i];
			if (framework_internal.routecompare(req.path, cors.url, false, cors.isWILDCARD)) {
				isAllowed = true;
				break;
			}
		}

		if (!isAllowed)
			return fn(req, res, arg);

		var stop = false;

		key = 'cors' + cors.hash + '_' + headers.origin;

		if (F.temporary.other[key]) {
			stop = F.temporary.other[key] === 2;
		} else {

			isAllowed = false;

			if (cors.headers) {
				isAllowed = false;
				for (var i = 0; i < cors.headers.length; i++) {
					if (headers[cors.headers[i]]) {
						isAllowed = true;
						break;
					}
				}
				if (!isAllowed)
					stop = true;
			}

			if (!stop && cors.methods) {
				isAllowed = false;
				var current = headers['access-control-request-method'] || req.method;
				if (current !== 'OPTIONS') {
					for (var i = 0; i < cors.methods.length; i++) {
						if (current === cors.methods[i]) {
							isAllowed = true;
							break;
						}
					}
					if (!isAllowed)
						stop = true;
				}
			}

			if (!stop && cors.origin) {
				origin = headers.origin.toLowerCase().substring(headers.origin.indexOf('/') + 2);
				if (origin !== headers.host) {
					isAllowed = false;
					for (var i = 0; i < cors.origin.length; i++) {
						if (cors.origin[i].indexOf(origin) !== -1) {
							isAllowed = true;
							break;
						}
					}
					if (!isAllowed)
						stop = true;
				}
			}

			F.temporary.other[key] = stop ? 2 : 1;
		}
	} else if (CONF.default_cors) {
		key = headers.origin;
		if (F.temporary.other[key]) {
			stop = F.temporary.other[key] === 2;
		} else {
			origin = key.toLowerCase().substring(key.indexOf('/') + 2);
			stop = origin !== headers.host && CONF.default_cors.indexOf(origin) === -1;
			F.temporary.other[key] = stop ? 2 : 1;
		}
	}

	if (stop)
		origin = 'null';
	else
		origin = headers.origin;

	res.setHeader('Access-Control-Allow-Origin', origin);

	if (!cors || cors.credentials)
		res.setHeader('Access-Control-Allow-Credentials', 'true');

	var name = 'Access-Control-Allow-Methods';
	var isOPTIONS = req.method === 'OPTIONS';

	if (cors && cors.methods)
		res.setHeader(name, cors.methods.join(', '));
	else
		res.setHeader(name, isOPTIONS ? headers['access-control-request-method'] || '*' : req.method);

	name = 'Access-Control-Allow-Headers';

	if (cors && cors.headers)
		res.setHeader(name, cors.headers.join(', '));
	else
		res.setHeader(name, headers['access-control-request-headers'] || '*');

	cors && cors.age && res.setHeader('Access-Control-Max-Age', cors.age);
	res.setHeader('Access-Control-Expose-Headers', '*');

	if (stop) {
		fn = null;
		F.$events.request_end && EMIT('request_end', req, res);
		F.stats.request.blocked++;
		res.writeHead(404);
		res.end();
		return;
	}

	if (!isOPTIONS)
		return fn(req, res, arg);

	fn = null;
	F.$events.request_end && EMIT('request_end', req, res);
	res.writeHead(200);
	res.end();
};

F.$cors_static = function(req, res, fn, arg) {

	var cors, origin;
	var headers = req.headers;
	var key;
	var stop = false;

	if (CONF.default_cors) {
		key = headers.origin;
		if (F.temporary.other[key]) {
			stop = F.temporary.other[key] === 2;
		} else {
			origin = key.toLowerCase().substring(key.indexOf('/') + 2);
			stop = origin !== headers.host && CONF.default_cors.indexOf(origin) === -1;
			F.temporary.other[key] = stop ? 2 : 1;
		}
	}

	if (stop)
		origin = 'null';
	else
		origin = headers.origin;

	res.setHeader('Access-Control-Allow-Origin', origin);

	if (!cors || cors.credentials)
		res.setHeader('Access-Control-Allow-Credentials', 'true');

	var name = 'Access-Control-Allow-Methods';
	var isOPTIONS = req.method === 'OPTIONS';

	if (cors && cors.methods)
		res.setHeader(name, cors.methods.join(', '));
	else
		res.setHeader(name, isOPTIONS ? headers['access-control-request-method'] || '*' : req.method);

	name = 'Access-Control-Allow-Headers';

	if (cors && cors.headers)
		res.setHeader(name, cors.headers.join(', '));
	else
		res.setHeader(name, headers['access-control-request-headers'] || '*');

	cors && cors.age && res.setHeader('Access-Control-Max-Age', cors.age);
	res.setHeader('Access-Control-Expose-Headers', '*');

	if (stop) {
		fn = null;
		F.stats.request.blocked++;
		res.writeHead(404);
		res.end();
		return;
	}

	if (!isOPTIONS)
		return fn(req, res, arg);

	fn = null;
	res.writeHead(200);
	res.end();
};

/**
 * Upgrade HTTP (WebSocket)
 * @param {HttpRequest} req
 * @param {Socket} socket
 * @param {Buffer} head
 */
const REGWS = /websocket/i;

F.$upgrade = function(req, socket, head) {

	if (F._length_wait || !req.headers.upgrade || !REGWS.test(req.headers.upgrade))
		return;

	var headers = req.headers;
	req.$protocol = req.connection.encrypted || (headers['x-forwarded-protocol'] || headers['x-forwarded-proto']) === 'https' ? 'https' : 'http';
	req.uri = framework_internal.parseURI(req);

	if (F._request_check_proxy) {
		var url = req.url.toLowerCase();
		for (var i = 0; i < F.routes.proxies.length; i++) {
			var proxy = F.routes.proxies[i];
			var u = url.substring(0, proxy.url.length);
			if (u[u.length - 1] !== '/')
				u += '/';
			if (u === proxy.url && (!proxy.check || proxy.check(req, socket, head))) {
				F.stats.response.proxy++;
				makeproxy(proxy, req, socket, head);
				return;
			}
		}
	}

	// disables timeout
	socket.setTimeout(0);
	socket.on('error', NOOP);

	req.$total_route = F.lookup_websocket(req, 0, true);

	if (!req.$total_route || (req.$total_route.flags2.csrf && !DEF.onCSRFcheck(req)) || DEF.blacklist[req.ip]) {
		req.destroy();
		return;
	}

	F.$events.websocket && EMIT('websocket', req, socket, head);
	F.stats.request.websocket++;

	req.session = null;
	req.user = null;
	req.flags = [req.secured ? 'https' : 'http', 'get'];

	req.$wspath = U.path(req.uri.pathname);
	var websocket = new WebSocketClient(req, socket, head);

	websocket.$ondata2 = () => websocket.$ondata();

	req.path = framework_internal.routesplit(req.uri.pathname);
	req.websocket = websocket;

	if (F._length_request_middleware) {
		async_middleware(0, req, req.websocket, F.routes.request, websocketcontinue_middleware);
	} else {
		if (F._length_request_middleware_socket)
			async_middleware(0, req, req.websocket, F.routes.request_socket, websocketcontinue_middleware2);
		else
			F.$websocketcontinue(req, req.$wspath, headers);
	}
};

function websocketcontinue_middleware(req) {

	if (F._length_request_middleware_socket) {
		async_middleware(0, req, req.websocket, F.routes.request_socket, websocketcontinue_middleware2);
		return;
	}

	if (req.$total_middleware)
		req.$total_middleware = null;

	F.$websocketcontinue(req, req.$wspath, req.headers);
}

function websocketcontinue_middleware2(req) {
	req.$total_middleware = null;
	F.$websocketcontinue(req, req.$wspath, req.headers);
}

function websocketcontinue_authnew(isAuthorized, user, $) {

	// @isAuthorized "null" for callbacks(err, user)
	// @isAuthorized "true"
	// @isAuthorized "object" is as user but "user" must be "undefined"

	if (isAuthorized instanceof Error || isAuthorized instanceof ErrorBuilder) {
		// Error handling
		isAuthorized = false;
	} else if (isAuthorized == null && user) {
		// A callback error handling
		isAuthorized = true;
	} else if (user == null && isAuthorized && isAuthorized !== true) {
		user = isAuthorized;
		isAuthorized = true;
	}

	var membertype = isAuthorized ? 1 : 2;
	var req = $.req;

	req.isAuthorized = isAuthorized;

	if (user)
		req.user = user;

	var route = req.$total_route.MEMBER === membertype ? req.$total_route : F.lookup_websocket(req, membertype);
	if (route)
		F.$websocketcontinue_process(route, req, req.websocketpath);
	else
		req.websocket.$close(4001, '401: unauthorized');
}

F.$websocketcontinue = function(req, path) {
	req.websocketpath = path;
	if (DEF.onAuthorize) {
		DEF.onAuthorize(req, req.websocket, websocketcontinue_authnew);
	} else {
		var route = F.lookup_websocket(req, 0);
		if (route)
			F.$websocketcontinue_process(route, req, path);
		else
			req.websocket.$close(4004, '404: not found');
	}
};

F.$websocketcontinue_process = function(route, req, path) {

	var socket = req.websocket;

	if (!socket.prepare(route.flags, route.protocols, route.allow, route.length)) {
		socket.$close(4001, '401: unauthorized');
		return;
	}

	if (DEF.onLocale) {
		// req.$language = DEF.onLocale(req, socket);
		req.$language = DEF.onLocale(req);
	}

	var id = path + (route.flags.length ? '#' + route.flags.join('-') : '');

	if (route.isBINARY)
		socket.type = 1;
	else if (route.isJSON)
		socket.type = 3;

	if (route.isBUFFER)
		socket.typebuffer = true;

	var next = function() {

		if (req.$total_middleware)
			req.$total_middleware = null;

		if (F.connections[id]) {
			socket.upgrade(F.connections[id]);
			return;
		}

		var params = framework_internal.routeparams(route.param.length ? req.split : req.path, route);
		if (params.error) {
			socket.$close(4000, '400: invalid parameters');
			return;
		}

		var connection = new WebSocket(path, route.controller, id);
		connection.encodedecode = CONF.default_websocket_encodedecode === true;

		if (!route.connections)
			route.connections = [];

		route.connections.push(connection);
		connection.route = route;
		connection.options = route.options;
		F.connections[id] = connection;
		route.onInitialize.call(connection, params.values[0], params.values[1], params.values[2], params.values[3], params.values[4], params.values[5]);
		setImmediate(next_upgrade_continue, socket, connection);
	};

	if (route.middleware)
		async_middleware(0, req, req.websocket, route.middleware, next, route.options);
	else
		next();
};

function next_upgrade_continue(socket, connection) {
	socket.upgrade(connection);
	websocketpinger();
}

/**
 * Get a model
 * @param {String} name
 * @return {Object}
 */
global.MODEL = function(name) {
	return F.models[name];
};

/**
 * Load a source code
 * @param {String} name
 * @param {Object} options Custom initial options, optional.
 * @return {Object}
 */
global.INCLUDE = global.SOURCE = function(name) {
	var obj = F.sources[name];
	if (obj || obj === null)
		return obj;
	var filename = U.combine(CONF.directory_source, name + SCRIPTEXT);
	existsSync(filename) && install('source', name, filename);
	if (!F.sources[name])
		F.sources[name] = null;
	return F.sources[name];
};


global.MAIL = function(address, subject, view, model, language, callback) {
};

global.HTMLMAIL = function(address, subject, body, language, callback) {
};

global.COMPONENTATOR = function(name, components, removeprev) {

	var meta = {};

	meta.components = components;
	meta.name = name;

	F.$events.componentator && EMIT('componentator', meta);

	var url = 'https://componentator.com/download.js?id=' + meta.components;
	var nameid = meta.name.slug();
	var relative = 'ui-' + (removeprev ? (nameid + '-') : '') + url.makeid() + '.min.js';
	var filename = PATH.public(relative);

	REPO[meta.name] = '/' + relative;

	if (removeprev) {
		F.Fs.readdir(PATH.public(), function(err, files) {

			var rem = [];
			for (var m of files) {
				if (m !== relative && m.indexOf('ui-' + nameid + '-') !== -1)
					rem.push(PATH.public(m));
			}

			if (rem.length)
				PATH.unlink(rem);

		});
	}

	F.Fs.lstat(filename, function(err) {
		if (err)
			DOWNLOAD(url, filename, ERROR('COMPONENTATOR'));
	});

};

/**
 * Renders view
 * @param {String} name View name.
 * @param {Object} model Model.
 * @param {String} layout Layout for the view, optional. Default without layout.
 * @param {Object} repository A repository object, optional. Default empty.
 * @param {String} language Optional.
 * @return {String}
 */
global.VIEW = function(name, model, layout, repository, language) {

	var controller = EMPTYCONTROLLER;

	if (typeof(layout) === 'object') {
		var tmp = repository;
		repository = layout;
		layout = tmp;
	}

	controller.layoutName = layout || '';
	controller.language = language || '';
	controller.repository = typeof(repository) === 'object' && repository ? repository : EMPTYOBJECT;

	var theme = U.parseTheme(name);
	if (theme) {
		controller.themeName = theme;
		name = prepare_viewname(name);
	} else if (DEF.onTheme)
		controller.themeName = DEF.onTheme(controller);
	else
		controller.themeName = undefined;

	return controller.view(name, model, true);
};

/**
 * Compiles and renders view
 * @param {String} body HTML body.
 * @param {Object} model Model.
 * @param {String} layout Layout for the view, optional. Default without layout.
 * @param {Object} repository A repository object, optional. Default empty.
 * @param {String} language Optional.
 * @return {String}
 */
global.VIEWCOMPILE = function(body, model, layout, repository, language) {

	var controller = EMPTYCONTROLLER;

	if (typeof(layout) === 'object') {
		var tmp = repository;
		repository = layout;
		layout = tmp;
	}

	controller.layoutName = layout || '';
	controller.language = language || '';
	controller.themeName = undefined;
	controller.repository = typeof(repository) === 'object' && repository ? repository : EMPTYOBJECT;

	return controller.view_compile(body, model, true);
};

/**
 * Clear temporary directory
 * @param {Function} callback
 * @param {Boolean} isInit Private argument.
 * @return {Framework}
 */
F.clear = function(callback, isInit) {

	var dir = PATH.temp();
	var plus = F.clusterid;

	if (isInit) {
		if (!CONF.allow_clear_temp) {
			if (F.$bundling) {
				// clears only JS and CSS files
				U.ls(dir, function(files) {
					PATH.unlink(files, function() {
						callback && callback();
					});
				}, function(filename, folder) {
					if (folder || (plus && !filename.substring(dir.length).startsWith(plus)))
						return false;
					if (filename.indexOf('.package') !== -1)
						return true;
					var ext = U.getExtension(filename);
					return JSFILES[ext]  || ext === 'css' || ext === 'tmp' || ext === 'upload' || ext === 'html' || ext === 'htm';
				});
			}
			return;
		}
	}

	if (!existsSync(dir) || !F.$bundling) {
		callback && callback();
		return;
	}

	U.ls(dir, function(files, directories) {

		if (isInit) {
			var arr = [];
			for (var i = 0, length = files.length; i < length; i++) {
				var filename = files[i].substring(dir.length);
				if (plus && !filename.startsWith(plus))
					continue;
				if ((filename.indexOf('/') === -1 || filename.indexOf('.package/') !== -1) && !filename.endsWith('.cache'))
					arr.push(files[i]);
			}

			files = arr;
			directories = directories.remove(function(name) {
				name = U.getName(name);

				if (name[0] === '~')
					return false;

				if (name.endsWith('.package'))
					return false;

				return true;
			});
		}

		PATH.unlink(files, () => PATH.rmdir(directories, callback));
	});

	if (!isInit) {
		// clear static cache
		F.temporary.path = {};
		F.temporary.range = {};
		F.temporary.notfound = {};
	}
};

/**
 * Remove files in array
 * @param {String Array} arr File list.
 * @param {Function} callback
 * @return {Framework}
 */
PATH.unlink = function(arr, callback) {

	if (typeof(arr) === 'string')
		arr = [arr];

	if (!arr.length) {
		callback && callback();
		return;
	}

	var filename = arr.shift();
	if (filename)
		Fs.unlink(filename, () => PATH.unlink(arr, callback));
	else
		callback && callback();
};

/**
 * Remove directories in array
 * @param {String Array} arr
 * @param {Function} callback
 * @return {Framework}
 */
PATH.rmdir = function(arr, callback) {
	if (typeof(arr) === 'string')
		arr = [arr];

	if (!arr.length) {
		callback && callback();
		return;
	}

	var path = arr.shift();
	if (path) {
		U.ls(path, function(files, directories) {
			directories.reverse();
			directories.push(path);
			files.wait((item, next) => Fs.unlink(item, next), function() {
				directories.wait((item, next) => Fs.rmdir(item, next), () => PATH.rmdir(arr, callback));
			});
		});
	} else
		callback && callback();
};

/**
 * Cryptography (encrypt)
 * @param {String} value
 * @param {String} key Encrypt key.
 * @param {Boolean} isUnique Optional, default true.
 * @return {String}
 */
global.ENCRYPT = function(value, key, isUnique) {

	if (value == null)
		return '';

	var type = typeof(value);

	if (typeof(key) === 'boolean') {
		var tmp = isUnique;
		isUnique = key;
		key = tmp;
	}

	if (type === 'function')
		value = value();
	else if (type === 'number')
		value = (value + '');
	else if (type === 'object')
		value = JSON.stringify(value);

	if (CONF.default_crypto) {

		/*
		key = (key || '') + CONF.secret;

		if (key.length < 32)
			key += ''.padLeft(32 - key.length, '0');

		if (key.length > 32)
			key = key.substring(0, 32);*/

		if (!F.temporary.keys[key])
			F.temporary.keys[key] = Buffer.from(key);

		var cipher = Crypto.createCipheriv(CONF.default_crypto, F.temporary.keys[key], CONF.default_crypto_iv);
		CONCAT[0] = cipher.update(value);
		CONCAT[1] = cipher.final();
		return Buffer.concat(CONCAT).toString('hex');
	}

	return value.encrypt(CONF.secret + '=' + key, isUnique);
};

/**
 * Cryptography (decrypt)
 * @param {String} value
 * @param {String} key Decrypt key.
 * @param {Boolean} jsonConvert Optional, default true.
 * @return {Object or String}
 */
global.DECRYPT = function(value, key, jsonConvert) {

	if (typeof(key) === 'boolean') {
		var tmp = jsonConvert;
		jsonConvert = key;
		key = tmp;
	}

	if (typeof(jsonConvert) !== 'boolean')
		jsonConvert = true;

	var response;

	if (CONF.default_crypto) {

		/*
		key = (key || '') + CONF.secret;

		if (key.length < 32)
			key += ''.padLeft(32 - key.length, '0');

		if (key.length > 32)
			key = key.substring(0, 32);*/

		if (!F.temporary.keys[key])
			F.temporary.keys[key] = Buffer.from(key);

		var decipher = Crypto.createDecipheriv(CONF.default_crypto, F.temporary.keys[key], CONF.default_crypto_iv);
		try {
			CONCAT[0] = decipher.update(Buffer.from(value || '', 'hex'));
			CONCAT[1] = decipher.final();
			response = Buffer.concat(CONCAT).toString(ENCODING);
		} catch (e) {
			response = null;
		}
	} else
		response = (value || '').decrypt(CONF.secret + '=' + key);

	return response ? (jsonConvert ? (response.isJSON() ? response.parseJSON(true) : null) : response) : null;
};

global.ENCRYPTREQ = function(req, val, key, strict) {

	if (req instanceof Controller)
		req = req.req;

	var obj = {};
	obj.ua = req.ua;
	if (strict)
		obj.ip = req.ip;
	obj.data = val;
	return ENCRYPT(obj, key);
};

global.DECRYPTREQ = function(req, val, key) {
	if (!val)
		return;
	if (req instanceof Controller)
		req = req.req;
	var obj = DECRYPT(val, key || '', true);
	if (!obj || (obj.ip && obj.ip !== req.ip) || (obj.ua !== req.ua))
		return;
	return obj.data;
};

/**
 * Resource reader
 * @param {String} name Optional, resource file name. Default: "default".
 * @param {String} key Resource key.
 * @return {String} String
 */

const DEFNAME = 'default';

global.RESOURCE = function(name, key) {

	if (!key) {
		key = name;
		name = null;
	}

	if (!name)
		name = DEFNAME;

	var res = F.resources[name];
	if (res) {
		if (res[key] == null && name !== DEFNAME)
			return res[key] = RESOURCE(DEFNAME, key); // tries to load a value from "default.resource"
		return res[key] == null ? '' : res[key];
	}

	var routes = F.routes.resources[name];
	var body = '';
	var filename;
	if (routes) {
		for (var i = 0; i < routes.length; i++) {
			filename = routes[i];
			if (existsSync(filename))
				body += (body ? '\n' : '') + Fs.readFileSync(filename).toString(ENCODING);
		}
	}

	// check temp directory
	filename = PATH.temp(name + '.resource');
	if (existsSync(filename))
		body += (body ? '\n' : '') + Fs.readFileSync(filename).toString(ENCODING);

	var filename = U.combine(CONF.directory_resources, name + '.resource');
	var empty = false;
	if (existsSync(filename))
		body += (body ? '\n' : '') + Fs.readFileSync(filename).toString(ENCODING);
	else if(!body)
		empty = true;

	var obj = body.parseConfig();
	F.resources[name] = obj;
	obj.$empty = empty;
	return obj[key] == null ? name == DEFNAME ? '' : obj[key] = RESOURCE(DEFNAME, key) : obj[key];
};

/**
 * Translates text
 * @param {String} language A resource filename, optional.
 * @param {String} text
 * @return {String}
 */
global.TRANSLATE = function(language, text) {

	if (!text) {
		text = language;
		language = undefined;
	}

	if (text[0] === '#' && text[1] !== ' ')
		return RESOURCE(language, text.substring(1));

	var value = RESOURCE(language, 'T' + text.hash(true).toString(36));
	return value ? value : text;
};

/**
 * The translator for the text from the View Engine @(TEXT TO TRANSLATE)
 * @param {String} language A resource filename, optional.
 * @param {String} text
 * @return {String}
 */
global.TRANSLATOR = function(language, text) {
	return framework_internal.parseLocalization(text, language);
};

function configure_env(filename) {

	var data;

	if (filename) {
		filename = prepare_filename(filename);
		if (!existsSync(filename, true))
			return;
		data = Fs.readFileSync(filename).toString(ENCODING);
	}

	var filename2 = null;

	if (!filename) {
		filename = U.combine('/', '.env');
		filename2 = '.env-' + (DEBUG ? 'debug' : 'release');
		if (!existsSync(filename, true)) {
			configure_env(filename2);
			return;
		}
		data = Fs.readFileSync(filename).toString(ENCODING);
	}

	data = data.parseENV();

	for (var key in data) {
		if (!process.env.hasOwnProperty(key))
			process.env[key] = data[key];
	}

	filename2 && configure_env(filename2);
}

function configure_configs(arr, rewrite) {

	var type = typeof(arr);
	if (type === 'string') {
		var filename = prepare_filename(arr);
		if (!existsSync(filename, true))
			return;
		arr = Fs.readFileSync(filename).toString(ENCODING).split('\n');
	}

	if (!arr) {

		var filenameA = U.combine('/', 'config');
		var filenameB = U.combine('/', 'config-' + (DEBUG ? 'debug' : 'release'));
		arr = [];

		if (existsSync(filenameA) && Fs.lstatSync(filenameA).isFile())
			arr = arr.concat(Fs.readFileSync(filenameA).toString(ENCODING).split('\n'));

		if (existsSync(filenameB) && Fs.lstatSync(filenameB).isFile())
			arr = arr.concat(Fs.readFileSync(filenameB).toString(ENCODING).split('\n'));
	}

	var done = function() {
		process.title = 'total: ' + CONF.name.toASCII().toLowerCase().replace(REG_EMPTY, '-').substring(0, 8);
	};

	if (!(arr instanceof Array) || !arr.length) {
		done();
		return;
	}

	if (rewrite === undefined)
		rewrite = true;

	var obj = {};
	var accepts = null;
	var length = arr.length;
	var tmp;
	var subtype;
	var value;
	var generated = [];

	for (var i = 0; i < length; i++) {
		var str = arr[i];

		if (!str || str[0] === '#' || (str[0] === '/' || str[1] === '/'))
			continue;

		var index = str.indexOf(':');
		if (index === -1)
			continue;

		var name = str.substring(0, index).trim();
		if (name === 'debug' || name === 'resources')
			continue;

		value = str.substring(index + 1).trim();
		index = name.indexOf('(');

		if (value.substring(0, 7) === 'base64 ' && value.length > 8)
			value = Buffer.from(value.substring(7).trim(), 'base64').toString(ENCODING);
		else if (value.substring(0, 4) === 'hex ' && value.length > 6)
			value = Buffer.from(value.substring(4).trim(), 'hex').toString(ENCODING);

		if (index !== -1) {
			subtype = name.substring(index + 1, name.indexOf(')')).trim().toLowerCase();
			name = name.substring(0, index).trim();
		} else
			subtype = '';

		switch (name) {
			case 'secret':
			case 'secret_uid':
			case 'secret_encryption':
				obj[name] = value;
				break;
			case 'default_maxopenfiles':
			case 'default_errorbuilder_status':
			case 'default_cors_maxage':
			case 'default_request_timeout':
			case 'default_request_maxlength':
			case 'default_request_maxkeys':
			case 'default_websocket_maxlength':
			case 'default_interval_clear_cache':
			case 'default_interval_clear_resources':
			case 'default_interval_websocket_ping':
			case 'default_interval_clear_dnscache':
			case 'default_dependency_timeout':
			case 'default_restbuilder_timeout':
			case 'default_image_consumption':
			case 'default_image_quality':
				obj[name] = U.parseInt(value.replace(/%|\s/g, ''));
				break;

			case 'static_accepts_custom':
				accepts = value.replace(REG_ACCEPTCLEANER, '').split(',');
				break;

			case 'default_root':
			case 'root':
				if (value)
					obj[name] = U.path(value);
				break;

			case 'static_accepts':
				obj[name] = {};
				tmp = value.replace(REG_ACCEPTCLEANER, '').split(',');
				for (var j = 0; j < tmp.length; j++)
					obj[name][tmp[j]] = true;
				break;

			case 'default_cors':
				value = value.replace(/,/g, ' ').split(' ');
				tmp = [];
				for (var j = 0; j < value.length; j++) {
					var co = (value[j] || '').trim();
					if (co) {
						co = co.toLowerCase();
						tmp.push(co.substring(0, 2) === '//' ? co.substring(co.indexOf('/') + 2) : co);
					}
				}
				obj[name] = tmp.length ? tmp : null;
				break;

			case 'allow_compile':
			case 'allow_compile_html':
			case 'allow_compile_script':
			case 'allow_compile_style':
			case 'allow_ssc_validation':
			case 'allow_gzip':
			case 'allow_head':
			case 'allow_performance':
			case 'allow_static_files':
			case 'allow_websocket':
			case 'allow_websocket_compression':
			case 'allow_clear_temp':
			case 'allow_cache_snapshot':
			case 'allow_cache_cluster':
			case 'allow_filter_errors':
			case 'allow_custom_titles':
			case 'textdb_worker':
			case 'default_websocket_encodedecode':
				obj[name] = value.toLowerCase() === 'true' || value === '1' || value === 'on';
				break;

			case 'version':
				obj[name] = value;
				break;

			case 'security.txt':
				obj[name] = value ? value.split(',').trim().join('\n') : '';
				break;

			case 'default_uid':
				value = value ? value.toLowerCase() : '';
				if (value.length === 4) // `uidr` or `uidf` to `r` or `f`
					value = value[value.length - 1];
				obj[name] = value;
				break;

			case 'default_crypto_iv':
				obj[name] = typeof(value) === 'string' ? Buffer.from(value, 'hex') : value;
				break;

			case 'allow_workers_silent':
				obj[name] = HEADERS.workers.silent = value;
				break;

			default:

				if (subtype === 'string')
					obj[name] = value;
				else if (subtype === 'number' || subtype === 'currency' || subtype === 'float' || subtype === 'double')
					obj[name] = value.isNumber(true) ? value.parseFloat2() : value.parseInt2();
				else if (subtype === 'boolean' || subtype === 'bool')
					obj[name] = (/true|on|1|enabled/i).test(value);
				else if (subtype === 'eval' || subtype === 'object' || subtype === 'array') {
					try {
						obj[name] = new Function('return ' + value)();
					} catch (e) {
						F.error(e, 'F.configure(' + name + ')');
					}
				} else if (subtype === 'json')
					obj[name] = value.parseJSON();
				else if (subtype === 'date' || subtype === 'datetime' || subtype === 'time')
					obj[name] = value.parseDate();
				else if (subtype === 'env' || subtype === 'environment')
					obj[name] = process.env[value];
				else if (subtype === 'random')
					obj[name] = GUID(value || 10);
				else if (subtype === 'generate') {
					obj[name] = framework_utils.random_string(value || 10);
					generated.push(name);
				} else if (subtype === 'hash') {
					obj[name] = GUID(value || 10);
					generated.push(name);
				} else {
					if (value.isNumber()) {
						obj[name] = value[0] !== '0' ? U.parseInt(value) : value;
					} else if (value.isNumber(true))
						obj[name] = value.indexOf(',') === -1 && !(/^0{2,}/).test(value) ? U.parseFloat(value) : value;
					else {
						let bool = value.toLowerCase();
						var isboolean = bool === 'true' || bool === 'false';
						obj[name] = isboolean ? bool == 'true' : value;
					}
				}
				break;
		}
	}

	// Cache for generated passwords
	if (generated && generated.length) {
		var filenameC = U.combine('/databases/', 'config{0}.json'.format(global.THREAD ? ('_' + global.THREAD) : ''));
		var gdata;

		if (existsSync(filenameC)) {
			gdata = Fs.readFileSync(filenameC).toString(ENCODING).parseJSON(true);
			if (generated) {
				for (var i = 0; i < generated.length; i++) {
					if (gdata[generated[i]] != null)
						obj[generated[i]] = gdata[generated[i]];
				}
			}
		}

		tmp = {};
		for (var i = 0; i < generated.length; i++)
			tmp[generated[i]] = obj[generated[i]];

		PATH.verify('databases');
		Fs.writeFileSync(filenameC, JSON.stringify(tmp), NOOP);
	}

	F.logger(obj.logger == true);

	U.extend(CONF, obj, rewrite);

	if (CONF.root)
		CONF.default_root = CONF.root;

	if (!CONF.secret_uid)
		CONF.secret_uid = (CONF.name).crc32(true) + '';

	CMD('refresh_tms');

	tmp = CONF.mail_smtp_options;
	if (typeof(tmp) === 'string' && tmp) {
		tmp = new Function('return ' + tmp)();
		CONF.mail_smtp_options = tmp;
	}

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = CONF.allow_ssc_validation === false ? '0' : '1';

	if (!CONF.directory_temp)
		CONF.directory_temp = '~' + U.path(Path.join(Os.tmpdir(), 'totaljs' + F.directory.hash(true).toString(36)));

	if (!CONF.etag_version)
		CONF.etag_version = CONF.version.replace(/\.|\s/g, '');

	if (CONF.default_timezone)
		process.env.TZ = CONF.default_timezone;

	accepts && accepts.length && accepts.forEach(accept => CONF.static_accepts[accept] = true);

	if (CONF.allow_performance)
		Http.globalAgent.maxSockets = 9999;

	if (CONF.default_root) {
		if (CONF.default_root[0] !== '/')
			CONF.default_root = '/' + CONF.default_root;
		CONF.default_root = U.path(CONF.default_root);
	}

	var xpowered = CONF.default_xpoweredby;

	Object.keys(HEADERS).forEach(function(key) {
		Object.keys(HEADERS[key]).forEach(function(subkey) {
			if (!DEBUG && subkey === 'Cache-Control' && HEADERS[key][subkey].indexOf('no-cache') == -1)
				HEADERS[key][subkey] = HEADERS[key][subkey].replace(/max-age=\d+/, 'max-age=' + CONF.default_response_maxage);
			if (subkey === 'X-Powered-By') {
				if (xpowered)
					HEADERS[key][subkey] = xpowered;
				else
					delete HEADERS[key][subkey];
			}
		});
	});

	done();
	F.$events.configure && EMIT('configure', CONF);
}

F.public_js = function(name, theme) {
	return F.$public(name, CONF.static_url_script, theme);
};

F.public_css = function(name, theme) {
	return F.$public(name, CONF.static_url_style, theme);
};

F.public_image = function(name, theme) {
	return F.$public(name, CONF.static_url_image, theme);
};

F.public_video = function(name, theme) {
	return F.$public(name, CONF.static_url_video, theme);
};

F.public_font = function(name, theme) {
	return F.$public(name, CONF.static_url_font, theme);
};

F.public_download = function(name, theme) {
	return F.$public(name, CONF.static_url_download, theme);
};

F.public = function(name, theme) {
	return F.$public(name, CONF.static_url, theme);
};

F.$public = function(name, directory, theme) {

	var key = name + directory + '$' + theme;
	var val = F.temporary.other[key];
	if (!DEBUG && val)
		return val;

	if (name[0] === '~') {
		name = name.substring(name[1] === '~' ? 2 : 1);
		theme = '';
	} else if (name[0] === '=') {
		// theme
		var index = name.indexOf('/');
		if (index !== -1) {
			theme = name.substring(1, index);
			if (theme === '?') {
				theme = CONF.default_theme;
				name = name.substring(index);
			} else
				name = name.substring(index + 1);
		}
	}

	var filename;

	if (REG_ROUTESTATIC.test(name))
		filename = name;
	else if (name[0] === '/')
		filename = U.join(theme, F.$version(name, true));
	else {
		filename = U.join(theme, directory, F.$version(name, true));
		if (REG_HTTPHTTPS.test(filename) && filename[0] === '/')
			filename = filename.substring(1);
	}

	var name = F.$version(framework_internal.preparepath(filename), true);

	if (CONF.default_root && name[0] === '/' && name.substring(0, CONF.default_root.length) !== CONF.default_root)
		name = U.join(CONF.default_root, name);

	return F.temporary.other[key] = name;
};

F.$version = function(name, def) {
	var tmp;
	if (F.versions)
		tmp = F.versions[name] || name;
	if (DEF.onVersion)
		tmp = DEF.onVersion(name) || name;
	return tmp === 'auto' && def ? name : (tmp || name);
};

F.$versionprepare = function(html) {
	var match = html.match(REG_VERSIONS);
	if (match) {
		for (var i = 0, length = match.length; i < length; i++) {

			var src = match[i] + '';
			var end = 5;

			// href
			if (src[0] === 'h')
				end = 6;

			var name = src.substring(end, src.length - 1);
			html = html.replace(match[i], src.substring(0, end) + F.$version(name, true) + '"');
		}
	}
	return html;
};

F.lookup_system = function(code) {
	return F.routes.system[code + ''];
};

F.lookup_websocket = function(req, membertype, skipflags) {

	// membertype 0: does not matter
	// membertype 1: logged
	// membertype 2: unlogged

	var tmp = F.routes.websocketscached;
	var arr = req.split.length ? req.split : EMPTYREQSPLIT;
	var length = arr.length;
	var route;
	var item;

	var url = req.uri.pathname[req.uri.pathname.length - 1] === '/' ? req.uri.pathname.substring(1, req.uri.pathname.length - 1) : req.uri.pathname.substring(1);

	// Checks fixed URL
	var routes = tmp[url];
	if (routes) {
		if (skipflags)
			return routes[0];
		route = compareflags(req, routes, membertype);
		if (route)
			return route;
		routes = null;
	}

	// Dynamic routes
	if (tmp.D) {
		for (var i = 0; i < tmp.D.length; i++) {
			var r = tmp.D[i];
			if (r.url.length === length || r.isWILDCARD) {
				if (r.compare(req)) {
					if (!routes)
						routes = [];
					routes.push(r);
				}
			}
		}
		if (routes) {
			if (skipflags)
				return routes[0];
			route = compareflags(req, routes, membertype);
			if (route)
				return route;
		}
		routes = null;
	}

	// Wildcard
	routes = [];
	for (var i = 0; i < length; i++) {
		var url = req.split.slice(0, length - i).join('/') + '/*';
		item = tmp[url];
		if (item) {
			if (skipflags)
				return item[0];
			routes.push.apply(routes, item);
		}
	}

	item = tmp['/*'];
	if (item) {
		if (skipflags)
			return item[0];
		routes.push.apply(routes, item);
	}

	return routes && routes.length ? compareflags(req, routes, membertype) : null;
};

/**
 * Accept file type
 * @param {String} extension
 * @param {String} contentType Content-Type for file extension, optional.
 * @return {Framework}
 */
global.ACCEPT = F.accept = function(ext, type) {
	if (ext[0] === '.')
		ext = ext.substring(1);
	CONF.static_accepts[ext] = true;
	type && U.setContentType(ext, type);
};

global.TotalAPI = function(token, type, data, callback, filename) {

	if (typeof(type) === 'object' || typeof(data) === 'function' || (typeof(data) === 'object' && data.req)) {
		filename = callback;
		callback = data;
		data = type;
		type = token;
		token = (CONF.totalapi || CONF.secret_totalapi) || '-';
	}

	if (!CONF.allow_totalapi && type !== 'check') {
		callback(new ErrorBuilder().push('totalapi_inactive'));
		return;
	}

	if (typeof(data) !== 'object')
		data = { value: data };

	var opt = {};
	opt.method = 'POST';
	opt.url = 'https://' + CONF.default_tapi + '.api.totaljs.com/' + type + '/';
	opt.body = JSON.stringify(data);
	opt.type = 'json';
	opt.keepalive = true;
	opt.timeout = 60000;
	opt.headers = { 'x-token': token, 'x-app': encodeURIComponent(CONF.name) };

	if (!callback) {
		return new Promise(function(resolve, reject) {
			opt.callback = function(err, response) {

				if (!err && response.status >= 400) {
					var tmp = response.body.parseJSON();
					err = new Error((tmp && tmp instanceof Array && tmp.length ? tmp[0].error : '') || 'Unexpected problem');
				}

				if (err) {
					if (callback && callback.invalid) {
						callback.invalid(err);
					} else {
						err.name = 'TotalAPI(' + type + ')';
						reject(err);
					}
				} else {
					var type = response.headers['content-type'] || '';
					resolve(type.indexOf('json') !== -1 ? response.body.parseJSON(true) : response.body);
				}
			};
			REQUEST(opt);
		});
	}

	opt.custom = true;
	opt.callback = function(err, response) {

		if (err) {
			callback(err);
			return;
		}

		var type = response.headers['content-type'] || '';

		// Determines raw file
		if (!(/json|text|html/).test(type)) {
			if (typeof(callback) === 'function') {
				if (response.status === 200)
					callback(null, response.stream, response);
				else
					callback(U.httpstatus(response.status), null, response);
			} else
				callback.res.stream(type, response.stream, filename);
			return;
		}

		if (typeof(callback) !== 'function') {
			callback.res.stream(type, response.stream, filename);
			if (!callback.isController && callback.cancel)
				callback.cancel();
			return;
		}

		var buffer = [];
		var status = response.status;

		response.stream.on('data', chunk => buffer.push(chunk));

		CLEANUP(response.stream, function() {

			var body = Buffer.concat(buffer).toString('utf8');
			var response = body.parseJSON(true);

			if (response instanceof Array) {
				callback(ErrorBuilder.assign(response));
			} else {
				if (!err && status > 399)
					err = new ErrorBuilder().push(status + '');
				callback(err, response);
			}

		});

	};

	REQUEST(opt);
};

// A temporary variable for generating Worker ID
// It's faster than Date.now()
var WORKERID = 0;

function killworker(fork) {
	fork && fork.kill('SIGKILL');
}

global.WORKER = function(name, timeout, args, special) {

	if (timeout instanceof Array) {
		special = args;
		args = timeout;
		timeout = undefined;
	}

	var isid = name[0] === '#';
	if (isid) {
		name = name.substring(1);
		return F.workers[name];
	}

	if (WORKERID > 999999999)
		WORKERID = 0;

	var id = name + '_' + (WORKERID++);
	var filename = name[0] === '@' ? PATH.package(name.substring(1)) : U.combine(CONF.directory_workers, name);

	if (!args)
		args = [];

	args.push('--worker');

	var fork = Child.fork(filename[filename.length - 3] === '.' ? filename : filename + SCRIPTEXT, args, special ? HEADERS.workers2 : HEADERS.workers);
	fork.ID = id;
	F.workers[id] = fork;

	fork.on('exit', function() {
		var self = this;
		self.__timeout && clearTimeout(self.__timeout);
		delete F.workers[self.ID];
		if (fork) {
			fork.removeAllListeners();
			fork = null;
		}
	});

	if (timeout > 10)
		fork.__timeout = setTimeout(killworker, timeout, fork);

	return fork;
};

function process_thread() {

	if (F.worker)
		return F.worker;

	F.dir(process.cwd());

	const Port = Worker.parentPort;

	F.worker = {};
	F.worker.data = Port ? Worker.workerData : {};
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

global.NEWTHREAD = function(name, data) {

	if (!name)
		return process_thread();

	var filename = name[0] === '@' ? (PATH.package(name.substring(1)) + '.js') : name[0] === '~' ? name.substring(1) : (U.combine(CONF.directory_workers, name) + '.js');
	var worker = new Worker.Worker(filename, { workerData: data, cwd: HEADERS.worker_threads.cwd, argv: ['--worker'] });
	worker.kill = worker.exit = () => worker.terminate();

	return worker;
};

global.NEWTHREADPOOL = function(name, count, isfork) {

	var pool = {};
	pool.workers = [];
	pool.pending = [];
	pool.count = pool;
	pool.next = function() {
		for (var worker of pool.workers) {
			if (worker.$released) {
				var fn = pool.pending.shift();
				if (fn) {
					worker.removeAllListeners('message');
					worker.$released = false;
					fn.call(worker, worker, worker.release);
				} else
					break;
			}
		}
	};

	F.workerspool[name] = pool;

	var release = function(worker) {
		worker.on('exit', function() {
			var index = pool.workers.indexOf(worker);
			pool.workers.splice(index, 1);
			var worker = isfork ? NEWFORK(name) : NEWTHREAD(name);
			worker.$pool = pool;
			worker.release = release(worker);
		});

		return function() {
			worker.$released = true;
			worker.$pool.next();
		};

	};

	for (var i = 0; i < count; i++) {
		var worker = isfork ? NEWFORK(name) : NEWTHREAD(name);
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

global.NEWFORK = function(name) {

	if (!name)
		return process_thread();

	var filename = name[0] === '@' ? (PATH.package(name.substring(1)) + '.js') : name[0] === '~' ? name.substring(1) : (U.combine(CONF.directory_workers, name) + '.js');
	var fork = new Child.fork(filename, { cwd: HEADERS.worker_threads.cwd, argv: ['--worker'] });
	fork.postMessage = fork.send;
	fork.terminate = () => fork.kill('SIGTERM');

	return fork;
};

global.WORKER2 = function(name, args, callback, timeout) {

	if (typeof(args) === 'function') {
		timeout = callback;
		callback = args;
		args = undefined;
	} else if (typeof(callback) === 'number') {
		var tmp = timeout;
		timeout = callback;
		callback = tmp;
	}

	if (args && !(args instanceof Array))
		args = [args];

	var fork = WORKER(name, timeout, args, true);
	if (fork.__worker2)
		return fork;

	var output = Buffer.alloc(0);

	fork.__worker2 = true;
	fork.on('error', function(e) {
		callback && callback(e, output);
		callback = null;
	});

	fork.stdout.on('data', function(data) {
		CONCAT[0] = output;
		CONCAT[1] = data;
		output = Buffer.concat(CONCAT);
	});

	fork.on('exit', function() {
		callback && callback(null, output);
		callback = null;
	});

	return fork;
};

/**
 * This method suspends
 * @param {String} name Operation name.
 * @param {Boolean} enable Enable waiting (optional, default: by the current state).
 * @return {Boolean}
 */
global.PAUSESERVER = F.wait = function(name, enable) {

	if (!F.waits)
		F.waits = {};

	if (enable !== undefined) {
		if (enable)
			F.waits[name] = true;
		else
			delete F.waits[name];
		F._length_wait = Object.keys(F.waits).length;
		return enable;
	}

	if (F.waits[name])
		delete F.waits[name];
	else {
		F.waits[name] = true;
		enable = true;
	}

	F._length_wait = Object.keys(F.waits).length;
	return enable === true;
};

global.UPDATE = function(versions, callback, pauseserver, noarchive) {

	if (typeof(version) === 'function') {
		callback = versions;
		versions = CONF.version;
	}

	if (typeof(callback) === 'string') {
		pauseserver = callback;
		callback = null;
	}

	if (!(versions instanceof Array))
		versions = [versions];

	pauseserver && PAUSESERVER(pauseserver);

	if (F.id && F.id !== '0') {
		if (callback || pauseserver) {
			ONCE('update', function() {
				callback && callback();
				pauseserver && PAUSESERVER(pauseserver);
			});
		}
		return;
	}

	var errorbuilder = new ErrorBuilder();

	versions.wait(function(version, next) {

		var filename = PATH.updates(version + SCRIPTEXT);
		var response;

		try {
			response = Fs.readFileSync(filename);
		} catch (e) {
			next();
			return;
		}

		var opt = {};
		opt.version = version;
		opt.callback = function(err) {
			err && errorbuilder.push(err);

			if (!noarchive)
				Fs.renameSync(filename, filename + '_bk');

			next();
		};

		opt.done = function(arg) {
			return function(err) {
				if (err) {
					opt.callback(err);
				} else if (arg)
					opt.callback();
				else
					opt.callback();
			};
		};

		opt.success = function() {
			opt.callback(null);
		};

		opt.invalid = function(err) {
			opt.callback(err);
		};

		// The "require()" method isn't defined if it is not defined manually.
		var fn = new Function('$', 'require', response);
		fn(opt, require, response.toString(ENCODING));

	}, function() {
		var err = errorbuilder.length ? errorbuilder : null;
		callback && callback(err);
		if (F.isCluster && F.id && F.id !== '0')
			process.send('total:update');
		pauseserver && PAUSESERVER(pauseserver);
		EMIT('update', err);
	});
};

// =================================================================================
// Framework route
// =================================================================================

function FrameworkRoute() {
	this.route = {};
}

FrameworkRoute.prototype = {
	get id() {
		return this.route.id;
	},
	set id(value) {
		this.route.id = value;
	},
	get description() {
		return this.route.description;
	},
	set description(value) {
		this.route.description = value;
	},
	get maxlength() {
		return this.route.length;
	},
	set maxlength(value) {
		this.route.length = value;
	},
	get options() {
		return this.route.options;
	},
	set options(value) {
		this.route.options = value;
	},
	get url() {
		return this.route.urlraw;
	},
	get flags() {
		return this.route.flags || EMPTYARRAY;
	}
};

const FrameworkRouteProto = FrameworkRoute.prototype;

FrameworkRouteProto.make = function(fn) {
	fn && fn.call(this, this);
	return this;
};

FrameworkRouteProto.setId = function(value) {
	this.route.id = value;
	return this;
};

FrameworkRouteProto.setTimeout = function(value) {
	this.route.timeout = value;
	return this;
};

FrameworkRouteProto.setLength = function(value) {
	this.route.length = value;
	return this;
};

FrameworkRouteProto.setOptions = function(value) {
	this.route.options = value;
	return this;
};

FrameworkRouteProto.remove = function(nosort) {

	var self = this;
	var index;
	var tmp;

	if (self.type === 'file') {

		index = F.routes.files.indexOf(self.route);
		if (index !== -1) {
			tmp = F.routes.files[index];
			delete F.routes.all[tmp.path];
			F.routes.files.splice(index, 1);

			if (!nosort)
				F.routes_sort();

		}

	} else if (self.type === 'websocket') {

		index = F.routes.websockets.indexOf(self.route);

		if (index !== -1) {
			tmp = F.routes.websockets[index];
			delete F.routes.all[tmp.path];
			F.routes.websockets.splice(index, 1);

			// Destroys all connections
			if (tmp.connections) {
				for (var i = 0; i < tmp.connections.length; i++)
					tmp.connections[i].close();
			}

			tmp = null;

			if (!nosort)
				F.routes_sort();

		}

	} else if (self.isSYSTEM) {

		for (var key in F.routes.system) {
			tmp = F.routes.system[key];
			if (tmp === self) {
				delete F.routes.all[tmp.path];
				delete F.routes.system[key];
				break;
			}
		}

	} else {

		index = F.routes.web.indexOf(self);

		if (index === -1 && self.route)
			index = F.routes.web.indexOf(self.route);

		if (index !== -1) {

			tmp = F.routes.web[index];
			if (tmp.apiname) {
				var api = F.routes.api[tmp.apiname];
				var remcount = 0;
				var keys = Object.keys(api);
				for (var key in api) {
					if (api[key].path === tmp.path) {
						remcount++;
						delete api[key];
						delete F.routes.all[tmp.path];
					}
				}

				if (keys.length === remcount) {
					delete F.routes.all[tmp.path];
					F.routes.web.splice(index, 1);
				}

			} else {

				delete F.routes.all[tmp.path];
				F.routes.web.splice(index, 1);
			}

			if (!nosort)
				F.routes_sort();

		} else if (self.isAPI) {

			for (var key in F.routes.api) {
				tmp = F.routes.api[key];
				for (var key2 in tmp) {
					if (tmp[key2].path === self.route.path)
						delete tmp[key2];
				}
			}

			for (var key in F.routes.all) {
				tmp = F.routes.all[key];
				if (tmp === self)
					delete F.routes.all[key];
			}

			if (!nosort)
				F.routes_sort();

		}
	}
};

// =================================================================================
// Framework path
// =================================================================================

function FrameworkPath() {}
const FrameworkPathProto = FrameworkPath.prototype;

FrameworkPathProto.ls = U.ls;
FrameworkPathProto.ls2 = U.ls2;

FrameworkPathProto.join = function() {
	return Path.join.apply(Path, arguments);
};

FrameworkPathProto.verify = function(name) {
	var prop = '$directory_' + name;
	if (F.temporary.path[prop])
		return;
	var directory = CONF['directory_' + name] || name;
	var dir = U.combine(directory);
	try {
		!existsSync(dir) && Fs.mkdirSync(dir);
	} catch (e) {}
	F.temporary.path[prop] = true;
};

FrameworkPathProto.mkdir = function(p, cache) {

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

	if (!existsSync(p)) {
		var arr = is ? p.replace(/\//g, '\\').split('\\') : p.split('/');
		var directory = s;

		for (var i = 0, length = arr.length; i < length; i++) {
			var name = arr[i];
			if (is)
				directory += (i && directory ? '\\' : '') + name;
			else
				directory += (i && directory ? '/' : '') + name;

			if (i >= beg && !existsSync(directory))
				Fs.mkdirSync(directory);
		}
	}
};

FrameworkPathProto.exists = function(path, callback) {
	Fs.lstat(path, (err, stats) => callback(err ? false : true, stats ? stats.size : 0, stats ? stats.isFile() : false));
};

FrameworkPathProto.public = function(filename) {
	return U.combine(CONF.directory_public, filename);
};

FrameworkPathProto.public_cache = function(filename) {
	var key = 'public_' + filename;
	var item = F.temporary.other[key];
	return item ? item : F.temporary.other[key] = global.THREAD ? PATH.join(F.directory, 'threads', global.THREAD, 'public', filename) : U.combine(CONF.directory_public, filename);
};

FrameworkPathProto.private = function(filename) {
	return U.combine(CONF.directory_private, filename);
};

FrameworkPathProto.middleware = function(filename) {
	return U.combine(CONF.directory_middleware, filename);
};

FrameworkPathProto.configs = function(filename) {
	return U.combine(CONF.directory_configs, filename);
};

FrameworkPathProto.logs = function(filename) {
	this.verify('logs');
	return U.combine(CONF.directory_logs, filename);
};

FrameworkPathProto.models = function(filename) {
	return U.combine(CONF.directory_models, filename);
};

FrameworkPathProto.builds = function(filename) {
	return U.combine(CONF.directory_builds, filename);
};

FrameworkPathProto.temp = FrameworkPathProto.tmp = function(filename) {
	this.verify('temp');
	return U.combine(CONF.directory_temp, filename);
};

FrameworkPathProto.temporary = function(filename) {
	return this.temp(filename);
};

FrameworkPathProto.views = function(filename) {
	return U.combine(CONF.directory_views, filename);
};

FrameworkPathProto.updates = function(filename) {
	return U.combine(CONF.directory_updates, filename);
};

FrameworkPathProto.workers = function(filename) {
	return U.combine(CONF.directory_workers, filename);
};

FrameworkPathProto.filestorage = function(name) {
	return PATH.databases('fs-' + name + '/');
};

FrameworkPathProto.databases = function(filename) {
	this.verify('databases');
	return U.combine(CONF.directory_databases, filename);
};

FrameworkPathProto.modules = function(filename) {
	return U.combine(CONF.directory_modules, filename);
};

FrameworkPathProto.schemas = function(filename) {
	return U.combine(CONF.directory_schemas, filename);
};

FrameworkPathProto.jsonschemas = function(filename) {
	return U.combine(CONF.directory_jsonschemas, filename);
};

FrameworkPathProto.extensions = function(filename) {
	return U.combine(CONF.directory_extensions, filename);
};

FrameworkPathProto.operations = function(filename) {
	return U.combine(CONF.directory_operations, filename);
};

FrameworkPathProto.tasks = function(filename) {
	return U.combine(CONF.directory_tasks, filename);
};

FrameworkPathProto.controllers = function(filename) {
	return U.combine(CONF.directory_controllers, filename);
};

FrameworkPathProto.definitions = function(filename) {
	return U.combine(CONF.directory_definitions, filename);
};

FrameworkPathProto.tests = function(filename) {
	return U.combine(CONF.directory_tests, filename);
};

FrameworkPathProto.resources = function(filename) {
	return U.combine(CONF.directory_resources, filename);
};

FrameworkPathProto.services = function(filename) {
	return U.combine(CONF.directory_services, filename);
};

FrameworkPathProto.packages = function(filename) {
	return U.combine(CONF.directory_packages, filename);
};

FrameworkPathProto.themes = function(filename) {
	return U.combine(CONF.directory_themes, filename);
};

FrameworkPathProto.components = function(filename) {
	return U.combine(CONF.directory_components, filename);
};

FrameworkPathProto.templates = function(filename) {
	return U.combine(CONF.directory_templates, filename);
};

FrameworkPathProto.plugins = function(filename) {
	return U.combine(CONF.directory_plugins, filename);
};

FrameworkPathProto.flowstreams = function(filename) {
	return U.combine(CONF.directory_flowstreams, filename);
};

FrameworkPathProto.root = function(filename) {
	var p = Path.join(directory, filename || '');
	return F.isWindows ? p.replace(/\\/g, '/') : p;
};

FrameworkPathProto.package = function(name, filename) {

	if (filename === undefined) {
		var index = name.indexOf('/');
		if (index !== -1) {
			filename = name.substring(index + 1);
			name = name.substring(0, index);
		}
	}

	var tmp = CONF.directory_temp;
	var p = tmp[0] === '~' ? Path.join(tmp.substring(1), name + '.package', filename || '') : Path.join(directory, tmp, name + '.package', filename || '');
	return F.isWindows ? p.replace(REG_WINDOWSPATH, '/') : p;
};

// =================================================================================
// Cache declaration
// =================================================================================

function FrameworkCache() {
	this.items = {};
	this.count = 1;
	this.interval;
	this.$sync = true;
}

const FrameworkCacheProto = FrameworkCache.prototype;

FrameworkCacheProto.init = function(notimer) {
	var self = this;

	if (!notimer)
		self.init_timer();

	if (CONF.allow_cache_snapshot)
		self.load(() => self.loadpersistent());
	else
		self.loadpersistent();

	return self;
};

FrameworkCacheProto.init_timer = function() {
	var self = this;
	self.interval && clearInterval(self.interval);
	self.interval = setInterval(() => F.cache.recycle(), 1000 * 60);
	return self;
};

FrameworkCacheProto.save = function() {
	Fs.writeFile(PATH.databases(F.clusterid + 'cache.json'), JSON.stringify(this.items), NOOP);
	return this;
};

FrameworkCacheProto.load = function(callback) {
	var self = this;
	Fs.readFile(PATH.databases(F.clusterid + 'cache.json'), function(err, data) {
		if (!err) {
			try {
				data = JSON.parse(data.toString(ENCODING), (key, value) => typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value);
				self.items = data;
			} catch (e) {}
		}
		callback && callback();
	});
	return self;
};

FrameworkCacheProto.savepersistent = function() {
	setTimeout2('framework_cachepersist', function(self) {
		var obj = {};
		for (var key in self.keys) {
			var item = self.items[key];
			if (item && item.persist)
				obj[key] = item;
		}
		Fs.writeFile(PATH.temp(F.clusterid + 'framework.cache'), JSON.stringify(obj), NOOP);
	}, 1000, 50, this);
	return this;
};

FrameworkCacheProto.loadpersistent = function(callback) {
	var self = this;
	Fs.readFile(PATH.temp(F.clusterid + 'framework.cache'), function(err, data) {
		if (!err) {
			try {
				data = JSON.parse(data.toString(ENCODING), (key, value) => typeof(value) === 'string' && value.isJSONDate() ? new Date(value) : value);
				for (var key in data) {
					var item = data[key];
					if (item.expire >= NOW)
						self.items[key] = item;
				}
			} catch (e) {}
		}
		callback && callback();
	});
	return self;
};

FrameworkCacheProto.stop = function() {
	clearInterval(this.interval);
	return this;
};

FrameworkCacheProto.clear = function() {
	this.items = {};
	F.isCluster && CONF.allow_cache_cluster && process.send(CLUSTER_CACHE_CLEAR);
	this.savepersistent();
	return this;
};

FrameworkCacheProto.recycle = function() {

	var items = this.items;
	var persistent = false;

	NOW = new Date();
	this.count++;

	for (var o in items) {
		var value = items[o];
		if (!value)
			delete items[o];
		else if (value.expire < NOW) {
			if (value.persist)
				persistent = true;
			F.$events.cache_expired && EMIT('cache_expired', o, value.value);
			delete items[o];
		}
	}

	persistent && this.savepersistent();
	CONF.allow_cache_snapshot && this.save();
	F.service(this.count);

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

	CONF.allow_stats_snapshot && F.snapshotstats && F.snapshotstats();
	F.temporary.service.usage = 0;
	measure_usage();
	return this;
};

FrameworkCacheProto.set2 = function(name, value, expire) {
	return this.set(name, value, expire, true);
};

FrameworkCacheProto.set = FrameworkCacheProto.add = function(name, value, expire, persist) {

	if (F.isCluster && CONF.allow_cache_cluster && this.$sync) {
		CLUSTER_CACHE_SET.name = name;
		CLUSTER_CACHE_SET.value = value;
		CLUSTER_CACHE_SET.expire = expire;
		process.send(CLUSTER_CACHE_SET);
	}

	switch (typeof(expire)) {
		case 'string':
			expire = expire.parseDateExpiration();
			break;
		case 'undefined':
			expire = NOW.add('m', 5);
			break;
	}

	var obj = { value: value, expire: expire };

	if (persist) {
		obj.persist = true;
		this.savepersistent();
	}

	this.items[name] = obj;
	F.$events.cache_set && EMIT('cache_set', name, value, expire, this.$sync);
	return value;
};

FrameworkCacheProto.read = FrameworkCacheProto.get = function(key, def) {

	var value = this.items[key];
	if (!value)
		return def;

	NOW = new Date();

	if (value.expire < NOW) {
		this.items[key] = undefined;
		F.$events.cache_expired && EMIT('cache_expired', key, value.value);
		return def;
	}

	return value.value;
};

FrameworkCacheProto.read2 = FrameworkCacheProto.get2 = function(key, def) {
	var value = this.items[key];

	if (!value)
		return def;

	if (value.expire < NOW) {
		this.items[key] = undefined;
		F.$events.cache_expired && EMIT('cache_expired', key, value.value);
		return def;
	}

	return value.value;
};

FrameworkCacheProto.setExpire = function(name, expire) {
	var obj = this.items[name];
	if (obj)
		obj.expire = typeof(expire) === 'string' ? expire.parseDateExpiration() : expire;
	return this;
};

FrameworkCacheProto.remove = function(name) {
	var value = this.items[name];

	if (value) {
		this.items[name].persist && this.savepersistent();
		this.items[name] = undefined;
	}

	if (F.isCluster && CONF.allow_cache_cluster && this.$sync) {
		CLUSTER_CACHE_REMOVE.name = name;
		process.send(CLUSTER_CACHE_REMOVE);
	}

	return value;
};

FrameworkCacheProto.reset = FrameworkCacheProto.removeAll = function(search) {

	var count = 0;
	var isarr = search instanceof Array;
	var isreg = isarr ? false : typeof(search) === 'object';
	var is = false;

	for (var key in this.items) {

		if (isreg) {
			if (!search.test(key))
				continue;
		} else {
			if (isarr) {
				for (var m of search) {
					if (key.indexOf(m) !== -1) {
						is = true;
						continue;
					}
				}
				if (!is)
					continue;
			} else if (key.indexOf(search) === -1)
				continue;
		}

		this.remove(key);
		count++;
	}

	if (F.isCluster && CONF.allow_cache_cluster && this.$sync) {
		CLUSTER_CACHE_REMOVEALL.search = search;
		process.send(CLUSTER_CACHE_REMOVEALL);
	}

	return count;
};

FrameworkCacheProto.fn = function(name, fnCache, fnCallback, options) {

	var self = this;
	var value = self.read2(name);

	if (value) {
		fnCallback && fnCallback(value, true, options);
		return self;
	}

	fnCache(function(value, expire) {
		self.add(name, value, expire);
		fnCallback && fnCallback(value, false, options);
	}, options);

	return self;
};

// *********************************************************************************
// =================================================================================
// WebSocket
// =================================================================================
// *********************************************************************************

const NEWLINE = '\r\n';
const SOCKET_RESPONSE = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\n\r\n';
const SOCKET_RESPONSE_COMPRESS = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Extensions: permessage-deflate\r\n\r\n';
const SOCKET_RESPONSE_PROTOCOL = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Protocol: {1}\r\n\r\n';
const SOCKET_RESPONSE_PROTOCOL_COMPRESS = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\nSec-WebSocket-Protocol: {1}\r\nSec-WebSocket-Extensions: permessage-deflate\r\n\r\n';
const SOCKET_HASH = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const SOCKET_ALLOW_VERSION = [13];

function WebSocket(path, name, id) {
	this.keys = [];
	this.id = id;
	this.online = 0;
	this.connections = {};
	this.name = name;
	this.isController = true;
	this.url = U.path(path);
	this.route = null;
	this.$events = {};

	// on('open', function(client) {});
	// on('close', function(client) {});
	// on('message', function(client, message) {});
	// on('error', function(error, client) {});
	// Events.EventEmitter.call(this);
}

WebSocket.prototype = {

	get repository() {
		if (this.$repository)
			return this.$repository;
		else
			return this.$repository ? this.$repository : (this.$repository = {});
	},

	get secured() {
		return this.req.secured;
	},

	get params() {
		if (this.$params)
			return this.$params;
		var split = framework_internal.routesplit(this.url, true);
		var names = this.route ? this.route.paramnames : null;
		if (names) {
			var obj = {};
			for (var i = 0; i < names.length; i++)
				obj[names[i]] = split[this.route.param[i]];
			this.$params = obj;
			return obj;
		} else {
			this.$params = EMPTYOBJECT;
			return EMPTYOBJECT;
		}
	}
};

const WebSocketProto = WebSocket.prototype;

WebSocketProto.encrypt = function(value) {
	this.$encrypt = value === true || value == null;
	return this;
};

WebSocketProto.emit = function(name, a, b, c, d, e, f, g) {
	var evt = this.$events[name];
	if (evt) {
		var clean = false;
		for (var i = 0, length = evt.length; i < length; i++) {
			if (evt[i].$once)
				clean = true;
			evt[i].call(this, a, b, c, d, e, f, g);
		}
		if (clean) {
			evt = evt.remove(n => n.$once);
			if (evt.length)
				this.$events[name] = evt;
			else
				this.$events[name] = undefined;
		}
	}
	return this;
};

WebSocketProto.on = function(name, fn) {
	if (this.$events[name])
		this.$events[name].push(fn);
	else
		this.$events[name] = [fn];
	return this;
};

WebSocketProto.clients = function() {
	var self = this;
	var arr = [];
	for (var i = 0; i < self.keys.length; i++)
		arr.push(self.connections[self.keys[i]]);
	return arr;
};

WebSocketProto.once = function(name, fn) {
	fn.$once = true;
	return this.on(name, fn);
};

WebSocketProto.removeListener = function(name, fn) {
	var evt = this.$events[name];
	if (evt) {
		evt = evt.remove(n => n === fn);
		if (evt.length)
			this.$events[name] = evt;
		else
			this.$events[name] = undefined;
	}
	return this;
};

WebSocketProto.removeAllListeners = function(name) {
	if (name === true)
		this.$events = EMPTYOBJECT;
	else if (name)
		this.$events[name] = undefined;
	else
		this.$events = {};
	return this;
};

WebSocketProto.find = function(fn) {
	for (var i = 0; i < this.keys.length; i++) {
		var client = this.connections[this.keys[i]];
		if (fn(client))
			return client;
	}
};

WebSocketProto.send = function(message, comparer, replacer, params) {

	var self = this;
	var keys = self.keys;

	if (!keys || !keys.length || message === undefined)
		return self;

	if (!params && replacer != null && typeof(replacer) !== 'function') {
		params = replacer;
		replacer = null;
	}

	var data;
	var raw = false;

	for (var i = 0; i < keys.length; i++) {

		var conn = self.connections[keys[i]];

		if (data === undefined) {
			if (conn.type === 3) {
				raw = true;
				data = JSON.stringify(message, replacer == true ? framework_utils.json2replacer : replacer);
			} else
				data = message;
		}

		if (comparer && !comparer(conn, message, params))
			continue;

		conn.send(data, raw);
		F.stats.response.websocket++;
	}

	return self;
};

/**
 * Sends a ping message
 * @return {WebSocket}
 */
WebSocketProto.ping = function() {

	var self = this;
	var keys = self.keys;
	if (!keys)
		return self;

	var length = keys.length;
	if (length) {
		self.$ping = true;
		F.stats.other.websocketping++;
		var ts = Date.now();
		for (var i = 0; i < length; i++)
			self.connections[keys[i]].ping(ts);
	}

	return self;
};

WebSocketProto.api = function(api) {
	var self = this;

	if (!api.startsWith('/@')) {
		if (api[0] !== '@')
			api = '@' + api;
		api = '/' + api + '/';
	}

	self.on('message', function(client, msg) {
		if (msg && msg.TYPE === 'api')
			client.$exec(api, msg);
	});
	return self;
};

/**
 * Closes a connection
 * @param {String} message A message for the browser.
 * @param {Number} code Optional default 1000.
 * @return {Websocket}
 */
WebSocketProto.close = function(message, code) {

	var self = this;

	if (self.keys && self.keys.length) {
		for (var i = 0; i < self.keys.length; i++) {
			var id = self.keys[i];
			self.connections[id].close(message, code);
			self.$remove(id);
		}
	}

	self.$refresh();
	return self;
};

/**
 * Error caller
 * @param {Error/String} err
 * @return {WebSocket/Function}
 */
WebSocketProto.error = function(err) {
	var result = F.error(typeof(err) === 'string' ? new Error(err) : err, this.name, this.path);
	return err ? this : result;
};

WebSocketProto.destroy = function() {
	var self = this;

	if (!self.connections || !self.keys)
		return self;

	self.close();
	self.$events.destroy && self.emit('destroy');
	delete F.connections[self.id];

	setTimeout(function(keys) {

		if (keys) {
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				var conn = self.connections[key];
				if (conn) {
					conn._isClosed = true;
					conn.socket.removeAllListeners();
				}
			}
		}

		self.connections = null;
		self.route = null;
		self.buffer = null;
		self.removeAllListeners();

	}, 1000, self.keys);

	self.keys = null;

	return self;
};

/**
 * Enables auto-destroy websocket controller when any user is not online
 * @param {Function} callback
 * @return {WebSocket]
 */
function wsdestroy_open() {
	var self = this;
	if (self.$autocloseid) {
		clearTimeout(self.$autocloseid);
		self.$autocloseid = null;
	}
}

function wsdestroy_close(self) {

	// Checks again online state
	if (self.online) {
		self.$autocloseid = null;
		return;
	}

	if (self.$autodestroy) {
		for (var fn of self.$autodestroy)
			fn.call(self);
		self.$autodestroy = null;
	}
	self.destroy();
}

WebSocketProto.autodestroy = function(callback) {
	var self = this;

	if (self.$autodestroy) {
		self.$autodestroy.push(callback);
		return self;
	}

	self.$autodestroy = [];
	callback && self.$autodestroy.push(callback);
	self.on('open', wsdestroy_open);
	self.on('close', function() {
		if (!self.online)
			self.$autocloseid = setTimeout(wsdestroy_close, 5000, self);
	});
	return self;
};

/**
 * Internal function
 * @return {WebSocket}
 */
WebSocketProto.$refresh = function() {
	if (this.connections) {
		this.keys = Object.keys(this.connections);
		this.online = this.keys.length;
	} else
		this.online = 0;
	return this;
};

/**
 * Internal function
 * @param {String} id
 * @return {WebSocket}
 */
WebSocketProto.$remove = function(id) {
	if (this.connections)
		delete this.connections[id];
	return this;
};

/**
 * Internal function
 * @param {WebSocketClient} client
 * @return {WebSocket}
 */
WebSocketProto.$add = function(client) {
	this.connections[client.ID] = client;
	return this;
};

WebSocketProto.check = function() {
	var self = this;
	if (self.$ping && self.keys) {
		for (var i = 0; i < self.keys.length; i++) {
			var client = self.connections[self.keys[i]];
			if (client.$ping && (client.latency == null || client.latency > CONF.default_websocket_maxlatency)) {
				client.close();
				F.stats.other.websocketcleaner++;
			}
		}
	}

	return self;
};

/**
 * WebSocket controller
 * @param {Request} req
 * @param {Socket} socket
 */
function WebSocketClient(req, socket) {
	// this.ID;
	this.$ping = 0;
	this.container;
	this.id = '';
	this.socket = socket;
	this.req = req;
	this.language = req.$language;

	// this.isClosed = false;
	this.errors = 0;
	this.length = 0;
	this.current = {};

	// 1 = raw - not implemented
	// 2 = plain
	// 3 = JSON

	this.type = 2;
	// this._isClosed = false;
}

WebSocketClient.prototype = {

	get protocol() {
		return (this.req.headers['sec-websocket-protocol'] || '').replace(REG_EMPTY, '').split(',');
	},

	get ip() {
		return this.req.ip;
	},

	get get() {
		return this.req.query;
	},

	get ua() {
		return this.req ? this.req.ua : null;
	},

	get query() {
		return this.req.query;
	},

	get url() {
		if (!this.$$url)
			this.$$url = U.path(this.req.uri.pathname).toLowerCase();
		return this.$$url;
	},

	get headers() {
		return this.req.headers;
	},

	get uri() {
		return this.req.uri;
	},

	get sessionid() {
		return this.req.sessionid;
	},

	get session() {
		return this.req.session;
	},

	set session(value) {
		this.req.session = value;
	},

	get user() {
		return this.req.user;
	},

	set user(value) {
		this.req.user = value;
	},

	get mobile() {
		return this.req.mobile;
	},

	get online() {
		return !this.isClosed;
	}
};

const WebSocketClientProto = WebSocketClient.prototype;

WebSocketClientProto.isWebSocket = true;

/**
 * Gets a hostname
 * @param {String} path
 * @return {Controller}
 */
WebSocketClientProto.host = WebSocketClientProto.hostname = ControllerProto.host = ControllerProto.hostname = function(path) {
	return this.req.hostname(path);
};

WebSocketClientProto.$exec = function(url, msg, answer, callback) {
	var self = this;

	websocket_api(url, self, msg.data, function(err, response) {

		if (err && !(err instanceof ErrorBuilder)) {
			err = new ErrorBuilder().push(err);
			self.$language && err.setResource(self.$language);
		}

		callback && callback(err, response);

		if (err instanceof ErrorBuilder) {
			msg.error = true;
			msg.data = err.prepare().items;
		} else {
			msg.success = true;
			msg.data = response;
		}

		if (answer) {
			if (answer === 'others')
				self.websocket.send(msg, client => client !== self);
			else if (answer === 'all')
				self.websocket.send(msg);
		} else if (msg.callbackid)
			self.send(msg);

	}, self);
	return self;
};

WebSocketClientProto.cookie = function(name) {
	return this.req.cookie(name);
};

function websocketclientclose(self, code, message) {
	self.ready = true;
	self.close(message, code);
}

WebSocketClientProto.$close = function(code, message) {
	var self = this;
	var header = SOCKET_RESPONSE.format(self.$websocket_key(self.req));
	self.socket.write(Buffer.from(header, 'binary'));
	websocketclientclose(self, code, message);
	setImmediate(websocketclientclose, self, code, message);
	return self;
};

WebSocketClientProto.prepare = function(flags, protocols, allow, length) {

	flags = flags || EMPTYARRAY;
	protocols = protocols || EMPTYARRAY;
	allow = allow || EMPTYARRAY;

	var self = this;

	if (SOCKET_ALLOW_VERSION.indexOf(U.parseInt(self.req.headers['sec-websocket-version'])) === -1)
		return false;

	self.length = length;

	var origin = self.req.headers.origin || '';
	var length = allow.length;

	if (length && allow.indexOf('*') === -1) {
		var is = false;
		for (var i = 0; i < length; i++) {
			if (origin.indexOf(allow[i]) !== -1) {
				is = true;
				break;
			}
		}
		if (!is)
			return false;
	}

	length = protocols.length;
	if (length) {
		for (var i = 0; i < length; i++) {
			if (self.protocol.indexOf(protocols[i]) === -1)
				return false;
		}
	}

	var compress = (CONF.allow_websocket_compression && self.req.headers['sec-websocket-extensions'] || '').indexOf('permessage-deflate') !== -1;
	var header = protocols.length ? (compress ? SOCKET_RESPONSE_PROTOCOL_COMPRESS : SOCKET_RESPONSE_PROTOCOL).format(self.$websocket_key(self.req), protocols.join(', ')) : (compress ? SOCKET_RESPONSE_COMPRESS : SOCKET_RESPONSE).format(self.$websocket_key(self.req));

	self.socket.write(Buffer.from(header, 'binary'));
	self.ready = true;

	if (compress) {
		self.inflatepending = [];
		self.inflatelock = false;
		self.inflate = Zlib.createInflateRaw(WEBSOCKET_COMPRESS_OPTIONS);
		self.inflate.$websocket = self;
		self.inflate.on('error', function() {
			if (!self.$uerror) {
				self.$uerror = true;
				self.close('Invalid data', 1003);
			}
		});

		self.inflate.on('data', websocket_inflate);
		self.deflatepending = [];
		self.deflatelock = false;
		self.deflate = Zlib.createDeflateRaw(WEBSOCKET_COMPRESS_OPTIONS);
		self.deflate.$websocket = self;
		self.deflate.on('error', function() {
			if (!self.$uerror) {
				self.$uerror = true;
				self.close('Invalid data', 1003);
			}
		});
		self.deflate.on('data', websocket_deflate);
	}

	if (WSCLIENTSID++ > 999999999)
		WSCLIENTSID = 1;

	self.ID = WSCLIENTSID + '';
	self.id = self.ID;
	return true;
};

function websocket_inflate(data) {
	var ws = this.$websocket;
	if (ws && ws.inflatechunks) {
		ws.inflatechunks.push(data);
		ws.inflatechunkslength += data.length;
	}
}

function websocket_deflate(data) {
	var ws = this.$websocket;
	if (ws && ws.deflatechunks) {
		ws.deflatechunks.push(data);
		ws.deflatechunkslength += data.length;
	}
}

/**
 * Add a container to client
 * @param {WebSocket} container
 * @return {WebSocketClient}
 */
WebSocketClientProto.upgrade = function(container) {
	var self = this;
	self.req.on('abort', websocket_onerror);
	self.req.on('aborted', websocket_onerror);
	self.req.on('error', websocket_onerror);
	self.container = self.controller = container;
	self.socket.$websocket = this;
	self.socket.on('data', websocket_ondata);
	self.socket.on('error', websocket_onerror);
	self.socket.on('close', websocket_close);
	self.socket.on('end', websocket_close);
	self.container.$add(self);
	self.container.$refresh();
	F.$events.websocket_begin && EMIT('websocket_begin', self.container, self);
	self.container.$events.open && self.container.emit('open', self);
	F.stats.performance.online++;
	return self;
};

function websocket_ondata(chunk) {
	this.$websocket.$ondata(chunk);
}

function websocket_onerror(e) {
	this.destroy && this.destroy();
	this.$websocket && this.$websocket.$onerror(e);
}

function websocket_close() {
	this.destroy && this.destroy();
	this.$websocket && this.$websocket.$onclose();
}

WebSocketClientProto.$ondata = function(data) {

	var self = this;
	var current = self.current;

	if (data) {
		if (current.buffer) {
			CONCAT[0] = current.buffer;
			CONCAT[1] = data;
			current.buffer = Buffer.concat(CONCAT);
		} else
			current.buffer = data;
	}

	if (!self.$parse())
		return;

	if (!current.final && current.type !== 0x00)
		current.type2 = current.type;

	var decompress = current.compressed && self.inflate;

	switch (current.type === 0x00 ? current.type2 : current.type) {
		case 0x01:

			// text
			if (decompress) {
				current.final && self.parseInflate();
			} else {

				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && self.$decode();
			}

			break;

		case 0x02:

			// binary
			if (decompress) {
				current.final && self.parseInflate();
			} else {
				if (current.body) {
					CONCAT[0] = current.body;
					CONCAT[1] = current.data;
					current.body = Buffer.concat(CONCAT);
				} else
					current.body = current.data;
				current.final && self.$decode();
			}

			break;

		case 0x08:

			// close
			if (current.data) {
				self.closemessage = current.data.slice(2).toString(ENCODING);
				self.closecode = current.data[0] << 8 | current.data[1];
			}

			if (self.closemessage && self.container.encodedecode)
				self.closemessage = $decodeURIComponent(self.closemessage);

			self.close();
			current.buffer = null;
			current.inflatedata = null;
			return;

		case 0x09:
			// ping, response pong
			self.socket.write(U.getWebSocketFrame(0, 'PONG', 0x0A, false, self.masking));
			current.buffer = null;
			current.inflatedata = null;
			break;

		case 0x0a:
			// pong
			self.latency = Date.now() - self.$ping;
			current.buffer = null;
			current.inflatedata = null;
			break;
	}

	if (current.buffer) {
		current.buffer = current.buffer.slice(current.length, current.buffer.length);
		current.buffer.length && setImmediate(self.$ondata2);
	}
};

function buffer_concat(buffers, length) {
	var buffer = Buffer.alloc(length);
	var offset = 0;
	for (var i = 0, n = buffers.length; i < n; i++) {
		buffers[i].copy(buffer, offset);
		offset += buffers[i].length;
	}
	return buffer;
}

// MIT
// Written by Jozef Gula
// Optimized by Peter Sirka
WebSocketClientProto.$parse = function() {

	var self = this;
	var current = self.current;

	// Fixed a problem with parsing of long messages, the code bellow 0x80 still returns 0 when the message is longer
	// if (!current.buffer || current.buffer.length <= 2 || ((current.buffer[0] & 0x80) >> 7) !== 1)
	if (!current.buffer || current.buffer.length <= 2)
		return;

	// WebSocket - Opcode
	current.type = current.buffer[0] & 0x0f;

	// Compression
	// Type must be greater than 0
	if (current.type)
		current.compressed = (current.buffer[0] & 0x40) === 0x40;

	// is final message?
	current.final = ((current.buffer[0] & 0x80) >> 7) === 0x01;

	// does frame contain mask?
	current.isMask = ((current.buffer[1] & 0xfe) >> 7) === 0x01;

	// data length
	var length = U.getMessageLength(current.buffer, F.isLE);
	// index for data

	// Solving a problem with The value "-1" is invalid for option "size"
	if (length <= 0)
		return current.final;

	var index = current.buffer[1] & 0x7f;
	index = ((index === 126) ? 4 : (index === 127 ? 10 : 2)) + (current.isMask ? 4 : 0);

	// total message length (data + header)
	var mlength = index + length;

	if (mlength > self.length) {
		self.close('Frame is too large', 1009);
		return;
	}

	// Check length of data
	if (current.buffer.length < mlength)
		return;

	current.length = mlength;

	// Not Ping & Pong
	if (current.type !== 0x09 && current.type !== 0x0A) {

		// does frame contain mask?
		if (current.isMask) {
			current.mask = Buffer.alloc(4);
			current.buffer.copy(current.mask, 0, index - 4, index);
		}

		if (current.compressed && self.inflate) {

			var buf = Buffer.alloc(length);
			current.buffer.copy(buf, 0, index, mlength);

			// does frame contain mask?
			if (current.isMask) {
				for (var i = 0; i < length; i++)
					buf[i] = buf[i] ^ current.mask[i % 4];
			}

			// Does the buffer continue?
			buf.$continue = current.final === false;
			self.inflatepending.push(buf);

		} else {

			current.data = Buffer.alloc(length);
			current.buffer.copy(current.data, 0, index, mlength);

			if (current.isMask) {
				for (var i = 0; i < length; i++)
					current.data[i] = current.data[i] ^ current.mask[i % 4];
			}
		}
	}

	return true;
};

WebSocketClientProto.$decode = function() {

	var data = this.current.body;

	F.stats.performance.message++;
	F.stats.performance.download += data.length / 1024 / 1024;

	// Buffer
	if (this.typebuffer) {
		this.container.$events.message && this.container.emit('message', this, data);
		return;
	}

	switch (this.type) {

		case 1: // BINARY
			this.container.$events.message && this.container.emit('message', this, data);
			break;

		case 3: // JSON

			if (data instanceof Buffer)
				data = data.toString(ENCODING);

			if (this.container.encodedecode === true)
				data = $decodeURIComponent(data);

			if (this.container.$encrypt && CONF.secret_encryption)
				data = framework_utils.decrypt_data(data, CONF.secret_encryption);

			if (data.isJSON()) {
				var tmp = data.parseJSON(true);

				if (REG_EMPTYBUFFER_TEST.test(tmp))
					tmp = tmp.replace(REG_EMPTYBUFFER, '');

				if (tmp !== undefined && this.container.$events.message)
					this.container.emit('message', this, tmp);
			}
			break;

		default: // TEXT

			if (data instanceof Buffer)
				data = data.toString(ENCODING);

			if (this.container.encodedecode === true)
				data = $decodeURIComponent(data);

			if (this.container.$encrypt && CONF.secret_encryption)
				data = framework_utils.decrypt_data(data, CONF.secret_encryption);

			if (REG_EMPTYBUFFER_TEST.test(data))
				data = data.replace(REG_EMPTYBUFFER, '');

			this.container.$events.message && this.container.emit('message', this, data);
			break;
	}

	this.current.body = null;
};

WebSocketClientProto.parseInflate = function() {
	var self = this;

	if (self.inflatelock)
		return;

	var buf = self.inflatepending.shift();
	if (buf) {
		self.inflatechunks = [];
		self.inflatechunkslength = 0;
		self.inflatelock = true;
		self.inflate.write(buf);

		if (!buf.$continue)
			self.inflate.write(Buffer.from(WEBSOCKET_COMPRESS));

		self.inflate.flush(function() {

			if (!self.inflatechunks)
				return;

			var data = buffer_concat(self.inflatechunks, self.inflatechunkslength);

			self.inflatechunks = null;
			self.inflatelock = false;

			if (data.length > self.length) {
				self.close('Frame is too large', 1009);
				return;
			}

			if (self.current.body) {
				CONCAT[0] = self.current.body;
				CONCAT[1] = data;
				self.current.body = Buffer.concat(CONCAT);
			} else
				self.current.body = data;

			!buf.$continue && self.$decode();
			self.parseInflate();
		});
	}
};

WebSocketClientProto.$onerror = function(err) {

	if (this.isClosed)
		return;

	if (REG_WEBSOCKET_ERROR.test(err.stack)) {
		this.isClosed = true;
		this.$onclose();
	} else
		this.container.$events.error && this.container.emit('error', err, this);
};

WebSocketClientProto.$onclose = function() {

	if (this._isClosed)
		return;

	F.stats.performance.online--;
	this.isClosed = true;
	this._isClosed = true;

	if (this.inflate) {
		this.inflate.removeAllListeners();
		this.inflate = null;
		this.inflatechunks = null;
	}

	if (this.deflate) {
		this.deflate.removeAllListeners();
		this.deflate = null;
		this.deflatechunks = null;
	}

	this.container.$remove(this.ID);
	this.container.$refresh();
	this.container.$events.close && this.container.emit('close', this, this.closecode, this.closemessage);
	this.socket.removeAllListeners();
	F.$events.websocket_end && EMIT('websocket_end', this.container, this);
};

WebSocketClientProto.send = function(message, raw, replacer) {

	var self = this;

	if (self.isClosed)
		return self;

	if (self.type !== 1) {

		var data = self.type === 3 ? (raw ? message : JSON.stringify(message, replacer == true ? framework_utils.json2replacer : replacer)) : typeof(message) === 'object' ? JSON.stringify(message, replacer == true ? framework_utils.json2replacer : replacer) : (message + '');
		var buffer;

		if (self.container.$encrypt && CONF.secret_encryption)
			data = framework_utils.encrypt_data(data, CONF.secret_encryption);

		if (self.container.encodedecode === true && data)
			data = encodeURIComponent(data);

		if (self.deflate) {
			buffer = Buffer.from(data, ENCODING);
			self.deflatepending.push(buffer);
			self.sendDeflate();
		} else {
			buffer = Buffer.from(data, ENCODING);
			self.socket.write(U.getWebSocketFrame(0, buffer, 0x01, false, self.masking));
		}

	} else if (message) {
		buffer = message;
		if (self.deflate) {
			self.deflatepending.push(message);
			self.sendDeflate();
		} else
			self.socket.write(U.getWebSocketFrame(0, message, 0x02, false, self.masking));
	}

	if (buffer)
		F.stats.performance.upload += buffer.length / 1024 / 1024;

	return self;
};

WebSocketClientProto.sendDeflate = function() {

	var self = this;

	if (self.deflatelock)
		return;

	var buf = self.deflatepending.shift();
	if (buf) {
		self.deflatechunks = [];
		self.deflatechunkslength = 0;
		self.deflatelock = true;
		self.deflate.write(buf);
		self.deflate.flush(function() {
			if (self.deflatechunks) {
				var data = buffer_concat(self.deflatechunks, self.deflatechunkslength);
				data = data.slice(0, data.length - 4);
				self.deflatelock = false;
				self.deflatechunks = null;
				self.socket.write(U.getWebSocketFrame(0, data, self.type === 1 ? 0x02 : 0x01, true, self.masking));
				self.sendDeflate();
			}
		});
	}
};

/**
 * Ping message
 * @return {WebSocketClient}
 */
WebSocketClientProto.ping = function(ts) {
	var self = this;
	if (!self.isClosed) {
		try {
			self.$ping = ts || Date.now();
			self.socket.write(U.getWebSocketFrame(0, 'PING', 0x09, false, self.masking));
		} catch (e) {
			// Socket error
			self.$onerror(e);
		}
	}
	return self;
};

function websocketclientdestroy(self) {
	self.socket.destroy();
	CLEANUP(self.socket);
	CLEANUP(self.req);
}

function websocketclientsendfin(self) {
	self.socket.end(U.getWebSocketFrame(self.closecode, self.closemessage, 0x08, false, self.masking));
	setImmediate(websocketclientdestroy, self);
}

/**
 * Close connection
 * @param {String} message Message.
 * @param {Number} code WebSocket code.
 * @return {WebSocketClient}
 */
WebSocketClientProto.close = function(message, code) {

	var self = this;

	if (!self.isClosed) {

		if (typeof(message) === 'number') {
			var tmp = message;
			message = code;
			code = tmp;
		}

		self.isClosed = true;

		if (self.ready) {

			if (message && self.container && self.container.encodedecode)
				message = encodeURIComponent(message);

			if (self.closecode) {
				setImmediate(websocketclientdestroy, self);
			} else {
				self.closecode = code || 1000;
				self.closemessage = message || '';
				setTimeout(websocketclientsendfin, 1000, self);
			}

		} else if (!self.closecode) {
			self.socket.end();
			setImmediate(websocketclientdestroy, self);
		}
	}

	return self;
};

/**
 * Create a signature for the WebSocket
 * @param {Request} req
 * @return {String}
 */
WebSocketClientProto.$websocket_key = function(req) {
	var sha1 = Crypto.createHash('sha1');
	sha1.update((req.headers['sec-websocket-key'] || '') + SOCKET_HASH);
	return sha1.digest('base64');
};

// *********************************************************************************
// =================================================================================
// Prototypes
// =================================================================================
// *********************************************************************************

function req_authorizecallback(isAuthorized, user, $) {

	// @isAuthorized "null" for callbacks(err, user)
	// @isAuthorized "true"
	// @isAuthorized "object" is as user but "user" must be "undefined"

	if (isAuthorized instanceof Error || isAuthorized instanceof ErrorBuilder) {
		// Error handling
		isAuthorized = false;
	} else if (isAuthorized == null && user) {
		// A callback error handling
		isAuthorized = true;
	} else if (user == null && isAuthorized && isAuthorized !== true) {
		user = isAuthorized;
		isAuthorized = true;
	}

	$.req.isAuthorized = isAuthorized;
	$.req.authorizecallback(null, user, isAuthorized);
	$.req.authorizecallback = null;
}

function req_authorizetotal(isAuthorized, user, $) {

	// @isAuthorized "null" for callbacks(err, user)
	// @isAuthorized "true"
	// @isAuthorized "object" is as user but "user" must be "undefined"

	var req = $.req;
	if (isAuthorized instanceof Error || isAuthorized instanceof ErrorBuilder) {
		// Error handling
		isAuthorized = false;
	} else if (isAuthorized == null && user) {
		// A callback error handling
		isAuthorized = true;
	} else if (user == null && isAuthorized && isAuthorized !== true) {
		user = isAuthorized;
		isAuthorized = true;
	}

	req.isAuthorized = isAuthorized;
	req.$total_authorize(isAuthorized, user);
}

function extend_request(PROTO) {

	PROTOREQ = PROTO;

	if (PROTO.$total_success)
		return;

	Object.defineProperty(PROTO, 'ip', {
		get: function() {
			if (this._ip)
				return this._ip;

			//  x-forwarded-for: client, proxy1, proxy2, ...
			var proxy = this.headers['x-forwarded-for'];
			if (proxy)
				this._ip = proxy.split(',', 1)[0] || this.connection.remoteAddress;
			else if (!this._ip)
				this._ip = this.connection.remoteAddress;

			return this._ip;
		},
		set: function(val) {
			this._ip = val;
		}
	});

	Object.defineProperty(PROTO, 'query', {
		get: function() {
			if (!this._querydata)
				this._querydata = this.uri && this.uri.query ? DEF.parsers.urlencoded(this.uri.query) : {};
			return this._querydata;
		},
		set: function(value) {
			this._querydata = value;
		}
	});

	Object.defineProperty(PROTO, 'subdomain', {
		get: function() {
			if (this._subdomain)
				return this._subdomain;
			var subdomain = this.uri.hostname.toLowerCase().replace(REG_WWW, '').split('.');
			if (subdomain.length > 2) // example: [subdomain].domain.com
				this._subdomain = subdomain.slice(0, subdomain.length - 2);
			else if (subdomain.length > 1 && subdomain[subdomain.length - 1] === 'localhost') // example: [subdomain].localhost
				this._subdomain = subdomain.slice(0, subdomain.length - 1);
			else
				this._subdomain = null;
			return this._subdomain;
		}
	});

	Object.defineProperty(PROTO, 'host', {
		get: function() {
			return this.headers.host;
		}
	});

	Object.defineProperty(PROTO, 'split', {
		get: function() {
			return this.$path ? this.$path : this.$path = framework_internal.routesplit(this.uri.pathname, true);
		}
	});

	Object.defineProperty(PROTO, 'split2', {
		get: function() {
			return this.$path2 ? this.$path2 : this.$path2 = framework_internal.routesplit(this.uri.pathname);
		}
	});

	Object.defineProperty(PROTO, 'secured', {
		get: function() {
			return this.uri.protocol === 'https:' || this.uri.protocol === 'wss:';
		}
	});

	Object.defineProperty(PROTO, 'language', {
		get: function() {
			if (!this.$language)
				this.$language = (((this.headers['accept-language'] || '').split(';')[0] || '').split(',')[0] || '').toLowerCase();
			return this.$language;
		},
		set: function(value) {
			this.$language = value;
		}
	});

	Object.defineProperty(PROTO, 'ua', {
		get: function() {
			if (this.$ua === undefined)
				this.$ua = (this.headers['user-agent'] || '').parseUA();
			return this.$ua;
		}
	});

	Object.defineProperty(PROTO, 'mobile', {
		get: function() {
			if (this.$mobile === undefined)
				this.$mobile = REG_MOBILE.test(this.headers['user-agent']);
			return this.$mobile;
		}
	});

	Object.defineProperty(PROTO, 'robot', {
		get: function() {
			if (this.$robot === undefined)
				this.$robot = REG_ROBOT.test(this.headers['user-agent']);
			return this.$robot;
		}
	});

	PROTO.localize = function() {
		DEF.onLocale && (this.$language = DEF.onLocale(this, this.res, this.isStaticFile));
		return this.$language;
	};

	/**
	 * Disable HTTP cache for current request
	 * @return {Request}
	 */
	PROTO.nocache = function() {
		this.res && this.res.nocache();
		return this;
	};

	PROTO.useragent = function(structured) {
		var key = structured ? '$ua2' : '$ua';
		return this[key] ? this[key] : this[key] = (this.headers['user-agent'] || '').parseUA(structured);
	};

	/**
	 * Read a cookie from current request
	 * @param {String} name Cookie name.
	 * @return {String} Cookie value (default: '')
	 */
	PROTO.cookie = function(name) {

		if (this.cookies)
			return $decodeURIComponent(this.cookies[name] || '');

		var cookie = this.headers.cookie;
		if (!cookie)
			return '';

		this.cookies = {};

		var arr = cookie.split(';');

		for (var i = 0; i < arr.length; i++) {
			var line = arr[i].trim();
			var index = line.indexOf('=');
			if (index !== -1)
				this.cookies[line.substring(0, index)] = line.substring(index + 1);
		}

		return name ? $decodeURIComponent(this.cookies[name] || '') : '';
	};

	/**
	 * Read authorization header
	 * @return {Object}
	 */
	PROTO.authorization = function() {

		var authorization = this.headers.authorization;
		if (!authorization)
			return HEADERS.authorization;

		var result = { user: '', password: '', empty: true };

		try {
			var arr = Buffer.from(authorization.replace('Basic ', '').trim(), 'base64').toString(ENCODING).split(':');
			result.user = arr[0] || '';
			result.password = arr[1] || '';
			result.empty = !result.user || !result.password;
		} catch (e) {}

		return result;
	};

	PROTO.encrypt = function(value) {
		this.$bodyencrypt = value == null || value === true;
		return this;
	};

	/**
	 * Authorization for custom delegates
	 * @param  {Function(err, userprofile, isAuthorized)} callback
	 * @return {Request}
	 */
	PROTO.authorize = function(callback) {
		var req = this;
		if (DEF.onAuthorize) {
			req.authorizecallback = callback;
			DEF.onAuthorize(req, req.res, req_authorizecallback);
		} else
			callback(null, null, false);
		return req;
	};

	/**
	 * Clear all uplaoded files
	 * @private
	 * @param {Boolean} isAuto
	 * @return {Request}
	 */
	PROTO.clear = function(isAuto) {

		var self = this;
		var files = self.files;

		if (!files || (isAuto && self._manual))
			return self;

		self.body = null;
		self.query = null;
		self.cookies = null;

		var length = files.length;
		if (!length)
			return self;

		var arr = [];
		for (var i = 0; i < length; i++)
			files[i].rem && arr.push(files[i].path);

		PATH.unlink(arr);
		self.files = null;
		return self;
	};

	PROTO.csrf = function() {
		return DEF.onCSRFcreate(this);
	};

	PROTO.proxy = function(target, copypath, after, timeout) {
		this.res.proxy(target, copypath, after, timeout);
	};

	/**
	 * Get host name from URL
	 * @param {String} path Additional path.
	 * @return {String}
	 */
	PROTO.hostname = function(path) {

		var self = this;
		var uri = self.uri;

		if (path && path[0] !== '/')
			path = '/' + path;

		return uri.protocol + '//' + uri.hostname + (uri.port && uri.port !== 80 ? ':' + uri.port : '') + (path || '');
	};

	PROTO.filecache = function(callback) {
		F.exists(this, this.res, 20, callback);
	};

	PROTO.$total_success = function() {
		// this.$total_timeout && clearTimeout(this.$total_timeout);
		// request_cleartimeout(this);
		this.$total_canceled = true;
		if (this.controller) {
			this.controller.res.controller = null;
			this.controller = null;
		}
	};

	PROTO.$total_file = function() {
		var h = this.method[0];
		if (h === 'G' || h === 'H')
			this.$total_endfile();
		else
			this.on('end', this.$total_endfile);
	};

	PROTO.$total_multipart = function(header) {
		F.stats.request.upload++;
		this.$total_route = F.lookup(this);

		if (this.$total_route && this.$total_route.flags2.csrf && CONF.secret_csrf && !DEF.onCSRFcheck(this)) {
			this.$total_exception = 'Invalid CSRF token';
			this.$total_status(403);
			return;
		}

		this.$total_header = header;

		if (this.$total_route) {
			PATH.verify('temp');
			framework_internal.parseMULTIPART(this, header, this.$total_route);
		} else
			this.$total_status(404);
	};

	PROTO.$total_urlencoded = function() {
		this.$total_route = F.lookup(this);
		if (this.$total_route) {

			if (this.$total_route.flags2.csrf && CONF.secret_csrf && !DEF.onCSRFcheck(this)) {
				this.$total_exception = 'Invalid CSRF token';
				this.$total_status(403);
				return;
			}

			this.bodyhas = true;
			this.bodyexceeded = false;

			var encoding = this.headers['content-encoding'];
			if (COMPRESS[encoding]) {
				this.totalgunzip = encoding === 'gzip' ? Zlib.createGunzip() : Zlib.createInflate();
				this.totalgunzip.on('data', chunk => this.$total_parsebody(chunk));
				this.totalgunzip.on('error', () => this.$total_400('Invalid data'));
				this.pipe(this.totalgunzip);
			} else
				this.on('data', this.$total_parsebody);

			this.$total_end();
		} else
			this.$total_status(404);
	};

	PROTO.$total_status = function(status) {

		if (status)
			F.stats.request['error' + status]++;
		else
			F.stats.request.blocked++;

		this.$total_route = F.lookup_system(status);

		if (this.$total_route) {
			this.$total_execute(status, true);
		} else {
			this.res.writeHead(status);
			this.res.end(U.httpstatus(status));
			if (!this.isStaticFile)
				F.$events.request_end && EMIT('request_end', this, this.res);
			this.bodydata = null;
			this.clear(true);
		}
	};

	PROTO.$total_end = function() {
		var h = this.method[0];
		if (h === 'G' || h === 'H' || h === 'O') {
			if (this.$total_route && this.$total_route.schema)
				this.$total_schema = true;
			this.bodydata = null;
			this.$total_prepare();
		} else {
			if (this.totalgunzip)
				this.totalgunzip.on('end', () => this.$total_end2());
			else
				this.on('end', this.$total_end2);
		}
	};

	PROTO.$total_execute = function(status, isError) {

		var route = this.$total_route;
		var res = this.res;

		if (isError || !route) {

			var key = 'error' + status;
			F.stats.response[key]++;

			// "error" is executed from DEF.onError
			// if (status !== 500 && F.$events.error)
			// 	EMIT('error_response', this, res, this.$total_exception);

			F.$events[key] && EMIT(key, this, res, this.$total_exception);
		}

		if (!route) {

			if (status === 400 && this.$total_exception instanceof framework_builders.ErrorBuilder) {
				F.stats.response.errorbuilder++;
				this.$language && this.$total_exception.setResource(this.$language);
				res.options.body = this.$total_exception.output(true);
				res.options.code = this.$total_exception.status;
				res.options.type = this.$total_exception.contentType;
				res.$text();

			} else {

				if (CONF.default_errorbuilder_errors || (CONF.default_errorbuilder_forxhr && this.xhr)) {
					var err = new ErrorBuilder();
					err.push(status);
					this.$language && err.setResource(this.$language);
					res.options.body = err.output(true);
					res.options.code = err.status || status || 404;
					res.options.type = err.contentType;
				} else {
					MODELERROR.code = status;
					MODELERROR.status = U.httpstatus(status, false);
					MODELERROR.error = this.$total_exception ? prepare_error(this.$total_exception) : null;
					res.options.body = VIEW('.' + PATHMODULES + 'error', MODELERROR);
					res.options.type = CT_HTML;
					res.options.code = status || 404;
				}

				res.$text();
			}
			return;
		}

		var name = route.controller;

		if (route.isMOBILE_VARY)
			this.$mobile = true;

		if (route.currentViewDirectory === undefined)
			route.currentViewDirectory = name && name[0] !== '#' && name !== 'default' && name !== 'unknown' ? '/' + name + '/' : '';

		var controller = new Controller(name, this, res, route.currentViewDirectory);

		controller.exception = this.$total_exception;
		this.controller = controller;

		if (!this.$total_canceled && route.timeout) {
			if (!this.$total_timeout)
				TIMEOUTS.push(this);
			this.$total_timeout = route.timeout / 1000;
			// this.$total_timeout && clearTimeout(this.$total_timeout);
			// this.$total_timeout = setTimeout(subscribe_timeout, route.timeout, this);
		}

		route.isDELAY && res.writeContinue();

		if (route.middleware)
			async_middleware(0, this, res, route.middleware, subscribe_timeout_middleware, route.options, controller);
		else {
			if (F._length_request_middleware_dynamic)
				async_middleware(0, this, res, F.routes.request_dynamic, subscribe_timeout_middleware2, null, controller);
			else
				this.$total_execute2();
		}
	};

	PROTO.$total_execute2 = function() {

		var name = this.$total_route.controller;
		var controller = this.controller;

		try {

			if (DEF.onTheme)
				controller.themeName = DEF.onTheme(controller);

			if (controller.isCanceled)
				return;

			var ctrlname = '@' + name;
			F.$events.controller && EMIT('controller', controller, name, this.$total_route.options);
			F.$events[ctrlname] && EMIT(ctrlname, controller, name, this.$total_route.options);

			if (controller.isCanceled)
				return;

			if (!controller.isTransfer && !F.temporary.other[this.uri.pathname])
				F.temporary.other[this.uri.pathname] = this.path;

			if (this.$total_route.param.length) {
				var params = framework_internal.routeparams(this.split, this.$total_route);
				controller.id = params.values[0];
				if (params.error)
					controller.throw400('Invalid parameters');
				else
					this.$total_route.execute.call(controller, params.values[0], params.values[1], params.values[2], params.values[3], params.values[4], params.values[5]);
			} else
				this.$total_route.execute.call(controller);

		} catch (err) {
			F.error(err, name, this.uri);
			this.$total_exception = err;
			this.$total_route = F.lookup_system(500);
			this.$total_execute(500, true);
		}
	};

	PROTO.$total_parsebody = function(chunk) {

		if (this.bodyexceeded)
			return;

		if (!this.bodyexceeded) {
			CONCAT[0] = this.bodydata;
			CONCAT[1] = chunk;
			this.bodydata = Buffer.concat(CONCAT);
		}

		if ((this.bodydata.length / 1024) < this.$total_route.length)
			return;

		this.bodyexceeded = true;
		this.bodydata = Buffer.alloc(0);
	};

	PROTO.$total_cancel = function() {

		var t = this;
		F.stats.response.timeout++;

		if (F.timeouts.push((NOW = new Date()).toJSON() + ' ' + t.url + (t.urlschema ? (' --> ' + t.urlschema) : '')) > 5)
			F.timeouts.shift();

		if (t.controller) {
			t.controller.isTimeout = true;
			t.controller.isCanceled = true;
		}

		t.$total_route = F.lookup_system(503);
		t.$total_execute(503, true);
	};

	PROTO.$total_authorize = function(isLogged, user) {

		var membertype = isLogged ? 1 : 2;
		var code = this.bodyexceeded ? 431 : 401;

		user && (this.user = user);

		// @roles argument
		var route = this.$total_route;

		if (!route || route.MEMBER !== membertype)
			route = this.bodyexceeded ? F.lookup_system(431) : F.lookup(this, membertype);

		if (!this.$language && DEF.onLocale)
			this.$language = DEF.onLocale(this, this.res);

		var status = this.$isAuthorized || route == null ? 404 : 401;
		var code = this.bodyexceeded ? 431 : status;
		if (!route)
			route = F.lookup_system(status);

		this.$total_route = route;
		this.$total_execute(code);
	};

	PROTO.$total_end2 = function() {

		var route = this.$total_route;

		this.totalgunzip = null;

		if (this.bodydata)
			F.stats.performance.download += this.bodydata.length / 1024 / 1024;

		if (this.bodyexceeded) {
			route = F.lookup_system(431);
			this.bodydata = null;
			if (route) {
				this.$total_route = route;
				this.$total_execute(431, true);
			} else
				this.res.throw431();
			return;
		}

		if (!this.bodydata || !this.bodydata.length) {
			if (route && route.schema)
				this.$total_schema = true;
			this.$total_prepare();
			return;
		}

		var tmp;

		if (route.isXML) {

			if (this.$type !== 2) {
				this.$total_400('Invalid "Content-Type"');
				return;
			}

			try {
				tmp = this.bodydata.toString(ENCODING);

				if (CONF.secret_encryption && !route.flags2.nodecrypt)
					tmp = framework_utils.decrypt_data(tmp, CONF.secret_encryption);

				if (!tmp || tmp === '\0') {
					this.$total_400('Invalid data');
					return;
				}

				if (REG_EMPTYBUFFER_TEST.test(tmp))
					tmp = tmp.replace(REG_EMPTYBUFFER, '');

				this.body = DEF.parsers.xml(tmp);
				this.$total_prepare();
			} catch (err) {
				F.error(err, null, this.uri);
				this.$total_500(err);
			}

			return;
		}

		if (route.isRAW) {
			this.body = this.bodydata;
			this.$total_prepare();
			return;
		}

		if (!this.$type) {
			this.$total_400('Invalid "Content-Type"');
			return;
		}

		if (this.$type === 1) {
			try {
				tmp = this.bodydata.toString(ENCODING);

				if (CONF.secret_encryption && !route.flags2.nodecrypt)
					tmp = framework_utils.decrypt_data(tmp, CONF.secret_encryption);

				if (!tmp || tmp === '\0') {
					this.$total_400('Invalid data');
					return;
				}

				if (REG_EMPTYBUFFER_TEST.test(tmp))
					tmp = tmp.replace(REG_EMPTYBUFFER, '');

				this.body = DEF.parsers.json(tmp);

			} catch (e) {
				this.$total_400('Invalid JSON data');
				return;
			}
		} else {
			tmp = this.bodydata.toString(ENCODING);

			if (CONF.secret_encryption && !route.flags2.nodecrypt)
				tmp = framework_utils.decrypt_data(tmp, CONF.secret_encryption);

			if (!tmp || tmp === '\0') {
				this.$total_400('Invalid data');
				return;
			}

			if (REG_EMPTYBUFFER_TEST.test(tmp))
				tmp = tmp.replace(REG_EMPTYBUFFER, '');
			this.body = DEF.parsers.urlencoded(tmp);
		}

		route.schema && (this.$total_schema = true);
		this.$total_prepare();
	};

	PROTO.$total_endfile = function() {

		var req = this;
		var res = this.res;

		if (!F._length_files)
			return res.continue();

		for (var i = 0; i < F.routes.files.length; i++) {

			var file = F.routes.files[i];
			// try {

			if (file.extensions && !file.extensions[req.extension])
				continue;

			if (file.url) {
				var skip = false;
				var length = file.url.length;

				if (!file.wildcard && !file.fixedfile && length !== req.path.length - 1)
					continue;

				for (var j = 0; j < length; j++) {
					if (file.url[j] === req.path[j])
						continue;
					skip = true;
					break;
				}

				if (skip)
					continue;

			} else if (file.onValidate && !file.onValidate(req, res, true))
				continue;

			if (file.middleware)
				req.$total_endfilemiddleware(file);
			else
				file.execute(req, res, false);

			return;
		}

		res.continue();
	};

	PROTO.$total_endfilemiddleware = function(file) {
		this.$total_filemiddleware = file;
		async_middleware(0, this, this.res, file.middleware, total_endmiddleware, file.options);
	};

	PROTO.$total_400 = function(problem) {
		this.$total_route = F.lookup_system(400);
		this.$total_exception = problem;
		this.$total_execute(400, true);
	};

	PROTO.$total_404 = function(problem) {
		this.$total_route = F.lookup_system(404);
		this.$total_exception = problem;
		this.$total_execute(404, true);
	};

	PROTO.$total_500 = function(problem) {
		this.$total_route = F.lookup_system(500);
		this.$total_exception = problem;
		this.$total_execute(500, true);
	};

	PROTO.$total_prepare = function() {
		var req = this;
		if (DEF.onAuthorize) {
			DEF.onAuthorize(req, req.res, req_authorizetotal);
		} else {

			if (!req.$language && DEF.onLocale)
				req.$language = DEF.onLocale(req, req.res);

			if (!req.$total_route)
				req.$total_route = req.bodyexceeded ? F.lookup_system(431) : F.lookup(req);

			if (!req.$total_route)
				req.$total_route = F.lookup_system(404);

			req.$total_execute(req.bodyexceeded ? 431 : 404, !req.$total_route);
		}
	};

	PROTO.snapshot = function(callback) {

		var req = this;
		var builder = [];
		var keys = Object.keys(req.headers);
		var max = 0;

		for (var key in req.headers) {
			var length = key.length;
			if (length > max)
				max = length;
		}

		builder.push('url'.padRight(max + 1) + ': ' + req.method.toUpperCase() + ' ' + req.url);

		for (var i = 0; i < keys.length; i++)
			builder.push(keys[i].padRight(max + 1) + ': ' + req.headers[keys[i]]);

		builder.push('');

		var data = [];
		req.on('data', chunk => data.push(chunk));
		req.on('end', function() {
			builder.push(Buffer.concat(data).toString(ENCODING));
			callback(null, builder.join('\n'));
		});
	};
}

function total_endmiddleware(req) {

	if (req.total_middleware)
		req.total_middleware = null;

	try {
		req.$total_filemiddleware.execute(req, req.res, false);
	} catch (err) {
		F.error(err, req.$total_filemiddleware.controller + ' :: ' + req.$total_filemiddleware.name, req.uri);
		req.res.throw500();
	}
}

function extend_response(PROTO) {

	PROTORES = PROTO;

	if (PROTO.$throw)
		return;

	/**
	 * Add a cookie into the response
	 * @param {String} name
	 * @param {Object} value
	 * @param {String} expires
	 * @param {Object} options Additional options.
	 * @return {Response}
	 */
	PROTO.cookie = function(name, value, expires, options) {

		var self = this;

		if (self.headersSent || self.success)
			return;

		var cookiename = name + '=';
		var builder = [cookiename + value];
		var type = typeof(expires);

		if (expires && type === 'object') {
			options = expires;
			expires = options.expires || options.expire || null;
		}

		if (type === 'string')
			expires = expires.parseDateExpiration();

		if (!options)
			options = {};

		if (!options.path)
			options.path = '/';

		expires && builder.push('Expires=' + expires.toUTCString());
		options.domain && builder.push('Domain=' + options.domain);
		options.path && builder.push('Path=' + options.path);

		if (options.secure == true || (options.secure == null && CONF.default_cookies_secure))
			builder.push('Secure');

		if (options.httpOnly || options.httponly || options.HttpOnly)
			builder.push('HttpOnly');

		var same = options.security || options.samesite || CONF.default_cookies_samesite;
		switch (same) {
			case 1:
				same = 'Lax';
				break;
			case 2:
				same = 'Strict';
				break;
		}

		builder.push('SameSite=' + same);

		var arr = self.getHeader('set-cookie') || [];

		// Cookie, already, can be in array, resulting in duplicate 'set-cookie' header
		if (arr.length) {
			var l = cookiename.length;
			for (var i = 0; i < arr.length; i++) {
				if (arr[i].substring(0, l) === cookiename) {
					arr.splice(i, 1);
					break;
				}
			}
		}

		arr.push(builder.join('; '));
		self.setHeader('Set-Cookie', arr);
		return self;
	};

	/**
	 * Disable HTTP cache for current response
	 * @return {Response}
	 */
	PROTO.nocache = function() {
		var self = this;

		if (self.$nocache)
			return self;

		if (self.req) {
			delete self.req.headers['if-none-match'];
			delete self.req.headers['if-modified-since'];
		}

		if (self.getHeader(HEADER_CACHE)) {
			self.removeHeader(HEADER_CACHE);
			self.removeHeader('Expires');
			self.removeHeader('Etag');
			self.removeHeader('Last-Modified');
			self.setHeader(HEADER_CACHE, 'private, no-cache, no-store, max-age=0');
			self.setHeader('Expires', -1);
		}

		self.$nocache = true;
		return self;
	};

	PROTO.proxy = function(target, copypath, after, timeout) {

		var before;

		if (typeof(copypath) === 'function') {
			before = copypath;
			copypath = true;
		}

		if ((/^(https|http):\/\//).test(target))
			target = Parser.parse(target);
		else
			target = { socketPath: target };

		var obj = { uri: Parser.parse(target), path: '', before: before, after: after, copypath: copypath, timeout: timeout ? (timeout / 1000) : 10 };
		F.stats.response.proxy++;
		makeproxy(obj, this.req, this);
	};

	// For express middleware
	PROTO.status = function(code) {
		this.options.code = code;
		return this;
	};

	// For express middleware
	PROTO.send = function(code, body, type) {

		if (this.headersSent)
			return this;

		this.controller && this.req.$total_success();

		if (code instanceof Buffer) {
			// express.js static file
			if (!body && !type) {
				this.end(code);
				return this;
			}
		}

		var res = this;
		var req = this.req;
		var contentType = type;
		var isHEAD = req.method === 'HEAD';

		if (body === undefined) {
			body = code;
			code = res.$statuscode || 200;
		}

		switch (typeof(body)) {
			case 'string':
				if (!contentType)
					contentType = 'text/html';
				break;

			case 'number':
				if (!contentType)
					contentType = 'text/plain';
				body = U.httpstatus(body);
				break;

			case 'boolean':
			case 'object':
				if (!isHEAD) {
					if (body instanceof framework_builders.ErrorBuilder) {
						var json = body.output(true);
						if (body.status !== 200)
							res.options.code = body.status;
						if (body.contentType)
							contentType = body.contentType;
						else
							contentType = CT_JSON;
						body = json;
						F.stats.response.errorbuilder++;
					} else
						body = JSON.stringify(body);
					!contentType && (contentType = CT_JSON);
				}
				break;
		}

		var accept = req.headers['accept-encoding'] || '';
		var headers = {};

		headers[HEADER_CACHE] = 'private, no-cache, no-store, max-age=0';
		headers.Vary = 'Accept-Encoding, Last-Modified, User-Agent';

		if (REG_TEXTAPPLICATION.test(contentType))
			contentType += '; charset=utf-8';

		headers[HEADER_TYPE] = contentType;
		res.$custom();

		if (!accept && isGZIP(req))
			accept = 'gzip';

		var compress = CONF.allow_gzip && accept.indexOf('gzip') !== -1;
		if (isHEAD) {
			compress && (headers['Content-Encoding'] = 'gzip');
			res.writeHead(200, headers);
			res.end();
			return res;
		}

		if (!compress) {
			res.writeHead(code, headers);
			res.end(body, ENCODING);
			return res;
		}

		var buffer = Buffer.from(body);
		Zlib.gzip(buffer, function(err, data) {

			if (err) {
				res.writeHead(code, headers);
				res.end(body, ENCODING);
			} else {
				headers['Content-Encoding'] = 'gzip';
				res.writeHead(code, headers);
				res.end(data, ENCODING);
			}
		});

		return res;
	};

	PROTO.content = function(code, body, type, compress, headers) {

		if (typeof(compress) === 'object') {
			var tmp = headers;
			headers = compress;
			compress = tmp;
		}

		var res = this;
		res.options.code = code;
		res.options.compress = compress === undefined || compress === true;
		res.options.body = body;
		res.options.type = type;
		res.options.compress = body.length > 4096;
		headers && (res.options.headers = headers);
		res.$text();
		return res;
	};

	/**
	 * Response redirect
	 * @param {String} url
	 * @param {Boolean} permanent Optional, default: false.
	 * @return {Framework}
	 */
	PROTO.redirect = function(url, permanent) {
		this.options.url = url;
		permanent && (this.options.permanent = permanent);
		this.$redirect();
		return this;
	};

	/**
	 * Responds with a file
	 * @param {String} filename
	 * @param {String} download Optional, a download name.
	 * @param {Object} headers Optional, additional headers.
	 * @param {Function} done Optional, callback.
	 * @return {Framework}
	 */
	PROTO.file = function(filename, download, headers, callback) {
		this.options.filename = filename;
		headers && (this.options.headers = headers);
		callback && (this.options.callback = callback);
		download && (this.options.download = download);
		return this.$file();
	};

	/**
	 * Responds with a file from FileStorage
	 * @param {String} name A name of FileStorage
	 * @param {String/Number} id
	 * @param {String} download Optional, a download name.
	 * @param {Object} headers Optional, additional headers.
	 * @param {Function} done Optional, callback.
	 * @return {Framework}
	 */
	PROTO.filefs = function(name, id, download, headers, callback, checkmeta) {
		var self = this;
		var options = {};
		options.id = id;
		options.download = download;
		options.headers = headers;
		options.done = callback;
		FILESTORAGE(name).res(self, options, checkmeta, F.$file_notmodified);
		return self;
	};

	PROTO.imagefs = function(name, id, make, headers, callback, checkmeta) {
		var self = this;
		var options = {};
		options.id = id;
		options.image = true;
		options.make = make;
		options.headers = headers;
		options.done = callback;
		FILESTORAGE(name).res(self, options, checkmeta, F.$file_notmodified);
		return self;
	};

	/**
	 * Responds with a stream
	 * @param {String} contentType
	 * @param {Stream} stream
	 * @param {String} download Optional, a download name.
	 * @param {Object} headers Optional, additional headers.
	 * @param {Function} done Optional, callback.
	 * @return {Framework}
	 */
	PROTO.stream = function(type, stream, download, headers, callback, nocompress) {
		var res = this;
		res.options.type = type;
		res.options.stream = stream;
		download && (res.options.download = download);
		headers && (res.options.headers = headers);
		callback && (res.options.callback = callback);
		res.options.compress = nocompress ? false : true;
		res.$stream();
		return res;
	};

	PROTO.binary = function(body, type, encoding, download, headers) {

		if (typeof(encoding) === 'object') {
			var tmp = encoding;
			encoding = download;
			download = headers;
			headers = tmp;
		}

		if (typeof(download) === 'object') {
			headers = download;
			download = headers;
		}

		this.options.type = type;
		this.options.body = body;
		this.options.encoding = encoding;
		download && (this.options.download = download);
		headers && (this.options.headers = headers);
		this.$binary();
		return this;
	};

	/**
	 * Responds with an image
	 * @param {String or Stream} filename
	 * @param {String} make
	 * @param {Object} headers Optional, additional headers.
	 * @param {Function} callback Optional.
	 * @return {Framework}
	 */
	PROTO.image = function(filename, make, headers, callback, persistent) {

		var res = this;

		res.options.make = make;

		if (persistent === true || (persistent == null && CONF.allow_persistent_images === true))
			res.options.persistent = true;

		headers && (res.options.headers = headers);
		callback && (res.options.callback = callback);

		if (typeof(filename) === 'object')
			res.options.stream = filename;
		else
			res.options.filename = filename;

		res.$image();
		return res;
	};

	PROTO.image_nocache = function(filename, make, headers, callback) {
		this.options.cache = false;
		return this.image(filename, make, headers, callback);
	};

	PROTO.json = function(obj) {
		var res = this;
		F.stats.response.json++;
		if (obj && obj.$$schema)
			obj = obj.$clean();
		res.options.body = JSON.stringify(obj);
		res.options.compress = res.options.body.length > 4096;
		res.options.type = CT_JSON;
		return res.$text();
	};

	PROTO.jsonstring = function(str, headers) {
		var res = this;
		F.stats.response.json++;
		res.options.body = str;
		res.options.compress = res.options.body.length > 4096;
		res.options.type = CT_JSON;
		res.options.headers = headers;
		return res.$text();
	};

	const SECURITYTXT = { '/security.txt': 1, '/.well-known/security.txt': 1 };

	PROTO.continue = function(callback) {

		var res = this;
		var req = res.req;

		callback && (res.options.callback = callback);

		if (res.success || res.headersSent)
			return res;

		if (!CONF.static_accepts[req.extension]) {
			if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
				res.throw404();
			return res;
		}

		if (SECURITYTXT[req.url] && CONF['security.txt']) {
			res.send(200, CONF['security.txt'], 'text/plain');
			return;
		}

		req.$key = createTemporaryKey(req);

		if (F.temporary.notfound[req.$key]) {
			if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
				res.throw404();
			return res;
		}

		var canresize = false;
		var filename = null;
		var name = req.uri.pathname;

		if (IMAGES[req.extension]) {
			var index = name.lastIndexOf('/');
			var resizer = F.routes.resize[name.substring(0, index + 1)];
			if (resizer) {
				name = name.substring(index + 1);
				canresize = resizer.extension['*'] || resizer.extension[req.extension];
				if (canresize) {
					name = resizer.path + $decodeURIComponent(name);
					filename = DEF.onMapping(name, name, false, false);
				} else
					filename = DEF.onMapping(name, name, true, true);
			} else
				filename = DEF.onMapping(name, name, true, true);
		} else
			filename = DEF.onMapping(name, name, true, true);

		if (!filename) {
			if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
				res.throw404();
			return;
		}

		if (!canresize) {

			if (F.components.has && F.components[req.extension] && req.uri.pathname === CONF.static_url_components + req.extension) {
				res.nocompress = true;
				res.options.components = true;
				var g = req.query.group ? req.query.group.substring(0, req.query.group.length - 6) : '';
				filename = PATH.temp('components' + (g ? '_g' + g : '') + '.' + req.extension);
				if (g)
					req.$key = 'components_' + g + '.' + req.extension;
				else
					req.$key = 'components.' + req.extension;
			}

			res.options.filename = filename;
			res.$file();
			return res;
		}

		if (!resizer.ishttp) {
			res.options.cache = resizer.cache;
			res.options.make = resizer.fn;
			res.options.filename = filename;
			res.$image();
			return res;
		}

		if (F.temporary.processing[req.uri.pathname]) {
			setTimeout($continue_timeout, 500, res);
			return res;
		}

		var tmp = PATH.temp(req.$key);
		if (F.temporary.path[req.$key]) {
			res.options.filename = req.uri.pathname;
			res.$file();
			return res;
		}

		F.temporary.processing[req.uri.pathname] = true;

		DOWNLOAD(name, tmp, function(err, response) {

			delete F.temporary.processing[req.uri.pathname];
			var type = response.headers['content-type'];

			if (response.status !== 200 || !type || !type.startsWith('image/')) {
				if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
					res.throw404();
				return;
			}

			res.options.cache = resizer.cache;
			res.options.filename = tmp;
			res.options.maker = resizer.fn;
			res.$image();
		});

		return res;
	};

	PROTO.$file = function() {

		// res.options.filename
		// res.options.code
		// res.options.callback
		// res.options.headers
		// res.options.download

		var res = this;
		var options = res.options;

		if (res.headersSent)
			return res;

		var req = this.req;

		// Localization
		if (CONF.allow_localize && KEYSLOCALIZE[req.extension]) {

			// Is package?
			if (options.filename && options.filename[0] === '@')
				options.filename = PATH.package(options.filename.substring(1));

			F.$filelocalize(req, res, false, options);
			return;
		}

		!req.$key && (req.$key = createTemporaryKey(req));

		// "$keyskip" solves a problem with handling files in 404 state
		if (!req.$keyskip) {
			if (F.temporary.notfound[req.$key]) {
				req.$keyskip = true;
				DEBUG && (F.temporary.notfound[req.$key] = undefined);
				if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
					res.throw404();
				return res;
			}
		}

		// Is package?
		if (options.filename && options.filename[0] === '@')
			options.filename = PATH.package(options.filename.substring(1));

		var name = F.temporary.path[req.$key];
		var index;

		if (!req.extension) {
			req.$key && (req.extension = U.getExtension(req.$key));
			if (!req.extension && name) {
				req.extension = U.getExtension(name);
				index = req.extension.lastIndexOf(';');
				index !== -1 && (req.extension = req.extension.substring(0, index));
			}
			!req.extension && options.filename && (req.extension = U.getExtension(options.filename));
		}

		if (name && RELEASE && !res.$nocache && req.headers['if-modified-since'] === name[2]) {
			F.$file_notmodified(res, name);
			return res;
		}

		if (name === undefined) {

			if (F.temporary.processing[req.$key]) {
				if (req.processing > CONF.default_request_timeout) {
					res.throw408();
				} else {
					req.processing += 500;
					setTimeout($file_processing, 500, res);
				}
				return res;
			}

			// waiting
			F.temporary.processing[req.$key] = true;
			compile_check(res);
			return res;
		}

		var contentType = U.getContentType(req.extension);
		var accept = req.headers['accept-encoding'] || '';
		var headers;

		!accept && isGZIP(req) && (accept = 'gzip');

		var compress = CONF.allow_gzip && COMPRESSION[contentType] && accept.indexOf('gzip') !== -1 && name.length > 2;
		var range = req.headers.range;
		var canCache = !res.$nocache && RELEASE && contentType !== 'text/cache-manifest' && !RESPONSENOCACHE[req.extension];

		if (canCache) {
			if (compress)
				headers = range ? HEADERS.file_release_compress_range : HEADERS.file_release_compress;
			else
				headers = range ? HEADERS.file_release_range : HEADERS.file_release;
		} else {
			if (compress)
				headers = range ? HEADERS.file_debug_compress_range : HEADERS.file_debug_compress;
			else
				headers = range ? HEADERS.file_debug_range : HEADERS.file_debug;
		}

		headers.Vary = 'Accept-Encoding, Last-Modified, User-Agent';
		headers[HEADER_TYPE] = contentType;
		if (REG_TEXTAPPLICATION.test(contentType))
			headers[HEADER_TYPE] += '; charset=utf-8';

		if (canCache && !res.getHeader('Expires')) {
			headers.Expires = DATE_EXPIRES;
		} else if (headers.Expires && RELEASE)
			delete headers.Expires;

		if (res.options.headers)
			headers = U.extend_headers(headers, res.options.headers);

		if (res.options.download) {
			var encoded = encodeURIComponent(res.options.download === true ? U.getName(res.options.filename) : res.options.download);
			headers['Content-Disposition'] = 'attachment; filename*=utf-8\'\'' + encoded;
		} else if (headers['Content-Disposition'])
			delete headers['Content-Disposition'];

		if (res.getHeader('Last-Modified'))
			delete headers['Last-Modified'];
		else if (!res.options.lastmodified)
			headers['Last-Modified'] = name[2];

		headers.Etag = ETAG + CONF.etag_version;

		if (range) {
			$file_range(name[0], range, headers, res);
			return res;
		}

		// (DEBUG && !res.options.make) --> because of image convertor
		if (!res.options.components && ((DEBUG && !res.options.make) || res.$nocache))
			F.isProcessed(req.$key) && (F.temporary.path[req.$key] = undefined);

		if (name[1] && !compress)
			headers[HEADER_LENGTH] = name[1];
		else if (compress && name[4])
			headers[HEADER_LENGTH] = name[4];
		else if (headers[HEADER_LENGTH])
			delete headers[HEADER_LENGTH];

		F.stats.response.file++;
		options.stream && DESTROY(options.stream);

		if (req.method === 'HEAD') {
			res.writeHead(res.options.code || 200, headers);
			res.end();
			response_end(res);
		} else if (compress) {

			if (name[4])
				headers[HEADER_LENGTH] = name[4];
			else
				delete headers[HEADER_LENGTH];

			res.writeHead(res.options.code || 200, headers);
			fsStreamRead(name[3], undefined, $file_nocompress, res);
		} else {
			res.writeHead(res.options.code || 200, headers);
			fsStreamRead(name[0], undefined, $file_nocompress, res);
		}
	};

	PROTO.$redirect = function() {

		// res.options.permanent
		// res.options.url

		var res = this;

		if (res.headersSent)
			return res;

		HEADERS.redirect.Location = res.options.url;
		res.writeHead(res.options.permanent ? 301 : 302, HEADERS.redirect);
		res.end();
		response_end(res);
		F.stats.response.redirect++;
		return res;
	};

	PROTO.$binary = function() {

		// res.options.callback
		// res.options.code
		// res.options.encoding
		// res.options.download
		// res.options.type
		// res.options.body
		// res.options.headers

		var res = this;

		if (res.headersSent)
			return res;

		var req = res.req;
		var options = res.options;

		/*
		if (options.type.lastIndexOf('/') === -1)
			options.type = U.getContentType(options.type);
		*/

		var accept = req.headers['accept-encoding'] || '';
		!accept && isGZIP(req) && (accept = 'gzip');

		var compress = CONF.allow_gzip && COMPRESSION[options.type] && accept.indexOf('gzip') !== -1;
		var headers = compress ? HEADERS.binary_compress : HEADERS.binary;

		headers.Vary = 'Accept-Encoding, Last-Modified, User-Agent';

		if (options.download) {
			var encoded = encodeURIComponent(options.download);
			headers['Content-Disposition'] = 'attachment; filename*=utf-8\'\'' + encoded;
		} else if (headers['Content-Disposition'])
			delete headers['Content-Disposition'];

		headers[HEADER_TYPE] = options.type;

		if (options.headers)
			headers = U.extend_headers(headers, options.headers);

		F.stats.response.binary++;

		if (req.method === 'HEAD') {
			res.writeHead(options.code || 200, headers);
			res.end();
		} else if (compress) {
			res.writeHead(options.code || 200, headers);
			Zlib.gzip(!options.encoding || options.encoding === 'binary' ? options.body : options.body.toString(options.encoding), function(err, buffer) {
				F.stats.performance.upload += buffer.length / 1024 / 1024;
				res.end(buffer);
			});
		} else {
			res.writeHead(options.code || 200, headers);
			res.end(!options.encoding || options.encoding === 'binary' ? options.body : options.body.toString(options.encoding));
			F.stats.performance.upload += options.body.length / 1024 / 1024;
		}

		response_end(res);
		return res;
	};

	PROTO.$stream = function() {

		// res.options.filename
		// res.options.options
		// res.options.callback
		// res.options.code
		// res.options.stream
		// res.options.type
		// res.options.compress

		var res = this;
		var req = res.req;
		var options = res.options;

		if (res.headersSent)
			return res;

		var accept = req.headers['accept-encoding'] || '';
		!accept && isGZIP(req) && (accept = 'gzip');

		var compress = (options.compress === undefined || options.compress) && CONF.allow_gzip && COMPRESSION[options.type] && accept.indexOf('gzip') !== -1;
		var headers;

		if (RELEASE && !res.$nocache) {
			if (compress)
				headers = HEADERS.stream_release_compress;
			else
				headers = HEADERS.stream_release;
		} else {
			if (compress)
				headers = HEADERS.stream_debug_compress;
			else
				headers = HEADERS.stream_debug;
		}

		headers.Vary = 'Accept-Encoding, Last-Modified, User-Agent';

		if (RELEASE && !res.nocache) {
			headers.Expires = DATE_EXPIRES;
			headers['Last-Modified'] = 'Mon, 01 Jan 2001 08:00:00 GMT';
		}

		if (options.download) {
			var encoded = encodeURIComponent(options.download);
			headers['Content-Disposition'] = 'attachment; filename*=utf-8\'\'' + encoded;
		} else if (headers['Content-Disposition'])
			delete headers['Content-Disposition'];

		headers[HEADER_TYPE] = options.type;

		if (options.headers)
			headers = U.extend_headers(headers, options.headers);

		F.stats.response.stream++;
		req.bodydata = null;

		var finish = function() {
			framework_internal.destroyStream(options.stream);
			response_end(res);
		};

		if (req.method === 'HEAD') {
			res.writeHead(options.code || 200, headers);
			res.end();
			options.stream && framework_internal.onFinished(res, finish);
			return res;
		}

		if (compress) {
			res.writeHead(options.code || 200, headers);
			res.on('error', () => options.stream.close());
			options.stream.pipe(Zlib.createGzip(GZIPSTREAM)).pipe(res).on('data', countuploadstats);
			framework_internal.onFinished(res, finish);
		} else {
			res.writeHead(options.code || 200, headers);
			framework_internal.onFinished(res, finish);
			options.stream.pipe(res).on('data', countuploadstats);
		}

		return res;
	};

	PROTO.$image = function() {

		// res.options.filename
		// res.options.stream
		// res.options.options
		// res.options.callback
		// res.options.code
		// res.options.cache
		// res.options.headers
		// res.options.make = function(image, res)
		// res.options.persistent

		var res = this;
		var options = res.options;

		if (options.cache === false)
			return $image_nocache(res);

		var req = this.req;

		if (!req.$key)
			req.$key = createTemporaryKey(req);

		var key = req.$key;

		if (F.temporary.notfound[key]) {
			DEBUG && (F.temporary.notfound[key] = undefined);
			if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
				res.throw404();
			return res;
		}

		var name = F.temporary.path[key];

		if (options.filename && options.filename[0] === '@')
			options.filename = PATH.package(options.filename.substring(1));

		if (name !== undefined) {
			res.$file();
			return res;
		}

		if (F.temporary.processing[key]) {
			if (req.processing > CONF.default_request_timeout) {
				res.throw408();
			} else {
				req.processing += 500;
				setTimeout($image_processing, 500, res);
			}
			return res;
		}

		var plus = F.clusterid;
		options.name = PATH.temp((options.persistent ? 'timg_' : '') + plus + key);

		if (options.persistent) {
			fsFileExists(options.name, $image_persistent, res);
			return;
		}

		F.temporary.processing[key] = true;

		if (options.stream)
			fsFileExists(options.name, $image_stream, res);
		else
			fsFileExists(options.filename, $image_filename, res);

		return res;
	};

	PROTO.$custom = function() {
		F.stats.response.custom++;
		response_end(this);
		return this;
	};

	PROTO.$text = function() {

		// res.options.type
		// res.options.body
		// res.options.code
		// res.options.headers
		// res.options.callback
		// res.options.compress
		// res.options.encoding

		var res = this;
		var req = res.req;
		var options = res.options;

		if (res.headersSent)
			return res;

		if (res.$evalroutecallback) {
			res.headersSent = true;
			res.$evalroutecallback(null, options.body, res.options.encoding || ENCODING);
			return res;
		}

		var accept = req.headers['accept-encoding'] || '';
		!accept && isGZIP(req) && (accept = 'gzip');

		var gzip = CONF.allow_gzip && (options.compress === undefined || options.compress) ? accept.indexOf('gzip') !== -1 : false;
		var headers;

		if (req.$mobile)
			headers = gzip ? HEADERS.content_mobile_release : HEADERS.content_mobile;
		else
			headers = gzip ? HEADERS.content_compress : HEADERS.content;

		if (REG_TEXTAPPLICATION.test(options.type))
			options.type += '; charset=utf-8';

		headers[HEADER_TYPE] = options.type;

		if (options.headers)
			headers = U.extend_headers(headers, options.headers);

		if (req.method === 'HEAD') {
			res.writeHead(options.code || 200, headers);
			res.end();
		} else {

			if (req.$bodyencrypt && CONF.secret_encryption && typeof(options.body) === 'string') {
				options.body = framework_utils.encrypt_data(options.body, CONF.secret_encryption);
				if (!headers)
					headers = {};
				headers['X-Encryption'] = 'a';
			}

			if (gzip) {
				res.writeHead(options.code || 200, headers);
				Zlib.gzip(options.body instanceof Buffer ? options.body : Buffer.from(options.body), function(err, data) {
					F.stats.performance.upload += data.length / 1024 / 1024;
					res.end(data, res.options.encoding || ENCODING);
				});
			} else {
				var buffer = options.body instanceof Buffer ? options.body : Buffer.from(options.body);
				F.stats.performance.upload += buffer.length / 1024 / 1024;
				res.writeHead(options.code || 200, headers);
				res.end(buffer, res.options.encoding || ENCODING);
			}
		}

		response_end(res);
		return res;
	};

	PROTO.throw400 = function(problem) {
		this.options.code = 400;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw401 = function(problem) {
		this.options.code = 401;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw403 = function(problem) {
		this.options.code = 403;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw404 = function(problem) {
		this.options.code = 404;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw408 = function(problem) {

		// Timeout
		F.stats.response.timeout++;

		if (F.timeouts.push((NOW = new Date()).toJSON() + ' ' + this.req.url) > 5)
			F.timeouts.shift();

		// 408 status code isn't good for handle timeouts
		this.options.code = 503;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw409 = function(problem) {
		this.options.code = 409;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw431 = function(problem) {
		this.options.code = 431;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw500 = function(error) {
		error && F.error(error, null, this.req.uri);
		this.options.code = 500;
		this.options.body = U.httpstatus(500) + error ? prepare_error(error) : '';
		return this.$throw();
	};

	PROTO.throw501 = function(problem) {
		this.options.code = 501;
		problem && (this.options.problem = problem);
		return this.$throw();
	};

	PROTO.throw503 = function(error) {
		error && F.error(error, null, this.req.uri);
		this.options.code = 503;
		this.options.body = U.httpstatus(503) + error ? prepare_error(error) : '';
		return this.$throw();
	};

	PROTO.$throw = function() {

		// res.options.code
		// res.options.body
		// res.options.problem

		var res = this;

		if (res.success || res.headersSent)
			return res;

		var req = res.req;
		var key = 'error' + res.options.code;

		if (req.method === 'HEAD') {
			res.writeHead(res.options.code || 501, res.options.headers || HEADERS.responseCode);
			res.end();
			F.stats.response[key]++;
			response_end(res);
		} else {

			req.$total_route = F.lookup_system(res.options.code);
			req.$total_exception = res.options.problem;
			req.$total_execute(res.options.code, true);
		}

		F.$events[key] && EMIT(key, req, res, res.options.problem);
		return res;
	};
}

F.extendreq = extend_request;
F.extendres = extend_response;

function $image_persistent(exists, size, isFile, stats, res) {
	if (exists) {
		delete F.temporary.processing[res.req.$key];
		F.temporary.path[res.req.$key] = [res.options.name, stats.size, stats.mtime.toUTCString()];
		res.options.filename = res.options.name;
		res.$file();
	} else {
		F.temporary.processing[res.req.$key] = true;
		if (res.options.stream)
			fsFileExists(res.options.name, $image_stream, res);
		else
			fsFileExists(res.options.filename, $image_filename, res);
	}
}

function $continue_timeout(res) {
	res.continue();
}

function $file_processing(res) {
	res.$file();
}

F.$file_notmodified = function(res, name) {
	var req = res.req;
	var headers = HEADERS.file_lastmodified;

	if (res.getHeader('Last-Modified'))
		delete headers['Last-Modified'];
	else
		headers['Last-Modified'] = name instanceof Array ? name[2] : name;

	if (res.getHeader('Expires'))
		delete headers.Expires;
	else
		headers.Expires = DATE_EXPIRES;

	if (res.getHeader('ETag'))
		delete headers.Etag;
	else
		headers.Etag = ETAG + CONF.etag_version;

	headers[HEADER_TYPE] = U.getContentType(req.extension);
	res.writeHead(304, headers);
	res.end();
	F.stats.response.notmodified++;
	response_end(res);
};

function $file_nocompress(stream, next, res) {

	stream.pipe(res).on('data', countuploadstats);

	framework_internal.onFinished(res, function() {
		next();
		framework_internal.destroyStream(stream);
		response_end(res);
	});

}

function $file_range(name, range, headers, res, total) {

	var arr = range.replace(REG_RANGE, '').split('-');
	var beg = +arr[0] || 0;
	var end = +arr[1] || 0;

	if (!total)
		total = F.temporary.range[name];

	if (!total) {
		Fs.lstat(name, function(err, stats) {
			if (err) {
				// File not found
				if (!F.routes.filesfallback || !F.routes.filesfallback(res.req, res))
					res.throw404();
			} else {
				F.temporary.range[name] = stats.size;
				$file_range(name, range, headers, res, stats.total);
			}
		});
		return;
	}

	if (end <= 0)
		end = beg + ((1024 * 1024) * 5); // 5 MB

	// if (end === 0)
	// 	end = total - 1;

	if (beg > end) {
		beg = 0;
		end = total - 1;
	}

	if (end > total)
		end = total - 1;

	var length = (end - beg) + 1;

	headers[HEADER_LENGTH] = length;
	headers['Content-Range'] = 'bytes ' + beg + '-' + end + '/' + total;

	var req = res;
	F.stats.response.streaming++;

	if (req.method === 'HEAD') {
		res.writeHead(206, headers);
		res.end();
		response_end(res);
	} else {
		res.writeHead(206, headers);
		RANGE.start = beg;
		RANGE.end = end;
		fsStreamRead(name, RANGE, $file_range_callback, res);
	}
}

function $file_range_callback(stream, next, res) {
	framework_internal.onFinished(res, function() {
		framework_internal.destroyStream(stream);
		response_end(res);
		next();
	});
	stream.pipe(res).on('data', countuploadstats);
}

function $image_nocache(res) {

	var options = res.options;

	// STREAM
	if (options.stream) {
		var image = framework_image.load(options.stream);
		options.make.call(image, image, res);
		options.type = U.getContentType(image.outputType);

		// Loaded from FileStorage
		if (image.custom)
			options.stream = Fs.createReadStream(image.filename, { start: image.start });
		else
			options.stream = image;

		F.stats.response.image++;
		res.$stream();
		return;
	}

	// FILENAME
	fsFileExists(options.filename, function(e) {
		if (e) {
			PATH.verify('temp');
			var image = framework_image.load(options.filename);
			options.make.call(image, image, res);
			F.stats.response.image++;
			options.type = U.getContentType(image.outputType);
			options.stream = image;
			res.$stream();
		} else {
			options.headers = null;
			if (!F.routes.filesfallback || !F.routes.filesfallback(res.req, res))
				res.throw404();
		}
	});
}

function $image_processing(res) {
	res.$image();
}

function $image_stream(exists, size, isFile, stats, res) {

	var req = res.req;
	var options = res.options;

	if (exists) {
		delete F.temporary.processing[req.$key];
		F.temporary.path[req.$key] = [options.name, stats.size, stats.mtime.toUTCString()];
		res.options.filename = options.name;

		if (options.stream && !options.stream.custom) {
			options.stream.once('error', NOOP); // sometimes is throwed: Bad description
			DESTROY(options.stream);
			options.stream = null;
		}

		res.$file();
		DEBUG && (F.temporary.path[req.$key] = undefined);
		return;
	}

	PATH.verify('temp');

	if (options.stream.custom)
		options.stream = Fs.createReadStream(options.stream.filename, { start: options.stream.start });

	var image = framework_image.load(options.stream);
	options.make.call(image, image, res);
	req.extension = U.getExtension(options.name);

	if (req.extension !== image.outputType) {
		var index = options.name.lastIndexOf('.' + req.extension);
		if (index !== -1)
			options.name = options.name.substring(0, index) + '.' + image.outputType;
		else
			options.name += '.' + image.outputType;
	}

	F.stats.response.image++;
	image.save(options.name, function(err) {

		if (options.stream) {
			options.stream.once('error', NOOP); // sometimes is throwed: Bad description
			DESTROY(options.stream);
			options.stream = null;
		}

		delete F.temporary.processing[req.$key];
		if (err) {
			F.temporary.notfound[req.$key] = true;
			res.throw500(err);
			DEBUG && (F.temporary.notfound[req.$key] = undefined);
		} else {
			var stats = Fs.statSync(options.name);
			F.temporary.path[req.$key] = [options.name, stats.size, stats.mtime.toUTCString()];
			options.filename = options.name;
			res.$file();
		}
	});
}

function $image_filename(exists, size, isFile, stats, res) {

	var req = res.req;
	var options = res.options;

	if (!exists) {
		delete F.temporary.processing[req.$key];
		F.temporary.notfound[req.$key] = true;
		if (!F.routes.filesfallback || !F.routes.filesfallback(req, res))
			res.throw404();
		DEBUG && (F.temporary.notfound[req.$key] = undefined);
		return;
	}

	PATH.verify('temp');

	var image = framework_image.load(options.filename);
	options.make.call(image, image, res);
	req.extension = U.getExtension(options.name);

	if (req.extension !== image.outputType) {
		var index = options.name.lastIndexOf('.' + req.extension);
		if (index === -1)
			options.name += '.' + image.outputType;
		else
			options.name = options.name.substring(0, index) + '.' + image.outputType;
	}

	F.stats.response.image++;
	image.save(options.name, function(err) {

		delete F.temporary.processing[req.$key];

		if (err) {
			F.temporary.notfound[req.$key] = true;
			res.throw500(err);
			DEBUG && (F.temporary.notfound[req.$key] = undefined);
		} else {
			var stats = Fs.statSync(options.name);
			F.temporary.path[req.$key] = [options.name, stats.size, stats.mtime.toUTCString()];
			res.options.filename = options.name;
			res.$file();
		}
	});
}

function response_end(res) {

	res.success = true;

	if (CONF.allow_reqlimit && F.temporary.ddos[res.req.ip])
		F.temporary.ddos[res.req.ip]--;

	if (!res.req.isStaticFile)
		F.$events.request_end && EMIT('request_end', res.req, res);

	res.req.clear(true);
	res.req.bodydata = null;

	res.controller && res.req.$total_success();

	if (res.options.callback) {
		res.options.callback();
		res.options.callback = null;
	}

	if (res.options.done) {
		res.options.done();
		res.options.done = null;
	}

	// res.options = EMPTYOBJECT;
	if (res.controller)
		res.controller = null;
}

// Handle errors of decodeURIComponent
function $decodeURIComponent(value) {
	try
	{
		return decodeURIComponent(value);
	} catch (e) {
		return value;
	}
}

global.Controller = Controller;
global.WebSocketClient = WebSocketClient;

process.on('unhandledRejection', function(e) {
	F.error(e, '', null);
});

process.on('uncaughtException', function(e) {

	var err = e + '';
	if (err.indexOf('listen EADDRINUSE') !== -1) {
		process.send && process.send('total:eaddrinuse');
		console.log('\nThe IP address and the PORT is already in use.\nYou must change the PORT\'s number or IP address.\n');
		process.exit(1);
		return;
	} else if (CONF.allow_filter_errors && REG_SKIPERROR.test(err))
		return;

	F.error(e, '', null);
});

function fsFileRead(filename, callback, a, b, c) {
	U.queue('FILES', CONF.default_maxopenfiles, function(next) {
		F.stats.performance.open++;
		Fs.readFile(filename, function(err, result) {
			next();
			callback(err, result, a, b, c);
		});
	});
}

function fsFileExists(filename, callback, a, b, c) {
	U.queue('FILES', CONF.default_maxopenfiles, function(next) {
		F.stats.performance.open++;
		Fs.lstat(filename, function(err, stats) {
			next();
			callback(!err && stats.isFile(), stats ? stats.size : 0, stats ? stats.isFile() : false, stats, a, b, c);
		});
	});
}

function fsStreamRead(filename, options, callback, res) {

	if (!callback) {
		callback = options;
		options = undefined;
	}

	var opt;

	if (options) {

		opt = HEADERS.fsStreamReadRange;
		opt.start = options.start;
		opt.end = options.end;

		if (opt.start > opt.end)
			delete opt.end;

	} else
		opt = HEADERS.fsStreamRead;

	U.queue('FILES', CONF.default_maxopenfiles, function(next) {
		F.stats.performance.open++;
		var stream = Fs.createReadStream(filename, opt);
		stream.on('error', NOOP);
		callback(stream, next, res);
	}, filename);
}

/**
 * Prepare URL address to temporary key (for caching)
 * @param {ServerRequest or String} req
 * @return {String}
 */
function createTemporaryKey(req) {
	return (req.uri ? req.uri.pathname : req).replace(REG_TEMPORARY, '_').substring(1);
}

F.createTemporaryKey = createTemporaryKey;

function MiddlewareOptions() {}

MiddlewareOptions.prototype = {

	get user() {
		return this.req.user;
	},

	get session() {
		return this.req.session;
	},

	get language() {
		return this.req.$language;
	},

	get ip() {
		return this.req.ip;
	},

	get headers() {
		return this.req.headers;
	},

	get ua() {
		return this.req ? this.req.ua : null;
	},

	get sessionid() {
		return this.req.sessionid;
	},

	get id() {
		return this.controller ? this.controller.id : null;
	},

	get params() {
		return this.controller ? this.controller.params : null;
	},

	get files() {
		return this.req.files;
	},

	get body() {
		return this.req.body;
	},

	get query() {
		return this.req.query;
	},

	get url() {
		return this.req.url;
	},

	get split() {
		return this.req.split;
	},

	get path() {
		return this.req.path;
	}

};

const MiddlewareOptionsProto = MiddlewareOptions.prototype;

MiddlewareOptionsProto.callback = function() {
	this.next();
	return this;
};

MiddlewareOptionsProto.cancel = function() {
	this.next(false);
	return this;
};

function forcestop() {
	F.stop();
}

process.on('SIGTERM', forcestop);
process.on('SIGINT', forcestop);
process.on('exit', forcestop);

function process_ping() {
	process.connected && process.send('total:ping');
}

process.on('message', function(msg, h) {
	if (msg === 'total:debug') {
		WAIT(() => F.isLoaded, function() {
			F.isLoaded = undefined;
			F.console();
			F.isLoaded = true;
		}, 10000, 500);
	} else if (msg === 'reconnect')
		F.reconnect();
	else if (msg === 'total:ping')
		setImmediate(process_ping);
	else if (msg === 'total:update')
		EMIT('update');
	else if (msg === 'reset')
		F.cache.clear();
	else if (msg === 'stop' || msg === 'exit' || msg === 'kill')
		F.stop();
	else if (msg && msg.TYPE && msg.ID !== F.id) {
		if (msg.TYPE === 'req')
			F.cluster.req(msg);
		else if (msg.TYPE === 'res')
			msg.target === F.id && F.cluster.res(msg);
		else if (msg.TYPE === 'emit')
			F.$events[msg.name] && EMIT(msg.name, msg.a, msg.b, msg.c, msg.d, msg.e);
		if (msg.TYPE === 'total:emit') {
			msg.TYPE = 'emit';
			F.cluster.emit2(msg);
		}
	}

	F.$events.message && EMIT('message', msg, h);
});

function prepare_error(e) {
	if (!e)
		return '';
	else if (e instanceof ErrorBuilder)
		return e.plain();
	else if (DEBUG)
		return e.stack ? e.stack : (e + '');
}

function prepare_filename(name) {
	return name[0] === '@' ? (F.isWindows ? U.combine(CONF.directory_temp, name.substring(1)) : PATH.package(name.substring(1))) : U.combine('/', name);
}


function isGZIP(req) {
	var ua = req.headers['user-agent'];
	return ua && ua.lastIndexOf('Firefox') !== -1;
}

function prepare_viewname(value) {
	// Cleans theme name
	return value.substring(value.indexOf('/', 2) + 1);
}

function existsSync(filename, file) {
	try {
		var val = Fs.statSync(filename);
		return val ? (file ? val.isFile() : true) : false;
	} catch (e) {
		return false;
	}
}

global.setTimeout2 = function(name, fn, timeout, limit, param) {
	var key = ':' + name;
	var internal = F.temporary.internal;

	if (limit > 0) {

		var key2 = key + '_limit';
		var key3 = key + '_fn';

		if (internal[key2] >= limit) {
			internal[key] && clearTimeout(internal[key]);
			internal[key] = internal[key2] = internal[key3] = undefined;
			fn();
			return;
		}

		internal[key] && clearTimeout(internal[key]);
		internal[key2] = (internal[key2] || 0) + 1;

		return internal[key] = setTimeout(function(param, key) {
			F.temporary.internal[key] = F.temporary.internal[key + '_limit'] = F.temporary.internal[key + '_fn'] = undefined;
			fn && fn(param);
		}, timeout, param, key);
	}

	if (internal[key]) {
		clearTimeout(internal[key]);
		internal[key] = undefined;
	}

	return internal[key] = setTimeout(fn, timeout, param);
};

global.clearTimeout2 = function(name) {

	var key = ':' + name;

	if (F.temporary.internal[key]) {
		clearTimeout(F.temporary.internal[key]);
		F.temporary.internal[key] = undefined;
		F.temporary.internal[key + ':limit'] && (F.temporary.internal[key + ':limit'] = undefined);
		return true;
	}

	return false;
};

F.$snapshot = function() {

	var main = {};
	var stats = {};
	var lastwarning = 0;

	F.consumption = stats;

	stats.id = F.id;
	stats.version = {};
	stats.version.node = process.version;
	stats.version.total = F.version_header;
	stats.version.build = F.version;
	stats.version.app = CONF.version;
	stats.pid = process.pid;
	stats.thread = global.THREAD;
	stats.mode = DEBUG ? 'debug' : 'release';
	stats.overload = 0;

	main.pid = process.pid;
	main.date = NOW;
	main.port = F.port;
	main.ip = F.ip;
	main.stats = [stats];

	F.snapshotstats = function() {

		var memory = process.memoryUsage();
		stats.date = NOW;
		stats.textdb = F.stats.textdb;

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

		if (CONF.allow_stats_status) {
			stats.status = [];
			for (var id in F.status) {
				var tmp = F.status[id];
				stats.status.push({ id: id, data: tmp.data, date: tmp.date });
			}
		}

		if ((stats.usage > 80 || stats.memory > 600 || stats.pending > 1000) && lastwarning !== NOW.getHours()) {
			lastwarning = NOW.getHours();
			stats.overload++;
			if (CONF.allow_stats_snapshot) {
				try {
					Fs.appendFile(process.mainModule.filename + '.overload', JSON.stringify(stats) + '\n', NOOP);
				} catch (e) {}
			}

		}

		if (F.isCluster) {
			if (process.connected) {
				CLUSTER_SNAPSHOT.data = stats;
				process.send(CLUSTER_SNAPSHOT);
			}
		} else if (CONF.allow_stats_snapshot) {
			try {
				Fs.writeFile(process.mainModule.filename + '.json', JSON.stringify(main, null, '\t'), NOOP);
			} catch (e) {
				// readonly or something else
				F.snapshotstats = null;
			}
		}
	};

	F.snapshotstats();
	F.$snapshot = null;
};

var lastusagedate;

function measure_usage_response(checkedagain) {

	var diff = (Date.now() - lastusagedate) - 60;
	if (diff > 50)
		diff = 50;

	var val = diff < 0 ? 0 : (diff / 50) * 100;
	if (F.temporary.service.usage < val)
		F.temporary.service.usage = val;

	F.stats.performance.usage = val;

	if (val >= 100) {
		if (checkedagain) {
			if (process.connected)
				process.send('total:overload');
		} else
			measure_usage(true);
	}
}

function measure_usage(param) {
	lastusagedate = Date.now();
	setTimeout(measure_usage_response, 50, param);
}

NEWCOMMAND('refresh_tms', function() {

	var endpoint = CONF.default_tms_url;
	var is = F.tms.url !== endpoint;

	if (is && F.tms.route) {
		F.tms.route.remove();
		F.tms.route = null;
	}

	if ((is && endpoint && CONF.allow_tms) || (endpoint && CONF.allow_tms && !F.tms.route))
		F.tms.route = ROUTE('SOCKET ' + endpoint, tmscontroller, [], CONF.default_tms_maxlength);

	F.tms.url = endpoint;

	if (endpoint && F.tms.token !== CONF.secret_tms) {
		F.tms.token = CONF.secret_tms;
		F.tms.socket && F.tms.socket.close(1000, 'Changed TMS secret');
	}

});

function newextension_make(obj, callback) {
	if (obj.install) {
		obj.install(function(err) {
			if (err) {
				callback && callback(new ErrorBuilder().push(err));
			} else {
				CURRENT_OWNER = 'extension' + obj.id;
				F.extensions.push(obj);
				callback && callback(null, obj);
				obj.make && obj.make();
				obj.done && obj.done();
			}
		});
	} else {
		CURRENT_OWNER = 'extension' + obj.id;
		F.extensions.push(obj);
		callback && callback(null, obj);
		obj.make && obj.make();
		obj.done && obj.done();
	}
}

global.NEWEXTENSION = function(code, callback, extend) {

	if (code[0] === 'h' && code[6] === '/' && code.indexOf('\n') === -1) {
		var opt = {};
		opt.url = code;
		opt.callback = function(err, response) {
			if (err) {
				callback && callback(new ErrorBuilder().push(err));
			} else
				global.NEWEXTENSION(response.body, callback, extend);
		};
		REQUEST(opt);
		return;
	}

	var files = {};

	if (code.indexOf('<script total') !== -1) {

		var index = 0;

		while (true) {
			index = code.indexOf('<file ', index);
			if (index === -1) {
				break;
			} else {
				var tmp = code.indexOf('>', index + 8);
				var end = code.indexOf('</file>', tmp);
				var name = code.substring(index + 8, tmp).trim();
				var body = code.substring(tmp + 1, end).trim();
				tmp = name.indexOf('"');
				name = name.substring(tmp + 1, name.lastIndexOf('"'));
				files[name] = body;
				code = code.substring(0, index) + code.substring(end + 9);
			}
		}
		var parsed = code.parseComponent({ be: '<script total>' });
		code = cleancodetabs(parsed.be || '');
	}

	var obj = {};

	try {

		new Function('exports', code)(obj);
		obj.files = files;
		extend && extend(obj);

		if (!obj.id) {
			var id = obj.name || code;
			obj.id = HASH(id).toString(36);
		}

		for (var key in obj.files) {
			var path = PATH.tmp(obj.id.makeid() + '_' + key);
			var body = obj.files[key];
			obj.files[key] = path;
			F.Fs.writeFile(path, body, ERROR('Extensions: ' + obj.id));
		}

	} catch (e) {
		callback && callback(new ErrorBuilder().push(e));
		return;
	}

	var ext = F.extensions.findItem('id', obj.id);
	if (ext) {
		try {
			ext.remove();
		} catch (e) {
			F.error(e, 'Removing extension: ' + ext.name);
		}
	}

	CURRENT_OWNER = 'extension' + obj.id;

	obj.remove = function() {

		for (var key in files)
			F.Fs.unlink(files[key], NOOP);

		obj.uninstall && obj.uninstall();
		delete obj.remove;
		delete obj.uninstall;
		delete obj.install;
		delete obj.make;
		delete obj.done;
		var index = F.extensions.indexOf(obj);
		if (index !== -1)
			F.extensions.splice(index, 1);
		CMD('clear_owner', 'extension' + obj.id);
	};

	setTimeout(newextension_make, 100, obj, callback);
};

NEWCOMMAND('clear_smtpcache', function() {
	if (CONF.mail_smtp || CONF.mail_smtp_options)
		delete F.temporary.mail_settings;
});

NEWCOMMAND('clear_viewscache', function() {
	global.$VIEWCACHE = [];
	for (var key in F.temporary.other) {
		if (key.substring(0, 4) === 'view')
			delete F.temporary.other[key];
	}
	F.cache.removeAll('$view');
	F.temporary.views = {};
});

NEWCOMMAND('clear_owner', function(owner) {

	var arr = [];
	var index;

	// Schemas, Operations, Tasks
	framework_builders.uninstall(owner);

	// Modificators
	if (F.modificators) {
		for (var item of F.modificators) {
			if (item.$owner === owner)
				arr.push(item);
		}

		for (var item of arr) {
			index = F.modificators.indexOf(item);
			if (index !== -1)
				F.modificators.splice(index, 1);
		}
	}

	// Modificators
	if (F.modificators2) {
		for (var key in F.modificators2) {

			arr = [];
			var items = F.modificators2[key];

			for (var item of items) {
				if (item.$owner === owner)
					arr.push(item);
			}

			for (var item of arr) {
				index = F.modificators2[key].indexOf(item);
				if (index !== -1) {
					F.modificators2[key].splice(index, 1);
					if (!F.modificators2[key].length)
						delete F.modificators2[key];
				}
			}
		}

		for (var item of arr) {
			index = F.modificators.indexOf(item);
			if (index !== -1)
				F.modificators.splice(index, 1);
		}
	}

	arr = [];
	for (var key in F.routes.middleware) {
		var fn = F.routes.middleware[key];
		if (fn.$owner === owner)
			NEWMIDDLEWARE(key, null);
	}

	// Transformations
	for (var key in F.transformations) {
		arr = F.transformations[key];
		while (true) {
			var index = arr.findIndex('owner', owner);
			if (index === -1)
				break;
			arr.splice(index, 1);
		}
		if (!arr.length)
			delete F.transformations[key];
	}

	// WebSocket routes
	for (var item of F.routes.websockets) {
		if (item.owner === owner)
			item.parent.remove(true);
	}

	// Dynamic routes
	for (var item of F.routes.web) {
		if (item.owner === owner)
			item.parent.remove(true);
	}

	// Static routes
	for (var item of F.routes.files) {
		if (item.owner === owner)
			item.parent.remove(true);
	}

	// CORS
	arr = [];
	for (var item of F.routes.cors) {
		if (item.owner === owner)
			arr.push(item);
	}

	for (var item of F.routes.cors)
		F.routes.cors.splice(F.routes.cors.indexOf(item), 1);

	// Events
	for (var key in F.$events) {
		var arr = F.$events[key];
		var rem = [];
		for (var evt of arr) {
			if (evt.$owner === owner)
				rem.push(evt);
		}
		for (var evt of rem)
			F.removeListener(key, evt);
	}

	F.routes_sort();
});

function cleancodetabs(val) {

	var allowed = { '\n': 1, '\t': 1 };
	var count = 0;

	for (var i = 0; i < val.length; i++) {
		var c = val[i];
		if (allowed[c]) {
			count = 0;
			for (var j = i; j < val.length; j++) {
				if (val[j] === '\t')
					count++;
				else
					break;
			}
			if (count)
				break;
		} else
			break;
	}

	if (!count)
		return val;

	var start = '';
	for (var i = 0; i < count; i++)
		start += '\t';

	var lines = val.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.substring(0, count) === start) {
			line = line.substring(count);
			lines[i] = line;
		}
	}

	return lines.join('\n');
}

process.connected && setTimeout(() => process.send('total:init'), 100);

Api.evaluate('TotalAPI,TAPI', function(opt, next) {

	if (!CONF.allow_totalapi && opt.schema !== 'check') {
		next('totalapi_inactive');
		return;
	}

	if (opt.data && typeof(opt.data) !== 'object')
		opt.data = { value: opt.data };

	var req = {};

	req.method = 'POST';
	req.url = 'https://' + CONF.default_tapi + '.api.totaljs.com/' + opt.schema + '/';

	if (opt.files) {
		req.body = opt.data;
		req.files = opt.files;
	} else
		req.body = JSON.stringify(opt.data);

	req.type = 'json';
	req.timeout = 60000;
	req.keepalive = true;
	req.headers = { 'x-token': opt.token || CONF.totalapi || CONF.secret_totalapi || '-', 'x-app': encodeURIComponent(CONF.name) };
	req.custom = true;

	req.callback = function(err, response) {

		if (err) {
			next(err.toString());
			return;
		}

		var buffer = [];

		// Error
		if (response.status > 200) {
			response.stream.on('data', chunk => buffer.push(chunk));
			CLEANUP(response.stream, function() {
				let output = Buffer.concat(buffer).toString('utf8');
				let response = output.parseJSON();
				next((response && response[0] && response[0].error) || output);
			});
			return;
		}

		if (!opt.output || opt.output === 'json' || opt.output === 'html' || opt.output === 'plain' || opt.output === 'text' || opt.output === 'base64' || opt.output === 'buffer' || opt.output === 'binary') {
			response.stream.on('data', chunk => buffer.push(chunk));
			CLEANUP(response.stream, function() {
				let output = Buffer.concat(buffer);
				if (opt.output === 'base64') {
					output = output.toString('base64');
				} else if (opt.output !== 'binary' && opt.output !== 'buffer') {
					output = output.toString('utf8');
					if (!opt.output || opt.output === 'json')
						output = output.parseJSON(true);
				}
				next(null, output);
			});
			return;
		}

		if (opt.output === 'stream') {
			next(null, response.stream);
			return;
		}

		// FileStorage in the form: "#name id filename"
		if (opt.output[0] === '#') {

			var fsdata = null;
			var fs = null;

			if (opt.output[0] === '#') {
				fsdata = opt.output.substring(1).split(' ');
				fs = FILESTORAGE(fsdata[0]);
			}

			var type = (response.headers['content-type'] || '').toLowerCase();
			var index = type.lastIndexOf(';');
			if (index !== -1)
				type = type.substring(0, index);

			var ext = type ? U.getExtensionFromContentType(type) : 'bin';
			var id = fsdata[1] || UID();
			var filename = fsdata[2] || id + '.' + ext;

			response.stream.pause();
			fs.save(id, filename, response.stream, next);
			return;
		}

		var writer = F.Fs.createWriteStream(opt.output);
		response.stream.pipe(writer);
		CLEANUP(writer, function() {
			opt.next(null, opt.output);
		});

	};

	REQUEST(req);
});


UIDGENERATOR_REFRESH();
require('./textdb-querybuilder');
require('./sourcemap');