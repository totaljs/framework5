global.ON = function() {

};

global.ROUTE = F.TRouting.route;
global.print = console.log;

global.CORS = function(origin) {
	CONF.$cors = origin || '*';
};

global.TOUCH = function(url) {
	if (url) {
		delete F.temporary.path[url];
		delete F.temporary.notfound[url];
	} else {
		F.temporary.path = {};
		F.temporary.notfound = {};
	}
};