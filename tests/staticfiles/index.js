/* eslint-disable */

require('../../index');
require('../../test');

// merging files
// localization

// load web server and test app
F.http();

ON('ready', function() {

	Test.push('A test name', function(next) {
		// Test.print('String.slug()', [error]);
		Test.print('String.slug()');
		var arr = [];
		arr.push(function(next_fn) {

		});

		arr.async(function() {
			next();
		});
	});

	setTimeout(function() {
		Test.run(function() {
			process.exit(0);
		});
	}, 500);
});