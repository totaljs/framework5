exports.install = function() {
	ROUTE('GET /', function($) {
		$.plain('Hello World');
	});
};