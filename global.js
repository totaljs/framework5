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
global.DATA = new F.TQueryBuilder.Controller(true);
global.DB = function() {
	return new F.TQueryBuilder.Controller();
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