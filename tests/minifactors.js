/* eslint-disable */

require('../index');
require('../test');

// .js
// .css
// .html
// with and without comments

Test.push('Group', function(next) {
	// Test.print('String.slug()', [error]);
	Test.print('Test');
	next();
});

Test.run();