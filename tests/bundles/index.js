/* eslint-disable */

require('../../index');
require('../../test');

// Unpack bundle in bundles directory + download bundles from URL (we can add a test bundle to our CDN)
// Merging files
// Removing files

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