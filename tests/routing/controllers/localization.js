exports.install = function() {

	ROUTE('GET /localization', function($) {
		$.view('/index');
	});

	ROUTE('GET /localization/sk/', function($) {
		$.language = 'sk';
		$.view('/index');
	});

	ROUTE('GET /localization/en/', function($) {
		$.view('/index');
	});

};