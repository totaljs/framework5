/* eslint-disable */

require('../../index');
require('../../test');

// unixsocket
// ip + port

// load web server and test app
F.http();

ON('ready', function() {

	Test.push('A test name', function(next) {
		// Test.print('String.slug()', [error]);
		Test.print('String.slug()');
		next();
	});

	Test.run(function() {
		process.exit(0);
	});

});