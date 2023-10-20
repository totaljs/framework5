global.ON = (name, fn) => F.on(name, fn);
global.EMIT = (name, a, b, c, d, e, f, g) => F.emit(name, a, b, c, d, e, f, g);
global.OFF = (name, fn) => F.off(name, fn);
global.ROUTE = F.TRouting.route;
global.print = console.log;
global.LOADCONFIG = F.loadconfig;
global.LOADRESOURCE = F.loadresource;
global.SHELL = F.shell;
global.NPMINSTALL = F.npminstall;
global.COMPONENTATOR = F.componentator;
global.ERROR = F.error;
global.MERGE = F.merge;
global.TOUCH = F.touch;

global.CORS = function(origin) {
	CONF.$cors = origin || '*';
};

// Utils
global.GUID = F.TUtils.guid;
global.NOOP = F.TUtils.noop;
global.REQUEST = F.TUtils.request;
