/* eslint-disable */

require('../index');
require('../test');

Test.push('String.prototypes', function(next) {
	// Test.print('String.slug()', [error]);
	Test.print('String.slug()');
	next();
});

Test.push('Number.prototypes', function(next) {
	Test.print('Number.currency');
	next();
});

Test.run();