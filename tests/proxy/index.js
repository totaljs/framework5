/* eslint-disable */

require('../../index');
require('../../test');

// load web server and test app
F.http();

ON('ready', function() {

	Test.push('Test Web Proxy', function(next) {
		// Test.print('String.slug()', [error]);
		Test.print('String.slug()');
		next();
	});

	Test.run(function() {
		process.exit(0);
	});

});