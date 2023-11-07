/* eslint-disable */

require('../index');
require('../test');

// NEWACTION()
// NEWSCHEMA()
// ACTION()
// JSON schema types defined in the ACTIONS

Test.push('Group', function(next) {
	// Test.print('String.slug()', [error]);
	Test.print('Test');
	next();
});

Test.run();