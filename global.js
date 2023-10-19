global.ON = (name, fn) => F.on(name, fn);
global.EMIT = (name, a, b, c, d, e, f, g) => F.emit(name, a, b, c, d, e, f, g);
global.OFF = (name, fn) => F.off(name, fn);
global.ROUTE = F.TRouting.route;
global.print = console.log;
global.LOADCONFIG = F.loadconfig;
global.LOADRESOURCE = F.loadresource;
global.SHELL = F.shell;
global.NPMINSTALL = F.npminstall;

global.CORS = function(origin) {
	CONF.$cors = origin || '*';
};

global.TOUCH = function(url) {
	if (url) {
		delete F.temporary.tmp[url];
		delete F.temporary.notfound[url];
	} else {
		F.temporary.tmp = {};
		F.temporary.notfound = {};
	}
};


// Utils
global.GUID = F.TUtils.guid;
global.NOOP = F.TUtils.noop;
