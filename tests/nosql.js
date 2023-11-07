/* eslint-disable */

require('../index');
require('../test');

// .insert()
// .find() + .autoquery()
// .read()
// .update()
// .remove()

Test.push('Group', function(next) {
	// Test.print('String.slug()', [error]);
	Test.print('Test');
	next();
});

Test.run();