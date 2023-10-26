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
global.ERROR = F.error;
global.MERGE = F.merge;
global.TOUCH = F.touch;
global.AUTH = F.auth;
global.CLEANUP = F.cleanup;
global.NEWDB = F.newdb;
global.REQUIRE = F.require;
global.CRON = F.cron;
global.UID = F.uid;
global.MEMORIZE = F.memorize;
global.AUDIT = F.audit;
global.DATA = new F.TQueryBuilder.Controller(true);
global.DB = () => new F.TQueryBuilder.Controller();
global.CACHE = F.cache;
global.NEWACTION = F.TBuilders.newaction;
global.ACTION = F.TBuilders.action;
global.TEMPLATE = F.template;
global.FILESTORAGE = F.filestorage;
global.WEBSOCKETCLIENT = F.websocketclient;

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
	CONF.$cors = origin || '*';
};

// Utils
global.GUID = F.TUtils.guid;
global.NOOP = F.TUtils.noop;
global.REQUEST = F.TUtils.request;
global.HASH = (val, type) => val.hash(type ? type : true);
global.DIFFARR = F.TUtils.diffarr;
global.U = F.TUtils;
global.CLONE = F.TUtils.clone;

// TMS
global.SUBSCRIBE = F.TMS.subscribe;
global.UNSUBSCRIBE = F.TMS.unsubscribe;
global.PUBLISH = F.TMS.publish;
global.NEWPUBLISH = F.TMS.newpublish;
global.NEWSUBSCRIBE = F.TMS.newsubscribe;
global.NEWCALL = F.TMS.newcall;
global.TMSCLIENT = F.TMS.client;

// API
global.API = (name, schema, data, $) => F.TApi.exec(name, schema, data, $);
global.NEWAPI = (name, callback) => F.TApi.newapi(name, callback);

// NoSQL
global.NOSQL = F.TNoSQL.nosql;