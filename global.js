// Total.js Globals
// The MIT License
// Copyright 2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

global.ON = (name, fn) => F.on(name, fn);
global.EMIT = (name, a, b, c, d, e, f, g) => F.emit(name, a, b, c, d, e, f, g);
global.OFF = (name, fn) => F.off(name, fn);
global.ROUTE = F.TRouting.route;
global.PROXY = F.TRouting.proxy;
global.print = console.log;
global.LOADCONFIG = F.loadconfig;
global.LOADRESOURCE = F.loadresource;
global.SHELL = F.shell;
global.NPMINSTALL = F.npminstall;
global.COMPONENTATOR = F.componentator;
global.MERGE = F.merge;
global.TOUCH = F.touch;
global.LOCALIZE = F.localize;
global.AUTH = F.auth;
global.CLEANUP = F.cleanup;
global.NEWDB = F.newdb;
global.REQUIRE = F.require;
global.CRON = F.cron;
global.UID = F.uid;
global.SUCCESS = value => DEF.onSuccess(value);
global.MEMORIZE = F.memorize;
global.AUDIT = F.audit;
global.TRANSLATE = F.translate;
global.TRANSFORM = F.transform;
global.NEWTRANSFORM = F.newtransform;
global.DATA = new F.TQueryBuilder.Controller(true);
global.DB = () => new F.TQueryBuilder.Controller();
global.CACHE = F.cache;
global.NEWACTION = F.TBuilders.newaction;
global.NEWSCHEMA = F.TBuilders.newschema;
global.ACTION = global.EXEC = F.TBuilders.action;
global.TEMPLATE = F.template;
global.FILESTORAGE = F.filestorage;
global.WEBSOCKETCLIENT = F.websocketclient;
global.PAUSESERVER = F.pauseserver;
global.MODS = F.modules;
global.PLUGINS = F.plugins;
global.DECRYPT = F.decrypt;
global.ENCRYPT = F.encrypt;
global.DECRYPTREQ = F.decryptreq;
global.ENCRYPTREQ = F.encryptreq;
global.PATH = F.path;
global.UNAUTHORIZED = F.unauthorized;
global.LOGMAIL = F.logmail;
global.HTMLMAIL = F.htmlmail;
global.MAIL = F.mail;
global.Mail = F.TMail.Mailer;
global.RESTBuilder = F.TBuilders.RESTBuilder;
global.ErrorBuilder = F.TBuilders.ErrorBuilder;
global.DOWNLOAD = F.download;

global.BLOCKED = function($, limit, expire) {

	var key = $.ip;

	if (limit === -1 || limit === null) {
		delete F.temporary.bans[key];
		return;
	}

	if (!limit)
		limit = 5;

	var item = F.temporary.bans[key];
	if (item) {
		if (item.count > limit)
			return true;
		item.count++;
	} else {
		item = F.temporary.bans[key] = {};
		item.expire = NOW.add(expire || '15 minutes');
		item.count = 1;
	}
};

global.ERROR = function(name) {
	return name == null ? F.errorcallback : function(err) {
		err && F.error(err, name);
	};
};

global.LDAP = function(opt, callback) {
	if (!opt.ldap.port)
		opt.ldap.port = 389;
	var Ldap = require('./ldap');
	if (callback)
		Ldap.load(opt, callback);
	else
		return new Promise((resolve, reject) => Ldap.load(opt, (err, res) => err ? reject(err) : resolve(res)));
};

global.CORS = function(origin) {
	if (origin && origin[0] === '+')
		CONF.$cors = (CONF.$cors ? ',' : '') + origin.substring(1);
	else
		CONF.$cors = origin || '*';
};

