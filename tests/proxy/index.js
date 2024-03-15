/* eslint-disable */
require('../../index');
require('../../test');

// load web server and test app
F.run({ release: false, port: 8000 });

var url = 'http://localhost:8000';
ROUTE('GET /', ($) => $.success());
PROXY('/cl/', 'https://api.muald.com/cl', false);

ON('ready', function() {

	Test.push('Test Web Proxy', function(next) {
		// Test.print('String.slug()', [error]);

		try {
			RESTBuilder.GET(url + '/cl').exec(function(err, res, output) {
				console.log(err, res, output);
				next();
			});
		} catch(e) {
			console.log(e);
		}
		
	});

	setTimeout(function() {
		Test.run(function() {
			process.exit(0);
		});
	}, 500);

});