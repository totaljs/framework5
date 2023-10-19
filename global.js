global.ON = function() {

};

global.ROUTE = F.TRouting.route;
global.print = console.log;

global.CORS = function(origin) {
	CONF.$cors = origin || '*';
};