global.AJAX = function(url, data, callback) {

	if (typeof(data) === 'function') {
		callback = data;
		data = null;
	}

	if (!callback)
		return new Promise((resolve, reject) => global.AJAX(url, data, (err, response) => err ? reject(err) : resolve(response)));

	var index = url.indexOf(' ');
	var opt = {};

	if (index !== -1) {
		opt.method = url.substring(0, index);
		opt.url = url.substring(index + 1);
	} else {
		opt.method = 'GET';
		opt.url = url;
	}

	if (data) {
		opt.type = 'json';
		opt.body = JSON.stringify(data);
	}

	opt.callback = function(err, response) {

		if (err) {
			callback && callback(err, null, response);
			return;
		}

		var type = err ? '' : response.headers['content-type'] || '';
		if (type) {
			var index = type.lastIndexOf(';');
			if (index !== -1)
				type = type.substring(0, index).trim();
		}

		var value = null;

		switch (type.toLowerCase()) {
			case 'text/xml':
			case 'application/xml':
				value = response.body ? response.body.parseXML(self.$replace ? true : false) : {};
				break;
			case 'application/x-www-form-urlencoded':
				value = response.body ? DEF.parsers.urlencoded(response.body) : {};
				break;
			case 'application/json':
			case 'text/json':
				value = response.body ? response.body.parseJSON(true) : null;
				break;
			default:
				value = response.body;
				break;
		}

		if (response.status >= 400) {
			err = value;
			value = null;
		}

		delete response.body;
		callback && callback(err, value, response);
	};
	F.TUtils.request(opt);
};

// Utils
global.U = F.TUtils;
global.GUID = F.TUtils.guid;
global.NOOP = F.TUtils.noop;
global.REQUEST = F.TUtils.request;
global.HASH = (val, type) => val.hash(type ? type : true);
global.DIFFARR = F.TUtils.diffarr;
global.CLONE = F.TUtils.clone;
global.COPY = F.TUtils.copy;
global.QUERIFY = F.TUtils.querify;

// TMS
global.SUBSCRIBE = F.TTMS.subscribe;
global.UNSUBSCRIBE = F.TTMS.unsubscribe;
global.PUBLISH = F.TTMS.publish;
global.NEWPUBLISH = F.TTMS.newpublish;
global.NEWSUBSCRIBE = F.TTMS.newsubscribe;
global.NEWCALL = F.TTMS.newcall;
global.TMSCLIENT = F.TTMS.client;

// API
global.API = (name, schema, data, $) => F.TApi.exec(name, schema, data, $);
global.NEWAPI = (name, callback) => F.TApi.newapi(name, callback);

// NoSQL
global.NOSQL = F.TNoSQL.nosql;

// Workers
global.NEWFORK = F.TWorkers.createfork;
global.NEWTHREAD = F.TWorkers.createthread;
global.NEWTHREADPOOL = F.TWorkers.createpool;

// Custom global functionality
function timeout2(key, a, b, c, d, e) {
	let tmp = F.temporary.internal[key];
	if (tmp) {
		tmp.callback(a, b, c, d, e);
		delete F.temporary.internal[key];
	}
}

global.setTimeout2 = function(id, callback, timeout, limit, a, b, c, d, e) {

	let key = 'timeout2' + id;
	let internal = F.temporary.internal;
	let cache = internal[key];

	if (limit > 0) {

		if (cache && cache.count >= limit) {
			clearTimeout(cache.timer);
			delete internal[key];
			callback();
			return;
		}

		if (cache) {
			clearTimeout(cache.timer);
			cache.count++;
		} else
			cache = internal[key] = {};

		cache.callback = callback;
		cache.timer = setTimeout(timeout2, timeout, key, a, b, c, d, e);

	} else {

		if (cache)
			clearTimeout(cache.timer);
		else
			cache = internal[key] = {};

		cache.callback = callback;
		cache.timer = setTimeout(timeout2, timeout, key, a, b, c, d, e);
	}
};

global.clearTimeout2 = function(id) {

	let key = 'timeout2' + id;
	let tmp = F.temporary.internal[key];

	if (tmp) {
		clearTimeout(tmp.timer);
		delete F.temporary.internal[key];
	}

	return !!tmp;
};
